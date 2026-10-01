import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { HttpError, jsonError, assertSameOrigin, readJson } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { createGoogleCalendarMeeting } from "@/lib/google-calendar";

export const runtime = "nodejs";
const statusSchema = z.object({ status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to manage this mentorship request.", "AUTHENTICATION_REQUIRED");
    const { id } = await context.params;
    const { status } = statusSchema.parse(await readJson(request));
    const db = getDb();
    const current = await db.appointment.findUnique({ where: { id }, include: { requester: { include: { profile: true } }, mentor: { include: { profile: true } } } });
    if (!current) throw new HttpError(404, "This mentorship request could not be found.", "APPOINTMENT_NOT_FOUND");
    const canManage = actor.permissions.has("MANAGE_APPOINTMENTS") && (actor.roles.includes("ADMIN") || current.mentorId === actor.id);
    const canCancel = current.requesterId === actor.id && status === "CANCELLED";
    if (!canManage && !canCancel) throw new HttpError(403, "You cannot change this mentorship request.", "FORBIDDEN");
    let meeting: Awaited<ReturnType<typeof createGoogleCalendarMeeting>> = null;
    if (status === "CONFIRMED") {
      meeting = await createGoogleCalendarMeeting({ title: current.title, description: current.notes || "ASRVOne mentor and learner conversation.", startsAt: current.startsAt, endsAt: current.endsAt, attendees: [current.requester.email, current.mentor.email] });
    }
    const appointment = await db.$transaction(async (tx) => {
      const updated = await tx.appointment.update({ where: { id }, data: { status, cancelledAt: status === "CANCELLED" ? new Date() : null, providerEventId: meeting?.eventId, meetUrl: meeting?.meetUrl }, include: { requester: { include: { profile: true } } } });
      if (status === "CANCELLED" && current.slotId && current.startsAt > new Date()) await tx.availabilitySlot.update({ where: { id: current.slotId }, data: { isAvailable: true } });
      await tx.notification.create({ data: { userId: current.requesterId, kind: "APPOINTMENT", title: status === "CONFIRMED" ? "Your mentor has made room for you" : `Mentorship request ${status.toLowerCase()}`, body: status === "CONFIRMED" ? "Your conversation is confirmed. Open appointments for the details." : `Your mentorship request is now ${status.toLowerCase()}.`, href: "/appointments" } });
      return updated;
    });
    if (status === "CONFIRMED") {
      try { await sendTransactionalEmail("appointment_confirmed", current.requester.email, { name: current.requester.profile?.displayName || current.requester.email, startsAt: current.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), meetUrl: meeting?.meetUrl || "Your mentor will share the meeting details." }); } catch (error) { console.error("Appointment confirmation email failed", id, error); }
    }
    await recordAudit({ actorId: actor.id, action: `appointment.${status.toLowerCase()}`, entityType: "Appointment", entityId: appointment.id, request });
    return NextResponse.json({ status: appointment.status, meetUrl: appointment.meetUrl, calendarConnected: Boolean(meeting), message: meeting ? "The time is confirmed; a meeting link is ready." : status === "CONFIRMED" ? "The request is confirmed. Calendar and meeting credentials are not configured, so your mentor will share the meeting details." : `Your request is ${status.toLowerCase()}.` });
  } catch (error) { return jsonError(error); }
}
