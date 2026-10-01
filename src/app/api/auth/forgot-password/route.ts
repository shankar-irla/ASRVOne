import { NextResponse } from "next/server";
import { z } from "zod";
import { createOpaqueToken, hashAddress, hashOpaqueToken } from "@/lib/security/tokens";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientAddress, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const email = z.string().trim().toLowerCase().email().max(254).parse((await readJson(request) as { email?: unknown }).email);
    await enforceRateLimit(`password-reset:${hashAddress(clientAddress(request))}:${hashAddress(email)}`, 4, 60 * 60 * 1000);
    const user = await getDb().user.findUnique({ where: { email }, include: { profile: true } });
    if (user && user.status === "ACTIVE" && !user.deletedAt) {
      const token = createOpaqueToken();
      await getDb().authChallenge.create({ data: { userId: user.id, tokenHash: hashOpaqueToken(token), purpose: "RESET_PASSWORD", expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      const link = new URL(`/reset-password?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL || request.url).toString();
      await sendTransactionalEmail("reset_password", email, { name: user.profile?.displayName || email, link });
    }
    return NextResponse.json({ message: "If the address belongs to an active account, a password reset link is on its way." });
  } catch (error) {
    return jsonError(error);
  }
}
