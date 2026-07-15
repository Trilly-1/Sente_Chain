export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"
export const USE_DEMO = import.meta.env.VITE_USE_DEMO === "true"
export const IS_LIVE = !USE_DEMO && !BASE_URL.includes("localhost")
// TESTING ONLY — set VITE_SKIP_KYC=false (or remove) before pilot to restore KYC gates.
export const SKIP_KYC = import.meta.env.VITE_SKIP_KYC === "true" || import.meta.env.VITE_SKIP_KYC === "1"

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
    email: u.email,
    email_verified: u.email_verified,
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
    member_id: m.membership_id || m.member_id,
    membership_id: m.membership_id || m.member_id,
    user_id: m.user_id,
    name: m.full_name || m.name,
    phone: m.phone,
    role: m.role || "member",
    status: m.status || "active",
    joined: m.joined_at || m.joined,
    balance_kes: m.savings_balance ?? m.balance_kes ?? 0,
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

export async function apiRegister({ name, phone, email, role = "member", saccoId, pin, country = "UG" }) {
  if (USE_DEMO) { 
    await new Promise((r) => setTimeout(r, 900))
    return { 
      token: "demo-token", 
      member_id: "MBR_NEW",
      membership_id: "MBR_NEW",
      name, 
      phone,
      email,
      email_verified: true,
      role: "member", 
      sacco_id: saccoId, 
      status: "pending_kyc", 
      balance_kes: 0,
      requires_email_verification: false,
    }
  }
  // Never persist the new user's JWT — staff-assisted register must keep the caller's session.
  const body = {
    full_name: name,
    phone: phone.replace(/\s/g, "").startsWith("+") ? phone.replace(/\s/g, "") : normalizePhone(phone),
    email: (email || "").trim().toLowerCase(),
    pin,
    country,
    role: role === "admin" && !saccoId ? "admin" : "member",
  }
  if (saccoId) body.sacco_id = saccoId
  const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) })
  if (data.requires_email_verification) {
    return {
      requires_email_verification: true,
      message: data.message,
      dev_verification_url: data.dev_verification_url,
      email: data.user?.email,
      name: data.user?.full_name,
      phone: data.user?.phone,
      membership_id: data.user?.membership_id,
      member_id: data.user?.membership_id,
      sacco_id: data.user?.sacco_id,
      status: data.user?.status,
    }
  }
  return mapAuthUser(data)
}

/** Staff-assisted: register member, optionally activate + promote to cashier (keeps admin session). */
export async function apiStaffRegisterMember({ name, phone, email, pin, country = "UG", saccoId, role = "member", activate = true }) {
  const created = await apiRegister({ name, phone, email, role: "member", saccoId, pin, country })
  const membershipId = created.membership_id || created.member_id
  if (!membershipId) {
    return { ...created, activated: false, promoted: false }
  }
  let activated = false
  let promoted = false
  let status = created.status
  let finalRole = "member"
  if (activate) {
    await apiUpdateMemberStatus(membershipId, "active", saccoId)
    activated = true
    status = "active"
  }
  if (role === "cashier" && activated) {
    await apiUpdateMemberRole(membershipId, "cashier", saccoId)
    promoted = true
    finalRole = "cashier"
  }
  return {
    ...created,
    membership_id: membershipId,
    member_id: membershipId,
    role: finalRole,
    status,
    activated,
    promoted,
  }
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

export async function apiVerifyEmail(token) {
  if (USE_DEMO) return { token: "demo-token", email_verified: true }
  const data = await apiFetch("/auth/email/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
  return mapAuthUser(data)
}

export async function apiResendVerification(email) {
  if (USE_DEMO) return { message: "Verification email sent." }
  return apiFetch("/auth/email/resend", {
    method: "POST",
    body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
  })
}

export async function apiForgotPIN(email) {
  if (USE_DEMO) return { message: "If an account exists for that email, a PIN reset link has been sent." }
  return apiFetch("/auth/pin/forgot", {
    method: "POST",
    body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
  })
}

export async function apiResetPIN({ token, pin, confirmPin }) {
  if (USE_DEMO) return { message: "PIN reset successful." }
  return apiFetch("/auth/pin/reset", {
    method: "POST",
    body: JSON.stringify({ token, pin, confirm_pin: confirmPin }),
  })
}

export async function apiGetPublicStats(country = "UG") {
  if (USE_DEMO) {
    const { ALL_SACCOS } = await import("../data/demo")
    return {
      approved_saccos: ALL_SACCOS.length,
      total_members: 6,
      active_members: 5,
      total_transactions: 24,
      anchored_transactions: 18,
    }
  }
  const q = country ? `?country=${encodeURIComponent(country)}` : ""
  return apiFetch(`/public/stats${q}`)
}

/** Platform fee config (live API). Default 1.5% on savings — set PLATFORM_FEE_PERCENT on backend. */
export async function apiGetPlatformConfig() {
  if (USE_DEMO) {
    return {
      fee_percent: 1.5,
      fee_model: "net_deduction",
      description: "Service fee deducted from credited savings amount.",
      applies_to: ["savings"],
      max_recommended_percent: 2.5,
    }
  }
  return apiFetch("/public/platform-config")
}

export function calcPlatformFee(gross, feePercent, purpose = "savings") {
  const amount = parseFloat(gross) || 0
  const pct = parseFloat(feePercent) || 0
  if (!amount || purpose !== "savings" || pct <= 0) {
    return { gross: amount, fee: 0, net: amount, percent: pct }
  }
  const fee = Math.round(amount * pct) / 100
  const roundedFee = Math.round(fee * 100) / 100
  return {
    gross: amount,
    fee: roundedFee,
    net: Math.round((amount - roundedFee) * 100) / 100,
    percent: pct,
  }
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

export async function apiGetMemberBalance(saccoId) {
  if (USE_DEMO) {
    const auth = loadPersistedAuth()
    const { DEMO_MEMBERS } = await import("../data/demo")
    const m = DEMO_MEMBERS.find((x) => x.member_id === auth?.member_id)
    const savings = m?.balance_kes ?? 0
    return {
      savings_balance: savings,
      total_deposits: savings,
      total_withdrawals: 0,
      total_loans_received: 0,
      total_repaid: 0,
      loan_outstanding: 0,
      currency: "UGX",
    }
  }
  return apiFetch(`/members/balance?sacco_id=${encodeURIComponent(saccoId)}`)
}

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

export async function apiGetPendingMembers(saccoId) {
  if (USE_DEMO) {
    const { DEMO_MEMBERS } = await import("../data/demo")
    return DEMO_MEMBERS.filter((m) => m.status === "pending_kyc" || m.status === "under_review").map(mapMember)
  }
  const id = saccoId || _saccoId
  const data = await apiFetch(`/saccos/${id}/members/pending`)
  return (data.members || []).map(mapMember)
}

export async function apiApproveMember(membershipId, saccoId) {
  const id = saccoId || _saccoId
  return apiFetch(`/saccos/${id}/members/${membershipId}/approve`, { method: "PATCH", body: "{}" })
}

export async function apiRejectMember(membershipId, saccoId) {
  const id = saccoId || _saccoId
  return apiFetch(`/saccos/${id}/members/${membershipId}/reject`, { method: "PATCH", body: "{}" })
}

export async function apiGetPublicLedger(stellarHash) {
  if (USE_DEMO) {
    return {
      transaction_id: "demo-tx",
      reference_number: "SC-DEMO",
      transaction_type: "deposit",
      amount: "50000",
      currency: "UGX",
      status: "blockchain_verified",
      stellar_tx_hash: stellarHash,
      created_at: new Date().toISOString(),
    }
  }
  return apiFetch(`/public/ledger/${encodeURIComponent(stellarHash)}`)
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

// ─── Project admin (SACCO onboarding only — member approvals are per-SACCO) ───

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

// ─── Loans ────────────────────────────────────────────────────────────────────

function mapLoan(l) {
  return {
    id: l.id,
    reference_number: l.reference_number,
    member_id: l.member_id,
    member_name: l.member_name,
    phone: l.phone,
    amount_requested: l.amount_requested ?? (parseFloat(l.principal) || 0),
    purpose: l.purpose || "",
    status: l.status,
    applied_on: l.applied_on,
    interest_rate: l.interest_rate ?? (parseFloat(l.interest_rate_annual) || 0),
    term_months: l.term_months,
    interest_method: l.interest_method,
    monthly_installment: l.monthly_installment ?? 0,
    total_repayable: l.total_repayable ?? 0,
    total_interest: l.total_interest ?? 0,
    disbursed_on: l.disbursed_on,
    collateral: l.collateral || "",
    guarantor: l.guarantor || "",
    savings_balance: l.savings_balance ?? 0,
    repaid_so_far: l.repaid_so_far ?? 0,
    balance_remaining: l.balance_remaining ?? 0,
    payments_made: l.payments_made ?? 0,
    payments_total: l.payments_total ?? l.term_months ?? 0,
    next_payment_date: l.next_payment_date,
    next_payment_amount: l.next_payment_amount,
    payments_schedule: l.payments_schedule || [],
  }
}

function mapLoanProduct(p) {
  return {
    id: p.id,
    name: p.name,
    interest_rate_annual: parseFloat(p.interest_rate_annual) || 0,
    interest_method: p.interest_method,
    min_term_months: p.min_term_months,
    max_term_months: p.max_term_months,
    is_default: p.is_default,
    is_active: p.is_active,
  }
}

export async function apiListLoanProducts(saccoId) {
  if (USE_DEMO) return [{ id: "demo", name: "Standard Loan", interest_rate_annual: 12, interest_method: "flat", min_term_months: 1, max_term_months: 24, is_default: true, is_active: true }]
  const data = await apiFetch(`/saccos/${saccoId}/loan-products`)
  return (data.products || []).map(mapLoanProduct)
}

export async function apiCreateLoanProduct(saccoId, body) {
  const data = await apiFetch(`/saccos/${saccoId}/loan-products`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return mapLoanProduct(data)
}

export async function apiUpdateLoanProduct(saccoId, productId, body) {
  const data = await apiFetch(`/saccos/${saccoId}/loan-products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return mapLoanProduct(data)
}

export async function apiGetLoans(saccoId, status) {
  if (USE_DEMO) {
    const { LOAN_APPLICATIONS } = await import("../data/demo")
    return LOAN_APPLICATIONS
  }
  const q = status ? `?status=${encodeURIComponent(status)}` : ""
  const data = await apiFetch(`/saccos/${saccoId}/loans${q}`)
  return (data.loans || []).map(mapLoan)
}

export async function apiGetMyLoans(saccoId) {
  if (USE_DEMO) {
    const { LOAN_APPLICATIONS } = await import("../data/demo")
    return LOAN_APPLICATIONS.filter((l) => l.member_id === "MBR001")
  }
  const data = await apiFetch(`/members/loans?sacco_id=${encodeURIComponent(saccoId)}`)
  return (data.loans || []).map(mapLoan)
}

export async function apiApplyLoan(saccoId, body) {
  const data = await apiFetch(`/saccos/${saccoId}/loans`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return mapLoan(data)
}

export async function apiApproveLoan(saccoId, loanId) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    return { success: true }
  }
  const data = await apiFetch(`/saccos/${saccoId}/loans/${loanId}/approve`, { method: "PATCH", body: JSON.stringify({}) })
  return mapLoan(data)
}

export async function apiRejectLoan(saccoId, loanId) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 400))
    return { success: true }
  }
  const data = await apiFetch(`/saccos/${saccoId}/loans/${loanId}/reject`, { method: "PATCH", body: JSON.stringify({}) })
  return mapLoan(data)
}

export async function apiRepayLoan(loanId, amount) {
  const data = await apiFetch(`/loans/${loanId}/repayments`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  })
  return mapLoan(data)
}

// ─── Payments (SACCO-owned wallets) ───────────────────────────────────────────

export async function apiGetPaymentAccounts(saccoId) {
  const data = await apiFetch(`/saccos/${saccoId}/payment-accounts`)
  return data.accounts || []
}

export async function apiSavePaymentAccounts(saccoId, accounts) {
  const data = await apiFetch(`/saccos/${saccoId}/payment-accounts`, {
    method: "PUT",
    body: JSON.stringify({ accounts }),
  })
  return data.accounts || []
}

export async function apiGetPaymentInstructions(saccoId) {
  if (USE_DEMO) {
    return {
      sacco_name: "Demo SACCO",
      member_reference: "DEMO0001",
      mtn_api_ready: false,
      airtel_api_ready: false,
      accounts: [
        { provider: "mtn_momo", label: "MTN MoMo", phone_number: "+256700000099", is_primary: true },
        { provider: "airtel_money", label: "Airtel Money", phone_number: "+256750000099", is_primary: false },
      ],
      instructions: [
        "Money goes directly to your SACCO wallet — SenteChain never holds your funds.",
        "Include your member reference in the payment reason.",
      ],
    }
  }
  return apiFetch(`/members/payment-instructions?sacco_id=${encodeURIComponent(saccoId)}`)
}

export async function apiGetPaymentIntegrationStatus() {
  if (USE_DEMO) return { mtn_configured: false, airtel_configured: false, webhooks_ready: true }
  return apiFetch("/payments/integration-status")
}

export async function apiRequestToPay(saccoId, amount, provider = "mtn_momo", purpose = "savings") {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 800))
    const ref = purpose === "loan_repayment" ? "L-DEMO" : purpose === "interest" ? "I-DEMO" : "S-DEMO"
    return {
      status: "manual",
      mode: "manual",
      message: `Check your phone for the MoMo prompt. Reference: ${ref}.`,
      provider,
      amount,
      currency: "UGX",
    }
  }
  return apiFetch("/members/payments/request-to-pay", {
    method: "POST",
    body: JSON.stringify({ sacco_id: saccoId, amount, provider, purpose }),
  })
}

// ─── Stubs (no backend yet) ───────────────────────────────────────────────────

export async function apiContact({ name, email, message } = {}) {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    return { success: true }
  }
  // No dedicated backend inbox yet — acknowledge client-side and surface a mailto fallback.
  const subject = encodeURIComponent(`SenteChain contact from ${name || "visitor"}`)
  const body = encodeURIComponent(`From: ${name || ""}\nEmail: ${email || ""}\n\n${message || ""}`)
  return {
    success: true,
    message: "Thanks — your message was recorded locally. Email support@sentechain.app if you need a reply.",
    mailto: `mailto:support@sentechain.app?subject=${subject}&body=${body}`,
  }
}
