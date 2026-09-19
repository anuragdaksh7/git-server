package migrations

import (
	"gitark/config"
	"context"
	"database/sql"
	"gitark/model"
	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upInit, downInit)
}

func upInit(ctx context.Context, tx *sql.Tx) error {
	// This code is executed when the migration is applied.
	return config.DB_MIGRATOR.CreateTable(&model.User{})
}

func downInit(ctx context.Context, tx *sql.Tx) error {
	// This code is executed when the migration is rolled back.
	return config.DB_MIGRATOR.DropTable(&model.User{})
}
