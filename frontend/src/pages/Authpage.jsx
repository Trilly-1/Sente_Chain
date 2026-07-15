// src/pages/AuthPage.jsx
// One page: Sign Up | Login | Get In Touch
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { apiLogin, apiRegister, apiListSaccos, apiContact, apiForgotPIN, apiResendVerification, SKIP_KYC } from "../services/api"
import { getPostLoginPath } from "../utils/roleRouting"
import { UGANDA } from "../data/countries"
import PhoneInput, { toFullPhone } from "../components/PhoneInput"

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
  green: "#15803d", greenMid: "#16a34a", greenLite: "#dcfce7", greenBdr: "#bbf7d0", greenDark: "#14532d",
  goldMid: "#d97706", goldLite: "#fef3c7", goldBdr: "#fde68a",
  red: "#dc2626", redBg: "#fef2f2", redBdr: "#fecaca",
  textHi: "#0a0a0a", textMid: "#374151", textDim: "#6b7280", textXdim: "#9ca3af",
  border: "#e5e7eb", surface: "#f8faf8",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', 'Roboto Mono', ui-monospace, monospace",
}
const inp = (e = {}) => ({ background: "#ffffff", border: `1.5px solid ${C.border}`, color: "#0a0a0a", borderRadius: "10px", padding: "13px 16px", width: "100%", outline: "none", fontSize: "15px", fontFamily: C.font, fontWeight: 500, transition: "border-color 0.18s, box-shadow 0.18s", ...e })
const onFG = (e) => { e.target.style.borderColor = C.green; e.target.style.boxShadow = `0 0 0 3px ${C.greenLite}` }
const onBG = (e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none" }
const Lbl = ({ text }) => <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textDim, marginBottom: "7px", letterSpacing: "0.8px", textTransform: "uppercase" }}>{text}</label>
const greenBtn = { padding: "14px", borderRadius: "10px", border: "none", fontFamily: C.font, background: C.green, color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer", width: "100%", transition: "all 0.18s" }
const disBtn = { ...greenBtn, background: C.border, color: C.textXdim, cursor: "not-allowed" }

function AuthNav() {
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      height: "70px",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center",
      padding: isMobile ? "0 16px" : "0 64px",
      boxShadow: "0 1px 16px rgba(0,0,0,0.06)",
    }}>

      {/* Logo (LEFT) */}
      <div
        style={{
          marginRight: "auto",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => navigate("/")}
      >
        <img
          src="/image10.png"
          alt="SenteChain"
          style={{
            height: isMobile ? "32px" : "56px",
            objectFit: "contain",
            display: "block",
          }}
        />

        <span
          style={{
            fontSize: isMobile ? "15px" : "26px",
            fontWeight: 900,
            letterSpacing: isMobile ? "0px" : "2px",
            fontFamily: C.font,
            display: "flex",
            alignItems: "center",
            marginLeft: "6px",
            whiteSpace: "nowrap"
          }}
        >
          <span style={{ color: "black" }}>SENTE</span>
          <span style={{ color: C.goldMid }}>CHAIN</span>
        </span>
      </div>

      {/* HOME BUTTON (RIGHT) */}
      <button
        onClick={() => navigate("/")}
        style={{
          padding: isMobile ? "7px 12px" : "10px 18px",
          fontSize: isMobile ? "12px" : "15px",
          borderRadius: "10px",
          border: "none",
          background: C.green,
          color: "#fff",
          fontWeight: 800,
          fontFamily: C.font,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap"
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = C.greenDark)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = C.green)
        }
      >
        Home
      </button>

    </nav>
  )
}

function SignUpPanel({ onSwitch }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const preselectedSaccoId = location.state?.from?.split("/").pop()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNo, setPhoneNo] = useState("")
  const [saccos, setSaccos] = useState([])
  const [saccoId, setSaccoId] = useState(preselectedSaccoId || "")

  useEffect(() => {
    apiListSaccos(UGANDA.code)
      .then((list) => {
        setSaccos(list)
        if (preselectedSaccoId && list.some((s) => s.id === preselectedSaccoId)) {
          setSaccoId(preselectedSaccoId)
        } else if (list[0]) {
          setSaccoId(list[0].id)
        }
      })
      .catch(() => setSaccos([]))
  }, [preselectedSaccoId])

  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [ok, setOk] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true)
    const fullPhone = toFullPhone(phoneNo)
    try {
      const result = await apiRegister({ name, email, phone: fullPhone, role: "member", saccoId, pin, country: UGANDA.code })
      if (result.requires_email_verification) {
        setPendingEmail(result.email || email)
        setOk(true)
        return
      }
      login(result)
      if (!SKIP_KYC && result.status === "pending_kyc") {
        navigate("/member-onboarding")
      } else {
        navigate("/dashboard")
      }
    } catch (err) { setError(err.message || "Registration failed.") }
    finally { setLoading(false) }
  }

  if (ok) {
    return (
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
        <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.greenMid})` }} />
        <div style={{ padding: "36px 40px 32px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: C.textHi, margin: "0 0 10px", fontFamily: C.font }}>Check your email</h2>
          <p style={{ fontSize: "14px", color: C.textMid, margin: "0 0 18px", lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{pendingEmail}</strong>. Open it to activate your account, then sign in with your phone and PIN.
          </p>
          <button type="button" onClick={onSwitch} style={greenBtn}>Go to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.greenMid})` }} />
      <div style={{ padding: "36px 40px 32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: C.textHi, margin: "0 0 6px", fontFamily: C.font }}>Join a SACCO</h2>
        <p style={{ fontSize: "14px", color: C.textDim, margin: "0 0 22px", fontFamily: C.font, lineHeight: 1.5 }}>Create a member account. Your SACCO administrator approves you before you can use the dashboard.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <Lbl text="SACCO to Join" />
            <select
              value={saccoId}
              onChange={e => setSaccoId(e.target.value)}
              style={inp({ cursor: "pointer" })}
              onFocus={onFG} onBlur={onBG}
            >
              {saccos.length > 0 ? (
                saccos.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                <option disabled>No SACCOs available in Uganda yet</option>
              )}
            </select>
            <p style={{ fontSize: "12px", color: C.green, marginTop: "6px", fontWeight: 600 }}>
              {location.state?.from?.includes("/sacco/") ? "✓ Joining from public ledger" : "Uganda SACCOs only"}
            </p>
          </div>
          <div><Lbl text="Full Name" /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Nambi" required style={inp()} onFocus={onFG} onBlur={onBG} /></div>
          <div><Lbl text="Email" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inp()} onFocus={onFG} onBlur={onBG} /></div>
          <div>
            <Lbl text="Phone Number" />
            <PhoneInput value={phoneNo} onChange={setPhoneNo} required onFocus={onFG} onBlur={onBG} />
          </div>
          <div>
            <Lbl text="Create PIN" />
            <div style={{ position: "relative" }}>
              <input type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" maxLength={4} required style={inp({ paddingRight: "60px", letterSpacing: "7px", fontSize: "20px" })} onFocus={onFG} onBlur={onBG} />
              <button type="button" onClick={() => setShowPin(v => !v)} tabIndex={-1} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: C.green, fontFamily: C.font, fontWeight: 700, letterSpacing: "1px" }}>
                {showPin ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
          {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, fontSize: "14px" }}>{error}</div>}
          {ok && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.greenLite, border: `1px solid ${C.greenBdr}`, color: C.green, fontSize: "14px", fontWeight: 700 }}>Account requested. Your SACCO administrator will activate your access.</div>}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.greenDark }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.green }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <p style={{ textAlign: "center", fontSize: "13px", color: C.textDim, margin: 0, fontFamily: C.font }}>
            Already have an account?{" "}<span onClick={onSwitch} style={{ color: C.green, cursor: "pointer", fontWeight: 700 }}>Sign in</span>
          </p>
        </form>
      </div>
    </div>
  )
}

function LoginPanel({ onSwitch, onForgot }) {
  const [phoneNo, setPhoneNo] = useState("")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [resendEmail, setResendEmail] = useState("")
  const [resendMsg, setResendMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setResendMsg(""); setLoading(true)
    try {
      const user = await apiLogin({ phone: toFullPhone(phoneNo), pin })
      login(user)
      navigate(getPostLoginPath(user), { replace: true })
    } catch (err) {
      const message = err.message || "Invalid phone or PIN."
      setError(message)
      if (message.toLowerCase().includes("verify your email")) {
        setResendEmail("")
      }
    }
    finally { setLoading(false) }
  }

  async function handleResend() {
    if (!resendEmail) return
    setResendMsg("")
    try {
      const res = await apiResendVerification(resendEmail)
      setResendMsg(res.message || "Verification email sent.")
    } catch (err) {
      setResendMsg(err.message || "Could not resend verification email.")
    }
  }

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.goldMid})` }} />
      <div style={{ padding: "32px 28px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: C.textHi, margin: "0 0 6px", fontFamily: C.font }}>Sign in</h2>
        <p style={{ fontSize: "14px", color: C.textMid, margin: "0 0 24px", fontFamily: C.font, lineHeight: 1.5 }}>Phone and PIN — you are routed to the right dashboard automatically.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <Lbl text="Phone Number" />
            <PhoneInput value={phoneNo} onChange={setPhoneNo} required placeholder="700 000 001" onFocus={onFG} onBlur={onBG} />
          </div>
          <div>
            <Lbl text="PIN" />
            <div style={{ position: "relative" }}>
              <input type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" maxLength={4} required style={inp({ paddingRight: "60px", letterSpacing: "7px", fontSize: "20px" })} onFocus={onFG} onBlur={onBG} />
              <button type="button" onClick={() => setShowPin(v => !v)} tabIndex={-1} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: C.green, fontFamily: C.font, fontWeight: 700, letterSpacing: "1px" }}>
                {showPin ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
          {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, fontSize: "14px" }}>{error}</div>}
          {error.toLowerCase().includes("verify your email") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="Your registration email" style={inp()} onFocus={onFG} onBlur={onBG} />
              <button type="button" onClick={handleResend} style={{ ...greenBtn, background: C.goldMid }}>Resend verification email</button>
              {resendMsg && <div style={{ fontSize: "13px", color: C.green, fontWeight: 700 }}>{resendMsg}</div>}
            </div>
          )}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.greenDark }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.green }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p style={{ textAlign: "center", fontSize: "13px", color: C.textDim, margin: 0, fontFamily: C.font }}>
            <span onClick={onForgot} style={{ color: C.green, cursor: "pointer", fontWeight: 700 }}>Forgot PIN?</span>
            {" · "}
            New member?{" "}<span onClick={onSwitch} style={{ color: C.green, cursor: "pointer", fontWeight: 700 }}>Create account</span>
          </p>
        </form>
      </div>
    </div>
  )
}

function ForgotPINPanel({ onSwitch }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      const res = await apiForgotPIN(email)
      setMessage(res.message || "If an account exists for that email, a PIN reset link has been sent.")
    } catch (err) {
      setError(err.message || "Could not send reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.goldMid})` }} />
      <div style={{ padding: "32px 28px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: C.textHi, margin: "0 0 6px", fontFamily: C.font }}>Forgot PIN</h2>
        <p style={{ fontSize: "14px", color: C.textMid, margin: "0 0 24px", lineHeight: 1.5 }}>Enter the email on your account. We will send a secure link to reset your PIN.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <Lbl text="Email" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inp()} onFocus={onFG} onBlur={onBG} />
          </div>
          {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, fontSize: "14px" }}>{error}</div>}
          {message && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.greenLite, border: `1px solid ${C.greenBdr}`, color: C.green, fontSize: "14px", fontWeight: 700 }}>{message}</div>}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}>{loading ? "Sending..." : "Send reset link"}</button>
          <p style={{ textAlign: "center", fontSize: "13px", color: C.textDim, margin: 0 }}>
            Remembered it?{" "}<span onClick={onSwitch} style={{ color: C.green, cursor: "pointer", fontWeight: 700 }}>Back to sign in</span>
          </p>
        </form>
      </div>
    </div>
  )
}

function ContactPanel() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await apiContact({ name, email, message: msg })
      setSent(true)
      if (res?.mailto) window.location.href = res.mailto
      setTimeout(() => { setSent(false); setName(""); setEmail(""); setMsg("") }, 4000)
    } catch (err) {
      setError(err.message || "Could not send. Email support@sentechain.app")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", marginTop: "28px" }}>
      <div style={{ padding: "28px 24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: C.textHi, margin: "0 0 6px", fontFamily: C.font }}>Contact us</h2>
        <p style={{ fontSize: "13px", color: C.textDim, margin: "0 0 18px", fontFamily: C.font, lineHeight: 1.5 }}>Questions about SenteChain or onboarding your SACCO? Send a message.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={inp()} onFocus={onFG} onBlur={onBG} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inp()} onFocus={onFG} onBlur={onBG} />
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="How can we help?" required rows={3} style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} onFocus={onFG} onBlur={onBG} />
          {error && <div style={{ padding: "10px 12px", borderRadius: "8px", background: C.redBg, color: C.red, fontSize: "13px" }}>{error}</div>}
          {sent && <div style={{ padding: "10px 12px", borderRadius: "8px", background: C.greenLite, color: C.green, fontSize: "13px", fontWeight: 700 }}>Thanks — we will get back to you.</div>}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}>{loading ? "Sending..." : "Send message"}</button>
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(
    searchParams.get("tab") === "signup" ? "signup"
      : searchParams.get("tab") === "forgot" ? "forgot"
      : "login"
  )
  const { width } = useWindowSize()
  const isMobile = width < 900

  useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "signup") setTab("signup")
    else if (t === "forgot") setTab("forgot")
    else if (t === "login") setTab("login")
  }, [searchParams])

  return (
    <div style={{ minHeight: "100vh", fontFamily: C.font, position: "relative", overflow: "hidden" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes floatUp    { 0%{transform:translateY(0)    } 50%{transform:translateY(-28px)} 100%{transform:translateY(0)    } }
        @keyframes floatDown  { 0%{transform:translateY(0)    } 50%{transform:translateY( 22px)} 100%{transform:translateY(0)    } }
        @keyframes rotateSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Full-page animated background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 40%, #fefce8 70%, #f0fdf4 100%)" }}>

        <div style={{ position: "absolute", top: "-160px", left: "-160px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(21,128,61,0.13) 0%, transparent 70%)", animation: "floatUp 9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-120px", right: "-120px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.10) 0%, transparent 70%)", animation: "floatDown 11s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "35%", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(21,128,61,0.08) 0%, transparent 70%)", animation: "floatUp 13s ease-in-out infinite 2s" }} />

        <div style={{ position: "absolute", top: "60px", right: "60px", width: "180px", height: "180px", borderRadius: "50%", border: "2px solid rgba(21,128,61,0.12)", animation: "rotateSlow 30s linear infinite" }} />
        <div style={{ position: "absolute", top: "82px", right: "82px", width: "136px", height: "136px", borderRadius: "50%", border: "1px dashed rgba(217,119,6,0.15)", animation: "rotateSlow 20s linear infinite reverse" }} />
        <div style={{ position: "absolute", bottom: "80px", left: "80px", width: "160px", height: "160px", borderRadius: "50%", border: "2px solid rgba(21,128,61,0.10)", animation: "rotateSlow 25s linear infinite reverse" }} />

        {/* Floating dots */}
        <div style={{ position: "absolute", top: "18%", left: "12%", width: "10px", height: "10px", borderRadius: "50%", background: "rgba(21,128,61,0.25)", animation: "floatUp   7s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "72%", left: "8%", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(217,119,6,0.25)", animation: "floatDown 8s ease-in-out infinite 1s" }} />
        <div style={{ position: "absolute", top: "44%", right: "6%", width: "12px", height: "12px", borderRadius: "50%", background: "rgba(21,128,61,0.18)", animation: "floatUp   10s ease-in-out infinite 3s" }} />
        <div style={{ position: "absolute", top: "85%", right: "14%", width: "8px", height: "8px", borderRadius: "50%", background: "rgba(217,119,6,0.22)", animation: "floatDown 9s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "28%", left: "48%", width: "6px", height: "6px", borderRadius: "50%", background: "rgba(21,128,61,0.15)", animation: "floatUp   12s ease-in-out infinite 4s" }} />
        <div style={{ position: "absolute", top: "60%", left: "55%", width: "9px", height: "9px", borderRadius: "50%", background: "rgba(217,119,6,0.18)", animation: "floatDown 11s ease-in-out infinite 1.5s" }} />

        {/* Subtle grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <defs>
            <pattern id="authGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#15803d" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#authGrid)" />
        </svg>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        <AuthNav />

        <div style={{ flex: 1, maxWidth: "440px", margin: "0 auto", padding: isMobile ? "32px 20px 48px" : "48px 24px 64px", width: "100%" }}>

          <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "36px" }}>
            <h1 style={{ fontSize: isMobile ? "28px" : "34px", fontWeight: 900, color: C.textHi, margin: "0 0 10px", fontFamily: C.font, letterSpacing: "-0.5px" }}>
              {tab === "signup" ? "Join your SACCO" : tab === "forgot" ? "Reset your PIN" : "Welcome back"}
            </h1>
            <p style={{ fontSize: "15px", color: C.textMid, fontFamily: C.font, lineHeight: 1.5 }}>
              {tab === "signup"
                ? "Members sign up here. SACCOs register separately."
                : tab === "forgot"
                ? "We will email you a secure link to choose a new PIN."
                : "Sign in with phone and PIN — your role is detected automatically."}
            </p>
          </div>

          {tab !== "forgot" && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.90)", border: `1.5px solid ${C.border}`, borderRadius: "12px", padding: "4px", gap: "4px", width: "100%", maxWidth: "320px" }}>
                {[["login", "Sign In"], ["signup", "Join SACCO"]].map(([t, lbl]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 16px", borderRadius: "9px", fontFamily: C.font, fontSize: "14px", fontWeight: 700, cursor: "pointer", border: "none", background: tab === t ? C.green : "transparent", color: tab === t ? "#fff" : C.textMid, transition: "all 0.18s" }}>{lbl}</button>
                ))}
              </div>
            </div>
          )}

          {tab === "signup"
            ? <SignUpPanel onSwitch={() => setTab("login")} />
            : tab === "forgot"
            ? <ForgotPINPanel onSwitch={() => setTab("login")} />
            : <LoginPanel onSwitch={() => setTab("signup")} onForgot={() => setTab("forgot")} />
          }

          <ContactPanel />

          <div style={{ marginTop: "24px", textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button type="button" onClick={() => navigate("/register-sacco")} style={{ background: "none", border: "none", color: C.goldMid, fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: C.font }}>
              Register your SACCO on SenteChain →
            </button>
            <p style={{ fontSize: "13px", color: C.textDim, margin: 0, fontFamily: C.font }}>
              Or email <a href="mailto:support@sentechain.app" style={{ color: C.green, textDecoration: "none", fontWeight: 600 }}>support@sentechain.app</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}