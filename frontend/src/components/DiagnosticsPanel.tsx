"use client";

import React, { useState, useEffect } from "react";
import {
  Activity, Database, Cpu, Mic, Volume2,
  HardDrive, CheckCircle2, AlertCircle, RefreshCw, Play,
} from "lucide-react";
import { DiagnosticsData } from "@/types/call";
import { getDiagnostics } from "@/lib/api";

function StatusBadge({ status }: { status?: string }) {
  const ok  = status === "healthy" || status?.includes("Supported") || status?.includes("Working");
  const warn = status === "warning";
  const cfg = ok
    ? { bg:"rgba(16,185,129,.1)", border:"rgba(16,185,129,.3)", text:"#10b981", Icon:CheckCircle2, label:"Healthy" }
    : warn
    ? { bg:"rgba(245,158,11,.1)", border:"rgba(245,158,11,.3)", text:"#f59e0b", Icon:AlertCircle,  label:"Warning" }
    : { bg:"rgba(239,68,68,.1)",  border:"rgba(239,68,68,.3)",  text:"#ef4444", Icon:AlertCircle,  label:"Action Needed" };

  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700,
      padding:"3px 9px", borderRadius:99,
      background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.text,
    }}>
      <cfg.Icon size={11}/> {cfg.label}
    </span>
  );
}

function DiagCard({
  title, iconColor="#06b6d4", Icon, status, message, detail, action,
}: {
  title:string; iconColor?:string; Icon:React.ElementType;
  status?:string; message?:string; detail?:string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding:20, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:34, height:34, borderRadius:9, flexShrink:0,
            background:`${iconColor}18`,
            border:`1px solid ${iconColor}30`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon size={15} color={iconColor} />
          </div>
          <span style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {message && (
        <p style={{ fontSize:12, color:"#64748b", lineHeight:1.6, margin:0 }}>{message}</p>
      )}

      {detail && (
        <div style={{
          fontSize:11, color:"#334155", fontFamily:"'JetBrains Mono',monospace",
          background:"rgba(6,9,15,0.5)", border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:8, padding:"9px 12px", lineHeight:1.6,
        }}>
          {detail}
        </div>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

export function DiagnosticsPanel() {
  const [data,    setData]    = useState<DiagnosticsData|null>(null);
  const [loading, setLoading] = useState(true);
  const [speech,  setSpeech]  = useState("Checking…");
  const [tts,     setTts]     = useState("Checking…");
  const [micTest, setMicTest] = useState("Not tested");

  const load = () => {
    setLoading(true);
    getDiagnostics()
      .then(r => setData(r))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeech(SR ? "Supported (Web Speech API active)" : "Not supported — text fallback active");
      setTts("speechSynthesis" in window ? "Supported (SpeechSynthesis active)" : "Not supported");
    }
  }, []);

  const testMic = async () => {
    setMicTest("Requesting permission…");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio:true });
      setMicTest(`Working: ${s.getAudioTracks().length} track(s)`);
      setTimeout(() => s.getTracks().forEach(t=>t.stop()), 2000);
    } catch(e:any) {
      setMicTest(`Error: ${e.message}`);
    }
  };

  const testVoice = () => {
    if (typeof window!=="undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Voxora AI diagnostics test successful.");
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px", display:"flex", flexDirection:"column", gap:18 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
            <Activity size={14} color="#06b6d4" />
            <span style={{ fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".07em", textTransform:"uppercase" }}>
              System Health
            </span>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.02em", margin:0, marginBottom:4 }}>
            Harness Diagnostics
          </h1>
          <p style={{ fontSize:13, color:"#475569", margin:0 }}>
            Real-time observability of AI providers, speech capture, database, and storage pipelines.
          </p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ fontSize:12, padding:"8px 14px", alignSelf:"flex-start" }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite":"none" }} />
          Refresh
        </button>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="diag-grid">
        <style>{`@media(max-width:600px){.diag-grid{grid-template-columns:1fr;}}`}</style>

        <DiagCard
          title="Database Layer"
          Icon={Database}
          iconColor="#06b6d4"
          status={data?.database?.status}
          message={data?.database?.message || "Checking database connection…"}
          detail={`Scheme: ${data?.database?.details?.database_url_scheme||"postgresql"} (Supabase / SQLite)`}
        />

        <DiagCard
          title="LLM Conversation Service"
          Icon={Cpu}
          iconColor="#8b5cf6"
          status={data?.llm_service?.status}
          message={data?.llm_service?.message || "Checking LLM service…"}
          detail={`Provider: ${data?.llm_service?.details?.provider||"Groq/OpenAI"} | Model: ${data?.llm_service?.details?.model||"auto"}`}
        />

        <DiagCard
          title="Microphone & Web Speech"
          Icon={Mic}
          iconColor="#10b981"
          status={speech}
          message={speech}
          detail={`Live mic test: ${micTest}`}
          action={
            <button onClick={testMic} style={{
              display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600,
              padding:"6px 12px", borderRadius:8, cursor:"pointer",
              background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)",
              color:"#10b981",
            }}>
              <Mic size={12}/> Test Microphone
            </button>
          }
        />

        <DiagCard
          title="Text-To-Speech Engine"
          Icon={Volume2}
          iconColor="#3b82f6"
          status={tts}
          message={tts}
          action={
            <button onClick={testVoice} style={{
              display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600,
              padding:"6px 12px", borderRadius:8, cursor:"pointer",
              background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.25)",
              color:"#3b82f6",
            }}>
              <Play size={12}/> Play Sample Voice
            </button>
          }
        />

        <div className="card diag-full" style={{ padding:20, gridColumn:"1/-1" }}>
          <style>{`@media(max-width:600px){.diag-full{grid-column:auto;}}`}</style>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <HardDrive size={15} color="#f59e0b" />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1, gap:8, flexWrap:"wrap" }}>
              <span style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>Recording Storage & Persistence</span>
              <StatusBadge status={data?.recording_storage?.status} />
            </div>
          </div>
          <p style={{ fontSize:12, color:"#64748b", lineHeight:1.6, margin:0, marginBottom:10 }}>
            {data?.recording_storage?.message || "Storage directory validated."}
          </p>
          <div style={{ fontSize:11, color:"#334155", fontFamily:"'JetBrains Mono',monospace", background:"rgba(6,9,15,0.5)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:8, padding:"9px 12px" }}>
            Storage: Persistent Local & Durable Target | Max Upload: {data?.recording_storage?.details?.max_size_mb||50}MB
          </div>
        </div>
      </div>
    </div>
  );
}
