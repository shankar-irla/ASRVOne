import { NextResponse } from "next/server";
import { hashAddress } from "@/lib/security/tokens";
import { verifyPassword, hashPassword } from "@/lib/security/password";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientAddress, jsonError, readJson, HttpError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
const dummyPasswordHash = hashPassword("Unavailable account password used only for timing equalization.");

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = loginSchema.parse(await readJson(request));
    const addressHash = hashAddress(clientAddress(request));
    const emailHash = hashAddress(input.email);
    await enforceRateLimit(`login:${addressHash}:${emailHash}`, 8, 15 * 60 * 1000);
    const user = await getDb().user.findUnique({ where: { email: input.email }, select: { id: true, email: true, passwordHash: true, status: true, deletedAt: true } });
    const valid = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(input.password, await dummyPasswordHash);
    if (!user || !valid || user.deletedAt) throw new HttpError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    if (user.status !== "ACTIVE") throw new HttpError(403, "Verify your email before signing in.", "EMAIL_NOT_VERIFIED");
    await getDb().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    await recordAudit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, request });
    return NextResponse.json({ message: "Welcome back." });
  } catch (error) {
    return jsonError(error);
  }
}
