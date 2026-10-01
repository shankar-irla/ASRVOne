import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { AppointmentBooking } from "./booking";
export default async function AppointmentsPage() { if (!(await getActor())) redirect("/login"); return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">MAKE ROOM FOR A REAL CONVERSATION</p><h1>Ask for a mentor’s <em>time.</em></h1><p className="platform-lede">Choose a published opening and tell us what would make the hour useful. Your request is private to you and your mentor.</p><AppointmentBooking /></section></main>; }
