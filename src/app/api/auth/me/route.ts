import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: actor.id, email: actor.email, displayName: actor.displayName, roles: actor.roles } });
  } catch (error) {
    return jsonError(error);
  }
}
