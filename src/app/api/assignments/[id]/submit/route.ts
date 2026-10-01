import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { recordAudit } from "@/lib/audit";

const submissionSchema = z.object({ response: z.string().trim().min(1).max(20000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in before you submit your work.", "AUTHENTICATION_REQUIRED");
    const { id } = await context.params;
    const { response } = submissionSchema.parse(await readJson(request));
    const db = getDb();
    const assignment = await db.assignment.findFirst({ where: { id, published: true, course: { enrollments: { some: { userId: actor.id } } } }, select: { id: true, dueAt: true } });
    if (!assignment) throw new HttpError(404, "This assignment is not in your learning path.", "ASSIGNMENT_NOT_FOUND");
    if (assignment.dueAt && assignment.dueAt < new Date()) throw new HttpError(409, "The submission window for this assignment has closed.", "SUBMISSION_CLOSED");
    const submission = await db.assignmentSubmission.upsert({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: actor.id } }, create: { assignmentId: assignment.id, userId: actor.id, response }, update: { response, submittedAt: new Date(), score: null, feedback: null } });
    await recordAudit({ actorId: actor.id, action: "assignment.submit", entityType: "Assignment", entityId: assignment.id, request });
    return NextResponse.json({ submittedAt: submission.submittedAt, message: "Your work is with your mentor now." });
  } catch (error) { return jsonError(error); }
}
