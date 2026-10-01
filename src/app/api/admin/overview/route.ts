import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requirePermission("VIEW_ANALYTICS");
    const db = getDb();
    const [users, learners, applications, pendingApplications, enrollments, upcomingSessions, resources, latestApplications] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { deletedAt: null, status: "ACTIVE", roles: { some: { role: { code: "STUDENT" } } } } }),
      db.application.count(),
      db.application.count({ where: { status: "PENDING" } }),
      db.enrollment.count(),
      db.learningSession.count({ where: { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } } }),
      db.resource.count({ where: { status: "PUBLISHED" } }),
      db.application.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { course: { select: { title: true } }, batch: { select: { title: true } } } }),
    ]);
    return NextResponse.json({ totals: { users, learners, applications, pendingApplications, enrollments, upcomingSessions, resources }, latestApplications });
  } catch (error) { return jsonError(error); }
}
