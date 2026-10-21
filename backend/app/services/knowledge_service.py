import json
from pathlib import Path
from typing import Dict, Any, Optional

KNOWLEDGE_FILE = Path(__file__).resolve().parent.parent / "knowledge" / "flowdesk_knowledge.json"


class KnowledgeService:
    def __init__(self, file_path: Optional[Path] = None):
        self.file_path = file_path or KNOWLEDGE_FILE
        self._data: Optional[Dict[str, Any]] = None
        self.load_knowledge()

    def load_knowledge(self) -> Dict[str, Any]:
        """Loads or reloads the knowledge base from JSON file"""
        if not self.file_path.exists():
            raise FileNotFoundError(f"Knowledge file not found at {self.file_path}")
        with open(self.file_path, "r", encoding="utf-8") as f:
            self._data = json.load(f)
        return self._data

    @property
    def data(self) -> Dict[str, Any]:
        if self._data is None:
            self.load_knowledge()
        return self._data

    def get_system_prompt_context(self) -> str:
        """Formats the knowledge base into a concise, high-signal prompt context for the sales AI"""
        kb = self.data
        overview = kb.get("overview", {})
        tiers = kb.get("pricing_tiers", [])
        integrations = kb.get("integrations", {})
        faqs = kb.get("frequently_asked_questions", [])

        pricing_summary = "\n".join([
            f"- {t['tier']}: {t['demo_price']} ({t['annual_price']}). Includes: {', '.join(t['includes'][:3])}."
            for t in tiers
        ])

        faq_summary = "\n".join([
            f"Q: {f['question']}\nA: {f['answer']}"
            for f in faqs[:4]
        ])

        return f"""
PRODUCT YOU ARE PITCHING: {kb.get('product_name')} - {kb.get('product_tagline')}
DISCLAIMER: {kb.get('disclaimer')}

CORE VALUE PROPOSITION:
{overview.get('short_description')}
Key advantages:
{chr(10).join(['* ' + p for p in overview.get('primary_value_propositions', [])])}

DEMO PRICING TIERS:
{pricing_summary}
Commercial Terms: 14-day free trial (no credit card), 20% annual billing discount, month-to-month contracts.

SUPPORTED INTEGRATIONS:
{', '.join(integrations.get('supported', []))}
Limitations: {', '.join(integrations.get('limitations', []))}

FREQUENTLY ASKED QUESTIONS:
{faq_summary}

DEMO PROCESS:
20-minute tailored sandbox demo where we run their sample tickets live.
"""


knowledge_service = KnowledgeService()
