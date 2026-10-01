import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const sectionEditSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(240).optional(),
  eyebrow: z.string().trim().max(180).nullable().optional(),
  subtitle: z.string().trim().max(500).nullable().optional(),
  body: z.string().trim().max(10000).nullable().optional(),
  ctaText: z.string().trim().max(100).nullable().optional(),
  ctaUrl: z.string().trim().max(1000).nullable().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const serviceEditSchema = z.object({
  key: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  endpoint: z.string().trim().max(1000).nullable().optional(),
  ctaText: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["ACTIVE", "COMING_SOON", "DISABLED"]).optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const editSchema = z.object({ sections: z.array(sectionEditSchema).max(40).default([]), services: z.array(serviceEditSchema).max(40).default([]) });

export async function GET() {
  try {
    await requirePermission("MANAGE_SITE_CONTENT");
    const db = getDb();
    const [sections, services] = await Promise.all([
      db.homePageSection.findMany({ orderBy: { sortOrder: "asc" } }),
      db.serviceEndpoint.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    return NextResponse.json({ sections, services });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("MANAGE_SITE_CONTENT");
    const { sections, services } = editSchema.parse(await readJson(request));
    const db = getDb();
    await db.$transaction(async (tx) => {
      for (const edit of sections) {
        const current = await tx.homePageSection.findUniqueOrThrow({ where: { key: edit.key } });
        const { key: _key, scheduledAt, ...fields } = edit;
        const next = {
          ...fields,
          scheduledAt: scheduledAt === undefined ? undefined : scheduledAt ? new Date(scheduledAt) : null,
          publishedAt: edit.status === "PUBLISHED" ? new Date() : undefined,
          updatedById: actor.id,
        };
        await tx.contentVersion.create({ data: { sectionId: current.id, createdById: actor.id, snapshot: JSON.parse(JSON.stringify(current)) as Prisma.InputJsonValue } });
        await tx.homePageSection.update({ where: { id: current.id }, data: next });
      }
      for (const edit of services) {
        const { key, ...fields } = edit;
        await tx.serviceEndpoint.update({ where: { key }, data: fields });
      }
    });
    await recordAudit({ actorId: actor.id, action: "cms.update", entityType: "HomePage", request, details: { sections: sections.length, services: services.length } });
    return NextResponse.json({ message: "Your changes are saved. Published changes will appear on the public site shortly." });
  } catch (error) {
    return jsonError(error);
  }
}
