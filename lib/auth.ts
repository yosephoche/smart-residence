import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isFirstLogin: user.isFirstLogin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: populate token from user
        token.id = user.id;
        token.role = user.role;
        token.isFirstLogin = user.isFirstLogin;
      } else if (token.id) {
        // Subsequent requests: refresh isFirstLogin from DB
        // so that password change takes effect without re-login
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
        });
        if (dbUser) {
          token.isFirstLogin = dbUser.isFirstLogin;
        } else {
          // User removed from DB - return clean token to force re-auth
          console.warn("[Auth] User not found in DB for token.id:", token.id);
          return {
            ...token,
            id: undefined,
            role: undefined,
            isFirstLogin: undefined,
          };
        }
      }
      return token;
    },
  },
});
