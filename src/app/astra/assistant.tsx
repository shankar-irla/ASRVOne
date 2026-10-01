"use client";
import { useState, type FormEvent } from "react";

type Entry = { role: "user" | "assistant"; body: string };
export function AstraAssistant() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [status, setStatus] = useState("Astra answers from ASRVOne’s published learning information.");
  const [busy, setBusy] = useState(false);
  async function ask(event: FormEvent) { event.preventDefault(); const value = question.trim(); if (!value) return; setEntries((items) => [...items, { role: "user", body: value }]); setQuestion(""); setBusy(true); setStatus("Giving your question a little thought…"); try { const response = await fetch("/api/astra", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value, conversationId }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setConversationId(payload.conversationId); setEntries((items) => [...items, { role: "assistant", body: payload.reply }]); setStatus(payload.providerReady ? "Astra is connected to its configured guide." : "Astra’s live guide is not configured; this answer uses published ASRVOne details."); } catch (error) { setStatus(error instanceof Error ? error.message : "Astra could not answer just now."); } finally { setBusy(false); } }
  return <><p className="platform-message" role="status">{status}</p><div className="astra-thread" aria-live="polite">{entries.map((entry, index) => <article key={`${index}-${entry.role}`} className={`astra-entry ${entry.role}`}><small>{entry.role === "user" ? "YOU" : "ASTRA"}</small><p>{entry.body}</p></article>)}</div><form className="platform-card platform-form" onSubmit={ask}><label htmlFor="astra-question">Your question<textarea id="astra-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={4000} rows={4} placeholder="What would you like to understand?" /></label><button className="platform-button" disabled={busy || !question.trim()}>{busy ? "Thinking…" : "Ask Astra"} ↗</button></form></>;
}
