export interface SignUpReq {
  name: string
  username: string
  email: string
  password: string
}

export interface SignUpRes {
  id: string
}

export interface LoginReq {
  email: string
  password: string
}

export interface LoginRes {
  user: {
    token: string
    id: string
    name: string
    email: string
    username: string
  }
}

export interface Me {
  id: string
  name: string
  email: string
  username: string
}

export interface CreateRepoReq {
  name: string
}

export interface Repo {
  id: string
  name: string
  createdAt: string
}

/** One child of the requested directory — the API never returns grandchildren. */
export interface TreeEntry {
  fileMode: string
  objectType: 'tree' | 'blob' | 'commit'
  sha1Hash: string
  fileName: string
  /** Path relative to the repo root; pass back as ?path= to descend. */
  path: string
  /** Most recent commit touching this entry, once the server reports it. */
  lastCommit?: Commit
}

export interface Language {
  name: string
  percent: number
}

export interface RepoMeta {
  owner: string
  description: string
  visibility: 'public' | 'private'
  topics: string[]
  defaultBranch: string
  branches: string[]
  tags: number
  stars: number
  forks: number
  watching: number
  starred: boolean
  latestRelease: string | null
  languages: Language[]
}

export interface Commit {
  sha: string
  author: string
  message: string
  date: string
}

/** Live branch/tag data, merged into RepoMeta for the picker. */
export interface RepoRefs {
  defaultBranch: string
  branches: string[]
  tags: string[]
}

export interface Blob {
  path: string
  size: number
  content: string
}

export interface BlameRange {
  commit: Commit
  lines: number
}

export interface Label {
  name: string
  color: 'accent' | 'ink' | 'muted'
}

export interface Issue {
  number: number
  repo: string
  title: string
  author: string
  state: 'open' | 'closed'
  createdAt: string
  comments: number
  labels: Label[]
}

export interface PullRequest extends Omit<Issue, 'state'> {
  state: 'open' | 'closed' | 'merged'
  head: string
  base: string
}

export interface Release {
  tag: string
  name: string
  date: string
  notes: string
  latest: boolean
}

export interface Profile {
  username: string
  name: string
  bio: string
  company: string
  location: string
  website: string
  followers: number
  following: number
  isFollowing: boolean
}

export interface RepoSummary {
  owner: string
  name: string
  description: string
  language: string
  stars: number
  updatedAt: string
}

/** Contributions per day, oldest first, covering the last 52 weeks. */
export type Activity = number[]

export interface UpdateRepoReq {
  name: string
  description: string
  visibility: 'public' | 'private'
}

export interface NewIssueReq {
  title: string
  body: string
}
