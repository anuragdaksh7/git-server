import { Link } from 'react-router-dom'
import type { Me } from '../api'
import { initials } from '../lib/format'
import { Brand } from './ui'

export function TopBar({ user }: { user: Me | null }) {
  return (
    <nav className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand-link" aria-label="gitark home">
          <Brand />
        </Link>
        {user && (
          <span className="topbar-user">
            <span className="muted">@{user.username}</span>
            <span className="avatar avatar-sm">{initials(user.name)}</span>
          </span>
        )}
      </div>
    </nav>
  )
}
