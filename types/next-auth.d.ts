import { Role } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: Role
      mustChangePassword: boolean
    }
  }
  interface User {
    role: Role
    mustChangePassword?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    mustChangePassword?: boolean
  }
}
