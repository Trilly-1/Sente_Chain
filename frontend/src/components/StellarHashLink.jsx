// src/components/StellarHashLink.jsx
import { Link } from "react-router-dom"
import { T } from "../styles/theme"

const network = import.meta.env.VITE_STELLAR_NETWORK || "testnet"
const explorerBase =
  network === "mainnet"
    ? "https://stellar.expert/explorer/public/tx"
    : "https://stellar.expert/explorer/testnet/tx"

export default function StellarHashLink({ hash, isCompact }) {
  if (!hash) return <span style={{ color:T.textXdim, fontSize: isCompact ? "11px" : "13px", fontFamily:T.fontMono }}>Pending anchor</span>
  const short = hash.slice(0, 6) + ".." + hash.slice(-4)
  const style = {
    fontSize: isCompact ? "11px" : "13px",
    fontFamily:T.fontMono, fontWeight:600, color:T.green, textDecoration:"none",
    padding: isCompact ? "2px 6px" : "3px 10px",
    borderRadius:"7px", background:T.greenLite, border:`1px solid ${T.greenBdr}`,
    transition:"all 0.18s", display:"inline-block",
  }
  return (
    <Link to={`/ledger/${hash}`} style={style}
      onMouseEnter={e=>{e.currentTarget.style.background=T.green;e.currentTarget.style.color="#fff"}}
      onMouseLeave={e=>{e.currentTarget.style.background=T.greenLite;e.currentTarget.style.color=T.green}}
      title="View transparent ledger proof">
      {short} →
    </Link>
  )
}

export function StellarExplorerLink({ hash }) {
  if (!hash) return null
  return (
    <a href={`${explorerBase}/${hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: T.textDim }}>
      Stellar Explorer ↗
    </a>
  )
}
