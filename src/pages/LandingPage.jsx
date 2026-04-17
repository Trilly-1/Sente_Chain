// src/pages/LandingPage.jsx
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"

// Hook for mobile detection
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

const C = {
  pageBg:"#ffffff", surfaceBg:"#f8faf8", cardBg:"#ffffff",
  green:"#15803d", greenMid:"#16a34a", greenLite:"#dcfce7", greenBdr:"#bbf7d0", greenDark:"#14532d",
  gold:"#b45309", goldMid:"#d97706", goldLite:"#fef3c7", goldBdr:"#fde68a", goldDark:"#78350f",
  textHi:"#0a0a0a", textMid:"#374151", textDim:"#6b7280", textXdim:"#9ca3af",
  border:"#e5e7eb", border2:"#f3f4f6", borderDark:"#d1d5db",
  font:"'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono:"'DM Mono', 'JetBrains Mono', monospace",
}

const SLIDES = [
  {
    heading:(<>Fully <span style={{color:C.green}}>Transparent</span> Financial Records</>),
    body:"Every deposit, loan, and repayment is recorded on a public blockchain ledger powered by Stellar. Each transaction is permanently stored with a unique cryptographic hash that cannot be altered or deleted. This allows any SACCO member, auditor, or regulator to independently verify financial activity in real time without relying on internal reports or manual records.",
    accent:C.green, accentLite:C.greenLite, accentBdr:C.greenBdr, image:"/image5.jpg",
  },
  {
    heading:(<><span style={{color:C.green}}>Loan tracking</span> made simple</>),
    body:"Loan applications, approvals, balances, and repayments are tracked in real time through a structured digital system. Members can view exactly how much they owe, how much they have repaid, and their remaining balance at any moment. This removes confusion, delays, and manual calculations while improving trust between SACCO administrators and members.",
    accent:C.goldMid, accentLite:C.goldLite, accentBdr:C.goldBdr, image:"/image1.png",
  },
  {
    heading:(<>Pay via <span style={{color:C.green}}>Safaricom M-Pesa</span></>),
    body:"SenteChain integrates directly with Safaricom M-Pesa, allowing members to deposit or repay loans using familiar USSD codes. Once a payment is made, the system automatically detects the transaction, matches it to the correct member account, and updates the SACCO ledger instantly without manual intervention.",
    accent:C.green, accentLite:C.greenLite, accentBdr:C.greenBdr, image:"/image7.jpg",
  },
  {
    heading:(<>Built on the <span style={{color:C.green}}>Stellar</span> Distributed Ledger</>),
    body:"All transactions are anchored on the Stellar distributed ledger, ensuring global transparency and immutability. Each payment includes a structured memo containing member ID, SACCO ID, amount, and payment method. This creates a permanent audit trail that cannot be modified by any administrator or third party.",
    accent:C.goldMid, accentLite:C.goldLite, accentBdr:C.goldBdr, image:"/image3.png",
  },
  {
    heading:(<>See Your Transactions <span style={{color:C.green}}>Anytime, Anywhere</span></>),
    body:"Members can access their complete financial history anytime from any device. This includes deposits, loan activity, repayments, and account status updates. The system is designed to be always available, ensuring users stay informed about their finances without needing to visit SACCO offices physically.",
    accent:C.green, accentLite:C.greenLite, accentBdr:C.greenBdr, image:"/image7.jpg",
  },
]

// ── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ onHome, onFeatures, onAbout, onGetStarted }) {
  const [scrolled,  setScrolled]  = useState(false)
  const [activeNav, setActiveNav] = useState("home")
  const [menuOpen,  setMenuOpen]  = useState(false)
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const links = [
    { id:"home",        label:"Home",        fn: onHome        },
    { id:"features",    label:"Features",    fn: onFeatures    },
    { id:"about",       label:"About",       fn: onAbout       },
    { id:"getstarted",  label:"Get Started", fn: onGetStarted  },
  ]

  const navLink = (id, label, onClick) => {
    const isActive = activeNav === id
    return (
      <button key={id} onClick={() => { setActiveNav(id); setMenuOpen(false); onClick() }} style={{
        background:"none", border:"none", cursor:"pointer",
        fontSize: isMobile ? "18px" : "15px", fontWeight: isActive ? 700 : 600,
        color: isActive ? C.green : (isMobile ? "#fff" : C.textMid),
        fontFamily:C.font, padding: isMobile ? "15px 0" : "8px 2px",
        transition:"color 0.18s", textAlign: isMobile ? "left" : "center",
        position:"relative", width: isMobile ? "100%" : "auto"
      }}
      onMouseEnter={e => e.currentTarget.style.color = C.green}
      onMouseLeave={e => e.currentTarget.style.color = isActive ? C.green : (isMobile ? "#fff" : C.textMid)}>
        {label}
        {isActive && !isMobile && (
          <span style={{ position:"absolute", bottom:"-2px", left:0, right:0, height:"2px", borderRadius:"99px", background:C.green, boxShadow:`0 0 6px ${C.green}88` }} />
        )}
      </button>
    )
  }

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      height:"72px", background:"#ffffff",
      borderBottom:`1px solid ${scrolled ? C.border : "transparent"}`,
      boxShadow:scrolled ? "0 1px 20px rgba(0,0,0,0.08)" : "none",
      transition:"all 0.3s",
      display:"flex", alignItems:"center", padding: isMobile ? "0 24px" : "0 64px",
    }}>
      {/* Logo */}
      <div
  style={{
    marginRight: "auto",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  }}
  onClick={() => {
    setActiveNav("home")
    onHome()
  }}
>
  <img
    src="/image10.png"
    alt="SenteChain"
    style={{
      height: isMobile ? "44px" : "56px",
      objectFit: "contain",
      display: "block"
    }}
  />

  {/* BRAND TEXT */}
  <span
    style={{
      fontSize: isMobile ? "18px" : "26px",
      fontWeight: 900,
      letterSpacing: "2px",
      fontFamily: C.font,
      display: "flex",
      alignItems: "center",
      marginLeft: "2px",
    }}
  >
    <span style={{ color: "black" }}>SENTE</span>
    <span style={{ color: C.goldMid }}>CHAIN</span>
  </span>
</div>

      {/* Mobile Toggle */}
      {isMobile ? (
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:"none", border:"none", cursor:"pointer", color:C.textHi }}>
           <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
             {menuOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M4 6h16M4 12h16m-7 6h7"/>}
           </svg>
        </button>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:"36px" }}>
          {links.map(l => navLink(l.id, l.label, l.fn))}
          <div style={{ width:"1px", height:"20px", background:C.border }} />
          <button onClick={() => navigate("/auth?tab=login")} style={{
            fontSize:"14px", fontWeight:700, cursor:"pointer", fontFamily:C.font,
            padding:"9px 22px", borderRadius:"9px",
            background:C.green, color:"#ffffff", border:`1.5px solid ${C.green}`,
            transition:"all 0.18s", boxShadow:`0 2px 12px ${C.green}44`,
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.greenDark;e.currentTarget.style.borderColor=C.greenDark;e.currentTarget.style.boxShadow=`0 4px 20px ${C.green}55`}}
          onMouseLeave={e=>{e.currentTarget.style.background=C.green;e.currentTarget.style.borderColor=C.green;e.currentTarget.style.boxShadow=`0 2px 12px ${C.green}44`}}>
            Sign In
          </button>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && (
        <div style={{
          position:"fixed", top:72, left:0, right:0, bottom:0,
          background:C.greenDark, zIndex:199,
          padding:"40px 30px",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition:"transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display:"flex", flexDirection:"column", gap:"10px"
        }}>
          {links.map(l => navLink(l.id, l.label, l.fn))}
          <button onClick={() => { setMenuOpen(false); navigate("/auth?tab=login") }} style={{
            marginTop:"20px", padding:"16px", borderRadius:"12px", background:C.green, color:"#fff", border:"none",
            fontSize:"16px", fontWeight:800, fontFamily:C.font
          }}>
            Sign In to Dashboard
          </button>
        </div>
      )}
    </nav>
  )
}

// ── HERO ────────────────────────────────────────────────────────────────────
function Hero({ heroRef }) {
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900

  return (
    <section ref={heroRef} style={{ backgroundImage:`linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.92)), url('/image5.jpg')`, backgroundSize:"cover", backgroundPosition:"center", backgroundRepeat:"no-repeat", paddingTop: isMobile ? "110px" : "140px", paddingBottom: isMobile ? "60px" : "100px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"-80px", right:"-80px", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(21,128,61,0.07) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-60px", left:"-60px", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(180,83,9,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding: isMobile ? "0 24px" : "0 64px", textAlign:"center", position:"relative", zIndex:1 }}>
        <h1 style={{ fontSize: isMobile ? "40px" : "62px", fontWeight: 900, color: C.textHi, lineHeight: 1.1, margin: "0 0 22px", fontFamily: C.font, letterSpacing: "-1px" }}>
          Financial Transparency<br />
          <span style={{color:C.green}}>Every SACCO</span>{" "}
          <span style={{color:C.goldMid}}>Deserves</span>
        </h1>
        <p style={{ fontSize: isMobile ? "17px" : "20px", color: C.textMid, lineHeight: 1.6, maxWidth: "640px", margin: "0 auto 44px", fontFamily: C.font }}>
          SenteChain puts every SACCO deposit on the Stellar blockchain, permanently verifiable by any member, regulator, or auditor from their phone in a very short time.
        </p>
        <div style={{ display:"flex", gap:"14px", justifyContent:"center", flexDirection: isMobile ? "column" : "row" }}>
          <button onClick={() => navigate("/auth?tab=signup")} style={{ padding:"16px 36px", borderRadius:"11px", fontFamily:C.font, fontSize:"16px", fontWeight:800, cursor:"pointer", background:C.green, color:"#fff", border:"none", boxShadow:`0 4px 24px ${C.green}55`, transition:"all 0.18s" }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.greenDark;e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.green;e.currentTarget.style.transform="translateY(0)"}}>
            Get Started
          </button>
          <button onClick={() => navigate("/auth?tab=login")} style={{ padding:"16px 36px", borderRadius:"11px", fontFamily:C.font, fontSize:"16px", fontWeight:700, cursor:"pointer", background:"#fff", color:C.green, border:`1.5px solid ${C.greenBdr}`, transition:"all 0.18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.boxShadow=`0 4px 16px ${C.green}22`}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.greenBdr;e.currentTarget.style.boxShadow="none"}}>
            Sign In to Dashboard
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap:"0", justifyContent:"center", marginTop:"64px" }}>
          {[
            {value:"30,000+",label:"SACCOs in Kenya",color:C.green},
            {value:"4M+",label:"Members",color:C.goldMid},
            {value:"10s",label:"Blockchain seal",color:C.green},
            {value:"100%",label:"Verifiable",color:C.goldMid},
          ].map((s,i) => (
            <div key={s.label} style={{ textAlign:"center", padding:"20px 10px", borderRight: (!isMobile && i<3) || (isMobile && i % 2 === 0) ? `1px solid ${C.border}` : "none", borderBottom: isMobile && i < 2 ? `1px solid ${C.border}` : "none" }}>
              <p style={{ fontSize: isMobile ? "24px" : "30px", fontWeight:900, color:s.color, margin:"0 0 4px", fontFamily:C.font }}>{s.value}</p>
              <p style={{ fontSize: isMobile ? "11px" : "13px", color:C.textDim, margin:0, fontFamily:C.fontMono, textTransform:"uppercase", letterSpacing:"0.8px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Slider

function Slider({sliderRef}) {
  const { width } = useWindowSize()
  const isMobile = width < 900
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState(null)
  const [sliding, setSliding] = useState(false)
  const [direction, setDirection] = useState(1)
  const timer = useRef(null)

  const goTo = useCallback((idx, dir = 1) => {
    if (sliding || idx === current) return
    clearInterval(timer.current)
    setDirection(dir)
    setPrev(current)
    setSliding(true)
    setCurrent(idx)
    setTimeout(() => {
      setPrev(null)
      setSliding(false)
    }, 520)
  }, [sliding, current])

  const next = useCallback(
    () => goTo((current + 1) % SLIDES.length, 1),
    [current, goTo]
  )

  const prevSlide = useCallback(
    () => goTo((current - 1 + SLIDES.length) % SLIDES.length, -1),
    [current, goTo]
  )

  useEffect(() => {
    timer.current = setInterval(next, 5500)
    return () => clearInterval(timer.current)
  }, [next])

  const sl = SLIDES[current]
  const prSl = prev !== null ? SLIDES[prev] : null

  return (
    <section
  ref={sliderRef}
  style={{
    background:
      "linear-gradient(180deg, #e6e3e3 0%, #f7f9f8 50%, #ffffff 100%)",
    padding: isMobile ? "60px 0" : "0",
  }}
>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: isMobile ? "auto" : "640px",
          minHeight: isMobile ? "740px" : "640px",
          overflow: "hidden",
          display: "block",
        }}
      >
        {/* OUTGOING */}
        {prSl && sliding && (
            <div
            style={{
              position: "absolute",
              top: 0, bottom: 0, left: 0, right: 0,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              animation: `slideOut${
                direction > 0 ? "Left" : "Right"
              } 0.52s cubic-bezier(0.4,0,0.2,1) forwards`,
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: isMobile ? "40px 24px" : "0 80px" }}>
              <div>
                <h3 style={{ fontSize: isMobile ? "28px" : "42px", fontWeight: 900, color: C.textHi, marginBottom: isMobile ? "12px" : "22px" }}>
                  {prSl.heading}
                </h3>
                <p style={{ fontSize: isMobile ? "15px" : "18px", color: C.textMid, lineHeight: 1.7, marginBottom: isMobile ? "24px" : "0" }}>
                  {prSl.body}
                </p>
              </div>
            </div>

            {/* IMAGE (more breathing space) */}
            <div style={{ position: "relative", padding: isMobile ? "0 24px 40px" : "40px 0", display: isMobile ? "flex" : "block", justifyContent:"center" }}>
              <img
  src={prSl.image}
  alt=""
  style={{
    width: isMobile ? "100%" : "100%",
    maxWidth: isMobile ? "400px" : "none",
    height: isMobile ? "240px" : "420px",
    objectFit: "cover",
    borderRadius: "18px",
  }}
/>
            </div>
          </div>
        )}

        {/* CURRENT */}
        <div
          style={{
            position: isMobile ? "relative" : "absolute",
            top: 0, bottom: 0, left: 0, right: 0,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            animation: sliding
              ? `slideIn${direction > 0 ? "Right" : "Left"} 0.52s cubic-bezier(0.4,0,0.2,1) forwards`
              : "none",
            zIndex: 2,
          }}
        >
          {/* TEXT */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: isMobile ? "40px 24px" : "0 80px",
            }}
          >
            <div>
              

              <h3
                style={{
                  fontSize: isMobile ? "28px" : "42px",
                  fontWeight: 900,
                  color: C.textHi,
                  marginBottom: isMobile ? "14px" : "22px",
                }}
              >
                {sl.heading}
              </h3>

              <p
                style={{
                  fontSize: isMobile ? "15px" : "18px",
                  color: C.textMid,
                  lineHeight: 1.7,
                  marginBottom: isMobile ? "24px" : "36px",
                }}
              >
                {sl.body}
              </p>

              {/* CONTROLS ONLY (no dots, no counter) */}
              <div style={{ display: "flex", gap: "14px" }}>
                <button
                  onClick={prevSlide}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "11px",
                    border: `1.5px solid ${C.border}`,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ←
                </button>

                <button
                  onClick={next}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "11px",
                    border: `1.5px solid ${C.border}`,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* IMAGE (more space top & bottom) */}
          <div style={{ position: "relative", padding: isMobile ? "0 24px 40px" : "50px 0", display: isMobile ? "flex" : "block", justifyContent: "center" }}>
           <img
  src={sl.image}
  alt=""
  style={{
    width: isMobile ? "100%" : "100%",
    maxWidth: isMobile ? "400px" : "none",
    height: isMobile ? "240px" : "420px",
    objectFit: "cover",
    borderRadius: "22px",
  }}
/>

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.2), transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── ABOUT ───────────────────────────────────────────────────────────────────
function About({ aboutRef }) {
  const { width } = useWindowSize()
  const isMobile = width < 900

  const cards = [
    { title:"Blockchain Verified", body:"Every transaction is sealed on Stellar, publicly verifiable, permanently immutable, zero trust required.", accent:C.green, lite:C.greenLite, bdr:C.greenBdr },
    { title:"M-Pesa Native",       body:"Safaricom M-Pesa deposits arrive automatically. Members pay the way they already do.", accent:C.goldMid, lite:C.goldLite, bdr:C.goldBdr },
    { title:"Role-Based Access",   body:"Members, cashiers, and admins each see exactly what they need. Staff access codes protect elevated functions.", accent:C.green, lite:C.greenLite, bdr:C.greenBdr },
    { title:"Instant SMS Proof",   body:"Every confirmed transaction sends an SMS to the member with a Stellar hash link they can verify independently.", accent:C.goldMid, lite:C.goldLite, bdr:C.goldBdr },
  ]
  return (
    <section ref={aboutRef} style={{ background:C.surfaceBg, padding: isMobile ? "60px 24px" : "100px 64px", borderTop:`1px solid ${C.border}` }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom: isMobile ? "40px" : "60px" }}>
          <h2 style={{ fontSize: isMobile ? "32px" : "42px", fontWeight:900, color:C.textHi, margin:"0 0 16px", fontFamily:C.font, letterSpacing:"-0.5px" }}>
            Built for Kenya's <span style={{color:C.green}}>Cooperative Sector</span>
          </h2>
          <p style={{ fontSize:"17px", color:C.textMid, maxWidth:"560px", margin:"0 auto", lineHeight:1.65, fontFamily:C.font }}>
            Over 30,000 SACCOs manage KES 2 trillion in savings. SenteChain makes every shilling permanently verifiable for members who have no other way to check.
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap:"20px" }}>
          {cards.map(c => (
            <div key={c.title} style={{ background:"linear-gradient(180deg, #e9e4e4 0%, #f9fafb 100%)", border:`1px solid ${C.border}`, borderRadius:"20px", padding:"28px 24px", position:"relative", overflow:"hidden", transition:"all 0.25s ease", cursor:"default" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px) scale(1.02)";e.currentTarget.style.boxShadow=`0 18px 50px ${c.accent}25`;e.currentTarget.style.borderColor=c.bdr}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border}}>
              <div style={{ position:"absolute", top:"-40px", right:"-40px", width:"120px", height:"120px", background:c.lite, borderRadius:"50%", filter:"blur(30px)", opacity:0.6 }} />
              <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:c.accent, marginBottom:"18px", boxShadow:`0 0 12px ${c.accent}80` }} />
              <p style={{ fontSize:"17px", fontWeight:900, color:C.textHi, margin:"0 0 10px", fontFamily:C.font }}>{c.title}</p>
              <p style={{ fontSize:"14px", color:C.textMid, lineHeight:1.7, margin:0, fontFamily:C.font }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA SECTION ─────────────────────────────────────────────────────────────
function CTA({ ctaRef }) {
  const navigate = useNavigate()
  const { width } = useWindowSize()
  const isMobile = width < 900

  const points = [
    { accent:C.green,   text:"Every deposit sealed on Stellar in under 10 seconds" },
    { accent:C.goldMid, text:"M-Pesa payments matched to member accounts automatically" },
    { accent:C.green,   text:"Members verify their own records from any phone" },
    { accent:C.goldMid, text:"Cashiers approve loans with full repayment schedules" },
    { accent:C.green,   text:"Admins register members, assign roles, and view audit logs" },
    { accent:C.goldMid, text:"Public ledger accessible to regulators without any login" },
  ]

  return (
    <section ref={ctaRef} style={{ background:`linear-gradient(135deg, ${C.greenDark} 0%, #1a4731 50%, #1f3a20 100%)`, padding: isMobile ? "70px 24px" : "100px 64px", position:"relative", overflow:"hidden" }}>
      {/* Decorative blobs */}
      <div style={{ position:"absolute", top:"-100px", right:"-100px", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-80px", left:"-80px", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:"1100px", margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "60px" : "80px", alignItems:"center" }}>

          {/* Left — headline + buttons */}
          <div>
            <h2 style={{ fontSize: isMobile ? "36px" : "48px", fontWeight:900, color:"#ffffff", margin:"0 0 18px", lineHeight:1.1, fontFamily:C.font, letterSpacing:"-1px" }}>
              Give your SACCO<br />
              <span style={{ color:"#fcd34d" }}>the transparency</span><br />
              it deserves
            </h2>

            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.72)", lineHeight:1.68, margin:"0 0 40px", fontFamily:C.font }}>
              SenteChain replaces paper ledgers and spreadsheets with a tamper-proof, blockchain-backed system that every member can verify independently. No technical knowledge required, just a phone.
            </p>

            <div style={{ display:"flex", gap:"14px", flexWrap:"wrap", flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={() => navigate("/auth?tab=signup")} style={{
                padding:"16px 36px", borderRadius:"11px", fontFamily:C.font,
                fontSize:"16px", fontWeight:800, cursor:"pointer",
                background:"#ffffff", color:C.greenDark,
                border:"none", transition:"all 0.18s",
                boxShadow:"0 4px 24px rgba(0,0,0,0.25)",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.greenLite;e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.background="#ffffff";e.currentTarget.style.transform="translateY(0)"}}>
                Get Started for Free
              </button>
              <button onClick={() => navigate("/auth?tab=signup")} style={{
                padding:"16px 36px", borderRadius:"11px", fontFamily:C.font,
                fontSize:"16px", fontWeight:700, cursor:"pointer",
                background:"transparent", color:"#ffffff",
                border:"1.5px solid rgba(255,255,255,0.35)",
                transition:"all 0.18s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.70)";e.currentTarget.style.background="rgba(255,255,255,0.08)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.35)";e.currentTarget.style.background="transparent"}}>
                Sign Up Your SACCO
              </button>
            </div>
          </div>

          {/* Right — feature checklist */}
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {points.map((p,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:"16px",
                padding:"18px 22px", borderRadius:"14px",
                background:"rgba(255,255,255,0.07)",
                border:"1px solid rgba(255,255,255,0.10)",
                backdropFilter:"blur(8px)",
                transition:"background 0.18s, border-color 0.18s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.borderColor="rgba(255,255,255,0.20)"}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.borderColor="rgba(255,255,255,0.10)"}}>
                {/* Checkmark */}
                <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:p.accent, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 12px ${p.accent}55` }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize:"16px", fontWeight:600, color:"rgba(255,255,255,0.88)", margin:0, fontFamily:C.font, lineHeight:1.4 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ──────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear()
  const { width } = useWindowSize()
  const isMobile = width < 900

  return (
    <footer style={{ background:C.greenDark, color:"#fff" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding: isMobile ? "50px 24px 30px" : "64px 64px 36px" }}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", gap: isMobile ? "40px" : "48px", marginBottom:"56px" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"10px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.20)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ display:"flex" }}>
                  <div style={{ width:"7px", height:"12px", borderRadius:"3px", border:"2px solid #4ade80" }} />
                  <div style={{ width:"7px", height:"12px", borderRadius:"3px", border:"2px solid #4ade80", marginLeft:"-2px" }} />
                </div>
              </div>
              <span style={{ fontSize:"18px", fontWeight:900, letterSpacing:"4px", fontFamily:C.font }}>
                <span style={{color:"#fff"}}>SENTE</span><span style={{color:"#fcd34d"}}>CHAIN</span>
              </span>
            </div>
            <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.65)", lineHeight:1.65, maxWidth:"260px", margin:"0 0 20px", fontFamily:C.font }}>
              Blockchain-powered financial transparency for Kenya's 30,000 SACCOs. Every shilling, permanently verifiable.
            </p>
          </div>
          {(isMobile ? [
            {title:"Platform", links:["Member Dashboard","Cashier Portal","Admin Dashboard","Public Ledger"]},
          ] : [
            {title:"Platform", links:["Member Dashboard","Cashier Portal","Admin Dashboard","Public Ledger"]},
            {title:"Company",  links:["About","Contact Us","Blog","Careers"]},
            {title:"Resources",links:["Stellar Network","Safaricom M-Pesa","Africa's Talking"]},
          ]).map(col => (
            <div key={col.title}>
              <p style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"16px", fontFamily:C.fontMono }}>{col.title}</p>
              <div style={{ display: isMobile ? "grid" : "block", gridTemplateColumns: isMobile ? "1fr 1fr" : "none", gap: isMobile ? "10px" : "0" }}>
                {col.links.map(l => (
                  <p key={l} style={{ fontSize:"14px", color:"rgba(255,255,255,0.65)", margin: isMobile ? "0" : "0 0 10px", fontFamily:C.font, cursor:"pointer", transition:"color 0.18s" }}
                    onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                    onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}>{l}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height:"1px", background:"rgba(255,255,255,0.10)", marginBottom:"28px" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"14px", flexDirection: isMobile ? "column" : "row", textAlign: isMobile ? "center" : "left" }}>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.45)", fontFamily:C.fontMono, margin:0 }}>
            &copy; {year} SenteChain. Built on{" "}
            <span style={{color:"#4ade80"}}>Stellar Blockchain</span>.
          </p>
          <div style={{ display:"flex", gap:"20px", flexWrap:"wrap", justifyContent:"center" }}>
            {["Privacy","Terms","Data"].map(l => (
              <span key={l} style={{ fontSize:"13px", color:"rgba(255,255,255,0.40)", cursor:"pointer", fontFamily:C.fontMono, transition:"color 0.18s" }}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.75)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.40)"}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── ROOT ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef    = useRef(null)
  const sliderRef  = useRef(null)
  const aboutRef   = useRef(null)
  const ctaRef     = useRef(null)

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior:"smooth", block:"start" })

  return (
    <div style={{ background:C.pageBg, fontFamily:C.font, minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #ffffff; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input::placeholder, textarea::placeholder { color: #9ca3af; }

        /* Slider animations — slide in from right */
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0%);   }
        }
        /* Slide in from left */
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0%);    }
        }
        /* Outgoing slide exits to left */
        @keyframes slideOutLeft {
          from { transform: translateX(0%);    }
          to   { transform: translateX(-100%); }
        }
        /* Outgoing slide exits to right */
        @keyframes slideOutRight {
          from { transform: translateX(0%);   }
          to   { transform: translateX(100%); }
        }
      `}</style>

      <Navbar
        onHome={       () => scrollTo(heroRef)   }
        onFeatures={   () => scrollTo(sliderRef) }
        onAbout={      () => scrollTo(aboutRef)  }
        onGetStarted={ () => scrollTo(ctaRef)    }
      />
      <Hero heroRef={heroRef} />
      <Slider sliderRef={sliderRef} />
      <About aboutRef={aboutRef} />
      <CTA ctaRef={ctaRef} />
      <Footer />
    </div>
  )
}