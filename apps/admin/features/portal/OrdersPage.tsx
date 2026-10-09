"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Job, MyApplication } from "@/lib/portal-types";
import { JobCard } from "@/components/portal/JobCard";
import { PortalState } from "@/components/portal/PortalState";

type Tab = "posted" | "applied";
const isHistory = (status: Job["status"]) => ["completed", "cancelled", "expired"].includes(status);

export function OrdersPage({ hasWorkerProfile, userId }: { hasWorkerProfile: boolean; userId: string }) {
  const [tab, setTab] = useState<Tab>("posted");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (tab === "applied") {
        const data = await apiFetch<{ applications: MyApplication[] }>("applications/mine");
        setApplications(data.applications); setJobs([]);
      } else {
        const data = await apiFetch<{ jobs: Job[] }>("jobs/mine/posted");
        setJobs(data.jobs); setApplications([]);
      }
    } catch (value) { setError(value instanceof Error ? value.message : "Could not load your jobs."); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  async function deleteJob(job: Job) {
    if (!confirm(`Delete “${job.title}”? This cannot be undone.`)) return;
    try { await apiFetch(`jobs/${job._id}`, { method: "DELETE" }); await load(); }
    catch (value) { setError(value instanceof Error ? value.message : "Could not delete this job."); }
  }

  const entries = tab === "posted"
    ? jobs.map((job) => ({ job, badge: job.status, chatHref: undefined as string | undefined, unread: 0 }))
    : applications.map((application) => ({ job: application.jobId, badge: application.status, chatHref: `/portal/messages/${application.jobId._id}/${userId}`, unread: application.unreadMessageCount }));
  const sections = [
    { title: "Current", entries: entries.filter(({ job }) => !isHistory(job.status)) },
    { title: "History", entries: entries.filter(({ job }) => isHistory(job.status)) },
  ].filter((section) => section.entries.length > 0);

  return <>
    <section className="portal-title-row orders-title"><div><span className="eyebrow">Your activity</span><h1>My jobs</h1><p>Track the jobs you posted and the jobs you applied for.</p></div><Link className="button button-primary" href="/portal/post-job">Post a job</Link></section>
    <div className="portal-tabs orders-tabs"><button className={tab === "posted" ? "active" : ""} onClick={() => setTab("posted")}>Posted</button><button className={tab === "applied" ? "active" : ""} onClick={() => setTab("applied")}>Applied</button></div>
    {loading ? <PortalState title="Loading your jobs…"/> : error ? <PortalState error title="Could not load your jobs" message={error}/> : tab === "applied" && !hasWorkerProfile ? <div className="portal-state worker-setup-state"><strong>Create your worker profile</strong><p>Choose the services you provide before applying for jobs.</p><Link className="button button-primary" href="/portal/profile">Set up worker profile</Link></div> : sections.length === 0 ? <PortalState title="Nothing here yet" message={tab === "posted" ? "Post your first job to get started." : "Jobs you apply for will appear here."}/> : <div className="orders-sections">{sections.map((section) => <section key={section.title}><h2>{section.title}</h2><div className="portal-job-grid">{section.entries.map(({ job, badge, chatHref, unread }) => <JobCard key={job._id} job={job} badge={unread ? `${badge} · ${unread} new` : badge} chatHref={chatHref} onDelete={tab === "posted" && job.status === "active" ? () => void deleteJob(job) : undefined}/>)}</div></section>)}</div>}
  </>;
}
