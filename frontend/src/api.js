const TOKEN_KEY = 'sportpoint_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(method, path, body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { /* sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 401 && token) setToken(null) // sesión vencida
    const detail = data && data.detail
    throw new ApiError(typeof detail === 'string' ? detail : 'Ocurrió un error. Intenta de nuevo.', res.status)
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b = {}) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
}

export const qsFrom = (obj) => {
  const q = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => v && q.set(k, v))
  const s = q.toString()
  return s ? '?' + s : ''
}
