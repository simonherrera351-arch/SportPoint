import { Link } from 'react-router-dom'
import { fmtDate, fmtMoney } from '../utils'
<<<<<<< HEAD
import FrameBorder from './FrameBorder'
=======
>>>>>>> 4155370e60c404ada4d166ac5eb9ee390cf14054

const BADGES = { Aprobado: 'aprobado', Pendiente: 'pendiente', Rechazado: 'rechazado', Abierto: 'abierto', Cerrado: 'cerrado', 'En curso': 'curso', Finalizado: 'finalizado', activo: 'activo' }

export const Badge = ({ estado, children, className = '' }) => (
  <span className={`badge-estado badge-${BADGES[estado] || 'pendiente'} ${className}`}>{children ?? estado}</span>
)

export const ViewHeader = ({ icon, title, subtitle }) => (
  <div className="mb-4">
    <h2 className="font-display fs-1 mb-0"><i className={`bi ${icon} text-green me-2`} />{title}</h2>
    {subtitle && <p className="text-muted-sp">{subtitle}</p>}
  </div>
)

export const Loading = () => <div className="text-muted-sp py-5 text-center"><i className="bi bi-hourglass-split fs-1" /></div>

export const ErrorBox = ({ error }) => <div className="alert alert-danger">{error?.message || 'No se pudo cargar la información.'}</div>

export const EmptyResults = ({ text }) => (
  <div className="col-12 text-center text-muted-sp py-5"><i className="bi bi-search fs-1 d-block mb-2" />{text}</div>
)

export const Kpi = ({ value, label, col = 'col-md-4' }) => (
  <div className={col}><div className="kpi-card"><div className="kpi-num">{value}</div><div className="kpi-label">{label}</div></div></div>
)

export const ClubCard = ({ c }) => (
  <div className="col-md-4">
<<<<<<< HEAD
    <FrameBorder className="h-100">
=======
>>>>>>> 4155370e60c404ada4d166ac5eb9ee390cf14054
    <Link to={`/clubes/${c.id}`} className="club-card h-100 d-block text-white text-decoration-none">
      <div className="card-cover"><i className="bi bi-shield-fill-check" /></div>
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <h6 className="fw-bold mb-0">{c.nombre}</h6><Badge estado={c.estado} />
        </div>
        <p className="small text-muted-sp mb-1">
          <i className="bi bi-award me-1" />{c.disciplina} &nbsp; <i className="bi bi-geo-alt me-1" />{c.comuna.split(' - ')[1] || c.comuna}
        </p>
        <p className="small text-muted-sp mb-1"><i className="bi bi-cash-coin me-1" />{fmtMoney(c.cuota)}/mes</p>
        {c.rating
          ? <p className="small mb-0"><i className="bi bi-star-fill text-warning me-1" />{c.rating} ({c.reviews.length})</p>
          : <p className="small text-muted-sp mb-0">Sin reseñas aún</p>}
      </div>
    </Link>
<<<<<<< HEAD
    </FrameBorder>
=======
>>>>>>> 4155370e60c404ada4d166ac5eb9ee390cf14054
  </div>
)

export const TorneoCard = ({ t }) => {
  const left = t.cupo - t.cuposOcupados
  return (
    <div className="col-md-4">
<<<<<<< HEAD
      <FrameBorder className="h-100">
=======
>>>>>>> 4155370e60c404ada4d166ac5eb9ee390cf14054
      <Link to={`/torneos/${t.id}`} className="torneo-card h-100 d-block text-white text-decoration-none">
        <div className="card-cover"><i className="bi bi-trophy-fill" /></div>
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <h6 className="fw-bold mb-0">{t.nombre}</h6><Badge estado={t.estado} />
          </div>
          <p className="small text-muted-sp mb-1"><i className="bi bi-award me-1" />{t.disciplina} &nbsp; <i className="bi bi-people me-1" />{t.categoria}</p>
          <p className="small text-muted-sp mb-1"><i className="bi bi-calendar-event me-1" />{fmtDate(t.fechaInicio)} → {fmtDate(t.fechaFin)}</p>
          <p className="small mb-0">
            <i className="bi bi-ticket-perforated me-1" />{fmtMoney(t.costo)} &nbsp;·&nbsp;
            <span className={left <= 0 ? 'text-danger' : 'text-green'}>{Math.max(left, 0)} cupos libres</span>
          </p>
        </div>
      </Link>
<<<<<<< HEAD
      </FrameBorder>
=======
>>>>>>> 4155370e60c404ada4d166ac5eb9ee390cf14054
    </div>
  )
}

export const NewsCard = ({ n, withDate }) => (
  <div className="col-md-6">
    <div className="bg-card news-card rounded-xl p-3 h-100">
      <h6 className="fw-bold">{n.titulo}</h6>
      <p className="small mb-2">{n.contenido}</p>
      {withDate && <small>{fmtDate(n.fecha)}</small>}
    </div>
  </div>
)

export const Stars = ({ value, onChange }) => (
  <div className="mb-3 fs-3">
    {[1, 2, 3, 4, 5].map((v) => (
      <i key={v} role="button" className={`bi ${v <= value ? 'bi-star-fill filled' : 'bi-star'} star`} onClick={() => onChange(v)} />
    ))}
  </div>
)
