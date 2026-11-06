import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, type Repo, type RepoSummary } from '../api'
import { ActivityGrid } from '../components/ActivityGrid'
import { useMe } from '../components/me'
import { RepoCards, type RepoCardData } from '../components/RepoCards'
import { Alert, Button, Empty, Loadable, Tabs } from '../components/ui'
import { errorMessage, initials } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { useForm } from './useForm'

type Tab = 'overview' | 'repositories' | 'stars'

const repoHref = (name: string) => `/repo/${encodeURIComponent(name)}`

const ownCard = (r: Repo): RepoCardData => ({ key: r.id, name: r.name, createdAt: r.createdAt, href: repoHref(r.name) })

const summaryCard = (me: string) => (r: RepoSummary): RepoCardData => ({
  key: `${r.owner}/${r.name}`,
  name: r.owner === me ? r.name : `${r.owner} / ${r.name}`,
  description: r.description,
  language: r.language,
  stars: r.stars,
  href: r.owner === me ? repoHref(r.name) : undefined,
})

export default function Profile() {
  const me = useMe()
  const { username = me.username } = useParams()
  const isSelf = username === me.username
  const [params] = useSearchParams()
  const tab = (['repositories', 'stars'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab
  const base = isSelf ? '/' : `/u/${encodeURIComponent(username)}`

  const profile = useAsync(`profile:${username}`, () => api.profile(me, username))
  const repos = useAsync(`repos:${username}`, async (): Promise<RepoCardData[]> =>
    isSelf
      ? (await api.listRepos()).map(ownCard)
      : (await api.explore('')).filter((r) => r.owner === username).map(summaryCard(me.username)),
  )
  const activity = useAsync(`activity:${username}`, () => api.activity(username))
  const stars = useAsync(`stars:${username}`, () => api.starred(username))

  const [followError, setFollowError] = useState('')
  const follow = async () => {
    setFollowError('')
    try {
      await api.follow(username)
    } catch (err) {
      setFollowError(errorMessage(err))
    }
  }

  const createForm = useForm({ name: '' }, async (v, reset) => {
    const repo = await api.createRepo(v)
    repos.update((list) => [ownCard(repo), ...list])
    reset()
  })

  return (
    <main className="page profile-layout">
      <aside className="profile">
        <div className="avatar-block">
          <span>{initials(profile.data?.name ?? username)}</span>
        </div>
        <div>
          <h1>{profile.data?.name ?? username}</h1>
          <p className="profile-username">{username}</p>
        </div>
        {profile.data?.bio && <p className="profile-bio">{profile.data.bio}</p>}
        {!isSelf && (
          <Button className="btn-primary" onClick={follow}>
            {profile.data?.isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}
        {followError && <Alert>{followError}</Alert>}
        <div className="profile-stats">
          <span>
            <b>{profile.data?.followers ?? 0}</b> followers
          </span>
          <span>
            <b>{profile.data?.following ?? 0}</b> following
          </span>
        </div>
        <div className="profile-facts">
          {profile.data?.company && <span>{profile.data.company}</span>}
          {profile.data?.location && <span>{profile.data.location}</span>}
          {profile.data?.website && (
            <a href={profile.data.website} target="_blank" rel="noreferrer">
              {profile.data.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {isSelf && <span>{me.email}</span>}
        </div>
      </aside>

      <div className="profile-main">
        <Tabs
          items={[
            { to: base, label: 'Overview', active: tab === 'overview' },
            { to: `${base}?tab=repositories`, label: 'Repositories', count: repos.data?.length, active: tab === 'repositories' },
            { to: `${base}?tab=stars`, label: 'Stars', count: stars.data?.length, active: tab === 'stars' },
          ]}
        />

        {tab === 'overview' && (
          <>
            <section className="section">
              <div className="eyebrow">Pinned</div>
              <Loadable state={repos}>
                {(list) =>
                  list.length ? (
                    <RepoCards repos={list.slice(0, 4)} />
                  ) : (
                    <Empty title="Nothing pinned yet">{isSelf ? 'Your first repositories show up here.' : 'No public repositories.'}</Empty>
                  )
                }
              </Loadable>
            </section>
            <Loadable state={activity}>{(days) => <ActivityGrid days={days} />}</Loadable>
          </>
        )}

        {tab === 'repositories' && (
          <>
            {isSelf && (
              <section className="section">
                <div className="eyebrow">New repository</div>
                <form className="create-form" onSubmit={createForm.handleSubmit}>
                  <div className="input-prefix">
                    <span>{me.username} /</span>
                    <input name="name" placeholder="my-project" value={createForm.values.name} onChange={createForm.onChange} required />
                  </div>
                  <Button className="btn-primary" loading={createForm.submitting}>
                    Create
                  </Button>
                </form>
                <p className="muted small">Letters, numbers, dots, dashes and underscores. Up to 100 characters.</p>
                {createForm.error && <Alert>{createForm.error}</Alert>}
              </section>
            )}
            <section className="section">
              <div className="section-head">
                <div className="eyebrow">Repositories</div>
                <span className="mono muted">{repos.data?.length ?? ''}</span>
              </div>
              <Loadable state={repos}>
                {(list) =>
                  list.length ? <RepoCards repos={list} /> : <Empty title="No repositories yet">{isSelf && 'Create your first one above.'}</Empty>
                }
              </Loadable>
            </section>
          </>
        )}

        {tab === 'stars' && (
          <section className="section">
            <div className="eyebrow">Starred</div>
            <Loadable state={stars}>
              {(list) =>
                list.length ? <RepoCards repos={list.map(summaryCard(me.username))} /> : <Empty title="No stars yet" />
              }
            </Loadable>
          </section>
        )}
      </div>
    </main>
  )
}
