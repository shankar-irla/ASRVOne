import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to see your learning space.", "AUTHENTICATION_REQUIRED");
    const db = getDb();
    const now = new Date();
    const [enrollments, applications, sessions, assignments, notifications] = await Promise.all([
      db.enrollment.findMany({ where: { userId: actor.id }, include: { course: { include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { where: { published: true }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, summary: true, durationMins: true, sortOrder: true } } } } }, batch: true, progress: { select: { lessonId: true, completedAt: true, score: true } } }, orderBy: { enrolledAt: "desc" } }),
      db.application.findMany({ where: { OR: [{ userId: actor.id }, { email: actor.email }] }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, createdAt: true, reviewNote: true, course: { select: { title: true } }, batch: { select: { title: true, startsAt: true } } } }),
      db.learningSession.findMany({ where: { batch: { enrollments: { some: { userId: actor.id } } }, startsAt: { gte: now }, status: { in: ["SCHEDULED", "LIVE"] } }, include: { meeting: true, batch: { select: { title: true } } }, orderBy: { startsAt: "asc" }, take: 8 }),
      db.assignment.findMany({ where: { published: true, course: { enrollments: { some: { userId: actor.id } } } }, include: { submissions: { where: { userId: actor.id }, select: { submittedAt: true, score: true, feedback: true } }, module: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    ]);
    return NextResponse.json({ user: { name: actor.displayName, email: actor.email, roles: actor.roles }, enrollments, applications, sessions, assignments, notifications });
  } catch (error) {
    return jsonError(error);
  }
}
