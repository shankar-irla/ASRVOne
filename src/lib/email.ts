import "server-only";

import { Resend } from "resend";
import { getDb } from "@/lib/db";

type Variables = Record<string, string>;

function renderTemplate(source: string, variables: Variables): string {
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, name: string) => variables[name] ?? "");
}

function escapeHtml(source: string): string {
  return source.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function sendTransactionalEmail(templateKey: string, recipient: string, variables: Variables): Promise<{ sent: boolean; provider: string }> {
  const db = getDb();
  const template = await db.emailTemplate.findUnique({ where: { key: templateKey } });
  if (!template?.enabled) return { sent: false, provider: "disabled" };
  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body, variables);
  const provider = process.env.MAIL_PROVIDER || "console";
  if (provider === "console" && process.env.NODE_ENV !== "production") {
    console.info(`[email preview:${templateKey}] to=${recipient} subject=${subject}\n${body}`);
    await db.emailLog.create({ data: { templateKey, recipient, provider, status: "console_preview" } });
    return { sent: false, provider };
  }
  if (provider !== "resend" || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    await db.emailLog.create({ data: { templateKey, recipient, provider, status: "not_configured", errorCode: "EMAIL_PROVIDER_NOT_CONFIGURED" } });
    return { sent: false, provider: "not_configured" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: recipient,
    subject,
    text: body,
    html: `<div style="font:16px/1.7 Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>`,
  });
  if (result.error) {
    await db.emailLog.create({ data: { templateKey, recipient, provider, status: "failed", errorCode: result.error.name.slice(0, 100) } });
    throw new Error("The transactional email could not be sent.");
  }
  await db.emailLog.create({ data: { templateKey, recipient, provider, providerId: result.data?.id, status: "sent" } });
  return { sent: true, provider };
}
