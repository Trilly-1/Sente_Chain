// src/pages/Login.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { DEMO_USERS } from "../data/demo"
import { T } from "../styles/theme"

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

export default function Login() {
  const [phone,    setPhone]    = useState("")
  const [pin,      setPin]      = useState("")
  const [roleCode, setRoleCode] = useState("")
  const [showPin,  setShowPin]  = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [isStaff,  setIsStaff]  = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()
  const { width } = useWindowSize()
  const isMobile  = width < 900

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const cleaned = phone.replace(/\s/g, "")
    if (isStaff) {
      const user = DEMO_USERS.find(u =>
        u.phone === cleaned && u.pin === pin && u.role_code === roleCode && u.role !== "member"
      )
      if (user) { login({ token: "demo-token", ...user }); navigate("/") }
      else setError("Invalid credentials or access code. Contact your SACCO administrator.")
    } else {
      const user = DEMO_USERS.find(u =>
        u.phone === cleaned && u.pin === pin && u.role === "member"
      )
      if (user) { login({ token: "demo-token", ...user }); navigate("/") }
      else setError("Invalid phone number or PIN.")
    }
    setLoading(false)
  }

  const inp = (extra = {}) => ({
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#ffffff", borderRadius: "13px", padding: "14px 18px",
    width: "100%", outline: "none",
    fontSize: "15px", fontFamily: T.font, fontWeight: 500,
    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)",
    ...extra,
  })

  const lbl = (text) => (
    <label style={{
      display: "block", fontSize: "11px", fontWeight: 700,
      color: "rgba(255,255,255,0.40)", marginBottom: "8px",
      letterSpacing: "1.4px", textTransform: "uppercase",
    }}>{text}</label>
  )

  const onFocus = (e) => {
    e.target.style.borderColor = "rgba(74,222,128,0.65)"
    e.target.style.background  = "rgba(255,255,255,0.11)"
    e.target.style.boxShadow   = "inset 0 2px 8px rgba(0,0,0,0.2), 0 0 0 3px rgba(74,222,128,0.09)"
  }
  const onBlur = (e) => {
    e.target.style.borderColor = "rgba(255,255,255,0.15)"
    e.target.style.background  = "rgba(255,255,255,0.08)"
    e.target.style.boxShadow   = "inset 0 2px 8px rgba(0,0,0,0.25)"
  }

  const STATS = [
    { label: "SACCO Members",    value: "30,000+" },
    { label: "On-chain verified", value: "100%"   },
    { label: "Districts",         value: "54"     },
  ]

  const FEATURES = [
    { title: "Blockchain verified",  body: "Every deposit sealed on Stellar in under 10 seconds" },
    { title: "Mobile money native",  body: "Accepts MTN MoMo and Airtel Money automatically"    },
    { title: "No trust required",    body: "Members verify their own records independently"      },
  ]

  return (
    <div style={{
      minHeight: "100vh", background: "#060606",
      display: "flex", fontFamily: T.font, overflow: "hidden",
    }}>

      {/* ══ LEFT — form ══ */}
      <div style={{
        flex: isMobile ? "1" : "0 0 500px", minHeight: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: isMobile ? "40px 24px" : "56px 52px",
        background: "#060606",
        borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
        position: "relative", zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{ marginBottom: "44px" }}>
          {/* Icon mark */}
          <div style={{
            width: "64px", height: "64px", borderRadius: "18px", marginBottom: "26px",
            background: "linear-gradient(135deg, rgba(74,222,128,0.18), rgba(74,222,128,0.06))",
            border: "1px solid rgba(74,222,128,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(74,222,128,0.14), inset 0 1px 0 rgba(74,222,128,0.22)",
          }}>
            <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
              <div style={{ width: "9px", height: "14px", borderRadius: "5px",
                border: "2.5px solid #4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.55)" }} />
              <div style={{ width: "9px", height: "14px", borderRadius: "5px",
                border: "2.5px solid #4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.55)",
                marginLeft: "-4px" }} />
            </div>
          </div>

          <h1 style={{ fontSize: "38px", fontWeight: 900, letterSpacing: "6px",
            fontFamily: T.font, margin: "0 0 10px", lineHeight: 1 }}>
            <span style={{ color: "#ffffff" }}>SENTE</span>
            <span style={{
              color: T.green,
              textShadow: "0 0 26px rgba(74,222,128,0.50), 0 0 56px rgba(74,222,128,0.18)",
            }}>CHAIN</span>
          </h1>

          <p style={{
            fontSize: "11px", letterSpacing: "2.5px", color: "rgba(255,255,255,0.32)",
            fontFamily: T.fontMono, textTransform: "uppercase",
          }}>
            Transparent Savings
            <span style={{ color: T.green, margin: "0 7px", fontWeight: 700 }}>|</span>
            Trusted Communities
          </p>

          <div style={{
            width: "34px", height: "2px", borderRadius: "99px",
            background: `linear-gradient(90deg, #16a34a, ${T.green})`,
            marginTop: "14px", boxShadow: "0 0 10px rgba(74,222,128,0.50)",
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.055)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "22px", padding: "34px 34px 30px",
          position: "relative", overflow: "hidden",
          boxShadow: T.glassShadowStrong,
        }}>
          {/* Green shimmer top */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: `linear-gradient(90deg, transparent, #16a34a, ${T.green}, #16a34a, transparent)`,
            boxShadow: "0 0 18px rgba(74,222,128,0.42)",
          }} />
          <div style={{
            position: "absolute", top: 0, left: 0, width: "90px", height: "90px",
            background: "radial-gradient(circle at top left, rgba(74,222,128,0.08), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: "90px", height: "90px",
            background: "radial-gradient(circle at bottom right, rgba(74,222,128,0.05), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Toggle */}
          <div style={{
            display: "flex", gap: "4px", marginBottom: "26px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px", padding: "4px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {["Member Login", "Staff Login"].map((label, i) => (
              <button key={label} type="button"
                onClick={() => { setIsStaff(i === 1); setError("") }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  cursor: "pointer", fontSize: "14px", fontWeight: 600,
                  fontFamily: T.font, transition: "all 0.2s",
                  background: isStaff === (i === 1) ? "rgba(74,222,128,0.12)" : "transparent",
                  color:      isStaff === (i === 1) ? T.green : "rgba(255,255,255,0.38)",
                  border:     isStaff === (i === 1) ? "1px solid rgba(74,222,128,0.28)" : "1px solid transparent",
                }}>{label}</button>
            ))}
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
            {isStaff ? "Staff Access" : "Welcome back"}
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.50)", marginBottom: "24px" }}>
            {isStaff ? "Enter your credentials and access code" : "Sign in with your phone number and PIN"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            <div>
              {lbl("Phone Number")}
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="0700 000 001" required style={inp()}
                onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              {lbl("PIN")}
              <div style={{ position: "relative" }}>
                <input type={showPin ? "text" : "password"} value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••" maxLength={4} required
                  style={inp({ paddingRight: "56px", letterSpacing: "8px", fontSize: "20px" })}
                  onFocus={onFocus} onBlur={onBlur} />
                <button type="button" onClick={() => setShowPin(!showPin)} tabIndex={-1}
                  style={{
                    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "11px", color: T.green, fontFamily: T.font,
                    fontWeight: 700, letterSpacing: "1px",
                  }}>
                  {showPin ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {isStaff && (
              <div>
                {lbl("Access Code")}
                <div style={{ position: "relative" }}>
                  <input type={showCode ? "text" : "password"} value={roleCode}
                    onChange={e => setRoleCode(e.target.value)}
                    placeholder="••••••••" required style={inp({ paddingRight: "56px" })}
                    onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowCode(!showCode)} tabIndex={-1}
                    style={{
                      position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "11px", color: T.green, fontFamily: T.font,
                      fontWeight: 700, letterSpacing: "1px",
                    }}>
                    {showCode ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)", marginTop: "6px" }}>
                  Access codes are issued by your SACCO administrator
                </p>
              </div>
            )}

            {error && (
              <div style={{
                background: T.redBg, border: `1px solid ${T.redBdr}`,
                borderRadius: "11px", padding: "12px 16px",
                color: T.red, fontSize: "14px",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "15px", border: "none", borderRadius: "13px",
              background: loading
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg, #16a34a, #22c55e, #4ade80, #22c55e)",
              color: loading ? "rgba(255,255,255,0.30)" : "#052e16",
              fontSize: "15px", fontWeight: 800, fontFamily: T.font,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.25s", letterSpacing: "0.4px", marginTop: "4px",
              boxShadow: loading
                ? "none"
                : "0 4px 24px rgba(74,222,128,0.38), 0 0 0 1px rgba(74,222,128,0.16)",
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.boxShadow = "0 6px 32px rgba(74,222,128,0.55), 0 0 0 1px rgba(74,222,128,0.26)"
                e.currentTarget.style.transform = "translateY(-1px)"
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(74,222,128,0.38), 0 0 0 1px rgba(74,222,128,0.16)"
                e.currentTarget.style.transform = "translateY(0)"
              }
            }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            marginTop: "22px", paddingTop: "18px", textAlign: "center",
          }}>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.28)", marginBottom: "6px" }}>
              No account needed to view public records
            </p>
            <a href="/sacco/SACCO01" style={{
              fontSize: "13px", color: T.green, textDecoration: "none",
              fontWeight: 600, borderBottom: `1px solid rgba(74,222,128,0.32)`,
              paddingBottom: "1px", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.color = "#86efac"; e.target.style.borderColor = "rgba(74,222,128,0.55)" }}
            onMouseLeave={e => { e.target.style.color = T.green; e.target.style.borderColor = "rgba(74,222,128,0.32)" }}>
              View SACCO public ledger
            </a>
          </div>
        </div>

        <p style={{
          marginTop: "26px", fontSize: "10px", fontFamily: T.fontMono,
          color: "rgba(255,255,255,0.16)", letterSpacing: "1.5px", textTransform: "uppercase",
        }}>
          Powered by Stellar blockchain — Uganda
        </p>
      </div>

      {/* ══ RIGHT — img5 panel ══ */}
      {!isMobile && (
        <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: "100vh" }}>

          {/* img5 — full bleed */}
          <img src="/image5.jpg" alt="SenteChain financial empowerment" style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center",
          }} />

          {/* Layered scrims */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(0,0,0,0.38) 0%, rgba(5,46,22,0.55) 100%)",
          }} />
          {/* Left bleed into form */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, rgba(6,6,6,0.85) 0%, rgba(6,6,6,0.08) 28%, transparent 52%)",
          }} />
          {/* Bottom fade for stats */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 48%)",
          }} />

          {/* Overlaid content */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 48px 52px 56px",
          }}>

            {/* Top — live badge + headline */}
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "7px 16px", borderRadius: "99px",
                background: "rgba(0,0,0,0.50)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: `1px solid rgba(74,222,128,0.28)`,
                marginBottom: "22px",
              }}>
                <span style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: T.green, display: "inline-block",
                  boxShadow: "0 0 8px rgba(74,222,128,0.80)",
                  animation: "pulse 2s infinite",
                }} />
                <span style={{
                  fontSize: "11px", fontFamily: T.fontMono, color: T.green,
                  letterSpacing: "1.5px", fontWeight: 600, textTransform: "uppercase",
                }}>Live on Stellar Testnet</span>
              </div>

              <h2 style={{
                fontSize: "34px", fontWeight: 900, color: "#ffffff",
                lineHeight: 1.14, maxWidth: "400px", margin: 0,
                textShadow: "0 2px 20px rgba(0,0,0,0.55)",
              }}>
                Financial transparency for every SACCO member
              </h2>
            </div>

            {/* Middle — feature cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{
                  display: "flex", gap: "14px", alignItems: "flex-start",
                  padding: "15px 18px", borderRadius: "16px",
                  background: "rgba(0,0,0,0.46)",
                  backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "-4px 0 20px rgba(255,255,255,0.03), 4px 0 20px rgba(255,255,255,0.03), 0 8px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.09)",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: T.green, flexShrink: 0, marginTop: "5px",
                    boxShadow: "0 0 10px rgba(74,222,128,0.70)",
                  }} />
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", margin: "0 0 3px" }}>
                      {f.title}
                    </p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.52)", margin: 0 }}>
                      {f.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom — stats */}
            <div>
              <div style={{
                width: "36px", height: "2px", borderRadius: "99px",
                background: `linear-gradient(90deg, #16a34a, ${T.green})`,
                marginBottom: "18px", boxShadow: "0 0 12px rgba(74,222,128,0.50)",
              }} />
              <div style={{ display: "flex" }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1,
                    paddingRight: i < STATS.length - 1 ? "24px" : 0,
                    borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none",
                    paddingLeft: i > 0 ? "24px" : 0,
                  }}>
                    <p style={{
                      fontSize: "28px", fontWeight: 900, color: T.green,
                      margin: "0 0 4px", lineHeight: 1,
                      textShadow: "0 0 22px rgba(74,222,128,0.42)",
                    }}>{s.value}</p>
                    <p style={{
                      fontSize: "11px", color: "rgba(255,255,255,0.45)", margin: 0,
                      fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px",
                    }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}