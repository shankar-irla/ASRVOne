import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";

const slotSchema = z.object({ mentorId: z.string().uuid().optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), appointmentType: z.string().trim().min(2).max(80) });

export async function GET() {
  try {
    const actor = await requirePermission("MANAGE_APPOINTMENTS");
    const slots = await getDb().availabilitySlot.findMany({ where: { mentorId: actor.id }, orderBy: { startsAt: "asc" }, take: 100 });
    return NextResponse.json({ slots });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("MANAGE_APPOINTMENTS");
    const input = slotSchema.parse(await readJson(request));
    const startsAt = new Date(input.startsAt); const endsAt = new Date(input.endsAt);
    if (startsAt <= new Date() || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 4 * 60 * 60 * 1000) throw new HttpError(400, "Choose a future time no longer than four hours.", "INVALID_AVAILABILITY");
    const mentorId = actor.roles.includes("ADMIN") && input.mentorId ? input.mentorId : actor.id;
    if (actor.roles.includes("ADMIN") && input.mentorId) {
      const mentor = await getDb().user.findFirst({ where: { id: mentorId, status: "ACTIVE", roles: { some: { role: { code: "MENTOR" } } } }, select: { id: true } });
      if (!mentor) throw new HttpError(404, "That active mentor account could not be found.", "MENTOR_NOT_FOUND");
    }
    const overlap = await getDb().availabilitySlot.findFirst({ where: { mentorId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (overlap) throw new HttpError(409, "These hours overlap another slot on this mentor’s calendar.", "AVAILABILITY_OVERLAP");
    const slot = await getDb().availabilitySlot.create({ data: { mentorId, startsAt, endsAt, appointmentType: input.appointmentType } });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
