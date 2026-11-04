import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, type Me, type TreeEntry } from '../api'
import { ChevronRightIcon, FileIcon, FolderIcon, RepoIcon } from '../components/Icons'
import { TopBar } from '../components/TopBar'
import { Alert } from '../components/ui'

function repoUrl(repoName: string, path: string) {
  const base = `/repo/${encodeURIComponent(repoName)}`
  return path ? `${base}?path=${encodeURIComponent(path)}` : base
}

type TreeState = { repo: string; path: string; entries: TreeEntry[] }
type Failure = { repo: string; path: string; message: string }

export default function RepoBrowser() {
  const { repoName = '' } = useParams()
  const [search] = useSearchParams()
  const path = search.get('path') ?? ''

  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [tree, setTree] = useState<TreeState | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)

  useEffect(() => {
    api.me().then(setMe).catch((err) => {
      if (err instanceof ApiError && err.status === 401) setUnauthorized(true)
      else setMeError(err instanceof Error ? err.message : String(err))
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    api
      .tree(repoName, path)
      .then((entries) => {
        if (controller.signal.aborted) return
        setTree({ repo: repoName, path, entries })
        setFailure(null)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (err instanceof ApiError && err.status === 401) {
          setUnauthorized(true)
          return
        }
        setFailure({
          repo: repoName,
          path,
          message: err instanceof Error ? err.message : String(err),
        })
      })

    return () => controller.abort()
  }, [repoName, path])

  // Only trust results that belong to the repo/path currently in the URL, so a
  // directory switch shows the spinner immediately instead of stale listings.
  const entries = tree && tree.repo === repoName && tree.path === path ? tree.entries : null
  const treeError = failure && failure.repo === repoName && failure.path === path ? failure.message : ''
  const error = meError || treeError

  // directories first, then files, each alphabetical
  const sorted = useMemo(() => {
    const rank = (entry: TreeEntry) => (entry.objectType === 'tree' ? 0 : 1)
    return [...(entries ?? [])].sort(
      (a, b) => rank(a) - rank(b) || a.fileName.localeCompare(b.fileName),
    )
  }, [entries])

  const crumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return [
      { label: repoName, path: '' },
      ...parts.map((label, i) => ({ label, path: parts.slice(0, i + 1).join('/') })),
    ]
  }, [repoName, path])

  if (unauthorized) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <TopBar user={me} />

      <main className="container">
        <div className="repo-page">
          <Link to="/" className="back-link">
            ← All repositories
          </Link>

          <div className="card card-flush">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              {crumbs.map((crumb, i) => (
                <span className="crumb" key={crumb.path || 'root'}>
                  {i > 0 && <ChevronRightIcon className="crumb-sep" width={14} height={14} />}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link to={repoUrl(repoName, crumb.path)}>{crumb.label}</Link>
                  )}
                </span>
              ))}
              {entries && <span className="badge">{entries.length}</span>}
            </nav>

            {error ? (
              <div className="tree-message">
                <Alert>{error}</Alert>
              </div>
            ) : entries === null ? (
              <div className="tree-message">
                <span className="spinner spinner-lg" />
              </div>
            ) : entries.length === 0 ? (
              <div className="empty">
                <RepoIcon width={32} height={32} />
                <p>{path ? 'This directory is empty' : 'Repository is empty'}</p>
                <p className="muted small">
                  {path ? 'Nothing to show here.' : 'Push your first commit to see files.'}
                </p>
              </div>
            ) : (
              <ul className="tree-list">
                {sorted.map((entry) => {
                  const isDir = entry.objectType === 'tree'
                  const row = (
                    <>
                      <span className={isDir ? 'tree-icon dir' : 'tree-icon'}>
                        {isDir ? <FolderIcon /> : <FileIcon />}
                      </span>
                      <span className="tree-name">{entry.fileName}</span>
                      <span className="tree-meta">{entry.sha1Hash.slice(0, 7)}</span>
                    </>
                  )

                  return (
                    <li key={entry.path}>
                      {isDir ? (
                        <Link className="tree-row" to={repoUrl(repoName, entry.path)}>
                          {row}
                        </Link>
                      ) : (
                        <div className="tree-row static">{row}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
