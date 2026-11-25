import type { NextAuthConfig } from "next-auth";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
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
        const adminUserIds = getAdminUserIds();
        const email = (user.email ?? "").trim().toLowerCase();
        const userId = user.id ? String(user.id).trim() : "";
        token.isAdmin =
          (!!email && adminEmails.includes(email)) ||
          (!!userId && adminUserIds.includes(userId));
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const adminEmails = getAdminEmails();
        const adminUserIds = getAdminUserIds();
        const extended = session.user as {
          id?: string;
          isAdmin?: boolean;
        };
        const userId = (
          (token.id as string | undefined) ?? (token.sub as string | undefined)
        )?.trim();
        extended.id = userId;
        const email = (session.user.email ?? "").trim().toLowerCase();
        // PP-128: Align session isAdmin with backend is_admin_user:
        // user is admin if verified email is in ADMIN_EMAILS or user id is in ADMIN_USER_IDS
        extended.isAdmin =
          (token.isAdmin as boolean | undefined) ??
          ((!!email && adminEmails.includes(email)) ||
            (!!userId && adminUserIds.includes(userId)));
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