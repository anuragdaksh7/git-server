import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, ApiError, type Me, type Repo } from '../api'
import { MailIcon, PlusIcon, RepoIcon } from '../components/Icons'
import { Alert, Brand, Button } from '../components/ui'
import { useForm } from './useForm'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [error, setError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    Promise.all([api.me(), api.listRepos()])
      .then(([user, list]) => {
        setMe(user)
        setRepos(list)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setUnauthorized(true)
        else setError(err.message)
      })
  }, [])

  const createForm = useForm({ name: '' }, async (v, reset) => {
    const repo = await api.createRepo(v)
    setRepos((list) => [repo, ...list])
    reset()
  })

  if (unauthorized) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <nav className="topbar">
        <div className="container topbar-inner">
          <Brand />
          {me && (
            <span className="topbar-user">
              <span className="muted">@{me.username}</span>
              <span className="avatar avatar-sm">{initials(me.name)}</span>
            </span>
          )}
        </div>
      </nav>

      <main className="container">
        {error ? (
          <div className="page-message">
            <Alert>{error}</Alert>
          </div>
        ) : !me ? (
          <div className="page-message">
            <span className="spinner spinner-lg" />
          </div>
        ) : (
          <div className="layout">
            <aside className="card profile">
              <span className="avatar avatar-lg">{initials(me.name)}</span>
              <h2>{me.name}</h2>
              <p className="muted">@{me.username}</p>
              <div className="divider" />
              <p className="profile-meta">
                <MailIcon /> {me.email}
              </p>
              <p className="profile-meta">
                <RepoIcon /> {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
              </p>
            </aside>

            <section className="content">
              <div className="card">
                <h3>Create a new repository</h3>
                <p className="muted small">Letters, numbers, dots, dashes and underscores. Up to 100 characters.</p>
                <form className="create-form" onSubmit={createForm.handleSubmit}>
                  <div className="input-prefix">
                    <span>{me.username} /</span>
                    <input
                      name="name"
                      placeholder="my-awesome-project"
                      value={createForm.values.name}
                      onChange={createForm.onChange}
                      required
                    />
                  </div>
                  <Button className="btn-primary" loading={createForm.submitting}>
                    {!createForm.submitting && <PlusIcon />}
                    Create
                  </Button>
                </form>
                {createForm.error && <Alert>{createForm.error}</Alert>}
              </div>

              <div className="card card-flush">
                <div className="card-header">
                  <h3>Repositories</h3>
                  <span className="badge">{repos.length}</span>
                </div>
                {repos.length === 0 ? (
                  <div className="empty">
                    <RepoIcon width={32} height={32} />
                    <p>No repositories yet</p>
                    <p className="muted small">Create your first one above.</p>
                  </div>
                ) : (
                  <ul className="repo-list">
                    {repos.map((r) => (
                      <li key={r.id}>
                        <span className="repo-icon">
                          <RepoIcon />
                        </span>
                        <span className="repo-name">{r.name}</span>
                        <time className="muted small" dateTime={r.createdAt} title={new Date(r.createdAt).toLocaleString()}>
                          Created {timeAgo(r.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
