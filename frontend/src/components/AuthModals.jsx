import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../context'
import Modal from './Modal'

const DEMOS = [['Deportista', 'deportista@sportpoint.co'], ['Admin Club', 'club@sportpoint.co'],
  ['Organizador', 'organizador@sportpoint.co'], ['Admin Sistema', 'admin@sportpoint.co']]

function LoginModal() {
  const { login, setAuthModal } = useApp()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e, creds) => {
    e?.preventDefault()
    setErr(''); setBusy(true)
    try { await login(creds?.email ?? email, creds?.password ?? pass) }
    catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open onClose={() => setAuthModal(null)} title="Iniciar Sesión" icon="bi-shield-lock">
      <form onSubmit={submit}>
        {err && <div className="alert alert-danger py-2">{err}</div>}
        <div className="mb-3"><label className="form-label">Correo electrónico</label>
          <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
        <div className="mb-2"><label className="form-label">Contraseña</label>
          <input className="form-control" type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
        <div className="text-end mb-3">
          <a href="#" className="small text-green" onClick={(e) => { e.preventDefault(); setAuthModal('recover') }}>¿Olvidaste tu contraseña?</a>
        </div>
        <button className="btn-green-submit w-100" disabled={busy}><i className="bi bi-box-arrow-in-right me-2" />Ingresar</button>
        <div className="text-center mt-3">
          <small className="text-muted-sp">¿No tienes cuenta? <a href="#" className="text-green" onClick={(e) => { e.preventDefault(); setAuthModal('register') }}>Regístrate</a></small>
        </div>
      </form>
      <hr className="border-secondary" />
      <p className="small text-muted-sp mb-1">Cuentas demo (contraseña: <code>1234</code>):</p>
      <div className="d-flex flex-wrap gap-2">
        {DEMOS.map(([label, mail]) => (
          <button key={mail} type="button" className="btn btn-sm btn-sp-outline" onClick={() => submit(null, { email: mail, password: '1234' })}>{label}</button>
        ))}
      </div>
    </Modal>
  )
}

const REG_ROLES = [['Deportista', 'bi-person-running'], ['Admin. Club', 'bi-building'], ['Organizador', 'bi-trophy']]

function RegisterModal() {
  const { register, setAuthModal } = useApp()
  const [f, setF] = useState({ rol: 'Deportista', nombre: '', email: '', password: '', fechaNacimiento: '' })
  const [doc, setDoc] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const depo = f.rol === 'Deportista'

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await register({ ...f, docSubido: depo && doc, fechaNacimiento: depo ? f.fechaNacimiento : null }) }
    catch (ex) { setErr(ex.message) }
  }

  return (
    <Modal open onClose={() => setAuthModal(null)} title="Crear Cuenta" icon="bi-person-plus">
      <form onSubmit={submit}>
        {err && <div className="alert alert-danger py-2">{err}</div>}
        <p className="text-center mb-2 small text-muted-sp">¿Cómo quieres usar SportPoint?</p>
        <div className="d-flex gap-2 mb-3 flex-wrap">
          {REG_ROLES.map(([r, icon]) => (
            <button key={r} type="button" className={`category-pill flex-fill justify-content-center ${f.rol === r ? 'active' : ''}`}
                    onClick={() => setF({ ...f, rol: r })}><i className={`bi ${icon}`} /> {r}</button>
          ))}
        </div>
        <div className="mb-3"><label className="form-label required-note">Nombre completo</label><input className="form-control" value={f.nombre} onChange={set('nombre')} /></div>
        <div className="mb-3"><label className="form-label required-note">Correo electrónico</label><input className="form-control" type="email" value={f.email} onChange={set('email')} /></div>
        <div className="mb-3"><label className="form-label required-note">Contraseña</label><input className="form-control" type="password" value={f.password} onChange={set('password')} /></div>
        {depo && (
          <>
            <div className="row g-2 mb-2">
              <div className="col-7"><label className="form-label required-note">Fecha de nacimiento</label>
                <input className="form-control" type="date" value={f.fechaNacimiento} onChange={set('fechaNacimiento')} /></div>
              <div className="col-5"><label className="form-label">Documento identidad</label>
                <input className="form-control form-control-sm" type="file" accept="image/*,.pdf" onChange={(e) => setDoc(!!e.target.files[0])} /></div>
            </div>
            <p className="small text-muted-sp mb-3"><i className="bi bi-camera me-1" />Puedes tomar la foto de tu documento directamente desde el celular para verificar tu edad.</p>
          </>
        )}
        <button className="btn-green-submit w-100 mb-3"><i className="bi bi-person-check me-2" />Registrarse Gratis</button>
        <div className="text-center"><small className="text-muted-sp">¿Ya tienes cuenta? <a href="#" className="text-green" onClick={(e) => { e.preventDefault(); setAuthModal('login') }}>Inicia sesión aquí</a></small></div>
      </form>
    </Modal>
  )
}

function RecoverModal() {
  const { setAuthModal, toast } = useApp()
  const [email, setEmail] = useState('')
  const [rec, setRec] = useState(null) // { token, expiresAt }
  const [pass, setPass] = useState('')
  const [remain, setRemain] = useState(0)

  useEffect(() => {
    if (!rec) return
    const tick = () => setRemain(Math.max(0, rec.expiresAt - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [rec])

  const send = async () => {
    try {
      const r = await api.post('/auth/recover', { email })
      setRec({ token: r.token, expiresAt: Date.now() + r.expiresIn * 1000 })
      toast('Enlace de recuperación simulado enviado a tu correo.', 'info')
    } catch (ex) { toast(ex.message, 'danger') }
  }
  const confirm = async () => {
    try {
      await api.post('/auth/recover/confirm', { email, token: rec.token, password: pass })
      toast('Contraseña actualizada. Ya puedes iniciar sesión.')
      setAuthModal('login')
    } catch (ex) { toast(ex.message, 'danger') }
  }
  const mm = Math.floor(remain / 60000), ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0')

  return (
    <Modal open onClose={() => setAuthModal(null)} title="Recuperar Contraseña" icon="bi-key">
      {!rec ? (
        <>
          <p className="text-muted-sp small">Ingresa tu correo y te enviaremos un enlace con un token temporal válido por 15 minutos.</p>
          <div className="mb-3"><input className="form-control" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-green-submit w-100" onClick={send}><i className="bi bi-send me-2" />Enviar enlace</button>
        </>
      ) : (
        <>
          <div className="alert alert-success py-2"><i className="bi bi-check-circle me-1" />Enlace simulado enviado. Token: <code>{rec.token}</code> (expira en <span>{remain ? `${mm}:${ss}` : 'Expirado'}</span>)</div>
          <div className="mb-3"><label className="form-label">Nueva contraseña</label><input className="form-control" type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
          <button className="btn-green-submit w-100" onClick={confirm} disabled={!remain}><i className="bi bi-check2 me-2" />Restablecer contraseña</button>
        </>
      )}
    </Modal>
  )
}

export default function AuthModals() {
  const { authModal } = useApp()
  if (authModal === 'login') return <LoginModal />
  if (authModal === 'register') return <RegisterModal />
  if (authModal === 'recover') return <RecoverModal />
  return null
}
