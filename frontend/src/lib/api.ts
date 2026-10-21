import { CallDetail, CallListItem, CallSummary, DiagnosticsData } from "@/types/call";

const API_BASE = ""; // Relative path, proxied by Next.js rewrites to backend

export async function createCall(payload: {
  customer_name: string;
  customer_company?: string;
  language?: string;
}): Promise<CallDetail> {
  const res = await fetch(`${API_BASE}/api/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create call: ${res.statusText}`);
  return res.json();
}

export async function setConsent(callId: string, consent: boolean, reason?: string) {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consent, reason }),
  });
  if (!res.ok) throw new Error(`Failed to record consent: ${res.statusText}`);
  return res.json();
}

export async function addMessage(callId: string, speaker: "customer" | "ai" | "system", text: string) {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker, text }),
  });
  if (!res.ok) throw new Error(`Failed to append message: ${res.statusText}`);
  return res.json();
}

export async function requestAIResponse(callId: string, payload: {
  customer_message?: string;
  force_greeting?: boolean;
}): Promise<{ ai_message: string; detected_sentiment?: string }> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to generate AI response: ${res.statusText}`);
  return res.json();
}

export async function uploadRecording(callId: string, audioBlob: Blob, durationSeconds: number) {
  const formData = new FormData();
  formData.append("file", audioBlob, `call_${callId}.webm`);
  formData.append("duration", durationSeconds.toString());

  const res = await fetch(`${API_BASE}/api/calls/${callId}/recording`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload recording: ${res.statusText}`);
  return res.json();
}

export async function endCall(callId: string, durationSeconds?: number) {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration_seconds: durationSeconds || 0 }),
  });
  if (!res.ok) throw new Error(`Failed to end call: ${res.statusText}`);
  return res.json();
}

export async function retryAnalyzeCall(callId: string): Promise<CallSummary> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to analyze call: ${res.statusText}`);
  return res.json();
}

export async function getCallDetail(callId: string): Promise<CallDetail> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}`);
  if (!res.ok) throw new Error(`Failed to load call detail: ${res.statusText}`);
  return res.json();
}

export async function getCallsList(search?: string, status?: string): Promise<CallListItem[]> {
  const params = new URLSearchParams();
  if (search) params.append("query", search);
  if (status && status !== "all") params.append("status", status);

  const res = await fetch(`${API_BASE}/api/calls?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to list calls: ${res.statusText}`);
  return res.json();
}

export async function deleteCall(callId: string) {
  const res = await fetch(`${API_BASE}/api/calls/${callId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete call: ${res.statusText}`);
  return res.json();
}

export async function getDiagnostics(): Promise<DiagnosticsData> {
  const res = await fetch(`${API_BASE}/api/diagnostics`);
  if (!res.ok) throw new Error(`Failed to load diagnostics: ${res.statusText}`);
  return res.json();
}

export async function getKnowledgeBase(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/knowledge`);
  if (!res.ok) throw new Error(`Failed to load knowledge base: ${res.statusText}`);
  return res.json();
}
