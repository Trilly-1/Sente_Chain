export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"
export const USE_DEMO = import.meta.env.VITE_USE_DEMO === "true"

const STORAGE_KEY = "sente_auth"

let _token = null
let _saccoId = null

export const setToken = (t) => { _token = t }
export const clearToken = () => { _token = null }
export const getToken = () => _token
export const setSaccoContext = (id) => { _saccoId = id }
export const getSaccoContext = () => _saccoId

export function persistAuth(data) {
  if (!data?.token) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  setToken(data.token)
  if (data.sacco_id) setSaccoContext(data.sacco_id)
}

export function loadPersistedAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.token) {
      setToken(data.token)
      if (data.sacco_id) setSaccoContext(data.sacco_id)
    }
    return data
  } catch {
    return null
  }
}

export function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY)
  clearToken()
  _saccoId = null
}

function unwrap(json) {
  if (json && json.success === false) {
    throw new Error(json.error || "Request failed")
  }
  return json?.data !== undefined ? json.data : json
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) }
  if (_token) headers.Authorization = `Bearer ${_token}`
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || json.message || res.statusText || "Request failed")
  }
  return unwrap(json)
}

export function normalizePhone(phone, defaultPrefix = "+256") {
  let p = (phone || "").replace(/\s/g, "")
  if (p.startsWith("+")) return p
  if (p.startsWith("0")) return defaultPrefix + p.slice(1)
  return defaultPrefix + p
}

function mapAuthUser(data) {
  const u = data.user || data
  const token = data.token || u.token
  return {
    token,
    id: u.id,
    member_id: u.membership_id,
    membership_id: u.membership_id,
    name: u.full_name,
    full_name: u.full_name,
    phone: u.phone,
    country: u.country,
    role: u.is_project_admin ? "project_admin" : (u.role || "member"),
    sacco_id: u.sacco_id,
    status: u.status,
    sacco_status: u.sacco_status,
    is_project_admin: u.is_project_admin,
    balance_kes: 0,
  }
}

function mapTransaction(t) {
  const typeMap = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    loan_disbursement: "Loan",
    loan_repayment: "Repayment",
    transfer: "Transfer",
    fee: "Fee",
    other: "Other",
  }
  const hash = t.stellar_tx_hash || t.stellar_hash
  return {
    id: t.id,
    type: typeMap[t.transaction_type] || t.transaction_type,
    transaction_type: t.transaction_type,
    amount_kes: parseFloat(t.amount) || 0,
    amount: t.amount,
    currency: t.currency,
    recorded_at: t.created_at,
    created_at: t.created_at,
    stellar_tx_hash: hash,
    stellar_hash: hash,
    status: t.status,
    reference: t.reference_number,
    membership_id: t.membership_id,
    member_id: t.membership_id,
    entry_type: "ADMIN",
  }
}

function mapMember(m) {
  return {
    member_id: m.membership_id,
    membership_id: m.membership_id,
    user_id: m.user_id,
    name: m.full_name,
    phone: m.phone,
    role: m.role,
    status: m.status,
    joined: m.joined_at,
  }
}

function mapAuditLog(log) {
  let details = log.details
  if (typeof details === "string") {
    try { details = JSON.parse(details) } catch { /* keep string */ }
  }
  return {
    id: log.id,
    action: log.action,
    actor: log.actor_user_id,
    timestamp: log.created_at,
    details,
    target: typeof details === "object" ? JSON.stringify(details) : String(details || ""),
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function apiHealth() {
  if (USE_DEMO) return { status: "ok", mode: "demo" }
  return apiFetch("/health")
}

export async function apiReady() {
  if (USE_DEMO) return { status: "ready", database: "demo" }
  return apiFetch("/ready")
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin({ phone, pin, countryPrefix = "+256" }) {
  if (USE_DEMO) {
    const { DEMO_USERS } = await import("../data/demo")
    await new Promise((r) => setTimeout(r, 700))
    const cleaned = phone.replace(/\s/g, "")
    const user = DEMO_USERS.find((u) => u.phone === cleaned && u.pin === pin)
    if (!user) throw new Error("Invalid phone number or PIN.")
    return { token: "demo-token", ...user }
  }
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone, countryPrefix), pin }),
  })
  return mapAuthUser(data)
}

export async function apiRegister({ name, phone, role = "member", saccoId, pin, country = "UG" }) {
  if (USE_DEMO) { 
    await new Promise((r) => setTimeout(r, 900))
    return { 
      token: "demo-token", 
      member_id: "MBR_NEW", 
      name, 
      phone, 
      role, 
      sacco_id: saccoId, 
      status: "pending_kyc", 
      balance_kes: 0,
    }
  }
  const body = {
    full_name: name,
    phone: phone.replace(/\s/g, "").startsWith("+") ? phone.replace(/\s/g, "") : normalizePhone(phone),
    pin,
    country,
    role,
  }
  if (saccoId) body.sacco_id = saccoId
  const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) })
  return mapAuthUser(data)
}

export async function apiGetMe() {
  if (USE_DEMO) return loadPersistedAuth()
  const data = await apiFetch("/auth/me")
  return mapAuthUser({ user: data })
}

export async function apiSendOTP(phone) {
  if (USE_DEMO) return { message: "OTP sent", raw_otp: "123456" }
  return apiFetch("/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  })
}

export async function apiVerifyOTP({ phone, code, fullName }) {
  if (USE_DEMO) return { token: "demo-token", user: { id: "1", full_name: fullName, phone } }
  const data = await apiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone), code, full_name: fullName }),
  })
  return mapAuthUser({ token: data.token, user: data.user })
}

// ─── SACCOs (public + onboarding) ─────────────────────────────────────────────

export async function apiListSaccos(country = "UG", name) {
  if (USE_DEMO) {
    const { ALL_SACCOS } = await import("../data/demo")
    let list = ALL_SACCOS.filter((s) => s.country === "UG")
    if (country) list = list.filter((s) => s.country === country)
    if (name) list = list.filter((s) => s.name.toLowerCase().includes(name.toLowerCase()))
    return list
  }
  const params = new URLSearchParams()
  if (country) params.set("country", country)
  if (name) params.set("name", name)
  const q = params.toString() ? `?${params}` : ""
  const data = await apiFetch(`/saccos${q}`)
  return (data.saccos || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    country: s.country || "UG",
  }))
}

export async function apiGetDefaultSaccoId() {
  const list = await apiListSaccos()
  return list[0]?.id || null
}

export async function apiGetSaccoSummary(saccoId) {
  if (USE_DEMO) {
    const { SACCO_TOTALS, SACCO_INFO } = await import("../data/demo")
    return { ...SACCO_TOTALS, ...SACCO_INFO }
  }
  const data = await apiFetch(`/saccos/${saccoId}/public`)
  const recent = (data.recent_transactions || []).map(mapTransaction)
  return {
    id: data.sacco_id,
    name: data.name,
    code: data.code,
    country: data.country,
    active_members: data.active_member_count,
    transaction_count: data.transaction_count,
    anchored_count: data.anchored_count,
    recent_transactions: recent,
    total_deposits: recent
      .filter((t) => t.transaction_type === "deposit")
      .reduce((s, t) => s + t.amount_kes, 0),
    total_loans: 0,
    total_repayments: 0,
  }
}

export async function apiCreateSacco({ name, country, profile }) {
  const data = await apiFetch("/saccos", {
    method: "POST",
    body: JSON.stringify({ name, country, profile }),
  })
  const saccoId = data.sacco?.sacco_id || data.sacco_id
  if (saccoId) setSaccoContext(saccoId)
  return { sacco_id: saccoId, ...data }
}

export async function apiGetSacco(saccoId) {
  return apiFetch(`/saccos/${saccoId}`)
}

export async function apiUpdateSacco(saccoId, payload) {
  return apiFetch(`/saccos/${saccoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function apiUploadSaccoDocuments(saccoId, documents) {
  return apiFetch(`/saccos/${saccoId}/documents`, {
    method: "POST",
    body: JSON.stringify({ documents }),
  })
}

export async function apiSubmitSacco(saccoId) {
  return apiFetch(`/saccos/${saccoId}/submit`, { method: "POST", body: "{}" })
}

export async function apiGetSaccoStatus(saccoId) {
  return apiFetch(`/saccos/${saccoId}/status`)
}

// ─── Member onboarding ────────────────────────────────────────────────────────

export async function apiSubmitMemberKYC(documents) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 800))
    return { status: "under_review" }
  }
  return apiFetch("/members/onboarding/documents", {
    method: "POST",
    body: JSON.stringify({ documents }),
  })
}

export async function apiGetOnboardingStatus() {
  if (USE_DEMO) return { status: "under_review" }
  return apiFetch("/members/onboarding/status")
}

// ─── SACCO staff ops ──────────────────────────────────────────────────────────

export async function apiGetMembers(saccoId, status) {
  if (USE_DEMO) {
    const { DEMO_MEMBERS } = await import("../data/demo")
    return DEMO_MEMBERS
  }
  const id = saccoId || _saccoId
  if (!id) throw new Error("SACCO context is required")
  const q = status ? `?status=${encodeURIComponent(status)}` : ""
  const data = await apiFetch(`/saccos/${id}/members${q}`)
  return (data.members || []).map(mapMember)
}

export async function apiUpdateMemberRole(membershipId, role, saccoId) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 300))
    return { success: true }
  }
  const id = saccoId || _saccoId
  return apiFetch(`/saccos/${id}/members/${membershipId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
}

export async function apiUpdateMemberStatus(membershipId, status, saccoId) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 300))
    return { success: true }
  }
  const id = saccoId || _saccoId
  const path =
    status === "suspended"
      ? `/saccos/${id}/members/${membershipId}/suspend`
      : `/saccos/${id}/members/${membershipId}/activate`
  return apiFetch(path, { method: "PATCH", body: JSON.stringify({}) })
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function apiListTransactions(filters = {}) {
  if (USE_DEMO) {
    const { DEMO_TRANSACTIONS } = await import("../data/demo")
    const mid = filters.membershipId || filters.memberId
    return mid ? (DEMO_TRANSACTIONS[mid] || []) : Object.values(DEMO_TRANSACTIONS).flat()
  }
  const params = new URLSearchParams()
  if (filters.saccoId) params.set("sacco_id", filters.saccoId)
  if (filters.membershipId || filters.memberId) {
    params.set("membership_id", filters.membershipId || filters.memberId)
  }
  if (filters.status) params.set("status", filters.status)
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.offset) params.set("offset", String(filters.offset))
  const q = params.toString() ? `?${params}` : ""
  const data = await apiFetch(`/transactions${q}`)
  const list = data.transactions || data || []
  return (Array.isArray(list) ? list : []).map(mapTransaction)
}

export async function apiGetTransactions(membershipId, saccoId) {
  return apiListTransactions({
    membershipId,
    saccoId: saccoId || _saccoId,
    limit: 100,
  })
}

export async function apiGetTransaction(transactionId) {
  const data = await apiFetch(`/transactions/${transactionId}`)
  return mapTransaction(data)
}

export async function apiCreateTransaction(payload) {
  const data = await apiFetch("/transactions", {
    method: "POST",
    body: JSON.stringify({
      sacco_id: payload.saccoId,
      membership_id: payload.membershipId,
      transaction_type: payload.transactionType || "deposit",
      amount: payload.amount,
      currency: payload.currency || "UGX",
      description: payload.description,
    }),
  })
  return mapTransaction(data)
}

export async function apiAnchorTransaction(transactionId) {
  const data = await apiFetch(`/transactions/${transactionId}/anchor`, {
    method: "POST",
    body: JSON.stringify({}),
  })
  return mapTransaction(data)
}

export async function apiVerifyTransaction(transactionId) {
  return apiFetch(`/transactions/${transactionId}/verify`)
}

// ─── Project admin ────────────────────────────────────────────────────────────

export async function apiGetPendingMembers() {
  if (USE_DEMO) return []
  const data = await apiFetch("/admin/members/pending")
  return data.members || []
}

export async function apiApproveMember(membershipId) {
  return apiFetch(`/admin/members/${membershipId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
}

export async function apiRejectMember(membershipId, reason) {
  return apiFetch(`/admin/members/${membershipId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  })
}

export async function apiGetPendingSaccos() {
  if (USE_DEMO) return []
  const data = await apiFetch("/admin/saccos/pending")
  return data.saccos || []
}

export async function apiApproveSacco(saccoId) {
  return apiFetch(`/admin/saccos/${saccoId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
}

export async function apiRejectSacco(saccoId, reason) {
  return apiFetch(`/admin/saccos/${saccoId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  })
}

export async function apiGetAuditLog(limit = 50, offset = 0) {
  if (USE_DEMO) {
    const { AUDIT_LOG } = await import("../data/demo")
    return AUDIT_LOG
  }
  const data = await apiFetch(`/admin/audit-logs?limit=${limit}&offset=${offset}`)
  return (data.logs || []).map(mapAuditLog)
}

// ─── Stubs (no backend yet) ───────────────────────────────────────────────────

export async function apiGetLoans() {
  if (USE_DEMO) {
    const { LOAN_APPLICATIONS } = await import("../data/demo")
    return LOAN_APPLICATIONS
  }
  return []
}

export async function apiApproveLoan() {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    return { success: true }
  }
  throw new Error("Loans API is not available yet")
}

export async function apiRejectLoan() {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 400))
    return { success: true }
  }
  throw new Error("Loans API is not available yet")
}

export async function apiContact() {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    return { success: true }
  }
  throw new Error("Contact endpoint is not configured")
}
