import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { apiVerifyEmail } from "../services/api"
import { getPostLoginPath } from "../utils/roleRouting"

const C = {
  green: "#15803d",
  greenLite: "#dcfce7",
  greenBdr: "#bbf7d0",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBdr: "#fecaca",
  textHi: "#0a0a0a",
  textMid: "#374151",
  border: "#e5e7eb",
  font: "'Inter', sans-serif",
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setError("Verification link is invalid or missing.")
      return
    }

    apiVerifyEmail(token)
      .then((user) => {
        login(user)
        setStatus("success")
        setTimeout(() => navigate(getPostLoginPath(user), { replace: true }), 1800)
      })
      .catch((err) => {
        setStatus("error")
        setError(err.message || "Verification failed.")
      })
  }, [searchParams, login, navigate])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: C.font, background: "#f8faf8" }}>
      <div style={{ width: "100%", maxWidth: "420px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", padding: "32px", boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: C.textHi, margin: "0 0 8px" }}>Confirm your email</h1>
        <p style={{ color: C.textMid, margin: "0 0 20px", lineHeight: 1.5 }}>
          {status === "loading" && "Verifying your SenteChain account..."}
          {status === "success" && "Email confirmed. Redirecting you to your dashboard..."}
          {status === "error" && "We could not verify this link."}
        </p>
        {status === "error" && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.redBg, border: `1px solid ${C.redBdr}`, color: C.red, marginBottom: "16px" }}>
            {error}
          </div>
        )}
        {status === "success" && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: C.greenLite, border: `1px solid ${C.greenBdr}`, color: C.green, fontWeight: 700 }}>
            You are all set.
          </div>
        )}
        {status === "error" && (
          <Link to="/auth?tab=login" style={{ color: C.green, fontWeight: 700, textDecoration: "none" }}>
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  )
}
