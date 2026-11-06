import { createContext, useContext } from 'react'
import type { RepoMeta } from '../../api'

export type RepoContext = {
  repoName: string
  meta: RepoMeta
  /** Branch from `?ref=`, falling back to the default branch. */
  ref: string
  cloneUrl: string
  /** Builds a link inside this repo that keeps the selected branch. */
  href: (sub: string, query?: Record<string, string>) => string
}

export const RepoCtx = createContext<RepoContext | null>(null)

export function useRepo() {
  const ctx = useContext(RepoCtx)
  if (!ctx) throw new Error('useRepo must be used inside RepoLayout')
  return ctx
}
