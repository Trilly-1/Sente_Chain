// src/pages/AuthPage.jsx
// One page: Sign Up | Login | Get In Touch
import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { apiLogin, apiRegister, apiContact } from "../services/api"
import { EAC_COUNTRIES } from "../data/countries"
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

const C = {
  green: "#15803d", greenMid: "#16a34a", greenLite: "#dcfce7", greenBdr: "#bbf7d0", greenDark: "#14532d",
  goldMid: "#d97706", goldLite: "#fef3c7", goldBdr: "#fde68a",
  red: "#dc2626", redBg: "#fef2f2", redBdr: "#fecaca",
  textHi: "#0a0a0a", textMid: "#374151", textDim: "#6b7280", textXdim: "#9ca3af",
  border: "#e5e7eb", surface: "#f8faf8",
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'DM Mono', 'JetBrains Mono', monospace",
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
  const { setCurrency, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const preselectedSaccoId = location.state?.from?.split("/").pop()
  const initialSacco = ALL_SACCOS.find(s => s.id === preselectedSaccoId) || ALL_SACCOS[0]

  const [name, setName] = useState("")
  const [country, setCountry] = useState(EAC_COUNTRIES[0])
  const [phoneNo, setPhoneNo] = useState("")
  const [saccoId, setSaccoId] = useState(initialSacco.id)
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const filteredSaccos = ALL_SACCOS.filter(s => s.country === country.code)

  const handleCountryChange = (e) => {
    const c = EAC_COUNTRIES.find(x => x.code === e.target.value)
    setCountry(c)
    setCurrency(c.currency)
    setPhoneNo("")
    
    const firstInCountry = ALL_SACCOS.find(s => s.country === c.code)
    if (firstInCountry) setSaccoId(firstInCountry.id)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true)
    const fullPhone = country.prefix + phoneNo.replace(/^0+/, "") // Ensure prefix + number (stripping leading zero)
    try {
      const user = await apiRegister({ name, phone: fullPhone, role: "member", saccoId, pin })
      login(user)
      navigate("/dashboard")
    } catch (err) { setError(err.message || "Registration failed.") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.greenMid})` }} />
      <div style={{ padding: "36px 40px 32px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 900, color: C.textHi, margin: "0 0 4px", fontFamily: C.font }}>Create your account</h2>
        <p style={{ fontSize: "14px", color: C.textDim, margin: "0 0 28px", fontFamily: C.font }}>Register to access your SACCO financial records on the blockchain</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <Lbl text="Country of Residence" />
            <select 
              value={country.code} 
              onChange={handleCountryChange} 
              style={inp({ cursor: "pointer" })}
              onFocus={onFG} onBlur={onBG}
            >
              {EAC_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.prefix})</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl text="Target SACCO to Join" />
            <select 
              value={saccoId} 
              onChange={e => setSaccoId(e.target.value)} 
              style={inp({ cursor: "pointer" })}
              onFocus={onFG} onBlur={onBG}
            >
              {filteredSaccos.length > 0 ? (
                filteredSaccos.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                <option disabled>No SACCOs found in {country.name}</option>
              )}
            </select>
            <p style={{ fontSize: "12px", color: C.green, marginTop: "6px", fontWeight: 600 }}>
              {location.state?.from?.includes("/sacco/") ? "✓ Joining from public ledger" : `Showing SACCOs in ${country.name}`}
            </p>
          </div>
          <div><Lbl text="Full Name" /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Wanjiku" required style={inp()} onFocus={onFG} onBlur={onBG} /></div>
          <div>
            <Lbl text="Phone Number" />
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{
                background: C.surface, border: `1.5px solid ${C.border}`, color: C.textDim,
                borderRadius: "10px", padding: "13px 16px", fontWeight: 700, fontSize: "15px",
                display: "flex", alignItems: "center", justifyContent: "center", minWidth: "75px"
              }}>
                {country.prefix}
              </div>
              <input 
                type="tel" 
                value={phoneNo} 
                onChange={e => setPhoneNo(e.target.value.replace(/[^0-9]/g, ""))} 
                placeholder="700 000 000" 
                required 
                style={inp()} 
                onFocus={onFG} onBlur={onBG} 
              />
            </div>
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

function LoginPanel({ onSwitch }) {
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [code, setCode] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true)
    try {
      const user = await apiLogin({ phone, pin, role_code: isStaff ? code : undefined })
      login(user)
      const destination = location.state?.from || "/dashboard"
      navigate(destination, { replace: true })
    } catch (err) { setError(err.message || "Login failed. Please check your credentials.") }
    finally { setLoading(false) }
  }

  const ShowHide = ({ show, toggle }) => (
    <button type="button" onClick={toggle} tabIndex={-1} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: C.green, fontFamily: C.font, fontWeight: 700, letterSpacing: "1px" }}>
      {show ? "HIDE" : "SHOW"}
    </button>
  )

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.green}, ${C.goldMid})` }} />
      <div style={{ padding: "36px 40px 32px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 900, color: C.textHi, margin: "0 0 4px", fontFamily: C.font }}>Welcome back</h2>
        <p style={{ fontSize: "14px", color: C.textDim, margin: "0 0 22px", fontFamily: C.font }}>Sign in to your SenteChain account</p>
        <div style={{ display: "flex", gap: "4px", marginBottom: "22px", background: C.surface, borderRadius: "10px", padding: "4px", border: `1px solid ${C.border}` }}>
          {["Member Login", "Staff Login"].map((lbl, i) => (
            <button key={lbl} type="button" onClick={() => { setIsStaff(i === 1); setError("") }} style={{ flex: 1, padding: "9px", borderRadius: "7px", fontFamily: C.font, cursor: "pointer", fontSize: "13px", fontWeight: 700, border: "none", background: isStaff === (i === 1) ? C.green : "transparent", color: isStaff === (i === 1) ? "#fff" : C.textDim, transition: "all 0.18s", boxShadow: isStaff === (i === 1) ? `0 2px 8px ${C.green}44` : "none" }}>{lbl}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div><Lbl text="Phone Number" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0700 000 001" required style={inp()} onFocus={onFG} onBlur={onBG} /></div>
          <div>
            <Lbl text="PIN" />
            <div style={{ position: "relative" }}>
              <input type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" maxLength={4} required style={inp({ paddingRight: "60px", letterSpacing: "7px", fontSize: "20px" })} onFocus={onFG} onBlur={onBG} />
              <ShowHide show={showPin} toggle={() => setShowPin(v => !v)} />
            </div>
          </div>
          {isStaff && (
            <div>
              <Lbl text="Access Code" />
              <div style={{ position: "relative" }}>
                <input type={showCode ? "text" : "password"} value={code} onChange={e => setCode(e.target.value)} placeholder="Staff access code" required style={inp({ paddingRight: "60px" })} onFocus={onFG} onBlur={onBG} />
                <ShowHide show={showCode} toggle={() => setShowCode(v => !v)} />
              </div>
              <p style={{ fontSize: "12px", color: C.textXdim, marginTop: "5px", fontFamily: C.font }}>Issued by your SACCO administrator</p>
            </div>
          )}
          {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, fontSize: "14px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.greenDark }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.green }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p style={{ textAlign: "center", fontSize: "13px", color: C.textDim, margin: 0, fontFamily: C.font }}>
            No account?{" "}<span onClick={onSwitch} style={{ color: C.green, cursor: "pointer", fontWeight: 700 }}>Create one</span>
          </p>
        </form>
      </div>
    </div>
  )
}

function ContactPanel({ contactRef }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true)
    try {
      await apiContact({ name, email, message: msg })
      setSent(true)
      setTimeout(() => { setSent(false); setName(""); setEmail(""); setMsg("") }, 5000)
    } catch (err) { setError(err.message || "Send failed. Please try again.") }
    finally { setLoading(false) }
  }

  return (
    <div ref={contactRef} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.goldMid}, ${C.green})` }} />
      <div style={{ padding: "36px 40px 32px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 900, color: C.textHi, margin: "0 0 4px", fontFamily: C.font }}>
          Get In <span style={{ color: C.green }}>Touch</span>
        </h2>
        <p style={{ fontSize: "14px", color: C.textDim, margin: "0 0 28px", fontFamily: C.font }}>Got questions about SenteChain? Want to onboard your SACCO? We would love to hear from you.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { lbl: "Your Name", type: "text", val: name, set: setName, ph: "e.g. John Kamau" },
            { lbl: "Email", type: "email", val: email, set: setEmail, ph: "you@example.com" },
          ].map(f => (
            <div key={f.lbl}><Lbl text={f.lbl} /><input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} required style={inp()} onFocus={onFG} onBlur={onBG} /></div>
          ))}
          <div>
            <Lbl text="Message" />
            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Tell us about your SACCO or ask a question..." required rows={4} style={{ ...inp(), resize: "vertical", lineHeight: 1.6 }} onFocus={onFG} onBlur={onBG} />
          </div>
          {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, fontSize: "14px" }}>{error}</div>}
          {sent && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.greenLite, border: `1px solid ${C.greenBdr}`, color: C.green, fontSize: "14px", fontWeight: 700 }}>Message sent. We will be in touch within 24 hours.</div>}
          <button type="submit" disabled={loading} style={loading ? disBtn : greenBtn}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.greenDark }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.green }}>
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get("tab") === "signup" ? "signup" : "login")
  const contactRef = useRef(null)
  const { width } = useWindowSize()
  const isMobile = width < 900

  useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "signup") setTab("signup")
    else if (t === "login") setTab("login")
    if (window.location.hash === "#contact") {
      setTimeout(() => contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
    }
  }, [searchParams])

  return (
    <div style={{ minHeight: "100vh", fontFamily: C.font, position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
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

        <div style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "40px 24px 60px" : "56px 40px 80px", width: "100%" }}>

          <div style={{ textAlign: "center", marginBottom: isMobile ? "32px" : "48px" }}>
            <h1 style={{ fontSize: isMobile ? "32px" : "42px", fontWeight: 900, color: C.textHi, margin: "0 0 12px", fontFamily: C.font, letterSpacing: "-0.5px" }}>
              Your SACCO, <span style={{ color: C.green }}>on the blockchain</span>
            </h1>
            <p style={{ fontSize: "17px", color: C.textMid, fontFamily: C.font }}>
              Create an account, sign in to your dashboard, or get in touch with our team.
            </p>
          </div>

          {/* Tab toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? "30px" : "40px" }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.80)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1.5px solid ${C.border}`, borderRadius: "12px", padding: "4px", gap: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              {[["signup", "Create Account"], ["login", "Sign In"]].map(([t, lbl]) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: isMobile ? "10px 20px" : "11px 34px", borderRadius: "9px", fontFamily: C.font, fontSize: isMobile ? "14px" : "15px", fontWeight: 700, cursor: "pointer", border: "none", background: tab === t ? C.green : "transparent", color: tab === t ? "#fff" : C.textMid, transition: "all 0.18s", boxShadow: tab === t ? `0 2px 12px ${C.green}44` : "none" }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Two columns */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "40px" : "32px", alignItems: "start" }}>
            <div>
              {tab === "signup"
                ? <SignUpPanel onSwitch={() => setTab("login")} />
                : <LoginPanel onSwitch={() => setTab("signup")} />
              }
              <p style={{ textAlign: "center", marginTop: "18px", fontSize: "14px", color: C.textDim, fontFamily: C.font }}>
                No login needed to view SACCO records.{" "}
                <a href="/sacco/SACCO01" style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>View the public ledger</a>
              </p>
            </div>
            <div>
              <ContactPanel contactRef={contactRef} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}