import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const sessions = await getDb().learningSession.findMany({ where: { batch: { enrollments: { some: { userId: actor.id } } }, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } }, include: { meeting: true, batch: { select: { title: true } }, host: { select: { profile: { select: { displayName: true } } } } }, orderBy: { startsAt: "asc" }, take: 30 });
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">ASRVONE LIVE · YOUR CLASSROOM</p><h1>Make room for <em>the next question.</em></h1><p className="platform-lede">Your enrolled sessions and their private meeting links live here.</p>{sessions.length ? sessions.map((session) => <article className="platform-card" key={session.id}><p className="platform-eyebrow">{session.batch.title} · {session.status}</p><h2>{session.title}</h2><p>{session.description}</p><p>{session.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} — {session.endsAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><p>Mentor: {session.host.profile?.displayName || "ASRVOne mentor"}</p>{session.meeting?.joinUrl && <a className="platform-button" href={session.meeting.joinUrl} target="_blank" rel="noreferrer">Join session ↗</a>}</article>) : <article className="platform-card"><h2>The calendar has room.</h2><p>Your next class will appear here when ASRVOne schedules a session for your batch.</p><Link href="/appointments" className="platform-button">Ask for a mentor conversation ↗</Link></article>}<nav className="platform-links"><Link href="/dashboard">Learner space</Link><Link href="/">Home</Link></nav></section></main>;
}
