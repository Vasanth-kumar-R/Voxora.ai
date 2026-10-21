"""
Conversation Service for Voxora AI.
Implements the 12-point sales conversation strategy with real LLM integration (Groq / OpenAI)
and resilient fallback logic. Spoken responses are kept concise and conversational.
"""

import os
import time
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.knowledge_service import knowledge_service
from app.schemas.call import AIResponseResult, CallStateEnum

logger = logging.getLogger("voxora.conversation")


SYSTEM_PROMPT_TEMPLATE = """You are Alex, an intelligent voice sales representative for FlowDesk AI, operating on the Voxora AI autonomous voice sales platform.
Your persona: Professional, friendly, empathetic, respectful, and articulate.

CORE DIRECTIVES:
1. TRANSPARENCY: Always be honest that you are an AI assistant. Never pretend to be human.
2. PERMISSION: On first greeting, ask permission to speak briefly about their support workflow.
3. CONVERSATIONAL BREVITY: Keep your responses CONCISE (1 to 3 sentences maximum, under 45 words). This is a spoken voice call—long paragraphs are unnatural and hard to listen to.
4. SALES STRATEGY:
   - Discover their business, support team size, and current help desk tools (e.g. Zendesk, Freshdesk, Shopify).
   - Uncover pain points (ticket backlog, slow response times, repetitive tier-1 questions).
   - Match FlowDesk AI capabilities to their specific pain points.
   - Answer technical, pricing, and integration questions strictly from the provided knowledge base.
   - Handle objections politely and truthfully.
   - Offer a tailored 20-minute sandbox demonstration when interest is shown.
   - Never be pushy, aggressive, or manipulative. If they say no or ask to stop, politely acknowledge and wrap up.
5. ACCURACY: NEVER invent discounts, secret features, or non-existent integrations. All pricing ($49 Starter, $149 Growth, $399 Scale) is demonstration data.

KNOWLEDGE BASE:
{knowledge_base}
"""


class ConversationService:
    def __init__(self):
        self.groq_client = None
        self.openai_client = None
        self._init_clients()

    def _init_clients(self):
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq LLM client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")

        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI LLM client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")

    def generate_greeting(self, customer_name: str = "there", company: Optional[str] = None) -> AIResponseResult:
        """Generates initial greeting introducing Alex as AI and asking permission to continue"""
        target = f" at {company}" if company else ""
        greeting = (
            f"Hello {customer_name}! I'm Alex, an AI sales specialist from Voxora AI reaching out on behalf of FlowDesk AI{target}. "
            f"Do you have a couple of minutes to chat about your customer support workflow?"
        )
        return AIResponseResult(
            ai_message=greeting,
            detected_sentiment="neutral",
            call_state=CallStateEnum.SPEAKING
        )

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        customer_name: str = "there",
        company: Optional[str] = None
    ) -> AIResponseResult:
        """
        Generates contextual AI response adhering to sales guidelines using Groq/OpenAI,
        with offline intelligent fallback.
        """
        kb_context = knowledge_service.get_system_prompt_context()
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(knowledge_base=kb_context)

        # Build message history for LLM
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            role = "assistant" if m.get("speaker") == "ai" else "user"
            formatted_messages.append({"role": role, "content": m.get("text", "")})

        # Try Groq first if available
        if self.groq_client and settings.GROQ_API_KEY:
            try:
                start_time = time.time()
                completion = self.groq_client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=formatted_messages,
                    temperature=0.7,
                    max_tokens=150,
                    timeout=10.0
                )
                duration = time.time() - start_time
                reply_text = completion.choices[0].message.content.strip()
                logger.info(f"Groq response generated in {duration:.2f}s")
                return AIResponseResult(
                    ai_message=reply_text,
                    detected_sentiment=self._detect_sentiment(reply_text),
                    call_state=CallStateEnum.SPEAKING
                )
            except Exception as e:
                logger.error(f"Groq API call error: {e}. Falling back...")

        # Try OpenAI if available
        if self.openai_client and settings.OPENAI_API_KEY:
            try:
                start_time = time.time()
                completion = self.openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=formatted_messages,
                    temperature=0.7,
                    max_tokens=150,
                    timeout=10.0
                )
                duration = time.time() - start_time
                reply_text = completion.choices[0].message.content.strip()
                logger.info(f"OpenAI response generated in {duration:.2f}s")
                return AIResponseResult(
                    ai_message=reply_text,
                    detected_sentiment=self._detect_sentiment(reply_text),
                    call_state=CallStateEnum.SPEAKING
                )
            except Exception as e:
                logger.error(f"OpenAI API call error: {e}. Falling back...")

        # Resilient offline sales response agent
        return self._offline_sales_agent(messages, customer_name, company)

    def _detect_sentiment(self, text: str) -> str:
        text_lower = text.lower()
        if any(w in text_lower for w in ["great", "excited", "happy", "wonderful", "delighted", "love"]):
            return "positive"
        if any(w in text_lower for w in ["unhappy", "frustrated", "bad", "terrible", "expensive", "waste"]):
            return "negative"
        return "neutral"

    def _offline_sales_agent(
        self,
        messages: List[Dict[str, str]],
        customer_name: str,
        company: Optional[str]
    ) -> AIResponseResult:
        """
        Intelligent offline conversational agent strictly implementing the 12-point sales strategy
        when no external LLM API key is provisioned.
        """
        last_cust_msg = ""
        for m in reversed(messages):
            if m.get("speaker") == "customer":
                last_cust_msg = m.get("text", "").lower()
                break

        # Check for stop / refusal
        if any(w in last_cust_msg for w in ["stop", "not interested", "no thanks", "no thank you", "bye", "don't call"]):
            return AIResponseResult(
                ai_message="I completely understand and respect your decision. Thank you for your time today, and have a great rest of your week!",
                detected_sentiment="neutral",
                call_state=CallStateEnum.SPEAKING
            )

        # Check for demo request
        if any(w in last_cust_msg for w in ["demo", "schedule", "book", "show me", "demonstration", "see it"]):
            return AIResponseResult(
                ai_message="Fantastic! We'd love to show you FlowDesk AI in action. I can have our technical specialist set up a tailored 20-minute sandbox with your sample tickets. Would morning or afternoon work better for you?",
                detected_sentiment="positive",
                call_state=CallStateEnum.SPEAKING
            )

        # Check for pricing questions
        if any(w in last_cust_msg for w in ["price", "cost", "how much", "pricing", "tier", "subscription"]):
            return AIResponseResult(
                ai_message="FlowDesk AI starts at $49 a month for our Starter tier, while our popular Growth tier is $149 a month including omnichannel support and our live agent copilot. We also offer a 14-day free trial. What size is your support team currently?",
                detected_sentiment="neutral",
                call_state=CallStateEnum.SPEAKING
            )

        # Check for integrations
        if any(w in last_cust_msg for w in ["zendesk", "shopify", "intercom", "freshdesk", "slack", "integrate", "crm"]):
            return AIResponseResult(
                ai_message="Yes! FlowDesk AI integrates natively with Zendesk, Shopify, Freshdesk, Intercom, and Slack in under 15 minutes with zero code required. Which of those tools do your agents use most heavily?",
                detected_sentiment="positive",
                call_state=CallStateEnum.SPEAKING
            )

        # Check for accuracy / hallucination concerns
        if any(w in last_cust_msg for w in ["mistake", "wrong", "hallucinate", "accuracy", "error", "safe"]):
            return AIResponseResult(
                ai_message="That's a crucial concern. FlowDesk AI enforces an 85% confidence threshold. If a query is ambiguous, it gracefully hands the ticket to a human agent with a concise summary rather than guessing.",
                detected_sentiment="neutral",
                call_state=CallStateEnum.SPEAKING
            )

        # Check for permission response ("yes", "sure", "ok", "go ahead")
        if any(w in last_cust_msg for w in ["yes", "sure", "okay", "ok", "go ahead", "sounds good", "alright"]):
            return AIResponseResult(
                ai_message="Wonderful! Could you share what the single biggest challenge is for your customer support team right now—is it ticket volume, slow response times, or repetitive tier-1 questions?",
                detected_sentiment="positive",
                call_state=CallStateEnum.SPEAKING
            )

        # Default discovery & value response
        return AIResponseResult(
            ai_message="FlowDesk AI resolves over 65% of repetitive support inquiries instantly while helping agents draft replies 3 times faster. Would you be open to a quick 20-minute sandbox walkthrough to see it in action?",
            detected_sentiment="neutral",
            call_state=CallStateEnum.SPEAKING
        )


conversation_service = ConversationService()
