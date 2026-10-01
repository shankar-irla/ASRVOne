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
    await enforceRateLimit(`resend:${hashAddress(clientAddress(request))}:${hashAddress(email)}`, 4, 60 * 60 * 1000);
    const user = await getDb().user.findUnique({ where: { email }, include: { profile: true } });
    if (user && user.status === "PENDING_VERIFICATION") {
      const token = createOpaqueToken();
      await getDb().authChallenge.create({ data: { userId: user.id, tokenHash: hashOpaqueToken(token), purpose: "VERIFY_EMAIL", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      const link = new URL(`/verify-email?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL || request.url).toString();
      await sendTransactionalEmail("verify_email", email, { name: user.profile?.displayName || email, link });
    }
    return NextResponse.json({ message: "If the account still needs verification, a fresh link is on its way." });
  } catch (error) {
    return jsonError(error);
  }
}
