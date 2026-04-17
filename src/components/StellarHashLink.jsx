// src/components/StellarHashLink.jsx
import { T } from "../styles/theme"
export default function StellarHashLink({ hash, isCompact }) {
  if (!hash) return <span style={{ color:T.textXdim, fontSize: isCompact ? "11px" : "13px", fontFamily:T.fontMono }}>None</span>
  const url   = `https://stellar.expert/explorer/testnet/tx/${hash}`
  const short = hash.slice(0, 6) + ".." + hash.slice(-4)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ 
      fontSize: isCompact ? "11px" : "13px", 
      fontFamily:T.fontMono, fontWeight:600, color:T.green, textDecoration:"none", 
      padding: isCompact ? "2px 6px" : "3px 10px", 
      borderRadius:"7px", background:T.greenLite, border:`1px solid ${T.greenBdr}`, 
      transition:"all 0.18s", display:"inline-block" 
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=T.green;e.currentTarget.style.color="#fff"}}
      onMouseLeave={e=>{e.currentTarget.style.background=T.greenLite;e.currentTarget.style.color=T.green}}>
      {short} &nearr;
    </a>
  )
}