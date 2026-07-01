import { useState, useEffect } from "react"
import { T } from "../styles/theme"
import { apiHealth, apiReady, BASE_URL } from "../services/api"

export default function HealthBar() {
  const [health, setHealth] = useState({ api: null, db: null })

  useEffect(() => {
    Promise.all([apiHealth(), apiReady()])
      .then(([api, db]) => setHealth({ api, db }))
      .catch(() => setHealth({ api: { status: "error" }, db: { status: "error" } }))
  }, [])

  const apiOk = health.api?.status === "ok"
  const dbOk = health.db?.status === "ready"

  const services = [
    { label: "Backend API", sub: BASE_URL.replace(/^https?:\/\//, ""), ok: apiOk },
    { label: "PostgreSQL", sub: dbOk ? "connected" : "checking", ok: dbOk },
    { label: "Stellar Testnet", sub: import.meta.env.VITE_STELLAR_NETWORK || "testnet", ok: true },
    { label: "Auth Service", sub: "JWT + PIN", ok: apiOk },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {services.map(s => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: T.cardBg, border: `1px solid ${T.border}` }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: s.ok ? T.green : T.goldMid,
              boxShadow: s.ok ? `0 0 8px ${T.green}` : "none",
            }}
          />
          <div>
            <p className="text-xs font-semibold" style={{ color: T.textHi }}>{s.label}</p>
            <p className="text-xs font-mono" style={{ color: T.textDim }}>{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
