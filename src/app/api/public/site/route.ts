import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const [sections, services, content, navigation, events, announcements] = await Promise.all([
      db.homePageSection.findMany({ where: { visible: true, OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", scheduledAt: { lte: now } }] }, orderBy: { sortOrder: "asc" }, select: { key: true, title: true, eyebrow: true, subtitle: true, body: true, mediaUrl: true, ctaText: true, ctaUrl: true, sortOrder: true, theme: true, animation: true } }),
      db.serviceEndpoint.findMany({ where: { visible: true, status: { not: "DISABLED" } }, orderBy: { sortOrder: "asc" }, select: { key: true, name: true, description: true, endpoint: true, ctaText: true, status: true, sortOrder: true } }),
      db.siteContent.findMany({ where: { status: "PUBLISHED" }, select: { key: true, value: true } }),
      db.navigationItem.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" }, select: { label: true, href: true } }),
      db.event.findMany({ where: { status: "PUBLISHED", startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 6, select: { slug: true, title: true, description: true, startsAt: true, endsAt: true, location: true } }),
      db.announcement.findMany({ where: { status: "PUBLISHED", OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" }, take: 5, select: { title: true, body: true, startsAt: true, expiresAt: true } }),
    ]);
    return NextResponse.json({ sections, services, content: Object.fromEntries(content.map((entry) => [entry.key, entry.value])), navigation, events, announcements }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Public site content is unavailable until the database is configured.", error);
    return NextResponse.json({ error: "Public content is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
