// src/pages/ProjectAdminDashboard.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { T, card, cardMd } from "../styles/theme"
import Nav from "../components/Nav"
import StatusBadge from "../components/StatusBadge"

// Mobile detection hook
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

const TABS = ["Project Overview", "SACCO Approvals", "Network Health", "Audit Log"]

const TH = (h) => (
  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: T.textDim, borderBottom: `1.5px solid ${T.border}`, background: T.surface, whiteSpace: "nowrap", fontFamily: T.fontMono }}>{h}</th>
)

const statCard = (label, value, accent, isMobile) => (
  <div style={{ ...card(), padding: isMobile ? "16px" : "22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: accent, borderRadius: "16px 16px 0 0" }} />
    <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", fontFamily: T.fontMono }}>{label}</p>
    <p style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: 900, color: T.textHi, margin: 0 }}>{value}</p>
  </div>
)

export default function ProjectAdminDashboard() {
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [tab, setTab] = useState("Project Overview")
  const [loading, setLoading] = useState(false)

  const [onboarding, setOnboarding] = useState([
    { id: "S-001", name: "Rift Valley Dairy SACCO", status: "pending", date: "2026-04-24", country: "Kenya", score: 85, officials: "3 Verified" },
    { id: "S-002", name: "Kampala Boda Boda Cooperative", status: "under_review", date: "2026-04-23", country: "Uganda", score: 72, officials: "2 Verified" },
    { id: "S-003", name: "Dar Urban Savings", status: "pending", date: "2026-04-25", country: "Tanzania", score: 91, officials: "3 Verified" }
  ])

  const [networkStats] = useState({
    totalSaccos: 124,
    totalMembers: "12,402",
    totalVolume: "KSh 42.8M",
    nodesActive: 12,
    stellarOps: "1.2M"
  })

  const handleApprove = (id) => {
    setOnboarding(prev => prev.map(s => s.id === id ? { ...s, status: "approved" } : s))
    alert(`SACCO ${id} has been approved and notified.`)
  }

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <Nav hidePublicView />
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: isMobile ? "24px 16px 60px" : "48px 40px 80px" }}>

        <div style={{ marginBottom: isMobile ? "24px" : "32px" }}>
          <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Master Project Control</p>
          <h1 style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: 900, color: T.textHi, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Project <span style={{ color: T.green }}>Administration</span></h1>
          <p style={{ fontSize: isMobile ? "14px" : "15px", color: T.textMid }}>Monitor network activities, approve SACCOs, and manage project-wide settings.</p>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: isMobile ? "20px" : "28px", flexWrap: "wrap", padding: "4px", background: "#fff", borderRadius: "12px", border: `1.5px solid ${T.border}`, boxShadow: T.shadow, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: isMobile ? "8px 12px" : "9px 18px", borderRadius: "9px", fontFamily: T.font, border: "none", cursor: "pointer", fontSize: isMobile ? "12px" : "13px", fontWeight: 700, background: tab === t ? T.green : "transparent", color: tab === t ? "#fff" : T.textDim, transition: "all 0.18s", boxShadow: tab === t ? `0 2px 8px ${T.green}44` : "none" }}>{t}</button>
          ))}
        </div>

        {tab === "Project Overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
              {statCard("Active SACCOs", networkStats.totalSaccos, T.green, isMobile)}
              {statCard("Total Members", networkStats.totalMembers, T.goldMid, isMobile)}
              {statCard("Stellar Volume", networkStats.totalVolume, "#059669", isMobile)}
              {statCard("Network Nodes", networkStats.nodesActive, "#7c3aed", isMobile)}
            </div>
            
            <div style={{ ...cardMd(), padding: "24px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, marginBottom: "16px" }}>Network Activity Map</h3>
                <div style={{ height: "300px", background: T.surface, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.border}` }}>
                    <p style={{ color: T.textDim, fontSize: "14px", fontFamily: T.fontMono }}>Geospatial Activity Monitor [Simulation]</p>
                </div>
            </div>
          </div>
        )}

        {tab === "SACCO Approvals" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>Pending SACCO Registrations</h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Date", "SACCO Name", "Risk Score", "Officials", "Status", "Actions"].map(TH)}</tr></thead>
                <tbody>
                  {onboarding.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < onboarding.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}>
                      <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{s.date}</td>
                      <td style={{ padding: "15px 20px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: 0 }}>{s.name}</p>
                        <p style={{ fontSize: "11px", color: T.textDim }}>{s.country}</p>
                      </td>

                      <td style={{ padding: "15px 20px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: s.score > 80 ? T.green : T.goldMid }}>{s.score}%</span>
                      </td>
                      <td style={{ padding: "15px 20px", fontSize: "13px", color: T.textMid }}>{s.officials}</td>
                      <td style={{ padding: "15px 20px" }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: "15px 20px", display: "flex", gap: "8px" }}>
                        {s.status !== "approved" && (
                            <button style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: T.green, color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }} onClick={() => handleApprove(s.id)}>Approve</button>
                        )}
                        <button style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "#fff", color: T.textDim, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>View Docs</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Audit Log" && (
           <div style={{ ...cardMd(), overflow: "hidden" }}>
             <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
               <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: "0 0 3px" }}>Global Project Audit Log</h2>
               <p style={{ fontSize: "13px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>System-wide master admin actions</p>
             </div>
             {[
               { id: 1, action: "Approved SACCO", target: "Rift Valley Dairy", admin: "Super Admin", time: "2026-04-24T14:20:00" },
               { id: 2, action: "Suspended SACCO", target: "Nairobi Transport Coop", admin: "Super Admin", time: "2026-04-22T09:15:00" },
               { id: 3, action: "System Update", target: "V2.4.1 Deployment", admin: "Dev Master", time: "2026-04-21T23:55:00" },
             ].map((log, i) => (
               <div key={log.id} style={{ padding: "18px 24px", borderBottom: i < 2 ? `1px solid ${T.border2}` : "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", background: "#fff" }}>
                 <div style={{ display: "flex", gap: "14px" }}>
                   <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: T.greenLite, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: T.green }}>{log.admin[0]}</div>
                   <div>
                     <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: "0 0 3px" }}>{log.action}</p>
                     <p style={{ fontSize: "13px", color: T.textMid, margin: "0 0 3px" }}>{log.target}</p>
                     <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>by {log.admin}</p>
                   </div>
                 </div>
                 <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(log.time).toLocaleDateString()}</p>
               </div>
             ))}
           </div>
        )}

      </div>
    </div>
  )
}
