import StellarHashLink from "./StellarHashLink"
import StatusBadge from "./StatusBadge"
import { T } from "../styles/theme"

const methodBadge = {
  MTN:    { bg: T.greenBg,  color: T.green,  border: T.greenBdr,  label: "📱 MTN MoMo"    },
  AIRTEL: { bg: T.redBg,    color: T.red,    border: T.redBdr,    label: "📱 Airtel Money" },
  ADMIN:  { bg: T.goldBg,   color: T.gold,   border: T.goldBdr,   label: "🔑 Admin"        },
}

const typeColor = {
  Deposit:   T.green,
  Loan:      T.gold,
  Repayment: "#34d399",
}

export default function TransactionRow({ tx }) {
  const m = methodBadge[tx.entry_type?.toUpperCase()] || methodBadge.ADMIN

  return (
    <tr
      className="transition-colors"
      onMouseEnter={e => e.currentTarget.style.background = T.cardBg}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td className="px-6 py-4 font-mono text-xs" style={{ color: T.textDim }}>
        {new Date(tx.recorded_at).toLocaleDateString("en-UG", {
          day: "2-digit", month: "short", year: "numeric",
        })}
      </td>
      <td className="px-6 py-4 font-semibold" style={{ color: typeColor[tx.type] || T.textHi }}>
        {tx.type}
      </td>
      <td className="px-6 py-4 font-bold font-mono" style={{ color: T.textHi }}>
        UGX {Number(tx.amount_ugx).toLocaleString()}
      </td>
      <td className="px-6 py-4">
        <span
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-semibold"
          style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
        >
          {m.label}
        </span>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={tx.status || "confirmed"} />
      </td>
      <td className="px-6 py-4">
        <StellarHashLink hash={tx.stellar_tx_hash} />
      </td>
    </tr>
  )
}