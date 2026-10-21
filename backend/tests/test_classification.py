from app.schemas.call import SalesStatusEnum
from app.services.classification_service import classification_service


def test_classify_no_response():
    messages = []
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.NO_RESPONSE
    assert "No" in evidence or "no" in evidence


def test_classify_converted():
    messages = [
        {"speaker": "ai", "text": "FlowDesk AI Growth tier is $149/mo."},
        {"speaker": "customer", "text": "That sounds great, I am ready to purchase and sign up now! Send the contract."}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.CONVERTED
    assert "purchase" in evidence.lower() or "contract" in evidence.lower() or "commitment" in evidence.lower()


def test_classify_demo_requested():
    messages = [
        {"speaker": "ai", "text": "Would you like to see how it auto-resolves tickets?"},
        {"speaker": "customer", "text": "Yes, can we schedule a demo for Thursday morning?"}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.DEMO_REQUESTED
    assert "demo" in evidence.lower() or "demonstration" in evidence.lower()


def test_classify_demo_precedence_over_interested():
    # Customer is interested AND requests a demo -> Demo Requested must take precedence
    messages = [
        {"speaker": "ai", "text": "FlowDesk AI integrates with Zendesk."},
        {"speaker": "customer", "text": "This sounds really interesting and cool! Can you book a demo for our team?"}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.DEMO_REQUESTED


def test_classify_follow_up_required():
    messages = [
        {"speaker": "ai", "text": "Does this sound like a fit for your 5 support agents?"},
        {"speaker": "customer", "text": "I need to check with my boss first. Please call me back next week."}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.FOLLOW_UP_REQUIRED
    assert "follow-up" in evidence.lower() or "consultation" in evidence.lower()


def test_classify_not_interested():
    messages = [
        {"speaker": "ai", "text": "Do you have two minutes to discuss customer support?"},
        {"speaker": "customer", "text": "No thank you, we are not interested, please do not call again."}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.NOT_INTERESTED
    assert "disinterest" in evidence.lower() or "declined" in evidence.lower()


def test_classify_interested():
    messages = [
        {"speaker": "ai", "text": "How many tickets do you handle weekly?"},
        {"speaker": "customer", "text": "Around 500. Tell me more about your pricing and features."}
    ]
    status, evidence = classification_service.classify_conversation(messages)
    assert status == SalesStatusEnum.INTERESTED
