package model

import "github.com/google/uuid"

type Repository struct {
	BaseModel
	Name string `json:"name"`
	CreatedBy uuid.UUID `json:"createdBy" gorm:"type:uuid;not null; index"`
	Creator   User `json:"-" gorm:"foreignKey:CreatedBy"`
}

