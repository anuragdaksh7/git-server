package user

import (
	"context"
	userDto "gitark/dto/user"
	"github.com/google/uuid"
)

type Service interface {
	SignUp(c context.Context, req *userDto.SignUpReq) (*userDto.SignupRes, error)
	Login(c context.Context, req *userDto.LoginReq) (*userDto.LoginRes, error)
	Me(c context.Context, userId uuid.UUID) (*userDto.GetMeRes, error)
}

