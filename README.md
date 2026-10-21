# Voxora AI — Autonomous AI Voice Sales Platform

> **Tagline:** Every conversation. More sales intelligence.

Voxora AI is an autonomous, real-time AI voice sales platform built for modern sales teams. It conducts live voice sales conversations, transcribes both participants in real-time, mixes customer microphone and AI speech into a single playable recording with explicit affirmative consent, extracts structured sales intelligence with validated Pydantic schemas, assigns one of six deterministic sales statuses with supporting evidence, and preserves complete call pipelines across sessions.

---

## 1. Product Identity & Fictional Grounding

- **Platform:** **Voxora AI**
- **Demonstration SaaS Product Pitched:** **FlowDesk AI** (Autonomous Customer Support Automation for SMBs)
- **Demonstration Notice:** All FlowDesk AI customer profiles, pricing tiers ($49 Starter, $149 Growth, $399 Scale), and SLA details are strictly fictional demonstration data for platform evaluation.

---

## 2. Architecture & Call State Machine

### 2.1 System Architecture

```mermaid
flowchart TD
    subgraph BrowserClient ["Frontend (Next.js 16 + React 19 + Tailwind CSS)"]
        UI["Live Call Workspace & Dashboard"]
        Mic["Customer Microphone (getUserMedia)"]
        STT["Web Speech Recognition (STT)"]
        TTS["Web Speech Synthesis (TTS)"]
        Merger["Web Audio API Stream Merger"]
        Recorder["MediaRecorder (Mixed Audio WebM)"]
    end

    subgraph BackendAPI ["Backend Service (FastAPI + Python 3.12)"]
        Router["FastAPI REST & State Machine Router"]
        SM["Explicit Call State Machine"]
        KB["FlowDesk AI Knowledge Service"]
        LLM["Conversation Service (Groq Llama-3.3-70B / OpenAI / Resilient Engine)"]
        Classify["Deterministic Sales Status Classifier"]
        Summary["Pydantic Summary & Intelligence Extractor"]
        Storage["Audio Storage Service (/recordings)"]
    end

    subgraph Persistence ["Persistence Layer"]
        DB[(Supabase PostgreSQL / Local SQLite)]
        AudioDisk[(Durable Audio Storage)]
    end

    UI -->|Start Call| Router
    Mic --> STT
    STT -->|Incremental Customer Transcript| Router
    Router --> SM
    Router --> LLM
    KB -->|Grounded Product Specs| LLM
    LLM -->|Audible Reply| Router
    Router --> TTS
    Mic --> Merger
    TTS --> Merger
    Merger --> Recorder
    Recorder -->|POST /api/calls/{id}/recording| Storage
    Storage --> AudioDisk
    Router --> DB
    Router --> Classify
    Router --> Summary
    Summary --> DB
```

### 2.2 Explicit Call State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> CONSENT_PENDING: Start Call
    CONSENT_PENDING --> CONNECTING: Consent Granted
    CONSENT_PENDING --> COMPLETED: Consent Declined (Voice Only)
    CONNECTING --> LISTENING: Speech Ready / Greeting
    CONNECTING --> SPEAKING: Alex Initial Greeting
    SPEAKING --> LISTENING: TTS Playback Completed
    LISTENING --> THINKING: Customer Utterance Captured
    THINKING --> SPEAKING: AI Sales Response Generated
    LISTENING --> ENDING: End Call Triggered
    SPEAKING --> ENDING: End Call Triggered
    ENDING --> PROCESSING: Audio Uploaded
    PROCESSING --> COMPLETED: Pydantic Summary & Status Persisted
    ERROR --> IDLE: Reset Session
    COMPLETED --> [*]
```

---

## 3. Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Speech API, Web Audio API, MediaRecorder.
- **Backend:** Python 3.12, FastAPI, Pydantic v2 schemas, SQLAlchemy 2.0.
- **Database:** Supabase PostgreSQL (production) & SQLite (zero-config local development).
- **AI Engine:** Groq API (`llama-3.3-70b-versatile` / `llama3-70b-8192`), OpenAI API fallback (`gpt-4o-mini`), and built-in offline resilient dialogue engine.
- **Voice & Recording:** Dual-channel Web Audio stream merger, browser SpeechRecognition with anti-echo suppression during AI playback, SpeechSynthesis, and authorized streaming audio playback.

---

## 4. Sales Status Classification Engine

Voxora AI enforces exactly six standardized statuses with deterministic precedence rules:

| Sales Status | Evaluation Criteria & Precedence |
| :--- | :--- |
| **`Converted`** | Explicit evidence of genuine purchase commitment or checkout request (e.g., "ready to buy", "send invoice", "sign up now"). |
| **`Demo Requested`** | Customer explicitly asks to arrange a demonstration. **Takes precedence over general interest.** |
| **`Follow-up Required`** | Customer requests future conversation or team consultation (e.g., "call me next week", "check with boss"). |
| **`Interested`** | Meaningful positive interest, asking about pricing and integrations without a stronger booking. |
| **`Not Interested`** | Explicit decline or refusal (e.g., "not interested", "no thank you", "stop calling"). |
| **`No Response`** | No customer response after contact attempt. *Never assigned to a completed conversation.* |

---

## 5. Prerequisites

- **Node.js:** v18.0.0 or later (v25+ verified)
- **npm:** v9.0.0 or later
- **Python:** 3.11 or 3.12
- **Operating System:** Windows 10/11, macOS, or Linux

---

## 6. Windows Setup & Startup Instructions

### 6.1 Clone & Enter Repository

```powershell
cd "d:\voice ai"
```

### 6.2 Backend Setup

1. Install Python dependencies:
   ```powershell
   python -m pip install -r backend/requirements.txt
   ```
2. (Optional) Configure environment variables:
   Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   Add your `GROQ_API_KEY` (or `OPENAI_API_KEY`). If no key is set, Voxora AI automatically operates with its built-in intelligent fallback agent.

3. Run automated backend test suite:
   ```powershell
   python -m pytest backend/tests -v
   ```

4. Start FastAPI backend (Port 8000):
   ```powershell
   python backend/run.py
   ```
   *Backend interactive OpenAPI documentation will be live at `http://127.0.0.1:8000/docs`.*

### 6.3 Frontend Setup

In a separate PowerShell terminal:

1. Install frontend dependencies:
   ```powershell
   cd "d:\voice ai\frontend"
   npm install
   ```

2. Start Next.js development server (Port 3000):
   ```powershell
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 7. Supabase Database Configuration

Voxora AI is pre-configured to support Supabase PostgreSQL out-of-the-box.

1. Create a new project in your [Supabase Dashboard](https://supabase.com).
2. Go to **Project Settings** → **Database** → **Connection string** (URI).
3. Copy the URI and set it in your `.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
4. Run table initialization:
   Start the backend (`python backend/run.py`), which executes SQLAlchemy's `Base.metadata.create_all()`, automatically provisioning all 4 tables (`calls`, `call_messages`, `call_summaries`, `call_events`).
5. Alternatively, execute the provided SQL migration script directly in Supabase SQL Editor:
   ```powershell
   d:\voice ai\supabase_schema.sql
   ```

---

## 8. Vercel Deployment Guide

1. Push your repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and click **Add New Project** → Import Git repository.
3. Configure Project Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend` (or leave default if using root `vercel.json`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Configure Environment Variables in Vercel:
   - `BACKEND_URL`: Your deployed FastAPI backend endpoint (e.g. Render, Railway, Fly.io, or AWS EC2).
   - `GROQ_API_KEY`: Your Groq API key.
   - `DATABASE_URL`: Your Supabase connection string.
5. Click **Deploy**.

---

## 9. Verification & Automated Test Results

Automated unit and integration test results (`python -m pytest backend/tests -v`):

```
backend/tests/test_calls_api.py::test_health_endpoint PASSED
backend/tests/test_calls_api.py::test_diagnostics_endpoint PASSED
backend/tests/test_calls_api.py::test_complete_call_lifecycle PASSED
backend/tests/test_classification.py::test_classify_no_response PASSED
backend/tests/test_classification.py::test_classify_converted PASSED
backend/tests/test_classification.py::test_classify_demo_requested PASSED
backend/tests/test_classification.py::test_classify_demo_precedence_over_interested PASSED
backend/tests/test_classification.py::test_classify_follow_up_required PASSED
backend/tests/test_classification.py::test_classify_not_interested PASSED
backend/tests/test_classification.py::test_classify_interested PASSED
backend/tests/test_knowledge.py::test_knowledge_base_loaded PASSED
backend/tests/test_knowledge.py::test_prompt_context_contains_disclaimer_and_pricing PASSED
backend/tests/test_state_machine.py::test_valid_transitions PASSED
backend/tests/test_state_machine.py::test_invalid_transitions PASSED
backend/tests/test_state_machine.py::test_recording_consent_enforcement PASSED

============================= 15 passed in 1.11s ==============================
```

Frontend production build (`npm run build`):
```
✓ Compiled successfully in 3.9s
✓ Generating static pages (4/4)
Route (app)
┌ ○ /
└ ○ /_not-found
```

---

## 10. Real-Browser Smoke Test Checklist

- [x] Website loads on `http://localhost:3000` with dark navy styling and cyan accents.
- [x] Customer name and company fields populate.
- [x] Start Call triggers the explicit Recording Consent Modal.
- [x] Affirmative consent starts the call timer and turns on the red `REC` indicator.
- [x] Alex speaks his opening greeting aloud and introduces himself as AI.
- [x] Live transcript displays Alex's greeting with timestamps.
- [x] Customer speaks via microphone or enters text in fallback input.
- [x] AI produces grounded FlowDesk AI responses without hallucinating.
- [x] Anti-echo suppression pauses customer transcription while AI is speaking.
- [x] End Call safely finalizes session and stops recording.
- [x] Audio recording uploads to `/api/calls/{id}/recording` and plays back.
- [x] Post-call intelligence generates:
  - Executive summary
  - Sales status (`Demo Requested`)
  - Status evidence quotation
  - Pain points & current tools (e.g. Zendesk)
  - Recommended next steps
- [x] Pipeline & History persists call records across browser refreshes and restarts.
- [x] Harness diagnostics panel reports health of database, LLM, speech, and storage.

---

## 11. Demo Walkthrough Script

**Persona:** Jordan Lee, VP of Operations at Apex Retail Co.
**Pitch Target:** FlowDesk AI

1. **Setup:**
   - Enter **Jordan Lee** as Customer Name.
   - Enter **Apex Retail Co.** as Company.
   - Click **Start Live Sales Call**.
2. **Consent:**
   - Click **I Consent (Enable Voice & Recording)**.
3. **Greeting:**
   - Alex: *"Hello Jordan Lee! I'm Alex, an AI sales specialist from Voxora AI reaching out on behalf of FlowDesk AI at Apex Retail Co.. Do you have a couple of minutes to chat about your customer support workflow?"*
4. **Prospect Dialogue:**
   - Jordan: *"Hi Alex, we use Zendesk and our team is overwhelmed by repetitive tickets. Can we schedule a demo for Thursday?"*
5. **AI Pitch:**
   - Alex: *"Fantastic! We'd love to show you FlowDesk AI in action. I can have our technical specialist set up a tailored 20-minute sandbox with your sample tickets. Would morning or afternoon work better for you?"*
6. **Completion:**
   - Click **End Call Safely**.
   - Review **Call Intelligence**: Notice status automatically classified as `Demo Requested` with supporting evidence, Zendesk recognized in Current Tools, and audio playable in the player.
   - Switch to **Pipeline & History** to verify permanent database persistence.

---

## 12. Troubleshooting

- **Microphone permission blocked:** Click the lock icon in the browser URL bar, allow Microphone, and refresh. Alternatively, Voxora AI automatically provides a Text Mode Fallback.
- **Port 8000 or 3000 in use:** Stop existing node/python processes using `Get-Process | Where-Object { $_.ProcessName -match "node|python" } | Stop-Process`.
- **Database reset:** Delete `backend/voxora.db` to re-initialize an empty local SQLite database.
