import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";

export async function enforceRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const db = getDb();
  const now = new Date();
  const resetsAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetsAt", "updatedAt")
    VALUES (${key}, 1, ${resetsAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetsAt" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${now} THEN ${resetsAt} ELSE "RateLimitBucket"."resetsAt" END,
      "updatedAt" = ${now}
    RETURNING "count"
  `;
  if ((rows[0]?.count ?? limit + 1) > limit) throw new HttpError(429, "Please wait a little before trying again.", "RATE_LIMITED");
}
