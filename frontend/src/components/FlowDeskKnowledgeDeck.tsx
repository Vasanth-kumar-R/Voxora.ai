"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen, Check, Layers, DollarSign, HelpCircle,
  Shield, ArrowUpRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { getKnowledgeBase } from "@/lib/api";

function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return <div className="card" style={{ padding:20, ...style }}>{children}</div>;
}

function SectionTitle({ icon:Icon, label, color="#06b6d4" }: { icon:React.ElementType; label:string; color?:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
      <Icon size={14} color={color}/>
      <span style={{ fontSize:12, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase" }}>
        {label}
      </span>
    </div>
  );
}

export function FlowDeskKnowledgeDeck() {
  const [kb,   setKb]   = useState<any>(null);
  const [loading, setL] = useState(true);
  const [openFaq, setFaq] = useState<number|null>(null);

  useEffect(() => {
    getKnowledgeBase()
      .then(d => setKb(d))
      .catch(e => console.error(e))
      .finally(() => setL(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid rgba(6,182,212,.2)", borderTopColor:"#06b6d4", animation:"spin 1s linear infinite" }} />
        <span style={{ fontSize:13, color:"#334155" }}>Loading product knowledge…</span>
      </div>
    </div>
  );

  if (!kb) return (
    <div style={{ minHeight:"40vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ fontSize:14, color:"#334155" }}>Knowledge base unavailable.</p>
    </div>
  );

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px", display:"flex", flexDirection:"column", gap:20 }}>

      {/* Hero banner */}
      <div className="card" style={{
        padding:"28px 24px",
        background:"linear-gradient(135deg,rgba(6,182,212,0.06) 0%,rgba(99,102,241,0.04) 100%)",
        borderColor:"rgba(6,182,212,0.18)",
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
              <BookOpen size={13} color="#06b6d4" />
              <span style={{ fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".07em", textTransform:"uppercase" }}>
                Sales Grounding Knowledge Base
              </span>
            </div>
            <h1 style={{ fontSize:24, fontWeight:900, color:"#f1f5f9", letterSpacing:"-0.02em", margin:0, marginBottom:6 }}>
              {kb.product_name}
            </h1>
            <p style={{ fontSize:14, color:"#64748b", margin:0 }}>{kb.product_tagline}</p>
          </div>
          <span style={{
            fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            padding:"5px 12px", borderRadius:99, flexShrink:0, alignSelf:"flex-start",
            background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.25)", color:"#67e8f9",
          }}>
            Pitch Grounding Active
          </span>
        </div>

        {kb.disclaimer && (
          <div style={{
            marginTop:16, padding:"10px 14px", borderRadius:9, fontSize:12,
            background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", color:"#fbbf24",
            lineHeight:1.6,
          }}>
            <strong>Demo Notice:</strong> {kb.disclaimer}
          </div>
        )}
      </div>

      {/* Value props */}
      <Card>
        <SectionTitle icon={Layers} label="Core Value Proposition" />
        <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.8, marginBottom:16 }}>
          {kb.overview?.detailed_description}
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }} className="vp-grid">
          <style>{`@media(max-width:500px){.vp-grid{grid-template-columns:1fr;}}`}</style>
          {kb.overview?.primary_value_propositions?.map((vp:string, i:number) => (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:9, fontSize:12, color:"#cbd5e1",
              padding:"10px 12px", borderRadius:9,
              background:"rgba(6,182,212,0.05)", border:"1px solid rgba(6,182,212,0.12)",
            }}>
              <Check size={13} color="#06b6d4" style={{ marginTop:1, flexShrink:0 }}/>
              {vp}
            </div>
          ))}
        </div>
      </Card>

      {/* Pricing */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
          <DollarSign size={14} color="#10b981" />
          <span style={{ fontSize:12, fontWeight:700, color:"#475569", letterSpacing:".06em", textTransform:"uppercase" }}>
            Pricing Tiers
          </span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }} className="pricing-grid">
          <style>{`@media(max-width:640px){.pricing-grid{grid-template-columns:1fr;}}`}</style>
          {kb.pricing_tiers?.map((t:any, i:number) => {
            const featured = t.tier?.includes("Growth");
            return (
              <div key={i} className="card" style={{
                padding:22,
                borderColor: featured ? "rgba(6,182,212,0.4)" : undefined,
                boxShadow: featured ? "0 0 0 1px rgba(6,182,212,0.15), 0 8px 32px rgba(6,182,212,0.08)" : undefined,
                position:"relative",
              }}>
                {featured && (
                  <div style={{
                    position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)",
                    fontSize:9, fontWeight:800, letterSpacing:".08em",
                    padding:"3px 12px", borderRadius:99,
                    background:"linear-gradient(135deg,#06d6f0,#3b82f6)", color:"#020a12",
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ fontSize:16, fontWeight:800, color:"#f1f5f9", marginBottom:8, letterSpacing:"-0.01em" }}>
                  {t.tier}
                </h3>
                <div style={{ fontSize:26, fontWeight:900, color:"#06b6d4", marginBottom:2, letterSpacing:"-0.02em" }}>
                  {t.demo_price}
                </div>
                <p style={{ fontSize:11, color:"#334155", marginBottom:6 }}>{t.annual_price}</p>
                <p style={{ fontSize:12, color:"#64748b", fontStyle:"italic", marginBottom:16 }}>"{t.ideal_for}"</p>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14, display:"flex", flexDirection:"column", gap:8 }}>
                  {t.includes?.map((inc:string, j:number) => (
                    <div key={j} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:12, color:"#94a3b8" }}>
                      <Check size={12} color="#06b6d4" style={{ marginTop:2, flexShrink:0 }}/>
                      {inc}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integrations + Security */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="int-grid">
        <style>{`@media(max-width:600px){.int-grid{grid-template-columns:1fr;}}`}</style>

        <Card>
          <SectionTitle icon={ArrowUpRight} label="Integrations" />
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {kb.integrations?.supported?.map((item:string, i:number) => (
              <span key={i} style={{
                fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:7,
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8",
              }}>
                {item}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={Shield} label="Compliance & Security" color="#10b981" />
          <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7, margin:0 }}>
            FlowDesk AI enforces an 85% confidence threshold to prevent hallucinations. SOC-2 Type II certified and GDPR compliant. Customer training data is strictly isolated per tenant.
          </p>
        </Card>
      </div>

      {/* FAQ accordion */}
      <Card>
        <SectionTitle icon={HelpCircle} label="Frequently Asked Questions" />
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {kb.frequently_asked_questions?.map((faq:any, i:number) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{
                borderRadius:10,
                border:"1px solid rgba(255,255,255,0.06)",
                background: open ? "rgba(6,182,212,0.04)" : "rgba(255,255,255,0.02)",
                overflow:"hidden",
                transition:"background .15s",
              }}>
                <button
                  onClick={() => setFaq(open ? null : i)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                    gap:12, padding:"12px 14px",
                    background:"none", border:"none", cursor:"pointer", textAlign:"left",
                  }}
                >
                  <span style={{ fontSize:13, fontWeight:600, color: open ? "#06b6d4" : "#cbd5e1" }}>
                    {faq.question}
                  </span>
                  {open
                    ? <ChevronUp size={14} color="#06b6d4" style={{ flexShrink:0 }}/>
                    : <ChevronDown size={14} color="#334155" style={{ flexShrink:0 }}/>
                  }
                </button>
                {open && (
                  <div style={{ padding:"0 14px 14px", fontSize:12, color:"#64748b", lineHeight:1.7 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
