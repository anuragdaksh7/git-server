package repository

import (
	"context"
	repositoryDto "gitark/dto/repository"

	"github.com/google/uuid"
)

type Service interface {
	Create(c context.Context, userId uuid.UUID, req *repositoryDto.CreateRepo) (*repositoryDto.RepoRes, error)
	List(c context.Context, userId uuid.UUID) ([]repositoryDto.RepoRes, error)
	DirTree(c context.Context, userId uuid.UUID, repoName string, path string) ([]repositoryDto.DirTreeRes, error)
	CommitHistory(c context.Context, userId uuid.UUID, repoName string, branch string, path string, limit int) ([]repositoryDto.CommitRes, error)
}
