package main

import (
	"log"

	"gitark/config"
	_ "gitark/migrations"

	"github.com/pressly/goose/v3"
)

func main() {
	config.ConnectDB()

	db, err := config.DB.DB()
	if err != nil {
		log.Fatal(err)
	}

	if err := goose.Up(db, "migrations"); err != nil {
		log.Fatal(err)
	}
}
