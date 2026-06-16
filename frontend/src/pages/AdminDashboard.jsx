// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react"
import { T, card, cardMd } from "../styles/theme"
import { useAuth } from "../context/AuthContext"
import { SACCO_INFO } from "../data/demo"
import { apiGetMembers, apiGetTransactions, apiGetAuditLog, apiRegister, apiUpdateMemberRole, apiUpdateMemberStatus } from "../services/api"
import Nav from "../components/Nav"
import StellarHashLink from "../components/StellarHashLink"
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

const typeColor = { Deposit: T.green, Loan: T.goldMid, Repayment: "#059669" }
const TABS = ["SACCO Summary", "Members and Roles", "Register Member", "All Transactions", "Audit Log"]

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

export default function AdminDashboard() {
  const { currency } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [tab, setTab] = useState("SACCO Summary")
  const [members, setMembers] = useState([])
  const [allTxs, setAllTxs] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [regForm, setRegForm] = useState({ name: "", phone: "", role: "member" })
  const [regOk, setRegOk] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regErr, setRegErr] = useState("")


  useEffect(() => {
    async function load() {
      try {
        const [mems, audit] = await Promise.all([apiGetMembers(), apiGetAuditLog()])
        setMembers(mems)
        setAuditLog(audit)
        const txArrays = await Promise.all(mems.filter(m => m.role === "member").map(m => apiGetTransactions(m.member_id)))
        setAllTxs(txArrays.flat().sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)))
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search) || m.member_id.toLowerCase().includes(search.toLowerCase()))

  async function toggleSuspend(id) {
    const m = members.find(m => m.member_id === id)
    const newStatus = m.status === "active" ? "suspended" : "active"
    await apiUpdateMemberStatus(id, newStatus)
    setMembers(prev => prev.map(m => m.member_id === id ? { ...m, status: newStatus } : m))
  }
  async function changeRole(id, role) {
    await apiUpdateMemberRole(id, role)
    setMembers(prev => prev.map(m => m.member_id === id ? { ...m, role } : m))
  }
  async function handleRegister(e) {
    e.preventDefault(); setRegErr(""); setRegLoading(true)
    try {
      await apiRegister(regForm)
      setRegOk(true)
      setTimeout(() => { setRegOk(false); setRegForm({ name: "", phone: "", role: "member" }) }, 3000)
    } catch (err) { setRegErr(err.message || "Registration failed.") }
    finally { setRegLoading(false) }
  }

  const totalDeposits = allTxs.filter(t => t.type === "Deposit").reduce((s, t) => s + t.amount_kes, 0)
  const totalLoans = allTxs.filter(t => t.type === "Loan").reduce((s, t) => s + t.amount_kes, 0)
  const totalRepayments = allTxs.filter(t => t.type === "Repayment").reduce((s, t) => s + t.amount_kes, 0)
  const activeMembers = members.filter(m => m.role === "member" && m.status === "active").length

  const inp = (e = {}) => ({ background: "#ffffff", border: `1.5px solid ${T.border}`, color: "#0a0a0a", borderRadius: "9px", padding: "11px 14px", width: "100%", outline: "none", fontSize: "14px", fontFamily: T.font, transition: "border-color 0.18s, box-shadow 0.18s", ...e })
  const onF = (e) => { e.target.style.borderColor = T.green; e.target.style.boxShadow = `0 0 0 3px ${T.greenLite}` }
  const onB = (e) => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none" }
  const Lbl = ({ text }) => <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textDim, marginBottom: "6px", letterSpacing: "0.8px", textTransform: "uppercase" }}>{text}</label>

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <Nav />
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: isMobile ? "24px 16px 60px" : "48px 40px 80px" }}>

        <div style={{ marginBottom: isMobile ? "24px" : "32px" }}>
          <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>{SACCO_INFO.name} Admin Portal</p>
          <h1 style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: 900, color: T.textHi, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Admin <span style={{ color: T.green }}>Dashboard</span></h1>
          <p style={{ fontSize: isMobile ? "14px" : "15px", color: T.textMid }}>Full SACCO oversight, members, transactions, and audit log</p>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: isMobile ? "20px" : "28px", flexWrap: "wrap", padding: "4px", background: "#fff", borderRadius: "12px", border: `1.5px solid ${T.border}`, boxShadow: T.shadow, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: isMobile ? "8px 12px" : "9px 18px", borderRadius: "9px", fontFamily: T.font, border: "none", cursor: "pointer", fontSize: isMobile ? "12px" : "13px", fontWeight: 700, background: tab === t ? T.green : "transparent", color: tab === t ? "#fff" : T.textDim, transition: "all 0.18s", boxShadow: tab === t ? `0 2px 8px ${T.green}44` : "none" }}>{t}</button>
          ))}
        </div>

        {loading && <div style={{ ...card(), padding: "60px", textAlign: "center" }}><p style={{ fontSize: "15px", color: T.textDim, fontFamily: T.fontMono }}>Loading...</p></div>}

        {/* SUMMARY */}
        {!loading && tab === "SACCO Summary" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
              {statCard("Total Deposits", `${currency} ${(totalDeposits / 1000).toFixed(0)}K`, T.green, isMobile)}
              {statCard("Total Loans", `${currency} ${(totalLoans / 1000).toFixed(0)}K`, T.goldMid, isMobile)}
              {statCard("Total Repayments", `${currency} ${(totalRepayments / 1000).toFixed(0)}K`, "#059669", isMobile)}
              {statCard("Active Members", activeMembers, "#7c3aed", isMobile)}
            </div>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>Recent Transactions</h2>
              </div>
              
              {isMobile ? (
                <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                  {allTxs.slice(0, 10).map(tx => (
                    <div key={tx.id} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString()}</span>
                        <StatusBadge status="confirmed" />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{members.find(m => m.member_id === tx.member_id)?.name}</p>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: typeColor[tx.type] }}>{tx.type}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "16px", fontWeight: 900, color: T.textHi, fontFamily: T.fontMono }}>{currency} {tx.amount_kes.toLocaleString()}</p>
                          <StellarHashLink hash={tx.stellar_tx_hash} isCompact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Date", "Member", "Type", "Amount", "Via", "Stellar Proof"].map(TH)}</tr></thead>
                    <tbody>
                      {allTxs.slice(0, 12).map((tx, i) => {
                        const mem = members.find(m => m.member_id === tx.member_id)
                        return (
                          <tr key={tx.id} style={{ borderBottom: i < 11 ? `1px solid ${T.border2}` : "none", background: "#fff" }}
                            onMouseEnter={e => e.currentTarget.style.background = T.surface}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td style={{ padding: "15px 20px" }}>
                              <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{mem?.name}</p>
                              <p style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>{tx.member_id}</p>
                            </td>
                            <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "15px", fontWeight: 800, color: T.textHi }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "12px", color: T.textDim }}>{tx.entry_type === "MPESA" ? "Mobile Money" : "Admin"}</td>
                            <td style={{ padding: "15px 20px" }}><StellarHashLink hash={tx.stellar_tx_hash} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMBERS AND ROLES */}
        {!loading && tab === "Members and Roles" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: "16px", background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>Members and Roles</h2>
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: "9px", border: `1.5px solid ${T.border}`, background: "#f9fafb", color: T.textHi, fontSize: "14px", fontFamily: T.font, outline: "none", width: isMobile ? "100%" : "200px" }}
                onFocus={e => { e.target.style.borderColor = T.green; e.target.style.boxShadow = `0 0 0 3px ${T.greenLite}` }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none" }} />
            </div>
            
            {isMobile ? (
              <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                {filtered.map(m => (
                  <div key={m.member_id} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{m.name}</p>
                        <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>{m.member_id}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                      <div>
                        <Lbl text="Balance" />
                        <p style={{ fontSize: "14px", fontWeight: 800, color: T.green }}>{currency} {m.balance_kes.toLocaleString()}</p>
                      </div>
                      <div>
                        <Lbl text="Role" />
                        <select value={m.role} onChange={e => changeRole(m.member_id, e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${T.border}`, background: "#f9fafb", color: T.textMid, fontSize: "13px", fontWeight: 600 }}>
                          <option value="member">member</option>
                          <option value="cashier">cashier</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={() => toggleSuspend(m.member_id)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: m.status === "active" ? T.redBg : T.greenLite, color: m.status === "active" ? T.red : T.green, fontSize: "13px", fontWeight: 700 }}>
                      {m.status === "active" ? "Suspend Member" : "Reactivate Member"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["ID", "Name", "Phone", "Balance", "Role", "Status", "Actions"].map(TH)}</tr></thead>
                  <tbody>
                    {filtered.map((m, i) => (
                      <tr key={m.member_id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.surface}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "12px", fontWeight: 700, color: T.textDim }}>{m.member_id}</td>
                        <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: T.textHi }}>{m.name}</td>
                        <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{m.phone}</td>
                        <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "14px", fontWeight: 800, color: T.green }}>{m.balance_kes > 0 ? `${currency} ${m.balance_kes.toLocaleString()}` : "None"}</td>
                        <td style={{ padding: "15px 20px" }}>
                          <select value={m.role} onChange={e => changeRole(m.member_id, e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${T.border}`, background: "#f9fafb", color: T.textMid, fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: T.font }}>
                            <option value="member">member</option>
                            <option value="cashier">cashier</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td style={{ padding: "15px 20px" }}><StatusBadge status={m.status} /></td>
                        <td style={{ padding: "15px 20px" }}>
                          <button onClick={() => toggleSuspend(m.member_id)} style={{ padding: "7px 16px", borderRadius: "8px", border: "none", fontFamily: T.font, background: m.status === "active" ? T.redBg : T.greenLite, color: m.status === "active" ? T.red : T.green, fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "opacity 0.18s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                            {m.status === "active" ? "Suspend" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REGISTER MEMBER */}
        {!loading && tab === "Register Member" && (
          <div style={{ maxWidth: "480px" }}>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ height: "3px", background: `linear-gradient(90deg,${T.green},${T.goldMid})` }} />
              <div style={{ padding: "28px 32px" }}>
                <h2 style={{ fontSize: "19px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>Register New Member</h2>
                <p style={{ fontSize: "14px", color: T.textDim, margin: "0 0 24px" }}>Add a new member to the SACCO system</p>
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Sarah Wanjiku" },
                    { label: "Phone Number", key: "phone", type: "tel", placeholder: "e.g. 0700 123 456" },
                  ].map(f => (
                    <div key={f.key}>
                      <Lbl text={f.label} />
                      <input type={f.type} value={regForm[f.key]} onChange={e => setRegForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} required style={inp()} onFocus={onF} onBlur={onB} />
                    </div>
                  ))}
                  <div>
                    <Lbl text="Role" />
                    <select value={regForm.role} onChange={e => setRegForm(p => ({ ...p, role: e.target.value }))} style={{ ...inp(), cursor: "pointer" }}>
                      <option value="member">Member</option>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {regErr && <div style={{ padding: "12px 16px", borderRadius: "10px", background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red, fontSize: "14px" }}>{regErr}</div>}
                  {regOk && <div style={{ padding: "13px 16px", borderRadius: "10px", background: T.greenLite, border: `1px solid ${T.greenBdr}`, color: T.green, fontSize: "14px", fontWeight: 700 }}>Member registered. Login credentials sent via SMS.</div>}
                  <button type="submit" disabled={regLoading} style={{ padding: "14px", borderRadius: "10px", border: "none", fontFamily: T.font, background: regLoading ? T.border2 : T.green, color: regLoading ? T.textXdim : "#fff", fontSize: "15px", fontWeight: 800, cursor: regLoading ? "not-allowed" : "pointer" }}>
                    {regLoading ? "Registering..." : "Register Member"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}



        {/* ALL TRANSACTIONS */}
        {!loading && tab === "All Transactions" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>All Transactions</h2>
              {!isMobile && <span style={{ fontSize: "12px", fontFamily: T.fontMono, fontWeight: 600, padding: "4px 12px", borderRadius: "99px", background: T.greenLite, color: T.green, border: `1px solid ${T.greenBdr}` }}>{allTxs.length} total</span>}
            </div>
            
            {isMobile ? (
              <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                {allTxs.map(tx => (
                  <div key={tx.id} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString()}</span>
                      <StatusBadge status="confirmed" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{members.find(m => m.member_id === tx.member_id)?.name}</p>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: typeColor[tx.type] }}>{tx.type}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "16px", fontWeight: 900, color: T.textHi, fontFamily: T.fontMono }}>{currency} {tx.amount_kes.toLocaleString()}</p>
                        <StellarHashLink hash={tx.stellar_tx_hash} isCompact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Date", "Member", "Type", "Amount", "Via", "Status", "Stellar Proof"].map(TH)}</tr></thead>
                  <tbody>
                    {allTxs.map((tx, i) => {
                      const mem = members.find(m => m.member_id === tx.member_id)
                      return (
                        <tr key={tx.id} style={{ borderBottom: i < allTxs.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.surface}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                          <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td style={{ padding: "15px 20px" }}>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{mem?.name}</p>
                            <p style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>{tx.member_id}</p>
                          </td>
                          <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                          <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "15px", fontWeight: 800, color: T.textHi }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                          <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "12px", color: T.textDim }}>{tx.entry_type === "MPESA" ? "M-Pesa" : "Admin"}</td>
                          <td style={{ padding: "15px 20px" }}><span style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontFamily: T.fontMono, fontWeight: 700, background: T.greenLite, color: T.green, border: `1px solid ${T.greenBdr}` }}>CONFIRMED</span></td>
                          <td style={{ padding: "15px 20px" }}><StellarHashLink hash={tx.stellar_tx_hash} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG */}
        {!loading && tab === "Audit Log" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: "0 0 3px" }}>Admin Audit Log</h2>
              <p style={{ fontSize: "13px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>Every admin action permanently logged</p>
            </div>
            {auditLog.map((log, i) => (
              <div key={log.id} style={{ padding: "18px 24px", borderBottom: i < auditLog.length - 1 ? `1px solid ${T.border2}` : "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", background: "#fff", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: T.greenLite, border: `1.5px solid ${T.greenBdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", color: T.green, flexShrink: 0 }}>
                    {log.admin.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: "0 0 3px" }}>{log.action}</p>
                    <p style={{ fontSize: "13px", color: T.textMid, margin: "0 0 3px" }}>{log.target}</p>
                    <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>by {log.admin}</p>
                  </div>
                </div>
                <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, flexShrink: 0 }}>
                  {new Date(log.time).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}