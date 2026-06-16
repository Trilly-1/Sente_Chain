// src/components/StatusBadge.jsx
import { T } from "../styles/theme"
const MAP = {
  confirmed:{ bg:T.greenLite, color:T.green,   bdr:T.greenBdr,  label:"Confirmed" },
  pending:  { bg:T.goldLite,  color:T.goldMid, bdr:T.goldBdr,   label:"Pending"   },
  rejected: { bg:T.redBg,     color:T.red,     bdr:T.redBdr,    label:"Rejected"  },
  active:   { bg:T.greenLite, color:T.green,   bdr:T.greenBdr,  label:"Active"    },
  completed:{ bg:"rgba(124,58,237,0.08)", color:T.purple, bdr:T.purpleBdr, label:"Completed" },
  suspended:{ bg:T.redBg,     color:T.red,     bdr:T.redBdr,    label:"Suspended" },
  paid:     { bg:T.greenLite, color:T.green,   bdr:T.greenBdr,  label:"Paid"      },
  upcoming: { bg:T.goldLite,  color:T.goldMid, bdr:T.goldBdr,   label:"Upcoming"  },
}
export default function StatusBadge({ status }) {
  const s = MAP[status?.toLowerCase()] || { bg:T.surface, color:T.textDim, bdr:T.border, label:status }
  return (
    <span style={{ padding:"4px 12px", borderRadius:"99px", fontSize:"12px", fontFamily:T.fontMono, fontWeight:700, whiteSpace:"nowrap", background:s.bg, color:s.color, border:`1px solid ${s.bdr}`, letterSpacing:"0.5px" }}>
      {s.label}
    </span>
  )
}