import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { apiRegister, apiCreateSacco, apiUpdateSacco, apiSubmitSacco, apiGetSacco } from "../services/api"
import { UGANDA } from "../data/countries"
import PhoneInput, { toFullPhone, toLocalPhone } from "../components/PhoneInput"

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
  textHi: "#0a0a0a", textMid: "#1f2937", textDim: "#374151",
  border: "#e5e7eb", surface: "#f9fafb",
  font: "'Inter', sans-serif"
}

const inpStyle = {
  width: "100%", padding: "14px", borderRadius: "10px", border: `1.5px solid ${C.border}`,
  fontSize: "15px", fontFamily: C.font, outline: "none", transition: "all 0.2s",
  color: C.textHi, background: "#ffffff"
}

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: C.textDim, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    {children}
  </label>
)

export default function SACCORegistration({ continueSetup = false }) {
  const navigate = useNavigate()
  const { auth, login, updateAuth } = useAuth()
  const { width } = useWindowSize()
  const isMobile = width < 768
  const [step, setStep] = useState(continueSetup ? 2 : 1)
  const [agreed, setAgreed] = useState(false)
  const [country] = useState(UGANDA)
  const [formData, setFormData] = useState({
    name: "", type: "Deposit-taking",
    address: "", phone: "", email: "",
    chairmanName: "", chairmanID: "",
    secretaryName: "", secretaryID: "",
  })

  const [adminData, setAdminData] = useState({
    name: "", email: "", phoneNo: "", pin: "", showPin: false
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [saccoId, setSaccoId] = useState(continueSetup ? auth?.sacco_id || null : null)

  useEffect(() => {
    if (!continueSetup || !auth?.sacco_id) return
    let cancelled = false
    apiGetSacco(auth.sacco_id).then((data) => {
      if (cancelled) return
      const profile = data.profile || {}
      const sacco = data.sacco || {}
      setFormData((prev) => ({
        ...prev,
        name: sacco.name || prev.name,
        type: profile.type || prev.type,
        address: profile.address || "",
        phone: toLocalPhone(profile.phone || ""),
        email: profile.email || "",
        chairmanName: profile.chairman_name || "",
        chairmanID: profile.chairman_id || "",
        secretaryName: profile.secretary_name || "",
        secretaryID: profile.secretary_id || "",
      }))
      if (!profile.address) setStep(3)
      else if (!profile.chairman_name) setStep(4)
      else setStep(5)
    }).catch(() => { if (!cancelled) setStep(2) })
    return () => { cancelled = true }
    // Resume once for an existing draft. A SACCO created later in this form should not reset the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitSaccoApplication = async () => {
    setLoading(true)
    setErrors({})
    try {
      await apiSubmitSacco(saccoId)
      updateAuth({ sacco_id: saccoId, sacco_status: "under_review", role: "admin" })
      if (!continueSetup) navigate("/dashboard")
    } catch (err) {
      setErrors({ form: err.message || "Submission failed" })
    } finally {
      setLoading(false)
    }
  }

  const next = async () => {
    const newErrors = {}
    if (step === 1) {
      if (!adminData.name) newErrors.adminName = "Full name is required"
      if (!adminData.email) newErrors.adminEmail = "Email is required"
      if (!adminData.phoneNo) newErrors.adminPhone = "Phone number is required"
      if (!/^\d{4}$/.test(adminData.pin || "")) newErrors.adminPin = "PIN must be 4 digits"
      
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setLoading(true)
      try {
        const fullPhone = toFullPhone(adminData.phoneNo)
        const user = await apiRegister({ name: adminData.name, email: adminData.email, phone: fullPhone, role: "admin", pin: adminData.pin, country: country.code })
        if (user.requires_email_verification) {
          setErrors({ form: `Check your email (${adminData.email}). After you confirm it, your dashboard will ask you to finish the SACCO setup.` })
          return
        }
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
      setLoading(true)
      try {
        if (saccoId) {
          await apiUpdateSacco(saccoId, { name: formData.name, profile: { type: formData.type } })
        } else {
          const result = await apiCreateSacco({
            name: formData.name,
            country: country.code,
            profile: { type: formData.type },
          })
          const id = result.sacco_id || result.sacco?.sacco_id
          setSaccoId(id)
          updateAuth({ sacco_id: id, sacco_status: "draft", role: "admin" })
        }
        setStep(s => s + 1)
      } catch (err) {
        setErrors({ form: err.message || "Failed to create SACCO draft" })
      } finally {
        setLoading(false)
      }
    } else if (step === 3) {
      if (!formData.address) newErrors.address = "Address is required"
      if (!formData.phone) newErrors.phone = "Phone number is required"
      if (!formData.email || !formData.email.includes("@")) newErrors.email = "Official email is required"
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setLoading(true)
      try {
        const officialPhone = toFullPhone(formData.phone)
        await apiUpdateSacco(saccoId, {
          profile: { address: formData.address, phone: officialPhone, email: formData.email },
        })
        setStep(s => s + 1)
      } catch (err) {
        setErrors({ form: err.message || "Failed to save contact details" })
      } finally {
        setLoading(false)
      }
    } else if (step === 4) {
      if (!formData.chairmanName) newErrors.chairmanName = "Required"
      if (!formData.chairmanID) newErrors.chairmanID = "Required"
      if (!formData.secretaryName) newErrors.secretaryName = "Required"
      if (!formData.secretaryID) newErrors.secretaryID = "Required"

      if (Object.keys(newErrors).length > 0) return setErrors(newErrors)
      setErrors({})
      setLoading(true)
      try {
        await apiUpdateSacco(saccoId, {
          profile: {
            chairman_name: formData.chairmanName,
            chairman_id: formData.chairmanID,
            secretary_name: formData.secretaryName,
            secretary_id: formData.secretaryID,
          },
        })
        setStep(s => s + 1)
      } catch (err) {
        setErrors({ form: err.message || "Failed to save officials" })
      } finally {
        setLoading(false)
      }
    }
  }
  const prev = () => setStep(s => s - 1)

  const steps = [
    { id: 1, title: "Admin", sub: "Create chairman account" },
    { id: 2, title: "Identity", sub: "Legal SACCO details" },
    { id: 3, title: "Contact", sub: "Location & reach" },
    { id: 4, title: "Officials", sub: "Key board members" },
    { id: 5, title: "Verify", sub: "Final submission" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: C.font }}>

      {!continueSetup && <nav style={{
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
      </nav>}

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 20px" }}>
        {/* Header */}
        {!continueSetup && <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "40px" }}>
          <h1 style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: 900, color: C.textHi, marginBottom: "8px" }}>Register Your SACCO</h1>
          <p style={{ color: C.textMid, margin: 0, fontSize: isMobile ? "14px" : "16px" }}>Join SenteChain to digitize your records on the blockchain.</p>
        </div>}

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
                  <input style={{ ...inpStyle, borderColor: errors.adminName ? "#dc2626" : C.border }} placeholder="e.g. Sarah Nambi" value={adminData.name} onChange={e => { setAdminData({ ...adminData, name: e.target.value }); setErrors({...errors, adminName: null}) }} />
                  {errors.adminName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminName}</span>}
                </div>
                <div>
                  <Label>Email</Label>
                  <input type="email" style={{ ...inpStyle, borderColor: errors.adminEmail ? "#dc2626" : C.border }} placeholder="you@example.com" value={adminData.email} onChange={e => { setAdminData({ ...adminData, email: e.target.value }); setErrors({...errors, adminEmail: null}) }} />
                  {errors.adminEmail && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminEmail}</span>}
                </div>
                <div>
                  <Label>Phone (Uganda)</Label>
                  <PhoneInput
                    value={adminData.phoneNo}
                    onChange={(v) => { setAdminData({ ...adminData, phoneNo: v }); setErrors({ ...errors, adminPhone: null }) }}
                  />
                  {errors.adminPhone && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.adminPhone}</span>}
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
                    <PhoneInput
                      value={formData.phone}
                      onChange={(v) => { setFormData({ ...formData, phone: v }); setErrors({ ...errors, phone: null }) }}
                    />
                    {errors.phone && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.phone}</span>}
                  </div>
                  <div>
                    <Label>Official Email</Label>
                    <input style={{ ...inpStyle, borderColor: errors.email ? "#dc2626" : C.border }} placeholder="info@sacco.com" value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: null }) }} />
                    {errors.email && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 800, marginBottom: isMobile ? "16px" : "24px" }}>
                Key Officials Verification
              </h2>
              <div style={{ display: "grid", gap: isMobile ? "16px" : "24px" }}>
                <div style={{ padding: isMobile ? "16px" : "20px", background: C.surface, borderRadius: "12px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", color: C.green }}>Chairman Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
                    <div>
                      <Label>Full Name</Label>
                      <input style={{ ...inpStyle, borderColor: errors.chairmanName ? "#dc2626" : C.border }} placeholder={adminData.name || "Name"} value={formData.chairmanName} onChange={e => { setFormData({ ...formData, chairmanName: e.target.value }); setErrors({...errors, chairmanName: null}) }} />
                      {errors.chairmanName && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.chairmanName}</span>}
                    </div>
                    <div>
                      <Label>National ID Number</Label>
                      <input style={{ ...inpStyle, borderColor: errors.chairmanID ? "#dc2626" : C.border }} placeholder="ID Number" value={formData.chairmanID} onChange={e => { setFormData({ ...formData, chairmanID: e.target.value }); setErrors({...errors, chairmanID: null}) }} />
                      {errors.chairmanID && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 600 }}>{errors.chairmanID}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: isMobile ? "16px" : "20px", background: C.surface, borderRadius: "12px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", color: C.green }}>Secretary Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
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
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "80px", height: "80px", background: C.greenLite, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 900, marginBottom: "12px", color: C.textHi }}>Ready for Verification</h2>
              <p style={{ color: C.textMid, lineHeight: 1.6, marginBottom: "32px" }}>
                Please review your SACCO details below. Once submitted, a project admin will review the application.
              </p>
              
              <div style={{ textAlign: "left", background: C.surface, padding: "20px", borderRadius: "12px", border: `1px solid ${C.border}`, marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", margin: "0 0 8px", color: C.textHi }}><strong>SACCO:</strong> {formData.name || "N/A"} ({formData.type})</p>
                <p style={{ fontSize: "13px", margin: "0 0 8px", color: C.textHi }}><strong>Contact:</strong> {formData.address || "N/A"} · {formData.phone || "N/A"} · {formData.email || "N/A"}</p>
                <p style={{ fontSize: "13px", margin: "0 0 8px", color: C.textHi }}><strong>Chairman:</strong> {formData.chairmanName || "N/A"}</p>
                <p style={{ fontSize: "13px", margin: 0, color: C.textHi }}><strong>Secretary:</strong> {formData.secretaryName || "N/A"}</p>
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
            {step > 1 && !(continueSetup && step === 2) && (
              <button onClick={prev} style={{ flex: 1, padding: "16px", borderRadius: "12px", border: `1.5px solid ${C.border}`, background: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Back
              </button>
            )}
            <button
              onClick={step === 5 ? submitSaccoApplication : next}
              disabled={loading || (step === 5 && !agreed)}
              style={{ 
                flex: 2, padding: "16px", borderRadius: "12px", border: "none", 
                background: (loading || (step === 5 && !agreed)) ? C.border : C.green, 
                color: (loading || (step === 5 && !agreed)) ? C.textDim : "#fff", 
                fontWeight: 800, cursor: (loading || (step === 5 && !agreed)) ? "not-allowed" : "pointer", 
                boxShadow: (loading || (step === 5 && !agreed)) ? "none" : `0 4px 20px ${C.green}44` 
              }}
            >
              {loading ? "Processing..." : (step === 5 ? "Submit Registration" : "Next Step")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
