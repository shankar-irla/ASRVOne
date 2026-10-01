import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assertSameOrigin, jsonError, readJson, HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/security/password";
import { hashOpaqueToken } from "@/lib/security/tokens";
import { passwordSchema } from "@/lib/validation";

const resetSchema = z.object({ token: z.string().min(20).max(256), password: passwordSchema });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { token, password } = resetSchema.parse(await readJson(request));
    const db = getDb();
    const challenge = await db.authChallenge.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
    if (!challenge || challenge.purpose !== "RESET_PASSWORD" || challenge.usedAt || challenge.expiresAt <= new Date()) {
      throw new HttpError(400, "This reset link has expired or was already used.", "INVALID_CHALLENGE");
    }
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const consumed = await tx.authChallenge.updateMany({
        where: { id: challenge.id, purpose: "RESET_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new HttpError(400, "This reset link has expired or was already used.", "INVALID_CHALLENGE");
      await tx.user.update({ where: { id: challenge.userId }, data: { passwordHash } });
      await tx.authSession.deleteMany({ where: { userId: challenge.userId } });
    });
    return NextResponse.json({ message: "Your password has been changed. Sign in with the new one." });
  } catch (error) {
    return jsonError(error);
  }
}
