import { get, post, setToken } from './client'
import type { CreateRepoReq, LoginReq, LoginRes, Me, Repo, SignUpReq, SignUpRes } from './types'

export { ApiError } from './client'
export type * from './types'

export const api = {
  signUp: (req: SignUpReq) => post<SignUpRes>('/user/create', req),
  login: async (req: LoginReq) => {
    const res = await post<LoginRes>('/user/login', req)
    setToken(res.user.token)
    return res
  },
  me: () => get<Me>('/user/me'),
  createRepo: (req: CreateRepoReq) => post<Repo>('/repo/create', req),
  listRepos: () => get<Repo[]>('/repo/list'),
}
