import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to meet the community.", "AUTHENTICATION_REQUIRED");
    const channels = await getDb().communityChannel.findMany({ where: { archivedAt: null, ...(actor.roles.includes("ADMIN") ? {} : { OR: [{ isPrivate: false }, { members: { some: { userId: actor.id } } }] }) }, orderBy: { createdAt: "asc" }, select: { id: true, slug: true, name: true, description: true, isPrivate: true, members: { where: { userId: actor.id }, select: { joinedAt: true } }, _count: { select: { messages: true, members: true } } } });
    return NextResponse.json({ channels });
  } catch (error) { return jsonError(error); }
}
