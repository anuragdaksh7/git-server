package main

import (
	"log"

	"gitark/config"
	"gitark/router"
)

var _config config.Config

func init() {
	var err error
	_config, err = config.LoadConfig(".")
	if err != nil {
		panic(err)
	}
}

func main() {
	router.InitRouter()
	log.Fatal(router.Start("0.0.0.0:" + _config.PORT))
}
