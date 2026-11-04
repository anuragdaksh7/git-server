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
	FileMode string `json:"fileMode"`
	ObjectType string `json:"objectType"`
	SHA1Hash			string `json:"sha1Hash"`
	FileName string `json:"fileName"`
}
