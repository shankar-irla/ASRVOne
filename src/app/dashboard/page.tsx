import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const db = getDb();
  const [enrollments, applications, sessions, pendingAssignments] = await Promise.all([
    db.enrollment.findMany({ where: { userId: actor.id }, include: { course: { select: { title: true } }, batch: { select: { title: true, startsAt: true } }, progress: { where: { completedAt: { not: null } }, select: { id: true } } }, orderBy: { enrolledAt: "desc" } }),
    db.application.findMany({ where: { OR: [{ userId: actor.id }, { email: actor.email }] }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, createdAt: true, course: { select: { title: true } }, reviewNote: true } }),
    db.learningSession.findMany({ where: { batch: { enrollments: { some: { userId: actor.id } } }, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } }, include: { meeting: true, batch: { select: { title: true } } }, orderBy: { startsAt: "asc" }, take: 4 }),
    db.assignment.count({ where: { published: true, course: { enrollments: { some: { userId: actor.id } } }, submissions: { none: { userId: actor.id } } } }),
  ]);
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">YOUR PLACE IN THE STORY</p><h1>Welcome back, <em>{actor.displayName.split(" ")[0]}.</em></h1><p className="platform-lede">A little progress is still progress. Here’s what’s ready for you.</p>
    <div className="dashboard-grid"><article className="dashboard-tile"><h2>Your courses</h2><p>{enrollments.length ? `${enrollments.length} active learning path${enrollments.length === 1 ? "" : "s"}` : "Your first learning path will appear here after enrollment."}</p><Link href="/learn">Explore the academy ↗</Link></article><article className="dashboard-tile"><h2>Next sessions</h2><p>{sessions.length ? `${sessions.length} scheduled session${sessions.length === 1 ? "" : "s"}` : "The next class will find its place here."}</p><Link href="/live">Open your calendar ↗</Link></article><article className="dashboard-tile"><h2>Practice waiting</h2><p>{pendingAssignments} assignment{pendingAssignments === 1 ? "" : "s"} ready for your answer.</p><Link href="/dashboard/assignments">See assignments ↗</Link></article><article className="dashboard-tile"><h2>Your resources</h2><p>Notes, recordings, and useful details, kept close.</p><Link href="/resources">Open resources ↗</Link></article><article className="dashboard-tile"><h2>Community</h2><p>Good questions get better when they meet good people.</p><Link href="/community">Visit the community ↗</Link></article><article className="dashboard-tile"><h2>Astra</h2><p>Bring a question about your published learning path.</p><Link href="/astra">Ask Astra ↗</Link></article></div>
    <h2 className="platform-subheading">The path you’re walking</h2>{enrollments.length ? enrollments.map((entry) => <article className="platform-card" key={entry.id}><h2>{entry.course.title}</h2><p>{entry.batch.title} · {entry.progress.length} completed lesson{entry.progress.length === 1 ? "" : "s"}</p></article>) : null}
    <h2 className="platform-subheading">Notes sent to ASRVOne</h2>{applications.length ? applications.map((application) => <article className="platform-card" key={application.id}><h3>{application.course?.title || "Learning enquiry"} · {application.status}</h3><p>Received {application.createdAt.toLocaleDateString("en-IN")}{application.reviewNote ? ` — ${application.reviewNote}` : ""}</p></article>) : <p>Your program enquiries will appear here.</p>}
    <form action="/api/auth/logout" method="post"><button className="platform-button" formAction="/api/auth/logout">Sign out ↗</button></form>
  </section></main>;
}
