import { ApiError } from './client'

/**
 * Stand-ins for endpoints the backend doesn't serve yet. Each call names the
 * route it represents; replace `planned(...)` with `get`/`post` once it exists.
 */
export function planned<T>(_endpoint: string, data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 150))
}

export function plannedWrite<T = void>(endpoint: string): Promise<T> {
  return Promise.reject(new ApiError(501, `${endpoint} is not implemented on the server yet`))
}
