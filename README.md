# gitark

A small self-hosted Git server: a Gin REST API for users and repositories, plus
Git Smart HTTP (`git clone` / `git push`) backed by bare repos on disk.

| Concern | Choice |
|---|---|
| HTTP | [Gin](https://github.com/gin-gonic/gin) |
| DB | PostgreSQL via [GORM](https://gorm.io) |
| Migrations | [goose](https://github.com/pressly/goose) |
| Config | [Viper](https://github.com/spf13/viper) (`.env`) |
| Logging | [zap](https://github.com/uber-go/zap) |
| Auth | JWT (HS256) + bcrypt |
| Git transport | `git-http-backend` through `net/http/cgi` |

## Quick start

Prerequisites: Go 1.26+, PostgreSQL, and `git` on the server's `PATH`.

```bash
# 1. database
createdb gitark

# 2. configuration (see table below) — must live in the working directory
cat > .env <<'EOF'
PORT=4000
DB_STRING=host=localhost user=postgres password=postgres dbname=gitark port=5432 sslmode=disable
JWT_SECRET=change-me
GIT_BINARY_PATH=/usr/lib/git-core/git-http-backend
EOF

# 3. create the repo root where bare repos will live
sudo mkdir -p /srv/git/users

# 4. schema
go run ./cmd/migrate

# 5. run
go run ./cmd/api
```

`GET /` returns `git server` when it is up.

### Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (server binds `0.0.0.0:$PORT`) |
| `DB_STRING` | PostgreSQL DSN |
| `JWT_SECRET` | HMAC key for signing/verifying tokens |
| `GIT_BINARY_PATH` | Absolute path to `git-http-backend` — find it with `git --exec-path` and append `/git-http-backend` (e.g. `/usr/lib/git-core`, `/usr/libexec/git-core`) |

The bare-repo root is **not** configurable yet; it is the constant
`config.GitRootDir = "/srv/git/users"` in `config/git.go`.

## API

Base URL `http://localhost:4000`. Requests and responses are JSON.
Authenticated routes take `Authorization: Bearer <jwt>` — there are no cookies;
the token from `/user/login` is valid for 30 days.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | — | Liveness, returns `git server` |
| `POST` | `/user/create` | — | Sign up → `{ data: { id } }` |
| `POST` | `/user/login` | — | Log in → `{ data: { user: { token, id, name, email, username } } }`; send the token as `Authorization: Bearer <token>` |
| `GET` | `/user/me` | ✅ | Current user profile |
| `POST` | `/repo/create` | ✅ | Create a repo → `{ data: { id, name, createdAt } }` |
| `GET` | `/repo/list` | ✅ | List your repos, newest first |
| `GET` | `/repo/:repoName/refs` | ✅ | Real default branch, branches and tags |
| `GET` | `/repo/:repoName/tree` | ✅ | One level of a repo's tree; `?ref=` and `?path=<dir>` optional, default HEAD/root |
| `GET` | `/repo/:repoName/blob/:blobHash` | ✅ | Raw bytes of a blob by git object hash (4–64 hex) |
| `GET` | `/repo/:repoName/commits/:branch` | ✅ | Commit history for a branch; `?path=<dir>` and `?limit=` optional |
| `ANY` | `/git/*` | Basic | Git Smart HTTP endpoints |

Sign up / log in:

```bash
curl -X POST http://localhost:4000/user/create \
  -H 'Content-Type: application/json' \
  -d '{"name":"Anurag Daksh","username":"anuragdaksh7","email":"me@example.com","password":"12345678"}'

TOKEN=$(curl -s -X POST http://localhost:4000/user/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"12345678"}' | jq -r .data.user.token)

curl -s http://localhost:4000/user/me -H "Authorization: Bearer $TOKEN"
```

Create a repo (name must match `^[A-Za-z0-9_.-]{1,100}$` and is unique per user):

```bash
curl -X POST http://localhost:4000/repo/create \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"firstrepo"}'
```

## Git over HTTP

Creating a repo also initialises a bare repo at
`/srv/git/users/<user-id>/<repo-name>.git`. It is served at
`/git/<user-id>/<repo-name>.git`, where `<user-id>` is the **UUID** returned by
`/user/create` or `/user/me` (not the username).

```bash
git clone http://192.168.1.5:4000/git/44aad002-7779-4f8b-884d-0bc7bce1bfa8/firstrepo.git
```

### Authentication

Git clients only speak Basic auth, so the JWT is used as the **password**:

```
Username: anything (ignored)
Password: <token from POST /user/login>
```

`middleware.GitAuth` verifies the token, checks that the UUID in the URL matches
the token's `id` claim, and passes the identity to `git-http-backend` as
`REMOTE_USER` — which is also what allows pushes.

Failure modes:

| Situation | Response |
|---|---|
| No credentials | `401` + `WWW-Authenticate: Basic realm="gitark"` (makes git prompt) |
| Invalid/expired token | `401` |
| URL owner ≠ token owner | `404 Repository not found` (existence is not leaked) |

### Avoiding repeated prompts

Let Git Credential Manager handle it (recommended — stores in the OS keychain):

```bash
git clone http://192.168.1.5:4000/git/<user-id>/<repo>.git
```

Or scope a plaintext store to that host only, so GitHub credentials are untouched:

```bash
git config --global credential."http://192.168.1.5:4000".helper store
printf 'protocol=http\nhost=192.168.1.5:4000\nusername=<anything>\npassword=%s\n\n' "$TOKEN" | git credential approve
```

Tokens expire after 30 days; re-run the login step and `git credential approve`
when they do.

> **Note:** Basic credentials travel in cleartext over `http://`. Fine on
> localhost/LAN; put a TLS-terminating proxy in front before exposing this
> publicly, and drop `GIT_HTTP_EXPORT_ALL` so only authenticated requests reach
> the CGI handler.

## Refs

`GET /repo/:repoName/refs` reports what HEAD points at and which branches and
tags exist. The UI uses it instead of assuming the default branch is `main`,
which is not true for repos created with an older git.

```bash
curl -s 'http://localhost:4000/repo/firstrepo/refs' -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": {
    "defaultBranch": "master",
    "branches": ["master", "feature/tree-view"],
    "tags": ["v0.1.0"]
  }
}
```

`defaultBranch` comes from `git symbolic-ref --short HEAD`, so it works even
before the first commit. If HEAD points at an unborn branch but other branches
exist (e.g. the repo was initialised on `master` and the first push only created
`main`), it falls back to `main`, then `master`, then the first existing branch —
otherwise the UI would show an empty repo. For an empty repository `branches`
contains just that default branch (so the picker is usable) and `tags` is `[]`.

## Directory tree

`GET /repo/:repoName/tree` returns **exactly one level** of a repository's tree —
the direct children of the requested node, never grandchildren. The node is
chosen with the `path` query parameter; omit it (or pass `/`) for the root.
`ref` selects the branch, tag or commit-ish; omit it for `HEAD`.

```bash
# root of the repo at the default branch (HEAD)
curl -s 'http://localhost:4000/repo/firstrepo/tree' -H "Authorization: Bearer $TOKEN"

# one level inside src/app on another branch
curl -s 'http://localhost:4000/repo/firstrepo/tree?ref=develop&path=src/app' -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    { "fileMode": "040000", "objectType": "tree", "sha1Hash": "3284e1f…", "fileName": "src", "path": "src" },
    { "fileMode": "100644", "objectType": "blob", "sha1Hash": "587be6b…", "fileName": "README.md", "path": "README.md" }
  ]
}
```

To descend, take a child's `path` and pass it back as `?path=`. Entries are
sorted by git. Because the listing is non-recursive, a directory with 500 files
nested below it costs the same as an empty one.

| Case | Response |
|---|---|
| Empty repository (no commits, any `ref`) | `200` with `data: []` |
| Unknown repo name, or one you don't own | `404 repository not found` |
| `path` is a file, or doesn't exist | `404 path not found` |
| `ref` is not a branch, tag or commit-ish in the repo | `404 branch not found` |
| `path` contains `..`, `.`, `//`, or `\` | `400 invalid path` |
| `ref` starts with `-` or contains whitespace | `400 invalid branch name` |

## Blob contents

`GET /repo/:repoName/blob/:blobHash` returns the raw bytes of one blob, selected
by git object hash — the `sha1Hash` from a tree entry. The frontend resolves a
`path` by listing its parent directory (one level) and looking up the entry, then
calls this route.

```bash
# sha1Hash from GET /repo/firstrepo/tree?ref=main
curl -s 'http://localhost:4000/repo/firstrepo/blob/587be6b4c3f93f93c489c0111bba5596147a26cb' \
  -H "Authorization: Bearer $TOKEN"
```

The response is the file itself (`application/octet-stream`), not JSON.

| Case | Response |
|---|---|
| Valid blob hash | `200` with raw bytes |
| Unknown repo, malformed hash, missing object, or a tree/commit hash | `404 blob not found` |
| Blob larger than 10 MiB | `413 blob too large` |

Hashes must be 4–64 hex characters, so a `-`-prefixed value can never be read
as a git option, and `cat-file blob` rejects hashes that point at trees or
commits instead of blobs.

## Frontend

A Vite + React 19 SPA lives in `web/`. In dev it proxies `/api/*` to the Go
server (`web/vite.config.ts`), which is why no CORS setup is needed locally.

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle into web/dist
```

| Route | Page |
|---|---|
| `/` | Dashboard: profile, create repo, repo list — each row links into the browser |
| `/repo/:repoName` | Tree browser; `?ref=<branch>` and `?path=<dir>` select the branch and node, breadcrumbs ascend |
| `/repo/:repoName/commits` | Commit history for the selected branch, optionally filtered by `?path=` |
| `/repo/:repoName/blob` | File view: code, Markdown preview and blame; `?path=` selects the file |

The browser requests exactly one level at a time and opens directories on click,
so only the current node is ever fetched. The branch picker is driven by
`/repo/:repoName/refs`, so the default branch is whatever git actually has
(`main`, `master`, …) rather than a hardcoded guess. Tree, commit bar and commit
history are all fetched for the branch currently selected in `?ref=`.

File contents come from `/repo/:repoName/blob/:blobHash`. Since the view only
knows the path from the URL, it lists the parent directory with the tree endpoint
and takes that entry's `sha1Hash`, then fetches the raw blob. Markdown files get
a preview, text files get syntax highlighting, binary files show a size/info
message, and `Raw` opens the decoded content in a new tab. Blame still uses
placeholder data.

On the repository root the README is rendered on page load from the same tree
listing: the page picks `README`/`README.md`, fetches that blob and renders it,
so the README always matches the branch selected in `?ref=`.

## Commit history

`GET /repo/:repoName/commits/:branch` lists commits reachable from `:branch`,
newest first, capped at 50 by default (`?limit=` raises it to a maximum of 200).

```bash
curl -s 'http://localhost:4000/repo/firstrepo/commits/main' -H "Authorization: Bearer $TOKEN"

# history for one directory only
curl -s 'http://localhost:4000/repo/firstrepo/commits/main?path=src/app' -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    {
      "sha": "3f21dc49c7120b899baf2a0b62dcff1f5c978ca9",
      "author": "Anurag Daksh",
      "date": "2026-11-06T23:27:55+05:30",
      "message": "add tree browser"
    }
  ]
}
```

`:branch` accepts any commit-ish that resolves inside the repo — branch, tag or
full SHA. Branch names with slashes (`feature/tree-view`) work too: the route is
a catch-all, so there is no need to double-encode `%2F`. `?path=` is an optional
filter (omit it for the whole repo); it maps to `git log <branch> -- <path>`, so
it also works for directories that no longer exist on the branch.

| Case | Response |
|---|---|
| Empty repository (no commits) | `200` with `data: []`, whatever branch was asked for |
| Unknown repo | `404 repository not found` |
| Branch/tag/SHA not in the repo | `404 branch not found` |
| Branch starting with `-`, or containing whitespace | `400 invalid branch name` |
| `path` contains `..`, `.`, `//`, or `\` | `400 invalid path` |

Nothing from the request is passed through a shell, and a leading `-` is rejected
so a branch name can never be read as a git option.

## Migrations

Schemas are managed by goose; the API does not auto-migrate.
Go migrations live in `migrations/` and self-register in `init()`.

```bash
go run ./cmd/migrate        # apply all pending migrations

# create a new migration
goose create add_some_column sql
```

## Project layout

```
cmd/
  api/        HTTP server entrypoint
  migrate/    goose runner
config/       viper .env loader, GORM connection, hardcoded git root
middleware/   RequireAuth (API: Bearer only), GitAuth (git: Basic + owner check)
internal/
  user/       handler + service (signup, login, me)
  repository/ handler + service (create, list, one-level tree, commit history, bare repo init)
model/        GORM models (User, Repository, BaseModel)
dto/          request/response payloads
router/       route table and CORS
migrations/   goose migrations
rest/         .http scratch requests
web/          Vite + React SPA (dashboard, repo tree browser)
gitark.postman_collection.json
```

## Testing

Import `gitark.postman_collection.json` into Postman. Run **User → Log In** first;
its test script stores the JWT in the `token` collection variable, and every
protected request inherits `Authorization: Bearer {{token}}`.

## Known limitations

- Push/fetch authorisation is per-user only — no collaborator or public/private
  visibility model yet, and no per-repo ACL beyond "owner".
- `config.GitRootDir` is hardcoded, and repo paths are keyed by user UUID rather
  than username, so clone URLs are not human-friendly.
- `POST /user/create` returns `500` for a duplicate email/username rather than `409`.
- `GetMeRes` exposes `profilePicture` and `role`, which the model does not have.
