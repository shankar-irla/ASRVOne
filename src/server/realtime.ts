import "dotenv/config";
import { createServer } from "node:http";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { hashOpaqueToken } from "../lib/security/tokens";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const allowedOrigins = (process.env.REALTIME_ORIGIN || "http://localhost:3000").split(",").map((item) => item.trim()).filter(Boolean);
const cookieName = process.env.SESSION_COOKIE_NAME || "asrvone_session";
const httpServer = createServer((request, response) => {
  if (request.url === "/healthz") { response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ ok: true, service: "asrvone-realtime" })); return; }
  response.writeHead(404); response.end();
});
const io = new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true }, maxHttpBufferSize: 16_384, transports: ["websocket", "polling"], pingInterval: 25_000, pingTimeout: 20_000 });

function readCookie(header: string | undefined, name: string): string | undefined {
  const item = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

type Actor = { id: string; name: string; roles: string[] };

async function actorFor(socket: Socket): Promise<Actor | null> {
  const token = readCookie(socket.handshake.headers.cookie, cookieName);
  if (!token || token.length > 256) return null;
  const session = await database.authSession.findUnique({ where: { tokenHash: hashOpaqueToken(token) }, include: { user: { include: { profile: true, roles: { include: { role: true } } } } } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE" || session.user.deletedAt) return null;
  return { id: session.user.id, name: session.user.profile?.displayName || "ASRVOne learner", roles: session.user.roles.map((entry) => entry.role.code) };
}

io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) { next(new Error("This connection origin is not allowed.")); return; }
  actorFor(socket).then((actor) => {
    if (!actor) { next(new Error("Sign in to join the ASRVOne community.")); return; }
    socket.data.actor = actor;
    next();
  }).catch(() => next(new Error("The community could not verify this account.")));
});

async function canReadChannel(actor: Actor, channelId: string) {
  const channel = await database.communityChannel.findFirst({ where: { id: channelId, archivedAt: null }, select: { id: true, isPrivate: true } });
  if (!channel) return false;
  if (!channel.isPrivate || actor.roles.includes("ADMIN")) return true;
  return Boolean(await database.channelMember.findUnique({ where: { channelId_userId: { channelId, userId: actor.id } }, select: { userId: true } }));
}

io.on("connection", (socket) => {
  const actor = socket.data.actor as Actor;
  socket.on("channel:join", async (payload: unknown, acknowledge?: (response: unknown) => void) => {
    const channelId = z.object({ channelId: z.string().uuid() }).safeParse(payload);
    if (!channelId.success || !(await canReadChannel(actor, channelId.data.channelId))) { acknowledge?.({ ok: false, error: "This room is not open to your account." }); return; }
    await socket.join(channelId.data.channelId);
    acknowledge?.({ ok: true });
  });
  socket.on("channel:leave", (payload: unknown) => {
    const parsed = z.object({ channelId: z.string().uuid() }).safeParse(payload);
    if (parsed.success) void socket.leave(parsed.data.channelId);
  });
  socket.on("message:send", async (payload: unknown, acknowledge?: (response: unknown) => void) => {
    const parsed = z.object({ channelId: z.string().uuid(), body: z.string().trim().min(1).max(5000) }).safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Write a note of 1 to 5,000 characters." }); return; }
    const { channelId, body } = parsed.data;
    if (!(await canReadChannel(actor, channelId))) { acknowledge?.({ ok: false, error: "This room is not open to your account." }); return; }
    try {
      const now = new Date();
      const reset = new Date(now.getTime() + 10_000);
      const rows = await database.$queryRaw<Array<{ count: number }>>`
        INSERT INTO "RateLimitBucket" ("key", "count", "resetsAt", "updatedAt") VALUES (${`community:${actor.id}`}, 1, ${reset}, ${now})
        ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetsAt" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${now} THEN ${reset} ELSE "RateLimitBucket"."resetsAt" END,
        "updatedAt" = ${now} RETURNING "count"
      `;
      if ((rows[0]?.count ?? 13) > 12) { acknowledge?.({ ok: false, error: "Give the room a moment before sending another note." }); return; }
      const entry = await database.message.create({ data: { channelId, senderId: actor.id, body }, include: { reactions: { select: { userId: true, reaction: true } } } });
      const message = { id: entry.id, body: entry.body, createdAt: entry.createdAt.toISOString(), sender: { id: actor.id, name: actor.name }, reactions: entry.reactions };
      io.to(channelId).emit("message:new", message);
      acknowledge?.({ ok: true, message });
    } catch { acknowledge?.({ ok: false, error: "The room could not keep that note just now." }); }
  });
  socket.on("message:typing", async (payload: unknown) => {
    const parsed = z.object({ channelId: z.string().uuid(), active: z.boolean() }).safeParse(payload);
    if (parsed.success && await canReadChannel(actor, parsed.data.channelId)) socket.to(parsed.data.channelId).emit("message:typing", { user: actor.name, active: parsed.data.active });
  });
});

const port = Math.max(1, Number(process.env.REALTIME_PORT || 4180));
httpServer.listen(port, "0.0.0.0", () => console.info(`ASRVOne realtime is listening on ${port}.`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { io.close(); void database.$disconnect().finally(() => process.exit(0)); });
