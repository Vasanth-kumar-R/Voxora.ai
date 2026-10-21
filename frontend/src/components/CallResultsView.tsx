"use client";

import React, { useState } from "react";
import {
  Sparkles, CheckCircle2, AlertTriangle, TrendingUp,
  ArrowRight, RotateCw, FileText, Calendar,
  Building, User, Clock, Volume2, BarChart3, XCircle,
} from "lucide-react";
import { CallDetail, SalesStatus } from "@/types/call";
import { retryAnalyzeCall } from "@/lib/api";

/* ── Status color map ─────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { bg: string; border: string; text: string }> = {
  "Converted":         { bg:"rgba(16,185,129,.1)",  border:"rgba(16,185,129,.3)",  text:"#10b981" },
  "Demo Requested":    { bg:"rgba(6,182,212,.1)",   border:"rgba(6,182,212,.3)",   text:"#06b6d4" },
  "Follow-up Required":{ bg:"rgba(245,158,11,.1)",  border:"rgba(245,158,11,.3)",  text:"#f59e0b" },
  "Interested":        { bg:"rgba(59,130,246,.1)",  border:"rgba(59,130,246,.3)",  text:"#3b82f6" },
  "Not Interested":    { bg:"rgba(239,68,68,.1)",   border:"rgba(239,68,68,.3)",   text:"#ef4444" },
  "No Response":       { bg:"rgba(100,116,139,.1)", border:"rgba(100,116,139,.3)", text:"#64748b" },
};
function getStatus(s?: SalesStatus | null) {
  return STATUS_MAP[s ?? ""] ?? { bg:"rgba(100,116,139,.1)", border:"rgba(100,116,139,.3)", text:"#64748b" };
}

/* ── Section header ─────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label, color="#06b6d4" }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
      <Icon size={14} color={color} />
      <span style={{ fontSize:12, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding:20, ...style }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
interface Props {
  call: CallDetail | null;
  onRefreshCall: () => void;
  onStartNewCall: () => void;
}

export function CallResultsView({ call, onRefreshCall, onStartNewCall }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [retryErr, setRetryErr] = useState<string|null>(null);

  if (!call) {
    return (
      <div style={{
        minHeight:"60vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:16, padding:"40px 16px", textAlign:"center",
      }}>
        <div style={{
          width:60, height:60, borderRadius:16,
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.07)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <BarChart3 size={26} color="#1e293b" />
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:16, color:"#334155", marginBottom:6 }}>No Analysis Yet</p>
          <p style={{ fontSize:13, color:"#1e293b" }}>Complete a live call to see AI-powered sales intelligence here.</p>
        </div>
        <button onClick={onStartNewCall} className="btn-primary">
          <span>Start a Live Call</span>
        </button>
      </div>
    );
  }

  const handleRetry = async () => {
    setRetrying(true); setRetryErr(null);
    try { await retryAnalyzeCall(call.id); onRefreshCall(); }
    catch { setRetryErr("Failed to retry. Please try again."); }
    finally { setRetrying(false); }
  };

  const st = getStatus(call.sales_status);
  const summary = call.summary;

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px", display:"flex", flexDirection:"column", gap:18 }}>

      {/* ── Header card ── */}
      <div className="card" style={{ padding:"20px 24px", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:14 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.02em", margin:0 }}>
              {call.customer_name}
            </h1>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99,
              background: st.bg, border:`1px solid ${st.border}`, color: st.text,
            }}>
              {call.sales_status || "Pending"}
            </span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:14, fontSize:12, color:"#475569" }}>
            {call.customer_company && (
              <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                <Building size={12} color="#334155" />{call.customer_company}
              </span>
            )}
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Clock size={12} color="#334155" />{Math.round(call.recording_duration_seconds||0)}s
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Calendar size={12} color="#334155" />{new Date(call.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
          <button onClick={handleRetry} disabled={retrying} className="btn-ghost" style={{ fontSize:12, padding:"7px 13px" }}>
            <RotateCw size={13} style={{ animation: retrying ? "spin 1s linear infinite" : "none" }} />
            {retrying ? "Analyzing…" : "Retry Analysis"}
          </button>
          <button onClick={onStartNewCall} className="btn-primary" style={{ fontSize:12, padding:"7px 13px" }}>
            + New Call
          </button>
        </div>
      </div>

      {retryErr && (
        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"#f87171",fontSize:13 }}>
          <XCircle size={14}/> {retryErr}
        </div>
      )}

      {/* ── Recording ── */}
      <Card>
        <SectionHeader icon={Volume2} label="Recording" />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ fontSize:12, color:"#475569" }}>
            Status: <span style={{ color:"#06b6d4", fontWeight:600 }}>{call.recording_status}</span>
          </span>
        </div>
        {call.recording_url ? (
          <audio controls className="w-full" style={{ width:"100%", height:38, borderRadius:8 }} src={call.recording_url} />
        ) : (
          <p style={{ fontSize:12, color:"#334155", fontStyle:"italic" }}>
            {call.consent_granted
              ? "Audio not available for this session."
              : "Recording declined — privacy compliance honored."}
          </p>
        )}
      </Card>

      {/* ── Intelligence grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr)", gap:16 }} className="results-grid">
        <style>{`@media(min-width:768px){.results-grid{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);}}`}</style>

        {/* Left */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <Card>
            <SectionHeader icon={Sparkles} label="AI Executive Summary" />
            <p style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.7, margin:0 }}>
              {summary?.overview || "No summary generated yet."}
            </p>
          </Card>

          <Card>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <SectionHeader icon={FileText} label="Status Evidence" />
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:st.bg, border:`1px solid ${st.border}`, color:st.text }}>
                {call.sales_status}
              </span>
            </div>
            <p style={{
              fontSize:12, color:"#94a3b8", lineHeight:1.7,
              background:"rgba(6,182,212,0.04)", border:"1px solid rgba(6,182,212,0.1)",
              borderRadius:9, padding:"12px 14px", fontStyle:"italic", margin:0,
            }}>
              "{summary?.status_evidence || call.sales_status_evidence || "No evidence logged."}"
            </p>
          </Card>

          <Card style={{ borderColor:"rgba(16,185,129,0.15)" }}>
            <SectionHeader icon={ArrowRight} label="Recommended Next Action" color="#10b981" />
            <p style={{ fontSize:13, color:"#d1fae5", fontWeight:500, margin:0 }}>
              {summary?.recommended_next_step || "Follow up with customer to determine fit."}
            </p>
          </Card>
        </div>

        {/* Right */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <Card>
            <SectionHeader icon={AlertTriangle} label="Pain Points" color="#f59e0b" />
            {summary?.requirements_pain_points?.length ? (
              <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:7 }}>
                {summary.requirements_pain_points.map((p,i) => (
                  <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"#cbd5e1" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"#f59e0b", marginTop:5, flexShrink:0 }} />
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize:12, color:"#334155", fontStyle:"italic", margin:0 }}>No specific pain points disclosed.</p>
            )}
          </Card>

          <Card>
            <SectionHeader icon={Building} label="Current Tools" />
            {summary?.current_tools?.length ? (
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {summary.current_tools.map((t,i) => (
                  <span key={i} style={{
                    fontSize:11, fontWeight:600,
                    padding:"4px 10px", borderRadius:7,
                    background:"rgba(6,182,212,0.08)",
                    border:"1px solid rgba(6,182,212,0.18)",
                    color:"#67e8f9",
                  }}>{t}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize:12, color:"#334155", fontStyle:"italic", margin:0 }}>No tools mentioned.</p>
            )}
          </Card>

          <Card>
            <SectionHeader icon={TrendingUp} label="Buying Signals" color="#10b981" />
            {summary?.buying_signals?.length ? (
              <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:7, marginBottom:14 }}>
                {summary.buying_signals.map((s,i) => (
                  <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:12, color:"#cbd5e1" }}>
                    <CheckCircle2 size={12} color="#10b981" style={{ marginTop:2, flexShrink:0 }} />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize:12, color:"#334155", fontStyle:"italic", marginBottom:10 }}>None noted.</p>
            )}

            {summary?.objections?.length ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:7, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                  OBJECTIONS
                </div>
                <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:6 }}>
                  {summary.objections.map((o,i) => (
                    <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:12, color:"#f87171" }}>
                      <XCircle size={11} style={{ marginTop:2, flexShrink:0 }} />
                      {o}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        </div>
      </div>

      {/* ── Full transcript ── */}
      <Card>
        <SectionHeader icon={FileText} label={`Full Transcript (${call.messages?.length||0} messages)`} />
        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:380, overflowY:"auto" }}>
          {call.messages?.length ? (
            call.messages.map(m => {
              const ai = m.speaker === "ai";
              return (
                <div key={m.id} style={{
                  padding:"10px 13px", borderRadius:10,
                  background: ai ? "rgba(255,255,255,0.03)" : "rgba(6,182,212,0.05)",
                  border: ai ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(6,182,212,0.12)",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: ai ? "#06b6d4" : "#64748b" }}>
                      {ai ? "Alex (Voxora AI)" : call.customer_name}
                    </span>
                    <span className="mono" style={{ fontSize:9, color:"#1e293b" }}>
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, margin:0 }}>{m.text}</p>
                </div>
              );
            })
          ) : (
            <p style={{ fontSize:12, color:"#334155", fontStyle:"italic" }}>No messages recorded.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
