package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v4"
)

// GitAuth guards the smart-HTTP endpoints. Git clients only speak Basic auth,
// so the login JWT is used as the password. On success it passes the identity
// down as remoteUser, which is exported to the CGI process as REMOTE_USER.
func GitAuth(jwtSecret string, next func(remoteUser string) http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, password, ok := r.BasicAuth()
		if !ok {
			w.Header().Set("WWW-Authenticate", `Basic realm="gitark"`)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(password, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			w.Header().Set("WWW-Authenticate", `Basic realm="gitark"`)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// uuid claim comes back as a string after parsing, not as uuid.UUID
		userID := fmt.Sprint(claims["id"])

		// /git/<owner-id>/<repo>.git/<service>
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/git/"), "/")
		if len(parts) < 2 || parts[0] != userID {
			// do not leak whether the repo exists
			http.Error(w, "Repository not found", http.StatusNotFound)
			return
		}

		next(fmt.Sprint(claims["email"])).ServeHTTP(w, r)
	})
}
