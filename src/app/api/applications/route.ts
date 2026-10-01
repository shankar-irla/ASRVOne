import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientAddress, HttpError, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashAddress } from "@/lib/security/tokens";
import { registrationSchema } from "@/lib/validation";
import { sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";
const DEFAULT_FORMSPREE_ENDPOINT = "https://formspree.io/f/xkjgeklk";

async function requestValues(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      throw new HttpError(400, "Send a valid registration form.", "INVALID_JSON");
    }
  }
  const form = await request.formData();
  const values = Object.fromEntries(form.entries());
  if (typeof values._gotcha === "string") values.website = values._gotcha;
  return values;
}

function formspreeEndpoint(): string {
  const value = process.env.FORMSPREE_ENDPOINT?.trim() || DEFAULT_FORMSPREE_ENDPOINT;
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("FORMSPREE_ENDPOINT is not a valid URL.");
  }
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "formspree.io" || !/^\/f\/[A-Za-z0-9]+$/.test(endpoint.pathname)) {
    throw new Error("FORMSPREE_ENDPOINT must be an HTTPS Formspree form endpoint.");
  }
  return endpoint.toString();
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(`application:${hashAddress(clientAddress(request))}`, 5, 60 * 60 * 1000);
    const input = registrationSchema.parse(await requestValues(request));
    if (input.website) return NextResponse.json({ message: "Your note is on its way." }, { status: 202 });

    const db = getDb();
    const course = await db.course.findUnique({ where: { slug: "one-to-leetcode" }, select: { id: true } });
    let batchId: string | undefined;
    if (input.batch && /^[0-9a-f-]{36}$/i.test(input.batch)) {
      const batch = await db.batch.findFirst({ where: { id: input.batch, courseId: course?.id, status: "PUBLISHED" }, select: { id: true } });
      if (!batch) throw new HttpError(400, "Choose a currently available batch.", "BATCH_UNAVAILABLE");
      batchId = batch.id;
    }
    const matchingUser = await db.user.findUnique({ where: { email: input.email }, select: { id: true, status: true, deletedAt: true } });

    const application = await db.application.create({
      data: {
        userId: matchingUser?.status === "ACTIVE" && !matchingUser.deletedAt ? matchingUser.id : null,
        fullName: input.name,
        email: input.email,
        phone: input.phone || null,
        college: input.college || null,
        year: input.year || null,
        branch: input.branch || null,
        skills: input.skills || null,
        experience: input.experience || null,
        message: input.message || null,
        source: "website",
        courseId: course?.id,
        batchId,
      },
      select: { id: true, createdAt: true },
    });

    let formspreeAccepted = false;
    const endpoint = formspreeEndpoint();
    try {
      const formspreeData = new FormData();
      const fields = {
        name: input.name,
        email: input.email,
        _replyto: input.email,
        phone: input.phone,
        college: input.college,
        year: input.year,
        branch: input.branch,
        skills: input.skills,
        experience: input.experience,
        program: input.program,
        batch: input.batch,
        message: input.message,
        application_id: application.id,
        _subject: `ASRVOne registration ${application.id.slice(0, 8)}`,
      };
      Object.entries(fields).forEach(([key, value]) => formspreeData.set(key, value));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formspreeData,
        signal: AbortSignal.timeout(8000),
      });
      formspreeAccepted = response.ok;
      if (response.ok) {
        await db.application.update({ where: { id: application.id }, data: { formspreeSentAt: new Date() } });
      } else {
        const detail = await response.text().catch(() => "");
        console.error("Formspree rejected application", application.id, response.status, detail.slice(0, 500));
      }
    } catch (error) {
      console.error("Formspree forwarding failed for application", application.id, error);
    }

    const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminRecipient) {
      try {
        await sendTransactionalEmail("application_received_admin", adminRecipient, {
          name: input.name,
          email: input.email,
          applicationId: application.id,
          program: input.program,
        });
      } catch (error) {
        console.error("Admin application notification failed", application.id, error);
      }
    }

    let thankYouEmailSent = false;
    try {
      const responseWindow = await db.siteContent.findUnique({ where: { key: "organization.responseWindow" }, select: { value: true } });
      const email = await sendTransactionalEmail("application_received_student", input.email, {
        name: input.name,
        program: input.program,
        applicationId: application.id,
        responseWindow: typeof responseWindow?.value === "string" ? responseWindow.value : "as soon as we can",
      });
      thankYouEmailSent = email.sent;
    } catch (error) {
      console.error("Applicant confirmation failed", application.id, error);
    }

    return NextResponse.json({
      applicationId: application.id,
      receivedAt: application.createdAt.toISOString(),
      formspreeAccepted,
      thankYouEmailSent,
      message: "Your application is recorded. ASRVOne can now review your note.",
    }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
