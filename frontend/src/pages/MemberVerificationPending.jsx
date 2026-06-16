import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { T, card } from "../styles/theme"
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

const StatusBadge = ({ status }) => {
  const map = {
    under_review: { label: "Under Review", bg: T.blueBg, color: T.blue, bdr: T.blueBdr },
    action_required: { label: "Action Required", bg: T.goldBg, color: T.goldMid, bdr: T.goldBdr },
    approved: { label: "Approved", bg: T.greenBg, color: T.green, bdr: T.greenBdr }
  }
  const s = map[status] || map.under_review
  return (
    <span style={{ padding: "6px 12px", borderRadius: "99px", background: s.bg, color: s.color, border: `1px solid ${s.bdr}`, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {s.label}
    </span>
  )
}

export default function MemberVerificationPending() {
  const navigate = useNavigate()
  const { auth, logout } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 768
  
  const mySacco = ALL_SACCOS.find(s => s.id === auth?.sacco_id) || ALL_SACCOS[0]
  
  const handleLogout = () => {
    logout()
    navigate("/")
  }
  
  const steps = [
    { label: "Submitted", done: true },
    { label: "KYC Check", done: true },
    { label: "Liveliness", done: true },
    { label: "SACCO Review", done: false, active: true },
    { label: "Account Active", done: false }
  ]

  const submittedDocs = [
    { name: "National ID (Front)", status: "Verified", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="12" y2="16"/></svg> },
    { name: "National ID (Back)", status: "Verified", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { name: "Liveliness Selfie", status: "In Review", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
  ]

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>
      
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#ffffff", borderBottom: `1.5px solid ${T.border}`,
        boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 40px", height: "72px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
          <img src="/image10.png" alt="Logo" style={{ height: isMobile ? "28px" : "38px" }} />
          <span style={{ fontSize: isMobile ? "15px" : "18px", fontWeight: 900, letterSpacing: isMobile ? "0.5px" : "1px" }}>
            <span style={{ color: T.textHi }}>SENTE</span><span style={{ color: T.goldMid }}>CHAIN</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
          <button onClick={handleLogout} style={{
            fontSize: isMobile ? "12px" : "13px", fontWeight: 700, 
            padding: isMobile ? "6px 12px" : "8px 16px", 
            borderRadius: "9px", cursor: "pointer", 
            border: "none", background: T.redBg, color: T.red
          }}>Log Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 20px" }}>
        
        {/* Header Card */}
        <div style={{ ...card(), background: "#fff", padding: isMobile ? "24px" : "32px", marginBottom: "24px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", background: T.blueBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: 900, color: T.textHi, marginBottom: "8px" }}>Verification in Progress</h1>
          <p style={{ color: T.textMid, fontSize: isMobile ? "14px" : "16px", marginBottom: "20px" }}>Welcome to <strong>{mySacco.name}</strong>. We are currently reviewing your documents.</p>
          <StatusBadge status="under_review" />
        </div>



        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: "24px" }}>
          {/* Document Summary */}
          <div style={{ ...card(), background: "#fff", padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "16px", color: T.textHi }}>Your Submissions</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {submittedDocs.map((doc, i) => (
                <div key={i} style={{ padding: "12px", background: T.surface, borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: T.textMid, display: "flex", alignItems: "center" }}>{doc.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: T.textHi }}>{doc.name}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: doc.status === "Verified" ? T.green : T.blue }}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div style={{ display: "grid", gap: "20px" }}>
            <div style={{ ...card(), background: T.blueBg, border: `1px solid ${T.blueBdr}`, padding: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px", color: T.blue }}>Why wait?</h3>
              <p style={{ fontSize: "12px", color: T.textMid, lineHeight: 1.5, margin: 0 }}>
                To comply with regional financial regulations, each member must be manually verified by the SACCO. This keeps the network secure and trusted.
              </p>
            </div>
            
            <button onClick={() => navigate("/")} style={{ 
              width: "100%", padding: "14px", borderRadius: "12px", border: "none", 
              background: T.textHi, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "14px"
            }}>
              Back to Website
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "12px", color: T.textDim }}>
          Need help? Contact {mySacco.name} support or email <strong>support@sentechain.app</strong>
        </p>

      </div>
    </div>
  )
}
