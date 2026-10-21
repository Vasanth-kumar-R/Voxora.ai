from app.services.knowledge_service import knowledge_service


def test_knowledge_base_loaded():
    data = knowledge_service.data
    assert data["product_name"] == "FlowDesk AI"
    assert "DEMONSTRATION DATA" in data["disclaimer"]
    assert len(data["pricing_tiers"]) >= 3
    assert len(data["key_features_and_benefits"]) >= 4
    assert len(data["frequently_asked_questions"]) >= 3


def test_prompt_context_contains_disclaimer_and_pricing():
    context = knowledge_service.get_system_prompt_context()
    assert "FlowDesk AI" in context
    assert "DEMONSTRATION DATA" in context or "DISCLAIMER" in context
    assert "$49" in context
    assert "$149" in context
