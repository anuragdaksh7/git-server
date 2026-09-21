package user

import (
	"context"
	"errors"
	"fmt"
	"gitark/config"
	userDto "gitark/dto/user"
	"gitark/logger"
	"gitark/model"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type service struct {
	timeout time.Duration
	DB *gorm.DB
}

func NewService() Service {
	return  &service{
		time.Duration(20) * time.Second,
		config.DB,
	}
}

func (s *service) SignUp(c context.Context, req *userDto.SignUpReq) (*userDto.SignupRes, error) {
	if req.Name == "" || req.Email == "" || req.Password == "" || req.Username == "" {
		return nil, errors.New("invalid fields")
	}
	
	var user model.User
	s.DB.Where("email = ? OR username = ?", req.Email, req.Username).First(&user)
	if user.ID != uuid.Nil {
		logger.Logger.Error("user already exists with same email or username")
		return nil, errors.New("user already exists")
	}
	

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Logger.Error(fmt.Sprintf("Error hashing password: %s", err))
		return nil, err
	}

	user = model.User{
		Email: req.Email,
		Name: req.Name,
		Password: string(hash),
		Username: req.Username,
	}
	res := s.DB.Create(&user)
	if res.Error != nil {
		logger.Logger.Error("Error creating user: ", zap.Error(res.Error))
		return nil, res.Error
	}
	logger.Logger.Info("User created: ", zap.String("email", user.Email))
	
	go func() {
		dirpath := "/srv/git/users/"
		repoPath := filepath.Join(dirpath, user.ID.String())
		
		if err := os.MkdirAll(repoPath, 0755); err != nil {
			logger.Logger.Error(fmt.Sprintf("error creating repo directory: %s", err))
		}
		// cmd := exec.Command("git", "init", "--bare")

		// cmd.Dir = repoPath

		// err = cmd.Run()
		// if err != nil {
    		//	logger.Logger.Error(fmt.Sprintf("failed to initialize git repository: %s", err))
		//	return
		//}
	}()

	resp := &userDto.SignupRes{
		ID: user.ID,
	}

	return resp, nil
}

func  (s *service) Login(c context.Context, req *userDto.LoginReq) (*userDto.LoginRes, error) {
	if req.Email == "" || req.Password == "" {
		logger.Logger.Error("SignUpReq fields: ", zap.Any("req", req))
		return nil, errors.New("invalid fields")
	}
	_config, err := config.LoadConfig(".")
	if err != nil {
		log.Fatal(err)
	}

	var user model.User
	s.DB.First(&user, "email = ?", req.Email)

	if user.ID == uuid.Nil {
		logger.Logger.Error("User not found: ", zap.String("email", req.Email))
		return nil, errors.New("user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		logger.Logger.Error("User found: ", zap.String("email", req.Email))
		return nil, errors.New("invalid password")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.ID,
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 24 * 30).Unix(),
	})

	tokenString, err := token.SignedString([]byte(_config.JwtSecret))
	if err != nil {
		logger.Logger.Error("Error creating token: ", zap.String("token", tokenString))
		return nil, err
	}

	return &userDto.LoginRes{
		Token: tokenString,
		ID: user.ID,
		Name: user.Name,
		Email: user.Email,
	}, nil
}

func (s *service) Me(c context.Context, userId uuid.UUID) (*userDto.GetMeRes, error) {
	var user model.User

	s.DB.First(&user, "id = ?", userId)
	if user.ID == uuid.Nil {
		logger.Logger.Error("User not found: ", zap.String("email", user.Email))
		return nil, errors.New("user not found")
	}

	res := &userDto.GetMeRes{
		ID:             user.ID,
		Name:           user.Name,
		Email:          user.Email,
		Username: 	user.Username,
	}

	return res, nil
}

