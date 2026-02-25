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
          staffJobType: user.staffJobType ?? undefined,
          isFirstLogin: user.isFirstLogin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // Handle session.update() call — patch JWT in-place without re-auth
      if (trigger === "update" && session?.isFirstLogin !== undefined) {
        token.isFirstLogin = session.isFirstLogin;
      }
      if (user) {
        // Initial sign-in: populate token from user
        token.id = user.id;
        token.role = user.role;
        token.staffJobType = user.staffJobType ?? undefined;
        token.isFirstLogin = user.isFirstLogin;
      }
      return token;
    },
  },
});
