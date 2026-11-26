import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useApp, useFetch } from '../context'
import { Badge, ClubCard, ErrorBox, Kpi, Loading, NewsCard, TorneoCard, ViewHeader } from '../components/ui'
import { ClubFormModal, MessageModal, ReviewModal, TorneoFormModal } from '../components/forms'
import Modal from '../components/Modal'
import { Carnet, CarnetPanel } from './Carnet'
import { downloadBlob, fmtDate, fmtMoney, openPrintReport } from '../utils'

/** Envuelve una vista que carga datos: muestra spinner/error y entrega los datos al render. */
function Load({ state, children }) {
  if (state.loading && !state.data) return <Loading />
  if (state.error) return <ErrorBox error={state.error} />
  return children(state.data)
}

/* ───────── Panel (dashboard por rol) ───────── */
export function Panel() {
  const { user } = useApp()
  const s = useFetch('/dashboard')
  return (
    <Load state={s}>{(d) => {
      const first = user.nombre.split(' ')[0]
      if (d.rol === 'Admin. Sistema') {
        const max = Math.max(1, ...Object.values(d.comunas))
        return (
          <>
            <ViewHeader icon="bi-speedometer2" title="Panel de Métricas KPI" subtitle="Indicadores clave en tiempo real del sistema." />
            <div className="row g-3 mb-4">
              <Kpi col="col-md-3" value={d.clubesActivos} label="Clubes activos" />
              <Kpi col="col-md-3" value={d.clubesPendientes} label="Clubes por validar" />
              <Kpi col="col-md-3" value={d.torneosCurso} label="Torneos en ejecución" />
              <Kpi col="col-md-3" value={d.deportistas} label="Deportistas registrados" />
            </div>
            <div className="row g-3">
              <div className="col-lg-7"><div className="bg-card rounded-xl p-3">
                <h6 className="fw-bold mb-3">Mapa de calor — clubes por comuna</h6>
                {Object.entries(d.comunas).map(([name, n]) => (
                  <div className="d-flex align-items-center gap-2 mb-2" key={name}>
                    <div style={{ width: 180 }} className="small text-muted-sp">{name.split(' - ')[1] || name}</div>
                    <div className="flex-fill" style={{ background: '#222', borderRadius: 6, overflow: 'hidden', height: 16 }}>
                      <div style={{ width: `${(n / max) * 100}%`, background: 'var(--sp-green)', height: '100%' }} />
                    </div><div className="small">{n}</div>
                  </div>
                ))}
              </div></div>
              <div className="col-lg-5"><div className="bg-card rounded-xl p-3">
                <h6 className="fw-bold mb-3">Crecimiento (últimos 30 días)</h6>
                <div className="kpi-num">+{d.crecimientoMes}</div><div className="kpi-label">Nuevos usuarios</div>
                <hr className="border-secondary" />
                <h6 className="fw-bold mb-2">Auditoría reciente</h6>
                <ul className="small text-muted-sp mb-0">{d.auditoria.map((c, i) => <li key={i}>{c.nombre} — <Badge estado={c.estado} /></li>)}</ul>
              </div></div>
            </div>
          </>
        )
      }
      if (d.rol === 'Admin. Club') return (
        <>
          <ViewHeader icon="bi-speedometer2" title={`Bienvenido, ${first}`} subtitle="Resumen de tu(s) club(es)." />
          <div className="row g-3 mb-4">
            <Kpi value={d.clubes.length} label="Clubes registrados" /><Kpi value={d.afiliados} label="Deportistas afiliados" /><Kpi value={d.aprobados} label="Clubes aprobados" />
          </div>
          <div className="row g-3">{d.clubes.length ? d.clubes.map((c) => <ClubCard key={c.id} c={c} />) : <p className="text-muted-sp px-3">Aún no has registrado ningún club.</p>}</div>
        </>
      )
      if (d.rol === 'Organizador') return (
        <>
          <ViewHeader icon="bi-speedometer2" title={`Bienvenido, ${first}`} subtitle="Resumen de tus torneos." />
          <div className="row g-3 mb-4">
            <Kpi value={d.torneos.length} label="Torneos creados" /><Kpi value={d.abiertos} label="Abiertos a inscripción" /><Kpi value={d.inscripciones} label="Inscripciones totales" />
          </div>
          <div className="row g-3">{d.torneos.length ? d.torneos.map((t) => <TorneoCard key={t.id} t={t} />) : <p className="text-muted-sp px-3">Aún no has creado ningún torneo.</p>}</div>
        </>
      )
      return (
        <>
          <ViewHeader icon="bi-speedometer2" title={`Hola, ${first}`} subtitle="Tu resumen deportivo." />
          <div className="row g-3 mb-4">
            <Kpi value={d.inscripciones} label="Inscripciones" /><Kpi value={d.clubes} label="Clubes afiliado" /><Kpi value={d.edad ?? '—'} label="Edad" />
          </div>
          <div className="bg-card rounded-xl p-3">
            <h6 className="fw-bold mb-2">Próximos torneos disponibles</h6>
            <div className="row g-2">{d.torneosAbiertos.length ? d.torneosAbiertos.map((t) => <TorneoCard key={t.id} t={t} />) : <p className="text-muted-sp">No hay torneos abiertos.</p>}</div>
          </div>
        </>
      )
    }}</Load>
  )
}

/* ───────── Perfil del deportista ───────── */
export function Perfil() {
  const { user, setUser, toast } = useApp()
  const clubs = useFetch('/me/clubs')
  const [f, setF] = useState({ nombre: user.nombre, telefono: user.telefono || '', fechaNacimiento: user.fechaNacimiento || '' })
  const [hex, setHex] = useState(user.carnet?.colorHex || '#1db954')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    try { setUser(await api.put('/me', f)); toast('Perfil actualizado.') } catch (e) { toast(e.message, 'danger') }
  }
  const link = `${location.origin}${location.pathname}#perfil/${user.id}`
  const share = (via) => {
    if (via === 'copy') { navigator.clipboard?.writeText(link); toast('Enlace de perfil copiado.') }
    else window.open('https://wa.me/?text=' + encodeURIComponent('Mira mi perfil en SportPoint: ' + link), '_blank')
  }
  return (
    <>
      <ViewHeader icon="bi-person" title="Mi Perfil" />
      <div className="bg-card rounded-xl p-3 p-lg-4 mb-3">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-5 col-xl-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-person-badge text-green me-2" />Carnet virtual</h6>
            <Carnet user={user} clubs={clubs.data?.miembro || []} hex={hex} />
            <button className="btn-sp-outline btn-sm mt-3" onClick={() => window.print()}><i className="bi bi-printer me-1" />Imprimir / guardar como PDF</button>
          </div>
          <div className="col-12 col-lg-7 col-xl-8"><CarnetPanel user={user} hex={hex} setHex={setHex} /></div>
        </div>
      </div>
      <div className="bg-card rounded-xl p-3 p-lg-4">
        <h6 className="fw-bold mb-3"><i className="bi bi-person text-green me-2" />Mis datos</h6>
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label">Nombre</label><input className="form-control" value={f.nombre} onChange={set('nombre')} /></div>
          <div className="col-md-6"><label className="form-label">Correo</label><input className="form-control" value={user.email} disabled /></div>
          <div className="col-md-6"><label className="form-label">Teléfono</label><input className="form-control" value={f.telefono} onChange={set('telefono')} /></div>
          <div className="col-md-6"><label className="form-label">Fecha de nacimiento</label><input className="form-control" type="date" value={f.fechaNacimiento} onChange={set('fechaNacimiento')} /></div>
        </div>
        <p className="small text-muted-sp mt-3 mb-3">
          {user.docSubido
            ? <><i className="bi bi-patch-check text-green me-1" />Documento de identidad verificado.</>
            : <><i className="bi bi-exclamation-triangle text-warning me-1" />Sin documento de identidad verificado.</>}
        </p>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button className="btn-green-submit" style={{ width: 'auto', padding: '8px 22px' }} onClick={save}>Guardar cambios</button>
          <span className="text-muted-sp small ms-lg-3">Compartir perfil:</span>
          <button className="btn-sp-outline btn-sm" onClick={() => share('whatsapp')}><i className="bi bi-whatsapp me-1" />WhatsApp</button>
          <button className="btn-sp-outline btn-sm" onClick={() => share('copy')}><i className="bi bi-link-45deg me-1" />Copiar enlace</button>
        </div>
      </div>
    </>
  )
}

/* ───────── Deportista: clubes, inscripciones, historial, estadísticas ───────── */
const Fila = ({ icon, label, val }) => <div className="col-12 col-sm-6"><div className="small text-muted-sp"><i className={`bi ${icon} me-1 text-green`} />{label}</div><div>{val || '—'}</div></div>

export function MisClubes() {
  const { toast } = useApp()
  const s = useFetch('/me/clubs')
  const [review, setReview] = useState(null)
  const cancel = async (id) => {
    try { await api.del(`/clubs/${id}/apply`); toast('Solicitud cancelada.'); s.reload() } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <>
      <ViewHeader icon="bi-shield-check" title="Mis Clubes" subtitle="Los clubes a los que perteneces y su información." />
      <Load state={s}>{({ miembro, solicitudes }) => (
        <>
          {miembro.length ? (
            <div className="row g-3 mb-4">{miembro.map((c) => (
              <div className="col-12 col-xl-6" key={c.id}><div className="bg-card rounded-xl p-3 p-lg-4 h-100">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-1"><h5 className="fw-bold mb-0">{c.nombre}</h5><Badge estado={c.estado} /></div>
                <p className="text-muted-sp small mb-3"><i className="bi bi-award me-1" />{c.disciplina} &nbsp;·&nbsp; <i className="bi bi-geo-alt me-1" />{c.comuna}{c.rating && <> &nbsp;·&nbsp; <i className="bi bi-star-fill text-warning me-1" />{c.rating}</>}</p>
                <div className="row g-3 mb-3">
                  <Fila icon="bi-pin-map" label="Dirección de sede" val={c.direccion} />
                  <Fila icon="bi-clock" label="Horarios" val={c.horarios} />
                  <Fila icon="bi-person-workspace" label="Entrenadores" val={(c.entrenadores || []).join(', ')} />
                  <Fila icon="bi-cash-coin" label="Cuota mensual" val={fmtMoney(c.cuota)} />
                  <Fila icon="bi-people" label="Deportistas afiliados" val={c.numMiembros} />
                  <Fila icon="bi-person-badge" label="Administrador" val={c.adminNombre} />
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Link className="btn-sp-green btn-sm text-decoration-none" to={`/clubes/${c.id}`}><i className="bi bi-eye me-1" />Ver ficha completa</Link>
                  <button className="btn-sp-outline btn-sm" onClick={() => setReview(c.id)}><i className="bi bi-star me-1" />Calificar club</button>
                </div>
              </div></div>
            ))}</div>
          ) : (
            <div className="bg-card rounded-xl p-4 mb-4 text-center">
              <i className="bi bi-shield fs-1 text-green d-block mb-2" /><p className="mb-3 text-muted-sp">Aún no perteneces a ningún club.</p>
              <Link className="btn-sp-green text-decoration-none" to="/clubes"><i className="bi bi-search me-1" />Explorar clubes</Link>
            </div>
          )}
          {solicitudes.length > 0 && (
            <>
              <h6 className="fw-bold mb-2"><i className="bi bi-hourglass-split text-green me-2" />Solicitudes enviadas</h6>
              <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Club</th><th>Disciplina</th><th>Estado</th><th /></tr></thead><tbody>
                {solicitudes.map((c) => (
                  <tr key={c.id}><td><Link className="text-white" to={`/clubes/${c.id}`}>{c.nombre}</Link></td><td>{c.disciplina}</td><td><Badge estado="Pendiente" /></td>
                    <td className="text-end"><button className="btn btn-sm btn-sp-outline" onClick={() => cancel(c.id)}>Cancelar</button></td></tr>
                ))}
              </tbody></table></div>
            </>
          )}
        </>
      )}</Load>
      <ReviewModal clubId={review} onClose={() => setReview(null)} onDone={s.reload} />
    </>
  )
}

export function MisInscripciones() {
  const s = useFetch('/me/registrations')
  return (
    <>
      <ViewHeader icon="bi-clipboard-check" title="Mis Inscripciones" />
      <Load state={s}>{(rows) => rows.length ? (
        <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Torneo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{r.torneo}</td><td>{fmtDate(r.fecha)}</td><td><Badge estado={r.estado} /></td></tr>)}
        </tbody></table></div>
      ) : <p className="text-muted-sp">Aún no te has inscrito a ningún torneo.</p>}</Load>
    </>
  )
}

export function MiHistorial() {
  const s = useFetch('/me/history')
  return (
    <>
      <ViewHeader icon="bi-clock-history" title="Historial de Torneos" />
      <Load state={s}>{(rows) => rows.length ? (
        <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Torneo</th><th>Fecha</th><th>Resultado</th></tr></thead><tbody>
          {rows.map((t) => <tr key={t.id}><td>{t.nombre}</td><td>{fmtDate(t.fechaInicio)}</td><td><Badge estado={t.estado} /> — {t.jugados} partido(s) jugado(s)</td></tr>)}
        </tbody></table></div>
      ) : <p className="text-muted-sp">Sin historial todavía.</p>}</Load>
    </>
  )
}

export function MisEstadisticas() {
  const s = useFetch('/me/stats')
  return (
    <>
      <ViewHeader icon="bi-bar-chart" title="Mis Estadísticas" />
      <Load state={s}>{(d) => <div className="row g-3"><Kpi value={d.pj} label="Partidos jugados" /><Kpi value={d.pg} label="Victorias" /><Kpi value={d.pp} label="Derrotas" /></div>}</Load>
    </>
  )
}

/* ───────── Admin. Club ───────── */
export function MiClub() {
  const s = useFetch('/clubs/mine')
  const [form, setForm] = useState({ open: false, club: null })
  return (
    <>
      <ViewHeader icon="bi-building" title="Ficha del Club" subtitle="Registra y actualiza la información pública de tu club." />
      <button className="btn-sp-green mb-3" onClick={() => setForm({ open: true, club: null })}><i className="bi bi-plus-lg me-1" />Registrar nuevo club</button>
      <Load state={s}>{(clubs) => (
        <>
          <div className="row g-3">{clubs.map((c) => (
            <div className="col-md-6" key={c.id}><div className="bg-card rounded-xl p-3">
              <div className="d-flex justify-content-between align-items-start"><h6 className="fw-bold">{c.nombre}</h6><Badge estado={c.estado} /></div>
              <p className="small text-muted-sp mb-1">{c.disciplina} · {c.comuna}</p>
              {c.estado === 'Rechazado' && <p className="small text-danger">Motivo: {c.motivoRechazo}</p>}
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-sm btn-sp-outline" onClick={() => setForm({ open: true, club: c })}><i className="bi bi-pencil" /> Editar</button>
                <Link className="btn btn-sm btn-sp-outline" to={`/clubes/${c.id}`}><i className="bi bi-eye" /> Ver ficha</Link>
              </div>
            </div></div>
          ))}</div>
          {!clubs.length && <p className="text-muted-sp">Aún no tienes clubes registrados.</p>}
        </>
      )}</Load>
      <ClubFormModal open={form.open} club={form.club} onClose={() => setForm({ open: false, club: null })} onSaved={s.reload} />
    </>
  )
}

function ClubRoster({ club }) {
  const { toast } = useApp()
  const s = useFetch(`/clubs/${club.id}/roster`)
  const [linking, setLinking] = useState(false)
  const [email, setEmail] = useState('')
  const run = async (fn, ok) => { try { await fn(); if (ok) toast(ok); s.reload() } catch (e) { toast(e.message, 'danger') } }
  const link = async () => {
    if (!email.trim()) return
    await run(async () => { const r = await api.post(`/clubs/${club.id}/members`, { email }); toast(`${r.nombre} vinculado a la plantilla.`) })
    setLinking(false); setEmail('')
  }
  return (
    <div className="bg-card rounded-xl p-3 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold mb-0">{club.nombre}</h6>
        <button className="btn btn-sm btn-sp-green" onClick={() => setLinking(true)}><i className="bi bi-person-plus" /> Vincular deportista</button>
      </div>
      <Load state={s}>{({ miembros, solicitudes }) => (
        <>
          {solicitudes.length > 0 && (
            <div className="mb-3"><h6 className="small fw-bold text-green mb-2"><i className="bi bi-inbox me-1" />Solicitudes pendientes ({solicitudes.length})</h6>
              <table className="table table-sp mb-0"><thead><tr><th>Nombre</th><th>Correo</th><th /></tr></thead><tbody>
                {solicitudes.map((a) => (
                  <tr key={a.id}><td>{a.nombre}</td><td>{a.email}</td><td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-sp-green me-1" onClick={() => run(() => api.post(`/clubs/${club.id}/requests/${a.id}`, { aceptar: true }), `${a.nombre} fue aceptado en la plantilla.`)}>Aceptar</button>
                    <button className="btn btn-sm btn-sp-danger" onClick={() => run(() => api.post(`/clubs/${club.id}/requests/${a.id}`, { aceptar: false }), 'Solicitud rechazada.')}>Rechazar</button></td></tr>
                ))}
              </tbody></table></div>
          )}
          {miembros.length ? (
            <table className="table table-sp mb-0"><thead><tr><th>Nombre</th><th>Correo</th><th /></tr></thead><tbody>
              {miembros.map((a) => (
                <tr key={a.id}><td>{a.nombre}</td><td>{a.email}</td>
                  <td><button className="btn btn-sm btn-sp-danger" onClick={() => run(() => api.del(`/clubs/${club.id}/members/${a.id}`), 'Deportista desvinculado de la plantilla.')}>Quitar</button></td></tr>
              ))}
            </tbody></table>
          ) : <p className="small text-muted-sp mb-0">Sin deportistas vinculados.</p>}
        </>
      )}</Load>
      <Modal open={linking} onClose={() => setLinking(false)} title="Vincular deportista" icon="bi-person-plus"
             footer={<button className="btn-green-submit" onClick={link}>Vincular</button>}>
        <label className="form-label">Correo del deportista a vincular</label>
        <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </Modal>
    </div>
  )
}

export function Plantilla() {
  const s = useFetch('/clubs/mine')
  return (
    <>
      <ViewHeader icon="bi-people" title="Plantilla de Deportistas" />
      <Load state={s}>{(clubs) => {
        const ok = clubs.filter((c) => c.estado === 'Aprobado')
        return ok.length ? ok.map((c) => <ClubRoster key={c.id} club={c} />)
          : <p className="text-muted-sp">Necesitas al menos un club aprobado para gestionar su plantilla.</p>
      }}</Load>
    </>
  )
}

/* ───────── Organizador ───────── */
export function MisTorneos() {
  const s = useFetch('/tournaments/mine')
  const [open, setOpen] = useState(false)
  return (
    <>
      <ViewHeader icon="bi-trophy" title="Mis Torneos" />
      <button className="btn-sp-green mb-3" onClick={() => setOpen(true)}><i className="bi bi-plus-lg me-1" />Crear torneo</button>
      <Load state={s}>{(ts) => <div className="row g-3">{ts.length ? ts.map((t) => <TorneoCard key={t.id} t={t} />) : <p className="text-muted-sp px-3">Aún no has creado torneos.</p>}</div>}</Load>
      <TorneoFormModal open={open} onClose={() => setOpen(false)} onSaved={s.reload} />
    </>
  )
}

/* ───────── Admin. Sistema ───────── */
export function ValidacionClubes() {
  const { toast } = useApp()
  const s = useFetch('/clubs/all')
  const [rejecting, setRejecting] = useState(null)
  const [motivo, setMotivo] = useState('')
  const approve = async (c) => {
    try { await api.post(`/clubs/${c.id}/approve`); toast(`Club "${c.nombre}" aprobado.`); s.reload() } catch (e) { toast(e.message, 'danger') }
  }
  const reject = async () => {
    if (!motivo.trim()) return toast('Indica el motivo del rechazo.', 'danger')
    try { await api.post(`/clubs/${rejecting.id}/reject`, { motivo }); toast(`Club "${rejecting.nombre}" rechazado.`); setRejecting(null); setMotivo(''); s.reload() }
    catch (e) { toast(e.message, 'danger') }
  }
  return (
    <>
      <ViewHeader icon="bi-patch-check" title="Validación de Clubes" subtitle="Aprueba o rechaza el registro de clubes con base en sus documentos." />
      <Load state={s}>{(clubs) => {
        const pend = clubs.filter((c) => c.estado === 'Pendiente'), otros = clubs.filter((c) => c.estado !== 'Pendiente')
        return (
          <>
            <h6 className="fw-bold mb-2">Pendientes ({pend.length})</h6>
            {pend.length ? (
              <div className="table-responsive mb-4"><table className="table table-sp"><thead><tr><th>Club</th><th>Disciplina</th><th>Documentos</th><th /></tr></thead><tbody>
                {pend.map((c) => (
                  <tr key={c.id}><td>{c.nombre}</td><td>{c.disciplina}</td><td>{c.documentos.length} archivo(s)</td>
                    <td className="d-flex gap-2">
                      <button className="btn btn-sm btn-sp-green" onClick={() => approve(c)}><i className="bi bi-check2" /> Aprobar</button>
                      <button className="btn btn-sm btn-sp-danger" onClick={() => setRejecting(c)}><i className="bi bi-x" /> Rechazar</button></td></tr>
                ))}
              </tbody></table></div>
            ) : <p className="text-muted-sp mb-4">No hay clubes pendientes.</p>}
            <h6 className="fw-bold mb-2">Historial</h6>
            <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Club</th><th>Estado</th></tr></thead><tbody>
              {otros.map((c) => <tr key={c.id}><td>{c.nombre}</td><td><Badge estado={c.estado} /></td></tr>)}
            </tbody></table></div>
          </>
        )
      }}</Load>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Motivo de rechazo"
             footer={<button className="btn-sp-danger" onClick={reject}>Rechazar Club</button>}>
        <textarea className="form-control" rows={3} placeholder="Ej: Documento NIT ilegible, falta certificado..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Modal>
    </>
  )
}

export function Usuarios() {
  const { toast, meta } = useApp()
  const s = useFetch('/users')
  const [target, setTarget] = useState(null)
  const [rol, setRol] = useState('Deportista')
  const open = (u) => { setTarget(u); setRol(u.rol) }
  const save = async () => {
    try { await api.put(`/users/${target.id}/role`, { rol }); toast(`Rol de ${target.nombre} actualizado a ${rol}.`); setTarget(null); s.reload() }
    catch (e) { toast(e.message, 'danger') }
  }
  return (
    <>
      <ViewHeader icon="bi-people-fill" title="Usuarios y Roles" subtitle="Administra el rol asignado a cada usuario del sistema." />
      <Load state={s}>{(users) => (
        <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th /></tr></thead><tbody>
          {users.map((u) => (
            <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td><Badge estado="activo" /> {u.rol}</td>
              <td><button className="btn btn-sm btn-sp-outline" onClick={() => open(u)}><i className="bi bi-pencil" /> Cambiar rol</button></td></tr>
          ))}
        </tbody></table></div>
      )}</Load>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Cambiar rol de usuario" footer={<button className="btn-green-submit" onClick={save}>Guardar</button>}>
        {target && <p className="small text-muted-sp mb-2">{target.nombre} — {target.email}</p>}
        <select className="form-select" value={rol} onChange={(e) => setRol(e.target.value)}>{meta.roles.map((r) => <option key={r}>{r}</option>)}</select>
      </Modal>
    </>
  )
}

export function NoticiasAdmin() {
  const { toast } = useApp()
  const s = useFetch('/news')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ titulo: '', contenido: '' })
  const save = async () => {
    try { await api.post('/news', f); toast('Noticia publicada en la página principal.'); setOpen(false); setF({ titulo: '', contenido: '' }); s.reload() }
    catch (e) { toast(e.message, 'danger') }
  }
  return (
    <>
      <ViewHeader icon="bi-newspaper" title="Noticias" />
      <button className="btn-sp-green mb-3" onClick={() => setOpen(true)}><i className="bi bi-plus-lg me-1" />Publicar noticia</button>
      <Load state={s}>{(news) => <div className="row g-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>}</Load>
      <Modal open={open} onClose={() => setOpen(false)} title="Publicar noticia" icon="bi-newspaper" footer={<button className="btn-green-submit" onClick={save}>Publicar</button>}>
        <div className="mb-2"><input className="form-control" placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
        <textarea className="form-control" rows={4} placeholder="Contenido..." value={f.contenido} onChange={(e) => setF({ ...f, contenido: e.target.value })} />
      </Modal>
    </>
  )
}

/* ───────── Mensajería y reportes ───────── */
export function Mensajes() {
  const s = useFetch('/messages/targets')
  const [target, setTarget] = useState(null)
  return (
    <>
      <ViewHeader icon="bi-chat-dots" title="Mensajería Interna" subtitle="Envía mensajes masivos a tus inscritos o miembros." />
      <Load state={s}>{(items) => items.length ? items.map((it) => (
        <div className="bg-card rounded-xl p-3 mb-2 d-flex justify-content-between align-items-center" key={it.id}>
          <span>{it.label}</span>
          <button className="btn btn-sm btn-sp-outline" onClick={() => setTarget(it)}><i className="bi bi-megaphone" /> Enviar mensaje</button>
        </div>
      )) : <p className="text-muted-sp">No tienes torneos/clubes activos para enviar mensajes.</p>}</Load>
      <MessageModal target={target} onClose={() => setTarget(null)} />
    </>
  )
}

export function Reportes() {
  const { toast } = useApp()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ tipo: 'clubes', desde: '', hasta: '' })
  const generar = async (format) => {
    try {
      const rows = await api.get(`/reports/${f.tipo}?desde=${f.desde}&hasta=${f.hasta}`)
      if (!rows.length) return toast('No hay datos para el reporte seleccionado.', 'danger')
      if (format === 'excel') {
        const headers = Object.keys(rows[0])
        const csv = [headers.join(',')].concat(rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))).join('\n')
        downloadBlob('\ufeff' + csv, `reporte_${f.tipo}.csv`, 'text/csv;charset=utf-8;')
      } else if (!openPrintReport(f.tipo, rows, f.desde, f.hasta)) {
        return toast('Tu navegador bloqueó la ventana del reporte. Permite las ventanas emergentes.', 'danger')
      }
      toast(`Reporte de ${f.tipo} generado en formato ${format.toUpperCase()}.`)
    } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <>
      <ViewHeader icon="bi-file-earmark-bar-graph" title="Reportes" subtitle="Genera y descarga reportes en PDF o Excel." />
      <button className="btn-sp-green" onClick={() => setOpen(true)}><i className="bi bi-plus-lg me-1" />Generar reporte</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Generar reporte" icon="bi-file-earmark-bar-graph"
             footer={<>
               <button className="btn-sp-outline" onClick={() => generar('pdf')}><i className="bi bi-file-earmark-pdf me-1" />PDF</button>
               <button className="btn-green-submit" onClick={() => generar('excel')}><i className="bi bi-file-earmark-excel me-1" />Excel</button>
             </>}>
        <div className="mb-2"><label className="form-label">Tipo de reporte</label>
          <select className="form-select" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            <option value="clubes">Participación de clubes</option><option value="torneos">Estadísticas de torneos</option><option value="inscripciones">Inscripciones</option></select></div>
        <div className="row g-2 mb-2">
          <div className="col-6"><label className="form-label">Desde</label><input className="form-control" type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></div>
          <div className="col-6"><label className="form-label">Hasta</label><input className="form-control" type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  )
}
