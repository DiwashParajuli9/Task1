const memoryStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

export async function rateLimit(userId: string): Promise<{
  success: boolean;
  remaining: number;
}> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const ratelimit = new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "ai-chat",
      });
      const result = await ratelimit.limit(userId);
      return { success: result.success, remaining: result.remaining };
    } catch {
      // fall through to memory limiter
    }
  }

  const now = Date.now();
  const entry = memoryStore.get(userId);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: MAX_REQUESTS - entry.count };
}
