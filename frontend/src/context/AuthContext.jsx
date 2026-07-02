// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { setToken, clearToken, persistAuth, loadPersistedAuth, clearPersistedAuth, setSaccoContext, apiGetMe, USE_DEMO } from "../services/api"
import { UGANDA } from "../data/countries"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadPersistedAuth())
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("sente_currency") || "UGX"
  })

  useEffect(() => {
    if (auth?.token) {
      setToken(auth.token)
      if (auth.sacco_id) setSaccoContext(auth.sacco_id)
    }
  }, [auth])

  useEffect(() => {
    if (!auth?.token || USE_DEMO) return
    apiGetMe()
      .then((fresh) => {
        if (fresh) setAuth((prev) => {
          const next = { ...prev, ...fresh }
          persistAuth(next)
          return next
        })
      })
      .catch(() => logout())
  }, [])

  useEffect(() => {
    localStorage.setItem("sente_currency", currency)
  }, [currency])

  const login = useCallback((data) => {
    setToken(data.token)
    if (data.sacco_id) setSaccoContext(data.sacco_id)
    setAuth(data)
    persistAuth(data)
    setCurrency(UGANDA.currency)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    clearPersistedAuth()
    setAuth(null)
  }, [])

  const updateAuth = useCallback((updates) => {
    setAuth((prev) => {
      const next = prev ? { ...prev, ...updates } : null
      if (next) persistAuth(next)
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout, updateAuth, currency, setCurrency }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
