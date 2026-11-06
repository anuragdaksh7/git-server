import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api, type BlameRange } from '../../api'
import { useMe } from '../../components/me'
import { Alert, Segmented, Spinner } from '../../components/ui'
import { Markdown } from '../../lib/Markdown'
import { formatBytes, shortAgo, shortSha } from '../../lib/format'
import { tokenize, usesHashComments } from '../../lib/highlight'
import { useAsync } from '../../lib/useAsync'
import { BranchPicker, CommitBar, CopyButton, PathCrumbs } from './parts'
import { useRepo } from './context'

type Mode = 'preview' | 'code' | 'blame'

export default function FileView() {
  const me = useMe()
  const { repoName, ref, href } = useRepo()
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const path = params.get('path') ?? ''
  const isMarkdown = /\.(md|markdown)$/i.test(path)
  const [mode, setMode] = useState<Mode>(isMarkdown ? 'preview' : 'code')

  const blob = useAsync(`blob:${repoName}:${ref}:${path}`, () => api.blob(repoName, ref, path))
  const commits = useAsync(`commits:${repoName}:${ref}:${path}`, () => api.commits(repoName, ref, path))
  const lines = useMemo(() => blob.data?.content.replace(/\n$/, '').split('\n') ?? [], [blob.data])
  const blame = useAsync(`blame:${repoName}:${ref}:${path}:${mode === 'blame'}:${lines.length}`, () =>
    mode === 'blame' && lines.length ? api.blame(repoName, me.username, ref, path, lines.length) : Promise.resolve(null),
  )

  const highlighted = useMemo(() => {
    const hashComments = usesHashComments(path)
    return lines.map((line) => tokenize(line, hashComments))
  }, [lines, path])

  const selected = Number(hash.match(/^#L(\d+)$/)?.[1] ?? 0)

  const openRaw = () => {
    if (!blob.data) return
    const url = URL.createObjectURL(new Blob([blob.data.content], { type: 'text/plain;charset=utf-8' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <main className="page repo-body file-page">
      <div className="code-toolbar">
        <BranchPicker path={path} sub="/blob" />
        <PathCrumbs path={path} />
      </div>

      <div className="file-box">
        <CommitBar commits={commits} path={path} />
        <div className="file-toolbar">
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[...(isMarkdown ? [{ value: 'preview' as Mode, label: 'Preview' }] : []), { value: 'code', label: 'Code' }, { value: 'blame', label: 'Blame' }]}
          />
          {blob.data && (
            <span className="mono muted">
              {lines.length} lines · {formatBytes(blob.data.size)}
            </span>
          )}
          <div className="file-actions">
            <button type="button" onClick={openRaw}>
              Raw
            </button>
            <CopyButton text={blob.data?.content ?? ''} />
            <Link to={href('/commits', { path })}>History</Link>
          </div>
        </div>

        {blob.error ? (
          <div className="tree-message">
            <Alert>{blob.error}</Alert>
          </div>
        ) : !blob.data ? (
          <Spinner />
        ) : mode === 'preview' ? (
          <div className="readme-body">
            <Markdown source={blob.data.content} />
          </div>
        ) : (
          <div className={mode === 'blame' ? 'code-view blame' : 'code-view'}>
            {mode === 'blame' && blame.data ? (
              <BlameView ranges={blame.data} lines={highlighted} selected={selected} />
            ) : (
              highlighted.map((tokens, i) => <CodeLine key={i} n={i + 1} tokens={tokens} selected={selected === i + 1} />)
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function CodeLine({ n, tokens, selected }: { n: number; tokens: ReturnType<typeof tokenize>; selected: boolean }) {
  return (
    <div className={selected ? 'code-line selected' : 'code-line'} id={`L${n}`}>
      <Link className="line-no" to={{ search: location.search, hash: `#L${n}` }}>
        {n}
      </Link>
      <span className="line-text">
        {tokens.map((t, i) => (
          <span key={i} className={`tok-${t.kind}`}>
            {t.text}
          </span>
        ))}
      </span>
    </div>
  )
}

function BlameView({ ranges, lines, selected }: { ranges: BlameRange[]; lines: ReturnType<typeof tokenize>[]; selected: number }) {
  const offsets = ranges.map((_, i) => ranges.slice(0, i).reduce((sum, r) => sum + r.lines, 0))
  return (
    <>
      {ranges.map((range, r) => {
        const from = offsets[r]
        return (
          <div className="blame-group" key={`${range.commit.sha}:${from}`}>
            <div className="blame-info">
              <span className="blame-message">{range.commit.message}</span>
              <span className="mono muted">
                {range.commit.author} · {shortSha(range.commit.sha)} · {shortAgo(range.commit.date)}
              </span>
            </div>
            <div>
              {lines.slice(from, from + range.lines).map((tokens, i) => (
                <CodeLine key={i} n={from + i + 1} tokens={tokens} selected={selected === from + i + 1} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
