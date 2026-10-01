import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to read community conversations.", "AUTHENTICATION_REQUIRED");
    const { id } = await context.params;
    const db = getDb();
    const channel = await db.communityChannel.findFirst({ where: { id, archivedAt: null }, select: { id: true, isPrivate: true, members: { where: { userId: actor.id }, select: { userId: true } } } });
    if (!channel || (channel.isPrivate && !actor.roles.includes("ADMIN") && !channel.members.length)) throw new HttpError(404, "This conversation is not available to your account.", "CHANNEL_NOT_FOUND");
    const messages = await db.message.findMany({ where: { channelId: id, deletedAt: null }, include: { sender: { include: { profile: { select: { displayName: true } } } }, reactions: { select: { userId: true, reaction: true } }, _count: { select: { replies: true } } }, orderBy: { createdAt: "desc" }, take: 80 });
    return NextResponse.json({ messages: messages.reverse().map(({ sender, ...message }) => ({ ...message, sender: { id: sender.id, name: sender.profile?.displayName || "ASRVOne learner" } })) });
  } catch (error) { return jsonError(error); }
}
