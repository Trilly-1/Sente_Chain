// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react"
import { T, card, cardMd } from "../styles/theme"
import { useAuth } from "../context/AuthContext"
import { apiGetMembers, apiListTransactions, apiStaffRegisterMember, apiUpdateMemberRole, apiUpdateMemberStatus, apiGetSaccoSummary, apiCreateTransaction, apiAnchorTransaction, apiVerifyTransaction, apiListLoanProducts, apiCreateLoanProduct, apiGetPaymentAccounts, apiSavePaymentAccounts, apiGetPaymentIntegrationStatus, apiGetPendingMembers, apiApproveMember, apiRejectMember } from "../services/api"
import { UGANDA } from "../data/countries"
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

const typeColor = { Deposit: T.green, Withdrawal: T.red, Loan: T.goldMid, Repayment: "#059669" }
const TABS = ["SACCO Summary", "Payment Settings", "Loan Products", "Pending Approvals", "Members and Roles", "Register Member", "All Transactions"]

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
  const { auth, currency } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [tab, setTab] = useState("SACCO Summary")
  const [members, setMembers] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [allTxs, setAllTxs] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [regForm, setRegForm] = useState({ name: "", phone: "", role: "member", pin: "1234" })
  const [txActionId, setTxActionId] = useState(null)
  const [regOk, setRegOk] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [saccoInfo, setSaccoInfo] = useState({ name: "SACCO" })
  const [regErr, setRegErr] = useState("")
  const [loanProducts, setLoanProducts] = useState([])
  const [productForm, setProductForm] = useState({ name: "Standard Loan", interest_rate_annual: 12, interest_method: "flat", min_term_months: 1, max_term_months: 24, is_default: true })
  const [productOk, setProductOk] = useState(false)
  const [productErr, setProductErr] = useState("")
  const [productLoading, setProductLoading] = useState(false)
  const [payForm, setPayForm] = useState({ mtn_phone: "", airtel_phone: "", account_name: "" })
  const [payOk, setPayOk] = useState(false)
  const [payErr, setPayErr] = useState("")
  const [payLoading, setPayLoading] = useState(false)
  const [payIntegration, setPayIntegration] = useState(null)
  const [staffTxnForm, setStaffTxnForm] = useState({ memberId: "", amount: "", type: "deposit" })


  useEffect(() => {
    if (!auth?.sacco_id) return
    async function load() {
      try {
        const [mems, summary, products, payAccounts, pending] = await Promise.all([
          apiGetMembers(auth.sacco_id),
          apiGetSaccoSummary(auth.sacco_id).catch(() => null),
          apiListLoanProducts(auth.sacco_id).catch(() => []),
          apiGetPaymentAccounts(auth.sacco_id).catch(() => []),
          apiGetPendingMembers(auth.sacco_id).catch(() => []),
        ])
        setMembers(mems)
        setPendingMembers(pending)
        setLoanProducts(products)
        const mtn = payAccounts.find((a) => a.provider === "mtn_momo")
        const airtel = payAccounts.find((a) => a.provider === "airtel_money")
        setPayForm({
          mtn_phone: mtn?.phone_number?.replace("+256", "0") || "",
          airtel_phone: airtel?.phone_number?.replace("+256", "0") || "",
          account_name: mtn?.account_name || airtel?.account_name || summary?.name || "",
        })
        if (summary) setSaccoInfo({ name: summary.name })
        const txList = await apiListTransactions({ saccoId: auth.sacco_id, limit: 100 })
        setAllTxs(txList.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)))
        apiGetPaymentIntegrationStatus().then(setPayIntegration).catch(() => {})
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [auth?.sacco_id])

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search) || m.member_id.toLowerCase().includes(search.toLowerCase()))

  async function toggleSuspend(id) {
    const m = members.find(m => m.member_id === id)
    const newStatus = m.status === "active" ? "suspended" : "active"
    await apiUpdateMemberStatus(id, newStatus, auth?.sacco_id)
    setMembers(prev => prev.map(m => m.member_id === id ? { ...m, status: newStatus } : m))
  }
  async function changeRole(id, role) {
    await apiUpdateMemberRole(id, role, auth?.sacco_id)
    setMembers(prev => prev.map(m => m.member_id === id ? { ...m, role } : m))
  }
  async function handleApprovePending(id) {
    await apiApproveMember(id, auth.sacco_id)
    const [mems, pending] = await Promise.all([apiGetMembers(auth.sacco_id), apiGetPendingMembers(auth.sacco_id)])
    setMembers(mems)
    setPendingMembers(pending)
  }
  async function handleRejectPending(id) {
    await apiRejectMember(id, auth.sacco_id)
    setPendingMembers((prev) => prev.filter((m) => m.member_id !== id))
  }
  async function handleRegister(e) {
    e.preventDefault(); setRegErr(""); setRegLoading(true)
    try {
      const phone = UGANDA.prefix + regForm.phone.replace(/^0+/, "")
      await apiStaffRegisterMember({
        name: regForm.name,
        phone,
        pin: regForm.pin,
        country: UGANDA.code,
        saccoId: auth.sacco_id,
        role: regForm.role === "cashier" ? "cashier" : "member",
        activate: true,
      })
      const mems = await apiGetMembers(auth.sacco_id)
      setMembers(mems)
      setRegOk(true)
      setTimeout(() => { setRegOk(false); setRegForm({ name: "", phone: "", role: "member", pin: "1234" }) }, 3000)
    } catch (err) { setRegErr(err.message || "Registration failed.") }
    finally { setRegLoading(false) }
  }

  async function handleAnchorTx(txId) {
    setTxActionId(txId)
    try {
      const updated = await apiAnchorTransaction(txId)
      setAllTxs((prev) => prev.map((t) => (t.id === txId ? { ...t, ...updated } : t)))
    } catch (err) { alert(err.message || "Anchor failed") }
    finally { setTxActionId(null) }
  }

  async function handleVerifyTx(txId) {
    setTxActionId(txId)
    try {
      const result = await apiVerifyTransaction(txId)
      alert(result.verified ? "Stellar proof verified on-chain" : `Verify result: ${JSON.stringify(result)}`)
    } catch (err) { alert(err.message || "Verify failed") }
    finally { setTxActionId(null) }
  }

  async function handleSavePaymentAccounts(e) {
    e.preventDefault()
    setPayErr("")
    setPayLoading(true)
    try {
      const accounts = []
      if (payForm.mtn_phone.trim()) {
        accounts.push({
          provider: "mtn_momo",
          phone_number: UGANDA.prefix + payForm.mtn_phone.replace(/^0+/, ""),
          account_name: payForm.account_name || saccoInfo.name,
          is_primary: true,
        })
      }
      if (payForm.airtel_phone.trim()) {
        accounts.push({
          provider: "airtel_money",
          phone_number: UGANDA.prefix + payForm.airtel_phone.replace(/^0+/, ""),
          account_name: payForm.account_name || saccoInfo.name,
          is_primary: !payForm.mtn_phone.trim(),
        })
      }
      if (accounts.length === 0) {
        throw new Error("Enter at least one MTN or Airtel number")
      }
      await apiSavePaymentAccounts(auth.sacco_id, accounts)
      setPayOk(true)
      setTimeout(() => setPayOk(false), 3000)
    } catch (err) {
      setPayErr(err.message || "Failed to save payment accounts")
    } finally {
      setPayLoading(false)
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault()
    setProductErr("")
    setProductLoading(true)
    try {
      const created = await apiCreateLoanProduct(auth.sacco_id, productForm)
      setLoanProducts((prev) => [...prev, created])
      setProductOk(true)
      setTimeout(() => setProductOk(false), 3000)
    } catch (err) {
      setProductErr(err.message || "Failed to create loan product")
    } finally {
      setProductLoading(false)
    }
  }

  async function handleRecordStaffTxn(e) {
    e.preventDefault()
    if (!staffTxnForm.memberId || !staffTxnForm.amount) return
    const amount = parseFloat(staffTxnForm.amount)
    const member = members.find((m) => m.member_id === staffTxnForm.memberId)
    if (staffTxnForm.type === "withdrawal" && member && amount > member.balance_kes) {
      alert(`Insufficient balance. Available: ${currency} ${member.balance_kes.toLocaleString()}`)
      return
    }
    try {
      const tx = await apiCreateTransaction({
        saccoId: auth.sacco_id,
        membershipId: staffTxnForm.memberId,
        transactionType: staffTxnForm.type,
        amount: String(staffTxnForm.amount),
        currency,
        description: staffTxnForm.type === "withdrawal" ? "Admin-recorded withdrawal" : "Admin-recorded deposit",
      })
      setAllTxs((prev) => [tx, ...prev])
      setStaffTxnForm((p) => ({ ...p, amount: "" }))
      const mems = await apiGetMembers(auth.sacco_id)
      setMembers(mems)
    } catch (err) { alert(err.message || "Failed to record transaction") }
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
          <p style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>{saccoInfo.name} Admin Portal</p>
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
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td style={{ padding: "15px 20px" }}>
                              <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{mem?.name}</p>
                              <p style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>{tx.member_id}</p>
                            </td>
                            <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "15px", fontWeight: 800, color: T.textHi }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                            <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "12px", color: T.textDim }}>{tx.entry_type === "MOMO" || tx.entry_type === "MPESA" ? "MTN MoMo" : "Admin"}</td>
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

        {/* PENDING APPROVALS */}
        {!loading && tab === "Pending Approvals" && (
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>Pending Member Approvals</h2>
              <p style={{ fontSize: "13px", color: T.textDim, margin: 0 }}>New members who joined your SACCO — approve them here before they can use their dashboard.</p>
            </div>
            {pendingMembers.length === 0 ? (
              <p style={{ padding: "32px", textAlign: "center", color: T.textDim }}>No pending applications.</p>
            ) : (
              <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                {pendingMembers.map((m) => (
                  <div key={m.member_id} style={{ padding: "16px 20px", border: `1px solid ${T.border}`, borderRadius: "12px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{m.name}</p>
                      <p style={{ fontSize: "12px", color: T.textDim, margin: 0 }}>{m.phone} • <StatusBadge status={m.status} /></p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleApprovePending(m.member_id)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: T.green, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Approve</button>
                      <button onClick={() => handleRejectPending(m.member_id)} style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {/* PAYMENT SETTINGS */}
        {!loading && tab === "Payment Settings" && (
          <div style={{ maxWidth: "560px" }}>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ height: "3px", background: `linear-gradient(90deg,${T.green},#059669)` }} />
              <div style={{ padding: "24px 28px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>SACCO Payment Numbers</h2>
                <p style={{ fontSize: "14px", color: T.textDim, margin: "0 0 20px" }}>
                  Member deposits go directly to these wallets. SenteChain never holds money.
                </p>
                {payIntegration && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: payIntegration.mtn_configured ? T.greenLite : T.surface, color: payIntegration.mtn_configured ? T.green : T.textDim, border: `1px solid ${T.border}` }}>MTN API {payIntegration.mtn_configured ? "connected" : "pending"}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: payIntegration.airtel_configured ? T.greenLite : T.surface, color: payIntegration.airtel_configured ? T.green : T.textDim, border: `1px solid ${T.border}` }}>Airtel API {payIntegration.airtel_configured ? "connected" : "pending"}</span>
                  </div>
                )}
                <form onSubmit={handleSavePaymentAccounts} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <Lbl text="Account / SACCO Name" />
                    <input value={payForm.account_name} onChange={(e) => setPayForm((p) => ({ ...p, account_name: e.target.value }))} placeholder="e.g. Demo SACCO Ltd" style={inp()} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <Lbl text="MTN MoMo Number (official)" />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ ...inp(), width: "auto", minWidth: "72px", textAlign: "center", fontWeight: 700, background: T.surface }}>{UGANDA.prefix}</span>
                      <input type="tel" value={payForm.mtn_phone} onChange={(e) => setPayForm((p) => ({ ...p, mtn_phone: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="700 123 456" style={{ ...inp(), flex: 1 }} onFocus={onF} onBlur={onB} />
                    </div>
                  </div>
                  <div>
                    <Lbl text="Airtel Money Number (optional)" />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ ...inp(), width: "auto", minWidth: "72px", textAlign: "center", fontWeight: 700, background: T.surface }}>{UGANDA.prefix}</span>
                      <input type="tel" value={payForm.airtel_phone} onChange={(e) => setPayForm((p) => ({ ...p, airtel_phone: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="750 123 456" style={{ ...inp(), flex: 1 }} onFocus={onF} onBlur={onB} />
                    </div>
                  </div>
                  <p style={{ fontSize: "12px", color: T.textDim, margin: 0, lineHeight: 1.5 }}>
                    After members pay via USSD (*334# / *185#) to your official number with the correct reference, their balance updates automatically.
                  </p>
                  {payErr && <div style={{ padding: "12px", borderRadius: "10px", background: T.redBg, color: T.red, fontSize: "14px" }}>{payErr}</div>}
                  {payOk && <div style={{ padding: "12px", borderRadius: "10px", background: T.greenLite, color: T.green, fontSize: "14px", fontWeight: 700 }}>Payment numbers saved</div>}
                  <button type="submit" disabled={payLoading} style={{ padding: "13px", borderRadius: "10px", border: "none", fontFamily: T.font, background: payLoading ? T.border2 : T.green, color: "#fff", fontSize: "15px", fontWeight: 800, cursor: payLoading ? "not-allowed" : "pointer" }}>
                    {payLoading ? "Saving..." : "Save Payment Numbers"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* LOAN PRODUCTS */}
        {!loading && tab === "Loan Products" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px" }}>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ height: "3px", background: `linear-gradient(90deg,${T.goldMid},${T.green})` }} />
              <div style={{ padding: "24px 28px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>Create Loan Product</h2>
                <p style={{ fontSize: "14px", color: T.textDim, margin: "0 0 20px" }}>Set interest rate and repayment method for your SACCO</p>
                <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <Lbl text="Product Name" />
                    <input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required style={inp()} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <Lbl text="Annual Interest Rate (%)" />
                    <input type="number" min="0" step="0.1" value={productForm.interest_rate_annual} onChange={(e) => setProductForm((p) => ({ ...p, interest_rate_annual: parseFloat(e.target.value) || 0 }))} required style={inp()} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <Lbl text="Interest Method" />
                    <select value={productForm.interest_method} onChange={(e) => setProductForm((p) => ({ ...p, interest_method: e.target.value }))} style={{ ...inp(), cursor: "pointer" }}>
                      <option value="flat">Flat rate</option>
                      <option value="reducing_balance">Reducing balance</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <Lbl text="Min Term (months)" />
                      <input type="number" min="1" value={productForm.min_term_months} onChange={(e) => setProductForm((p) => ({ ...p, min_term_months: parseInt(e.target.value, 10) || 1 }))} style={inp()} onFocus={onF} onBlur={onB} />
                    </div>
                    <div>
                      <Lbl text="Max Term (months)" />
                      <input type="number" min="1" value={productForm.max_term_months} onChange={(e) => setProductForm((p) => ({ ...p, max_term_months: parseInt(e.target.value, 10) || 1 }))} style={inp()} onFocus={onF} onBlur={onB} />
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: T.textMid }}>
                    <input type="checkbox" checked={productForm.is_default} onChange={(e) => setProductForm((p) => ({ ...p, is_default: e.target.checked }))} />
                    Set as default product
                  </label>
                  {productErr && <div style={{ padding: "12px", borderRadius: "10px", background: T.redBg, color: T.red, fontSize: "14px" }}>{productErr}</div>}
                  {productOk && <div style={{ padding: "12px", borderRadius: "10px", background: T.greenLite, color: T.green, fontSize: "14px", fontWeight: 700 }}>Loan product created</div>}
                  <button type="submit" disabled={productLoading} style={{ padding: "13px", borderRadius: "10px", border: "none", fontFamily: T.font, background: productLoading ? T.border2 : T.goldMid, color: "#fff", fontSize: "15px", fontWeight: 800, cursor: productLoading ? "not-allowed" : "pointer" }}>
                    {productLoading ? "Saving..." : "Create Product"}
                  </button>
                </form>
              </div>
            </div>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>Active Products</h2>
              </div>
              {loanProducts.length === 0 ? (
                <p style={{ padding: "40px", textAlign: "center", color: T.textDim, fontSize: "14px" }}>No loan products yet. Create one to let members apply.</p>
              ) : (
                <div>
                  {loanProducts.map((p, i) => (
                    <div key={p.id} style={{ padding: "18px 24px", borderBottom: i < loanProducts.length - 1 ? `1px solid ${T.border2}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div>
                          <p style={{ fontSize: "16px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>{p.name}</p>
                          <p style={{ fontSize: "13px", color: T.textDim, margin: 0 }}>{p.interest_rate_annual}% p.a. • {p.interest_method === "flat" ? "Flat" : "Reducing balance"}</p>
                          <p style={{ fontSize: "12px", color: T.textDim, margin: "4px 0 0", fontFamily: T.fontMono }}>Term: {p.min_term_months}–{p.max_term_months} months</p>
                        </div>
                        {p.is_default && <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", background: T.greenLite, color: T.green, border: `1px solid ${T.greenBdr}` }}>DEFAULT</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGISTER MEMBER */}
        {!loading && tab === "Register Member" && (
          <div style={{ maxWidth: "480px" }}>
            <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ height: "3px", background: `linear-gradient(90deg,${T.green},${T.goldMid})` }} />
              <div style={{ padding: "28px 32px" }}>
                <h2 style={{ fontSize: "19px", fontWeight: 800, color: T.textHi, margin: "0 0 4px" }}>Register Staff / Member</h2>
                <p style={{ fontSize: "14px", color: T.textDim, margin: "0 0 24px" }}>Creates an active account. Cashiers can be hired here; promote later via Members and Roles if needed.</p>
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Sarah Nambi" },
                    { label: "PIN (4 digits)", key: "pin", type: "password", placeholder: "1234" },
                  ].map(f => (
                    <div key={f.key}>
                      <Lbl text={f.label} />
                      <input type={f.type} value={regForm[f.key]} onChange={e => setRegForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} required style={inp()} onFocus={onF} onBlur={onB} />
                    </div>
                  ))}
                  <div>
                    <Lbl text="Phone (Uganda)" />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ ...inp(), width: "auto", minWidth: "72px", textAlign: "center", fontWeight: 700, background: T.surface }}>{UGANDA.prefix}</span>
                      <input type="tel" value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="700 123 456" required style={{ ...inp(), flex: 1 }} onFocus={onF} onBlur={onB} />
                    </div>
                  </div>
                  <div>
                    <Lbl text="Role" />
                    <select value={regForm.role} onChange={e => setRegForm(p => ({ ...p, role: e.target.value }))} style={{ ...inp(), cursor: "pointer" }}>
                      <option value="member">Member (active)</option>
                      <option value="cashier">Cashier (active)</option>
                    </select>
                  </div>
                  {regErr && <div style={{ padding: "12px 16px", borderRadius: "10px", background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red, fontSize: "14px" }}>{regErr}</div>}
                  {regOk && <div style={{ padding: "13px 16px", borderRadius: "10px", background: T.greenLite, border: `1px solid ${T.greenBdr}`, color: T.green, fontSize: "14px", fontWeight: 700 }}>Account created and activated. They can log in with this phone + PIN.</div>}
                  <button type="submit" disabled={regLoading} style={{ padding: "14px", borderRadius: "10px", border: "none", fontFamily: T.font, background: regLoading ? T.border2 : T.green, color: regLoading ? T.textXdim : "#fff", fontSize: "15px", fontWeight: 800, cursor: regLoading ? "not-allowed" : "pointer" }}>
                    {regLoading ? "Registering..." : "Register & Activate"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}



        {/* ALL TRANSACTIONS */}
        {!loading && tab === "All Transactions" && (
          <div>
            <form onSubmit={handleRecordStaffTxn} style={{ ...card(), padding: "16px 20px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: "0 1 120px" }}>
                <Lbl text="Type" />
                <select value={staffTxnForm.type} onChange={(e) => setStaffTxnForm((p) => ({ ...p, type: e.target.value }))} style={inp()}>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <Lbl text="Member" />
                <select value={staffTxnForm.memberId} onChange={(e) => setStaffTxnForm((p) => ({ ...p, memberId: e.target.value }))} style={inp()} required>
                  <option value="">Select member</option>
                  {members.filter((m) => m.role === "member" && m.status === "active" && (staffTxnForm.type === "deposit" || m.balance_kes > 0)).map((m) => (
                    <option key={m.member_id} value={m.member_id}>{m.name} ({currency} {m.balance_kes.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 1 140px" }}>
                <Lbl text="Amount" />
                <input type="number" min="1" placeholder="UGX" value={staffTxnForm.amount} onChange={(e) => setStaffTxnForm((p) => ({ ...p, amount: e.target.value }))} style={inp()} required />
              </div>
              <button type="submit" style={{ padding: "11px 18px", borderRadius: "9px", border: "none", background: staffTxnForm.type === "withdrawal" ? T.red : T.green, color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: T.font }}>
                {staffTxnForm.type === "withdrawal" ? "Withdraw" : "Deposit"}
              </button>
            </form>
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
                  <thead><tr>{["Date", "Member", "Type", "Amount", "Status", "Stellar Proof", "Actions"].map(TH)}</tr></thead>
                  <tbody>
                    {allTxs.map((tx, i) => {
                      const mem = members.find(m => m.member_id === tx.member_id)
                      return (
                        <tr key={tx.id} style={{ borderBottom: i < allTxs.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.surface}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                          <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td style={{ padding: "15px 20px" }}>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: T.textHi, margin: "0 0 2px" }}>{mem?.name || "—"}</p>
                            <p style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim, margin: 0 }}>{tx.member_id?.slice(0, 8)}</p>
                          </td>
                          <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                          <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "15px", fontWeight: 800, color: T.textHi }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                          <td style={{ padding: "15px 20px" }}><StatusBadge status={tx.status || "recorded"} /></td>
                          <td style={{ padding: "15px 20px" }}><StellarHashLink hash={tx.stellar_tx_hash} /></td>
                          <td style={{ padding: "15px 20px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {!tx.stellar_tx_hash && (
                              <button disabled={txActionId === tx.id} onClick={() => handleAnchorTx(tx.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: T.green, color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Anchor</button>
                            )}
                            {tx.stellar_tx_hash && (
                              <button disabled={txActionId === tx.id} onClick={() => handleVerifyTx(tx.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Verify</button>
                            )}
                          </td>
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

      </div>
    </div>
  )
}