package migrations

import (
	"context"
	"database/sql"
	"gitark/config"
	"gitark/model"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAddsRepository, downAddsRepository)
}

func upAddsRepository(ctx context.Context, tx *sql.Tx) error {
	// This code is executed when the migration is applied.
	return config.DB_MIGRATOR.CreateTable(&model.Repository{})
}

func downAddsRepository(ctx context.Context, tx *sql.Tx) error {
	// This code is executed when the migration is rolled back.
	return config.DB_MIGRATOR.DropTable(&model.Repository{})
}
