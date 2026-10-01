import { NextResponse } from "next/server";
import { RoleCode } from "@/generated/prisma/client";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { createResourceDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    if (!actor) throw new HttpError(401, "Sign in to open this resource.", "AUTHENTICATION_REQUIRED");
    const { id } = await context.params;
    const db = getDb();
    const resource = await db.resource.findUnique({ where: { id }, include: { permissions: { where: { canView: true } } } });
    if (!resource || resource.status !== "PUBLISHED") throw new HttpError(404, "This resource is not available.", "RESOURCE_NOT_FOUND");
    const enrollment = (resource.courseId || resource.batchId) ? await db.enrollment.findFirst({ where: { userId: actor.id, ...(resource.courseId ? { courseId: resource.courseId } : {}), ...(resource.batchId ? { batchId: resource.batchId } : {}) }, select: { id: true } }) : null;
    const explicitPermission = resource.permissions.some((permission) => permission.userId === actor.id || (permission.roleCode && actor.roles.includes(permission.roleCode)));
    if (!actor.roles.includes("ADMIN") && !enrollment && !explicitPermission) throw new HttpError(403, "This resource belongs to another learning space.", "RESOURCE_FORBIDDEN");
    const url = await createResourceDownloadUrl(resource.storageKey, resource.originalName);
    await db.resourceAccessLog.create({ data: { resourceId: resource.id, userId: actor.id, action: "download", result: "allowed" } });
    return NextResponse.json({ url, expiresInSeconds: 120 });
  } catch (error) {
    if (error instanceof Error && error.message === "Private object storage is not configured.") return NextResponse.json({ error: "Private resource storage is not configured yet.", code: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
    return jsonError(error);
  }
}
