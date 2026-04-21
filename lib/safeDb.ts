import { prisma } from "./prisma";

const defaultRetries = Number(process.env.DB_OP_RETRIES || 3);
const defaultRetryDelayMs = Number(process.env.DB_OP_RETRY_DELAY_MS || 1500);

export async function safeDb<T>(
  fn: () => Promise<T>,
  retries = defaultRetries,
  retryDelayMs = defaultRetryDelayMs
): Promise<T> {
  for (let i = 0; i < retries; i += 1) {
    try {
      return await fn();
    } catch (error) {
      console.log(`[DB] retry ${i + 1}/${retries}`);

      await prisma.$disconnect().catch(() => undefined);
      await prisma.$connect().catch(() => undefined);

      if (i === retries - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error("DB operation failed");
}
