import { api, type Issue, type PullRequest } from '../api'
import { useMe } from '../components/me'
import { IssueList } from '../components/IssueList'
import { Loadable } from '../components/ui'
import { useAsync } from '../lib/useAsync'

/** Global `/issues` and `/pulls`: everything across the user's repositories. */
export default function MyIssues({ kind }: { kind: 'issue' | 'pull' }) {
  const me = useMe()
  const items = useAsync<(Issue | PullRequest)[]>(`mine:${kind}`, () => (kind === 'issue' ? api.myIssues(me.username) : api.myPulls(me.username)))

  return (
    <main className="page list-page">
      <header className="page-head">
        <span className="eyebrow muted">Across your repositories</span>
        <h1>{kind === 'issue' ? 'Issues' : 'Pull requests'}</h1>
      </header>
      <Loadable state={items}>{(list) => <IssueList kind={kind} items={list} showRepo />}</Loadable>
    </main>
  )
}
