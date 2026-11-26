import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../context'
import { calcAge } from '../utils'

const YEAR = new Date().getFullYear()
const PRESETS = { verde: '#1db954', azul: '#2f80ed', naranja: '#f2994a', morado: '#9b51e0', rojo: '#eb5757' }
const hexOk = (h) => /^#[0-9a-fA-F]{6}$/.test(h || '')
const tinta = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0b0b0b' : '#ffffff'
}
const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const codigoDe = (u) => 'SP-' + String(fnv(u.id) % 1000000).padStart(6, '0')

/** Barras decorativas deterministas (no es un código de barras real). */
function Barras({ codigo }) {
  let seed = fnv(codigo), x = 0
  const bars = []
  for (let i = 0; i < 46; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    const w = 1 + (seed % 3), gap = 1 + ((seed >> 4) % 2)
    bars.push(<rect key={i} x={x} y="0" width={w} height="34" fill="#f5f5f5" />)
    x += w + gap
  }
  return <svg viewBox={`0 0 ${x} 34`} preserveAspectRatio="none" width="100%" height="34" aria-hidden="true">{bars}</svg>
}

export function Carnet({ user, clubs, hex }) {
  const cfg = user.carnet || {}
  const accent = hexOk(hex) ? hex : '#1db954'
  const aprobados = clubs.filter((c) => c.estado === 'Aprobado')
  const clubTxt = aprobados.length ? aprobados.map((c) => c.nombre).join(' · ') : 'Sin club vinculado'
  const disc = cfg.deporte || (aprobados.length ? [...new Set(aprobados.map((c) => c.disciplina))].join(' · ') : '—')
  const edad = calcAge(user.fechaNacimiento)
  const iniciales = (user.nombre || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  const codigo = codigoDe(user)
  const extra = [cfg.posicion && 'Posición: ' + cfg.posicion, cfg.categoria && 'Categoría: ' + cfg.categoria].filter(Boolean)
  return (
    <div className="carnet-sp" id="carnetSP" style={{ '--carnet-accent': accent, '--carnet-ink': tinta(accent) }}>
      <div className="carnet-head"><span className="carnet-brand">Sport<span>Point</span></span><span className="carnet-tipo">Carnet de deportista</span></div>
      <div className="carnet-body">
        <div className="carnet-foto">{cfg.foto ? <img src={cfg.foto} alt="Foto del deportista" /> : iniciales}</div>
        <div className="carnet-datos">
          <div className="carnet-nombre">{user.nombre}</div>
          <div className="carnet-fila"><i className="bi bi-people" />{clubTxt}</div>
          <div className="carnet-fila"><i className="bi bi-trophy" />{disc}</div>
          {extra.map((t) => <div className="carnet-fila" key={t}><i className="bi bi-person-lines-fill" />{t}</div>)}
          <div className="carnet-fila"><i className="bi bi-calendar3" />{edad === null ? 'Edad no registrada' : edad + ' años'}</div>
        </div>
      </div>
      <div className={`carnet-estado ${user.docSubido ? 'ok' : 'pend'}`}>
        <i className={`bi ${user.docSubido ? 'bi-patch-check-fill' : 'bi-exclamation-triangle-fill'} me-1`} />
        {user.docSubido ? 'Identidad verificada' : 'Verificación pendiente'}
      </div>
      <div className="carnet-pie">
        <div className="carnet-meta">
          <div><small>ID</small><strong>{codigo}</strong></div>
          <div><small>Vigencia</small><strong>31 dic {YEAR}</strong></div>
        </div>
        <div className="carnet-barras"><Barras codigo={codigo} /></div>
      </div>
    </div>
  )
}

export function CarnetPanel({ user, hex, setHex }) {
  const { setUser, toast } = useApp()
  const cfg = user.carnet || {}
  const [campos, setCampos] = useState({ deporte: cfg.deporte || '', posicion: cfg.posicion || '', categoria: cfg.categoria || '' })
  const [hexText, setHexText] = useState(hex)
  useEffect(() => { setHexText(hex) }, [hex])

  const save = async (body, okMsg) => {
    try { setUser(await api.put('/me/carnet', body)); if (okMsg) toast(okMsg) } catch (e) { toast(e.message, 'danger') }
  }
  const commitColor = (h) => { if (hexOk(h)) { setHex(h.toLowerCase()); save({ colorHex: h.toLowerCase() }) } }
  const fromHexText = (v) => {
    v = v.trim(); if (v[0] !== '#') v = '#' + v
    if (!hexOk(v)) { toast('Color no válido. Usa el formato #1db954.', 'danger'); return setHexText(hex) }
    commitColor(v)
  }
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const fromRgb = (idx, val) => {
    const next = rgb.map((x, i) => (i === idx ? Number(val) : x))
    setHex('#' + next.map((x) => x.toString(16).padStart(2, '0')).join(''))
  }

  const onFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Elige un archivo de imagen.', 'danger')
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const S = 320, side = Math.min(img.width, img.height) // recorte cuadrado centrado + JPEG
        const cv = document.createElement('canvas'); cv.width = S; cv.height = S
        cv.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S)
        save({ foto: cv.toDataURL('image/jpeg', 0.82) }, 'Foto actualizada.')
      }
      img.onerror = () => toast('No se pudo leer la imagen.', 'danger')
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }
  const setC = (k) => (e) => setCampos({ ...campos, [k]: e.target.value })
  const SL = [['R', 0, '#ff6b6b'], ['G', 1, '#51d88a'], ['B', 2, '#5aa9ff']]

  return (
    <div className="carnet-panel">
      <h6 className="fw-bold mb-3"><i className="bi bi-palette text-green me-2" />Personalizar carnet</h6>
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <label className="form-label small">Foto</label>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <label className="btn-sp-outline btn-sm mb-0" style={{ cursor: 'pointer' }}><i className="bi bi-upload me-1" />Subir foto
              <input type="file" accept="image/*" hidden onChange={onFoto} /></label>
            {cfg.foto && <button type="button" className="btn-sp-outline btn-sm" onClick={() => save({ quitarFoto: true })}><i className="bi bi-trash me-1" />Quitar</button>}
          </div>
          <label className="form-label small">Datos del carnet</label>
          <div className="row g-2">
            <div className="col-12"><input className="form-control form-control-sm" maxLength={30} placeholder="Deporte (ej: Fútbol)" value={campos.deporte} onChange={setC('deporte')} /></div>
            <div className="col-6"><input className="form-control form-control-sm" maxLength={30} placeholder="Posición" value={campos.posicion} onChange={setC('posicion')} /></div>
            <div className="col-6"><input className="form-control form-control-sm" maxLength={30} placeholder="Categoría" value={campos.categoria} onChange={setC('categoria')} /></div>
          </div>
          <button type="button" className="btn-green-submit mt-3" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => save(campos, 'Carnet actualizado.')}>Guardar datos</button>
        </div>
        <div className="col-12 col-xl-6">
          <label className="form-label small">Color y tonalidad</label>
          <div className="d-flex align-items-center gap-2 mb-2">
            <input type="color" className="carnet-color-input" value={hex} title="Elige un color"
                   onChange={(e) => setHex(e.target.value.toLowerCase())} onBlur={(e) => commitColor(e.target.value)} />
            <input className="form-control form-control-sm" maxLength={7} style={{ width: 96, fontFamily: 'monospace' }} value={hexText}
                   onChange={(e) => setHexText(e.target.value)} onBlur={(e) => fromHexText(e.target.value)} />
            <span className="small text-muted-sp">Toca el cuadro para abrir la paleta</span>
          </div>
          {SL.map(([n, i, color]) => (
            <div className="d-flex align-items-center gap-2 mb-1" key={n}>
              <span className="carnet-rgb-l" style={{ color }}>{n}</span>
              <input type="range" min="0" max="255" className="carnet-range" style={{ '--c': color }} value={rgb[i]}
                     onChange={(e) => fromRgb(i, e.target.value)} onMouseUp={() => commitColor(hex)} onTouchEnd={() => commitColor(hex)} onKeyUp={() => commitColor(hex)} />
              <span className="small text-muted-sp" style={{ width: 28, textAlign: 'right' }}>{rgb[i]}</span>
            </div>
          ))}
          <div className="d-flex flex-wrap gap-2 mt-2">
            {Object.entries(PRESETS).map(([k, c]) => (
              <button key={k} type="button" className="carnet-swatch" style={{ background: c }} title={k} aria-label={`Color ${k}`} onClick={() => commitColor(c)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
