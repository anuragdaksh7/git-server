package config

import "github.com/spf13/viper"

type Config struct {
	PORT     string `mapstructure:"PORT"`
	DbString string `mapstructure:"DB_STRING"`
	JwtSecret               string `mapstructure:"JWT_SECRET"`
	GitBinaryPath string `mapstructure:"GIT_BINARY_PATH"`
}

func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		return
	}

	err = viper.Unmarshal(&config)
	return
}
