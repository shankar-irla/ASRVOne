import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  let courses: Array<{ id: string; slug: string; title: string; summary: string; level: string | null; modules: Array<{ title: string; description: string | null }> }> = [];
  try {
    courses = await getDb().course.findMany({ where: { status: "PUBLISHED" }, include: { modules: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } } }, orderBy: { createdAt: "asc" } });
  } catch { /* The course path below keeps the intended program readable before database setup. */ }
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">THE LEARNING HOUSE · JAVA + DSA</p><h1>A foundation that <em>holds.</em></h1><p className="platform-lede">First principles, patient practice, and a clear road toward questions worth solving.</p>
    {courses.length ? courses.map((course) => <article className="platform-card" key={course.id}><p className="platform-eyebrow">{course.level || "ASRVONE PROGRAM"}</p><h2>{course.title}</h2><p>{course.summary}</p><ul>{course.modules.map((module) => <li key={module.title}><strong>{module.title}</strong>{module.description ? ` — ${module.description}` : ""}</li>)}</ul><Link className="platform-button" href={`/learn/${course.slug}`}>Open this learning path ↗</Link></article>) : <article className="platform-card"><p className="platform-eyebrow">JAVA + DSA PLACEMENT PREPARATION</p><h2>One to LeetCode</h2><p>The learning path moves from Java foundations through logic building, Core Java, arrays and strings, algorithms, and placement readiness. The seed content reflects the supplied ASRVOne program documents.</p><p>Batch dates and availability are published by the ASRVOne team; no dates are invented here.</p><Link className="platform-button" href="/#registration">Register your interest ↗</Link></article>}
    <nav className="platform-links"><Link href="/">Back to ASRVOne</Link><Link href="/register">Create a learner account</Link></nav></section></main>;
}
