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

export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** Shared auth/error handling; callers decide how to read the body. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  const token = readToken()
  const res = await fetch(API_URL + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      // a rejected token is dead weight; drop it so the next login starts clean
      localStorage.removeItem(TOKEN_KEY)
      console.warn(`[api] 401 on ${path} — token ${token ? 'was sent' : 'was missing'}`)
    }
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  return res
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, init)
  const body = await res.json()
  return body.data as T
}

export const get = <T>(path: string) => request<T>(path)

/** For endpoints that return the file itself (blob data), not JSON. */
export const getBytes = async (path: string) => (await send(path)).arrayBuffer()

export const post = <T>(path: string, payload: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(payload) })
