export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fmtMoney = (n) => {
  n = Number(n) || 0
  return n === 0 ? 'Gratis' : '$' + n.toLocaleString('es-CO')
}

export const calcAge = (fecha) => {
  if (!fecha) return null
  const b = new Date(fecha), t = new Date()
  let age = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--
  return age
}

export const COMUNA_COORDS = {
  'Comuna 1 - Popular': [12, 18], 'Comuna 4 - Aranjuez': [30, 15], 'Comuna 10 - La Candelaria': [45, 45],
  'Comuna 11 - Laureles-Estadio': [25, 50], 'Comuna 14 - Poblado': [55, 68], 'Comuna 15 - Guayabal': [30, 72],
  'Comuna 16 - Belén': [18, 75],
}

export const SIDEBAR_MENUS = {
  'Deportista': [
    { sec: 'General' },
    { to: '/panel', label: 'Mi Panel', icon: 'bi-speedometer2' },
    { to: '/perfil', label: 'Mi Perfil', icon: 'bi-person' },
    { sec: 'Actividad' },
    { to: '/mis-clubes', label: 'Mis Clubes', icon: 'bi-shield-check' },
    { to: '/mis-inscripciones', label: 'Mis Inscripciones', icon: 'bi-clipboard-check' },
    { to: '/mi-historial', label: 'Historial de Torneos', icon: 'bi-clock-history' },
    { to: '/mis-estadisticas', label: 'Mis Estadísticas', icon: 'bi-bar-chart' },
  ],
  'Admin. Club': [
    { sec: 'General' },
    { to: '/panel', label: 'Mi Panel', icon: 'bi-speedometer2' },
    { sec: 'Mi Club' },
    { to: '/mi-club', label: 'Ficha del Club', icon: 'bi-building' },
    { to: '/plantilla', label: 'Plantilla de Deportistas', icon: 'bi-people' },
    { to: '/reportes', label: 'Reportes', icon: 'bi-file-earmark-bar-graph' },
    { to: '/mensajes', label: 'Mensajería', icon: 'bi-chat-dots' },
  ],
  'Organizador': [
    { sec: 'General' },
    { to: '/panel', label: 'Mi Panel', icon: 'bi-speedometer2' },
    { sec: 'Torneos' },
    { to: '/mis-torneos', label: 'Mis Torneos', icon: 'bi-trophy' },
    { to: '/mensajes', label: 'Mensajería', icon: 'bi-chat-dots' },
  ],
  'Admin. Sistema': [
    { sec: 'General' },
    { to: '/panel', label: 'Panel KPIs', icon: 'bi-speedometer2' },
    { sec: 'Administración' },
    { to: '/validacion-clubes', label: 'Validación de Clubes', icon: 'bi-patch-check' },
    { to: '/usuarios', label: 'Usuarios y Roles', icon: 'bi-people-fill' },
    { to: '/noticias-admin', label: 'Noticias', icon: 'bi-newspaper' },
    { to: '/reportes', label: 'Reportes', icon: 'bi-file-earmark-bar-graph' },
  ],
}

export function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function openPrintReport(tipo, rows, desde, hasta) {
  const headers = Object.keys(rows[0])
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(`<html><head><title>Reporte ${esc(tipo)}</title>
    <style>body{font-family:Arial;padding:24px;color:#111} h1{color:#1db954} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left} th{background:#f0f0f0}</style>
    </head><body><h1>SportPoint — Reporte de ${esc(tipo)}</h1><p>Rango: ${esc(desde) || '—'} a ${esc(hasta) || '—'} · Generado: ${new Date().toLocaleString('es-CO')}</p>
    <table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}
    </tbody></table></body></html>`)
  win.document.close()
  setTimeout(() => win.print(), 400)
  return true
}
