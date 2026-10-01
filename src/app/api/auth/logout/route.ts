import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/http";
import { deleteCurrentSession, getActor } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await deleteCurrentSession();
    return NextResponse.json({ message: "You are signed out." });
  } catch (error) {
    return jsonError(error);
  }
}
