package middleware

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

		claims, _ := token.Claims.(jwt.MapClaims)
		userID := fmt.Sprint(claims["id"])

		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/git/"), "/")
		if len(parts) < 2  || parts[0] != userID {
			http.Error(w, "Repository not found", http.StatusNotFound)
			return
		}
		next(fmt.Sprint(claims["email"])).ServeHTTP(w, r)
	})
}
