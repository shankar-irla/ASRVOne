import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { CommunityChat } from "./chat";
export default async function CommunityPage() { if (!(await getActor())) redirect("/login"); return <main className="platform-page"><section className="platform-panel platform-panel-wide"><p className="platform-eyebrow">ASRVONE COMMUNITY</p><h1>Learn without ego. <em>Rise in good company.</em></h1><p className="platform-lede">Every room is a promise: ask generously, disagree with care, and protect each other’s space.</p><CommunityChat /></section></main>; }
