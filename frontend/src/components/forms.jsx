import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../context'
import Modal from './Modal'
import { Stars } from './ui'

const Footer = ({ onCancel, onSave, saveLabel, icon = 'bi-save', danger }) => (
  <>
    {onCancel && <button className="btn-sp-outline" onClick={onCancel}>Cancelar</button>}
    <button className={danger ? 'btn-sp-danger' : 'btn-green-submit'} onClick={onSave}><i className={`bi ${icon} me-2`} />{saveLabel}</button>
  </>
)

/* ───── Reseña de club ───── */
export function ReviewModal({ clubId, onClose, onDone }) {
  const { toast } = useApp()
  const [stars, setStars] = useState(0)
  const [comentario, setComentario] = useState('')
  const save = async () => {
    try {
      await api.post(`/clubs/${clubId}/reviews`, { estrellas: stars, comentario })
      toast('¡Gracias por tu reseña!'); onDone?.(); onClose()
    } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <Modal open={!!clubId} onClose={onClose} title="Calificar Club" icon="bi-star"
           footer={<button className="btn-green-submit" onClick={save}>Publicar reseña</button>}>
      <Stars value={stars} onChange={setStars} />
      <textarea className="form-control" rows={3} placeholder="Cuéntanos tu experiencia..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
    </Modal>
  )
}

/* ───── Ficha de club (crear / editar) ───── */
export function ClubFormModal({ open, club, onClose, onSaved }) {
  const { toast, meta } = useApp()
  const empty = { nombre: '', disciplina: 'Fútbol', comuna: 'Comuna 1 - Popular', direccion: '', horarios: '', entrenadores: '', cuota: '' }
  const [f, setF] = useState(empty)
  const [docs, setDocs] = useState([])
  useEffect(() => {
    if (!open) return
    setDocs([])
    setF(club ? { ...club, entrenadores: (club.entrenadores || []).join(', '), cuota: club.cuota ?? '' } : empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, club])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.nombre.trim()) return toast('El nombre del club es obligatorio.', 'danger')
    if (f.cuota === '') return toast('Indica la cuota mensual (puede ser 0).', 'danger')
    for (const d of docs) if (d.size > 10 * 1024 * 1024) return toast(`El archivo ${d.name} supera 10MB.`, 'danger')
    const body = {
      nombre: f.nombre, disciplina: f.disciplina, comuna: f.comuna, direccion: f.direccion, horarios: f.horarios,
      entrenadores: f.entrenadores.split(',').map((s) => s.trim()).filter(Boolean), cuota: Number(f.cuota),
      documentos: docs.map((d) => d.name),
    }
    try {
      if (club) { await api.put(`/clubs/${club.id}`, body); toast('Ficha del club actualizada.') }
      else { await api.post('/clubs', body); toast('Club registrado. Queda en estado PENDIENTE para validación.', 'info') }
      onSaved?.(); onClose()
    } catch (e) { toast(e.message, 'danger') }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" icon="bi-building" title={club ? 'Editar Club' : 'Registrar Club'}
           footer={<Footer onCancel={onClose} onSave={save} saveLabel="Guardar Club" />}>
      <div className="row g-2">
        <div className="col-md-8"><label className="form-label required-note">Nombre del club</label><input className="form-control" value={f.nombre} onChange={set('nombre')} /></div>
        <div className="col-md-4"><label className="form-label required-note">Disciplina</label>
          <select className="form-select" value={f.disciplina} onChange={set('disciplina')}>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label required-note">Comuna / Ubicación</label>
          <select className="form-select" value={f.comuna} onChange={set('comuna')}>{meta.comunas.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label">Dirección de sede</label><input className="form-control" value={f.direccion} onChange={set('direccion')} /></div>
        <div className="col-md-6"><label className="form-label">Horarios</label><input className="form-control" placeholder="Lun-Vie 4:00pm-6:00pm" value={f.horarios} onChange={set('horarios')} /></div>
        <div className="col-md-6"><label className="form-label">Entrenadores (separados por coma)</label><input className="form-control" value={f.entrenadores} onChange={set('entrenadores')} /></div>
        <div className="col-md-6"><label className="form-label required-note">Cuota mensual (COP)</label><input className="form-control" type="number" placeholder="50000" value={f.cuota} onChange={set('cuota')} /></div>
        <div className="col-md-6"><label className="form-label">Logo del club</label><input className="form-control" type="file" accept="image/*" /></div>
        <div className="col-md-12"><label className="form-label">Documentos institucionales (PDF/imagen, máx. 10MB c/u)</label>
          <input className="form-control" type="file" accept="image/*,.pdf" multiple onChange={(e) => setDocs(Array.from(e.target.files))} /></div>
      </div>
      <div className="alert alert-info py-2 mt-3 mb-0 small"><i className="bi bi-info-circle me-1" />Tu club quedará en estado <strong>PENDIENTE</strong> hasta que un Administrador del Sistema valide los documentos.</div>
    </Modal>
  )
}

/* ───── Mensaje masivo ───── */
export function MessageModal({ target, onClose }) {
  const { toast } = useApp()
  const [contenido, setContenido] = useState('')
  useEffect(() => { setContenido('') }, [target])
  const send = async () => {
    if (!contenido.trim()) return toast('Escribe un mensaje.', 'danger')
    try {
      const r = await api.post('/messages', { type: target.type, id: target.id, contenido })
      toast(`Mensaje enviado a ${r.enviados} destinatario(s).`); onClose()
    } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <Modal open={!!target} onClose={onClose} title="Mensaje masivo" icon="bi-megaphone"
           footer={<button className="btn-green-submit" onClick={send}>Enviar a todos</button>}>
      {target && <p className="small text-muted-sp">
        Se enviará a los {target.n} {target.type === 'torneo' ? 'inscrito(s) del torneo' : 'miembro(s) del club'} "{target.label}".
      </p>}
      <textarea className="form-control" rows={4} placeholder="Escribe tu mensaje..." value={contenido} onChange={(e) => setContenido(e.target.value)} />
    </Modal>
  )
}

/* ───── Marcador ───── */
export function ScoreModal({ ctx, onClose, onDone }) {
  const { toast } = useApp()
  const [s, setS] = useState({ local: 0, visitante: 0 })
  useEffect(() => { setS({ local: 0, visitante: 0 }) }, [ctx])
  const save = async () => {
    try {
      await api.post(`/tournaments/${ctx.torneoId}/matches/${ctx.match.id}/score`, { local: Number(s.local), visitante: Number(s.visitante) })
      toast('Marcador registrado. Tabla de posiciones actualizada al instante.'); onDone(); onClose()
    } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <Modal open={!!ctx} onClose={onClose} title="Registrar Marcador" icon="bi-clipboard-data"
           footer={<button className="btn-green-submit" onClick={save}>Guardar Resultado</button>}>
      {ctx && (
        <div className="row g-2 align-items-center">
          <div className="col-5 text-center"><strong>{ctx.match.local.nombre}</strong>
            <input type="number" min="0" className="form-control text-center mt-2" value={s.local} onChange={(e) => setS({ ...s, local: e.target.value })} /></div>
          <div className="col-2 text-center fs-4">VS</div>
          <div className="col-5 text-center"><strong>{ctx.match.visitante.nombre}</strong>
            <input type="number" min="0" className="form-control text-center mt-2" value={s.visitante} onChange={(e) => setS({ ...s, visitante: e.target.value })} /></div>
        </div>
      )}
    </Modal>
  )
}

/* ───── Torneo nuevo ───── */
export function TorneoFormModal({ open, onClose, onSaved }) {
  const { toast, meta } = useApp()
  const empty = { nombre: '', disciplina: 'Fútbol', categoria: 'Sub-12', fechaInicio: '', fechaFin: '', sede: '', cupo: 8, costo: 0, formato: 'eliminacion', patrocinador: '', reglamento: '' }
  const [f, setF] = useState(empty)
  useEffect(() => { if (open) setF(empty) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    if (!f.nombre.trim() || !f.fechaInicio || !f.fechaFin) return toast('Completa nombre y fechas del torneo.', 'danger')
    if (new Date(f.fechaFin) < new Date(f.fechaInicio)) return toast('La fecha fin no puede ser anterior a la fecha de inicio.', 'danger')
    if (!Number(f.cupo) || Number(f.cupo) < 2) return toast('El cupo máximo debe ser al menos 2.', 'danger')
    try {
      await api.post('/tournaments', { ...f, cupo: Number(f.cupo), costo: Number(f.costo) || 0 })
      toast(`Torneo "${f.nombre}" publicado y disponible para inscripciones.`); onSaved?.(); onClose()
    } catch (e) { toast(e.message, 'danger') }
  }
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Crear Torneo" icon="bi-trophy"
           footer={<Footer onCancel={onClose} onSave={save} saveLabel="Publicar Torneo" />}>
      <div className="row g-2">
        <div className="col-md-8"><label className="form-label required-note">Nombre del torneo</label><input className="form-control" value={f.nombre} onChange={set('nombre')} /></div>
        <div className="col-md-4"><label className="form-label required-note">Disciplina</label>
          <select className="form-select" value={f.disciplina} onChange={set('disciplina')}>{meta.deportes.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label required-note">Categoría de edad</label>
          <select className="form-select" value={f.categoria} onChange={set('categoria')}>{meta.categorias.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label required-note">Fecha inicio</label><input className="form-control" type="date" value={f.fechaInicio} onChange={set('fechaInicio')} /></div>
        <div className="col-md-4"><label className="form-label required-note">Fecha fin</label><input className="form-control" type="date" value={f.fechaFin} onChange={set('fechaFin')} /></div>
        <div className="col-md-6"><label className="form-label">Sede</label><input className="form-control" value={f.sede} onChange={set('sede')} /></div>
        <div className="col-md-3"><label className="form-label required-note">Cupo máximo</label><input className="form-control" type="number" value={f.cupo} onChange={set('cupo')} /></div>
        <div className="col-md-3"><label className="form-label">Costo inscripción</label><input className="form-control" type="number" value={f.costo} onChange={set('costo')} /></div>
        <div className="col-md-6"><label className="form-label">Formato</label>
          <select className="form-select" value={f.formato} onChange={set('formato')}><option value="eliminacion">Eliminación directa (bracket)</option><option value="todos">Todos contra todos</option></select></div>
        <div className="col-md-6"><label className="form-label">Patrocinador (nombre)</label><input className="form-control" placeholder="Opcional" value={f.patrocinador} onChange={set('patrocinador')} /></div>
        <div className="col-md-12"><label className="form-label">Reglamento (resumen)</label><textarea className="form-control" rows={2} value={f.reglamento} onChange={set('reglamento')} /></div>
      </div>
    </Modal>
  )
}
