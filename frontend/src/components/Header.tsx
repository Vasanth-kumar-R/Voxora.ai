"use client";

import React from "react";
import { PhoneCall, BarChart3, History, BookOpen, Activity } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeCallId?: string | null;
}

const TABS = [
  { id: "call",        label: "Live Call",     short: "Call",    Icon: PhoneCall },
  { id: "results",     label: "Intelligence",  short: "Intel",   Icon: BarChart3 },
  { id: "history",     label: "Pipeline",      short: "History", Icon: History   },
  { id: "product",     label: "AI Deck",       short: "Deck",    Icon: BookOpen  },
  { id: "diagnostics", label: "Diagnostics",   short: "Diag",    Icon: Activity  },
];

/* ── Logo SVG ─────────────────────────────────────────────────────── */
function WaveformLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <line x1="2"  y1="10" x2="2"  y2="10" />
      <line x1="5"  y1="7"  x2="5"  y2="13" />
      <line x1="8"  y1="4"  x2="8"  y2="16" />
      <line x1="11" y1="6"  x2="11" y2="14" />
      <line x1="14" y1="8"  x2="14" y2="12" />
      <line x1="17" y1="9"  x2="17" y2="11" />
    </svg>
  );
}

export function Header({ currentTab, onSelectTab, activeCallId }: HeaderProps) {
  const currentTabObj = TABS.find(t => t.id === currentTab);

  return (
    <>
      {/* ══════════════════════════════════════════
          DESKTOP HEADER (≥ 768px)
      ══════════════════════════════════════════ */}
      <header
        className="hidden md:block sticky top-0 z-50"
        style={{
          background: "rgba(6,9,15,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Logo */}
          <button
            onClick={() => onSelectTab("call")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(135deg,#06d6f0,#3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(6,182,212,0.3)",
                flexShrink: 0,
              }}
            >
              <WaveformLogo size={18} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
                  Voxora<span style={{ color: "#06b6d4" }}>.ai</span>
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: "rgba(6,182,212,.12)",
                    border: "1px solid rgba(6,182,212,.3)",
                    color: "#67e8f9",
                  }}
                >
                  FlowDesk Demo
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 1, lineHeight: 1 }}>
                Every conversation. More sales intelligence.
              </p>
            </div>
          </button>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = currentTab === id;
              const hasLive = id === "results" && !!activeCallId;
              return (
                <button
                  key={id}
                  onClick={() => onSelectTab(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: active ? "1px solid rgba(6,182,212,0.28)" : "1px solid transparent",
                    background: active ? "rgba(6,182,212,0.08)" : "transparent",
                    color: active ? "#67e8f9" : "#64748b",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s",
                    position: "relative",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {hasLive && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#06b6d4",
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE: compact top bar (< 768px)
      ══════════════════════════════════════════ */}
      <header
        className="md:hidden sticky top-0 z-50"
        style={{
          background: "rgba(6,9,15,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            height: 52,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <button
            onClick={() => onSelectTab("call")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg,#06d6f0,#3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 3px 10px rgba(6,182,212,0.3)",
              }}
            >
              <WaveformLogo size={15} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              Voxora<span style={{ color: "#06b6d4" }}>.ai</span>
            </span>
          </button>

          {/* Current section chip */}
          {currentTabObj && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 99,
                background: "rgba(6,182,212,.1)",
                border: "1px solid rgba(6,182,212,.25)",
                color: "#67e8f9",
              }}
            >
              <currentTabObj.Icon size={11} />
              {currentTabObj.label}
            </span>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE: fixed bottom navigation (< 768px)
      ══════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50"
        style={{
          background: "rgba(6,9,15,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}
      >
        <div style={{ display: "flex", height: 56 }}>
          {TABS.map(({ id, short, Icon }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                onClick={() => onSelectTab(id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: active ? "#06b6d4" : "#334155",
                  position: "relative",
                  transition: "color .15s",
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "20%",
                      right: "20%",
                      height: 2,
                      borderRadius: "0 0 2px 2px",
                      background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                    }}
                  />
                )}
                <Icon size={18} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase" }}>
                  {short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
