"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Job, JobApplication } from "@/lib/portal-types";
import { formatMoney } from "@/lib/portal-types";
import { PortalState } from "@/components/portal/PortalState";

interface Message { _id: string; senderId: string | { _id: string }; text?: string; attachmentUrl?: string; createdAt: string }
interface Participant { firstName?: string; lastName?: string; photoUrl?: string }

export function ChatPage({ jobId, workerId, userId }: { jobId: string; workerId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const [messageData, jobData] = await Promise.all([apiFetch<{ messages: Message[] }>(`jobs/${jobId}/messages/${workerId}`), apiFetch<{ job: Job }>(`jobs/${jobId}`)]);
      setMessages(messageData.messages); setJob(jobData.job); setError("");
      const client = typeof jobData.job.clientId === "object" ? jobData.job.clientId : null;
      const clientId = client?._id ?? jobData.job.clientId;
      if (clientId === userId) {
        try {
          const applicationData = await apiFetch<{ applications: JobApplication[] }>(`jobs/${jobId}/applications`);
          setParticipant(applicationData.applications.find((item) => item.workerId._id === workerId)?.workerId ?? null);
        } catch { setParticipant(null); }
      } else setParticipant(client);
    } catch (value) { setError(value instanceof Error ? value.message : "Could not load messages."); }
  }, [jobId, workerId]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  async function send(event: FormEvent) {
    event.preventDefault(); if (!messageText.trim()) return; setSending(true);
    try { await apiFetch(`jobs/${jobId}/messages/${workerId}`, { method: "POST", body: JSON.stringify({ text: messageText.trim() }) }); setMessageText(""); await load(); }
    catch (value) { setError(value instanceof Error ? value.message : "Could not send the message."); }
    finally { setSending(false); }
  }
  const participantName = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ") || "BOB member";
  const participantInitials = participantName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <>
    <Link className="back-link" href={`/portal/jobs/${jobId}`}>← Back to job</Link>
    <section className="chat-card">
      <header><span className="eyebrow">Job conversation</span><h1>{participantName}</h1></header>
      <div className="chat-context-area">
        <div className="chat-participant"><span className="avatar">{participant?.photoUrl ? <img src={participant.photoUrl} alt=""/> : participantInitials}</span><div><strong>{participantName}</strong><small>Job conversation</small></div></div>
        {job ? <Link href={`/portal/jobs/${jobId}`} className="chat-job-context"><div><small>Job details</small><strong>{job.title}</strong><span>{new Date(job.date).toLocaleString()}</span></div><b>{formatMoney(job.budget)}</b></Link> : null}
      </div>
      {error ? <div className="form-error portal-message">{error}</div> : null}
      {!messages ? <PortalState title="Loading messages…"/> : <div className="chat-messages">{messages.length === 0 ? <p className="chat-empty">Start the conversation about this job.</p> : messages.map((item) => { const senderId = typeof item.senderId === "object" ? item.senderId._id : item.senderId; return <div key={item._id} className={`chat-bubble ${senderId === userId ? "mine" : ""}`}><p>{item.text}</p>{item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer">Open attachment</a> : null}<small>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>; })}<div ref={end}/></div>}
      <form className="chat-compose" onSubmit={send}><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" aria-label="Message"/><button className="button button-primary" disabled={sending || !messageText.trim()}>{sending ? "Sending…" : "Send"}</button></form>
    </section>
  </>;
}
