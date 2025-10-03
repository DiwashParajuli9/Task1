import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { env, hasGitHubOAuth, hasGoogleOAuth } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ensureModelSettings, isValidObjectId } from "@/lib/user-settings";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasGoogleOAuth()
      ? [
          GoogleProvider({
            clientId: env("GOOGLE_CLIENT_ID")!,
            clientSecret: env("GOOGLE_CLIENT_SECRET")!,
          }),
        ]
      : []),
    ...(hasGitHubOAuth()
      ? [
          GitHubProvider({
            clientId: env("GITHUB_ID")!,
            clientSecret: env("GITHUB_SECRET")!,
          }),
        ]
      : []),
  ],
  events: {
    async createUser({ user }) {
      if (user.id && isValidObjectId(user.id)) {
        await ensureModelSettings(user.id);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id && isValidObjectId(user.id)) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && isValidObjectId(token.sub)) {
        session.user.id = token.sub;
        await ensureModelSettings(token.sub);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getSession() {
  return getServerSession(authOptions);
}
