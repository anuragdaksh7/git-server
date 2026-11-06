import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Issue, PullRequest } from '../api'
import { timeAgo } from '../lib/format'
import { useForm } from '../pages/useForm'
import { Alert, Button, Empty, Field, LabelChip, Segmented, TextArea } from './ui'

type Item = Issue | PullRequest
type Filter = 'open' | 'closed'

export function IssueList({
  kind,
  items,
  showRepo,
  onCreate,
}: {
  kind: 'issue' | 'pull'
  items: Item[]
  showRepo?: boolean
  onCreate?: (title: string, body: string) => Promise<void>
}) {
  const [filter, setFilter] = useState<Filter>('open')
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)

  const open = items.filter((i) => i.state === 'open')
  const closed = items.filter((i) => i.state !== 'open')
  const q = query.trim().toLowerCase()
  const visible = (filter === 'open' ? open : closed).filter(
    (i) => !q || i.title.toLowerCase().includes(q) || `#${i.number}` === q,
  )

  const noun = kind === 'issue' ? 'issue' : 'pull request'
  const form = useForm({ title: '', body: '' }, async (v, reset) => {
    await onCreate?.(v.title, v.body)
    reset()
    setComposing(false)
  })

  return (
    <div className="issues">
      <div className="toolbar">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: `Open ${open.length}` },
            { value: 'closed', label: `Closed ${closed.length}` },
          ]}
        />
        <input className="toolbar-search" placeholder={`Filter ${noun}s`} value={query} onChange={(e) => setQuery(e.target.value)} />
        {onCreate && (
          <Button className="btn-primary" onClick={() => setComposing((c) => !c)}>
            New {noun}
          </Button>
        )}
      </div>

      {composing && (
        <form className="compose" onSubmit={form.handleSubmit}>
          <Field label="Title" name="title" value={form.values.title} onChange={form.onChange} required autoFocus />
          <TextArea label="Description" name="body" rows={5} value={form.values.body} onChange={form.onChange} />
          {form.error && <Alert>{form.error}</Alert>}
          <div className="compose-actions">
            <Button type="button" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button className="btn-primary" loading={form.submitting}>
              Submit {noun}
            </Button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <Empty title={query ? `No ${noun}s match` : `No ${filter} ${noun}s`} />
      ) : (
        <ul className="issue-list">
          {visible.map((item) => {
            const repoBase = `/repo/${encodeURIComponent(item.repo)}`
            return (
              <li key={`${item.repo}#${item.number}`} className="issue-row">
                <span className={`state-mark ${item.state}`} title={item.state} />
                <div className="issue-main">
                  <div className="issue-title">
                    {showRepo && (
                      <Link className="muted" to={repoBase}>
                        {item.repo}
                      </Link>
                    )}
                    <span>{item.title}</span>
                    {item.labels.map((label) => (
                      <LabelChip key={label.name} label={label} />
                    ))}
                  </div>
                  <div className="issue-meta mono muted">
                    #{item.number} · {item.state === 'merged' ? 'merged' : item.state === 'open' ? 'opened' : 'closed'}{' '}
                    {timeAgo(item.createdAt)} by {item.author}
                    {'head' in item && (
                      <>
                        {' · '}
                        {item.head} → {item.base}
                      </>
                    )}
                  </div>
                </div>
                {item.comments > 0 && <span className="mono muted issue-comments">{item.comments} {item.comments === 1 ? "comment" : "comments"}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
