import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { AstraAssistant } from "./assistant";
export default async function AstraPage() { if (!(await getActor())) redirect("/login"); return <main className="platform-page"><section className="platform-panel narrow"><p className="platform-eyebrow">ASRVONE ASTRA · YOUR LEARNING GUIDE</p><h1>Bring the question <em>you’re carrying.</em></h1><p className="platform-lede">Astra can help you find your next learning step and think through a programming question. Account changes remain with your mentor.</p><AstraAssistant /></section></main>; }
