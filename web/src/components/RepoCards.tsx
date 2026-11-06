import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatCount, timeAgo } from '../lib/format'

export type RepoCardData = {
  key: string
  name: string
  description?: string
  language?: string
  stars?: number
  createdAt?: string
  /** Route to open, or undefined when the repo isn't browsable from this account. */
  href?: string
}

export function RepoCards({ repos }: { repos: RepoCardData[] }) {
  return (
    <div className="repo-grid">
      {repos.map((repo) => {
        const body: ReactNode = (
          <>
            <span className="repo-card-name">{repo.name}</span>
            {repo.description && <span className="repo-card-desc">{repo.description}</span>}
            <span className="repo-card-meta mono muted">
              {repo.language && <span>{repo.language}</span>}
              {repo.stars !== undefined && <span>★ {formatCount(repo.stars)}</span>}
              {repo.createdAt && (
                <time dateTime={repo.createdAt} title={new Date(repo.createdAt).toLocaleString()}>
                  created {timeAgo(repo.createdAt)}
                </time>
              )}
            </span>
          </>
        )
        return repo.href ? (
          <Link key={repo.key} className="repo-card" to={repo.href}>
            {body}
          </Link>
        ) : (
          <div key={repo.key} className="repo-card static">
            {body}
          </div>
        )
      })}
    </div>
  )
}
