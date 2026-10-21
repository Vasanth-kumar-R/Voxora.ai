"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Filter, Trash2, ChevronRight, Volume2,
  FileText, Calendar, Building, Clock, Sparkles, RefreshCw,
} from "lucide-react";
import { CallListItem, SalesStatus } from "@/types/call";
import { getCallsList, deleteCall } from "@/lib/api";

const STATUS_MAP: Record<string, { bg: string; border: string; text: string }> = {
  "Converted": { bg: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.3)", text: "#10b981" },
  "Demo Requested": { bg: "rgba(6,182,212,.1)", border: "rgba(6,182,212,.3)", text: "#06b6d4" },
  "Follow-up Required": { bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.3)", text: "#f59e0b" },
  "Interested": { bg: "rgba(59,130,246,.1)", border: "rgba(59,130,246,.3)", text: "#3b82f6" },
  "Not Interested": { bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.3)", text: "#ef4444" },
  "No Response": { bg: "rgba(100,116,139,.1)", border: "rgba(100,116,139,.3)", text: "#64748b" },
};
function getStatus(s?: SalesStatus | null) {
  return STATUS_MAP[s ?? ""] ?? { bg: "rgba(100,116,139,.1)", border: "rgba(100,116,139,.3)", text: "#64748b" };
}

export function CallHistoryView({ onSelectCall }: { onSelectCall: (id: string) => void }) {
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [loading, setLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleting, setDel] = useState<string | null>(null);

  const fetch = async () => {
    setLoad(true);
    try { setCalls(await getCallsList(search, status)); }
    catch (e) { console.error(e); }
    finally { setLoad(false); }
  };

  useEffect(() => { fetch(); }, [search, status]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this call and its audio?")) return;
    setDel(id);
    try { await deleteCall(id); setCalls(p => p.filter(c => c.id !== id)); }
    catch { alert("Delete failed."); }
    finally { setDel(null); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page title */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", margin: 0, marginBottom: 4 }}>
          Sales Pipeline
        </h1>
        <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
          All recorded calls, transcripts and AI intelligence reports.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="card" style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={14} color="#334155" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prospects or companies…"
            style={{
              width: "100%", background: "rgba(6,9,15,0.6)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 9, color: "#f1f5f9",
              fontSize: 13, padding: "8px 12px 8px 34px",
              fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(6,9,15,0.6)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 9, padding: "8px 12px",
          }}>
            <Filter size={12} color="#334155" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
            >
              <option value="all">All Statuses</option>
              <option value="Converted">Converted</option>
              <option value="Demo Requested">Demo Requested</option>
              <option value="Follow-up Required">Follow-up Required</option>
              <option value="Interested">Interested</option>
              <option value="Not Interested">Not Interested</option>
              <option value="No Response">No Response</option>
            </select>
          </div>

          <button
            onClick={fetch}
            title="Refresh"
            style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748b",
              transition: "background .15s",
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#334155" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(6,182,212,.2)", borderTopColor: "#06b6d4", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading pipeline…</span>
          </div>
        ) : calls.length === 0 ? (
          <div style={{ padding: "60px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={22} color="#1e293b" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#334155", marginBottom: 5 }}>No calls found</p>
              <p style={{ fontSize: 12, color: "#1e293b" }}>
                {search || status !== "all"
                  ? "Try adjusting your search or filter."
                  : "Start your first sales call in the Live Call tab."}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {calls.map((c, idx) => {
              const st = getStatus(c.sales_status);
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCall(c.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "14px 20px",
                    borderBottom: idx < calls.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    cursor: "pointer",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Avatar circle */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(6,182,212,0.15),rgba(59,130,246,0.1))",
                    border: "1px solid rgba(6,182,212,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: "#06b6d4",
                  }}>
                    {c.customer_name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.customer_name}
                      </span>
                      {c.sales_status && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                          background: st.bg, border: `1px solid ${st.border}`, color: st.text,
                        }}>
                          {c.sales_status}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "#334155" }}>
                      {c.customer_company && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Building size={11} /> {c.customer_company}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {Math.round(c.recording_duration_seconds || 0)}s
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <FileText size={11} /> {c.message_count} messages
                      </span>
                      {c.recording_url && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#06b6d4" }}>
                          <Volume2 size={11} /> Audio saved
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} />
                        {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={e => handleDelete(e, c.id)}
                      disabled={deleting === c.id}
                      style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: "transparent", border: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#1e293b", transition: "color .15s, background .15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.color = "#ef4444"); (e.currentTarget.style.background = "rgba(239,68,68,0.08)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = "#1e293b"); (e.currentTarget.style.background = "transparent"); }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} color="#1e293b" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
