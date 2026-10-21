import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.call import Call, CallMessage, CallSummary, CallEvent
from app.schemas.call import (
    CreateCallRequest,
    ConsentRequest,
    AddMessageRequest,
    GenerateAIResponseRequest,
    AIResponseResult,
    EndCallRequest,
    CallDetailResponse,
    CallListItemResponse,
    CallSummarySchema,
    CallStateEnum,
    SalesStatusEnum
)
from app.services.state_machine import CallStateMachine, StateMachineError
from app.services.conversation_service import conversation_service
from app.services.summary_service import summary_service
from app.services.classification_service import classification_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/calls", tags=["Calls"])
logger = logging.getLogger("voxora.calls_router")


def log_call_event(db: Session, call_id: str, event_type: str, payload: dict):
    """Helper to persist structured observability events"""
    try:
        event = CallEvent(call_id=call_id, event_type=event_type, payload=payload)
        db.add(event)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log event {event_type} for call {call_id}: {e}")


@router.post("", response_model=CallDetailResponse, status_code=201)
def create_call(req: CreateCallRequest, db: Session = Depends(get_db)):
    """Create a new sales call session with explicit state machine"""
    call = Call(
        customer_name=req.customer_name.strip() or "Prospect",
        customer_company=req.customer_company.strip() if req.customer_company else None,
        language=req.language or "en",
        state=CallStateEnum.CONSENT_PENDING.value,
        consent_granted=False,
        recording_status="not_started"
    )
    db.add(call)
    db.commit()
    db.refresh(call)

    log_call_event(db, call.id, "call_created", {
        "customer_name": call.customer_name,
        "customer_company": call.customer_company,
        "initial_state": call.state
    })
    return call


@router.post("/{call_id}/consent")
def set_call_consent(call_id: str, req: ConsentRequest, db: Session = Depends(get_db)):
    """Record customer's affirmative or declined recording consent"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    call.consent_granted = req.consent
    if req.consent:
        try:
            CallStateMachine.validate_transition(call.state, CallStateEnum.CONNECTING)
            call.state = CallStateEnum.CONNECTING.value
        except StateMachineError as e:
            logger.warning(f"State transition warning on consent: {e}")
            call.state = CallStateEnum.CONNECTING.value
    else:
        # Declined consent: user can still talk in voice or text, but recording is disabled
        logger.info(f"Customer declined recording consent for call {call_id}")

    db.commit()
    db.refresh(call)

    log_call_event(db, call.id, "consent_decision", {
        "consent_granted": req.consent,
        "reason": req.reason,
        "resulting_state": call.state
    })
    return {
        "call_id": call.id,
        "consent_granted": call.consent_granted,
        "state": call.state
    }


@router.post("/{call_id}/messages")
def add_message(call_id: str, req: AddMessageRequest, db: Session = Depends(get_db)):
    """Persist transcript messages incrementally, with duplicate protection"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    text_clean = req.text.strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Message text cannot be empty")

    # Duplicate check: prevent identical consecutive messages within 3 seconds
    recent = db.query(CallMessage).filter(
        CallMessage.call_id == call_id,
        CallMessage.speaker == req.speaker.value,
        CallMessage.text == text_clean
    ).order_by(desc(CallMessage.timestamp)).first()

    if recent:
        # Check time diff safely handling naive or aware datetime from SQLite/Postgres
        now = datetime.now(timezone.utc)
        recent_ts = recent.timestamp
        if recent_ts.tzinfo is None:
            recent_ts = recent_ts.replace(tzinfo=timezone.utc)
        diff = (now - recent_ts).total_seconds()
        if diff < 3.0:
            logger.info(f"Ignored duplicate message for call {call_id}")
            return {"status": "duplicate_ignored", "id": recent.id}

    msg = CallMessage(
        call_id=call_id,
        speaker=req.speaker.value,
        text=text_clean,
        correlation_id=req.correlation_id or call.correlation_id
    )
    db.add(msg)

    # If customer spoke, advance state to LISTENING or THINKING
    if req.speaker.value == "customer" and call.state not in [CallStateEnum.ENDING.value, CallStateEnum.COMPLETED.value]:
        call.state = CallStateEnum.THINKING.value

    db.commit()
    db.refresh(msg)

    log_call_event(db, call.id, "message_appended", {
        "speaker": msg.speaker,
        "length": len(msg.text),
        "correlation_id": msg.correlation_id
    })

    return {
        "id": msg.id,
        "call_id": msg.call_id,
        "speaker": msg.speaker,
        "text": msg.text,
        "timestamp": msg.timestamp
    }


@router.post("/{call_id}/respond", response_model=AIResponseResult)
def generate_ai_response(call_id: str, req: GenerateAIResponseRequest, db: Session = Depends(get_db)):
    """Generate real AI response for customer input adhering to 12-point sales strategy"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # If initial greeting requested
    if req.force_greeting:
        result = conversation_service.generate_greeting(
            customer_name=call.customer_name,
            company=call.customer_company
        )
        ai_msg = CallMessage(
            call_id=call_id,
            speaker="ai",
            text=result.ai_message,
            correlation_id=req.correlation_id or call.correlation_id
        )
        db.add(ai_msg)
        call.state = CallStateEnum.SPEAKING.value
        db.commit()
        db.refresh(call)

        log_call_event(db, call_id, "ai_greeting_generated", {"text": result.ai_message})
        return result

    # If customer provided a message directly in the request, save it first
    if req.customer_message and req.customer_message.strip():
        cust_msg = CallMessage(
            call_id=call_id,
            speaker="customer",
            text=req.customer_message.strip(),
            correlation_id=req.correlation_id or call.correlation_id
        )
        db.add(cust_msg)
        db.commit()

    # Load complete message history
    history = db.query(CallMessage).filter(CallMessage.call_id == call_id).order_by(CallMessage.timestamp).all()
    history_dicts = [{"speaker": m.speaker, "text": m.text} for m in history]

    # Generate response
    call.state = CallStateEnum.THINKING.value
    db.commit()

    result = conversation_service.generate_response(
        messages=history_dicts,
        customer_name=call.customer_name,
        company=call.customer_company
    )

    # Save AI message
    ai_msg = CallMessage(
        call_id=call_id,
        speaker="ai",
        text=result.ai_message,
        correlation_id=req.correlation_id or call.correlation_id
    )
    db.add(ai_msg)
    call.state = CallStateEnum.SPEAKING.value
    db.commit()

    log_call_event(db, call_id, "ai_response_generated", {
        "text": result.ai_message,
        "sentiment": result.detected_sentiment
    })

    return result


@router.post("/{call_id}/recording")
async def upload_recording(
    call_id: str,
    file: UploadFile = File(...),
    duration: float = Form(0.0),
    db: Session = Depends(get_db)
):
    """Upload and persist customer & AI mixed audio recording"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    try:
        filename, rel_url = await storage_service.save_recording(call_id, file)
        call.recording_filename = filename
        call.recording_url = rel_url
        call.recording_duration_seconds = max(duration, 0.0)
        call.recording_status = "saved"
        db.commit()

        log_call_event(db, call_id, "recording_saved", {
            "filename": filename,
            "duration": call.recording_duration_seconds
        })

        return {
            "status": "success",
            "call_id": call_id,
            "recording_url": rel_url,
            "duration": call.recording_duration_seconds
        }
    except Exception as e:
        logger.error(f"Recording upload error for call {call_id}: {e}")
        call.recording_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to persist recording: {str(e)}")


@router.get("/{call_id}/recording")
def get_recording(call_id: str, db: Session = Depends(get_db)):
    """Stream authorized audio recording for playback"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call or not call.recording_filename:
        raise HTTPException(status_code=404, detail="Recording not found")

    file_path = storage_service.get_recording_path(call.recording_filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Recording file missing on disk")

    media_type = "audio/webm"
    if file_path.suffix == ".wav":
        media_type = "audio/wav"
    elif file_path.suffix == ".mp4":
        media_type = "audio/mp4"

    return FileResponse(path=file_path, media_type=media_type, filename=file_path.name)


@router.post("/{call_id}/end")
def end_call(call_id: str, req: EndCallRequest, db: Session = Depends(get_db)):
    """Idempotently finalize a call and trigger post-call analysis"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Idempotent check
    if call.state == CallStateEnum.COMPLETED.value:
        return {"status": "already_completed", "call_id": call.id}

    call.state = CallStateEnum.PROCESSING.value
    call.ended_at = datetime.now(timezone.utc)
    if req.duration_seconds and req.duration_seconds > 0:
        call.recording_duration_seconds = req.duration_seconds
    db.commit()

    # Automatically generate summary & sales status
    try:
        messages = db.query(CallMessage).filter(CallMessage.call_id == call_id).order_by(CallMessage.timestamp).all()
        msg_dicts = [{"speaker": m.speaker, "text": m.text} for m in messages]

        summary_data = summary_service.generate_summary(
            messages=msg_dicts,
            customer_name=call.customer_name,
            company=call.customer_company
        )

        # Upsert summary
        existing_sum = db.query(CallSummary).filter(CallSummary.call_id == call_id).first()
        if existing_sum:
            existing_sum.overview = summary_data.overview
            existing_sum.customer_business = summary_data.customer_business
            existing_sum.customer_role = summary_data.customer_role
            existing_sum.requirements_pain_points = summary_data.requirements_pain_points
            existing_sum.current_tools = summary_data.current_tools
            existing_sum.buying_signals = summary_data.buying_signals
            existing_sum.objections = summary_data.objections
            existing_sum.budget_timeline = summary_data.budget_timeline
            existing_sum.sales_status = summary_data.sales_status.value
            existing_sum.status_evidence = summary_data.status_evidence
            existing_sum.recommended_next_step = summary_data.recommended_next_step
        else:
            new_sum = CallSummary(
                call_id=call_id,
                overview=summary_data.overview,
                customer_business=summary_data.customer_business,
                customer_role=summary_data.customer_role,
                requirements_pain_points=summary_data.requirements_pain_points,
                current_tools=summary_data.current_tools,
                buying_signals=summary_data.buying_signals,
                objections=summary_data.objections,
                budget_timeline=summary_data.budget_timeline,
                sales_status=summary_data.sales_status.value,
                status_evidence=summary_data.status_evidence,
                recommended_next_step=summary_data.recommended_next_step
            )
            db.add(new_sum)

        call.sales_status = summary_data.sales_status.value
        call.sales_status_evidence = summary_data.status_evidence
        call.state = CallStateEnum.COMPLETED.value
        db.commit()

        log_call_event(db, call_id, "summary_generated", {
            "status": summary_data.sales_status.value,
            "evidence": summary_data.status_evidence
        })
    except Exception as e:
        logger.error(f"Error generating summary for call {call_id}: {e}")
        call.state = CallStateEnum.COMPLETED.value
        db.commit()

    db.refresh(call)
    return {"status": "completed", "call_id": call.id, "sales_status": call.sales_status}


@router.post("/{call_id}/analyze", response_model=CallSummarySchema)
def analyze_call(call_id: str, db: Session = Depends(get_db)):
    """Generate or retry AI summary and status classification"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    messages = db.query(CallMessage).filter(CallMessage.call_id == call_id).order_by(CallMessage.timestamp).all()
    msg_dicts = [{"speaker": m.speaker, "text": m.text} for m in messages]

    summary_data = summary_service.generate_summary(
        messages=msg_dicts,
        customer_name=call.customer_name,
        company=call.customer_company
    )

    existing_sum = db.query(CallSummary).filter(CallSummary.call_id == call_id).first()
    if existing_sum:
        existing_sum.overview = summary_data.overview
        existing_sum.customer_business = summary_data.customer_business
        existing_sum.customer_role = summary_data.customer_role
        existing_sum.requirements_pain_points = summary_data.requirements_pain_points
        existing_sum.current_tools = summary_data.current_tools
        existing_sum.buying_signals = summary_data.buying_signals
        existing_sum.objections = summary_data.objections
        existing_sum.budget_timeline = summary_data.budget_timeline
        existing_sum.sales_status = summary_data.sales_status.value
        existing_sum.status_evidence = summary_data.status_evidence
        existing_sum.recommended_next_step = summary_data.recommended_next_step
    else:
        new_sum = CallSummary(
            call_id=call_id,
            overview=summary_data.overview,
            customer_business=summary_data.customer_business,
            customer_role=summary_data.customer_role,
            requirements_pain_points=summary_data.requirements_pain_points,
            current_tools=summary_data.current_tools,
            buying_signals=summary_data.buying_signals,
            objections=summary_data.objections,
            budget_timeline=summary_data.budget_timeline,
            sales_status=summary_data.sales_status.value,
            status_evidence=summary_data.status_evidence,
            recommended_next_step=summary_data.recommended_next_step
        )
        db.add(new_sum)

    call.sales_status = summary_data.sales_status.value
    call.sales_status_evidence = summary_data.status_evidence
    db.commit()

    return summary_data


@router.get("", response_model=List[CallListItemResponse])
def list_calls(
    query: Optional[str] = Query(None, description="Search by customer name or company"),
    status: Optional[str] = Query(None, description="Filter by sales status"),
    db: Session = Depends(get_db)
):
    """Retrieve persisted call history with search and filter capabilities"""
    q = db.query(Call)
    if query:
        q = q.filter(
            (Call.customer_name.ilike(f"%{query}%")) |
            (Call.customer_company.ilike(f"%{query}%"))
        )
    if status and status != "all":
        q = q.filter(Call.sales_status == status)

    calls = q.order_by(desc(Call.created_at)).all()

    result = []
    for c in calls:
        msg_count = len(c.messages)
        has_sum = c.summary is not None
        result.append(CallListItemResponse(
            id=c.id,
            customer_name=c.customer_name,
            customer_company=c.customer_company,
            language=c.language,
            state=c.state,
            consent_granted=c.consent_granted,
            recording_url=c.recording_url,
            recording_duration_seconds=c.recording_duration_seconds or 0.0,
            recording_status=c.recording_status,
            sales_status=c.sales_status,
            created_at=c.created_at,
            ended_at=c.ended_at,
            message_count=msg_count,
            has_summary=has_sum
        ))
    return result


@router.get("/{call_id}", response_model=CallDetailResponse)
def get_call_detail(call_id: str, db: Session = Depends(get_db)):
    """Retrieve complete call record, messages, summary, and audio link"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.delete("/{call_id}")
def delete_call(call_id: str, db: Session = Depends(get_db)):
    """Delete a call and its associated recording artifacts"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Delete audio file from storage if present
    if call.recording_filename:
        storage_service.delete_recording(call.recording_filename)

    db.delete(call)
    db.commit()
    logger.info(f"Deleted call {call_id} and associated artifacts")
    return {"status": "deleted", "call_id": call_id}
