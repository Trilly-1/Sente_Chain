import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { T } from "../styles/theme"
import { useAuth } from "../context/AuthContext"
import { ALL_SACCOS } from "../data/demo"

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

const C = {
  green: "#15803d", greenLite: "#dcfce7", greenBdr: "#bbf7d0",
  blue: "#1d4ed8", blueLite: "#dbeafe", blueBdr: "#bfdbfe",
  amber: "#b45309", amberLite: "#fef3c7", amberBdr: "#fde68a",
  textHi: "#0a0a0a", textMid: "#374151", textDim: "#6b7280",
  border: "#e5e7eb", surface: "#f9fafb",
  font: "'DM Sans', sans-serif"
}

const StatusBadge = ({ status }) => {
  const map = {
    under_review: { label: "Under Review", bg: T.blueBg, color: T.blue, bdr: T.blueBdr },
    action_required: { label: "Action Required", bg: T.goldBg, color: T.goldMid, bdr: T.goldBdr },
    approved: { label: "Approved", bg: T.greenBg, color: T.green, bdr: T.greenBdr }
  }
  const s = map[status] || map.under_review
  return (
    <span style={{ padding: "6px 12px", borderRadius: "99px", background: s.bg, color: s.color, border: `1px solid ${s.bdr}`, fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
      {s.label}
    </span>
  )
}

export default function VerificationPending() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 768
  
  const mySacco = ALL_SACCOS.find(s => s.id === auth?.sacco_id) || ALL_SACCOS[0]
  
  // Mocking status - in a real app this would come from a backend API
  const [status, setStatus] = useState("under_review") 
  
  const steps = [
    { label: "Submitted", done: true },
    { label: "Doc Check", done: true },
    { label: "Gov API", done: false, active: true },
    { label: "Final Review", done: false },
    { label: "Active", done: false }
  ]

  const submittedDocs = [
    { name: "Registration Certificate", status: "Verified" },
    { name: "Operational License", status: "Verified" },
    { name: "TIN Certificate", status: "Action Required", error: "Blurry scan" }
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: C.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>
      
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#ffffff", borderBottom: `1px solid ${T.border}`,
        boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 40px", height: "72px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/image10.png" alt="Logo" style={{ height: isMobile ? "38px" : "48px", objectFit: "contain" }} />
          {!isMobile && (
            <span style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "2px", fontFamily: T.font }}>
              <span style={{ color: T.textHi }}>SENTE</span><span style={{ color: T.goldMid }}>CHAIN</span>
            </span>
          )}
        </div>
        <button onClick={() => navigate("/")} style={{
          padding: isMobile ? "7px 12px" : "10px 18px",
          fontSize: isMobile ? "12px" : "15px",
          borderRadius: "10px",
          border: "none",
          background: T.green,
          color: "#fff",
          fontWeight: 800,
          fontFamily: T.font,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap"
        }}
          onMouseEnter={e => e.currentTarget.style.background = T.greenDark}
          onMouseLeave={e => e.currentTarget.style.background = T.green}>
          Home
        </button>
      </nav>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: isMobile ? "24px 20px" : "40px 20px" }}>
        
        {/* Status Header */}
        <div style={{ 
          background: "#fff", padding: isMobile ? "24px" : "32px", borderRadius: "20px", border: `1px solid ${T.border}`,
          marginBottom: "24px", display: "flex", flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: "20px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 900, color: T.textHi, margin: 0 }}>{mySacco.name}</h1>
              <StatusBadge status={status} />
            </div>
            <p style={{ color: T.textMid, margin: 0 }}>Submitted April 24, 2026 • Ref: SC-99210</p>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: T.textDim, textTransform: "uppercase", marginBottom: "4px" }}>Est. Completion</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: T.blue, margin: 0 }}>24 - 48 Hours</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: "24px" }}>
          
          {/* Main Content */}
          <div style={{ display: "grid", gap: "24px" }}>
            


            {/* Action Required (Conditional) */}
            {status === "action_required" && (
              <div style={{ background: C.amberLite, padding: "24px", borderRadius: "20px", border: `1px solid ${C.amberBdr}` }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "12px", color: C.amber }}>Action Required</h2>
                <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: `1px solid ${C.amberBdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "14px", margin: "0 0 4px", color: C.textHi }}>TIN Certificate Blurry</p>
                    <p style={{ fontSize: "13px", color: C.textMid, margin: 0 }}>Please re-upload a high-resolution scan of your tax certificate.</p>
                  </div>
                  <button style={{ padding: "10px 16px", borderRadius: "8px", background: C.amber, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>Fix Now</button>
                </div>
              </div>
            )}

            {/* Application Summary */}
            <div style={{ background: "#fff", padding: "32px", borderRadius: "20px", border: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "20px", color: T.textHi }}>Submitted Documents</h2>
              <div style={{ display: "grid", gap: "12px" }}>
                {submittedDocs.map((doc, i) => (
                  <div key={i} style={{ padding: "16px", background: T.surface, borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "14px", margin: 0, color: T.textHi }}>{doc.name}</p>
                        {doc.error && <p style={{ fontSize: "12px", color: "red", margin: "2px 0 0" }}>Error: {doc.error}</p>}
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: doc.status === "Verified" ? T.green : T.goldMid }}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "grid", gap: "24px", height: "fit-content" }}>
            
            {/* Restricted Access Notice */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "20px", border: `1px solid ${T.border}` }}>
              <div style={{ width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textHi} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px", color: T.textHi }}>Restricted Access</h3>
              <p style={{ fontSize: "13px", color: T.textMid, lineHeight: 1.6, margin: 0 }}>
                Full dashboard features will be unlocked once verification is complete. Currently, your account is in read-only mode.
              </p>
              <div style={{ marginTop: "20px", display: "grid", gap: "8px" }}>
                {["Member Onboarding", "Loan Disbursement", "Stellar Wallet"].map(item => (
                  <div key={item} style={{ fontSize: "12px", color: T.textDim, display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Support */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "20px", border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px", color: T.textHi }}>Need Help?</h3>
              <p style={{ fontSize: "13px", color: T.textMid, lineHeight: 1.6, marginBottom: "16px" }}>
                Have questions about the verification process? Our support team is here to help.
              </p>
              <button style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1.5px solid ${T.border}`, background: "#fff", fontWeight: 700, color: T.textHi, cursor: "pointer" }}>
                Contact Support
              </button>
            </div>

            <button onClick={() => navigate("/")} style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#f1f5f9", fontWeight: 700, color: T.textMid, cursor: "pointer" }}>
              Back to Website
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
