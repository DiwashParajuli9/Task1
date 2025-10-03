/** Trim env values so empty strings / whitespace don't disable OAuth. */
export function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function hasGoogleOAuth() {
  return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
}

export function hasGitHubOAuth() {
  return Boolean(env("GITHUB_ID") && env("GITHUB_SECRET"));
}
