export interface SignUpReq {
  name: string
  username: string
  email: string
  password: string
}

export interface SignUpRes {
  id: string
}

export interface LoginReq {
  email: string
  password: string
}

export interface LoginRes {
  user: {
    token: string
    id: string
    name: string
    email: string
    username: string
  }
}

export interface Me {
  id: string
  name: string
  email: string
  username: string
}

export interface CreateRepoReq {
  name: string
}

export interface Repo {
  id: string
  name: string
  createdAt: string
}
