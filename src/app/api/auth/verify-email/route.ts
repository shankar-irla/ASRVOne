import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assertSameOrigin, jsonError, readJson, HttpError } from "@/lib/http";
import { hashOpaqueToken } from "@/lib/security/tokens";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = z.object({ token: z.string().min(20).max(256) }).parse(await readJson(request));
    const db = getDb();
    const challenge = await db.authChallenge.findUnique({ where: { tokenHash: hashOpaqueToken(token) }, include: { user: { select: { id: true, status: true } } } });
    if (!challenge || challenge.purpose !== "VERIFY_EMAIL" || challenge.usedAt || challenge.expiresAt <= new Date()) {
      throw new HttpError(400, "This verification link has expired or was already used.", "INVALID_CHALLENGE");
    }
    await db.$transaction(async (tx) => {
      const consumed = await tx.authChallenge.updateMany({
        where: { id: challenge.id, purpose: "VERIFY_EMAIL", usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new HttpError(400, "This verification link has expired or was already used.", "INVALID_CHALLENGE");
      await tx.user.update({ where: { id: challenge.userId }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    });
    return NextResponse.json({ message: "Your email is verified. You can sign in now." });
  } catch (error) {
    return jsonError(error);
  }
}
