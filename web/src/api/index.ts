import { get, getBytes, post, setToken } from './client'
import * as placeholder from './placeholder'
import { planned, plannedWrite } from './planned'
import type {
  Activity,
  BlameRange,
  Commit,
  CreateRepoReq,
  Issue,
  LoginReq,
  LoginRes,
  Me,
  NewIssueReq,
  Profile,
  PullRequest,
  Release,
  Repo,
  RepoMeta,
  RepoRefs,
  RepoSummary,
  SignUpReq,
  SignUpRes,
  TreeEntry,
  UpdateRepoReq,
} from './types'

export { ApiError, clearToken } from './client'
export type * from './types'

const repoPath = (repoName: string) => `/repo/${encodeURIComponent(repoName)}`
const withQuery = (path: string, query: Record<string, string>) => {
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v))
  return params.size ? `${path}?${params}` : path
}

export const api = {
  signUp: (req: SignUpReq) => post<SignUpRes>('/user/create', req),
  login: async (req: LoginReq) => {
    const res = await post<LoginRes>('/user/login', req)
    setToken(res.user.token)
    return res
  },
  me: () => get<Me>('/user/me'),
  createRepo: (req: CreateRepoReq) => post<Repo>('/repo/create', req),
  listRepos: () => get<Repo[]>('/repo/list'),
  /** Real default branch plus every branch and tag in the repo. */
  refs: (repoName: string) => get<RepoRefs>(`${repoPath(repoName)}/refs`),
  /** One level of the repo tree at `ref` (HEAD when omitted). `path` defaults to root. */
  tree: (repoName: string, ref: string, path = '') =>
    get<TreeEntry[]>(withQuery(`${repoPath(repoName)}/tree`, { ref, path })),

  profile: (me: Me, username = me.username) =>
    planned<Profile>(`GET /user/${username}/profile`, placeholder.profile(username, username === me.username ? me.name : username)),
  activity: (username: string) => planned<Activity>(`GET /user/${username}/activity`, placeholder.activity()),
  starred: (username: string) => planned<RepoSummary[]>(`GET /user/${username}/starred`, placeholder.starred()),
  follow: (username: string) => plannedWrite(`POST /user/${username}/follow`),
  explore: (q: string) =>
    planned<RepoSummary[]>(
      withQuery('GET /explore', { q }),
      placeholder.explore().filter((r) => `${r.owner}/${r.name} ${r.description}`.toLowerCase().includes(q.toLowerCase())),
    ),

  repoMeta: (repoName: string, owner: string) => planned<RepoMeta>(`GET ${repoPath(repoName)}`, placeholder.repoMeta(owner)),
  updateRepo: (repoName: string, _req: UpdateRepoReq) => plannedWrite<Repo>(`PUT ${repoPath(repoName)}`),
  deleteRepo: (repoName: string) => plannedWrite(`DELETE ${repoPath(repoName)}`),
  star: (repoName: string) => plannedWrite(`POST ${repoPath(repoName)}/star`),
  fork: (repoName: string) => plannedWrite(`POST ${repoPath(repoName)}/fork`),

  commits: (repoName: string, ref: string, path = '') =>
    get<Commit[]>(withQuery(`${repoPath(repoName)}/commits/${encodeURIComponent(ref)}`, { path })),
  readme: (repoName: string, ref: string, cloneUrl: string) =>
    planned<Blob | null>(withQuery(`GET ${repoPath(repoName)}/readme`, { ref }), placeholder.readme(repoName, cloneUrl)),
  /** Raw bytes of a blob by its git object hash. */
  blob: (repoName: string, blobHash: string) =>
    getBytes(`${repoPath(repoName)}/blob/${encodeURIComponent(blobHash)}`),
  blame: (repoName: string, owner: string, ref: string, path: string, lines: number) =>
    planned<BlameRange[]>(withQuery(`GET ${repoPath(repoName)}/blame`, { ref, path }), placeholder.blame(owner, lines)),

  issues: (repoName: string, owner: string) => planned<Issue[]>(`GET ${repoPath(repoName)}/issues`, placeholder.issues(owner, repoName)),
  pulls: (repoName: string, owner: string) => planned<PullRequest[]>(`GET ${repoPath(repoName)}/pulls`, placeholder.pulls(owner, repoName)),
  myIssues: (owner: string) => planned<Issue[]>('GET /issues', placeholder.issues(owner, 'firstrepo')),
  myPulls: (owner: string) => planned<PullRequest[]>('GET /pulls', placeholder.pulls(owner, 'firstrepo')),
  createIssue: (repoName: string, _req: NewIssueReq) => plannedWrite<Issue>(`POST ${repoPath(repoName)}/issues`),
  releases: (repoName: string) => planned<Release[]>(`GET ${repoPath(repoName)}/releases`, placeholder.releases()),
}
