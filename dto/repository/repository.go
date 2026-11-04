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

// DirTreeRes is one child of the requested directory. Children of subdirectories
// are never included: the listing is exactly one level deep.
type DirTreeRes struct {
	FileMode   string `json:"fileMode"`
	ObjectType string `json:"objectType"`
	SHA1Hash   string `json:"sha1Hash"`
	FileName   string `json:"fileName"`
	// Path is relative to the repo root and may be passed back as ?path= to
	// descend into a directory.
	Path string `json:"path"`
}
