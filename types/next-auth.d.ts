import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: "ADMIN" | "USER";
    isFirstLogin: boolean;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "USER";
      isFirstLogin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "ADMIN" | "USER";
    isFirstLogin: boolean;
  }
}
