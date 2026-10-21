import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.config import settings
from app.schemas.call import DiagnosticsResponse, DiagnosticsComponent
from app.services.knowledge_service import knowledge_service
from app.services.storage_service import storage_service

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health")
def health_check():
    """Application health endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.VOXORA_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/api/diagnostics", response_model=DiagnosticsResponse)
def get_diagnostics(db: Session = Depends(get_db)):
    """Developer diagnostics panel endpoint to inspect subsystems"""
    # 1. Database check
    db_status = "healthy"
    db_msg = "Database connection active"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_msg = f"Database error: {str(e)}"

    # 2. LLM Provider check
    llm_status = "healthy"
    llm_details = {"provider": "none", "model": "none"}
    if settings.GROQ_API_KEY:
        llm_status = "healthy"
        llm_msg = "Groq API configured with ultra-fast inference"
        llm_details = {"provider": "Groq", "model": settings.GROQ_MODEL}
    elif settings.OPENAI_API_KEY:
        llm_status = "healthy"
        llm_msg = "OpenAI API configured"
        llm_details = {"provider": "OpenAI", "model": settings.OPENAI_MODEL}
    else:
        llm_status = "warning"
        llm_msg = "No external LLM key detected; running with built-in resilient dialogue engine"
        llm_details = {"provider": "Built-in Resilient Agent", "model": "rule-based + heuristic"}

    # 3. Speech & TTS check
    tts_status = "healthy"
    tts_msg = "Browser Web Speech API (SpeechRecognition + SpeechSynthesis) supported with text fallback"

    # 4. Storage check
    storage_dir = storage_service.storage_dir
    if storage_dir.exists() and os.access(str(storage_dir), os.W_OK):
        storage_status = "healthy"
        storage_msg = f"Audio storage writable at {storage_dir.name}"
    else:
        storage_status = "error"
        storage_msg = f"Storage directory unwritable at {storage_dir}"

    overall = "healthy"
    if db_status == "error" or storage_status == "error":
        overall = "degraded"

    return DiagnosticsResponse(
        timestamp=datetime.now(timezone.utc),
        overall_status=overall,
        database=DiagnosticsComponent(
            status=db_status,
            message=db_msg,
            details={"database_url_scheme": settings.get_normalized_database_url().split("://")[0]}
        ),
        llm_service=DiagnosticsComponent(
            status=llm_status,
            message=llm_msg,
            details=llm_details
        ),
        speech_tts=DiagnosticsComponent(
            status=tts_status,
            message=tts_msg,
            details={"fallback_mode": "Text input available"}
        ),
        recording_storage=DiagnosticsComponent(
            status=storage_status,
            message=storage_msg,
            details={"max_size_mb": settings.MAX_UPLOAD_SIZE_MB}
        ),
        environment=settings.VOXORA_ENV
    )


@router.get("/api/knowledge")
def get_knowledge_base():
    """Retrieve FlowDesk AI knowledge base for transparency and frontend viewing"""
    return knowledge_service.data
