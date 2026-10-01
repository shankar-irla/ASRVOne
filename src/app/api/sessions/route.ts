import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to see your class calendar.", "AUTHENTICATION_REQUIRED");
    const sessions = await getDb().learningSession.findMany({ where: { batch: { enrollments: { some: { userId: actor.id } } }, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } }, include: { meeting: { select: { provider: true, joinUrl: true, calendarUrl: true } }, batch: { select: { title: true } }, host: { select: { profile: { select: { displayName: true } } } } }, orderBy: { startsAt: "asc" }, take: 30 });
    return NextResponse.json({ sessions });
  } catch (error) { return jsonError(error); }
}
