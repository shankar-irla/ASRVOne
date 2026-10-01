import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { asrvonePrisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (globalForPrisma.asrvonePrisma) return globalForPrisma.asrvonePrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.asrvonePrisma = client;
  return client;
}
