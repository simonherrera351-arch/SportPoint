import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, qsFrom } from '../api'
import { useApp, useFetch } from '../context'
import { Badge, ClubCard, EmptyResults, ErrorBox, Loading, NewsCard, TorneoCard } from '../components/ui'
import { ClubFormModal, MessageModal, ReviewModal, ScoreModal } from '../components/forms'
import { COMUNA_COORDS, fmtDate, fmtMoney } from '../utils'

/* ───────── Inicio ───────── */
export function Home() {
  const { data, loading, error } = useFetch('/home')
  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />
  const { stats, torneos, noticias } = data
  return (
    <section>
      <div className="py-5 px-4 px-lg-5 rounded-xl mb-4"
           style={{ background: 'radial-gradient(circle at 20% 20%, #12241a 0%, #0d0d0d 60%)', margin: '-1.5rem -1.5rem 0' }}>
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <span className="badge-estado badge-activo mb-3 d-inline-block">Medellín · Deporte local</span>
            <h1 className="font-display display-3 mb-3">Descubre, compite y crece con <span className="text-green">SportPoint</span></h1>
            <p className="text-muted-sp fs-5 mb-4">La plataforma que conecta deportistas, clubes y torneos de la ciudad. Busca por deporte, comuna, edad y costo — sin necesidad de iniciar sesión.</p>
            <div className="d-flex flex-wrap gap-3">
              <Link className="btn-green-submit" to="/clubes"><i className="bi bi-search me-2" />Explorar Clubes</Link>
              <Link className="btn-sp-outline" to="/torneos"><i className="bi bi-trophy me-2" />Ver Torneos</Link>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="bg-card rounded-xl p-4">
              <div className="row text-center g-3">
                {[[stats.clubes, 'Clubes activos'], [stats.torneos, 'Torneos vigentes'], [stats.deportistas, 'Deportistas'], [stats.comunas, 'Comunas cubiertas']].map(([n, l]) => (
                  <div className="col-6" key={l}><div className="kpi-num">{n}</div><div className="kpi-label">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div><h3 className="font-display fs-2 mb-1">Torneos destacados</h3><p className="text-muted-sp mb-0">Próximos eventos abiertos a inscripción.</p></div>
          <Link className="text-green small fw-bold" to="/torneos">Ver todos <i className="bi bi-arrow-right" /></Link>
        </div>
        <div className="row g-3">{torneos.length ? torneos.map((t) => <TorneoCard key={t.id} t={t} />) : <p className="text-muted-sp">No hay torneos abiertos por ahora.</p>}</div>
      </div>

      <div className="py-4">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <h3 className="font-display fs-2 mb-1">Últimas noticias</h3>
          <Link className="text-green small fw-bold" to="/noticias">Ver todas <i className="bi bi-arrow-right" /></Link>
        </div>
        <div className="row g-3">
          {noticias.map((n) => (
            <div className="col-md-6" key={n.id}><div className="bg-card rounded-xl p-3 h-100">
              <h6 className="fw-bold">{n.titulo}</h6><p className="text-muted-sp small mb-0">{n.contenido}</p>
            </div></div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── Directorio de clubes ───────── */
export function Clubes() {
  const { meta } = useApp()
  const [f, setF] = useState({ texto: '', deporte: '', comuna: '', costo: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { data, loading, error } = useFetch('/clubs' + qsFrom(f))
  return (
    <>
      <h2 className="font-display fs-1 mb-3">Directorio de Clubes</h2>
      <div className="row g-2 mb-3">
        <div className="col-md-3"><input className="form-control" placeholder="Buscar por nombre..." value={f.texto} onChange={set('texto')} /></div>
        <div className="col-md-3"><select className="form-select" value={f.deporte} onChange={set('deporte')}><option value="">Todos los deportes</option>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={f.comuna} onChange={set('comuna')}><option value="">Todas las comunas</option>{meta.comunas.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={f.costo} onChange={set('costo')}>
          <option value="">Cualquier costo</option><option value="0-50000">$0 – $50.000</option>
          <option value="50000-100000">$50.000 – $100.000</option><option value="100000-999999999">Más de $100.000</option></select></div>
      </div>
      {error ? <ErrorBox error={error} /> : (
        <div className="row g-3">
          {loading && !data ? <Loading /> : data?.length ? data.map((c) => <ClubCard key={c.id} c={c} />) : <EmptyResults text="No se encontraron clubes con esos filtros." />}
        </div>
      )}
    </>
  )
}

/* ───────── Detalle de club ───────── */
const Cell = ({ t, v }) => <div className="col-md-6"><strong>{t}</strong><p className="text-muted-sp mb-0">{v}</p></div>

export function ClubDetalle() {
  const { id } = useParams()
  const { user, toast, setAuthModal } = useApp()
  const { data: c, loading, error, reload, setData } = useFetch(`/clubs/${id}`, [user?.id])
  const [editing, setEditing] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  if (loading && !c) return <Loading />
  if (error) return <p className="text-muted-sp">Club no encontrado. <Link to="/clubes" className="text-green">Volver al directorio</Link></p>

  const isOwner = user && user.id === c.adminId
  const act = async (fn, okMsg) => {
    try { setData(await fn()); if (okMsg) toast(okMsg) } catch (e) { toast(e.message, 'danger') }
  }
  const apply = () => {
    if (!user) { toast('Inicia sesión como deportista para aplicar.', 'info'); return setAuthModal('login') }
    act(() => api.post(`/clubs/${c.id}/apply`), `Solicitud enviada a "${c.nombre}". Te avisaremos cuando la respondan.`)
  }

  let applyBtn = null
  if (c.estado === 'Aprobado') {
    if (!user) applyBtn = <button className="btn-sp-green btn-sm" onClick={apply}><i className="bi bi-person-plus me-1" />Aplicar al club</button>
    else if (user.rol === 'Deportista') {
      if (c.soyMiembro) applyBtn = <span className="badge-estado badge-activo align-self-center"><i className="bi bi-check-circle me-1" />Ya perteneces a este club</span>
      else if (c.solicitudEnviada) applyBtn = <button className="btn-sp-outline btn-sm" onClick={() => act(() => api.del(`/clubs/${c.id}/apply`), 'Solicitud cancelada.')}><i className="bi bi-hourglass-split me-1" />Solicitud enviada · Cancelar</button>
      else applyBtn = <button className="btn-sp-green btn-sm" onClick={apply}><i className="bi bi-person-plus me-1" />Aplicar al club</button>
    }
  }

  return (
    <>
      <Link className="text-green small" to="/clubes"><i className="bi bi-arrow-left me-1" />Volver al directorio</Link>
      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-start">
            <h2 className="font-display fs-1 mb-1">{c.nombre}</h2><Badge estado={c.estado} />
          </div>
          <p className="text-muted-sp mb-3"><i className="bi bi-award me-1" />{c.disciplina} &nbsp;·&nbsp; <i className="bi bi-geo-alt me-1" />{c.comuna} &nbsp;·&nbsp; <i className="bi bi-star-fill text-warning me-1" />{c.rating ?? '—'}</p>
          <div className="bg-card rounded-xl p-4 mb-3"><div className="row g-3">
            <Cell t="Dirección de sede" v={c.direccion || '—'} />
            <Cell t="Horarios" v={c.horarios || '—'} />
            <Cell t="Entrenadores" v={(c.entrenadores || []).join(', ') || '—'} />
            <Cell t="Cuota mensual" v={fmtMoney(c.cuota)} />
            <Cell t="Deportistas afiliados" v={c.numMiembros} />
            <Cell t="Documentos" v={`${(c.documentos || []).length} archivo(s) cargado(s)`} />
          </div></div>
          <div className="d-flex gap-2 flex-wrap">
            {isOwner && <button className="btn-sp-outline btn-sm" onClick={() => setEditing(true)}><i className="bi bi-pencil me-1" />Editar ficha</button>}
            {applyBtn}
            {user?.rol === 'Deportista' && <button className="btn-sp-outline btn-sm" onClick={() => setReviewing(true)}><i className="bi bi-star me-1" />Calificar club</button>}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="bg-card rounded-xl p-3">
            <h6 className="fw-bold mb-3">Reseñas ({c.reviews.length})</h6>
            {c.reviews.length ? c.reviews.map((r, i) => (
              <div className="mb-2 pb-2 border-bottom border-secondary" key={i}>
                <div>{'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}</div>
                <small className="text-muted-sp">{r.comentario}</small>
              </div>)) : <p className="small text-muted-sp">Aún no hay reseñas.</p>}
          </div>
        </div>
      </div>
      <ClubFormModal open={editing} club={c} onClose={() => setEditing(false)} onSaved={reload} />
      <ReviewModal clubId={reviewing ? c.id : null} onClose={() => setReviewing(false)} onDone={reload} />
    </>
  )
}

/* ───────── Torneos ───────── */
export function Torneos() {
  const { meta } = useApp()
  const [f, setF] = useState({ texto: '', deporte: '', categoria: '', estado: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { data, loading, error } = useFetch('/tournaments' + qsFrom(f))
  return (
    <>
      <h2 className="font-display fs-1 mb-3">Torneos</h2>
      <div className="row g-2 mb-3">
        <div className="col-md-3"><input className="form-control" placeholder="Buscar por nombre..." value={f.texto} onChange={set('texto')} /></div>
        <div className="col-md-3"><select className="form-select" value={f.deporte} onChange={set('deporte')}><option value="">Todos los deportes</option>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={f.categoria} onChange={set('categoria')}><option value="">Todas las categorías</option>{meta.categorias.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={f.estado} onChange={set('estado')}>
          <option value="">Cualquier estado</option><option>Abierto</option><option>En curso</option><option>Finalizado</option></select></div>
      </div>
      {error ? <ErrorBox error={error} /> : (
        <div className="row g-3">
          {loading && !data ? <Loading /> : data?.length ? data.map((t) => <TorneoCard key={t.id} t={t} />) : <EmptyResults text="No se encontraron torneos con esos filtros." />}
        </div>
      )}
    </>
  )
}

/* ───────── Detalle de torneo ───────── */
function Bracket({ t, onScore }) {
  const canScore = (m) => t.esOrganizador && m.estado === 'Programado' && m.local.id && m.visitante.id
    && !String(m.local.id).startsWith('TBD_') && !String(m.visitante.id).startsWith('TBD_')
  if (t.formato === 'todos') {
    if (!t.matches.length) return <p className="text-muted-sp">El organizador aún no genera el fixture (todos contra todos).</p>
    return (
      <div className="table-responsive"><table className="table table-sp"><thead><tr><th>Local</th><th>Visitante</th><th>Marcador</th><th>Estado</th><th /></tr></thead><tbody>
        {t.matches.map((m) => (
          <tr key={m.id}><td>{m.local.nombre}</td><td>{m.visitante.nombre}</td>
            <td>{m.marcadorLocal !== null ? `${m.marcadorLocal} - ${m.marcadorVisitante}` : '—'}</td>
            <td><Badge estado={m.estado === 'Jugado' ? 'Aprobado' : 'Pendiente'} /></td>
            <td>{canScore(m) && <button className="btn btn-sm btn-sp-outline" onClick={() => onScore(m)}>Marcador</button>}</td></tr>
        ))}
      </tbody></table></div>
    )
  }
  if (!t.bracket) return <p className="text-muted-sp">El organizador aún no genera el bracket de eliminación directa.</p>
  return (
    <div className="bracket-wrap">
      {t.bracket.map((round, ri) => (
        <div className="bracket-round" key={ri}>
          <div className="bracket-round-title">{ri === t.bracket.length - 1 ? 'Final' : 'Ronda ' + (ri + 1)}</div>
          {round.map((m) => (
            <div className="bracket-match" key={m.id}>
              <div className={`bracket-team ${m.estado === 'Jugado' && m.marcadorLocal > m.marcadorVisitante ? 'winner' : ''} ${m.local.nombre === 'BYE' ? 'pending' : ''}`}>
                {m.local.nombre} <span>{m.marcadorLocal ?? ''}</span></div>
              <div className={`bracket-team ${m.estado === 'Jugado' && m.marcadorVisitante > m.marcadorLocal ? 'winner' : ''} ${m.visitante.nombre === 'BYE' || m.visitante.nombre.startsWith('Ganador') ? 'pending' : ''}`}>
                {m.visitante.nombre} <span>{m.marcadorVisitante ?? ''}</span></div>
              {canScore(m) && <button className="btn btn-sm btn-sp-outline w-100 mt-1" style={{ fontSize: '.7rem', padding: '2px 6px' }} onClick={() => onScore(m)}>Registrar marcador</button>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const Standings = ({ t }) => {
  if (t.formato === 'eliminacion') return <p className="text-muted-sp">Este torneo es de eliminación directa: consulta el bracket para ver avances.</p>
  if (!t.standings) return <p className="text-muted-sp">Aún no hay tabla de posiciones (genera el fixture primero).</p>
  return (
    <div className="table-responsive"><table className="table table-sp"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>Pts</th></tr></thead><tbody>
      {t.standings.map((s, i) => <tr key={s.id}><td>{i + 1}</td><td>{s.nombre}</td><td>{s.pj}</td><td>{s.pg}</td><td>{s.pe}</td><td>{s.pp}</td><td className="fw-bold text-green">{s.pts}</td></tr>)}
    </tbody></table></div>
  )
}

const Inscritos = ({ t }) => !t.teams.length
  ? <p className="text-muted-sp">Aún no hay equipos/deportistas inscritos.</p>
  : (
    <>
      <div className="table-responsive"><table className="table table-sp"><thead><tr><th>#</th><th>Nombre</th></tr></thead><tbody>
        {t.teams.map((tm, i) => <tr key={tm.id}><td>{i + 1}</td><td>{tm.nombre}</td></tr>)}
      </tbody></table></div>
      {t.numListaEspera > 0 && <p className="small text-muted-sp mt-2"><i className="bi bi-hourglass-split me-1" />{t.numListaEspera} persona(s) en lista de espera.</p>}
    </>
  )

export function TorneoDetalle() {
  const { id } = useParams()
  const { user, toast, setAuthModal } = useApp()
  const { data: t, loading, error, setData, reload } = useFetch(`/tournaments/${id}`, [user?.id])
  const [tab, setTab] = useState('bracket')
  const [score, setScore] = useState(null)
  const [msg, setMsg] = useState(null)

  if (loading && !t) return <Loading />
  if (error) return <p className="text-muted-sp">Torneo no encontrado. <Link to="/torneos" className="text-green">Volver a torneos</Link></p>

  const act = async (fn, okMsg) => {
    try { setData(await fn()); if (okMsg) toast(okMsg) } catch (e) { toast(e.message, 'danger') }
  }
  const left = t.cupo - t.cuposOcupados
  let inscBtn
  if (!user) inscBtn = <button className="btn-green-submit" onClick={() => { toast('Inicia sesión para inscribirte.', 'info'); setAuthModal('login') }}><i className="bi bi-pencil-square me-2" />Inscribirme</button>
  else if (user.rol !== 'Deportista') inscBtn = <span className="small text-muted-sp">Solo deportistas pueden inscribirse.</span>
  else if (t.yaInscrito) inscBtn = <span className="badge-estado badge-aprobado"><i className="bi bi-check2 me-1" />Ya estás inscrito</span>
  else if (t.enLista) inscBtn = <span className="badge-estado badge-pendiente"><i className="bi bi-hourglass-split me-1" />En lista de espera</span>
  else if (t.estado !== 'Abierto') inscBtn = <span className="small text-muted-sp">Inscripciones cerradas.</span>
  else if (left <= 0) inscBtn = <button className="btn-sp-outline" onClick={() => act(() => api.post(`/tournaments/${t.id}/waitlist`), 'Te uniste a la lista de espera. Te avisaremos si se libera un cupo.')}><i className="bi bi-hourglass me-2" />Unirme a lista de espera</button>
  else inscBtn = <button className="btn-green-submit" onClick={() => act(() => api.post(`/tournaments/${t.id}/register`), 'Inscripción registrada en estado PENDIENTE.')}><i className="bi bi-pencil-square me-2" />Inscribirme ({left} cupos)</button>

  const TABS = [['bracket', 'Bracket / Fixture'], ['posiciones', 'Tabla de posiciones'], ['inscritos', 'Inscritos']]
  return (
    <>
      <Link className="text-green small" to="/torneos"><i className="bi bi-arrow-left me-1" />Volver a torneos</Link>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mt-2">
        <div><h2 className="font-display fs-1 mb-1">{t.nombre}</h2>
          <p className="text-muted-sp mb-2"><i className="bi bi-award me-1" />{t.disciplina} &nbsp;·&nbsp; <i className="bi bi-people me-1" />{t.categoria} &nbsp;·&nbsp; <i className="bi bi-geo-alt me-1" />{t.sede}</p></div>
        <Badge estado={t.estado} />
      </div>
      <div className="row g-2 mb-3">
        <div className="col-auto small text-muted-sp"><i className="bi bi-calendar-event me-1" />{fmtDate(t.fechaInicio)} → {fmtDate(t.fechaFin)}</div>
        <div className="col-auto small text-muted-sp"><i className="bi bi-ticket-perforated me-1" />{fmtMoney(t.costo)}</div>
        <div className="col-auto small text-muted-sp"><i className="bi bi-people-fill me-1" />{t.cuposOcupados}/{t.cupo} cupos</div>
      </div>
      <div className="d-flex gap-2 flex-wrap mb-4">
        {inscBtn}
        {t.esOrganizador && <button className="btn-sp-outline" onClick={() => act(() => api.post(`/tournaments/${t.id}/bracket`), 'Fixture / bracket generado automáticamente.')}><i className="bi bi-diagram-3 me-2" />Generar Fixture/Bracket</button>}
        {t.esOrganizador && <button className="btn-sp-outline" onClick={() => setMsg({ type: 'torneo', id: t.id, label: t.nombre, n: t.teams.length })}><i className="bi bi-megaphone me-2" />Mensaje a inscritos</button>}
      </div>
      {t.reglamento && <div className="bg-card rounded-xl p-3 mb-4"><strong>Reglamento:</strong> <span className="text-muted-sp">{t.reglamento}</span></div>}
      {t.sponsors?.length > 0 && <div className="mb-4"><strong className="small">Patrocinadores:</strong> {t.sponsors.map((s, i) => <span key={i} className="badge-estado badge-curso ms-1">{s.nombre}</span>)}</div>}
      <ul className="nav nav-tabs border-secondary mb-3">
        {TABS.map(([k, label]) => (
          <li className="nav-item" key={k}><a className={`nav-link text-white ${tab === k ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab(k)}>{label}</a></li>
        ))}
      </ul>
      {tab === 'bracket' && <Bracket t={t} onScore={(m) => setScore({ torneoId: t.id, match: m })} />}
      {tab === 'posiciones' && <Standings t={t} />}
      {tab === 'inscritos' && <Inscritos t={t} />}
      <ScoreModal ctx={score} onClose={() => setScore(null)} onDone={reload} />
      <MessageModal target={msg} onClose={() => setMsg(null)} />
    </>
  )
}

/* ───────── Calendario ───────── */
export function Calendario() {
  const { meta } = useApp()
  const [deporte, setDeporte] = useState('')
  const { data, loading, error } = useFetch('/tournaments' + qsFrom({ deporte }))
  const list = useMemo(() => (data || []).slice().sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)), [data])
  return (
    <>
      <h2 className="font-display fs-1 mb-3">Calendario de Eventos</h2>
      <div className="row g-2 mb-3">
        <div className="col-md-4"><select className="form-select" value={deporte} onChange={(e) => setDeporte(e.target.value)}><option value="">Todos los deportes</option>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
      </div>
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !list.length ? <p className="text-muted-sp">No hay eventos programados.</p> : list.map((t) => (
        <Link key={t.id} to={`/torneos/${t.id}`} className="bg-card rounded-xl p-3 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2 text-white text-decoration-none">
          <div><strong>{fmtDate(t.fechaInicio)}</strong> — {t.nombre} <span className="text-muted-sp small">({t.disciplina}, {t.categoria})</span></div>
          <Badge estado={t.estado} />
        </Link>
      ))}
    </>
  )
}

/* ───────── Mapa ───────── */
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

export function Mapa() {
  const { meta } = useApp()
  const [f, setF] = useState({ deporte: '', comuna: '' })
  const { data, error } = useFetch('/clubs' + qsFrom(f))
  return (
    <>
      <h2 className="font-display fs-1 mb-3">Mapa de Clubes</h2>
      <div className="row g-2 mb-3">
        <div className="col-md-3"><select className="form-select" value={f.deporte} onChange={(e) => setF({ ...f, deporte: e.target.value })}><option value="">Todos los deportes</option>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={f.comuna} onChange={(e) => setF({ ...f, comuna: e.target.value })}><option value="">Todas las comunas</option>{meta.comunas.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      {error && <ErrorBox error={error} />}
      <div className="mini-map">
        {Object.entries(COMUNA_COORDS).map(([name, [x, y]]) => (
          <div key={name} className="comuna-zone" style={{ left: `${x - 6}%`, top: `${y - 4}%` }}>{name.split(' - ')[1]}</div>
        ))}
        {(data || []).map((c) => {
          const [x, y] = COMUNA_COORDS[c.comuna] || [50, 50]
          const h = hash(c.id) // dispersión estable (el prototipo la recalculaba al azar en cada render)
          return <Link key={c.id} to={`/clubes/${c.id}`} className="map-pin" title={c.nombre}
                       style={{ left: `${x + ((h % 600) / 100 - 3)}%`, top: `${y + (((h >> 8) % 600) / 100 - 3)}%` }}><i className="bi bi-geo-alt-fill" /></Link>
        })}
      </div>
      <p className="text-muted-sp small mt-2"><i className="bi bi-info-circle me-1" />Ubicación referencial por comuna (prototipo sin proveedor de mapas externo).</p>
    </>
  )
}

/* ───────── Noticias ───────── */
export function Noticias() {
  const { data, loading, error } = useFetch('/news')
  return (
    <>
      <h2 className="font-display fs-1 mb-3">Noticias</h2>
      {error ? <ErrorBox error={error} /> : loading ? <Loading /> : <div className="row g-3">{data.map((n) => <NewsCard key={n.id} n={n} withDate />)}</div>}
    </>
  )
}

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="text-center py-5">
      <h2 className="font-display fs-1">Página no encontrada</h2>
      <button className="btn-green-submit mt-3" onClick={() => navigate('/')}>Ir al inicio</button>
    </div>
  )
}
