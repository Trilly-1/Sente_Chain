/** Where to send a user after login — role is resolved server-side. */
export function getPostLoginPath(user) {
  if (!user) return "/auth"
  if (user.is_project_admin) return "/sc-project-master-gate"
  return "/dashboard"
}

export const ROLE_LABELS = {
  member: "Member",
  cashier: "Cashier",
  admin: "SACCO Admin",
  project_admin: "Platform Admin",
}

export function roleLabel(user) {
  if (!user) return ""
  if (user.is_project_admin) return ROLE_LABELS.project_admin
  return ROLE_LABELS[user.role] || "User"
}
