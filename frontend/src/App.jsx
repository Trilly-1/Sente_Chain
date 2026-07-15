// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import LandingPage      from "./pages/LandingPage"
import AuthPage         from "./pages/Authpage"
import MemberDashboard  from "./pages/MemberDashboard"
import CashierDashboard from "./pages/CashierDashboard"
import AdminDashboard   from "./pages/AdminDashboard"
import SACCOPublicView  from "./pages/SACCOPublicView"
import SACCORegistration from "./pages/SACCORegistration"
import VerificationPending from "./pages/VerificationPending"
import MemberOnboarding from "./pages/MemberOnboarding"
import MemberVerificationPending from "./pages/MemberVerificationPending"
import ProjectAdminDashboard from "./pages/ProjectAdminDashboard"
import VerifyEmail from "./pages/VerifyEmail"
import ResetPIN from "./pages/ResetPIN"
import { SKIP_KYC } from "./services/api"
import { getPostLoginPath } from "./utils/roleRouting"

function RoleRoute() {
  const { auth } = useAuth()
  if (!auth) return <Navigate to="/auth" replace />

  if (auth.is_project_admin) return <Navigate to="/sc-project-master-gate" replace />
  
  if (auth.role === "member") {
    // TESTING: SKIP_KYC skips document upload; SACCO admin still approves.
    // Pilot: set VITE_SKIP_KYC=false to restore full KYC screens.
    if (!SKIP_KYC) {
      if (auth.status === "pending_kyc") return <Navigate to="/member-onboarding" replace />
      if (auth.status === "under_review") return <MemberVerificationPending />
    } else if (auth.status === "pending_kyc" || auth.status === "under_review") {
      return <MemberVerificationPending />
    }
    return <MemberDashboard />
  }
  
  if (auth.role === "admin") {
    // SACCO still needs platform approval — only document KYC is skipped for testing.
    const saccoPending = auth.sacco_status && auth.sacco_status !== "approved"
    if (saccoPending && !auth.sacco_id) return <Navigate to="/register-sacco" replace />
    if (saccoPending) return <Navigate to="/verification-pending" replace />
    return <AdminDashboard />
  }
  if (auth.role === "cashier") return <CashierDashboard />
  return <Navigate to="/auth" replace />
}

function RootRoute() {
  return <LandingPage />
}

function AuthRoute() {
  const { auth } = useAuth()
  return auth ? <Navigate to={getPostLoginPath(auth)} replace /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"               element={<RootRoute />} />
          <Route path="/auth"           element={<AuthRoute />} />
          <Route path="/verify-email"   element={<VerifyEmail />} />
          <Route path="/reset-pin"      element={<ResetPIN />} />
          <Route path="/sacco/:saccoId" element={<SACCOPublicView />} />
          <Route path="/ledger/:stellarHash" element={<LedgerProof />} />
          <Route path="/register-sacco" element={<SACCORegistration />} />
          <Route path="/member-onboarding" element={<MemberOnboarding />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
          <Route path="/member-verification-pending" element={<MemberVerificationPending />} />
          <Route path="/sc-project-master-gate" element={<ProjectAdminDashboard />} />
          <Route path="/dashboard"      element={<RoleRoute />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}