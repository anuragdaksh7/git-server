import { useState } from 'react'
import { Link, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useMe } from '../../components/me'
import { Alert, Spinner, Tabs } from '../../components/ui'
import { errorMessage, formatCount } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { RepoCtx } from './context'

export default function RepoLayout() {
  const me = useMe()
  const { repoName = '' } = useParams()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const meta = useAsync(`meta:${repoName}`, () => api.repoMeta(repoName, me.username))
  const issues = useAsync(`issues:${repoName}`, () => api.issues(repoName, me.username))
  const pulls = useAsync(`pulls:${repoName}`, () => api.pulls(repoName, me.username))
  const [actionError, setActionError] = useState('')

  const base = `/repo/${encodeURIComponent(repoName)}`
  const ref = params.get('ref') || meta.data?.defaultBranch || 'main'
  const refQuery = params.get('ref') ? { ref } : {}

  const href = (sub: string, query: Record<string, string> = {}) => {
    const search = new URLSearchParams(Object.entries({ ...refQuery, ...query }).filter(([, v]) => v))
    return `${base}${sub}${search.size ? `?${search}` : ''}`
  }

  const act = async (action: () => Promise<unknown>) => {
    setActionError('')
    try {
      await action()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const openCount = (list?: { state: string }[]) => list?.filter((i) => i.state === 'open').length

  return (
    <>
      <div className="page repo-header">
        <div className="repo-header-row">
          <div className="repo-title">
            <div className="repo-owner">
              <Link to="/">{me.username}</Link>
              <span>/</span>
              {meta.data && <span className="visibility">{meta.data.visibility}</span>}
            </div>
            <h1>{repoName}</h1>
          </div>
          {meta.data && (
            <div className="button-group">
              <button type="button" onClick={() => act(() => api.star(repoName))}>
                <span>{meta.data.starred ? 'Starred' : 'Star'}</span>
                <span className="mono muted">{formatCount(meta.data.stars)}</span>
              </button>
              <button type="button" onClick={() => act(() => api.fork(repoName))}>
                <span>Fork</span>
                <span className="mono muted">{formatCount(meta.data.forks)}</span>
              </button>
            </div>
          )}
        </div>
        {actionError && <Alert>{actionError}</Alert>}
        <Tabs
          items={[
            { to: href(''), label: 'Code', end: true, active: !/\/(issues|pulls|releases|settings)$/.test(pathname) },
            { to: href('/issues'), label: 'Issues', count: openCount(issues.data) },
            { to: href('/pulls'), label: 'Pull requests', count: openCount(pulls.data) },
            { to: href('/releases'), label: 'Releases' },
            { to: href('/settings'), label: 'Settings' },
          ]}
        />
      </div>

      {meta.error ? (
        <div className="page repo-body">
          <Alert>{meta.error}</Alert>
        </div>
      ) : !meta.data ? (
        <Spinner />
      ) : (
        <RepoCtx.Provider
          value={{
            repoName,
            meta: meta.data,
            ref,
            cloneUrl: `${__BACKEND_URL__}/git/${me.id}/${repoName}.git`,
            href,
          }}
        >
          <Outlet />
        </RepoCtx.Provider>
      )}
    </>
  )
}
