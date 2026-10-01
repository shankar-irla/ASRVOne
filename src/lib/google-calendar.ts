import "server-only";

type CalendarEventInput = { title: string; description: string; startsAt: Date; endsAt: Date; attendees: string[] };

export async function createGoogleCalendarMeeting(input: CalendarEventInput): Promise<{ eventId: string; htmlLink: string | null; meetUrl: string | null } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }), signal: AbortSignal.timeout(10_000) });
  const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(`Google Calendar token refresh failed (${tokenPayload.error || tokenResponse.status}).`);
  const calendar = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  const endpoint = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendar}/events?conferenceDataVersion=1&sendUpdates=all`);
  const eventResponse = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${tokenPayload.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ summary: `ASRVOne mentorship: ${input.title}`, description: input.description, start: { dateTime: input.startsAt.toISOString() }, end: { dateTime: input.endsAt.toISOString() }, attendees: input.attendees.map((email) => ({ email })), conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } } }), signal: AbortSignal.timeout(15_000) });
  const result = await eventResponse.json() as { id?: string; htmlLink?: string; hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }; error?: { message?: string } };
  if (!eventResponse.ok || !result.id) throw new Error(`Google Calendar event creation failed (${result.error?.message || eventResponse.status}).`);
  return { eventId: result.id, htmlLink: result.htmlLink || null, meetUrl: result.hangoutLink || result.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri || null };
}
