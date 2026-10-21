from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SalesStatusEnum(str, Enum):
    CONVERTED = "Converted"
    DEMO_REQUESTED = "Demo Requested"
    FOLLOW_UP_REQUIRED = "Follow-up Required"
    INTERESTED = "Interested"
    NOT_INTERESTED = "Not Interested"
    NO_RESPONSE = "No Response"


class CallStateEnum(str, Enum):
    IDLE = "IDLE"
    CONSENT_PENDING = "CONSENT_PENDING"
    CONNECTING = "CONNECTING"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    SPEAKING = "SPEAKING"
    ENDING = "ENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class SpeakerEnum(str, Enum):
    CUSTOMER = "customer"
    AI = "ai"
    SYSTEM = "system"


# Request Schemas
class CreateCallRequest(BaseModel):
    customer_name: str = Field(default="Prospect", min_length=1, max_length=128)
    customer_company: Optional[str] = Field(default=None, max_length=128)
    language: str = Field(default="en", max_length=10)


class ConsentRequest(BaseModel):
    consent: bool
    reason: Optional[str] = None


class AddMessageRequest(BaseModel):
    speaker: SpeakerEnum
    text: str = Field(min_length=1)
    correlation_id: Optional[str] = None


class GenerateAIResponseRequest(BaseModel):
    customer_message: Optional[str] = None
    force_greeting: bool = False
    correlation_id: Optional[str] = None


class EndCallRequest(BaseModel):
    duration_seconds: Optional[float] = 0.0
    reason: Optional[str] = "user_ended"


# Response Schemas
class MessageResponse(BaseModel):
    id: str
    call_id: str
    speaker: str
    text: str
    timestamp: datetime
    correlation_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CallSummarySchema(BaseModel):
    overview: str = Field(description="Comprehensive summary of the sales conversation")
    customer_business: Optional[str] = Field(default=None, description="Disclosed business type, size, or industry")
    customer_role: Optional[str] = Field(default=None, description="Disclosed role or title of the prospect")
    requirements_pain_points: List[str] = Field(default_factory=list, description="Specific pain points and needs mentioned")
    current_tools: List[str] = Field(default_factory=list, description="Tools or help desks currently used (e.g. Zendesk, Shopify)")
    buying_signals: List[str] = Field(default_factory=list, description="Positive purchase or evaluation indicators")
    objections: List[str] = Field(default_factory=list, description="Hesitations, budget blockers, or objections raised")
    budget_timeline: Optional[str] = Field(default=None, description="Explicitly stated budget or decision timeline")
    sales_status: SalesStatusEnum = Field(description="One of the exactly 6 permitted statuses")
    status_evidence: str = Field(description="Explicit transcript quotes and factual basis supporting the classification")
    recommended_next_step: str = Field(description="Actionable next step for sales or account executive")

    model_config = ConfigDict(from_attributes=True)


class AIResponseResult(BaseModel):
    ai_message: str
    detected_sentiment: Optional[str] = "neutral"
    suggested_status: Optional[str] = None
    call_state: CallStateEnum = CallStateEnum.SPEAKING


class CallDetailResponse(BaseModel):
    id: str
    correlation_id: str
    customer_name: str
    customer_company: Optional[str] = None
    language: str
    state: str
    consent_granted: bool
    recording_url: Optional[str] = None
    recording_duration_seconds: Optional[float] = 0.0
    recording_status: str
    sales_status: Optional[str] = None
    sales_status_evidence: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    ended_at: Optional[datetime] = None
    messages: List[MessageResponse] = []
    summary: Optional[CallSummarySchema] = None

    model_config = ConfigDict(from_attributes=True)


class CallListItemResponse(BaseModel):
    id: str
    customer_name: str
    customer_company: Optional[str] = None
    language: str
    state: str
    consent_granted: bool
    recording_url: Optional[str] = None
    recording_duration_seconds: Optional[float] = 0.0
    recording_status: str
    sales_status: Optional[str] = None
    created_at: datetime
    ended_at: Optional[datetime] = None
    message_count: int = 0
    has_summary: bool = False

    model_config = ConfigDict(from_attributes=True)


class DiagnosticsComponent(BaseModel):
    status: str # "healthy" | "warning" | "degraded" | "error"
    message: str
    details: Optional[Dict[str, Any]] = None


class DiagnosticsResponse(BaseModel):
    timestamp: datetime
    overall_status: str
    database: DiagnosticsComponent
    llm_service: DiagnosticsComponent
    speech_tts: DiagnosticsComponent
    recording_storage: DiagnosticsComponent
    environment: str
