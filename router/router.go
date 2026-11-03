package router

import (
	"gitark/internal/repository"
	"gitark/internal/user"
	"gitark/middleware"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var r *gin.Engine

func InitRouter(
	jwtSecret string,
	userHandler *user.Handler,
	repoHandler *repository.Handler,
	gitHandler http.Handler
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

	auth := middleware.RequireAuth(jwtSecret)

	r.Any("/git/*path", gin.WrapH(http.StripPrefix("/git", gitHandler)))

	userRouter := r.Group("/user")
	{
		userRouter.POST("/create", userHandler.SignUp)
		userRouter.POST("/login", userHandler.LogIn)
		userRouter.GET("/me", auth, userHandler.Me)
	}

	repoRouter := r.Group("/repo", auth)
	{
		repoRouter.POST("/create", repoHandler.Create)
		repoRouter.GET("/list", repoHandler.List)
	}
}

func Start(addr string) error {
	return r.Run(addr)
}
