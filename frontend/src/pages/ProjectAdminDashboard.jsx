import { useState, useEffect, useCallback } from "react"
import { T, card, cardMd } from "../styles/theme"
import Nav from "../components/Nav"
import StatusBadge from "../components/StatusBadge"
import {
  apiGetPendingSaccos,
  apiApproveSacco,
  apiRejectSacco,
  apiGetAuditLog,
  apiListSaccos,
  apiHealth,
  apiReady,
} from "../services/api"

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return size
}

const TABS = ["Project Overview", "SACCO Approvals", "Network Health", "Audit Log"]

const TH = (h) => (
  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: T.textDim, borderBottom: `1.5px solid ${T.border}`, background: T.surface, whiteSpace: "nowrap", fontFamily: T.fontMono }}>{h}</th>
)

const statCard = (label, value, accent, isMobile) => (
  <div style={{ ...card(), padding: isMobile ? "18px 16px" : "22px 20px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: accent }} />
    <p style={{ fontSize: "11px", fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</p>
    <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: 700, color: T.textHi, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
  </div>
)

export default function ProjectAdminDashboard() {
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [tab, setTab] = useState("Project Overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [pendingSaccos, setPendingSaccos] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [networkStats, setNetworkStats] = useState({ totalSaccos: 0, pendingSaccos: 0 })
  const [health, setHealth] = useState({ api: null, db: null })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [saccos, logs, approved] = await Promise.all([
        apiGetPendingSaccos(),
        apiGetAuditLog(50, 0),
        apiListSaccos(),
      ])
      setPendingSaccos(saccos)
      setAuditLogs(logs)
      setNetworkStats({
        totalSaccos: approved.length,
        pendingSaccos: saccos.length,
      })
    } catch (err) {
      setError(err.message || "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (tab !== "Network Health") return
    Promise.all([apiHealth(), apiReady()])
      .then(([h, r]) => setHealth({ api: h, db: r }))
      .catch((err) => setHealth({ api: { status: "error" }, db: { error: err.message } }))
  }, [tab])

  async function handleApproveSacco(saccoId) {
    try {
      await apiApproveSacco(saccoId)
      await loadData()
    } catch (err) {
      alert(err.message || "Approval failed")
    }
  }

  async function handleRejectSacco(saccoId) {
    const reason = window.prompt("Rejection reason (optional):") || ""
    try {
      await apiRejectSacco(saccoId, reason)
      await loadData()
    } catch (err) {
      alert(err.message || "Rejection failed")
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <Nav hidePublicView />
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: isMobile ? "24px 16px 60px" : "48px 40px 80px" }}>

        <div style={{ marginBottom: isMobile ? "24px" : "32px" }}>
          <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Master Project Control</p>
          <h1 style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: 900, color: T.textHi, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Project <span style={{ color: T.green }}>Administration</span></h1>
          <p style={{ fontSize: isMobile ? "14px" : "15px", color: T.textMid }}>Approve new SACCOs on the platform. Member join requests are approved by each SACCO&apos;s own administrator.</p>
        </div>

        {error && (
          <div style={{ marginBottom: "20px", padding: "12px 16px", background: T.redBg, border: `1px solid ${T.redBdr}`, borderRadius: "10px", color: T.red, fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", marginBottom: isMobile ? "20px" : "28px", flexWrap: "wrap", padding: "4px", background: "#fff", borderRadius: "12px", border: `1.5px solid ${T.border}`, boxShadow: T.shadow, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: isMobile ? "8px 12px" : "9px 18px", borderRadius: "9px", fontFamily: T.font, border: "none", cursor: "pointer", fontSize: isMobile ? "12px" : "13px", fontWeight: 700, background: tab === t ? T.green : "transparent", color: tab === t ? "#fff" : T.textDim, transition: "all 0.18s", boxShadow: tab === t ? `0 2px 8px ${T.green}44` : "none" }}>{t}</button>
          ))}
        </div>

        {loading && <p style={{ color: T.textDim, fontFamily: T.fontMono }}>Loading...</p>}

        {!loading && tab === "Project Overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: "16px", marginBottom: "28px" }}>
              {statCard("Approved SACCOs", networkStats.totalSaccos, T.green, isMobile)}
              {statCard("Pending SACCOs", networkStats.pendingSaccos, T.goldMid, isMobile)}
              {statCard("Audit Events", auditLogs.length, "#7c3aed", isMobile)}
            </div>
            <div style={{ ...card(), padding: "20px 24px", background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
              <p style={{ margin: 0, fontSize: "14px", color: T.textMid, lineHeight: 1.6 }}>
                <strong>Member approvals</strong> are not handled here. When someone joins a SACCO, that SACCO&apos;s admin approves them under <strong>Pending Approvals</strong> in their dashboard.
              </p>
            </div>
          </div>
        )}

        {!loading && tab === "SACCO Approvals" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>Pending SACCO Registrations</h2>
            </div>
            {pendingSaccos.length === 0 ? (
              <p style={{ padding: "24px", color: T.textDim }}>No pending SACCO applications.</p>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Submitted", "SACCO Name", "Admin", "Country", "Status", "Actions"].map(TH)}</tr></thead>
                <tbody>
                    {pendingSaccos.map((s, i) => (
                      <tr key={s.sacco_id} style={{ borderBottom: i < pendingSaccos.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}>
                        <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                        </td>
                      <td style={{ padding: "15px 20px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: 0 }}>{s.name}</p>
                          <p style={{ fontSize: "11px", color: T.textDim, fontFamily: T.fontMono }}>{s.sacco_id}</p>
                        </td>
                        <td style={{ padding: "15px 20px", fontSize: "13px", color: T.textMid }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{s.admin_name}</p>
                          <p style={{ margin: 0, fontSize: "12px", color: T.textDim }}>{s.admin_phone}</p>
                        </td>
                        <td style={{ padding: "15px 20px", fontSize: "13px", color: T.textMid }}>{s.country}</td>
                        <td style={{ padding: "15px 20px" }}><StatusBadge status={s.status} /></td>
                        <td style={{ padding: "15px 20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => handleApproveSacco(s.sacco_id)} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: T.green, color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Approve</button>
                          <button onClick={() => handleRejectSacco(s.sacco_id)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Reject</button>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "Network Health" && (
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <div style={{ ...card(), padding: "24px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px" }}>API Health</h3>
              <p style={{ fontFamily: T.fontMono, fontSize: "13px", color: health.api?.status === "ok" ? T.green : T.textDim }}>
                {health.api ? JSON.stringify(health.api) : "Checking..."}
              </p>
            </div>
            <div style={{ ...card(), padding: "24px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px" }}>Database Ready</h3>
              <p style={{ fontFamily: T.fontMono, fontSize: "13px", color: health.db?.status === "ready" ? T.green : T.textDim }}>
                {health.db ? JSON.stringify(health.db) : "Checking..."}
              </p>
            </div>
          </div>
        )}

        {!loading && tab === "Audit Log" && (
           <div style={{ ...cardMd(), overflow: "hidden" }}>
             <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
               <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: "0 0 3px" }}>Global Project Audit Log</h2>
             </div>
            {auditLogs.length === 0 ? (
              <p style={{ padding: "24px", color: T.textDim }}>No audit events yet.</p>
            ) : auditLogs.map((log, i) => (
              <div key={log.id} style={{ padding: "18px 24px", borderBottom: i < auditLogs.length - 1 ? `1px solid ${T.border2}` : "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", background: "#fff" }}>
                   <div>
                     <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: "0 0 3px" }}>{log.action}</p>
                     <p style={{ fontSize: "13px", color: T.textMid, margin: "0 0 3px" }}>{log.target}</p>
                  <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>actor: {log.actor}</p>
                   </div>
                <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim }}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                </p>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  )
}
