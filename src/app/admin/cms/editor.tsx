"use client";

import { useEffect, useState } from "react";

type Section = { key: string; title: string; eyebrow: string | null; body: string | null; visible: boolean; status: string; sortOrder: number };
type Service = { key: string; name: string; description: string; endpoint: string | null; ctaText: string; status: string; visible: boolean; sortOrder: number };

export function CmsEditor() {
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("Loading the words that meet your visitors…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cms").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The editor could not be opened.");
      setSections(payload.sections);
      setServices(payload.services);
      setMessage("Draft your changes, then publish the words you want the world to meet.");
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The editor could not be opened."));
  }, []);

  async function save() {
    setBusy(true);
    setMessage("Saving your edits…");
    try {
      const response = await fetch("/api/admin/cms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections, services }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your changes could not be saved.");
      setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <p className="platform-message" role="status">{message}</p>
    <div className="cms-editor">
      {sections.map((section) => <div className="cms-row" key={section.key}>
        <div><h2>{section.key}</h2><label>Status <select value={section.status} onChange={(event) => setSections((items) => items.map((item) => item.key === section.key ? { ...item, status: event.target.value } : item))}><option>DRAFT</option><option>PUBLISHED</option><option>SCHEDULED</option><option>ARCHIVED</option></select></label><label><input type="checkbox" checked={section.visible} onChange={(event) => setSections((items) => items.map((item) => item.key === section.key ? { ...item, visible: event.target.checked } : item))} /> Visible</label></div>
        <textarea aria-label={`Copy for ${section.key}`} value={section.title} onChange={(event) => setSections((items) => items.map((item) => item.key === section.key ? { ...item, title: event.target.value } : item))} />
      </div>)}
      {services.map((service) => <div className="cms-row" key={service.key}>
        <div><h2>{service.name}</h2><label>Status <select value={service.status} onChange={(event) => setServices((items) => items.map((item) => item.key === service.key ? { ...item, status: event.target.value } : item))}><option>ACTIVE</option><option>COMING_SOON</option><option>DISABLED</option></select></label><label><input type="checkbox" checked={service.visible} onChange={(event) => setServices((items) => items.map((item) => item.key === service.key ? { ...item, visible: event.target.checked } : item))} /> Visible</label></div>
        <textarea aria-label={`Description for ${service.name}`} value={service.description} onChange={(event) => setServices((items) => items.map((item) => item.key === service.key ? { ...item, description: event.target.value } : item))} />
      </div>)}
    </div>
    <div className="platform-links"><button className="platform-button" disabled={busy} onClick={() => void save()}>Save changes</button><a href="/admin">Return to administration</a></div>
  </>;
}
