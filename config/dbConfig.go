package config

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
	"time"
	"github.com/pressly/goose/v3"
)

var DB *gorm.DB
var DB_MIGRATOR gorm.Migrator

func ConnectDB() {
	config, err := LoadConfig(".")
	if err != nil {
		log.Fatal(err)
	}

	dsn := config.DbString

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	sql, err := DB.DB()
	DB_MIGRATOR = DB.Migrator()
	sql.SetMaxOpenConns(50)
	sql.SetMaxIdleConns(25)
	sql.SetConnMaxLifetime(time.Hour)
	
	if err := goose.SetDialect("postgres"); err != nil {
		panic(err)
	}
	
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Connected to database")
}
