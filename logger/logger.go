package logger

import (
	"gitark/config"

	"go.uber.org/zap"
)

var Logger *zap.Logger

func InitLogger(config config.Config) {
devLogger, _ := zap.NewDevelopment()
	Logger = devLogger
}
