"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PortalState } from "@/components/portal/PortalState";
import { apiFetch } from "@/lib/api-client";
import { usePortalI18n } from "@/lib/portal-i18n";
import type { Job, JobApplication } from "@/lib/portal-types";

interface Message { _id: string; senderId: string | { _id: string }; text?: string; attachmentUrl?: string; createdAt: string }
interface Participant { firstName?: string; lastName?: string; photoUrl?: string }

export function ChatPage({ jobId, workerId, userId }: { jobId: string; workerId: string; userId: string }) {
  const { t, date, money, locale } = usePortalI18n();
  const [messages, setMessages] = useState<Message[] | null>(null); const [job, setJob] = useState<Job | null>(null); const [participant, setParticipant] = useState<Participant | null>(null);
  const [messageText, setMessageText] = useState(""); const [error, setError] = useState(""); const [sending, setSending] = useState(false); const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const [messageData, jobData] = await Promise.all([apiFetch<{ messages: Message[] }>(`jobs/${jobId}/messages/${workerId}`), apiFetch<{ job: Job }>(`jobs/${jobId}`)]);
      setMessages(messageData.messages); setJob(jobData.job); setError("");
      const client = typeof jobData.job.clientId === "object" ? jobData.job.clientId : null; const clientId = client?._id ?? jobData.job.clientId;
      if (clientId === userId) { try { const applicationData = await apiFetch<{ applications: JobApplication[] }>(`jobs/${jobId}/applications`); setParticipant(applicationData.applications.find((item) => item.workerId._id === workerId)?.workerId ?? null); } catch { setParticipant(null); } }
      else setParticipant(client);
    } catch { setError(t("chat.loadError")); }
  }, [jobId, workerId, userId, t]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  async function send(event: FormEvent) { event.preventDefault(); if (!messageText.trim()) return; setSending(true); try { await apiFetch(`jobs/${jobId}/messages/${workerId}`, { method: "POST", body: JSON.stringify({ text: messageText.trim() }) }); setMessageText(""); await load(); } catch { setError(t("chat.sendError")); } finally { setSending(false); } }
  const participantName = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ") || "BOB"; const participantInitials = participantName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <>
    <Link className="back-link" href={`/portal/jobs/${jobId}`}>← {t("common.back")}</Link>
    <section className="chat-card"><header><span className="eyebrow">{t("chat.conversation")}</span><h1>{participantName}</h1></header><div className="chat-context-area"><div className="chat-participant"><span className="avatar">{participant?.photoUrl ? <img src={participant.photoUrl} alt=""/> : participantInitials}</span><div><strong>{participantName}</strong><small>{t("chat.conversation")}</small></div></div>{job ? <Link href={`/portal/jobs/${jobId}`} className="chat-job-context"><div><small>{t("chat.jobContext")}</small><strong>{job.title}</strong><span>{date(job.date, { dateStyle: "medium", timeStyle: "short" })}</span></div><b>{money(job.budget)}</b></Link> : null}</div>
      {error ? <div className="form-error portal-message">{error}</div> : null}
      {!messages ? <PortalState title={t("common.loading")}/> : <div className="chat-messages">{messages.length === 0 ? <p className="chat-empty">{t("chat.empty")}</p> : messages.map((item) => { const senderId = typeof item.senderId === "object" ? item.senderId._id : item.senderId; return <div key={item._id} className={`chat-bubble ${senderId === userId ? "mine" : ""}`}><p>{item.text}</p>{item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer">{item.attachmentUrl}</a> : null}<small>{new Date(item.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</small></div>; })}<div ref={end}/></div>}
      <form className="chat-compose" onSubmit={send}><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={t("chat.placeholder")} aria-label={t("chat.placeholder")}/><button className="button button-primary" disabled={sending || !messageText.trim()}>{sending ? t("common.loading") : t("chat.send")}</button></form>
    </section>
  </>;
}
