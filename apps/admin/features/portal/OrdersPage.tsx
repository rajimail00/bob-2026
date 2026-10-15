"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { usePortalI18n } from "@/lib/portal-i18n";
import type { Job, MyApplication } from "@/lib/portal-types";
import { JobCard } from "@/components/portal/JobCard";
import { PortalState } from "@/components/portal/PortalState";

type Tab = "posted" | "applied";
const isHistory = (status: Job["status"]) => ["completed", "cancelled", "expired"].includes(status);

export function OrdersPage({ hasWorkerProfile, userId }: { hasWorkerProfile: boolean; userId: string }) {
  const { t, locale } = usePortalI18n();
  const [tab, setTab] = useState<Tab>("posted"); const [jobs, setJobs] = useState<Job[]>([]); const [applications, setApplications] = useState<MyApplication[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { if (tab === "applied") { const data = await apiFetch<{ applications: MyApplication[] }>("applications/mine"); setApplications(data.applications); setJobs([]); } else { const data = await apiFetch<{ jobs: Job[] }>("jobs/mine/posted"); setJobs(data.jobs); setApplications([]); } } catch (value) { setError(value instanceof Error ? value.message : t(tab === "posted" ? "orders.loadOrdersError" : "orders.loadApplicationsError")); } finally { setLoading(false); } }, [tab, t]);
  useEffect(() => { void load(); }, [load]);
  async function deleteJob(job: Job) { if (!confirm(t("orders.deleteBody", { title: job.title }))) return; try { await apiFetch(`jobs/${job._id}`, { method: "DELETE" }); await load(); } catch (value) { setError(value instanceof Error ? value.message : t("orders.deleteError")); } }
  const entries = tab === "posted" ? jobs.map((job) => ({ job, badge: job.status, chatHref: undefined as string | undefined, unread: 0 })) : applications.map((application) => ({ job: application.jobId, badge: application.status, chatHref: `/portal/messages/${application.jobId._id}/${userId}`, unread: application.unreadMessageCount }));
  const sections = [{ title: t("orders.current"), entries: entries.filter(({ job }) => !isHistory(job.status)) }, { title: t("orders.history"), entries: entries.filter(({ job }) => isHistory(job.status)) }].filter((section) => section.entries.length > 0);

  return <>
    <section className="portal-title-row orders-title"><div><span className="eyebrow">{t("navigation.orders")}</span><h1>{t("navigation.orders")}</h1></div><Link className="button button-primary" href="/portal/post-job">{t("navigation.post")}</Link></section>
    <div className="portal-tabs orders-tabs"><button className={tab === "posted" ? "active" : ""} onClick={() => setTab("posted")}>{t("orders.postedTab")}</button><button className={tab === "applied" ? "active" : ""} onClick={() => setTab("applied")}>{t("orders.appliedTab")}</button></div>
    {loading ? <PortalState title={t("common.loading")}/> : error ? <PortalState error title={t(tab === "posted" ? "orders.loadOrdersError" : "orders.loadApplicationsError")} message={error}/> : tab === "applied" && !hasWorkerProfile ? <div className="portal-state worker-setup-state"><strong>{t("profileFlow.chooseCategories")}</strong><p>{t("workerProfile.chooseCategories", { count: 5 })}</p><Link className="button button-primary" href="/portal/profile?section=services">{t("profileFlow.chooseCategories")}</Link></div> : sections.length === 0 ? <PortalState title={t(tab === "posted" ? "orders.noOrdersTitle" : "orders.noApplicationsTitle")} message={t(tab === "posted" ? "orders.noOrdersBody" : "orders.noApplicationsBody")}/> : <div className="orders-sections">{sections.map((section) => <section key={section.title}><h2>{section.title}</h2><div className="portal-job-grid">{section.entries.map(({ job, badge, chatHref, unread }) => <JobCard key={job._id} job={job} locale={locale} badge={unread ? `${badge} · ${t("orders.unreadMessages", { count: unread })}` : badge} chatHref={chatHref} onDelete={tab === "posted" && job.status === "active" ? () => void deleteJob(job) : undefined}/>)}</div></section>)}</div>}
  </>;
}
