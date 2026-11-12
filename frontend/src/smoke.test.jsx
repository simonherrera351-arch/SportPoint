// Prueba de humo: monta cada ruta con cada rol contra el backend real.
// Requiere el backend corriendo en http://127.0.0.1:8000 (con los datos demo).
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from './App.jsx'
import { AppProvider } from './context.jsx'
import { setToken } from './api.js'

const BASE = 'http://127.0.0.1:8000'
const realFetch = globalThis.fetch
globalThis.fetch = (url, opts) => realFetch(typeof url === 'string' && url.startsWith('/') ? BASE + url : url, opts)
window.scrollTo = () => {}

const tokens = {}
beforeAll(async () => {
  for (const [rol, email] of [['dep', 'deportista@sportpoint.co'], ['club', 'club@sportpoint.co'], ['org', 'organizador@sportpoint.co'], ['adm', 'admin@sportpoint.co']]) {
    const r = await realFetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: '1234' }) })
    tokens[rol] = (await r.json()).token
  }
})
afterEach(() => { cleanup(); setToken(null) })

async function open(route, rol, expected) {
  setToken(rol ? tokens[rol] : null)
  render(<MemoryRouter initialEntries={[route]}><AppProvider><App /></AppProvider></MemoryRouter>)
  await waitFor(() => expect(screen.getAllByText(expected).length).toBeGreaterThan(0), { timeout: 8000 })
  expect(screen.queryByText(/No se pudo cargar/)).toBeNull()
}

describe('rutas públicas (sin sesión)', () => {
  it.each([
    ['/', 'Cuatro roles, una sola plataforma'], ['/clubes', 'Directorio de Clubes'], ['/torneos', 'Torneos'],
    ['/calendario', 'Calendario de Eventos'], ['/mapa', 'Mapa de Clubes'], ['/noticias', 'Noticias'],
  ])('%s', (route, text) => open(route, null, text))
})

describe('panel por rol', () => {
  it.each([
    ['/panel', 'dep', 'Tu resumen deportivo.'], ['/perfil', 'dep', 'Carnet virtual'], ['/mis-clubes', 'dep', 'Mis Clubes'],
    ['/mis-inscripciones', 'dep', 'Mis Inscripciones'], ['/mi-historial', 'dep', 'Historial de Torneos'], ['/mis-estadisticas', 'dep', 'Partidos jugados'],
    ['/panel', 'club', 'Resumen de tu(s) club(es).'], ['/mi-club', 'club', 'Ficha del Club'], ['/plantilla', 'club', 'Plantilla de Deportistas'],
    ['/reportes', 'club', 'Generar reporte'], ['/mensajes', 'club', 'Mensajería Interna'],
    ['/panel', 'org', 'Resumen de tus torneos.'], ['/mis-torneos', 'org', 'Crear torneo'], ['/mensajes', 'org', 'Mensajería Interna'],
    ['/panel', 'adm', 'Panel de Métricas KPI'], ['/validacion-clubes', 'adm', 'Validación de Clubes'], ['/usuarios', 'adm', 'Usuarios y Roles'],
    ['/noticias-admin', 'adm', 'Publicar noticia'],
  ])('%s como %s', (route, rol, text) => open(route, rol, text))

  it('un rol no accede a secciones de otro', () => open('/usuarios', 'dep', /exclusiva para el rol/))
})
