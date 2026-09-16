package config

import "github.com/spf13/viper"

type Config struct {
	PORT     string `mapstructure:"PORT"`
	DbString string `mapstructure:"DB_STRING"`
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
