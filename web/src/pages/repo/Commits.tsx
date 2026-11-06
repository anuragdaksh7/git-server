import { useSearchParams } from 'react-router-dom'
import { api, type Commit } from '../../api'
import { useMe } from '../../components/me'
import { Avatar, Empty, Loadable } from '../../components/ui'
import { formatDate, shortSha, timeAgo } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { BranchPicker, CopyButton, PathCrumbs } from './parts'
import { useRepo } from './context'

function groupByDay(commits: Commit[]) {
  const groups = new Map<string, Commit[]>()
  for (const commit of commits) {
    const day = formatDate(commit.date)
    groups.set(day, [...(groups.get(day) ?? []), commit])
  }
  return [...groups]
}

export default function Commits() {
  const me = useMe()
  const { repoName, ref } = useRepo()
  const [params] = useSearchParams()
  const path = params.get('path') ?? ''
  const commits = useAsync(`commits:${repoName}:${ref}:${path}`, () => api.commits(repoName, me.username, ref, path))

  return (
    <main className="page repo-body">
      <div className="code-toolbar">
        <BranchPicker path={path} sub="/commits" />
        {path ? <PathCrumbs path={path} /> : <span className="muted small">History of {ref}</span>}
      </div>

      <Loadable state={commits}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No commits yet" />
          ) : (
            <div className="commit-groups">
              {groupByDay(list).map(([day, group]) => (
                <section key={day} className="section">
                  <div className="eyebrow">Commits on {day}</div>
                  <ul className="commit-list">
                    {group.map((commit) => (
                      <li key={commit.sha} className="commit-row">
                        <div className="commit-row-main">
                          <span className="commit-row-message">{commit.message}</span>
                          <span className="commit-row-meta muted small">
                            <Avatar name={commit.author} size="xs" />
                            {commit.author} committed {timeAgo(commit.date)}
                          </span>
                        </div>
                        <CopyButton className="sha-button mono" text={commit.sha} label={shortSha(commit.sha)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        }
      </Loadable>
    </main>
  )
}
