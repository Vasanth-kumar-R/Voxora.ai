"""
Sales Status Classification Service.
Enforces deterministic precedence rules and validates evidence.
"""

from typing import List, Tuple, Dict, Any, Optional
import re
from app.schemas.call import SalesStatusEnum


class ClassificationService:
    @staticmethod
    def classify_conversation(messages: List[Dict[str, str]]) -> Tuple[SalesStatusEnum, str]:
        """
        Deterministic evaluation of conversation transcript to identify sales status and factual evidence.
        Precedence:
        1. Converted (explicit checkout/purchase intent/subscription agreement)
        2. Demo Requested (explicit request or agreement to book demo)
        3. Follow-up Required (requested callback, email info, future meeting)
        4. Not Interested (explicit decline, refusal, competitor lock-in, shutdown)
        5. Interested (positive curiosity, asking about pricing/features without booking)
        6. No Response (only if 0 customer messages or customer never answered greetings)
        """
        customer_msgs = [m["text"] for m in messages if m.get("speaker") == "customer"]
        all_text = " ".join(customer_msgs).lower()

        # Check for No Response: Customer never spoke or said nothing
        if not customer_msgs or len(all_text.strip()) == 0:
            return SalesStatusEnum.NO_RESPONSE, "Customer did not provide any spoken or typed responses during the session."

        # 1. Check for Converted (Strongest commitment)
        conversion_patterns = [
            r"\b(buy|purchase|sign up now|subscribe|take my money|send the contract|ready to pay|start paid plan)\b",
            r"\b(credit card ready|send the invoice|let's buy it)\b"
        ]
        for pat in conversion_patterns:
            match = re.search(pat, all_text)
            if match:
                evidence = f"Customer explicitly expressed purchase commitment: '{match.group(0)}'"
                return SalesStatusEnum.CONVERTED, evidence

        # 2. Check for Demo Requested (Takes precedence over general interest)
        demo_patterns = [
            r"\b(book a demo|schedule a demo|see a demo|arrange a demo|demo please|demonstration|calendar|send me an invite|schedule a call)\b",
            r"\b(show me the platform|walk me through|sandbox demo)\b"
        ]
        for pat in demo_patterns:
            match = re.search(pat, all_text)
            if match:
                evidence = f"Customer explicitly requested or agreed to a product demonstration: '{match.group(0)}'"
                return SalesStatusEnum.DEMO_REQUESTED, evidence

        # 3. Check for Follow-up Required
        followup_patterns = [
            r"\b(call me back|email me|reach out next week|follow up with me|send me details|check back in|reach back out)\b",
            r"\b(speak to my team first|need to check with my boss|send information over email)\b"
        ]
        for pat in followup_patterns:
            match = re.search(pat, all_text)
            if match:
                evidence = f"Customer requested subsequent follow-up or team consultation: '{match.group(0)}'"
                return SalesStatusEnum.FOLLOW_UP_REQUIRED, evidence

        # 4. Check for Not Interested (Explicit refusal)
        not_interested_patterns = [
            r"\b(not interested|no thank you|no thanks|stop calling|don't need this|pass on this|we are good|leave me alone)\b",
            r"\b(unhappy|hate ai|waste of time|no budget at all)\b"
        ]
        for pat in not_interested_patterns:
            match = re.search(pat, all_text)
            if match:
                evidence = f"Customer clearly expressed disinterest or declined the offer: '{match.group(0)}'"
                return SalesStatusEnum.NOT_INTERESTED, evidence

        # 5. Check for Interested
        interested_patterns = [
            r"\b(tell me more|how much|pricing|features|sounds interesting|sounds cool|nice|helpful|works with zendesk|shopify|cool)\b",
            r"\b(support automation|good to know|curious|how does it work)\b"
        ]
        for pat in interested_patterns:
            match = re.search(pat, all_text)
            if match:
                evidence = f"Customer expressed active curiosity and asked engaging questions: '{match.group(0)}'"
                return SalesStatusEnum.INTERESTED, evidence

        # Default fallback for regular dialogue without strong signals: Follow-up Required or Interested
        if len(customer_msgs) >= 2:
            return SalesStatusEnum.INTERESTED, f"Customer participated in {len(customer_msgs)} conversational exchanges regarding FlowDesk AI capabilities."
        
        return SalesStatusEnum.FOLLOW_UP_REQUIRED, "Conversation ended before clear qualification was completed; follow-up contact recommended."


classification_service = ClassificationService()
