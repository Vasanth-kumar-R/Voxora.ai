import pytest
from app.schemas.call import CallStateEnum
from app.services.state_machine import CallStateMachine, StateMachineError


def test_valid_transitions():
    # IDLE -> CONSENT_PENDING
    assert CallStateMachine.validate_transition("IDLE", CallStateEnum.CONSENT_PENDING) is True
    
    # CONSENT_PENDING -> CONNECTING
    assert CallStateMachine.validate_transition("CONSENT_PENDING", CallStateEnum.CONNECTING) is True
    
    # CONNECTING -> LISTENING
    assert CallStateMachine.validate_transition("CONNECTING", CallStateEnum.LISTENING) is True
    
    # LISTENING -> THINKING
    assert CallStateMachine.validate_transition("LISTENING", CallStateEnum.THINKING) is True
    
    # THINKING -> SPEAKING
    assert CallStateMachine.validate_transition("THINKING", CallStateEnum.SPEAKING) is True
    
    # SPEAKING -> LISTENING
    assert CallStateMachine.validate_transition("SPEAKING", CallStateEnum.LISTENING) is True
    
    # LISTENING -> ENDING
    assert CallStateMachine.validate_transition("LISTENING", CallStateEnum.ENDING) is True
    
    # ENDING -> PROCESSING
    assert CallStateMachine.validate_transition("ENDING", CallStateEnum.PROCESSING) is True
    
    # PROCESSING -> COMPLETED
    assert CallStateMachine.validate_transition("PROCESSING", CallStateEnum.COMPLETED) is True


def test_invalid_transitions():
    # IDLE cannot jump directly to SPEAKING
    with pytest.raises(StateMachineError):
        CallStateMachine.validate_transition("IDLE", CallStateEnum.SPEAKING)
        
    # COMPLETED cannot jump directly to LISTENING
    with pytest.raises(StateMachineError):
        CallStateMachine.validate_transition("COMPLETED", CallStateEnum.LISTENING)


def test_recording_consent_enforcement():
    # Never record without consent
    assert CallStateMachine.can_record(CallStateEnum.LISTENING.value, consent_granted=False) is False
    assert CallStateMachine.can_record(CallStateEnum.CONSENT_PENDING.value, consent_granted=False) is False
    
    # Never record in IDLE or CONSENT_PENDING even if flag is True
    assert CallStateMachine.can_record(CallStateEnum.IDLE.value, consent_granted=True) is False
    assert CallStateMachine.can_record(CallStateEnum.CONSENT_PENDING.value, consent_granted=True) is False
    
    # Can record in active states when consent is granted
    assert CallStateMachine.can_record(CallStateEnum.LISTENING.value, consent_granted=True) is True
    assert CallStateMachine.can_record(CallStateEnum.SPEAKING.value, consent_granted=True) is True
