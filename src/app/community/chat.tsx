"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Channel = { id: string; slug: string; name: string; description: string | null; isPrivate: boolean; _count: { messages: number; members: number } };
type Message = { id: string; body: string; createdAt: string; sender: { id: string; name: string }; reactions: Array<{ userId: string; reaction: string }> };

export function CommunityChat() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [current, setCurrent] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("Opening a room for thoughtful questions…");
  const socket = useRef<Socket | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/community/channels").then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); if (!alive) return; setChannels(payload.channels); if (payload.channels[0]) setCurrent(payload.channels[0]); setMessage(payload.channels.length ? "Choose a channel and bring a kind, useful question." : "The community rooms have not been opened by an administrator yet."); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The community could not be opened."));
    const url = process.env.NEXT_PUBLIC_REALTIME_URL || window.location.origin;
    const activeSocket = io(url, { withCredentials: true, transports: ["websocket", "polling"], autoConnect: true });
    socket.current = activeSocket;
    activeSocket.on("connect_error", () => setMessage("Live connection is not ready. Check the realtime service configuration."));
    activeSocket.on("message:new", (incoming: Message) => setMessages((items) => items.some((item) => item.id === incoming.id) ? items : [...items, incoming]));
    return () => { alive = false; activeSocket.disconnect(); socket.current = null; };
  }, []);
  useEffect(() => {
    if (!current) return;
    let active = true;
    fetch(`/api/community/channels/${current.id}/messages`).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); if (active) setMessages(payload.messages); }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Messages could not be loaded."); });
    socket.current?.emit("channel:join", { channelId: current.id }, (result: { ok: boolean; error?: string }) => { if (!result?.ok) setMessage(result?.error || "That channel is not available."); });
    return () => { socket.current?.emit("channel:leave", { channelId: current.id }); };
  }, [current]);
  function send(event: FormEvent) { event.preventDefault(); const body = draft.trim(); if (!body || !current || !socket.current) return; setDraft(""); socket.current.emit("message:send", { channelId: current.id, body }, (result: { ok: boolean; message?: Message; error?: string }) => { if (!result?.ok) { setDraft(body); setMessage(result?.error || "Your note could not be sent."); } else if (result.message) setMessages((items) => items.some((item) => item.id === result.message!.id) ? items : [...items, result.message!]); }); }
  return <div className="community-layout"><aside className="community-channels"><h2>Choose a room</h2>{channels.map((channel) => <button key={channel.id} className={current?.id === channel.id ? "is-current" : ""} onClick={() => setCurrent(channel)}>{channel.name}<small>{channel._count.messages} notes · {channel._count.members} members</small></button>)}</aside><section className="community-room"><header><p className="platform-eyebrow">{current ? `# ${current.slug}` : "A QUIET HALLWAY"}</p><h2>{current?.name || "The conversation begins soon."}</h2><p>{current?.description}</p></header><p className="platform-message" role="status">{message}</p><div className="community-messages" aria-live="polite">{messages.map((entry) => <article className="community-message" key={entry.id}><p><strong>{entry.sender.name}</strong><time>{new Date(entry.createdAt).toLocaleString()}</time></p><div>{entry.body}</div></article>)}</div><form className="community-compose" onSubmit={send}><label htmlFor="community-message">Your note</label><textarea id="community-message" value={draft} maxLength={5000} rows={3} onChange={(event) => setDraft(event.target.value)} placeholder="Ask clearly. Answer kindly." disabled={!current} /><button className="platform-button" disabled={!current || !draft.trim()}>Send to the room ↗</button></form></section></div>;
}
