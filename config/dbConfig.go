package config

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
	"time"
)

var DB *gorm.DB

func ConnectDB() {
	config, err := LoadConfig(".")
	if err != nil {
		log.Fatal(err)
	}

	dsn := config.DbString

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	sql, err := DB.DB()
	sql.SetMaxOpenConns(50)
	sql.SetMaxIdleConns(25)
	sql.SetConnMaxLifetime(time.Hour)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Connected to database")
}
