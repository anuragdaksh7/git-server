package repositoryDto

import (
	"time"

	"github.com/google/uuid"
)

type CreateRepo struct {
	Name string `json:"name"`
}

type RepoRes struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type DirTreeRes struct {
	FileMode   string `json:"fileMode"`
	ObjectType string `json:"objectType"`
	SHA1Hash   string `json:"sha1Hash"`
	FileName   string `json:"fileName"`
	Path       string `json:"path"`
}

type CommitRes struct {
	SHA     string    `json:"sha"`
	Author  string    `json:"author"`
	Date    time.Time `json:"date"`
	Message string    `json:"message"`
}

// RefsRes is what the branch picker needs: the branch HEAD points at and the
// branches/tags that actually exist in the repo.
type RefsRes struct {
	DefaultBranch string   `json:"defaultBranch"`
	Branches      []string `json:"branches"`
	Tags          []string `json:"tags"`
}
