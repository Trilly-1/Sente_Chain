import { T } from "../styles/theme"

const services = [
  { label: "Backend API",     sub: "api.sentechain.app" },
  { label: "PostgreSQL",      sub: "railway · live"     },
  { label: "Stellar Testnet", sub: "network · live"     },
  { label: "SMS Service",     sub: "Africa's Talking"   },
]

export default function HealthBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {services.map(s => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: T.cardBg, border: `1px solid ${T.border}` }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: T.green, boxShadow: `0 0 8px ${T.green}` }}
          />
          <div>
            <p className="text-xs font-semibold" style={{ color: T.textHi }}>{s.label}</p>
            <p className="text-xs font-mono"     style={{ color: T.textDim }}>{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}