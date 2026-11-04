package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"gitark/config"
	"gitark/logger"
	"gitark/model"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequireAuth accepts only `Authorization: Bearer <jwt>`. No cookies: the SPA
// keeps the token in localStorage and git clients use Basic auth elsewhere.
func RequireAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if tokenString == "" {
			logger.Logger.Warn("auth: no credential", zap.String("route", c.FullPath()))
			unauthorized(c)
			return
		}

		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			logger.Logger.Warn("auth: invalid token",
				zap.String("route", c.FullPath()),
				zap.Int("length", len(tokenString)),
				zap.String("prefix", truncate(tokenString, 12)),
				zap.Error(err),
			)
			unauthorized(c)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			logger.Logger.Warn("auth: unexpected claims type")
			unauthorized(c)
			return
		}

		id, err := uuid.Parse(fmt.Sprint(claims["id"]))
		if err != nil {
			logger.Logger.Warn("auth: malformed id claim", zap.Any("id", claims["id"]), zap.Error(err))
			unauthorized(c)
			return
		}

		var user model.User
		if err := config.DB.First(&user, "id = ?", id).Error; err != nil {
			logger.Logger.Warn("auth: user lookup failed", zap.String("id", id.String()), zap.Error(err))
			unauthorized(c)
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

func unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
