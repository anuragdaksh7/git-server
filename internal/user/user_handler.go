package user

import (
	userDto "gitark/dto/user"
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

func (h *Handler) SignUp(c *gin.Context) {
	var req userDto.SignUpReq
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Logger.Error("Failed to bind json ", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.Service.SignUp(c, &req)
	if err != nil {
		logger.Logger.Error("Failed to sign up ", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *Handler) LogIn(c *gin.Context) {
	var req userDto.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Logger.Error("Failed to bind json ", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.Service.Login(c, &req)
	if err != nil {
		logger.Logger.Error("Failed to login ", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Bearer only: the token goes in the response body, never a cookie.
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"user": res}})
}

func (h *Handler) Me(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		logger.Logger.Warn("Failed to get user from context : UNAUTHORIZED")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUser := user.(model.User)

	res, err := h.Service.Me(c, currentUser.ID)
	if err != nil {
		logger.Logger.Error("Failed to get user: ", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

