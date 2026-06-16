// src/pages/CashierDashboard.jsx
import { useState, useEffect } from "react"
import { T, card, cardMd } from "../styles/theme"
import { useAuth } from "../context/AuthContext"
import { SACCO_INFO } from "../data/demo"
import { apiGetLoans, apiApproveLoan, apiRejectLoan, apiGetMembers, apiGetTransactions } from "../services/api"
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

const methodBadge = {
  MPESA:{ bg:T.greenLite, color:T.green,   bdr:T.greenBdr, label:"Mobile Money" },
  ADMIN:{ bg:T.goldLite,  color:T.goldMid, bdr:T.goldBdr,  label:"Admin"  },
}
const typeColor = { Deposit:T.green, Loan:T.goldMid, Repayment:"#059669" }
const TABS = ["Loan Requests","Active Loans","All Members","Transaction History"]

const TH = (h) => (
  <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:T.textDim, borderBottom:`1.5px solid ${T.border}`, background:T.surface, whiteSpace:"nowrap", fontFamily:T.fontMono }}>{h}</th>
)

const statCard = (label, value, accent, isMobile) => (
  <div style={{ ...card(), padding: isMobile ? "16px" : "20px", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:accent, borderRadius:"16px 16px 0 0" }} />
    <p style={{ fontSize:"10px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px", fontFamily:T.fontMono }}>{label}</p>
    <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: 900, color: T.textHi, margin: 0 }}>{value}</p>
  </div>
)

export default function CashierDashboard() {
  const { currency } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [tab,      setTab]      = useState("Loan Requests")
  const [loans,    setLoans]    = useState([])
  const [members,  setMembers]  = useState([])
  const [selected, setSelected] = useState(null)
  const [selTxs,   setSelTxs]   = useState([])
  const [expanded, setExpanded] = useState(null)
  const [search,   setSearch]   = useState("")
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([apiGetLoans(), apiGetMembers()])
      .then(([l,m]) => { setLoans(l); setMembers(m) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    apiGetTransactions(selected.member_id).then(setSelTxs)
  }, [selected])

  async function approveLoan(id) {
    await apiApproveLoan(id)
    setLoans(prev => prev.map(l => l.id===id ? { ...l, status:"active", disbursed_on:"2026-04-01", first_payment_due:"2026-05-01", next_payment_date:"2026-05-01", next_payment_amount:l.monthly_installment, balance_remaining:l.amount_requested+l.total_interest } : l))
  }
  async function rejectLoan(id) {
    await apiRejectLoan(id)
    setLoans(prev => prev.map(l => l.id===id ? { ...l, status:"rejected" } : l))
  }

  const pendingLoans   = loans.filter(l=>l.status==="pending")
  const activeLoans    = loans.filter(l=>l.status==="active")
  const completedLoans = loans.filter(l=>l.status==="completed")
  const rejectedLoans  = loans.filter(l=>l.status==="rejected")
  const filtered       = members.filter(m=>m.name.toLowerCase().includes(search.toLowerCase())||m.phone.includes(search)||m.member_id.toLowerCase().includes(search.toLowerCase()))
  const totalMembers   = members.filter(m=>m.role==="member").length
  const activeMembers  = members.filter(m=>m.role==="member"&&m.status==="active").length

  const btnGreen = (onClick, label) => (
    <button onClick={onClick} style={{ padding: isMobile ? "8px 12px" : "8px 18px", borderRadius:"8px", border:"none", background:T.green, color:"#fff", fontSize: isMobile ? "12px" : "13px", fontWeight:700, cursor:"pointer", fontFamily:T.font, transition:"opacity 0.18s" }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{label}</button>
  )
  const btnRed = (onClick, label) => (
    <button onClick={onClick} style={{ padding: isMobile ? "8px 12px" : "8px 18px", borderRadius:"8px", border:`1.5px solid ${T.redBdr}`, background:T.redBg, color:T.red, fontSize: isMobile ? "12px" : "13px", fontWeight:700, cursor:"pointer", fontFamily:T.font, transition:"opacity 0.18s" }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{label}</button>
  )

  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:T.font }}>
      <Nav />
      <div style={{ maxWidth:"1200px", margin:"0 auto", padding: isMobile ? "24px 16px 60px" : "48px 40px 80px" }}>

        <div style={{ marginBottom: isMobile ? "24px" : "32px" }}>
          <p style={{ fontSize:"12px", fontFamily:T.fontMono, color:T.textDim, marginBottom:"8px", letterSpacing:"1.5px", textTransform:"uppercase" }}>{SACCO_INFO.name} Cashier Portal</p>
          <h1 style={{ fontSize: isMobile ? "28px" : "36px", fontWeight:900, color:T.textHi, margin:"0 0 6px", letterSpacing:"-0.5px" }}>Cashier <span style={{color:T.green}}>Dashboard</span></h1>
          <p style={{ fontSize: isMobile ? "14px" : "15px", color:T.textMid }}>Manage loan requests, member records and transactions</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap:"14px", marginBottom:"28px" }}>
          {statCard("Total Members",  totalMembers,                                              T.green, isMobile  )}
          {statCard("Active Members", activeMembers,                                             T.green, isMobile  )}
          {statCard("Pending Loans",  pendingLoans.length,                                       T.goldMid, isMobile)}
          {statCard("Active Loans",   activeLoans.length,                                        T.gold, isMobile   )}
          <div style={{ gridColumn: isMobile ? "span 2" : "auto" }}>
            {statCard("Outstanding",    `${currency} ${(activeLoans.reduce((s,l)=>s+l.balance_remaining,0)/1000).toFixed(0)}K`, "#7c3aed", isMobile)}
          </div>
        </div>

        <div style={{ display:"flex", gap:"6px", marginBottom:"24px", flexWrap:"wrap", padding:"4px", background:"#fff", borderRadius:"12px", border:`1.5px solid ${T.border}`, boxShadow:T.shadow, width:"fit-content" }}>
          {TABS.map(t => (
            <div key={t} style={{ position:"relative" }}>
              <button onClick={()=>setTab(t)} style={{ padding:"9px 18px", borderRadius:"9px", fontFamily:T.font, border:"none", cursor:"pointer", fontSize:"13px", fontWeight:700, background:tab===t?T.green:"transparent", color:tab===t?"#fff":T.textDim, transition:"all 0.18s", boxShadow:tab===t?`0 2px 8px ${T.green}44`:"none" }}>{t}</button>
              {t==="Loan Requests" && pendingLoans.length>0 && (
                <span style={{ position:"absolute", top:"-6px", right:"-6px", background:T.goldMid, color:"#fff", borderRadius:"99px", fontSize:"10px", fontWeight:800, padding:"2px 6px", fontFamily:T.fontMono }}>{pendingLoans.length}</span>
              )}
            </div>
          ))}
        </div>

        {loading && <div style={{ ...card(), padding:"60px", textAlign:"center" }}><p style={{ fontSize:"15px", color:T.textDim, fontFamily:T.fontMono }}>Loading...</p></div>}

        {/* LOAN REQUESTS */}
        {!loading && tab==="Loan Requests" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            {pendingLoans.length===0 && rejectedLoans.length===0 && (
              <div style={{ ...card(), padding:"60px", textAlign:"center" }}><p style={{ fontSize:"16px", color:T.textMid }}>No pending loan requests</p></div>
            )}
            {pendingLoans.map(loan => (
              <div key={loan.id} style={{ ...cardMd(), overflow:"hidden" }}>
                <div style={{ height:"3px", background:`linear-gradient(90deg, ${T.green}, ${T.goldMid})` }} />
                <div style={{ padding:"24px 28px" }}>
                  <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", gap: isMobile ? "12px" : 0 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"5px", flexWrap: "wrap" }}>
                        <p style={{ fontSize:"18px", fontWeight:800, color:T.textHi, margin:0 }}>{loan.member_name}</p>
                        <span style={{ fontSize:"11px", fontFamily:T.fontMono, fontWeight:600, padding:"2px 8px", borderRadius:"6px", background:T.surface, color:T.textDim, border:`1px solid ${T.border}` }}>{loan.member_id}</span>
                        <StatusBadge status={loan.status} />
                      </div>
                      <p style={{ fontSize:"13px", color:T.textDim, margin:0 }}>Applied {loan.applied_on} {loan.phone}</p>
                    </div>
                    <div style={{ textAlign: isMobile ? "left" : "right" }}>
                      <p style={{ fontSize:"24px", fontWeight:900, color:T.goldMid, margin:0 }}>{currency} {loan.amount_requested.toLocaleString()}</p>
                      <p style={{ fontSize:"12px", color:T.textDim }}>Requested</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: "12px", marginBottom: "20px" }}>
                    {[
                      {label:"Purpose",             value:loan.purpose},
                      {label:"Term",                value:`${loan.term_months} months`},
                      {label:"Interest Rate",       value:`${loan.interest_rate}% p.a.`},
                      {label:"Monthly Installment", value:`${currency} ${loan.monthly_installment.toLocaleString()}`},
                      {label:"Total Repayable",     value:`${currency} ${loan.total_repayable.toLocaleString()}`},
                      {label:"Total Interest",      value:`${currency} ${loan.total_interest.toLocaleString()}`},
                      {label:"Savings Balance",     value:`${currency} ${loan.savings_balance.toLocaleString()}`},
                      {label:"Collateral",          value:loan.collateral},
                    ].map(f => (
                      <div key={f.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"10px", padding: isMobile ? "10px 14px" : "12px 14px", display: isMobile ? "flex" : "block", justifyContent: isMobile ? "space-between" : "initial", alignItems: isMobile ? "center" : "initial" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom: isMobile ? 0 : "5px", fontFamily:T.fontMono }}>{f.label}</p>
                        <p style={{ fontSize: isMobile ? "13px" : "14px", fontWeight:600, color:T.textHi, margin:0 }}>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "16px" : 0 }}>
                    <p style={{ fontSize:"13px", color:T.textDim }}>Guarantor: <span style={{ color:T.textMid, fontWeight:600 }}>{loan.guarantor}</span></p>
                    <div style={{ display:"flex", gap:"10px", flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
                      {btnRed(()=>rejectLoan(loan.id), "Reject")}
                      {btnGreen(()=>approveLoan(loan.id), "Approve and Disburse")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {rejectedLoans.length>0 && (
              <div style={{ ...card(), overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:"14px", fontWeight:700, color:T.textDim, margin:0 }}>Rejected Requests</p>
                </div>
                {rejectedLoans.map((loan,i) => (
                  <div key={loan.id} style={{ padding:"16px 24px", borderBottom:i<rejectedLoans.length-1?`1px solid ${T.border2}`:"none", display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "12px" : 0 }}>
                    <div>
                      <p style={{ fontSize:"15px", fontWeight:700, color:T.textMid, margin:"0 0 3px" }}>{loan.member_name}</p>
                      <p style={{ fontSize:"12px", color:T.textDim, margin:0 }}>{loan.purpose}</p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "initial" }}>
                      <p style={{ fontSize:"15px", fontWeight:700, color:T.textMid, fontFamily:T.fontMono, margin: 0 }}>{currency} {loan.amount_requested.toLocaleString()}</p>
                      <StatusBadge status="rejected" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE LOANS */}
        {!loading && tab==="Active Loans" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            {[...activeLoans, ...completedLoans].map(loan => (
              <div key={loan.id} style={{ ...cardMd(), overflow:"hidden" }}>
                <div style={{ height:"3px", background:loan.status==="completed"?`linear-gradient(90deg,#7c3aed,#a78bfa)`:`linear-gradient(90deg,${T.green},${T.goldMid})` }} />
                <div style={{ padding:"22px 28px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"5px" }}>
                      <p style={{ fontSize:"17px", fontWeight:800, color:T.textHi, margin:0 }}>{loan.member_name}</p>
                      <span style={{ fontSize:"11px", fontFamily:T.fontMono, fontWeight:600, padding:"2px 8px", borderRadius:"6px", background:T.surface, color:T.textDim, border:`1px solid ${T.border}` }}>{loan.id}</span>
                      <StatusBadge status={loan.status} />
                    </div>
                    <p style={{ fontSize:"13px", color:T.textDim, margin:0 }}>{loan.purpose} Disbursed {loan.disbursed_on}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:"24px", fontWeight:900, color:loan.status==="completed"?"#7c3aed":T.goldMid, margin:0 }}>{currency} {loan.amount_requested.toLocaleString()}</p>
                    <p style={{ fontSize:"12px", color:T.textDim }}>Original amount</p>
                  </div>
                </div>
                <div style={{ padding:"20px 28px", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap:"14px", borderBottom:`1px solid ${T.border}` }}>
                  {[
                    {label:"Monthly Payment",  value:`${currency} ${loan.monthly_installment.toLocaleString()}`,                                                                            color:T.goldMid},
                    {label:"Repaid So Far",     value:`${currency} ${loan.repaid_so_far.toLocaleString()}`,                                                                                 color:T.green  },
                    {label:"Balance Remaining", value:loan.status==="completed"?"Cleared":`${currency} ${loan.balance_remaining.toLocaleString()}`, color:loan.status==="completed"?T.green:T.red},
                  ].map(f => (
                    <div key={f.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"10px", padding:"14px 16px", display: isMobile ? "flex" : "block", justifyContent: isMobile ? "space-between" : "initial", alignItems: isMobile ? "center" : "initial" }}>
                      <p style={{ fontSize:"10px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom: isMobile ? 0 : "6px", fontFamily:T.fontMono }}>{f.label}</p>
                      <p style={{ fontSize: isMobile ? "15px" : "16px", fontWeight:700, color:f.color, margin:0 }}>{f.value}</p>
                    </div>
                  ))}
                </div>
                {loan.status==="active" && (
                  <div style={{ padding:"16px 28px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                      <p style={{ fontSize:"12px", color:T.textDim, margin:0 }}>Repayment progress {loan.payments_made}/{loan.payments_total} payments</p>
                      <p style={{ fontSize:"12px", fontWeight:700, color:T.green, margin:0 }}>{Math.round((loan.repaid_so_far/loan.total_repayable)*100)}%</p>
                    </div>
                    <div style={{ height:"8px", borderRadius:"99px", background:T.border2 }}>
                      <div style={{ height:"100%", borderRadius:"99px", background:`linear-gradient(90deg,${T.green},#34d399)`, width:`${Math.round((loan.repaid_so_far/loan.total_repayable)*100)}%` }} />
                    </div>
                  </div>
                )}
                {loan.payments_schedule.length>0 && (
                  <div>
                    <div style={{ padding:"14px 28px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", background:T.surface, borderTop:`1px solid ${T.border}` }}
                      onClick={() => setExpanded(expanded===loan.id?null:loan.id)}>
                      <p style={{ fontSize:"14px", fontWeight:700, color:T.textMid, margin:0 }}>Payment Schedule</p>
                      <span style={{ fontSize:"13px", color:T.textDim, fontFamily:T.fontMono }}>{expanded===loan.id?"Hide":"Show"}</span>
                    </div>
                    {expanded===loan.id && (
                      <div style={{ overflowX: isMobile ? "hidden" : "auto" }}>
                        {isMobile ? (
                          <div style={{ padding: "16px", display: "grid", gap: "12px", background: "#f9fafb" }}>
                            {loan.payments_schedule.map((p) => (
                              <div key={p.month} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                  <span style={{ fontSize: "12px", fontFamily: T.fontMono, color: T.textDim, fontWeight: 700 }}>{p.month}</span>
                                  <StatusBadge status={p.status} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                  <div>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Due Date</p>
                                    <p style={{ fontSize: "13px", fontFamily: T.fontMono, color: T.textMid }}>{p.due_date}</p>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Principal</p>
                                    <p style={{ fontSize: "13px", fontFamily: T.fontMono, fontWeight: 600, color: T.textHi }}>{currency} {p.principal.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border2}`, paddingTop: "12px" }}>
                                  <div>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Interest</p>
                                    <p style={{ fontSize: "13px", fontFamily: T.fontMono, color: T.goldMid }}>{currency} {p.interest.toLocaleString()}</p>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Total</p>
                                    <p style={{ fontSize: "15px", fontFamily: T.fontMono, fontWeight: 800, color: T.textHi }}>{currency} {p.total.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <table style={{ width:"100%", borderCollapse:"collapse" }}>
                            <thead><tr>{["Month","Due Date","Principal","Interest","Total","Status"].map(TH)}</tr></thead>
                            <tbody>
                              {loan.payments_schedule.map((p,i) => (
                                <tr key={p.month} style={{ borderBottom:i<loan.payments_schedule.length-1?`1px solid ${T.border2}`:"none", background:"#fff" }}
                                  onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                                  <td style={{ padding:"13px 20px", fontSize:"13px", fontFamily:T.fontMono, color:T.textDim }}>{p.month}</td>
                                  <td style={{ padding:"13px 20px", fontSize:"13px", fontFamily:T.fontMono, color:T.textMid }}>{p.due_date}</td>
                                  <td style={{ padding:"13px 20px", fontSize:"13px", fontFamily:T.fontMono, fontWeight:600, color:T.textHi }}>{currency} {p.principal.toLocaleString()}</td>
                                  <td style={{ padding:"13px 20px", fontSize:"13px", fontFamily:T.fontMono, color:T.goldMid }}>{currency} {p.interest.toLocaleString()}</td>
                                  <td style={{ padding:"13px 20px", fontSize:"14px", fontFamily:T.fontMono, fontWeight:800, color:T.textHi }}>{currency} {p.total.toLocaleString()}</td>
                                  <td style={{ padding:"13px 20px" }}><StatusBadge status={p.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {activeLoans.length===0 && completedLoans.length===0 && (
              <div style={{ ...card(), padding:"60px", textAlign:"center" }}><p style={{ fontSize:"16px", color:T.textMid }}>No active loans</p></div>
            )}
          </div>
        )}

        {/* ALL MEMBERS */}
        {!loading && tab==="All Members" && (
          <div style={{ ...cardMd(), overflow:"hidden" }}>
            <div style={{ padding:"18px 24px", borderBottom:`1.5px solid ${T.border}`, display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems: isMobile ? "stretch" : "center", gap: "16px", background:"#fff" }}>
              <h2 style={{ fontSize:"17px", fontWeight:800, color:T.textHi, margin:0 }}>All Member Records</h2>
              <input type="text" placeholder="Search name, phone, ID..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ padding:"9px 14px", borderRadius:"9px", border:`1.5px solid ${T.border}`, background:"#f9fafb", color:T.textHi, fontSize:"14px", fontFamily:T.font, outline:"none", width: isMobile ? "100%" : "240px" }}
                onFocus={e=>{e.target.style.borderColor=T.green;e.target.style.boxShadow=`0 0 0 3px ${T.greenLite}`}}
                onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none"}} />
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
                        <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Balance</p>
                        <p style={{ fontSize: "14px", fontWeight: 800, color: T.green }}>{currency} {m.balance_kes.toLocaleString()}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>Role</p>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: T.textMid }}>{m.role}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelected(m); setTab("Transaction History") }}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1.5px solid ${T.greenBdr}`, background: T.greenLite, color: T.green, fontSize: "13px", fontWeight: 700 }}>
                      View Transactions
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["ID","Name","Phone","Balance","Role","Status","Action"].map(TH)}</tr></thead>
                  <tbody>
                    {filtered.map((m,i) => (
                      <tr key={m.member_id} style={{ borderBottom:i<filtered.length-1?`1px solid ${T.border2}`:"none", background:"#fff", transition:"background 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <td style={{ padding:"15px 20px", fontFamily:T.fontMono, fontSize:"12px", fontWeight:700, color:T.textDim }}>{m.member_id}</td>
                        <td style={{ padding:"15px 20px", fontSize:"15px", fontWeight:700, color:T.textHi }}>{m.name}</td>
                        <td style={{ padding:"15px 20px", fontFamily:T.fontMono, fontSize:"13px", color:T.textDim }}>{m.phone}</td>
                        <td style={{ padding:"15px 20px", fontFamily:T.fontMono, fontSize:"14px", fontWeight:800, color:T.green }}>{m.balance_kes>0?`${currency} ${m.balance_kes.toLocaleString()}`:"None"}</td>
                        <td style={{ padding:"15px 20px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:"99px", fontSize:"11px", fontFamily:T.fontMono, fontWeight:700, textTransform:"uppercase", background:m.role==="admin"?"rgba(124,58,237,0.08)":m.role==="cashier"?T.goldLite:T.surface, color:m.role==="admin"?T.purple:m.role==="cashier"?T.goldMid:T.textMid, border:`1px solid ${m.role==="admin"?T.purpleBdr:m.role==="cashier"?T.goldBdr:T.border}` }}>{m.role}</span>
                        </td>
                        <td style={{ padding:"15px 20px" }}><StatusBadge status={m.status} /></td>
                        <td style={{ padding:"15px 20px" }}>
                          <button onClick={() => { setSelected(m); setTab("Transaction History") }}
                            style={{ padding:"7px 16px", borderRadius:"8px", border:`1.5px solid ${T.greenBdr}`, background:T.greenLite, color:T.green, fontSize:"13px", fontWeight:600, cursor:"pointer", fontFamily:T.font, transition:"all 0.18s" }}
                            onMouseEnter={e=>{e.currentTarget.style.background=T.green;e.currentTarget.style.color="#fff"}}
                            onMouseLeave={e=>{e.currentTarget.style.background=T.greenLite;e.currentTarget.style.color=T.green}}>
                            View Transactions
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

        {/* TRANSACTION HISTORY */}
        {!loading && tab==="Transaction History" && (
          <div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
              <p style={{ fontSize:"14px", fontWeight:600, color:T.textMid, margin:0 }}>Select member:</p>
              {members.filter(m=>m.role==="member").map(m => (
                <button key={m.member_id} onClick={() => setSelected(m)} style={{ padding:"8px 16px", borderRadius:"9px", fontFamily:T.font, border:`1.5px solid ${selected?.member_id===m.member_id?T.green:T.border}`, background:selected?.member_id===m.member_id?T.greenLite:"#fff", color:selected?.member_id===m.member_id?T.green:T.textMid, fontSize:"13px", fontWeight:600, cursor:"pointer", transition:"all 0.18s" }}>{m.name}</button>
              ))}
            </div>
            {selected ? (
              <div style={{ ...cardMd(), overflow:"hidden" }}>
                <div style={{ padding:"18px 24px", borderBottom:`1.5px solid ${T.border}`, background:"#fff" }}>
                  <p style={{ fontSize:"17px", fontWeight:800, color:T.textHi, margin:"0 0 3px" }}>{selected.name}</p>
                  <p style={{ fontSize:"12px", fontFamily:T.fontMono, color:T.textDim, margin:0 }}>{selected.member_id} Balance: {currency} {selected.balance_kes.toLocaleString()}</p>
                </div>
                <div style={{ overflowX: isMobile ? "hidden" : "auto" }}>
                  {isMobile ? (
                    <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                      {selTxs.map(tx => {
                        const m = methodBadge[tx.entry_type] || methodBadge.ADMIN
                        return (
                          <div key={tx.id} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                              <span style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString()}</span>
                              <StatusBadge status={tx.status} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                              <div>
                                <p style={{ fontSize: "15px", fontWeight: 800, color: typeColor[tx.type] || T.textHi, margin: "0 0 2px" }}>{tx.type}</p>
                                <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontFamily: T.fontMono, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.bdr}` }}>{m.label}</span>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: "16px", fontWeight: 900, color: T.textHi, fontFamily: T.fontMono, margin: "0 0 4px" }}>{currency} {tx.amount_kes.toLocaleString()}</p>
                                <StellarHashLink hash={tx.stellar_tx_hash} isCompact />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Date", "Type", "Amount", "Via", "Status", "Stellar Proof"].map(TH)}</tr></thead>
                      <tbody>
                        {selTxs.map((tx, i) => {
                          const m = methodBadge[tx.entry_type] || methodBadge.ADMIN
                          return (
                            <tr key={tx.id} style={{ borderBottom: i < selTxs.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff" }}
                              onMouseEnter={e => e.currentTarget.style.background = T.surface}
                              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                              <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "13px", color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                              <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                              <td style={{ padding: "15px 20px", fontFamily: T.fontMono, fontSize: "15px", fontWeight: 800, color: T.textHi }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                              <td style={{ padding: "15px 20px" }}><span style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontFamily: T.fontMono, fontWeight: 600, background: m.bg, color: m.color, border: `1px solid ${m.bdr}` }}>{m.label}</span></td>
                              <td style={{ padding: "15px 20px" }}><StatusBadge status={tx.status} /></td>
                              <td style={{ padding: "15px 20px" }}><StellarHashLink hash={tx.stellar_tx_hash} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ ...card(), padding:"60px", textAlign:"center" }}><p style={{ fontSize:"16px", color:T.textMid }}>Select a member above to view their transactions</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}