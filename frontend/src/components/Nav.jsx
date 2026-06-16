// src/components/Nav.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { T } from "../styles/theme"
import { EAC_COUNTRIES } from "../data/countries"

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

const roleTag = {
  member:  { color:T.green,   bg:T.greenLite, bdr:T.greenBdr,  label:"Member"  },
  cashier: { color:T.goldMid, bg:T.goldLite,  bdr:T.goldBdr,   label:"Cashier" },
  admin:   { color:T.purple,  bg:"rgba(124,58,237,0.10)", bdr:T.purpleBdr, label:"Admin" },
}

export default function Nav({ hidePublicView }) {
  const { auth, logout, currency, setCurrency } = useAuth()
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900
  const rt = roleTag[auth?.role] || roleTag.member

  function handleLogout() { logout(); navigate("/", { replace:true }) }

  return (
    <nav style={{ 
      position:"sticky", top:0, zIndex:100, 
      background:"#ffffff", borderBottom:`1px solid ${T.border}`, 
      boxShadow:"0 1px 12px rgba(0,0,0,0.06)", 
      display:"flex", alignItems:"center", justifyContent:"space-between", 
      padding: isMobile ? "0 16px" : "0 40px", height:"72px" 
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }} onClick={() => navigate("/")}>
        <img src="/image10.png" alt="Logo" style={{ height: isMobile ? "38px" : "48px", objectFit:"contain" }} />
        {!isMobile && (
          <span style={{ fontSize:"20px", fontWeight:900, letterSpacing:"2px", fontFamily:T.font }}>
            <span style={{color:T.textHi}}>SENTE</span><span style={{color:T.goldMid}}>CHAIN</span>
          </span>
        )}
        {auth?.role && !isMobile && (
          <span style={{ fontSize:"11px", fontFamily:T.fontMono, fontWeight:700, padding:"4px 12px", borderRadius:"99px", letterSpacing:"1px", background:rt.bg, color:rt.color, border:`1px solid ${rt.bdr}`, textTransform:"uppercase" }}>
            {rt.label}
          </span>
        )}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap: isMobile ? "8px" : "12px" }}>
        {auth && !isMobile && <span style={{ fontSize:"14px", color:T.textMid, fontWeight:500, fontFamily:T.font }}>{auth.name}</span>}
        
        {!hidePublicView && (
          <button onClick={() => navigate("/sacco/SACCO01")} style={{ 
            fontSize: isMobile ? "12px" : "14px", fontWeight:600, 
            padding: isMobile ? "6px 12px" : "8px 18px", 
            borderRadius:"9px", cursor:"pointer", fontFamily:T.font, 
            border:`1.5px solid ${T.border}`, background:"#fff", 
            color:T.textMid, transition:"all 0.18s" 
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.green;e.currentTarget.style.color=T.green}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMid}}>
            Public View
          </button>
        )}

        {!isMobile && (
          <select 
            value={EAC_COUNTRIES.find(c => c.currency === currency)?.code || "KE"} 
            onChange={(e) => {
              const c = EAC_COUNTRIES.find(x => x.code === e.target.value)
              setCurrency(c.currency)
            }}
            style={{ 
              fontSize:"13px", fontWeight:700, padding:"7px 10px", 
              borderRadius:"9px", border:`1.5px solid ${T.border}`, 
              background:T.surface, color:T.textMid, cursor:"pointer", 
              outline:"none", fontFamily:T.font
            }}
          >
            {EAC_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.currency}</option>
            ))}
          </select>
        )}

        {auth && (
          <button onClick={handleLogout} style={{ 
            fontSize: isMobile ? "12px" : "14px", fontWeight:700, 
            padding: isMobile ? "6px 12px" : "8px 18px", 
            borderRadius:"9px", cursor:"pointer", fontFamily:T.font, 
            background:T.redBg, color:T.red, border:`1.5px solid ${T.redBdr}`, 
            transition:"opacity 0.18s" 
          }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.75"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            {isMobile ? "Exit" : "Sign Out"}
          </button>
        )}
      </div>
    </nav>
  )
}