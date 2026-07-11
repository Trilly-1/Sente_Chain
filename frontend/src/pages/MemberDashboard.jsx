// src/pages/MemberDashboard.jsx
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { apiGetTransactions, apiListSaccos, apiGetMyLoans, apiApplyLoan, apiListLoanProducts, apiGetPaymentInstructions, apiRequestToPay, apiGetMemberBalance, apiRepayLoan, apiGetPlatformConfig, calcPlatformFee } from "../services/api"
import { T, card, cardMd } from "../styles/theme"
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
  MOMO:{ bg:T.greenLite, color:T.green,   bdr:T.greenBdr, label:"MTN MoMo" },
  MPESA:{ bg:T.greenLite, color:T.green, bdr:T.greenBdr, label:"MTN MoMo" },
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
  const [loans, setLoans] = useState([])
  const [products, setProducts] = useState([])
  const [loanForm, setLoanForm] = useState({ principal: "", term_months: 6, purpose: "", collateral: "", guarantor: "" })
  const [loanMsg, setLoanMsg] = useState("")
  const [loanErr, setLoanErr] = useState("")
  const [loanLoading, setLoanLoading] = useState(false)
  const [payInfo, setPayInfo] = useState(null)
  const [payAmount, setPayAmount] = useState("")
  const [payProvider, setPayProvider] = useState("mtn_momo")
  const [payPurpose, setPayPurpose] = useState("savings")
  const [platformConfig, setPlatformConfig] = useState({ fee_percent: 1.5, applies_to: ["savings"] })
  const [payMsg, setPayMsg] = useState("")
  const [payErr, setPayErr] = useState("")
  const [payLoading, setPayLoading] = useState(false)
  const [balance, setBalance] = useState(null)
  const [repayAmounts, setRepayAmounts] = useState({})
  const [repayMsg, setRepayMsg] = useState("")
  const [repayErr, setRepayErr] = useState("")
  const [repayLoading, setRepayLoading] = useState(null)

  const [mySacco, setMySacco] = useState({ name: "SACCO" })

  async function refreshBalance() {
    if (!auth?.sacco_id) return
    try {
      const b = await apiGetMemberBalance(auth.sacco_id)
      setBalance(b)
    } catch { /* keep previous */ }
  }

  async function refreshLoans() {
    if (!auth?.sacco_id) return
    try {
      const list = await apiGetMyLoans(auth.sacco_id)
      setLoans(list)
    } catch { /* keep previous */ }
  }

  useEffect(() => {
    if (!auth?.member_id) return
    apiGetTransactions(auth.member_id)
      .then(setTxs)
      .catch(err => setError(err.message || "Failed to load transactions."))
      .finally(() => setLoading(false))
  }, [auth?.member_id])

  useEffect(() => {
    if (!auth?.sacco_id) return
    apiListSaccos().then((list) => {
      const found = list.find((s) => s.id === auth.sacco_id)
      if (found) setMySacco(found)
    }).catch(() => {})
    apiGetMyLoans(auth.sacco_id).then(setLoans).catch(() => {})
    apiListLoanProducts(auth.sacco_id).then(setProducts).catch(() => {})
    apiGetPaymentInstructions(auth.sacco_id).then(setPayInfo).catch(() => setPayInfo(null))
    apiGetPlatformConfig().then(setPlatformConfig).catch(() => {})
    refreshBalance()
  }, [auth?.sacco_id])

  const feePct = payInfo?.platform_fee?.fee_percent ?? platformConfig.fee_percent ?? 1.5
  const payBreakdown = calcPlatformFee(payAmount, feePct, payPurpose)

  const totalDeposited = balance?.total_deposits ?? txs.filter(t=>t.type==="Deposit").reduce((s,t)=>s+t.amount_kes,0)
  const totalLoans     = balance?.total_loans_received ?? txs.filter(t=>t.type==="Loan").reduce((s,t)=>s+t.amount_kes,0)
  const totalRepaid    = balance?.total_repaid ?? txs.filter(t=>t.type==="Repayment").reduce((s,t)=>s+t.amount_kes,0)
  const savingsBalance = balance?.savings_balance ?? auth?.balance_kes ?? 0
  const activeLoan = loans.find((l) => l.status === "active")
  const pendingLoan = loans.find((l) => l.status === "pending")
  const defaultProduct = products.find((p) => p.is_default) || products[0]

  async function handleApplyLoan(e) {
    e.preventDefault()
    setLoanErr("")
    setLoanMsg("")
    setLoanLoading(true)
    try {
      const created = await apiApplyLoan(auth.sacco_id, {
        principal: parseFloat(loanForm.principal),
        term_months: parseInt(loanForm.term_months, 10),
        purpose: loanForm.purpose,
        collateral: loanForm.collateral,
        guarantor: loanForm.guarantor,
        loan_product_id: defaultProduct?.id,
      })
      setLoans((prev) => [created, ...prev])
      setLoanMsg("Loan application submitted. A cashier will review it.")
      setLoanForm({ principal: "", term_months: 6, purpose: "", collateral: "", guarantor: "" })
    } catch (err) {
      setLoanErr(err.message || "Failed to submit loan application")
    } finally {
      setLoanLoading(false)
    }
  }

  async function handleRepay(loanId, e) {
    e.preventDefault()
    setRepayErr("")
    setRepayMsg("")
    const amount = parseFloat(repayAmounts[loanId])
    if (!amount || amount <= 0) {
      setRepayErr("Enter a valid repayment amount")
      return
    }
    setRepayLoading(loanId)
    try {
      const updated = await apiRepayLoan(loanId, amount)
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)))
      setRepayAmounts((p) => ({ ...p, [loanId]: "" }))
      setRepayMsg(`Repayment of ${currency} ${amount.toLocaleString()} recorded.`)
      const txs = await apiGetTransactions(auth.member_id)
      setTxs(txs)
      await refreshBalance()
    } catch (err) {
      setRepayErr(err.message || "Repayment failed")
    } finally {
      setRepayLoading(null)
    }
  }

  const inp = { background: "#ffffff", border: `1.5px solid ${T.border}`, color: "#0a0a0a", borderRadius: "9px", padding: "11px 14px", width: "100%", outline: "none", fontSize: "14px", fontFamily: T.font }

  async function handlePayNow(e) {
    e.preventDefault()
    setPayErr("")
    setPayMsg("")
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) {
      setPayErr("Enter a valid amount")
      return
    }
    setPayLoading(true)
    try {
      const result = await apiRequestToPay(auth.sacco_id, amount, payProvider, payPurpose)
      setPayMsg(result.message || (result.mode === "stk" ? "Check your phone for the MoMo prompt." : "Payment initiated."))
      if (result.mode === "stk") setPayAmount("")
      // Poll for balance update after USSD/MoMo payment
      setTimeout(async () => {
        await refreshBalance()
        const txs = await apiGetTransactions(auth.member_id)
        setTxs(txs)
      }, 8000)
    } catch (err) {
      setPayErr(err.message || "Payment request failed")
    } finally {
      setPayLoading(false)
    }
  }

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
        <p style={{ fontSize:"14px", color:T.textMid, margin:0 }}>Your savings, loans, and payments</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:"16px", marginBottom:"24px" }}>
          {[
            { label:"My Balance",      value:savingsBalance, accent:T.green   },
            { label:"Total Deposited", value:totalDeposited,        accent:T.green   },
            { label:"Loans Received",  value:totalLoans,            accent:T.goldMid },
            { label:"Total Repaid",    value:totalRepaid,           accent:"#059669" },
          ].map(c => (
            <div key={c.label} style={{ ...card(), padding: isMobile ? "18px 16px" : "22px 20px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:c.accent }} />
              <p style={{ fontSize: isMobile ? "12px" : "12px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"8px" }}>{c.label}</p>
              <p style={{ fontSize: isMobile ? "22px" : "26px", fontWeight:800, color:T.textHi, fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em" }}>{currency} {c.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div style={{ ...cardMd(), overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.border}`, background: "#fff" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: T.textHi, margin: 0 }}>My Loans</h2>
            </div>
            {loans.length === 0 ? (
              <p style={{ padding: "32px", textAlign: "center", color: T.textDim, fontSize: "14px" }}>No loan applications yet</p>
            ) : (
              <div>
                {loans.slice(0, 5).map((loan, i) => (
                  <div key={loan.id} style={{ padding: "16px 24px", borderBottom: i < Math.min(loans.length, 5) - 1 ? `1px solid ${T.border2}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: T.textHi, margin: 0 }}>{loan.purpose || "Loan"}</p>
                      <StatusBadge status={loan.status} />
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: 900, color: T.goldMid, margin: "0 0 4px", fontFamily: T.fontMono }}>{currency} {loan.amount_requested.toLocaleString()}</p>
                    <p style={{ fontSize: "12px", color: T.textDim, margin: 0 }}>{loan.term_months} months @ {loan.interest_rate}% • Applied {loan.applied_on}</p>
                    {loan.status === "active" && (
                      <>
                        <p style={{ fontSize: "12px", color: T.green, margin: "6px 0 0", fontWeight: 600 }}>Balance: {currency} {loan.balance_remaining.toLocaleString()}</p>
                        <form onSubmit={(e) => handleRepay(loan.id, e)} style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                          <input
                            type="number"
                            min="1"
                            max={loan.balance_remaining}
                            placeholder={`Repay (max ${loan.balance_remaining.toLocaleString()})`}
                            value={repayAmounts[loan.id] || ""}
                            onChange={(e) => setRepayAmounts((p) => ({ ...p, [loan.id]: e.target.value }))}
                            disabled={repayLoading === loan.id}
                            style={{ ...inp, flex: "1 1 140px", padding: "9px 12px", fontSize: "13px" }}
                          />
                          <button
                            type="submit"
                            disabled={repayLoading === loan.id}
                            style={{ padding: "9px 16px", borderRadius: "9px", border: "none", fontFamily: T.font, background: repayLoading === loan.id ? T.border2 : T.green, color: "#fff", fontSize: "13px", fontWeight: 800, cursor: repayLoading === loan.id ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                          >
                            {repayLoading === loan.id ? "..." : "Repay"}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(repayErr || repayMsg) && (
              <p style={{ padding: "12px 24px", fontSize: "13px", color: repayErr ? T.red : T.green, margin: 0, fontWeight: repayErr ? 400 : 600 }}>{repayErr || repayMsg}</p>
            )}
          </div>

          <div style={{ ...cardMd(), overflow: "hidden" }}>
              <div style={{ padding: "18px 22px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: T.textHi, margin: "0 0 4px" }}>Apply for a Loan</h2>
              <p style={{ fontSize: "13px", color: T.textDim, margin: "0 0 16px" }}>
                {defaultProduct
                  ? `${defaultProduct.name}: ${defaultProduct.interest_rate_annual}% p.a. (${defaultProduct.interest_method === "flat" ? "flat" : "reducing balance"})`
                  : "Ask your SACCO admin to configure a loan product first"}
              </p>
              {pendingLoan ? (
                <p style={{ fontSize: "14px", color: T.goldMid, fontWeight: 600 }}>You already have a pending application.</p>
              ) : (
                <form onSubmit={handleApplyLoan} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input type="number" min="1" placeholder="Amount (UGX)" value={loanForm.principal} onChange={(e) => setLoanForm((p) => ({ ...p, principal: e.target.value }))} required disabled={!defaultProduct || loanLoading} style={inp} />
                  <input type="number" min={defaultProduct?.min_term_months || 1} max={defaultProduct?.max_term_months || 36} placeholder="Term (months)" value={loanForm.term_months} onChange={(e) => setLoanForm((p) => ({ ...p, term_months: e.target.value }))} required disabled={!defaultProduct || loanLoading} style={inp} />
                  <input type="text" placeholder="Purpose" value={loanForm.purpose} onChange={(e) => setLoanForm((p) => ({ ...p, purpose: e.target.value }))} required disabled={!defaultProduct || loanLoading} style={inp} />
                  <input type="text" placeholder="Collateral (optional)" value={loanForm.collateral} onChange={(e) => setLoanForm((p) => ({ ...p, collateral: e.target.value }))} disabled={!defaultProduct || loanLoading} style={inp} />
                  <input type="text" placeholder="Guarantor (optional)" value={loanForm.guarantor} onChange={(e) => setLoanForm((p) => ({ ...p, guarantor: e.target.value }))} disabled={!defaultProduct || loanLoading} style={inp} />
                  {loanErr && <p style={{ fontSize: "13px", color: T.red, margin: 0 }}>{loanErr}</p>}
                  {loanMsg && <p style={{ fontSize: "13px", color: T.green, margin: 0, fontWeight: 600 }}>{loanMsg}</p>}
                  <button type="submit" disabled={!defaultProduct || loanLoading} style={{ padding: "12px", borderRadius: "10px", border: "none", fontFamily: T.font, background: !defaultProduct || loanLoading ? T.border2 : T.goldMid, color: "#fff", fontSize: "14px", fontWeight: 800, cursor: !defaultProduct || loanLoading ? "not-allowed" : "pointer" }}>
                    {loanLoading ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              )}
              {activeLoan && (
                <p style={{ fontSize: "12px", color: T.textDim, marginTop: "12px" }}>Next payment: {activeLoan.next_payment_date || "—"} {activeLoan.next_payment_amount ? `• ${currency} ${activeLoan.next_payment_amount.toLocaleString()}` : ""}</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...cardMd(), marginBottom:"24px", overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}` }}>
            <h2 style={{ fontSize:"15px", fontWeight:600, color:T.textHi, margin:0 }}>Make a Payment</h2>
          </div>
          <div style={{ padding:"20px 22px" }}>
          {payInfo ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              <form onSubmit={handlePayNow} style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 160px auto", gap:"10px", alignItems:"end" }}>
                <div>
                  <p style={{ fontSize:"11px", fontWeight:600, color:T.textDim, margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Purpose</p>
                  <select value={payPurpose} onChange={(e) => setPayPurpose(e.target.value)} disabled={payLoading} style={{ ...inp, cursor:"pointer" }}>
                    <option value="savings">Savings deposit</option>
                    <option value="loan_repayment">Loan repayment</option>
                    <option value="interest">Interest payment</option>
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:"11px", fontWeight:600, color:T.textDim, margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Amount (UGX)</p>
                  <input type="number" min="1" placeholder="e.g. 50000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required disabled={payLoading} style={inp} />
                </div>
                <div>
                  <p style={{ fontSize:"11px", fontWeight:600, color:T.textDim, margin:"0 0 6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Provider</p>
                  <select value={payProvider} onChange={(e) => setPayProvider(e.target.value)} disabled={payLoading} style={{ ...inp, cursor:"pointer" }}>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                </div>
                <button type="submit" disabled={payLoading || !payAmount} style={{ padding:"11px 20px", borderRadius:"8px", border:"none", fontFamily:T.font, background: payLoading ? T.border2 : T.green, color:"#fff", fontSize:"14px", fontWeight:600, cursor: payLoading ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}>
                  {payLoading ? "Sending..." : "Pay Now"}
                </button>
              </form>
              {payAmount && payBreakdown.fee > 0 && payPurpose === "savings" && (
                <div style={{ padding:"12px 14px", background:T.surface, borderRadius:"8px", border:`1px solid ${T.border}`, fontSize:"13px", color:T.textMid }}>
                  You pay <strong>{currency} {payBreakdown.gross.toLocaleString()}</strong> · Fee {payBreakdown.percent}%: {currency} {payBreakdown.fee.toLocaleString()} · <strong>Net savings: {currency} {payBreakdown.net.toLocaleString()}</strong>
                </div>
              )}
              {payErr && <p style={{ fontSize:"13px", color:T.red, margin:0 }}>{payErr}</p>}
              {payMsg && <p style={{ fontSize:"13px", color:T.green, margin:0, fontWeight:600 }}>{payMsg}</p>}
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"10px" }}>
                <div style={{ padding:"12px 14px", background:T.surface, borderRadius:"8px", border:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:"11px", color:T.textDim, margin:"0 0 4px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Your reference</p>
                  <p style={{ fontSize:"14px", fontWeight:600, color:T.textHi, margin:0, fontFamily:T.fontMono }}>{payInfo.member_reference}</p>
                </div>
                {payInfo.accounts?.filter((a) => a.is_primary).map((a) => (
                  <div key={a.provider} style={{ padding:"12px 14px", background:T.surface, borderRadius:"8px", border:`1px solid ${T.border}` }}>
                    <p style={{ fontSize:"11px", color:T.textDim, margin:"0 0 4px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{a.label}</p>
                    <p style={{ fontSize:"14px", fontWeight:600, color:T.green, margin:0, fontFamily:T.fontMono }}>{a.phone_number}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize:"14px", color:T.textMid, margin:0 }}>Payment numbers are not set up yet. Contact your SACCO admin.</p>
          )}
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
                            <td style={{ padding: "15px 20px", fontSize: "13px", fontFamily: T.fontMono, color: T.textDim }}>{new Date(tx.recorded_at).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</td>
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
        </div>

      </div>
    </div>
  )
}