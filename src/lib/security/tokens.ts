import { createHash, createHmac, randomBytes } from "node:crypto";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashAddress(value: string): string {
  const pepper = process.env.AUTH_SECRET;
  if (!pepper) throw new Error("AUTH_SECRET is not configured.");
  return createHmac("sha256", pepper).update(value).digest("hex");
}
