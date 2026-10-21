export type SalesStatus = 
  | "Converted" 
  | "Demo Requested" 
  | "Follow-up Required" 
  | "Interested" 
  | "Not Interested" 
  | "No Response";

export type CallState = 
  | "IDLE" 
  | "CONSENT_PENDING" 
  | "CONNECTING" 
  | "LISTENING" 
  | "THINKING" 
  | "SPEAKING" 
  | "ENDING" 
  | "PROCESSING" 
  | "COMPLETED" 
  | "ERROR";

export interface Message {
  id: string;
  call_id: string;
  speaker: "customer" | "ai" | "system";
  text: string;
  timestamp: string;
  correlation_id?: string;
}

export interface CallSummary {
  overview: string;
  customer_business?: string | null;
  customer_role?: string | null;
  requirements_pain_points: string[];
  current_tools: string[];
  buying_signals: string[];
  objections: string[];
  budget_timeline?: string | null;
  sales_status: SalesStatus;
  status_evidence: string;
  recommended_next_step: string;
}

export interface CallDetail {
  id: string;
  correlation_id: string;
  customer_name: string;
  customer_company?: string | null;
  language: string;
  state: CallState;
  consent_granted: boolean;
  recording_url?: string | null;
  recording_duration_seconds?: number;
  recording_status: string;
  sales_status?: SalesStatus | null;
  sales_status_evidence?: string | null;
  created_at: string;
  updated_at: string;
  ended_at?: string | null;
  messages: Message[];
  summary?: CallSummary | null;
}

export interface CallListItem {
  id: string;
  customer_name: string;
  customer_company?: string | null;
  language: string;
  state: CallState;
  consent_granted: boolean;
  recording_url?: string | null;
  recording_duration_seconds?: number;
  recording_status: string;
  sales_status?: SalesStatus | null;
  created_at: string;
  ended_at?: string | null;
  message_count: number;
  has_summary: boolean;
}

export interface DiagnosticsData {
  timestamp: string;
  overall_status: string;
  database: { status: string; message: string; details?: any };
  llm_service: { status: string; message: string; details?: any };
  speech_tts: { status: string; message: string; details?: any };
  recording_storage: { status: string; message: string; details?: any };
  environment: string;
}
