import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { apiRegister } from "../services/api"
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

const C = {
  green: "#15803d", greenMid: "#16a34a", greenLite: "#dcfce7", greenBdr: "#bbf7d0", greenDark: "#14532d",
  gold: "#b45309", goldMid: "#d97706", goldLite: "#fef3c7", goldBdr: "#fde68a",
  textHi: "#0a0a0a", textMid: "#374151", textDim: "#6b7280",
  border: "#e5e7eb", surface: "#f9fafb",
  font: "'DM Sans', sans-serif"
}

const inpStyle = {
  width: "100%", padding: "14px", borderRadius: "10px", border: `1.5px solid ${C.border}`,
  fontSize: "15px", fontFamily: C.font, outline: "none", transition: "all 0.2s",
  color: C.textHi, background: "#ffffff"
}

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: C.textDim, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    {children}
  </label>
)

export default function SACCORegistration() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 768
  const [step, setStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [country, setCountry] = useState(EAC_COUNTRIES[0])
  const [formData, setFormData] = useState({
    name: "", type: "Deposit-taking",
    address: "", phone: "", email: "",
    chairmanName: "", chairmanID: "", chairmanVerified: false, chairmanImage: null,
    secretaryName: "", secretaryID: "", secretaryVerified: false, secretaryImage: null,
  })

  const [adminData, setAdminData] = useState({
    name: "", phoneNo: "", pin: "", showPin: false
  })

  const [activeCamera, setActiveCamera] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const startCamera = async (type) => {
    setActiveCamera(type)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Camera error:", err)
      alert("Could not access camera. Please ensure you have given permission.")
      setActiveCamera(null)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
    setActiveCamera(null)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d").drawImage(video, 0, 0)
      const img = canvas.toDataURL("image/png")
      if (activeCamera === 'chairman') {
        setFormData({ ...formData, chairmanImage: img, chairmanVerified: true })
      } else {
        setFormData({ ...formData, secretaryImage: img, secretaryVerified: true })
      }
      stopCamera()
    }
  }

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const next = async () => {
    const newErrors = {}
    if (step === 1) {
      if (!adminData.name) newErrors.adminName = "Full name is required"
      if (!adminData.phoneNo) newErrors.adminPhone = "Phone number is required"
      if (!adminData.pin) newErrors.adminPin = "PIN is required"
      
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setLoading(true)
      try {
        const fullPhone = country.prefix + adminData.phoneNo.replace(/^0+/, "")
        const user = await apiRegister({ name: adminData.name, phone: fullPhone, role: "admin", pin: adminData.pin })
        login(user)
        setStep(s => s + 1)
      } catch (err) {
        setErrors({ form: err.message || "Registration failed" })
      } finally {
        setLoading(false)
      }
    } else if (step === 2) {
      if (!formData.name) newErrors.saccoName = "SACCO name is required"
      if (!formData.type) newErrors.saccoType = "SACCO type is required"
      
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setStep(s => s + 1)
    } else if (step === 3) {
      if (!formData.address) newErrors.address = "Address is required"
      if (!formData.phone) newErrors.phone = "Phone number is required"
      
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setStep(s => s + 1)
    } else if (step === 5) {
      if (!formData.chairmanName) newErrors.chairmanName = "Required"
      if (!formData.chairmanID) newErrors.chairmanID = "Required"
      if (!formData.secretaryName) newErrors.secretaryName = "Required"
      if (!formData.secretaryID) newErrors.secretaryID = "Required"
      if (!formData.chairmanVerified) newErrors.chairmanVerified = "Verification required"
      if (!formData.secretaryVerified) newErrors.secretaryVerified = "Verification required"
      
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setStep(s => s + 1)
    } else {
      setStep(s => s + 1)
    }
  }
  const prev = () => setStep(s => s - 1)

  const steps = [
    { id: 1, title: "Admin", sub: "Create chairman account" },
    { id: 2, title: "Identity", sub: "Legal SACCO details" },
    { id: 3, title: "Contact", sub: "Location & reach" },
    { id: 4, title: "Documents", sub: "Compliance uploads" },
    { id: 5, title: "Officials", sub: "Key board members" },
    { id: 6, title: "Verify", sub: "Final submission" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: C.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#ffffff", borderBottom: `1px solid ${C.border}`,
        boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 40px", height: "72px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/image10.png" alt="Logo" style={{ height: isMobile ? "38px" : "48px", objectFit: "contain" }} />
          <span style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: 900, letterSpacing: isMobile ? "1px" : "2px", fontFamily: C.font }}>
            <span style={{ color: C.textHi }}>SENTE</span><span style={{ color: C.goldMid }}>CHAIN</span>
          </span>
        </div>
        <button onClick={() => navigate("/")} style={{
          padding: isMobile ? "7px 12px" : "10px 18px",
          fontSize: isMobile ? "12px" : "15px",
          borderRadius: "10px",
          border: "none",
          background: C.green,
          color: "#fff",
          fontWeight: 800,
          fontFamily: C.font,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap"
        }}
          onMouseEnter={e => e.currentTarget.style.background = C.greenDark}
          onMouseLeave={e => e.currentTarget.style.background = C.green}>
          Home
        </button>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "40px" }}>
          <h1 style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: 900, color: C.textHi, marginBottom: "8px" }}>Register Your SACCO</h1>
          <p style={{ color: C.textMid, margin: 0, fontSize: isMobile ? "14px" : "16px" }}>Join SenteChain to digitize your records on the blockchain.</p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: isMobile ? "24px" : "40px", position: "relative" }}>
          <div style={{ position: "absolute", top: "20px", left: "0", right: "0", height: "2px", background: C.border, zIndex: 0 }} />
          {steps.map(s => (
            <div key={s.id} style={{ position: "relative", zIndex: 1, textAlign: "center", width: "20%" }}>
              <div style={{
                width: isMobile ? "32px" : "40px", height: isMobile ? "32px" : "40px", borderRadius: "50%", background: step >= s.id ? C.green : "#fff",
                border: `2px solid ${step >= s.id ? C.green : C.border}`, color: step >= s.id ? "#fff" : C.textDim,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontWeight: 700,
                transition: "all 0.3s", fontSize: isMobile ? "12px" : "14px"
              }}>
                {step > s.id ? "✓" : s.id}
              </div>
              {!isMobile && <p style={{ fontSize: "12px", fontWeight: 700, color: step >= s.id ? C.green : C.textDim, margin: 0 }}>{s.title}</p>}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div style={{ background: "#fff", borderRadius: isMobile ? "16px" : "24px", padding: isMobile ? "16px" : "40px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", border: `1px solid ${C.border}` }}>
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px", color: C.textHi }}>Create Admin Account</h2>
              <p style={{ color: C.textDim, fontSize: "14px", marginBottom: "20px" }}>Register as the SACCO Chairman to proceed with the onboarding process.</p>
              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <Label>Full Name</Label>
                  <input style={{ ...inpStyle, borderColor: errors.adminName ? "#dc2626" : C.border }} placeholder="e.g. Sarah Wanjiku" value={adminData.name} onChange={e => { setAdminData({ ...adminData, name: e.target.value }); setErrors({...errors, adminName: null}) }} />
                  {errors.adminName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminName}</span>}
                </div>
                <div>
                  <Label>Country & Phone</Label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select value={country.code} onChange={(e) => setCountry(EAC_COUNTRIES.find(c => c.code === e.target.value))} style={{ ...inpStyle, width: "100px", padding: "14px 8px", cursor: "pointer" }}>
                      {EAC_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.prefix}</option>)}
                    </select>
                    <div style={{ flex: 1 }}>
                      <input style={{ ...inpStyle, borderColor: errors.adminPhone ? "#dc2626" : C.border }} type="tel" placeholder="700 000 000" value={adminData.phoneNo} onChange={e => { setAdminData({ ...adminData, phoneNo: e.target.value.replace(/[^0-9]/g, "") }); setErrors({...errors, adminPhone: null}) }} />
                      {errors.adminPhone && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminPhone}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Create PIN (4 Digits)</Label>
                  <div style={{ position: "relative" }}>
                    <input type={adminData.showPin ? "text" : "password"} value={adminData.pin} onChange={e => { setAdminData({ ...adminData, pin: e.target.value }); setErrors({...errors, adminPin: null}) }} placeholder="4-digit PIN" maxLength={4} style={{ ...inpStyle, paddingRight: "60px", letterSpacing: "7px", fontSize: "20px", borderColor: errors.adminPin ? "#dc2626" : C.border }} />
                    <button type="button" onClick={() => setAdminData(prev => ({ ...prev, showPin: !prev.showPin }))} tabIndex={-1} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: C.green, fontFamily: C.font, fontWeight: 700, letterSpacing: "1px" }}>
                      {adminData.showPin ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {errors.adminPin && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminPin}</span>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px", color: C.textHi }}>SACCO Legal Identity</h2>
              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <Label>SACCO Legal Name</Label>
                  <input style={{ ...inpStyle, borderColor: errors.saccoName ? "#dc2626" : C.border }} placeholder="e.g. Starlight Savings & Credit" value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors({...errors, saccoName: null}) }} />
                  {errors.saccoName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.saccoName}</span>}
                </div>
                <div>
                  <Label>SACCO Type</Label>
                  <select style={{ ...inpStyle, borderColor: errors.saccoType ? "#dc2626" : C.border }} value={formData.type} onChange={e => { setFormData({ ...formData, type: e.target.value }); setErrors({...errors, saccoType: null}) }}>
                    <option>Deposit-taking</option>
                    <option>Non-deposit taking</option>
                    <option>Community-based</option>
                  </select>
                  {errors.saccoType && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.saccoType}</span>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px", color: C.textHi }}>Contact & Location</h2>
              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <Label>Headquarters Address</Label>
                  <input style={{ ...inpStyle, borderColor: errors.address ? "#dc2626" : C.border }} placeholder="Street, Building, Floor" value={formData.address} onChange={e => { setFormData({ ...formData, address: e.target.value }); setErrors({...errors, address: null}) }} />
                  {errors.address && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.address}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px" }}>
                  <div>
                    <Label>Official Phone</Label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select
                        value={country.code}
                        onChange={(e) => setCountry(EAC_COUNTRIES.find(c => c.code === e.target.value))}
                        style={{ ...inpStyle, width: "100px", padding: "14px 8px" }}
                      >
                        {EAC_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.prefix}</option>
                        ))}
                      </select>
                      <div style={{ flex: 1 }}>
                        <input style={{ ...inpStyle, borderColor: errors.phone ? "#dc2626" : C.border }} placeholder="700 000 000" value={formData.phone} onChange={e => { setFormData({ ...formData, phone: e.target.value }); setErrors({...errors, phone: null}) }} />
                        {errors.phone && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div><Label>Official Email</Label><input style={inpStyle} placeholder="info@sacco.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px", color: C.textHi }}>Document Uploads</h2>
              <p style={{ color: C.textDim, fontSize: "14px", marginBottom: "20px" }}>Please upload clear PDF or Image scans of your official documents.</p>
              <div style={{ display: "grid", gap: "16px" }}>
                {["Registration Certificate", "Operational License", "TIN/PIN Certificate"].map(doc => (
                  <div key={doc} style={{ padding: "20px", border: `2px dashed ${C.border}`, borderRadius: "12px", textAlign: "center", cursor: "pointer", background: "#fff" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.green} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: C.textHi }}>Upload {doc}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: C.textMid }}>Max size 5MB (PDF, PNG, JPG)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 800, marginBottom: isMobile ? "16px" : "24px" }}>Key Officials Verification</h2>
              <div style={{ display: "grid", gap: isMobile ? "16px" : "24px" }}>
                <div style={{ padding: isMobile ? "16px" : "20px", background: C.surface, borderRadius: "12px", border: errors.chairmanVerified ? "1px solid #dc2626" : "none" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", color: C.green }}>Chairman Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <Label>Full Name</Label>
                      <input style={{ ...inpStyle, borderColor: errors.chairmanName ? "#dc2626" : C.border }} placeholder="Name" value={formData.chairmanName} onChange={e => { setFormData({ ...formData, chairmanName: e.target.value }); setErrors({...errors, chairmanName: null}) }} />
                      {errors.chairmanName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.chairmanName}</span>}
                    </div>
                    <div>
                      <Label>National ID Number</Label>
                      <input style={{ ...inpStyle, borderColor: errors.chairmanID ? "#dc2626" : C.border }} placeholder="ID Number" value={formData.chairmanID} onChange={e => { setFormData({ ...formData, chairmanID: e.target.value }); setErrors({...errors, chairmanID: null}) }} />
                      {errors.chairmanID && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.chairmanID}</span>}
                    </div>
                  </div>
                  <div>
                    <Label>Liveliness Check</Label>
                    {!formData.chairmanVerified ? (
                      activeCamera === 'chairman' ? (
                        <div style={{ position: "relative", width: "100%", aspectRatio: isMobile ? "3/4" : "4/3", background: "#000", borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
                          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)", width: isMobile ? "60%" : "160px", height: isMobile ? "60%" : "200px", border: "2px dashed rgba(255,255,255,0.6)", borderRadius: "200px" }} />
                          <button type="button" onClick={() => { capturePhoto(); setErrors({...errors, chairmanVerified: null}) }} style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", width: "48px", height: "48px", borderRadius: "50%", background: "#fff", border: `4px solid ${C.green}`, cursor: "pointer", boxShadow: "0 0 0 4px rgba(255,255,255,0.3)", zIndex: 10 }} />
                          <button type="button" onClick={stopCamera} style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>✕</button>
                        </div>
                      ) : (
                        <div>
                          <button type="button" onClick={() => startCamera('chairman')} style={{ ...inpStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fff", borderColor: errors.chairmanVerified ? "#dc2626" : C.border, color: C.textHi, cursor: "pointer", fontWeight: 700 }}>
                            Start Face Verification
                          </button>
                          {errors.chairmanVerified && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.chairmanVerified}</span>}
                        </div>
                      )
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${C.greenBdr}`, background: C.greenLite }}>
                        <img src={formData.chairmanImage} alt="Chairman" style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.green}` }} />
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: 800, color: C.greenDark, fontSize: "14px" }}>✓ Verified</p>
                          <button type="button" onClick={() => setFormData({...formData, chairmanVerified: false, chairmanImage: null})} style={{ background: "none", border: "none", color: C.green, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0 }}>Retake Photo</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: isMobile ? "16px" : "20px", background: C.surface, borderRadius: "12px", border: errors.secretaryVerified ? "1px solid #dc2626" : "none" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", color: C.green }}>Secretary Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <Label>Full Name</Label>
                      <input style={{ ...inpStyle, borderColor: errors.secretaryName ? "#dc2626" : C.border }} placeholder="Name" value={formData.secretaryName} onChange={e => { setFormData({ ...formData, secretaryName: e.target.value }); setErrors({...errors, secretaryName: null}) }} />
                      {errors.secretaryName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.secretaryName}</span>}
                    </div>
                    <div>
                      <Label>National ID Number</Label>
                      <input style={{ ...inpStyle, borderColor: errors.secretaryID ? "#dc2626" : C.border }} placeholder="ID Number" value={formData.secretaryID} onChange={e => { setFormData({ ...formData, secretaryID: e.target.value }); setErrors({...errors, secretaryID: null}) }} />
                      {errors.secretaryID && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.secretaryID}</span>}
                    </div>
                  </div>
                  <div>
                    <Label>Liveliness Check</Label>
                    {!formData.secretaryVerified ? (
                      activeCamera === 'secretary' ? (
                        <div style={{ position: "relative", width: "100%", aspectRatio: isMobile ? "3/4" : "4/3", background: "#000", borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
                          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)", width: isMobile ? "60%" : "160px", height: isMobile ? "60%" : "200px", border: "2px dashed rgba(255,255,255,0.6)", borderRadius: "200px" }} />
                          <button type="button" onClick={() => { capturePhoto(); setErrors({...errors, secretaryVerified: null}) }} style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", width: "48px", height: "48px", borderRadius: "50%", background: "#fff", border: `4px solid ${C.green}`, cursor: "pointer", boxShadow: "0 0 0 4px rgba(255,255,255,0.3)", zIndex: 10 }} />
                          <button type="button" onClick={stopCamera} style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>✕</button>
                        </div>
                      ) : (
                        <div>
                          <button type="button" onClick={() => startCamera('secretary')} style={{ ...inpStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fff", borderColor: errors.secretaryVerified ? "#dc2626" : C.border, color: C.textHi, cursor: "pointer", fontWeight: 700 }}>
                            Start Face Verification
                          </button>
                          {errors.secretaryVerified && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.secretaryVerified}</span>}
                        </div>
                      )
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${C.greenBdr}`, background: C.greenLite }}>
                        <img src={formData.secretaryImage} alt="Secretary" style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.green}` }} />
                        <div>
                          <p style={{ margin: "0 0 4px", fontWeight: 800, color: C.greenDark, fontSize: "14px" }}>✓ Verified</p>
                          <button type="button" onClick={() => setFormData({...formData, secretaryVerified: false, secretaryImage: null})} style={{ background: "none", border: "none", color: C.green, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0 }}>Retake Photo</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "80px", height: "80px", background: C.greenLite, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 900, marginBottom: "12px", color: C.textHi }}>Ready for Verification</h2>
              <p style={{ color: C.textMid, lineHeight: 1.6, marginBottom: "32px" }}>
                Please review your SACCO details below. Once submitted, your legal documentation will be verified against regional regulatory standards.
              </p>
              
              <div style={{ textAlign: "left", background: C.surface, padding: "20px", borderRadius: "12px", border: `1px solid ${C.border}`, marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", margin: "0 0 8px", color: C.textHi }}><strong>SACCO:</strong> {formData.name || "N/A"}</p>

                <p style={{ fontSize: "13px", margin: 0, color: C.textHi }}><strong>Chairman:</strong> {formData.chairmanName || "N/A"}</p>
              </div>

              <div style={{ marginTop: "24px", display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", textAlign: "left" }} onClick={() => setAgreed(!agreed)}>
                <div style={{ 
                  width: "20px", height: "20px", borderRadius: "6px", 
                  border: `2px solid ${agreed ? C.green : C.border}`,
                  background: agreed ? C.green : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all 0.2s"
                }}>
                  {agreed && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: C.textMid, lineHeight: 1.5 }}>
                  I confirm that I am an authorized official of this SACCO and I agree to the <span style={{ color: C.green, fontWeight: 700 }}>Terms of Service</span>, <span style={{ color: C.green, fontWeight: 700 }}>Privacy Policy</span>, and regional cooperative regulations.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors.form && (
            <div style={{ marginTop: "24px", padding: "12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "14px", fontWeight: 600, textAlign: "center" }}>
              {errors.form}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "16px", marginTop: "40px" }}>
            {step > 1 && (
              <button onClick={prev} style={{ flex: 1, padding: "16px", borderRadius: "12px", border: `1.5px solid ${C.border}`, background: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Back
              </button>
            )}
            <button
              onClick={step === 6 ? () => navigate("/verification-pending") : next}
              disabled={loading || (step === 6 && !agreed)}
              style={{ 
                flex: 2, padding: "16px", borderRadius: "12px", border: "none", 
                background: (loading || (step === 6 && !agreed)) ? C.border : C.green, 
                color: (loading || (step === 6 && !agreed)) ? C.textDim : "#fff", 
                fontWeight: 800, cursor: (loading || (step === 6 && !agreed)) ? "not-allowed" : "pointer", 
                boxShadow: (loading || (step === 6 && !agreed)) ? "none" : `0 4px 20px ${C.green}44` 
              }}
            >
              {loading ? "Processing..." : (step === 6 ? "Submit Registration" : "Next Step")}
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
