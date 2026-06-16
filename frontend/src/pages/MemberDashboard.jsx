// src/pages/MemberDashboard.jsx
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { ALL_SACCOS } from "../data/demo"
import { T, card, cardMd } from "../styles/theme"
import { apiGetTransactions } from "../services/api"
import Nav from "../components/Nav"
import StellarHashLink from "../components/StellarHashLink"
import StatusBadge from "../components/StatusBadge"

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

const TH = (h) => (
  <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:T.textDim, borderBottom:`1.5px solid ${T.border}`, background:T.surface, whiteSpace:"nowrap", fontFamily:T.fontMono }}>{h}</th>
)

export default function MemberDashboard() {
  const { auth, currency } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [txs,     setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    if (!auth?.member_id) return
    apiGetTransactions(auth.member_id)
      .then(setTxs)
      .catch(err => setError(err.message || "Failed to load transactions."))
      .finally(() => setLoading(false))
  }, [auth?.member_id])

  const totalDeposited = txs.filter(t=>t.type==="Deposit").reduce((s,t)=>s+t.amount_kes,0)
  const totalLoans     = txs.filter(t=>t.type==="Loan").reduce((s,t)=>s+t.amount_kes,0)
  const totalRepaid    = txs.filter(t=>t.type==="Repayment").reduce((s,t)=>s+t.amount_kes,0)

  const mySacco = ALL_SACCOS.find(s => s.id === auth?.sacco_id) || ALL_SACCOS[0]

  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:T.font }}>
      <Nav />
      <div style={{ maxWidth:"1160px", margin:"0 auto", padding: isMobile ? "24px 16px 60px" : "48px 40px 80px" }}>

        <div style={{ marginBottom: isMobile ? "24px" : "36px" }}>
          <p style={{ fontSize:"12px", fontFamily:T.fontMono, color:T.textDim, marginBottom:"8px", letterSpacing:"1.5px", textTransform:"uppercase" }}>
            {mySacco.name} • ID: {auth?.member_id}
          </p>
          <h1 style={{ fontSize: isMobile ? "28px" : "36px", fontWeight:900, color:T.textHi, margin:"0 0 8px", letterSpacing:"-0.5px" }}>
            Welcome back, <span style={{color:T.green}}>{auth?.name?.split(" ")[0]}</span>
          </h1>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color:T.textMid }}>Your personal financial record, blockchain verified on Stellar</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:"16px", marginBottom:"24px" }}>
          {[
            { label:"My Balance",      value:auth?.balance_kes||0, accent:T.green   },
            { label:"Total Deposited", value:totalDeposited,        accent:T.green   },
            { label:"Loans Received",  value:totalLoans,            accent:T.goldMid },
            { label:"Total Repaid",    value:totalRepaid,           accent:"#059669" },
          ].map(c => (
            <div key={c.label} style={{ ...card(), padding: isMobile ? "16px" : "24px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:c.accent, borderRadius:"18px 18px 0 0" }} />
              <p style={{ fontSize:"10px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px", fontFamily:T.fontMono }}>{c.label}</p>
              <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight:900, color:T.textHi, fontVariantNumeric:"tabular-nums" }}>{currency} {c.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div style={{ ...card(), padding:"20px 24px", marginBottom:"16px", display:"flex", gap:"16px", alignItems:"flex-start", borderLeft:`4px solid ${T.green}` }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:T.greenLite, border:`1px solid ${T.greenBdr}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke={T.green} strokeWidth="2"/>
              <path d="M5 8l2 2 4-4" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize:"15px", fontWeight:700, color:T.textHi, marginBottom:"4px" }}>Blockchain verified transactions</p>
            <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.6 }}>Every deposit is automatically sealed on Stellar the moment your mobile money payment is received. Click any hash below to verify independently, no trust required.</p>
          </div>
        </div>

        <div style={{ ...card(), padding:"18px 24px", marginBottom:"24px", display:"flex", gap:"32px", alignItems:"center", flexWrap:"wrap" }}>
          <p style={{ fontSize:"11px", color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", fontWeight:700, fontFamily:T.fontMono, margin:0 }}>How to deposit</p>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ padding:"6px 14px", borderRadius:"8px", background:T.greenLite, border:`1px solid ${T.greenBdr}` }}>
              <span style={{ fontSize:"14px", fontWeight:800, color:T.green, fontFamily:T.fontMono }}>Dial *334#</span>
            </div>
            <span style={{ fontSize:"14px", fontWeight:600, color:T.textMid }}>Mobile Money</span>
          </div>
        </div>

        <div style={{ ...cardMd(), overflow:"hidden" }}>
          <div style={{ padding:"20px 24px", borderBottom:`1.5px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff" }}>
            <h2 style={{ fontSize:"18px", fontWeight:800, color:T.textHi, margin:0 }}>My Transactions</h2>
            <span style={{ fontSize:"12px", fontFamily:T.fontMono, fontWeight:600, padding:"4px 12px", borderRadius:"99px", background:T.greenLite, color:T.green, border:`1px solid ${T.greenBdr}` }}>{txs.length} records</span>
          </div>
          {loading && <div style={{ padding:"48px", textAlign:"center" }}><p style={{ fontSize:"15px", color:T.textDim, fontFamily:T.fontMono }}>Loading transactions...</p></div>}
          {error   && <div style={{ padding:"24px", background:T.redBg }}><p style={{ fontSize:"14px", color:T.red, margin:0 }}>{error}</p></div>}
          {!loading && !error && (
            <div>
              {isMobile ? (
                <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
                  {txs.map(tx => (
                    <div key={tx.id} style={{ padding: "16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString()}</span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <p style={{ fontSize: "15px", fontWeight: 800, color: typeColor[tx.type] || T.textHi, margin: "0 0 2px" }}>{tx.type}</p>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontFamily: T.fontMono, fontWeight: 700, background: (methodBadge[tx.entry_type] || methodBadge.ADMIN).bg, color: (methodBadge[tx.entry_type] || methodBadge.ADMIN).color }}>{(methodBadge[tx.entry_type] || methodBadge.ADMIN).label}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "16px", fontWeight: 900, color: T.textHi, fontFamily: T.fontMono, margin: "0 0 4px" }}>{currency} {tx.amount_kes.toLocaleString()}</p>
                          <StellarHashLink hash={tx.stellar_tx_hash} isCompact />
                        </div>
                      </div>
                    </div>
                  ))}
                  {txs.length === 0 && <p style={{ padding: "40px", textAlign: "center", color: T.textDim, fontSize: "14px" }}>No transactions yet</p>}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Date", "Type", "Amount", "Via", "Status", "Stellar Proof"].map(TH)}</tr></thead>
                    <tbody>
                      {txs.map((tx, i) => {
                        const m = methodBadge[tx.entry_type] || methodBadge.ADMIN
                        return (
                          <tr key={tx.id} style={{ borderBottom: i < txs.length - 1 ? `1px solid ${T.border2}` : "none", background: "#fff", transition: "background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = T.surface}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <td style={{ padding: "15px 20px", fontSize: "13px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 700, color: typeColor[tx.type] || T.textHi }}>{tx.type}</td>
                            <td style={{ padding: "15px 20px", fontSize: "15px", fontWeight: 800, color: T.textHi, fontFamily: T.fontMono }}>{currency} {tx.amount_kes.toLocaleString()}</td>
                            <td style={{ padding: "15px 20px" }}><span style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontFamily: T.fontMono, fontWeight: 600, background: m.bg, color: m.color, border: `1px solid ${m.bdr}` }}>{m.label}</span></td>
                            <td style={{ padding: "15px 20px" }}><StatusBadge status={tx.status} /></td>
                            <td style={{ padding: "15px 20px" }}><StellarHashLink hash={tx.stellar_tx_hash} /></td>
                          </tr>
                        )
                      })}
                      {txs.length === 0 && <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: T.textDim, fontSize: "15px" }}>No transactions yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <div style={{ padding:"12px 24px", borderTop:`1px solid ${T.border2}`, background:T.surface }}>
            <p style={{ fontSize:"12px", fontFamily:T.fontMono, color:T.textXdim, margin:0 }}>
              All deposits confirmed automatically via Mobile Money. Every hash independently verifiable on Stellar.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}