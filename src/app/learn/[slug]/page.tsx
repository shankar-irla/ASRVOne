import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getDb().course.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { published: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, summary: true, content: true, durationMins: true },
          },
        },
      },
    },
  });
  if (!course) notFound();
  const actor = await getActor();
  const enrollment = actor ? await getDb().enrollment.findFirst({ where: { userId: actor.id, courseId: course.id }, select: { id: true } }) : null;
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">{course.level || "A PATH TO PRACTICE"}</p><h1>{course.title}</h1><p className="platform-lede">{course.description}</p>{enrollment ? course.modules.map((module) => <article className="platform-card" key={module.id}><h2>{module.title}</h2><p>{module.description}</p>{module.lessons.map((lesson) => <details key={lesson.id}><summary>{lesson.title}{lesson.durationMins ? ` · ${lesson.durationMins} minutes` : ""}</summary><p>{lesson.summary}</p><div>{lesson.content}</div></details>)}</article>) : <article className="platform-card"><p>Join this learning path to open its lessons and assignments.</p><Link className="platform-button" href="/#registration">Register your interest ↗</Link></article>}<Link className="platform-links" href="/learn">All learning paths</Link></section></main>;
}
