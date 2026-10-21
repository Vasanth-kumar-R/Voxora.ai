"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  PhoneCall, PhoneOff, Mic, MicOff, Radio, Send,
  ShieldCheck, Clock, Sparkles, AlertCircle,
  Volume2, Building2, User, Globe, Zap, Brain,
  TrendingUp, ArrowRight,
} from "lucide-react";
import { CallState, Message, CallDetail } from "@/types/call";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Props {
  callState: CallState;
  activeCall: CallDetail | null;
  messages: Message[];
  isRecording: boolean;
  consentGranted: boolean;
  callDuration: number;
  speechSupported: boolean;
  isAiSpeaking: boolean;
  audioLevel: number;
  errorMsg: string | null;
  isTextFallback: boolean;
  onStartCall: (name: string, company?: string, language?: string) => Promise<any>;
  onSubmitConsent: (c: boolean) => void;
  onSendMessage: (t: string) => void;
  onEndCall: () => void;
  onViewResults: () => void;
}

/* ── State metadata ─────────────────────────────────────────────────────── */
const STATE_META: Record<string, { label: string; dot: string; text: string }> = {
  IDLE:            { label: "Ready",                    dot: "#475569", text: "#64748b"  },
  CONSENT_PENDING: { label: "Awaiting Consent",         dot: "#f59e0b", text: "#fbbf24"  },
  CONNECTING:      { label: "Connecting…",              dot: "#06b6d4", text: "#22d3ee"  },
  LISTENING:       { label: "Listening",                dot: "#10b981", text: "#34d399"  },
  THINKING:        { label: "AI Thinking…",             dot: "#8b5cf6", text: "#a78bfa"  },
  SPEAKING:        { label: "Alex Speaking",            dot: "#06b6d4", text: "#22d3ee"  },
  ENDING:          { label: "Ending…",                  dot: "#f59e0b", text: "#fbbf24"  },
  PROCESSING:      { label: "Generating Intelligence…", dot: "#6366f1", text: "#818cf8"  },
  COMPLETED:       { label: "Completed",                dot: "#06b6d4", text: "#06b6d4"  },
  ERROR:           { label: "Error",                    dot: "#ef4444", text: "#f87171"  },
};

const LIVE = ["CONNECTING","LISTENING","THINKING","SPEAKING"];
const ACTIVE = [...LIVE,"CONSENT_PENDING","ENDING","PROCESSING"];

function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

/* ── Waveform ────────────────────────────────────────────────────────────── */
function Waveform({ speaking, level }: { speaking: boolean; level: number }) {
  const N = 20;
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap: 2, height: 32 }}>
      {Array.from({length:N},(_,i) => {
        const h = speaking
          ? `${22 + ((i*7+i*i)%6)*8}%`
          : level > 5
          ? `${Math.max(10,(level/100)*70 + (i%4)*8)}%`
          : "10%";
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              height: h,
              width: 3,
              borderRadius: 99,
              background: speaking ? "#06b6d4" : level>12 ? "#10b981" : "#1e293b",
              animationDelay: `${(i*0.07).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Feature pill ─────────────────────────────────────────────────────────── */
function Pill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      fontSize:11, fontWeight:600,
      padding:"4px 11px", borderRadius:99,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.08)",
      color:"#94a3b8",
    }}>
      <Icon size={11} color="#06b6d4" />
      {label}
    </span>
  );
}

/* ── Hero / IDLE view ────────────────────────────────────────────────────── */
function HeroView({
  name, setName, company, setCompany,
  language, setLanguage, onStart,
}: {
  name:string; setName:(v:string)=>void;
  company:string; setCompany:(v:string)=>void;
  language:string; setLanguage:(v:string)=>void;
  onStart:()=>void;
}) {
  const inputStyle = {
    width:"100%", background:"rgba(6,9,15,0.7)",
    border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:10, color:"#f1f5f9",
    fontSize:14, padding:"10px 12px 10px 36px",
    fontFamily:"inherit", outline:"none",
    transition:"border-color .15s, box-shadow .15s",
  } as React.CSSProperties;

  return (
    <div style={{
      minHeight:"calc(100vh - 60px)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"48px 16px",
      position:"relative",
    }}>

      {/* ── Hero copy ── */}
      <div className="fade-up" style={{ textAlign:"center", maxWidth:520, marginBottom:48 }}>

        {/* Icon badge */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
          <div className="float" style={{
            position:"relative",
            width:72, height:72,
            borderRadius:20,
            background:"linear-gradient(135deg,#06d6f0 0%,#3b82f6 60%,#6366f1 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 40px rgba(6,182,212,0.35), 0 0 0 1px rgba(6,182,212,0.2)",
            color:"#fff",
          }}>
            {/* Pulse ring */}
            <div className="ping-ring" style={{
              position:"absolute", inset:-4,
              borderRadius:24,
              border:"2px solid rgba(6,182,212,0.4)",
            }} />
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3"  y1="12" x2="3"  y2="12"/>
              <line x1="6"  y1="9"  x2="6"  y2="15"/>
              <line x1="9"  y1="6"  x2="9"  y2="18"/>
              <line x1="12" y1="4"  x2="12" y2="20"/>
              <line x1="15" y1="7"  x2="15" y2="17"/>
              <line x1="18" y1="9"  x2="18" y2="15"/>
              <line x1="21" y1="11" x2="21" y2="13"/>
            </svg>
          </div>
        </div>

        <h1 style={{
          fontSize:"clamp(28px,5vw,44px)",
          fontWeight:900,
          lineHeight:1.1,
          letterSpacing:"-0.03em",
          color:"#f1f5f9",
          marginBottom:14,
        }}>
          AI-Powered{" "}
          <span className="txt-gradient">Sales Intelligence</span>
        </h1>

        <p style={{ fontSize:15, color:"#64748b", lineHeight:1.7, marginBottom:20 }}>
          Alex, your autonomous AI sales specialist, conducts live pitch conversations with real-time transcription, consent-based recording, and post-call intelligence reports.
        </p>

        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8 }}>
          <Pill icon={Zap} label="Real-time Voice" />
          <Pill icon={Brain} label="AI Analysis" />
          <Pill icon={ShieldCheck} label="Consent-First" />
          <Pill icon={TrendingUp} label="Sales Intelligence" />
        </div>
      </div>

      {/* ── Setup Card ── */}
      <div className="card fade-up-1" style={{ width:"100%", maxWidth:420, padding:"28px 24px" }}>

        {/* Card header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"rgba(6,182,212,0.1)",
            border:"1px solid rgba(6,182,212,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <PhoneCall size={16} color="#06b6d4" />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>Configure Prospect</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>Set up call details before initiating</div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Name */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>
              Prospect Name
            </label>
            <div style={{ position:"relative" }}>
              <User size={14} color="#475569" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="v-input"
                style={inputStyle}
                placeholder="e.g. Jordan Lee"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>
              Company
            </label>
            <div style={{ position:"relative" }}>
              <Building2 size={14} color="#475569" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }} />
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="v-input"
                style={inputStyle}
                placeholder="e.g. Apex Retail Co."
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>
              Language
            </label>
            <div style={{ position:"relative" }}>
              <Globe size={14} color="#475569" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", zIndex:1 }} />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="v-input"
                style={{ ...inputStyle, paddingLeft:36, appearance:"none", WebkitAppearance:"none" } as React.CSSProperties}
              >
                <option value="en">English (US/UK)</option>
              </select>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          disabled={!name.trim()}
          className="btn-primary"
          style={{ width:"100%", marginTop:22, justifyContent:"center" }}
        >
          <PhoneCall size={15} />
          Start Live Sales Call
        </button>

        <p style={{ textAlign:"center", fontSize:11, color:"#334155", marginTop:12 }}>
          Alex introduces as an AI specialist pitching FlowDesk AI
        </p>
      </div>
    </div>
  );
}

/* ── Completed view ─────────────────────────────────────────────────────── */
function CompletedView({ onResults, onNew }: { onResults:()=>void; onNew:()=>void }) {
  return (
    <div style={{
      minHeight:"calc(100vh - 120px)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap:20, padding:"40px 16px", textAlign:"center",
    }}>
      <div className="float" style={{
        width:80, height:80, borderRadius:22,
        background:"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,182,212,0.15))",
        border:"1px solid rgba(6,182,212,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <Sparkles size={36} color="#06b6d4" />
      </div>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, color:"#f1f5f9", marginBottom:8, letterSpacing:"-0.02em" }}>
          Intelligence Ready
        </h2>
        <p style={{ fontSize:14, color:"#64748b" }}>
          AI analysis and full transcript are available.
        </p>
      </div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
        <button onClick={onResults} className="btn-primary">
          View Full Intelligence <ArrowRight size={14} />
        </button>
        <button onClick={onNew} className="btn-ghost">
          Start New Call
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export function LiveCallWorkspace({
  callState, activeCall, messages, isRecording, consentGranted,
  callDuration, speechSupported, isAiSpeaking, audioLevel,
  errorMsg, isTextFallback,
  onStartCall, onSubmitConsent, onSendMessage, onEndCall, onViewResults,
}: Props) {
  const [name, setName]       = useState("Sarah Jenkins");
  const [company, setCompany] = useState("Aura Goods E-commerce");
  const [lang, setLang]       = useState("en");
  const [text, setText]       = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const meta = STATE_META[callState] ?? STATE_META.IDLE;
  const isLive = LIVE.includes(callState);

  if (callState === "IDLE") {
    return (
      <HeroView
        name={name} setName={setName}
        company={company} setCompany={setCompany}
        language={lang} setLanguage={setLang}
        onStart={() => onStartCall(name, company, lang)}
      />
    );
  }

  if (callState === "COMPLETED") {
    return <CompletedView onResults={onViewResults} onNew={() => onStartCall(name, company, lang)} />;
  }

  /* ── Active Call UI ─────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px", display:"flex", flexDirection:"column", gap:16 }}>

      {/* Error */}
      {errorMsg && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:10,
          padding:"12px 16px", borderRadius:12,
          background:"rgba(239,68,68,0.08)",
          border:"1px solid rgba(239,68,68,0.25)",
          color:"#f87171",
        }}>
          <AlertCircle size={16} style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ fontSize:13 }}>{errorMsg}</span>
        </div>
      )}

      {/* ── Status bar ── */}
      <div className="card" style={{ padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* State dot + label */}
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{
              width:8, height:8, borderRadius:"50%",
              background: meta.dot,
              flexShrink:0,
              boxShadow: isLive ? `0 0 8px ${meta.dot}` : "none",
              animation: ["CONSENT_PENDING","CONNECTING","THINKING","SPEAKING","PROCESSING"].includes(callState) ? "pulse 1.8s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontWeight:700, fontSize:13, color: meta.text }}>{meta.label}</span>
          </div>
          {isRecording && (
            <span style={{
              display:"flex", alignItems:"center", gap:5,
              fontSize:10, fontWeight:700,
              padding:"2px 9px", borderRadius:99,
              background:"rgba(220,38,38,0.12)",
              border:"1px solid rgba(220,38,38,0.3)",
              color:"#f87171",
            }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite" }} />
              REC
            </span>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="mono" style={{ fontSize:13, color:"#475569", display:"flex", alignItems:"center", gap:5 }}>
            <Clock size={13} color="#334155" />
            {fmt(callDuration)}
          </span>
          {ACTIVE.includes(callState) && callState !== "CONSENT_PENDING" && (
            <button onClick={onEndCall} className="btn-danger" style={{ padding:"6px 12px", fontSize:12 }}>
              <PhoneOff size={13} />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"minmax(0,1fr)",
        gap:16,
      }}
        className="call-grid"
      >
        <style>{`@media(min-width:768px){.call-grid{grid-template-columns:280px minmax(0,1fr);}}`}</style>

        {/* ─ LEFT SIDEBAR ─ */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Prospect */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#475569", letterSpacing:".06em", textTransform:"uppercase", marginBottom:14 }}>
              Prospect
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { Icon: User,      label:"Name",    val: name    },
                { Icon: Building2, label:"Company", val: company },
              ].map(({ Icon, label, val }) => (
                <div key={label} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"9px 12px", borderRadius:9,
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.05)",
                }}>
                  <Icon size={13} color="#475569" style={{ flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:10, color:"#334155", marginBottom:1 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#cbd5e1" }}>{val || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#475569", letterSpacing:".06em", textTransform:"uppercase", marginBottom:14 }}>
              Compliance
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {[
                {
                  Icon: ShieldCheck,
                  label: "Consent",
                  val: consentGranted ? "Granted ✓" : "Pending",
                  color: consentGranted ? "#10b981" : "#f59e0b",
                },
                {
                  Icon: Radio,
                  label: "Recording",
                  val: isRecording ? "Active" : "Inactive",
                  color: isRecording ? "#ef4444" : "#334155",
                },
                {
                  Icon: isTextFallback ? MicOff : Mic,
                  label: "Input",
                  val: isTextFallback ? "Text Mode" : "Microphone",
                  color: isTextFallback ? "#f59e0b" : "#06b6d4",
                },
                {
                  Icon: Sparkles,
                  label: "Pitch Target",
                  val: "FlowDesk AI",
                  color: "#94a3b8",
                },
              ].map(({ Icon, label, val, color }, i, arr) => (
                <div key={label} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"9px 0",
                  borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#475569" }}>
                    <Icon size={12} color="#375870" />
                    {label}
                  </span>
                  <span style={{ fontSize:12, fontWeight:700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─ RIGHT: TRANSCRIPT PANEL ─ */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:480 }}>

          {/* Consent modal */}
          {callState === "CONSENT_PENDING" && (
            <div style={{ padding:20, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{
                padding:"16px 18px", borderRadius:12,
                background:"rgba(6,182,212,0.06)",
                border:"1px solid rgba(6,182,212,0.2)",
              }}>
                <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:"rgba(6,182,212,0.12)",
                    border:"1px solid rgba(6,182,212,0.25)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <ShieldCheck size={18} color="#06b6d4" />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9", marginBottom:4 }}>
                      Recording Consent Required
                    </div>
                    <p style={{ fontSize:12, color:"#64748b", lineHeight:1.6 }}>
                      Voxora AI records this conversation for post-call intelligence. Do you affirmatively consent?
                    </p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button onClick={() => onSubmitConsent(true)} className="btn-primary" style={{ flex:1, minWidth:140, justifyContent:"center", padding:"9px 16px" }}>
                    <ShieldCheck size={13} /> Yes, I Consent
                  </button>
                  <button onClick={() => onSubmitConsent(false)} className="btn-ghost" style={{ flex:1, minWidth:140, justifyContent:"center", padding:"9px 16px" }}>
                    Decline Recording
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waveform bar */}
          {isLive && (
            <div style={{
              padding:"10px 18px",
              borderBottom:"1px solid rgba(255,255,255,0.05)",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#475569" }}>
                <Volume2 size={13} color={isAiSpeaking ? "#06b6d4" : "#334155"} />
                <span>{isAiSpeaking ? "Alex is speaking…" : "Listening for customer…"}</span>
              </div>
              <Waveform speaking={isAiSpeaking} level={audioLevel} />
            </div>
          )}

          {/* Transcript header */}
          <div style={{
            padding:"11px 18px",
            borderBottom:"1px solid rgba(255,255,255,0.05)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{
                width:7, height:7, borderRadius:"50%",
                background: isLive ? "#06b6d4" : "#1e293b",
                animation: isLive ? "pulse 1.5s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize:11, fontWeight:700, color:"#334155", letterSpacing:".06em", textTransform:"uppercase" }}>
                Live Transcript
              </span>
            </div>
            <span style={{ fontSize:11, color:"#1e293b" }}>{messages.length} msg</span>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}
          >
            {messages.length === 0 ? (
              <div style={{
                flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                textAlign:"center", gap:12, padding:"40px 0",
              }}>
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.06)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <PhoneCall size={22} color="#1e293b" />
                </div>
                <div>
                  <p style={{ fontWeight:600, fontSize:14, color:"#334155", marginBottom:4 }}>
                    {callState === "CONNECTING" ? "Connecting to Alex…" : "Transcript Inactive"}
                  </p>
                  <p style={{ fontSize:12, color:"#1e293b" }}>
                    Conversation will appear here in real time
                  </p>
                </div>
              </div>
            ) : (
              messages.map(m => {
                const ai = m.speaker === "ai";
                return (
                  <div key={m.id} className="bubble-in" style={{
                    display:"flex", alignItems:"flex-end", gap:9,
                    flexDirection: ai ? "row" : "row-reverse",
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, fontWeight:800,
                      background: ai
                        ? "linear-gradient(135deg,#06d6f0,#3b82f6)"
                        : "rgba(255,255,255,0.07)",
                      color: ai ? "#020a12" : "#64748b",
                      boxShadow: ai ? "0 3px 10px rgba(6,182,212,0.25)" : "none",
                    }}>
                      {ai ? "AI" : name.charAt(0).toUpperCase()}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      maxWidth:"76%",
                      padding:"10px 13px",
                      borderRadius: ai ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                      background: ai ? "rgba(255,255,255,0.05)" : "rgba(6,182,212,0.08)",
                      border: ai ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(6,182,212,0.18)",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color: ai ? "#06b6d4" : "#475569" }}>
                          {ai ? "Alex — Voxora AI" : name}
                        </span>
                        <span className="mono" style={{ fontSize:9, color:"#1e293b", flexShrink:0 }}>
                          {new Date(m.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.6, whiteSpace:"pre-wrap", margin:0 }}>
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Text input */}
          {isLive && (
            <form
              onSubmit={e => { e.preventDefault(); if(text.trim()){onSendMessage(text);setText("");} }}
              style={{
                borderTop:"1px solid rgba(255,255,255,0.05)",
                padding:"10px 14px",
                display:"flex", alignItems:"center", gap:10,
              }}
            >
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={isTextFallback ? "Type customer response…" : "Speak or type customer response…"}
                style={{
                  flex:1, background:"transparent", border:"none",
                  outline:"none", color:"#f1f5f9", fontSize:13,
                  fontFamily:"inherit",
                }}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  background: text.trim() ? "linear-gradient(135deg,#06d6f0,#3b82f6)" : "rgba(255,255,255,0.04)",
                  border:"none", cursor: text.trim() ? "pointer" : "not-allowed",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"background .15s",
                  opacity: text.trim() ? 1 : 0.4,
                }}
              >
                <Send size={13} color={text.trim() ? "#020a12" : "#334155"} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
