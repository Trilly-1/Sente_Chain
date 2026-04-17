import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import StellarHashLink from "../components/StellarHashLink"
import { apiGetSaccoSummary, apiGetMembers, apiGetTransactions } from "../services/api"
import { T, card, cardMd } from "../styles/theme"
import { useAuth } from "../context/AuthContext"

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

export default function SACCOPublicView() {
  const { auth }    = useAuth()
  const navigate    = useNavigate()
  const { saccoId } = useParams()
  const { width }   = useWindowSize()
  const isMobile    = width < 900
  const [summary,   setSummary]   = useState(null)
  const [recentTxs, setRecentTxs] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sum, mems] = await Promise.all([apiGetSaccoSummary(saccoId), apiGetMembers()])
        setSummary(sum)
        const txArrays = await Promise.all(mems.filter(m=>m.role==="member").map(m=>apiGetTransactions(m.member_id)))
        setRecentTxs(txArrays.flat().sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at)))
      } catch(err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [saccoId])

  const typeColor = { Deposit:T.green, Loan:T.goldMid, Repayment:"#059669" }

  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:T.font }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <nav style={{ background:"#ffffff", borderBottom:`1px solid ${T.border}`, boxShadow:"0 1px 12px rgba(0,0,0,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between", padding: isMobile ? "0 16px" : "0 60px", height:"72px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }} onClick={()=>navigate("/")}>
          <img src="/image10.png" alt="Logo" style={{ height: isMobile ? "36px" : "48px", objectFit:"contain" }} />
          {!isMobile && (
            <span style={{ fontSize:"20px", fontWeight:900, letterSpacing:"2px", fontFamily:T.font }}>
              <span style={{color:T.textHi}}>SENTE</span><span style={{color:T.goldMid}}>CHAIN</span>
            </span>
          )}
          {isMobile ? null : <span style={{ fontSize:"11px", fontFamily:T.fontMono, fontWeight:700, padding:"4px 12px", borderRadius:"99px", letterSpacing:"1px", background:T.greenLite, color:T.green, border:`1px solid ${T.greenBdr}`, textTransform:"uppercase" }}>Public Ledger</span>}
        </div>
        {auth ? (
          <button onClick={()=>navigate("/dashboard")} style={{ padding: isMobile ? "7px 16px" : "9px 22px", borderRadius:"9px", border:"none", fontFamily:T.font, background:T.green, color:"#fff", fontSize: isMobile ? "12px" : "14px", fontWeight:700, cursor:"pointer", boxShadow:`0 2px 12px ${T.green}44`, transition:"all 0.18s" }}
            onMouseEnter={e=>e.currentTarget.style.background=T.greenDark}
            onMouseLeave={e=>e.currentTarget.style.background=T.green}>
            Dashboard
          </button>
        ) : (
          <button onClick={()=>navigate("/auth")} style={{ padding: isMobile ? "7px 16px" : "9px 22px", borderRadius:"9px", border:"none", fontFamily:T.font, background:T.green, color:"#fff", fontSize: isMobile ? "12px" : "14px", fontWeight:700, cursor:"pointer", boxShadow:`0 2px 12px ${T.green}44`, transition:"all 0.18s" }}
            onMouseEnter={e=>e.currentTarget.style.background=T.greenDark}
            onMouseLeave={e=>e.currentTarget.style.background=T.green}>
            Sign In
          </button>
        )}
      </nav>

      <div style={{ maxWidth:"1040px", margin:"0 auto", padding: isMobile ? "30px 16px 60px" : "60px 40px 80px" }}>
        {loading && <div style={{ ...card(), padding:"60px", textAlign:"center" }}><p style={{ fontSize:"15px", color:T.textDim, fontFamily:T.fontMono }}>Loading...</p></div>}

        {!loading && summary && (
          <>
            <div style={{ textAlign:"center", marginBottom: isMobile ? "32px" : "48px" }}>
              <div style={{ display:"inline-flex", alignItems: isMobile ? "flex-start" : "center", gap:"8px", padding:"6px 16px", borderRadius:"99px", background:T.greenLite, border:`1.5px solid ${T.greenBdr}`, marginBottom:"18px" }}>
                {!isMobile && <span style={{ width:"7px", height:"7px", borderRadius:"50%", background:T.green, display:"inline-block", animation:"pulse 2s infinite", boxShadow:`0 0 6px ${T.green}` }} />}
                <span style={{ fontSize:"11px", fontFamily:T.fontMono, color:T.green, fontWeight:700, letterSpacing:"0.5px" }}>{isMobile ? "Public View • Verifiable" : "Public view. No login required. Blockchain verified."}</span>
              </div>
              <h1 style={{ fontSize: isMobile ? "30px" : "40px", fontWeight:900, color:T.textHi, margin:"0 0 10px", letterSpacing:"-0.5px" }}>{summary.name}</h1>
              <p style={{ fontSize:"14px", fontFamily:T.fontMono, color:T.textDim, marginBottom:"5px" }}>Registration: {summary.registration}</p>
              <p style={{ fontSize:"13px", fontFamily:T.fontMono, color:T.textXdim }}>Last updated: {summary.last_updated}</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:"16px", marginBottom:"32px" }}>
              {[
                {label:"Total Deposits",   value:`KES ${summary.total_deposits.toLocaleString()}`,   accent:T.green  },
                {label:"Total Loans",      value:`KES ${summary.total_loans.toLocaleString()}`,      accent:T.goldMid},
                {label:"Total Repayments", value:`KES ${summary.total_repayments.toLocaleString()}`, accent:"#059669"},
                {label:"Active Members",   value:summary.active_members,                              accent:"#7c3aed"},
              ].map(c => (
                <div key={c.label} style={{ ...cardMd(), padding: isMobile ? "16px" : "24px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:c.accent, borderRadius:"18px 18px 0 0" }} />
                  <p style={{ fontSize:"10px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px", fontFamily:T.fontMono }}>{c.label}</p>
                  <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight:900, color:T.textHi, margin:0 }}>{c.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"20px", marginBottom:"24px" }}>
              <div style={{ ...cardMd(), overflow:"hidden" }}>
                <div style={{ height:"3px", background:`linear-gradient(90deg,${T.green},${T.goldMid})` }} />
                <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}` }}>
                  <h3 style={{ fontSize:"17px", fontWeight:800, color:T.textHi, margin:0 }}>Stellar Verification</h3>
                </div>
                <div style={{ padding: isMobile ? "20px 16px" : "20px 24px" }}>
                  <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.65, marginBottom:"18px" }}>Every transaction is permanently sealed on the Stellar blockchain. Click any hash to verify directly, no trust required.</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    {[
                      {label:"Latest deposit",   sub:"M-Pesa auto-confirmed",  hash:recentTxs.find(t=>t.type==="Deposit")?.stellar_tx_hash  },
                      {label:"Latest loan",      sub:"Admin recorded",          hash:recentTxs.find(t=>t.type==="Loan")?.stellar_tx_hash     },
                      {label:"Latest repayment", sub:"M-Pesa auto-confirmed",  hash:recentTxs.find(t=>t.type==="Repayment")?.stellar_tx_hash },
                    ].map(item => (
                      <div key={item.label} style={{ ...card(), padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <p style={{ fontSize:"14px", fontWeight:700, color:T.textHi, margin:"0 0 2px" }}>{item.label}</p>
                          <p style={{ fontSize:"11px", fontFamily:T.fontMono, color:T.textDim, margin:0 }}>{item.sub}</p>
                        </div>
                        <StellarHashLink hash={item.hash} isCompact={isMobile} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ ...cardMd(), overflow:"hidden" }}>
                <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`, background:"#fff" }}>
                  <h3 style={{ fontSize:"17px", fontWeight:800, color:T.textHi, margin:0 }}>Recent Activity</h3>
                </div>
                <div>
                  {recentTxs.slice(0,6).map((tx,i,arr) => (
                    <div key={tx.id}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: isMobile ? "14px 16px" : "14px 24px", background:"#fff", transition:"background 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <div>
                          <p style={{ fontSize:"14px", fontWeight:700, color:T.textHi, margin:"0 0 2px" }}>{tx.type}</p>
                          <p style={{ fontSize:"12px", fontFamily:T.fontMono, color:T.textDim, margin:0 }}>{tx.entry_type==="MPESA"?"M-Pesa":"Admin"}</p>
                        </div>
                        <span style={{ fontFamily:T.fontMono, fontSize:"14px", fontWeight:800, color:typeColor[tx.type]||T.textHi }}>KES {tx.amount_kes.toLocaleString()}</span>
                      </div>
                      {i<arr.slice(0,6).length-1 && <div style={{ height:1, background:T.border2, margin: isMobile ? "0 16px" : "0 24px" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ ...card(), padding:"18px 24px", textAlign:"center" }}>
              <p style={{ fontSize:"13px", fontFamily:T.fontMono, color:T.textDim, margin:"0 0 8px" }}>Aggregate figures only. No member personal data displayed. All transactions cross-verified on Stellar.</p>
              {auth ? (
                <span onClick={()=>navigate("/dashboard")} style={{ fontSize:"14px", color:T.green, fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>Go to your dashboard to view your account</span>
              ) : (
                <span onClick={()=>navigate("/auth")} style={{ fontSize:"14px", color:T.green, fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>Sign in to view your personal account</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}