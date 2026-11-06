package repository

import (
	"context"
	"errors"
	"fmt"
	"gitark/config"
	repositoryDto "gitark/dto/repository"
	"gitark/logger"
	"gitark/model"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var validRepoName = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,100}$`)

var (
	ErrRepoNotFound   = errors.New("repository not found")
	ErrPathNotFound   = errors.New("path not found")
	ErrInvalidPath    = errors.New("invalid path")
	ErrBranchNotFound = errors.New("branch not found")
	ErrInvalidBranch  = errors.New("invalid branch name")
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

func (s *service) DirTree(c context.Context, userId uuid.UUID, repoName string, ref string, path string) ([]repositoryDto.DirTreeRes, error) {
	var repo model.Repository
	if err := s.DB.Where("created_by = ? AND name = ?", userId, repoName).First(&repo).Error; err != nil {
		return nil, ErrRepoNotFound
	}

	dir, err := cleanTreePath(path)
	if err != nil {
		return nil, err
	}

	repoDir := repoPath(repo.CreatedBy, repo.Name)

	ref = strings.TrimSpace(ref)
	if ref == "" {
		ref = "HEAD"
	}
	if !safeRef(ref) {
		return nil, ErrInvalidBranch
	}

	sha, err := resolveCommit(c, repoDir, ref)
	if err != nil {
		// No commits yet: an empty repo has no HEAD, which is a valid empty listing.
		if unbornRef(c, repoDir, ref) {
			return []repositoryDto.DirTreeRes{}, nil
		}
		return nil, err
	}

	target := sha
	if dir != "" {
		target = sha + ":" + dir
		out, err := exec.CommandContext(c, "git", "-C", repoDir, "cat-file", "-t", target).Output()
		if err != nil || strings.TrimSpace(string(out)) != "tree" {
			return nil, ErrPathNotFound
		}
	}

	// No -r: exactly one level below the requested node.
	out, err := exec.CommandContext(c, "git", "-C", repoDir, "ls-tree", "-z", target).Output()
	if err != nil {
		return nil, errors.New("git ls-tree failed: " + err.Error())
	}

	return parseTree(out, dir), nil
}

// Refs reports the branch HEAD points at plus every branch and tag in the repo.
// The frontend needs this because "main" is not a safe default for old repos.
func (s *service) Refs(c context.Context, userId uuid.UUID, repoName string) (*repositoryDto.RefsRes, error) {
	var repo model.Repository
	if err := s.DB.Where("created_by = ? AND name = ?", userId, repoName).First(&repo).Error; err != nil {
		return nil, ErrRepoNotFound
	}

	repoDir := repoPath(repo.CreatedBy, repo.Name)
	res := &repositoryDto.RefsRes{Branches: []string{}, Tags: []string{}}

	// Works even before the first commit: HEAD is an unborn branch symref.
	if out, err := exec.CommandContext(c, "git", "-C", repoDir, "symbolic-ref", "--short", "HEAD").Output(); err == nil {
		res.DefaultBranch = strings.TrimSpace(string(out))
	}
	if res.DefaultBranch == "" {
		res.DefaultBranch = "main"
	}

	out, err := exec.CommandContext(c, "git", "-C", repoDir, "for-each-ref", "--format=%(refname:short)", "refs/heads").Output()
	if err != nil {
		return nil, errors.New("git for-each-ref failed: " + err.Error())
	}
	res.Branches = parseRefList(out)
	switch {
	case len(res.Branches) == 0:
		res.Branches = []string{res.DefaultBranch}
	case !containsString(res.Branches, res.DefaultBranch):
		// HEAD points at an unborn branch. Common with a bare repo whose git
		// defaulted to "master" but the first push used "main": asking for
		// HEAD's branch would show an empty repo even though commits exist.
		res.DefaultBranch = preferredBranch(res.Branches)
	}

	out, err = exec.CommandContext(c, "git", "-C", repoDir, "for-each-ref", "--format=%(refname:short)", "refs/tags").Output()
	if err != nil {
		return nil, errors.New("git for-each-ref failed: " + err.Error())
	}
	res.Tags = parseRefList(out)

	return res, nil
}

// resolveCommit turns any commit-ish (branch, tag, SHA, HEAD) into a full SHA.
func resolveCommit(c context.Context, repoDir string, ref string) (string, error) {
	out, err := exec.CommandContext(c, "git", "-C", repoDir, "rev-parse", "--verify", "--quiet", ref+"^{commit}").Output()
	if err != nil {
		return "", ErrBranchNotFound
	}
	sha := strings.TrimSpace(string(out))
	if sha == "" {
		return "", ErrBranchNotFound
	}
	return sha, nil
}

// unbornRef reports whether a failed lookup is just a branch with no commits
// yet rather than a typo. True for HEAD, for the branch HEAD points at (even
// while other branches exist), and for any ref in a repo with no commits.
func unbornRef(c context.Context, repoDir string, ref string) bool {
	if ref == "HEAD" {
		return true
	}

	if out, err := exec.CommandContext(c, "git", "-C", repoDir, "symbolic-ref", "--short", "HEAD").Output(); err == nil {
		if strings.TrimSpace(string(out)) == ref {
			return true
		}
	}

	out, err := exec.CommandContext(c, "git", "-C", repoDir, "rev-list", "--all", "--count").Output()
	return err == nil && strings.TrimSpace(string(out)) == "0"
}

// CommitHistory lists commits reachable from branch, optionally restricted to
// those touching path. An empty repository yields an empty list, not an error.
func (s *service) CommitHistory(c context.Context, userId uuid.UUID, repoName string, branch string, path string, limit int) ([]repositoryDto.CommitRes, error) {
	var repo model.Repository
	if err := s.DB.Where("created_by = ? AND name = ?", userId, repoName).First(&repo).Error; err != nil {
		return nil, ErrRepoNotFound
	}

	dir, err := cleanTreePath(path)
	if err != nil {
		return nil, err
	}

	repoDir := repoPath(repo.CreatedBy, repo.Name)

	ref := strings.TrimSpace(branch)
	if ref == "" {
		ref = "HEAD"
	}
	if !safeRef(ref) {
		return nil, ErrInvalidBranch
	}
	if _, err := resolveCommit(c, repoDir, ref); err != nil {
		// No commits yet: empty history beats a 404 for the default branch.
		if unbornRef(c, repoDir, ref) {
			return []repositoryDto.CommitRes{}, nil
		}
		return nil, err
	}

	if limit <= 0 || limit > maxCommitLimit {
		limit = defaultCommitLimit
	}

	// -z keeps records NUL separated so messages containing tabs/newlines are safe
	args := []string{
		"-C", repoDir, "log", ref, "-z",
		fmt.Sprintf("--max-count=%d", limit),
		"--pretty=format:%H%x09%an%x09%aI%x09%s",
	}
	if dir != "" {
		args = append(args, "--", dir)
	}

	out, err := exec.CommandContext(c, "git", args...).Output()
	if err != nil {
		return nil, errors.New("git log failed: " + err.Error())
	}

	return parseCommits(out), nil
}

const (
	defaultCommitLimit = 50
	maxCommitLimit     = 200
)

// safeRef rejects input git would read as an option, plus whitespace/controls.
// Existence is confirmed separately with rev-parse.
func safeRef(ref string) bool {
	if ref == "" || len(ref) > 255 || strings.HasPrefix(ref, "-") {
		return false
	}
	return !strings.ContainsAny(ref, " \t\n\r\x00")
}

// parseCommits decodes `git log -z --pretty=format:%H%x09%an%x09%aI%x09%s`.
func parseCommits(out []byte) []repositoryDto.CommitRes {
	records := strings.Split(string(out), "\x00")
	res := make([]repositoryDto.CommitRes, 0, len(records))

	for _, record := range records {
		record = strings.TrimLeft(record, "\n")
		if record == "" {
			continue
		}
		fields := strings.SplitN(record, "\t", 4)
		if len(fields) < 4 {
			continue
		}
		date, err := time.Parse(time.RFC3339, fields[2])
		if err != nil {
			continue
		}
		res = append(res, repositoryDto.CommitRes{
			SHA:     fields[0],
			Author:  fields[1],
			Date:    date,
			Message: fields[3],
		})
	}

	return res
}

// parseRefList decodes `git for-each-ref --format=%(refname:short)` output.
func parseRefList(out []byte) []string {
	res := make([]string, 0)
	for _, line := range strings.Split(string(out), "\n") {
		if line = strings.TrimSpace(line); line != "" {
			res = append(res, line)
		}
	}
	return res
}

func containsString(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

// preferredBranch picks a sensible default from existing branches when HEAD's
// branch has no commits yet.
func preferredBranch(branches []string) string {
	for _, want := range []string{"main", "master"} {
		if containsString(branches, want) {
			return want
		}
	}
	return branches[0]
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
