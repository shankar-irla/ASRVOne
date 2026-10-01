import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { ResourceList } from "./list";
export default async function ResourcesPage() { if (!(await getActor())) redirect("/login"); return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">THE RESOURCE ROOM</p><h1>Keep the good things <em>close.</em></h1><p className="platform-lede">Notes and materials are private to your enrolled course, batch, or permission.</p><ResourceList /></section></main>; }
