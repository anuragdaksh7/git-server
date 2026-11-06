import { useMemo } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { api, type TreeEntry } from '../../api'
import { Alert } from '../../components/ui'
import { Markdown } from '../../lib/Markdown'
import { shortAgo, shortSha } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { BranchPicker, CloneMenu, CommitBar, CopyButton, PathCrumbs } from './parts'
import { useRepo } from './context'

const rank = (entry: TreeEntry) => (entry.objectType === 'tree' ? 0 : 1)

export default function RepoCode() {
  const { repoName, meta, ref, cloneUrl, href } = useRepo()
  const [params] = useSearchParams()
  const path = params.get('path') ?? ''

  const tree = useAsync(`tree:${repoName}:${ref}:${path}`, () => api.tree(repoName, ref, path))
  const commits = useAsync(`commits:${repoName}:${ref}:${path}`, () => api.commits(repoName, ref, path))
  const hasReadme = !path && !!tree.data?.some((e) => e.objectType === 'blob' && /^readme(\.md)?$/i.test(e.fileName))
  const readme = useAsync(`readme:${repoName}:${ref}:${hasReadme}`, () =>
    hasReadme ? api.readme(repoName, ref, cloneUrl) : Promise.resolve(null),
  )

  const sorted = useMemo(
    () => [...(tree.data ?? [])].sort((a, b) => rank(a) - rank(b) || a.fileName.localeCompare(b.fileName)),
    [tree.data],
  )

  if (tree.unauthorized) return <Navigate to="/login" replace />

  const isEmpty = !path && tree.data?.length === 0
  const parent = path.split('/').slice(0, -1).join('/')

  return (
    <main className="page repo-body repo-code">
      <div className="repo-main">
        <div className="code-toolbar">
          <BranchPicker path={path} />
          {path ? (
            <PathCrumbs path={path} />
          ) : (
            <span className="muted small">
              {meta.branches.length} branches · {meta.tags} tags
            </span>
          )}
          <CloneMenu />
        </div>

        <div className="file-box">
          <CommitBar commits={commits} path={path} />
          {tree.error ? (
            <div className="tree-message">
              <Alert>{tree.error}</Alert>
            </div>
          ) : tree.loading ? (
            <div className="tree-message center">
              <span className="spinner spinner-lg" />
            </div>
          ) : isEmpty ? (
            <div className="quick-setup">
              <p className="quick-title">This repository is empty</p>
              <p className="muted small">Push an existing project to get started.</p>
              <pre>{`git remote add origin ${cloneUrl}\ngit push -u origin ${meta.defaultBranch}`}</pre>
              <CopyButton className="btn" text={`git remote add origin ${cloneUrl}\ngit push -u origin ${meta.defaultBranch}`} label="Copy commands" />
            </div>
          ) : (
            <ul className="tree-list">
              {path && (
                <li>
                  <Link className="tree-row" to={href('', parent ? { path: parent } : {})}>
                    <span />
                    <span className="tree-name muted">..</span>
                  </Link>
                </li>
              )}
              {sorted.length === 0 && <li className="tree-message muted small">This directory is empty.</li>}
              {sorted.map((entry) => {
                const isDir = entry.objectType === 'tree'
                const row = (
                  <>
                    <span className={isDir ? 'tree-icon dir' : entry.objectType === 'commit' ? 'tree-icon sub' : 'tree-icon'} />
                    <span className="tree-name">{entry.fileName}</span>
                    <span className="tree-msg muted">{entry.lastCommit?.message}</span>
                    <span className="tree-meta">{entry.lastCommit ? shortAgo(entry.lastCommit.date) : shortSha(entry.sha1Hash)}</span>
                  </>
                )
                return (
                  <li key={entry.path}>
                    {entry.objectType === 'commit' ? (
                      <div className="tree-row static" title="Submodule">
                        {row}
                      </div>
                    ) : (
                      <Link className="tree-row" to={href(isDir ? '' : '/blob', { path: entry.path })}>
                        {row}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {readme.data && (
          <article className="readme">
            <div className="readme-head eyebrow">{readme.data.path}</div>
            <div className="readme-body">
              <Markdown source={readme.data.content} />
            </div>
          </article>
        )}
      </div>

      <aside className="repo-aside">
        <div className="aside-block">
          <div className="eyebrow">About</div>
          <p className="muted">{meta.description || 'No description yet.'}</p>
          {meta.topics.length > 0 && (
            <div className="topics">
              {meta.topics.map((topic) => (
                <span key={topic} className="chip">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="aside-block stats">
          <Stat value={meta.stars.toLocaleString()} label="stars" />
          <Stat value={meta.forks.toLocaleString()} label="forks" />
          <Stat value={meta.watching.toLocaleString()} label="watching" />
          <Link to={href('/releases')}>
            <Stat value={meta.latestRelease ?? '—'} label="latest" />
          </Link>
        </div>
        {meta.languages.length > 0 && (
          <div className="aside-block">
            <div className="eyebrow">Languages</div>
            <div className="lang-bar">
              {meta.languages.map((lang, i) => (
                <span key={lang.name} className={`lang-${Math.min(i, 2)}`} style={{ flex: lang.percent }} />
              ))}
            </div>
            <div className="lang-legend muted">
              {meta.languages.map((lang) => (
                <span key={lang.name}>
                  {lang.name} {lang.percent}%
                </span>
              ))}
            </div>
          </div>
        )}
        {commits.data && (
          <div className="aside-block">
            <div className="eyebrow">History</div>
            <Link className="muted small" to={href('/commits')}>
              {commits.data.length} commits on {ref} →
            </Link>
          </div>
        )}
      </aside>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
