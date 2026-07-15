import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { apiResetPIN } from "../services/api"

const C = {
  green: "#15803d",
  greenDark: "#14532d",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBdr: "#fecaca",
  textHi: "#0a0a0a",
  textMid: "#374151",
  textDim: "#6b7280",
  border: "#e5e7eb",
  font: "'Inter', sans-serif",
}

const inp = { width: "100%", padding: "13px 16px", borderRadius: "10px", border: `1.5px solid ${C.border}`, fontSize: "15px", fontFamily: C.font, outline: "none" }
const greenBtn = { padding: "14px", borderRadius: "10px", border: "none", fontFamily: C.font, background: C.green, color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer", width: "100%" }

export default function ResetPIN() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token") || ""
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ok, setOk] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await apiResetPIN({ token, pin, confirmPin })
      setOk(true)
      setTimeout(() => navigate("/auth?tab=login", { replace: true }), 2000)
    } catch (err) {
      setError(err.message || "Could not reset PIN.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: C.font, background: "#f8faf8" }}>
      <div style={{ width: "100%", maxWidth: "420px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", padding: "32px", boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: C.textHi, margin: "0 0 8px" }}>Set a new PIN</h1>
        <p style={{ color: C.textMid, margin: "0 0 20px", lineHeight: 1.5 }}>Choose a new 4-digit PIN for your SenteChain account.</p>

        {!token ? (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red }}>
            Reset link is invalid or expired. <Link to="/auth?tab=forgot" style={{ color: C.green, fontWeight: 700 }}>Request a new one</Link>.
          </div>
        ) : ok ? (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#dcfce7", color: C.green, fontWeight: 700 }}>
            PIN updated. Redirecting to sign in...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textDim, marginBottom: "7px", letterSpacing: "0.8px", textTransform: "uppercase" }}>New PIN</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} required placeholder="4-digit PIN" style={{ ...inp, letterSpacing: "7px", fontSize: "20px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textDim, marginBottom: "7px", letterSpacing: "0.8px", textTransform: "uppercase" }}>Confirm PIN</label>
              <input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} maxLength={4} required placeholder="Repeat PIN" style={{ ...inp, letterSpacing: "7px", fontSize: "20px" }} />
            </div>
            {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...greenBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : "Reset PIN"}
            </button>
          </form>
        )}

        <p style={{ marginTop: "18px", textAlign: "center" }}>
          <Link to="/auth?tab=login" style={{ color: C.green, fontWeight: 700, textDecoration: "none" }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
