import { createContext, useContext } from 'react'
import type { Me } from '../api'

export const MeContext = createContext<Me | null>(null)

/** The signed-in user. Only usable inside routes rendered by `AppShell`. */
export function useMe() {
  const me = useContext(MeContext)
  if (!me) throw new Error('useMe must be used inside AppShell')
  return me
}
