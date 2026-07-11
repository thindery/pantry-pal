import type { NextAuthConfig } from "next-auth";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const adminEmails = getAdminEmails();
        token.isAdmin = adminEmails.includes((user.email ?? "").toLowerCase());
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const adminEmails = getAdminEmails();
        const extended = session.user as {
          id?: string;
          isAdmin?: boolean;
        };
        extended.id = (token.id as string | undefined) ?? (token.sub as string | undefined);
        extended.isAdmin =
          (token.isAdmin as boolean | undefined) ??
          adminEmails.includes((session.user.email ?? "").toLowerCase());
      }
      return session;
    },
    async signIn() {
      return true;
    },
  },
  providers: [],
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(
        `[Auth] ${user.email} signed in via ${account?.provider}${isNewUser ? " (new)" : ""}`,
      );
    },
  },
} satisfies NextAuthConfig;