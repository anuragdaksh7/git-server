package main

import (
	"log"
	"net/http/cgi"

	"gitark/config"
	"gitark/internal/repository"
	"gitark/internal/user"
	"gitark/logger"
	_ "gitark/migrations"
	"gitark/router"
)

var _config config.Config

func init() {
	var err error
	_config, err = config.LoadConfig(".")
	if err != nil {
		panic(err)
	}

	logger.InitLogger(_config)
	logger.Logger.Info("logger init")
	config.ConnectDB()
	logger.Logger.Info("DB connection established")
}

func main() {
	userHandler := user.NewHandler(user.NewService())
	repoHandler := repository.NewHandler(repository.NewService())

	gitHandler := &cgi.Handler{
		Path: _config.GitBinaryPath,
		Env: []string{
			"GIT_PROJECT_ROOT=" + config.GitRootDir,
			"GIT_HTTP_EXPORT_ALL=1",
		},
	}

	router.InitRouter(
		_config.JwtSecret,
		userHandler,
		repoHandler,
		gitHandler,
	)
	log.Fatal(router.Start("0.0.0.0:" + _config.PORT))
}
