import { NextResponse } from "next/server";
import { RoleCode } from "@/generated/prisma/client";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to see your learning resources.", "AUTHENTICATION_REQUIRED");
    const db = getDb();
    const enrollments = await db.enrollment.findMany({ where: { userId: actor.id }, select: { courseId: true, batchId: true } });
    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const batchIds = enrollments.map((enrollment) => enrollment.batchId);
    const resources = await db.resource.findMany({
      where: { status: "PUBLISHED", ...(actor.roles.includes("ADMIN") ? {} : { OR: [
        { courseId: null, batchId: null },
        ...(courseIds.length ? [{ courseId: { in: courseIds }, batchId: null }, { courseId: { in: courseIds }, batchId: { in: batchIds } }] : []),
        ...(batchIds.length ? [{ batchId: { in: batchIds } }] : []),
        { permissions: { some: { userId: actor.id, canView: true } } },
        { permissions: { some: { roleCode: { in: actor.roles as RoleCode[] }, canView: true } } },
      ] }) },
      select: { id: true, title: true, description: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true, course: { select: { title: true } }, batch: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ resources: resources.map((resource) => ({ ...resource, sizeBytes: resource.sizeBytes.toString() })) });
  } catch (error) {
    return jsonError(error);
  }
}
