"use client";
import { useEffect, useState } from "react";

type Resource = { id: string; title: string; description: string | null; originalName: string; mimeType: string; sizeBytes: string; createdAt: string; course: { title: string } | null; batch: { title: string } | null };
export function ResourceList() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [message, setMessage] = useState("Looking for the notes set aside for your learning path…");
  useEffect(() => { fetch("/api/resources").then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setResources(payload.resources); setMessage(payload.resources.length ? "Open a resource when you need it; its link expires after two minutes." : "No resources have been shared with your account yet."); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The resource shelf could not be opened.")); }, []);
  async function download(id: string) { setMessage("Preparing a private download link…"); try { const response = await fetch(`/api/resources/${id}/download`, { method: "POST" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); window.location.assign(payload.url); setMessage("Your download is beginning."); } catch (error) { setMessage(error instanceof Error ? error.message : "This resource could not be opened."); } }
  return <><p className="platform-message" role="status">{message}</p>{resources.map((resource) => <article className="platform-card" key={resource.id}><p className="platform-eyebrow">{resource.course?.title || resource.batch?.title || "ASRVONE RESOURCE"}</p><h2>{resource.title}</h2><p>{resource.description || resource.originalName} · {(Number(resource.sizeBytes) / 1024 / 1024).toFixed(1)} MB</p><button className="platform-button" onClick={() => void download(resource.id)}>Get private download link ↗</button></article>)}</>;
}
