import { useEffect, useRef, useState } from 'react'
import FrameBorder from './FrameBorder'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../context'
import { SIDEBAR_MENUS, fmtDate } from '../utils'
import AuthModals from './AuthModals'
import { Loading } from './ui'

const TOP_LINKS = [['/', 'Inicio'], ['/clubes', 'Clubes'], ['/torneos', 'Torneos'], ['/calendario', 'Calendario'], ['/mapa', 'Mapa'], ['/noticias', 'Noticias']]

const YEAR = new Date().getFullYear()

function useOutsideClose(ref, close) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && close()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, close])
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ items: [], unread: 0 })
  const ref = useRef(null)
  const { pathname } = useLocation()
  useOutsideClose(ref, () => setOpen(false))

  const load = () => api.get('/notifications').then(setData).catch(() => {})
  useEffect(() => { load() }, [pathname])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && data.unread) {
      await api.post('/notifications/read')
      setData((d) => ({ ...d, unread: 0 })) // los puntos "sin leer" se mantienen visibles en esta apertura
    }
  }
  return (
    <div className="dropdown position-relative" ref={ref}>
      <button className="btn btn-sm btn-sp-outline position-relative" onClick={toggle}>
        <i className="bi bi-bell" />{data.unread > 0 && <span className="notif-dot" />}
      </button>
      <div className={`dropdown-menu dropdown-menu-end bg-card border-secondary p-0 ${open ? 'show' : ''}`} data-bs-popper="static"
           style={{ width: 'min(320px,92vw)', maxHeight: 360, overflow: 'auto' }}>
        {!data.items.length
          ? <div className="p-3 small text-muted-sp">Sin notificaciones aún.</div>
          : data.items.map((n) => (
            <div key={n.id} className={`notif-item ${n.leido ? '' : 'unread'}`}>
              <div>{n.mensaje}</div><small className="text-muted-sp">{fmtDate(n.fecha)}</small>
            </div>
          ))}
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout, setAuthModal } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useOutsideClose(ref, () => setOpen(false))

  if (!user) {
    return (
      <>
        <button className="btn-sp-outline btn-sm" onClick={() => setAuthModal('login')}>Ingresar</button>
        <button className="btn-green-submit btn-sm" onClick={() => setAuthModal('register')}>Crear cuenta</button>
      </>
    )
  }
  return (
    <>
      <Notifications />
      <div className="dropdown" ref={ref}>
        <button className="btn btn-sm btn-sp-green dropdown-toggle" onClick={() => setOpen(!open)}>
          <i className="bi bi-person-circle me-1" />{user.nombre.split(' ')[0]} <span className="opacity-75">({user.rol})</span>
        </button>
        <ul className={`dropdown-menu dropdown-menu-end bg-card border-secondary ${open ? 'show' : ''}`} data-bs-popper="static">
          <li><Link className="dropdown-item text-white" to="/panel" onClick={() => setOpen(false)}><i className="bi bi-speedometer2 me-2" />Mi Panel</Link></li>
          <li><hr className="dropdown-divider border-secondary" /></li>
          <li><a className="dropdown-item text-danger" style={{ cursor: 'pointer' }}
                 onClick={() => { setOpen(false); logout(); navigate('/') }}><i className="bi bi-box-arrow-right me-2" />Cerrar sesión</a></li>
        </ul>
      </div>
    </>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="navbar navbar-expand-lg sticky-top">
      <div className="container-fluid px-4">
        <Link className="navbar-brand" to="/">Sport<span>Point</span></Link>
        <button className="navbar-toggler" type="button" onClick={() => setOpen(!open)}><span className="navbar-toggler-icon" /></button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto ms-lg-4 gap-lg-2">
            {TOP_LINKS.map(([to, label]) => (
              <li className="nav-item" key={to}>
                <NavLink end={to === '/'} className="nav-link" to={to} onClick={() => setOpen(false)}>{label}</NavLink>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-2"><UserMenu /></div>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="sp-footer">
      <svg className="sp-footer-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
        <path className="fill" d="M0,38 C150,66 330,6 560,22 C780,38 900,64 1100,38 C1250,18 1360,6 1440,28 L1440,60 L0,60 Z" />
        <path className="line" d="M0,38 C150,66 330,6 560,22 C780,38 900,64 1100,38 C1250,18 1360,6 1440,28" />
      </svg>
      <div className="sp-footer-body">
        <div className="container-fluid px-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="sp-footer-brand">Sport<span>Point</span></div>
            <div className="sp-footer-links d-flex gap-3">
              <Link to="/clubes">Clubes</Link><Link to="/torneos">Torneos</Link><Link to="/noticias">Noticias</Link>
            </div>
          </div>
          <div className="sp-footer-copy text-center mt-3">© {YEAR} SportPoint · Medellín, Colombia · Prototipo académico</div>
        </div>
      </div>
    </footer>
  )
}

function useAutoLogin() {
  const { user, loading, setAuthModal } = useApp()
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('login') === '1' && !loading) {
      if (!user) setAuthModal('login')
      params.delete('login'); setParams(params, { replace: true })
    }
  }, [params, loading, user, setAuthModal, setParams])
}

export function PublicLayout() {
  useAutoLogin()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <Navbar />
      <div className="px-4 px-lg-5 py-4"><FrameBorder key={pathname} variant="page" intro><Outlet /></FrameBorder></div>
      <Footer />
      <AuthModals />
    </>
  )
}

function Sidebar() {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const menu = SIDEBAR_MENUS[user.rol] || []
  return (
    <div className="col-12 col-md-3 col-lg-2 sp-sidebar">
      <div className="px-3 pb-3 mb-2 border-bottom border-secondary">
        <div className="fw-bold">{user.nombre}</div><div className="small text-green">{user.rol}</div>
      </div>
      {menu.map((item, i) => item.sec
        ? <div className="side-section" key={i}>{item.sec}</div>
        : <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link d-block text-decoration-none ${isActive ? 'active' : ''}`}>
            <i className={`bi ${item.icon}`} /> {item.label}
          </NavLink>)}
      <a className="side-link text-danger mt-3 d-block text-decoration-none" href="#"
         onClick={(e) => { e.preventDefault(); logout(); navigate('/') }}><i className="bi bi-box-arrow-right" /> Cerrar sesión</a>
    </div>
  )
}

/** Panel privado: exige sesión; `roles` restringe por rol (como pageGuard del prototipo). */
export function PrivateLayout() {
  const { user, loading } = useApp()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  if (loading) return <><Navbar /><Loading /></>
  if (!user) return <Navigate to="/?login=1" replace />
  return (
    <>
      <Navbar />
      <div className="container-fluid px-0">
        <div className="row g-0">
          <Sidebar />
          <div className="col-12 col-md-9 col-lg-10 p-3 p-lg-4"><FrameBorder key={pathname} variant="page" intro><Outlet /></FrameBorder></div>
        </div>
      </div>
      <Footer />
      <AuthModals />
    </>
  )
}

export function RoleGate({ roles, children }) {
  const { user } = useApp()
  if (roles && !roles.includes(user.rol)) {
    return (
      <div className="alert alert-warning">
        Esta sección es exclusiva para el rol <strong>{roles.join(' / ')}</strong>. Tu rol actual es <strong>{user.rol}</strong>.{' '}
        <Link to="/panel" className="text-green">Volver a Mi Panel</Link>
      </div>
    )
  }
  return children
}
