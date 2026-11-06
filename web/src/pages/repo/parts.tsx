import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Commit } from '../../api'
import { Avatar, Dropdown } from '../../components/ui'
import { shortAgo, shortSha } from '../../lib/format'
import { useRepo } from './context'

export function BranchPicker({ path = '', sub = '' }: { path?: string; sub?: string }) {
  const { meta, ref, href } = useRepo()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const branches = meta.branches.filter((b) => b.toLowerCase().includes(filter.toLowerCase()))

  return (
    <Dropdown className="btn btn-mono" trigger={<>{ref} ▾</>}>
      {(close) => (
        <div className="menu branch-menu">
          <div className="menu-head eyebrow">Switch branch</div>
          <input autoFocus placeholder="Find a branch" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {branches.map((branch) => (
            <button
              key={branch}
              type="button"
              className={branch === ref ? 'mono current' : 'mono'}
              onClick={() => {
                close()
                const url = new URL(href(sub, { path }), location.origin)
                if (branch === meta.defaultBranch) url.searchParams.delete('ref')
                else url.searchParams.set('ref', branch)
                navigate(url.pathname + url.search)
              }}
            >
              {branch}
              {branch === meta.defaultBranch && <span className="muted">default</span>}
            </button>
          ))}
          {branches.length === 0 && <span className="muted small menu-note">No branches match</span>}
        </div>
      )}
    </Dropdown>
  )
}

export function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function CloneMenu() {
  const { cloneUrl } = useRepo()
  return (
    <Dropdown className="btn btn-primary" align="right" trigger="Clone">
      {() => (
        <div className="menu clone-menu">
          <div className="menu-head eyebrow">Clone over HTTP</div>
          <div className="clone-url">
            <input readOnly value={cloneUrl} onFocus={(e) => e.target.select()} />
            <CopyButton text={cloneUrl} className="btn" />
          </div>
          <p className="muted small">Use any username, and your login token as the password.</p>
        </div>
      )}
    </Dropdown>
  )
}

export function CommitBar({ commits, path = '' }: { commits: { data?: Commit[]; error: string }; path?: string }) {
  const { href } = useRepo()
  const commit = commits.data?.[0]
  if (commits.error) return <div className="commit-bar muted small">{commits.error}</div>
  if (!commits.data) return <div className="commit-bar muted small">Loading latest commit…</div>
  if (!commit) return <div className="commit-bar muted small">No commits yet</div>
  return (
    <div className="commit-bar">
      <Avatar name={commit.author} size="xs" />
      <span className="commit-author">{commit.author}</span>
      <Link className="commit-message muted" to={href('/commits', { path })}>
        {commit.message}
      </Link>
      <span className="mono muted">
        {shortSha(commit.sha)} · {shortAgo(commit.date)} ago
      </span>
    </div>
  )
}

export function PathCrumbs({ path }: { path: string }) {
  const { repoName, href } = useRepo()
  const parts = path.split('/').filter(Boolean)
  const crumbs = [{ label: repoName, path: '' }, ...parts.map((label, i) => ({ label, path: parts.slice(0, i + 1).join('/') }))]

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span className="crumb" key={crumb.path || 'root'}>
          {i > 0 && <span className="crumb-sep">/</span>}
          {i === crumbs.length - 1 ? (
            <span aria-current="page">{crumb.label}</span>
          ) : (
            <Link to={href('', crumb.path ? { path: crumb.path } : {})}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
