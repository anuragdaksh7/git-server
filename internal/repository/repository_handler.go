package repository

import (
	"errors"
	"strconv"

	repositoryDto "gitark/dto/repository"
	"gitark/logger"
	"gitark/model"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Handler struct {
	Service
}

func NewHandler(s Service) *Handler {
	return &Handler{s}
}

func (h *Handler) Create(c *gin.Context) {
	var req repositoryDto.CreateRepo
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Logger.Error("Failed to bind json ", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currentUser := c.MustGet("user").(model.User)
	res, err := h.Service.Create(c, currentUser.ID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *Handler) List(c *gin.Context) {
	currentUser := c.MustGet("user").(model.User)
	res, err := h.Service.List(c, currentUser.ID)
	if err != nil {
		logger.Logger.Error("Failed to list repositories: ", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *Handler) DirTree(c *gin.Context) {
	currentUser := c.MustGet("user").(model.User)
	repoName := c.Param("repoName")
	// "" or "/" lists the repo root; anything else descends one level.
	path := c.DefaultQuery("path", "")

	res, err := h.Service.DirTree(c, currentUser.ID, repoName, path)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPath):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, ErrRepoNotFound), errors.Is(err, ErrPathNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			logger.Logger.Error("Failed to get directory tree: ", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *Handler) CommitHistory(c *gin.Context) {
	currentUser := c.MustGet("user").(model.User)
	repoName := c.Param("repoName")
	branch := c.Param("branch")
	// optional: restrict history to commits touching this path
	path := c.DefaultQuery("path", "")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(defaultCommitLimit)))

	res, err := h.Service.CommitHistory(c, currentUser.ID, repoName, branch, path, limit)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPath), errors.Is(err, ErrInvalidBranch):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, ErrRepoNotFound), errors.Is(err, ErrBranchNotFound), errors.Is(err, ErrPathNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			logger.Logger.Error("Failed to get commit history: ", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}
