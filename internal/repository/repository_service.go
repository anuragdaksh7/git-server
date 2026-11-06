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
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var validRepoName = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,100}$`)

var (
	ErrRepoNotFound = errors.New("repository not found")
	ErrPathNotFound = errors.New("path not found")
	ErrInvalidPath  = errors.New("invalid path")
)

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

func (s *service) DirTree(c context.Context, userId uuid.UUID, repoName string, path string) ([]repositoryDto.DirTreeRes, error) {
	var repo model.Repository
	if err := s.DB.Where("created_by = ? AND name = ?", userId, repoName).First(&repo).Error; err != nil {
		return nil, ErrRepoNotFound
	}

	dir, err := cleanTreePath(path)
	if err != nil {
		return nil, err
	}

	repoDir := repoPath(repo.CreatedBy, repo.Name)

	// No commits yet: an empty repo has no HEAD, which is a valid empty listing.
	if err := exec.CommandContext(c, "git", "-C", repoDir, "rev-parse", "--verify", "--quiet", "HEAD").Run(); err != nil {
		return []repositoryDto.DirTreeRes{}, nil
	}

	ref := "HEAD"
	if dir != "" {
		ref = "HEAD:" + dir
		out, err := exec.CommandContext(c, "git", "-C", repoDir, "cat-file", "-t", ref).Output()
		if err != nil || strings.TrimSpace(string(out)) != "tree" {
			return nil, ErrPathNotFound
		}
	}

	// No -r: exactly one level below the requested node.
	out, err := exec.CommandContext(c, "git", "-C", repoDir, "ls-tree", "-z", ref).Output()
	if err != nil {
		return nil, errors.New("git ls-tree failed: " + err.Error())
	}

	return parseTree(out, dir), nil
}

func (s *service) CommitHistory(c context.Context, userId uuid.UUID, repoName string, branch string) ([]repositoryDto.CommitRes, error) {
	var repo model.Repository
	if err := s.DB.Where("created_by = ? AND name = ?", userId, repoName).First(&repo).Error; err != nil {
		return nil, ErrRepoNotFound
	}

	dir, err := cleanTreePath(path)
	if err != nil {
		return nil, err
	}

	repoDir := repoPath(repo.CreatedBy, repo.Name)

	if err := exec.CommandContext(c, "git", "-C", repoDir, "rev-parse", "--verify", "--quiet", "HEAD").Run(); err != nil {
		return []repositoryDto.CommitRes{}, nil
	}

	args := []string{"-C", repoDir, "log", "--pretty=format:%H%x09%an%x09%ad%x09%s", "--date=iso"}
	if dir != "" {
		args = append(args, "--", dir)
	}

	out, err := exec.CommandContext(c, "git", args...).Output()
	if err != nil {
		return nil, errors.New("git log failed: " + err.Error())
	}

	lines := strings.Split(string(out), "\n")
	res := make([]repositoryDto.CommitRes, 0, len(lines))
	for _, line := range lines {
		if line == "" {
			continue
		}
		fields := strings.SplitN(line, "\t", 4)
		if len(fields) < 4 {
			continue
		}
		res = append(res, repositoryDto.CommitRes{
			SHA1Hash: fields[0],
			Author:   fields[1],
			Date:     fields[2],
			Message:  fields[3],
		})
	}

	return res, nil
}

// cleanTreePath normalises a user supplied path. "" or "/" means the repo root.
func cleanTreePath(p string) (string, error) {
	p = strings.Trim(strings.TrimSpace(p), "/")
	if p == "" {
		return "", nil
	}
	if strings.ContainsAny(p, "\\\x00") {
		return "", ErrInvalidPath
	}
	for _, seg := range strings.Split(p, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return "", ErrInvalidPath
		}
	}
	return p, nil
}

// parseTree decodes `git ls-tree -z` output: "<mode> <type> <sha>\t<name>\0".
func parseTree(out []byte, base string) []repositoryDto.DirTreeRes {
	res := make([]repositoryDto.DirTreeRes, 0)

	for _, record := range strings.Split(string(out), "\x00") {
		if record == "" {
			continue
		}
		meta, name, ok := strings.Cut(record, "\t")
		if !ok {
			continue
		}
		fields := strings.Fields(meta)
		if len(fields) < 3 {
			continue
		}

		entryPath := name
		if base != "" {
			entryPath = base + "/" + name
		}

		res = append(res, repositoryDto.DirTreeRes{
			FileMode:   fields[0],
			ObjectType: fields[1],
			SHA1Hash:   fields[2],
			FileName:   name,
			Path:       entryPath,
		})
	}

	return res
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
