import { Bot } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { hasGitHubOAuth, hasGoogleOAuth } from "@/lib/env";
import { LoginButtons } from "@/components/auth/login-buttons";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { error } = await searchParams;
  const hasGoogle = hasGoogleOAuth();
  const hasGitHub = hasGitHubOAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">AI Chat</h1>
          <p className="mt-2 text-zinc-500">
            Sign in to start chatting with your AI assistant
          </p>
        </div>
        <LoginButtons hasGoogle={hasGoogle} hasGitHub={hasGitHub} />
        {error && (
          <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-center text-sm text-red-300">
            Sign-in failed. Please try again. If it keeps happening, clear cookies
            for localhost and retry.
          </p>
        )}
        {!hasGoogle && !hasGitHub && (
          <p className="mt-4 text-center text-sm text-amber-500/90">
            Configure GOOGLE_* or GITHUB_* OAuth credentials in your .env file.
          </p>
        )}
      </div>
    </div>
  );
}
