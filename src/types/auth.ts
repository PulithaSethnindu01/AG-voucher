import type { RoleName } from './database'

export interface AuthUser {
  id: string
  userNumber: string
  name: string
  mobileNumber: string
  isActive: boolean
  roles: RoleName[]
}

export interface LoginInput {
  userNumber: string
  password: string
}

export interface RegisterInput {
  name: string
  userNumber: string
  mobileNumber: string
  password: string
}

export interface AuthResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
