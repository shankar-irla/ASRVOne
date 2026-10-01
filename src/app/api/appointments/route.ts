import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
const requestSchema = z.object({ slotId: z.string().uuid(), title: z.string().trim().min(4).max(180), notes: z.string().trim().max(2000).optional() });

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to see mentorship availability.", "AUTHENTICATION_REQUIRED");
    const [slots, appointments] = await Promise.all([
      getDb().availabilitySlot.findMany({ where: { isAvailable: true, startsAt: { gt: new Date() }, mentor: { status: "ACTIVE", mentorProfile: { visible: true } } }, include: { mentor: { include: { profile: { select: { displayName: true } }, mentorProfile: { select: { title: true } } } }, orderBy: { startsAt: "asc" }, take: 40 }),
      getDb().appointment.findMany({ where: actor.permissions.has("MANAGE_APPOINTMENTS") ? { mentorId: actor.id, startsAt: { gte: new Date() } } : { requesterId: actor.id, startsAt: { gte: new Date() } }, include: { mentor: { include: { profile: { select: { displayName: true } } } } }, orderBy: { startsAt: "asc" }, take: 20 }),
    ]);
    return NextResponse.json({ slots: slots.map((slot) => ({ id: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt, appointmentType: slot.appointmentType, mentorName: slot.mentor.profile?.displayName || "ASRVOne mentor", mentorTitle: slot.mentor.mentorProfile?.title || "Mentor" })), appointments: appointments.map((item) => ({ id: item.id, title: item.title, notes: item.notes, startsAt: item.startsAt, endsAt: item.endsAt, status: item.status, meetUrl: item.meetUrl, mentor: item.mentor.profile?.displayName || "ASRVOne mentor" })) });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to ask for a mentor conversation.", "AUTHENTICATION_REQUIRED");
    const input = requestSchema.parse(await readJson(request));
    if (actor.permissions.has("MANAGE_APPOINTMENTS")) throw new HttpError(403, "Mentors cannot request a session with themselves.", "MENTOR_CANNOT_REQUEST");
    const db = getDb();
    const slot = await db.availabilitySlot.findFirst({ where: { id: input.slotId, isAvailable: true, startsAt: { gt: new Date() }, mentor: { status: "ACTIVE", mentorProfile: { visible: true } } }, select: { id: true, mentorId: true, startsAt: true, endsAt: true } });
    if (!slot) throw new HttpError(409, "That time has just been taken. Choose another opening.", "SLOT_UNAVAILABLE");
    const appointment = await db.$transaction(async (tx) => {
      const reserved = await tx.availabilitySlot.updateMany({ where: { id: slot.id, isAvailable: true }, data: { isAvailable: false } });
      if (reserved.count !== 1) throw new HttpError(409, "That time has just been taken. Choose another opening.", "SLOT_UNAVAILABLE");
      const created = await tx.appointment.create({ data: { requesterId: actor.id, mentorId: slot.mentorId, slotId: slot.id, title: input.title, notes: input.notes || null, startsAt: slot.startsAt, endsAt: slot.endsAt, status: "REQUESTED" } });
      await tx.notification.create({ data: { userId: slot.mentorId, kind: "APPOINTMENT", title: "A learner asked for your time", body: `${actor.displayName} requested a mentorship conversation.`, href: "/appointments" } });
      return created;
    });
    return NextResponse.json({ id: appointment.id, status: appointment.status, message: "Your request is with the mentor. We’ll let you know when they answer." }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
