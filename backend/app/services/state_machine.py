"""
Explicit Call State Machine for Voxora AI.

State flow:
IDLE
  ↓ (start_call)
CONSENT_PENDING
  ↓ (consent granted)
CONNECTING
  ↓ (connected)
LISTENING
  ↓ (speech detected)
THINKING
  ↓ (LLM responded)
SPEAKING
  ↓ (TTS finished)
LISTENING (repeats loop)
  ↓ (end_call)
ENDING
  ↓ (audio uploaded / stopped)
PROCESSING
  ↓ (summary & status generated)
COMPLETED

Also:
Any state -> ERROR (on critical failure)
ERROR -> IDLE (on reset)
CONSENT_PENDING -> COMPLETED / IDLE (if consent declined)
"""

from typing import Set, Dict
from app.schemas.call import CallStateEnum


class StateMachineError(Exception):
    def __init__(self, from_state: str, to_state: str, reason: str = ""):
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
        super().__init__(f"Invalid state transition from '{from_state}' to '{to_state}'. {reason}".strip())


# Valid state transitions
VALID_TRANSITIONS: Dict[CallStateEnum, Set[CallStateEnum]] = {
    CallStateEnum.IDLE: {
        CallStateEnum.CONSENT_PENDING,
        CallStateEnum.CONNECTING,
        CallStateEnum.ERROR
    },
    CallStateEnum.CONSENT_PENDING: {
        CallStateEnum.CONNECTING,
        CallStateEnum.ENDING,
        CallStateEnum.COMPLETED,
        CallStateEnum.ERROR
    },
    CallStateEnum.CONNECTING: {
        CallStateEnum.LISTENING,
        CallStateEnum.SPEAKING, # greeting playback
        CallStateEnum.ENDING,
        CallStateEnum.ERROR
    },
    CallStateEnum.LISTENING: {
        CallStateEnum.THINKING,
        CallStateEnum.SPEAKING,
        CallStateEnum.ENDING,
        CallStateEnum.ERROR
    },
    CallStateEnum.THINKING: {
        CallStateEnum.SPEAKING,
        CallStateEnum.LISTENING, # timeout or empty
        CallStateEnum.ENDING,
        CallStateEnum.ERROR
    },
    CallStateEnum.SPEAKING: {
        CallStateEnum.LISTENING,
        CallStateEnum.ENDING,
        CallStateEnum.ERROR
    },
    CallStateEnum.ENDING: {
        CallStateEnum.PROCESSING,
        CallStateEnum.COMPLETED,
        CallStateEnum.ERROR
    },
    CallStateEnum.PROCESSING: {
        CallStateEnum.COMPLETED,
        CallStateEnum.ERROR
    },
    CallStateEnum.COMPLETED: {
        # Final terminal state; can be reset to IDLE for new session
        CallStateEnum.IDLE
    },
    CallStateEnum.ERROR: {
        CallStateEnum.IDLE,
        CallStateEnum.COMPLETED,
        CallStateEnum.PROCESSING # retry analysis
    }
}


class CallStateMachine:
    @staticmethod
    def validate_transition(current_state_str: str, next_state: CallStateEnum) -> bool:
        """Validates whether a transition from current_state to next_state is permitted"""
        try:
            curr = CallStateEnum(current_state_str)
        except ValueError:
            raise StateMachineError(current_state_str, next_state.value, "Unknown current state")
        
        allowed = VALID_TRANSITIONS.get(curr, set())
        if next_state not in allowed:
            raise StateMachineError(
                curr.value,
                next_state.value,
                f"Permitted next states from {curr.value}: {[s.value for s in allowed]}"
            )
        return True

    @staticmethod
    def can_record(current_state_str: str, consent_granted: bool) -> bool:
        """Enforces that recording is never active without explicit affirmative consent"""
        if not consent_granted:
            return False
        
        active_states = {
            CallStateEnum.CONNECTING.value,
            CallStateEnum.LISTENING.value,
            CallStateEnum.THINKING.value,
            CallStateEnum.SPEAKING.value
        }
        return current_state_str in active_states
