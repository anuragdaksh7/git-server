import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { clearToken, type Me } from '../api'
import { Avatar, Brand, Dropdown } from './ui'

export function TopBar({ user }: { user: Me | null }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
    input.current?.blur()
  }

  const logOut = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <Link to="/" aria-label="gitark home">
        <Brand />
      </Link>

      <form className="search" role="search" onSubmit={onSubmit}>
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or jump to…"
          aria-label="Search repositories"
        />
        <kbd>/</kbd>
      </form>

      <nav className="topnav">
        <NavLink to="/pulls">Pulls</NavLink>
        <NavLink to="/issues">Issues</NavLink>
        <NavLink to="/explore">Explore</NavLink>
      </nav>

      {user && (
        <Dropdown className="avatar-button" align="right" trigger={<Avatar name={user.name} />}>
          {(close) => (
            <div className="menu">
              <div className="menu-head">
                <strong>{user.name}</strong>
                <span className="muted small">{user.username}</span>
              </div>
              <Link to="/" onClick={close}>
                Your profile
              </Link>
              <Link to="/?tab=repositories" onClick={close}>
                Your repositories
              </Link>
              <Link to="/?tab=stars" onClick={close}>
                Your stars
              </Link>
              <button type="button" onClick={logOut}>
                Sign out
              </button>
            </div>
          )}
        </Dropdown>
      )}
    </header>
  )
}
