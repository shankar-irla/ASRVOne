import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { sendTransactionalEmail } from "@/lib/email";

const reviewSchema = z.object({ id: z.string().uuid(), status: z.enum(["REVIEWING", "APPROVED", "REJECTED", "WAITLISTED", "ENROLLED"]), reviewNote: z.string().trim().max(2000).optional().default(""), batchId: z.string().uuid().nullable().optional() });

export async function GET() {
  try {
    await requirePermission("MANAGE_APPLICATIONS");
    const db = getDb();
    const [applications, batches] = await Promise.all([
      db.application.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, include: { course: { select: { title: true } }, batch: { select: { title: true, startsAt: true } } } }),
      db.batch.findMany({ where: { status: "PUBLISHED" }, orderBy: { startsAt: "asc" }, select: { id: true, title: true, startsAt: true } }),
    ]);
    return NextResponse.json({ applications, batches });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("MANAGE_APPLICATIONS");
    const input = reviewSchema.parse(await readJson(request));
    const db = getDb();
    const current = await db.application.findUnique({ where: { id: input.id } });
    if (!current) throw new HttpError(404, "That application has already left the desk.", "APPLICATION_NOT_FOUND");
    if (input.batchId) {
      const batch = await db.batch.findFirst({ where: { id: input.batchId, status: "PUBLISHED", ...(current.courseId ? { courseId: current.courseId } : {}) }, select: { id: true } });
      if (!batch) throw new HttpError(400, "Choose an available batch for this course.", "BATCH_UNAVAILABLE");
    }
    let enrollmentCreated = false;
    const application = await db.$transaction(async (tx) => {
      const batchId = input.batchId === undefined ? current.batchId : input.batchId;
      const updated = await tx.application.update({ where: { id: input.id }, data: { status: input.status, batchId, reviewNote: input.reviewNote || null, reviewedAt: new Date(), reviewedById: actor.id } });
      if (["APPROVED", "ENROLLED"].includes(input.status) && current.courseId && batchId) {
        const learner = await tx.user.findUnique({ where: { email: current.email }, select: { id: true, status: true, deletedAt: true } });
        if (learner?.status === "ACTIVE" && !learner.deletedAt) {
          await tx.enrollment.upsert({ where: { userId_batchId: { userId: learner.id, batchId } }, create: { userId: learner.id, courseId: current.courseId, batchId }, update: {} });
          await tx.application.update({ where: { id: current.id }, data: { userId: learner.id } });
          await tx.notification.create({ data: { userId: learner.id, kind: "ENROLLMENT", title: "A place has been made for you", body: "Your ASRVOne application has been accepted. Open your learning space to begin.", href: "/dashboard" } });
          enrollmentCreated = true;
        }
      }
      return updated;
    });
    const linkedUser = await db.user.findUnique({ where: { email: current.email }, select: { profile: { select: { displayName: true } } } });
    if (current.userId || linkedUser) {
      try { await sendTransactionalEmail("application_status", current.email, { name: linkedUser?.profile?.displayName || current.fullName, status: input.status, note: input.reviewNote || "Your ASRVOne account has the latest application update.", course: current.courseId || "your chosen ASRVOne learning path" }); } catch (error) { console.error("Application status email failed", input.id, error); }
    }
    await recordAudit({ actorId: actor.id, action: "application.review", entityType: "Application", entityId: application.id, request, details: { status: input.status, enrollmentCreated } });
    return NextResponse.json({ application, enrollmentCreated });
  } catch (error) { return jsonError(error); }
}
