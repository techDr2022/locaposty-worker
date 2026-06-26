export interface RedisTarget {
  host: string;
  port: string;
  source: "REDIS_URL" | "REDIS_HOST";
}

export function getRedisTarget(): RedisTarget {
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: url.port || "6379",
        source: "REDIS_URL",
      };
    } catch {
      return { host: "invalid-REDIS_URL", port: "?", source: "REDIS_URL" };
    }
  }

  return {
    host: process.env.REDIS_HOST || "missing",
    port: process.env.REDIS_PORT || "6379",
    source: "REDIS_HOST",
  };
}

export function getDatabaseHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "missing";

  try {
    return new URL(url.replace(/^postgresql:/, "http:")).hostname;
  } catch {
    return "invalid-DATABASE_URL";
  }
}

export function logWorkerTargets(): void {
  const redis = getRedisTarget();
  console.log(
    `[worker] Config: redis=${redis.host}:${redis.port} (${redis.source}) db=${getDatabaseHost()}`,
  );
}
