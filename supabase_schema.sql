-- ==============================================================================
-- VOXORA AI - Autonomous AI Voice Sales Platform
-- Supabase / PostgreSQL Schema Definition
-- ==============================================================================

-- 1. Calls Table
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(36) PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(128) NOT NULL DEFAULT 'Prospect',
    customer_company VARCHAR(128),
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    state VARCHAR(32) NOT NULL DEFAULT 'IDLE',
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    recording_url VARCHAR(512),
    recording_filename VARCHAR(256),
    recording_duration_seconds DOUBLE PRECISION DEFAULT 0.0,
    recording_status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    sales_status VARCHAR(32),
    sales_status_evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_sales_status ON calls(sales_status);

-- 2. Call Messages Table (Incremental Live Transcript)
CREATE TABLE IF NOT EXISTS call_messages (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    speaker VARCHAR(16) NOT NULL, -- 'customer' | 'ai' | 'system'
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    correlation_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call_id ON call_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_timestamp ON call_messages(timestamp);

-- 3. Call Summaries Table (AI Post-Call Intelligence)
CREATE TABLE IF NOT EXISTS call_summaries (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    overview TEXT NOT NULL,
    customer_business VARCHAR(256),
    customer_role VARCHAR(128),
    requirements_pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    buying_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    objections JSONB NOT NULL DEFAULT '[]'::jsonb,
    budget_timeline VARCHAR(256),
    sales_status VARCHAR(32) NOT NULL,
    status_evidence TEXT NOT NULL,
    recommended_next_step TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_summaries_call_id ON call_summaries(call_id);

-- 4. Call Observability Events Table (Harness Telemetry)
CREATE TABLE IF NOT EXISTS call_events (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);
