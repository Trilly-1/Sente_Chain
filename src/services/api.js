export const BASE_URL = import.meta.env.VITE_API_URL || "https://api.sentechain.app"
const USE_DEMO = true

let _token = null
export const setToken   = (t) => { _token = t }
export const clearToken = ()  => { _token = null }
export const getToken   = ()  => _token

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) }
  if (_token) headers["Authorization"] = `Bearer ${_token}`
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || "Request failed")
  }
  return res.json()
}

export async function apiLogin({ phone, pin, role_code }) {
  if (USE_DEMO) {
    const { DEMO_USERS } = await import("../data/demo")
    await new Promise(r => setTimeout(r, 700))
    const cleaned = phone.replace(/\s/g, "")
    const user = role_code
      ? DEMO_USERS.find(u => u.phone === cleaned && u.pin === pin && u.role_code === role_code && u.role !== "member")
      : DEMO_USERS.find(u => u.phone === cleaned && u.pin === pin && u.role === "member")
    if (!user) throw new Error(role_code ? "Invalid credentials or access code." : "Invalid phone number or PIN.")
    return { token: "demo-token", ...user }
  }
  return apiFetch("/auth/login", { method:"POST", body:JSON.stringify({ phone, pin, role_code }) })
}

export async function apiRegister({ name, phone, role = "member", saccoId = "SACCO01" }) {
  if (USE_DEMO) { 
    await new Promise(r => setTimeout(r, 900)); 
    return { 
      token: "demo-token", 
      member_id: "MBR_NEW", 
      name, 
      phone, 
      role, 
      sacco_id: saccoId, 
      status: "pending_kyc", 
      balance_kes: 0 
    } 
  }
  return apiFetch("/members", { method:"POST", body:JSON.stringify({ name, phone, role, saccoId }) })
}

export async function apiGetTransactions(memberId) {
  if (USE_DEMO) {
    const { DEMO_TRANSACTIONS } = await import("../data/demo")
    return DEMO_TRANSACTIONS[memberId] || []
  }
  return apiFetch(`/members/${memberId}/transactions`)
}

export async function apiGetMembers() {
  if (USE_DEMO) {
    const { DEMO_MEMBERS } = await import("../data/demo")
    return DEMO_MEMBERS
  }
  return apiFetch("/members")
}

export async function apiUpdateMemberRole(memberId, role) {
  if (USE_DEMO) { await new Promise(r => setTimeout(r, 300)); return { success:true } }
  return apiFetch(`/members/${memberId}/role`, { method:"PATCH", body:JSON.stringify({ role }) })
}

export async function apiUpdateMemberStatus(memberId, status) {
  if (USE_DEMO) { await new Promise(r => setTimeout(r, 300)); return { success:true } }
  return apiFetch(`/members/${memberId}/status`, { method:"PATCH", body:JSON.stringify({ status }) })
}

export async function apiGetLoans() {
  if (USE_DEMO) {
    const { LOAN_APPLICATIONS } = await import("../data/demo")
    return LOAN_APPLICATIONS
  }
  return apiFetch("/loans")
}

export async function apiApproveLoan(loanId) {
  if (USE_DEMO) { await new Promise(r => setTimeout(r, 600)); return { success:true } }
  return apiFetch(`/loans/${loanId}/approve`, { method:"POST" })
}

export async function apiRejectLoan(loanId) {
  if (USE_DEMO) { await new Promise(r => setTimeout(r, 400)); return { success:true } }
  return apiFetch(`/loans/${loanId}/reject`, { method:"POST" })
}

export async function apiGetSaccoSummary(saccoId) {
  if (USE_DEMO) {
    const { SACCO_TOTALS, SACCO_INFO } = await import("../data/demo")
    return { ...SACCO_TOTALS, ...SACCO_INFO }
  }
  return apiFetch(`/sacco/${saccoId}/summary`)
}

export async function apiGetAuditLog() {
  if (USE_DEMO) {
    const { AUDIT_LOG } = await import("../data/demo")
    return AUDIT_LOG
  }
  return apiFetch("/audit")
}

export async function apiContact({ name, email, message }) {
  if (USE_DEMO) { await new Promise(r => setTimeout(r, 600)); return { success:true } }
  return apiFetch("/contact", { method:"POST", body:JSON.stringify({ name, email, message }) })
}

export async function apiHealth() {
  if (USE_DEMO) return { status:"ok", mode:"demo" }
  return apiFetch("/health")
}