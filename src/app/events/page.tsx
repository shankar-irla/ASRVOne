import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: Awaited<ReturnType<ReturnType<typeof getDb>["event"]["findMany"]>> = [];
  try { events = await getDb().event.findMany({ where: { status: "PUBLISHED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 24 }); } catch { /* Events will load once the platform database is connected. */ }
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">ASRVONE EVENTS</p><h1>Meet the moment. <em>Meet each other.</em></h1><p className="platform-lede">Workshops, community gatherings, and learning moments appear here after the team publishes them.</p>{events.length ? events.map((event) => <article className="platform-card" key={event.id}><p className="platform-eyebrow">{event.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><h2>{event.title}</h2><p>{event.description}</p>{event.location && <p>{event.location}</p>}</article>) : <article className="platform-card"><h2>No dates announced yet.</h2><p>We’ll place the next gathering here when its time is set.</p></article>}<nav className="platform-links"><Link href="/">Back to ASRVOne</Link><Link href="/register">Join the learning community</Link></nav></section></main>;
}
