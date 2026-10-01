import { NextResponse } from "next/server";
import { z } from "zod";
import { createOpaqueToken, hashAddress, hashOpaqueToken } from "@/lib/security/tokens";
import { hashPassword } from "@/lib/security/password";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientAddress, jsonError, readJson, HttpError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/email";
import { registerAccountSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(`account-register:${hashAddress(clientAddress(request))}`, 6, 60 * 60 * 1000);
    const input = registerAccountSchema.parse(await readJson(request));
    const db = getDb();
    const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true, status: true } });

    if (existing) {
      if (existing.status === "PENDING_VERIFICATION") {
        const token = createOpaqueToken();
        await db.authChallenge.create({ data: { userId: existing.id, tokenHash: hashOpaqueToken(token), purpose: "VERIFY_EMAIL", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
        const link = new URL(`/verify-email?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL || request.url).toString();
        await sendTransactionalEmail("verify_email", input.email, { name: input.displayName, link });
      }
      return NextResponse.json({ status: "verification_required", message: "If that address can be registered, a verification link is on its way." }, { status: 202 });
    }

    const role = await db.role.findUnique({ where: { code: "STUDENT" }, select: { id: true } });
    if (!role) throw new HttpError(503, "Account setup is not complete yet.", "PLATFORM_NOT_INITIALIZED");
    const passwordHash = await hashPassword(input.password);
    const token = createOpaqueToken();
    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        status: "PENDING_VERIFICATION",
        profile: { create: { displayName: input.displayName, college: input.college } },
        roles: { create: { roleId: role.id } },
        challenges: { create: { tokenHash: hashOpaqueToken(token), purpose: "VERIFY_EMAIL", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
      },
      select: { id: true },
    });
    const link = new URL(`/verify-email?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL || request.url).toString();
    const email = await sendTransactionalEmail("verify_email", input.email, { name: input.displayName, link });
    if (email.provider === "not_configured") {
      return NextResponse.json({ status: "verification_pending", message: "Your account is saved, but email verification is not configured. Ask ASRVOne to enable email delivery." }, { status: 202 });
    }
    return NextResponse.json({
      status: "verification_required",
      message: "Check your inbox for a link to verify your email.",
      ...(email.provider === "console" ? { developmentLink: link } : {}),
      userId: process.env.NODE_ENV === "development" ? user.id : undefined,
    }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
