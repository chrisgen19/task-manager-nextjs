import type { NextAuthConfig } from "next-auth";

/** Lightweight auth config — safe for Edge Runtime (no DB imports) */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

      if (isOnDashboard) return isLoggedIn;
      if (isOnAuth && isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
