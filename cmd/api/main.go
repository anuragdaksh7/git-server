package main

import (
	"log"

	"gitark/config"
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
	
	userSvc := user.NewService()

	userHandler := user.NewHandler(userSvc)

	router.InitRouter(
		userHandler,
	)
	log.Fatal(router.Start("0.0.0.0:" + _config.PORT))
}
