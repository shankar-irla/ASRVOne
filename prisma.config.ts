import "dotenv/config";
import { defineConfig } from "prisma/config";

const generateOnly = process.argv.includes("generate");
const databaseUrl = process.env.DATABASE_URL ?? (generateOnly ? "postgresql://user:password@localhost:5432/asrvone?schema=public" : undefined);
if (!databaseUrl) throw new Error("DATABASE_URL is required for Prisma database commands.");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
