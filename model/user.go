package model

type User struct {
	BaseModel
	Name string
	Email string `gorm:"UniqueIndex"`
	Password string
	Username string `gorm:"UniqueIndex"`
}

