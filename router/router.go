package router

import (
	"gitark/internal/user"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var r *gin.Engine

func InitRouter(
	userHandler *user.Handler,
) {
	r = gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost:5173"
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "git server")
	})

	userRouter := r.Group("/user")
	{
		userRouter.POST("/create", userHandler.SignUp)
		userRouter.POST("/login", userHandler.LogIn)
		userRouter.GET("/me", userHandler.Me)
	}
}

func Start(addr string) error {
	return r.Run(addr)
}
