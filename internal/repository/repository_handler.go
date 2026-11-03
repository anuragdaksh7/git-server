package repository

import (
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
