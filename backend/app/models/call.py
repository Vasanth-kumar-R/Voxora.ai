import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Call(Base):
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    correlation_id = Column(String(64), nullable=False, default=generate_uuid)
    customer_name = Column(String(128), nullable=False, default="Guest Prospect")
    customer_company = Column(String(128), nullable=True)
    language = Column(String(10), nullable=False, default="en")
    
    # State Machine state: IDLE, CONSENT_PENDING, CONNECTING, LISTENING, THINKING, SPEAKING, ENDING, PROCESSING, COMPLETED, ERROR
    state = Column(String(32), nullable=False, default="IDLE")
    
    # Consent and Recording
    consent_granted = Column(Boolean, nullable=False, default=False)
    recording_url = Column(String(512), nullable=True)
    recording_filename = Column(String(256), nullable=True)
    recording_duration_seconds = Column(Float, nullable=True, default=0.0)
    recording_status = Column(String(32), nullable=False, default="not_started") # not_started, recording, saved, failed
    
    # Sales Intelligence
    sales_status = Column(String(32), nullable=True) # Converted, Demo Requested, Follow-up Required, Interested, Not Interested, No Response
    sales_status_evidence = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    messages = relationship("CallMessage", back_populates="call", cascade="all, delete-orphan", order_by="CallMessage.timestamp")
    summary = relationship("CallSummary", back_populates="call", uselist=False, cascade="all, delete-orphan")
    events = relationship("CallEvent", back_populates="call", cascade="all, delete-orphan", order_by="CallEvent.timestamp")


class CallMessage(Base):
    __tablename__ = "call_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker = Column(String(16), nullable=False) # 'customer' | 'ai' | 'system'
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now)
    correlation_id = Column(String(64), nullable=True)

    call = relationship("Call", back_populates="messages")


class CallSummary(Base):
    __tablename__ = "call_summaries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    overview = Column(Text, nullable=False)
    customer_business = Column(String(256), nullable=True)
    customer_role = Column(String(128), nullable=True)
    requirements_pain_points = Column(JSON, nullable=False, default=list)
    current_tools = Column(JSON, nullable=False, default=list)
    buying_signals = Column(JSON, nullable=False, default=list)
    objections = Column(JSON, nullable=False, default=list)
    budget_timeline = Column(String(256), nullable=True)
    sales_status = Column(String(32), nullable=False)
    status_evidence = Column(Text, nullable=False)
    recommended_next_step = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    call = relationship("Call", back_populates="summary")


class CallEvent(Base):
    __tablename__ = "call_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    call = relationship("Call", back_populates="events")
