import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientAddress, HttpError, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashAddress } from "@/lib/security/tokens";

export const runtime = "nodejs";
const askSchema = z.object({ message: z.string().trim().min(2).max(4000), conversationId: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in before you ask Astra.", "AUTHENTICATION_REQUIRED");
    await enforceRateLimit(`astra:${hashAddress(actor.id)}:${hashAddress(clientAddress(request))}`, 12, 60_000);
    const { message, conversationId } = askSchema.parse(await readJson(request));
    const db = getDb();
    let conversation;
    if (conversationId) {
      conversation = await db.astraConversation.findFirst({ where: { id: conversationId, userId: actor.id } });
      if (!conversation) throw new HttpError(404, "This conversation is not part of your account.", "CONVERSATION_NOT_FOUND");
    } else {
      conversation = await db.astraConversation.create({ data: { userId: actor.id, title: message.slice(0, 120) } });
    }
    const [history, courses, sessions] = await Promise.all([
      db.astraMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.course.findMany({ where: { status: "PUBLISHED" }, include: { modules: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } } }, orderBy: { createdAt: "asc" }, take: 8 }),
      db.learningSession.findMany({ where: { batch: { enrollments: { some: { userId: actor.id } } }, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } }, include: { batch: { select: { title: true } } }, orderBy: { startsAt: "asc" }, take: 5 }),
    ]);
    await db.astraMessage.create({ data: { conversationId: conversation.id, role: "user", body: message } });
    const knowledge = [
      `Published learning paths: ${courses.map((course) => `${course.title}: ${course.summary}; modules: ${course.modules.map((item) => item.title).join(", ")}`).join(" | ") || "No courses are published yet."}`,
      `Your upcoming enrolled sessions: ${sessions.map((session) => `${session.title} (${session.batch.title}) at ${session.startsAt.toISOString()}`).join(" | ") || "No upcoming sessions are published for this account."}`,
      "Do not claim a batch date, price, guarantee, credential, or service is available unless it appears in these facts. Do not ask for passwords, payment details, or sensitive personal data. For account changes and enrollment decisions, direct the learner to an ASRVOne mentor.",
    ].join("\n");
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    let reply: string;
    let providerReady = Boolean(apiKey && model);
    if (apiKey && model) {
      const baseUrl = new URL(process.env.AI_BASE_URL || "https://api.openai.com/v1");
      if (baseUrl.protocol !== "https:" && process.env.NODE_ENV === "production") throw new HttpError(503, "Astra’s secure AI endpoint is not configured.", "AI_ENDPOINT_INVALID");
      if (baseUrl.username || baseUrl.password) throw new HttpError(503, "Astra’s AI endpoint is not configured safely.", "AI_ENDPOINT_INVALID");
      const response = await fetch(new URL("/chat/completions", `${baseUrl.toString().replace(/\/$/, "")}/`), { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0.4, max_tokens: 500, messages: [{ role: "system", content: `You are Astra, the ASRVOne learning guide. Be warm, thoughtful, and clear. Use only the verified facts below for claims about ASRVOne. For general Java and DSA questions, teach carefully and admit uncertainty. Never pretend to perform account or administrative actions.\n\n${knowledge}` }, ...history.reverse().map((entry) => ({ role: entry.role === "assistant" ? "assistant" as const : "user" as const, content: entry.body })), { role: "user", content: message }] }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: unknown } }>; error?: { message?: string } } | null;
      if (!response.ok) { console.error("Astra provider rejected a request", response.status, result?.error?.message); throw new HttpError(502, "Astra could not reach its guide just now. Try again in a moment.", "AI_PROVIDER_UNAVAILABLE"); }
      const generated = result?.choices?.[0]?.message?.content;
      if (typeof generated !== "string" || !generated.trim()) throw new HttpError(502, "Astra’s guide returned an empty answer. Try again.", "AI_EMPTY_RESPONSE");
      reply = generated.trim().slice(0, 8000);
    } else {
      const course = courses[0];
      reply = `I’m here to help, though my conversational guide has not been connected yet. Here is what I can confirm: ${course ? `${course.title} covers ${course.modules.map((item) => item.title).join(", ")}.` : "ASRVOne has not published its course details yet."} ${sessions.length ? `Your next class is ${sessions[0].title} on ${sessions[0].startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.` : "Your class calendar has no upcoming sessions right now."} For tailored guidance, ask an ASRVOne mentor. Once the administrator adds an AI provider key and model, I can converse with you directly.`;
    }
    await db.astraMessage.create({ data: { conversationId: conversation.id, role: "assistant", body: reply } });
    await db.astraConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ conversationId: conversation.id, reply, providerReady });
  } catch (error) { return jsonError(error); }
}
