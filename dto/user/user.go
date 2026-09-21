package userDto

import "github.com/google/uuid"

type SignUpReq struct {
	Name string `json:"name"`
	Username string `json:"username"`
	Email string `json:"email"`
	Password string `json:"password"`
}

type SignupRes struct {
	ID uuid.UUID `json:"id"`
}

type LoginReq struct {
	Email string `json:"email"`
	Password string `json:"password"`
}

type LoginRes struct {
	Token          string    `json:"token"`
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Username string `json:"username"`
}

type GetMeRes struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Username	string `json:"username"`
	ProfilePicture string    `json:"profilePicture"`
	Role           string    `json:"role"`
}


