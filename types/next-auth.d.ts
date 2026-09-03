import { Role } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: Role
      mustChangePassword: boolean
    }
  }
  interface User {
    role: Role
    name?: string | null
    mustChangePassword?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    name?: string | null
    mustChangePassword?: boolean
  }
}
