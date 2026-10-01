import "server-only";

import { getDb } from "@/lib/db";
import { clientAddress } from "@/lib/http";
import { hashAddress } from "@/lib/security/tokens";

export async function recordAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result?: string;
  details?: Record<string, string | number | boolean | null>;
  request?: Request;
}): Promise<void> {
  await getDb().auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      result: input.result ?? "success",
      details: input.details,
      ipHash: input.request ? hashAddress(clientAddress(input.request)) : undefined,
    },
  });
}
