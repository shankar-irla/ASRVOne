import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to see your assignments.", "AUTHENTICATION_REQUIRED");
    const assignments = await getDb().assignment.findMany({ where: { published: true, course: { enrollments: { some: { userId: actor.id } } } }, include: { course: { select: { title: true } }, module: { select: { title: true } }, submissions: { where: { userId: actor.id }, select: { submittedAt: true, response: true, score: true, feedback: true } } }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ assignments });
  } catch (error) { return jsonError(error); }
}
