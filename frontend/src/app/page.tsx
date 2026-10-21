"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { LiveCallWorkspace } from "@/components/LiveCallWorkspace";
import { CallResultsView } from "@/components/CallResultsView";
import { CallHistoryView } from "@/components/CallHistoryView";
import { FlowDeskKnowledgeDeck } from "@/components/FlowDeskKnowledgeDeck";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { getCallDetail } from "../lib/api";
import { CallDetail } from "@/types/call";

export default function Home() {
  const [tab, setTab] = useState("call");
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);

  const voice = useVoiceCall();

  const handleStartCall = async (name: string, company?: string, language?: string) => {
    const call = await voice.startCall(name, company, language);
    if (call) setSelectedCall(call);
  };

  const handleSelectFromHistory = async (callId: string) => {
    try {
      const detail = await getCallDetail(callId);
      setSelectedCall(detail);
      setTab("results");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = async () => {
    const id = selectedCall?.id || voice.activeCall?.id;
    if (!id) return;
    try {
      const detail = await getCallDetail(id);
      setSelectedCall(detail);
      if (voice.activeCall?.id === id) voice.setActiveCall(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const displayCall = selectedCall || voice.activeCall;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <Header currentTab={tab} onSelectTab={setTab} activeCallId={voice.activeCall?.id} />

      <main style={{ flex: 1 }}>
        {tab === "call" && (
          <LiveCallWorkspace
            callState={voice.callState}
            activeCall={voice.activeCall}
            messages={voice.messages}
            isRecording={voice.isRecording}
            consentGranted={voice.consentGranted}
            callDuration={voice.callDuration}
            speechSupported={voice.speechSupported}
            isAiSpeaking={voice.isAiSpeaking}
            audioLevel={voice.audioLevel}
            errorMsg={voice.errorMsg}
            isTextFallback={voice.isTextFallback}
            onStartCall={handleStartCall}
            onSubmitConsent={voice.submitConsent}
            onSendMessage={voice.handleCustomerUtterance}
            onEndCall={voice.terminateCall}
            onViewResults={() => setTab("results")}
          />
        )}
        {tab === "results" && <CallResultsView call={displayCall} onRefreshCall={handleRefresh} onStartNewCall={() => setTab("call")} />}
        {tab === "history" && <CallHistoryView onSelectCall={handleSelectFromHistory} />}
        {tab === "product" && <FlowDeskKnowledgeDeck />}
        {tab === "diagnostics" && <DiagnosticsPanel />}
      </main>

      {/* Desktop footer */}
      <footer
        className="hidden md:block"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "18px 24px",
          background: "rgba(6,9,15,0.6)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "#334155" }}>
            <strong style={{ color: "#475569" }}>Voxora AI</strong>
            {" — "}Every conversation. More sales intelligence.
          </span>
          <span style={{ fontSize: 11, color: "#1e293b" }}>
            Fictional SaaS Product: FlowDesk AI | Demonstration Data Only
          </span>
        </div>
      </footer>

      {/* Mobile bottom nav spacer */}
      <div className="mob-nav-spacer" />
    </div>
  );
}
