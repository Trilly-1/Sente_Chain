// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { setToken, clearToken } from "../services/api"
import { EAC_COUNTRIES } from "../data/countries"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null)
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("sente_currency") || "KES"
  })

  useEffect(() => {
    localStorage.setItem("sente_currency", currency)
  }, [currency])

  const login = useCallback((data) => {
    // data: { token, member_id, role, name, sacco_id, balance_kes, phone, ... }
    setToken(data.token)
    setAuth(data)
    
    // Auto-detect currency from phone prefix
    if (data.phone) {
      const country = EAC_COUNTRIES.find(c => data.phone.startsWith(c.prefix))
      if (country) setCurrency(country.currency)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAuth(null)
  }, [])

  const updateAuth = useCallback((updates) => {
    setAuth(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout, updateAuth, currency, setCurrency }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }