import { api, type Issue, type PullRequest } from '../../api'
import { useMe } from '../../components/me'
import { IssueList } from '../../components/IssueList'
import { Loadable } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { useRepo } from './context'

export default function RepoIssues({ kind }: { kind: 'issue' | 'pull' }) {
  const me = useMe()
  const { repoName } = useRepo()
  const items = useAsync<(Issue | PullRequest)[]>(`${kind}s:${repoName}`, () =>
    kind === 'issue' ? api.issues(repoName, me.username) : api.pulls(repoName, me.username),
  )

  return (
    <main className="page repo-body">
      <Loadable state={items}>
        {(list) => (
          <IssueList
            kind={kind}
            items={list}
            onCreate={
              kind === 'issue'
                ? async (title, body) => {
                    await api.createIssue(repoName, { title, body })
                  }
                : undefined
            }
          />
        )}
      </Loadable>
    </main>
  )
}
