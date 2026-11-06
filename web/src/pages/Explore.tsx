import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useMe } from '../components/me'
import { RepoCards } from '../components/RepoCards'
import { Empty, Loadable } from '../components/ui'
import { useAsync } from '../lib/useAsync'

export default function Explore() {
  const me = useMe()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const results = useAsync(`explore:${q}`, () => api.explore(q))

  return (
    <main className="page list-page">
      <header className="page-head">
        <span className="eyebrow muted">{q ? 'Search results' : 'Discover'}</span>
        <h1>{q ? `“${q}”` : 'Explore'}</h1>
      </header>
      <Loadable state={results}>
        {(repos) =>
          repos.length ? (
            <RepoCards
              repos={repos.map((r) => ({
                key: `${r.owner}/${r.name}`,
                name: `${r.owner} / ${r.name}`,
                description: r.description,
                language: r.language,
                stars: r.stars,
                href: r.owner === me.username ? `/repo/${encodeURIComponent(r.name)}` : `/u/${encodeURIComponent(r.owner)}`,
              }))}
            />
          ) : (
            <Empty title="No repositories match">Try a shorter or different search.</Empty>
          )
        }
      </Loadable>
    </main>
  )
}
