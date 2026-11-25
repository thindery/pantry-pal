import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import pool from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { buildAuthProviders } from "@/lib/auth-providers";
import { recordLoginEvent } from "@/lib/login-events";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: buildAuthProviders(),
  events: {
    async signIn({ user, account }) {
      console.log(
        `[Auth] ${user.email} signed in via ${account?.provider}`,
      );
      await recordLoginEvent({
        userId: user.id,
        method: account?.provider,
      });
    },
  },
});
