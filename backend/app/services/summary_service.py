"""
Post-call AI Summary and Intelligence Extraction Service.
Generates a structured Pydantic CallSummarySchema from the conversation transcript.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas.call import CallSummarySchema, SalesStatusEnum
from app.services.classification_service import classification_service

logger = logging.getLogger("voxora.summary")


SUMMARY_PROMPT = """Analyze this sales conversation transcript between Alex (Voxora AI sales rep for FlowDesk AI) and the customer.
Extract factual sales intelligence. NEVER invent or hallucinate information that was not explicitly stated.
If information was not mentioned, use null for optional strings or an empty list for array fields.

Output strictly valid JSON with this exact schema:
{{
  "overview": "Clear 2-3 sentence executive summary of the conversation",
  "customer_business": "Company type or industry if mentioned, else null",
  "customer_role": "Customer's job title or role if mentioned, else null",
  "requirements_pain_points": ["Specific pain points mentioned"],
  "current_tools": ["Help desks or tools currently used, e.g. Zendesk"],
  "buying_signals": ["Positive indicators of interest or buying intent"],
  "objections": ["Concerns, hesitations, or objections raised"],
  "budget_timeline": "Budget constraints or decision timeline if explicitly mentioned, else null",
  "sales_status": "One of: Converted, Demo Requested, Follow-up Required, Interested, Not Interested, No Response",
  "status_evidence": "Explicit quote or factual evidence justifying the sales status",
  "recommended_next_step": "Actionable recommendation for the sales team"
}}

TRANSCRIPT:
{transcript}
"""


class SummaryService:
    def generate_summary(
        self,
        messages: List[Dict[str, str]],
        customer_name: str = "Prospect",
        company: Optional[str] = None
    ) -> CallSummarySchema:
        """Generates validated Pydantic summary from transcript messages"""
        # If no messages, return No Response summary
        if not messages:
            return CallSummarySchema(
                overview="Call completed without any conversational exchange.",
                customer_business=company,
                customer_role=None,
                requirements_pain_points=[],
                current_tools=[],
                buying_signals=[],
                objections=[],
                budget_timeline=None,
                sales_status=SalesStatusEnum.NO_RESPONSE,
                status_evidence="No spoken or written messages were received from the customer.",
                recommended_next_step="Attempt secondary contact via email or automated calendar link."
            )

        # First, compute deterministic status and evidence as baseline / validation ground truth
        status, evidence = classification_service.classify_conversation(messages)

        # Format transcript
        transcript_text = "\n".join([
            f"{m.get('speaker', 'unknown').upper()}: {m.get('text', '')}"
            for m in messages
        ])

        # Attempt Groq LLM extraction if configured
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)
                resp = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a sales intelligence analyzer that outputs strictly valid JSON."},
                        {"role": "user", "content": SUMMARY_PROMPT.format(transcript=transcript_text)}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    timeout=15.0
                )
                raw_json = json.loads(resp.choices[0].message.content.strip())
                # Validate with Pydantic
                return CallSummarySchema(**raw_json)
            except Exception as e:
                logger.warning(f"Groq summary extraction failed: {e}. Using deterministic fallback.")

        # Attempt OpenAI LLM extraction if configured
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a sales intelligence analyzer that outputs strictly valid JSON."},
                        {"role": "user", "content": SUMMARY_PROMPT.format(transcript=transcript_text)}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    timeout=15.0
                )
                raw_json = json.loads(resp.choices[0].message.content.strip())
                return CallSummarySchema(**raw_json)
            except Exception as e:
                logger.warning(f"OpenAI summary extraction failed: {e}. Using deterministic fallback.")

        # Deterministic extraction fallback
        return self._heuristic_summary(messages, status, evidence, customer_name, company)

    def _heuristic_summary(
        self,
        messages: List[Dict[str, str]],
        status: SalesStatusEnum,
        evidence: str,
        customer_name: str,
        company: Optional[str]
    ) -> CallSummarySchema:
        customer_texts = [m["text"] for m in messages if m.get("speaker") == "customer"]
        full_cust = " ".join(customer_texts).lower()

        pain_points = []
        if any(w in full_cust for w in ["backlog", "volume", "too many tickets", "overwhelmed"]):
            pain_points.append("High support ticket backlog and volume")
        if any(w in full_cust for w in ["slow", "hours", "delay", "response time"]):
            pain_points.append("Slow first response times to customer inquiries")
        if any(w in full_cust for w in ["repetitive", "routine", "same questions", "tier-1", "tier 1"]):
            pain_points.append("Repetitive tier-1 routine questions draining agent hours")

        tools = []
        for t in ["zendesk", "shopify", "intercom", "freshdesk", "slack", "hubspot", "jira"]:
            if t in full_cust:
                tools.append(t.capitalize())

        buying_signals = []
        if any(w in full_cust for w in ["demo", "schedule", "pricing", "how much", "sounds good", "interested"]):
            buying_signals.append("Prospect actively inquired about product evaluation and pricing")

        objections = []
        if any(w in full_cust for w in ["expensive", "budget", "costly"]):
            objections.append("Budget considerations or pricing verification")
        if any(w in full_cust for w in ["accuracy", "mistake", "wrong", "hallucinate"]):
            objections.append("Expressed concern over AI accuracy and error handling")
        if any(w in full_cust for w in ["not interested", "no thanks"]):
            objections.append("Customer declined current need for support automation")

        # Recommended next step based on status
        next_step_map = {
            SalesStatusEnum.CONVERTED: "Generate subscription agreement and schedule customer onboarding call.",
            SalesStatusEnum.DEMO_REQUESTED: "Send 20-minute sandbox demonstration calendar link and request sample FAQ/tickets.",
            SalesStatusEnum.FOLLOW_UP_REQUIRED: "Follow up via email with FlowDesk AI product deck and check back next week.",
            SalesStatusEnum.INTERESTED: "Send Growth tier feature overview and invite to 14-day free trial.",
            SalesStatusEnum.NOT_INTERESTED: "Archive prospect in CRM and mark for re-engagement in 6 months.",
            SalesStatusEnum.NO_RESPONSE: "Send automated follow-up email note."
        }

        overview = (
            f"Conducted sales conversation with {customer_name}"
            f"{f' from {company}' if company else ''}. "
            f"Prospect discussed support operations and evaluated FlowDesk AI automation capabilities."
        )

        return CallSummarySchema(
            overview=overview,
            customer_business=company,
            customer_role=None,
            requirements_pain_points=pain_points,
            current_tools=tools,
            buying_signals=buying_signals,
            objections=objections,
            budget_timeline=None,
            sales_status=status,
            status_evidence=evidence,
            recommended_next_step=next_step_map.get(status, "Follow up with customer.")
        )


summary_service = SummaryService()
