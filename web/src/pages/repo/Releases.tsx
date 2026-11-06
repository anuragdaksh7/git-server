import { api } from '../../api'
import { Empty, Loadable } from '../../components/ui'
import { Markdown } from '../../lib/Markdown'
import { formatDate } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { useRepo } from './context'

export default function Releases() {
  const { repoName } = useRepo()
  const releases = useAsync(`releases:${repoName}`, () => api.releases(repoName))

  return (
    <main className="page repo-body">
      <Loadable state={releases}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No releases yet">Tag a commit and publish it to see it here.</Empty>
          ) : (
            <div className="release-list">
              {list.map((release) => (
                <article key={release.tag} className="release">
                  <div className="release-side">
                    <span className="mono">{release.tag}</span>
                    <time className="muted small" dateTime={release.date}>
                      {formatDate(release.date)}
                    </time>
                  </div>
                  <div className="release-body">
                    <div className="release-title">
                      <h2>{release.name}</h2>
                      {release.latest && <span className="chip chip-accent">Latest</span>}
                    </div>
                    <Markdown source={release.notes} />
                  </div>
                </article>
              ))}
            </div>
          )
        }
      </Loadable>
    </main>
  )
}
