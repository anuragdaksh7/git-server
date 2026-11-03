package repository

import (
	"context"
	"errors"
	"gitark/config"
	repositoryDto "gitark/dto/repository"
	"gitark/logger"
	"gitark/model"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var validRepoName = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,100}$`)

type service struct {
	DB *gorm.DB
}

func NewService() Service {
	return &service{config.DB}
}

func (s *service) Create(c context.Context, userId uuid.UUID, req *repositoryDto.CreateRepo) (*repositoryDto.RepoRes, error) {
	if !validRepoName.MatchString(req.Name) || req.Name == "." || req.Name == ".." {
		return nil, errors.New("invalid repository name")
	}

	var count int64
	s.DB.Model(&model.Repository{}).Where("created_by = ? AND name = ?", userId, req.Name).Count(&count)
	if count > 0 {
		return nil, errors.New("repository already exists")
	}

	repo := model.Repository{
		Name:      req.Name,
		CreatedBy: userId,
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&repo).Error; err != nil {
			return err
		}
		return initBareRepo(repoPath(userId, req.Name))
	})
	if err != nil {
		logger.Logger.Error("Error creating repository: ", zap.Error(err))
		return nil, err
	}

	return toRes(repo), nil
}

func (s *service) List(c context.Context, userId uuid.UUID) ([]repositoryDto.RepoRes, error) {
	var repos []model.Repository
	if err := s.DB.Where("created_by = ?", userId).Order("created_at desc").Find(&repos).Error; err != nil {
		return nil, err
	}

	res := make([]repositoryDto.RepoRes, 0, len(repos))
	for _, r := range repos {
		res = append(res, *toRes(r))
	}
	return res, nil
}

func repoPath(userId uuid.UUID, name string) string {
	return filepath.Join(config.GitRootDir, userId.String(), name+".git")
}

func initBareRepo(path string) error {
	if err := os.MkdirAll(path, 0755); err != nil {
		return err
	}
	cmd := exec.Command("git", "init", "--bare")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err != nil {
		os.RemoveAll(path)
		return errors.New("git init failed: " + string(out))
	}
	return nil
}

func toRes(r model.Repository) *repositoryDto.RepoRes {
	return &repositoryDto.RepoRes{
		ID:        r.ID,
		Name:      r.Name,
		CreatedAt: r.CreatedAt,
	}
}
