import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    assert res.json()["app"] == "Voxora AI"


def test_diagnostics_endpoint():
    res = client.get("/api/diagnostics")
    assert res.status_code == 200
    data = res.json()
    assert "database" in data
    assert "llm_service" in data
    assert "recording_storage" in data


def test_complete_call_lifecycle():
    # 1. Create Call
    create_payload = {
        "customer_name": "Jordan Lee",
        "customer_company": "Peak Ecom",
        "language": "en"
    }
    create_res = client.post("/api/calls", json=create_payload)
    assert create_res.status_code == 201
    call_data = create_res.json()
    call_id = call_data["id"]
    assert call_data["customer_name"] == "Jordan Lee"
    assert call_data["state"] == "CONSENT_PENDING"
    assert call_data["consent_granted"] is False

    # 2. Affirmative Recording Consent
    consent_res = client.post(f"/api/calls/{call_id}/consent", json={"consent": True})
    assert consent_res.status_code == 200
    assert consent_res.json()["consent_granted"] is True
    assert consent_res.json()["state"] == "CONNECTING"

    # 3. Request initial greeting
    greeting_res = client.post(f"/api/calls/{call_id}/respond", json={"force_greeting": True})
    assert greeting_res.status_code == 200
    greeting_text = greeting_res.json()["ai_message"]
    assert "Alex" in greeting_text
    assert "Voxora AI" in greeting_text or "FlowDesk AI" in greeting_text

    # 4. Add customer message
    msg_res = client.post(f"/api/calls/{call_id}/messages", json={
        "speaker": "customer",
        "text": "Hi Alex, we use Zendesk and have about 8 agents drowning in tickets."
    })
    assert msg_res.status_code == 200
    assert msg_res.json()["speaker"] == "customer"

    # 5. Prevent duplicate message within 3 seconds
    dup_res = client.post(f"/api/calls/{call_id}/messages", json={
        "speaker": "customer",
        "text": "Hi Alex, we use Zendesk and have about 8 agents drowning in tickets."
    })
    assert dup_res.status_code == 200
    assert dup_res.json().get("status") == "duplicate_ignored"

    # 6. Customer requests a demo and AI responds
    demo_res = client.post(f"/api/calls/{call_id}/respond", json={
        "customer_message": "Could we book a demo for next Tuesday to test it with our Zendesk account?"
    })
    assert demo_res.status_code == 200
    ai_reply = demo_res.json()["ai_message"]
    assert len(ai_reply) > 10

    # 7. End Call (Idempotent finalization)
    end_res = client.post(f"/api/calls/{call_id}/end", json={"duration_seconds": 45.0})
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["status"] == "completed"
    assert end_data["sales_status"] == "Demo Requested"

    # Repeating end call should remain completed idempotently
    end_res2 = client.post(f"/api/calls/{call_id}/end", json={"duration_seconds": 45.0})
    assert end_res2.status_code == 200
    assert end_res2.json()["status"] == "already_completed"

    # 8. Retrieve Call Detail
    detail_res = client.get(f"/api/calls/{call_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["state"] == "COMPLETED"
    assert detail["sales_status"] == "Demo Requested"
    assert detail["summary"] is not None
    assert detail["summary"]["sales_status"] == "Demo Requested"
    assert "Zendesk" in detail["summary"]["current_tools"]

    # 9. List Call History
    list_res = client.get("/api/calls")
    assert list_res.status_code == 200
    history = list_res.json()
    assert len(history) >= 1
    found = any(c["id"] == call_id for c in history)
    assert found is True
