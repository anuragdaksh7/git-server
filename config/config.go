package config

import "github.com/spf13/viper"

type Config struct {
	PORT     string `mapstructure:"PORT"`
	DbString string `mapstructure:"DB_STRING"`
	Environment string `mapstructur:"ENVIRONMENT"`
	JwtSecret               string `mapstructure:"JWT_SECRET"`
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
