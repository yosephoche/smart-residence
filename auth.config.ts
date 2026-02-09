import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      // Type guard: ensure token has required properties
      if (!token.id || !token.role || token.isFirstLogin === undefined) {
        throw new Error("Invalid session token: missing required properties");
      }

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.isFirstLogin = token.isFirstLogin;
      return session;
    },
    authorized({ request: { nextUrl }, auth: session }) {
      const isLoggedIn = !!(session?.user?.id);
      const isOnLoginPage = nextUrl.pathname === "/login";

      if (isOnLoginPage) {
        if (!isLoggedIn) return true;
        // Logged-in user on /login — send directly to their dashboard
        const u = session.user as { role?: string; isFirstLogin?: boolean };
        if (u.isFirstLogin) {
          return Response.redirect(new URL("/change-password", nextUrl));
        }
        const dest = u.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
        return Response.redirect(new URL(dest, nextUrl));
      }

      // API routes handle their own auth — never redirect them
      if (nextUrl.pathname.startsWith("/api")) {
        return isLoggedIn;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      const user = session.user as { role?: string; isFirstLogin?: boolean };

      // Force password change on first login
      if (user.isFirstLogin && nextUrl.pathname !== "/change-password") {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

      // If already changed password, don't allow access to change-password
      if (!user.isFirstLogin && nextUrl.pathname === "/change-password") {
        const dest = user.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
        return Response.redirect(new URL(dest, nextUrl));
      }

      // Role-based routing
      if (nextUrl.pathname.startsWith("/admin") && user.role !== "ADMIN") {
        return Response.redirect(new URL("/user/dashboard", nextUrl));
      }

      if (nextUrl.pathname.startsWith("/user") && user.role !== "USER") {
        return Response.redirect(new URL("/admin/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
