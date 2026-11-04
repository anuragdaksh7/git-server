const API_URL = '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'token'

function readToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  // guard against the literal strings a buggy caller can store
  return token && token !== 'undefined' && token !== 'null' ? token : ''
}

export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken()
  const res = await fetch(API_URL + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      // a rejected token is dead weight; drop it so the next login starts clean
      localStorage.removeItem(TOKEN_KEY)
      console.warn(`[api] 401 on ${path} — token ${token ? 'was sent' : 'was missing'}`)
    }
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  return body.data as T
}

export const get = <T>(path: string) => request<T>(path)

export const post = <T>(path: string, payload: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(payload) })
