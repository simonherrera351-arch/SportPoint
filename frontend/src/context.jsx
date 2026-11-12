import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, getToken, setToken } from './api'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const TOAST_COLORS = { success: '#1db954', danger: '#e0453f', info: '#2b8fe0' }
const TOAST_ICONS = { success: 'bi-check-circle', danger: 'bi-x-circle', info: 'bi-info-circle' }

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())
  const [authModal, setAuthModal] = useState(null) // 'login' | 'register' | 'recover' | null
  const [toasts, setToasts] = useState([])
  const [meta, setMeta] = useState({ comunas: [], deportes: [], categorias: [], roles: [] })
  const nextId = useRef(1)

  const toast = useCallback((msg, type = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  useEffect(() => {
    api.get('/meta').then(setMeta).catch(() => {})
    if (!getToken()) return
    api.get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false))
  }, [])

  const startSession = useCallback(({ token, user: u }) => {
    setToken(token)
    setUser(u)
    setAuthModal(null)
    toast(`Sesión iniciada como ${u.nombre} (${u.rol}).`)
  }, [toast])

  const login = useCallback(async (email, password) => {
    startSession(await api.post('/auth/login', { email, password }))
  }, [startSession])

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload)
    setToken(res.token); setUser(res.user); setAuthModal(null)
    toast(`Cuenta creada como ${res.user.rol}. ¡Bienvenido a SportPoint!`)
  }, [toast])

  const logout = useCallback(() => {
    setToken(null); setUser(null)
    toast('Sesión cerrada.')
  }, [toast])

  const value = useMemo(() => ({
    user, setUser, loading, login, register, logout, authModal, setAuthModal, toast, meta,
  }), [user, loading, login, register, logout, authModal, toast, meta])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-sp">
        {toasts.map((t) => (
          <div key={t.id} className="toast align-items-center text-white border-0 show mb-2"
               style={{ background: '#1a1a1a', borderLeft: '4px solid ' + TOAST_COLORS[t.type], minWidth: 280 }}>
            <div className="d-flex">
              <div className="toast-body">
                <i className={`bi ${TOAST_ICONS[t.type]} me-2`} style={{ color: TOAST_COLORS[t.type] }} />{t.msg}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto"
                      onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} />
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

/** Hook para cargar datos de la API con estado de carga/error y recarga manual. */
export function useFetch(path, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (path === null) return
    let alive = true
    setLoading(true)
    api.get(path)
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => { if (alive) setError(e) })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps])
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData }
}
