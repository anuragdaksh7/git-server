import type { Activity, BlameRange, Blob, Commit, Issue, Profile, PullRequest, Release, RepoMeta, RepoSummary } from './types'

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

export const repoMeta = (owner: string): RepoMeta => ({
  owner,
  description: '',
  visibility: 'private',
  topics: ['git', 'self-hosted'],
  defaultBranch: 'main',
  branches: ['main', 'develop', 'feat/tree-view', 'fix/auth-cookie'],
  tags: 3,
  stars: 0,
  forks: 0,
  watching: 1,
  starred: false,
  latestRelease: 'v0.1.0',
  languages: [
    { name: 'Go', percent: 74 },
    { name: 'TypeScript', percent: 21 },
    { name: 'Other', percent: 5 },
  ],
})

export const commits = (author: string): Commit[] => [
  { sha: 'a91f3c2e7d', author, message: 'Add one-level tree endpoint', date: ago(0.1) },
  { sha: '4e9e31a0b2', author, message: 'Format code across packages', date: ago(1) },
  { sha: 'd8883a6c41', author, message: 'Repository browser UI', date: ago(2) },
  { sha: '31f082c9aa', author, message: 'Accept path query on tree', date: ago(4) },
  { sha: 'bd34261f03', author, message: 'Initialise web application', date: ago(9) },
  { sha: 'b325153e11', author, message: 'Repository model and migration', date: ago(30) },
  { sha: '1aac416d7e', author, message: 'Initial commit', date: ago(45) },
]

const README = `# {{repo}}

A repository hosted on gitark.

## Clone

\`\`\`
git clone {{clone}}
\`\`\`

## Notes

This README is placeholder content. Once the server can read blobs, the real \`README.md\` from the default branch appears here.
`

export const readme = (repo: string, clone: string): Blob => {
  const content = README.replaceAll('{{repo}}', repo).replaceAll('{{clone}}', clone)
  return { path: 'README.md', size: content.length, content }
}

const SAMPLE_GO = `package main

import (
	"fmt"
	"net/http"
)

// healthHandler reports that the server is up.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "ok")
}

func main() {
	http.HandleFunc("/health", healthHandler)
	if err := http.ListenAndServe(":4000", nil); err != nil {
		panic(err)
	}
}
`

export const blob = (path: string): Blob => {
  const content = path.toLowerCase().endsWith('.md') ? readme(path, '…').content : SAMPLE_GO
  return { path, size: new TextEncoder().encode(content).length, content }
}

export const blame = (author: string, lineCount: number): BlameRange[] => {
  const [a, b, c] = commits(author)
  const first = Math.min(6, lineCount)
  const second = Math.min(7, lineCount - first)
  return [
    { commit: c, lines: first },
    { commit: a, lines: second },
    { commit: b, lines: Math.max(0, lineCount - first - second) },
  ].filter((range) => range.lines > 0)
}

export const issues = (owner: string, repo: string): Issue[] => [
  { number: 12, repo, title: 'Tree view should show last commit per entry', author: owner, state: 'open', createdAt: ago(1), comments: 3, labels: [{ name: 'enhancement', color: 'accent' }] },
  { number: 11, repo, title: 'Login cookie rejected outside dev', author: 'mira.k', state: 'open', createdAt: ago(2), comments: 5, labels: [{ name: 'bug', color: 'ink' }] },
  { number: 9, repo, title: 'Support deleting repositories', author: owner, state: 'open', createdAt: ago(6), comments: 0, labels: [] },
  { number: 7, repo, title: 'Duplicate signup returns 500 instead of 409', author: 'tomas', state: 'closed', createdAt: ago(12), comments: 2, labels: [{ name: 'bug', color: 'ink' }] },
  { number: 4, repo, title: 'Document Git credential setup', author: owner, state: 'closed', createdAt: ago(20), comments: 1, labels: [{ name: 'docs', color: 'muted' }] },
]

export const pulls = (owner: string, repo: string): PullRequest[] => [
  { number: 14, repo, title: 'Show file contents in browser', author: owner, state: 'open', createdAt: ago(0.5), comments: 2, labels: [{ name: 'enhancement', color: 'accent' }], head: 'feat/blob-view', base: 'main' },
  { number: 13, repo, title: 'Return 409 on duplicate signup', author: 'tomas', state: 'merged', createdAt: ago(3), comments: 4, labels: [], head: 'fix/signup-409', base: 'main' },
  { number: 10, repo, title: 'Experimental SSH transport', author: 'mira.k', state: 'closed', createdAt: ago(15), comments: 9, labels: [{ name: 'wontfix', color: 'muted' }], head: 'ssh', base: 'main' },
]

export const releases = (): Release[] => [
  { tag: 'v0.1.0', name: 'First usable build', date: ago(5), notes: 'Users, repositories and Git over HTTP.\n\n- Sign up and log in\n- Create and list repositories\n- Clone and push with a token', latest: true },
  { tag: 'v0.0.2', name: 'Repository model', date: ago(30), notes: 'Adds the repository table and bare repo creation.', latest: false },
  { tag: 'v0.0.1', name: 'Initial setup', date: ago(45), notes: 'Project skeleton.', latest: false },
]

export const profile = (username: string, name: string): Profile => ({
  username,
  name,
  bio: 'Builds small tools for moving bytes around reliably.',
  company: '',
  location: '',
  website: '',
  followers: 0,
  following: 0,
  isFollowing: false,
})

export const activity = (): Activity => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 364 }, (_, i) => {
    const weekday = i % 7 === 0 || i % 7 === 6 ? 0.5 : 1
    const r = rnd() * weekday * (0.6 + 0.4 * Math.sin(i / 40))
    return r < 0.25 ? 0 : Math.round(r * 12)
  })
}

export const explore = (): RepoSummary[] => [
  { owner: 'mira.k', name: 'tern', description: 'Dependency-free log shipper with back-pressure.', language: 'Rust', stars: 1284, updatedAt: ago(0.1) },
  { owner: 'mira.k', name: 'quay', description: 'Tiny HTTP queue with at-least-once delivery.', language: 'Rust', stars: 402, updatedAt: ago(3) },
  { owner: 'tomas', name: 'sift', description: 'Grep for structured logs. JSON, logfmt, CSV.', language: 'Go', stars: 219, updatedAt: ago(8) },
  { owner: 'halden', name: 'ledger', description: 'Append-only key value store backed by a single file.', language: 'Go', stars: 98, updatedAt: ago(14) },
  { owner: 'tomas', name: 'dotfiles', description: 'Shell, editor and terminal configuration.', language: 'Shell', stars: 37, updatedAt: ago(21) },
  { owner: 'halden', name: 'paper', description: 'Static site generator with zero config.', language: 'TypeScript', stars: 12, updatedAt: ago(40) },
]

export const starred = (): RepoSummary[] => explore().slice(0, 3)
