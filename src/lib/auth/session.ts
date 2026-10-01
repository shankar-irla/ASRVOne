import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/security/tokens";

export const sessionCookieName = process.env.SESSION_COOKIE_NAME || "asrvone_session";
const sessionDurationSeconds = Math.max(3600, Number(process.env.SESSION_TTL_DAYS || 7) * 24 * 60 * 60);

export type Actor = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: Set<string>;
};

export async function createSession(userId: string): Promise<void> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);
  await getDb().authSession.create({ data: { userId, tokenHash: hashOpaqueToken(token), expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) await getDb().authSession.deleteMany({ where: { tokenHash: hashOpaqueToken(token) } });
  cookieStore.delete(sessionCookieName);
}

export async function findActorByToken(token: string | undefined): Promise<Actor | null> {
  if (!token || token.length > 256) return null;
  const session = await getDb().authSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      user: {
        include: {
          profile: true,
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      },
    },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  if (session.user.status !== "ACTIVE" || session.user.deletedAt) return null;
  const permissions = session.user.roles.flatMap((userRole) => userRole.role.permissions.map((entry) => entry.permission.code));
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.profile?.displayName ?? session.user.email,
    roles: session.user.roles.map((userRole) => userRole.role.code),
    permissions: new Set(permissions),
  };
}

export async function getActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const actor = await findActorByToken(token);
  if (!actor || !token) return null;
  const session = await getDb().authSession.findUnique({ where: { tokenHash: hashOpaqueToken(token) }, select: { id: true, lastSeenAt: true } });
  if (session && Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await getDb().authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return actor;
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new HttpError(401, "Sign in to continue.", "AUTHENTICATION_REQUIRED");
  return actor;
}

export async function requirePermission(permission: string): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.permissions.has(permission)) throw new HttpError(403, "You do not have permission to do that.", "FORBIDDEN");
  return actor;
}
