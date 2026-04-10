import { Role } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: Role
    }
  }
  interface User {
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
  }
}
