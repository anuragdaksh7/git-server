package config

func SyncDB() {
	err := DB.AutoMigrate()
	if err != nil {
		return
	}
}

