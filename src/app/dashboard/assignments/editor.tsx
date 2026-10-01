"use client";

import { useEffect, useState } from "react";

type Assignment = { id: string; title: string; instructions: string; dueAt: string | null; maxScore: number; course: { title: string }; module: { title: string } | null; submissions: Array<{ response: string; score: number | null; feedback: string | null; submittedAt: string }> };

export function AssignmentList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [message, setMessage] = useState("Loading the work your learning path has left for you…");
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { fetch("/api/assignments").then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setAssignments(payload.assignments); setMessage(payload.assignments.length ? "Every clear answer starts with an honest attempt." : "There are no published assignments in your enrolled courses yet."); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Assignments could not be loaded.")); }, []);
  async function submit(assignment: Assignment, responseText: string) {
    setSaving(assignment.id); setMessage("Sending your work…");
    try { const response = await fetch(`/api/assignments/${assignment.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response: responseText }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setMessage(payload.message); setAssignments((items) => items.map((item) => item.id === assignment.id ? { ...item, submissions: [{ response: responseText, score: null, feedback: null, submittedAt: new Date().toISOString() }] } : item)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Your work could not be sent."); }
    finally { setSaving(null); }
  }
  return <><p className="platform-message" role="status">{message}</p>{assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} busy={saving === assignment.id} onSubmit={(text) => submit(assignment, text)} />)}</>;
}

function AssignmentCard({ assignment, busy, onSubmit }: { assignment: Assignment; busy: boolean; onSubmit: (response: string) => void }) {
  const [answer, setAnswer] = useState(assignment.submissions[0]?.response || "");
  return <article className="platform-card"><p className="platform-eyebrow">{assignment.course.title}{assignment.module ? ` · ${assignment.module.title}` : ""}</p><h2>{assignment.title}</h2><p>{assignment.instructions}</p>{assignment.dueAt && <p>Due {new Date(assignment.dueAt).toLocaleString()}</p>}<form className="platform-form" onSubmit={(event) => { event.preventDefault(); onSubmit(answer); }}><label>Your explanation or solution<textarea value={answer} maxLength={20000} rows={8} onChange={(event) => setAnswer(event.target.value)} required /></label><button className="platform-button" disabled={busy || !answer.trim()}>{busy ? "Sending…" : assignment.submissions.length ? "Update my submission" : "Submit my work"}</button></form>{assignment.submissions[0]?.feedback && <p>Mentor note: {assignment.submissions[0].feedback}{assignment.submissions[0].score !== null ? ` · ${assignment.submissions[0].score}/${assignment.maxScore}` : ""}</p>}</article>;
}
