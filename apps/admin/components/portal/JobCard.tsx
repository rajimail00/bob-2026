"use client";

import Link from "next/link";
import type { Job } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";
import { usePortalI18n } from "@/lib/portal-i18n";

function shortDay(value: string, locale: string, today: string) { const date = new Date(value); return date.toDateString() === new Date().toDateString() ? today : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date); }
function shortTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function Meta({ icon, value }: { icon: string; value: string }) { return <span className="mobile-job-meta"><i aria-hidden="true">{icon}</i>{value}</span>; }

export function JobCard({ job, locale = "en", badge, chatHref, onDelete }: { job: Job; locale?: string; badge?: string; chatHref?: string; onDelete?: () => void }) {
  const { t, money, date } = usePortalI18n();
  const detailHref = `/portal/jobs/${job._id}`;
  const thumbnail = job.media?.[0];
  return <article className="portal-job-card">
    <div className="job-card-desktop">
      <div className="job-card-top"><span className="job-category">{localizedName(job.categoryId, locale)}</span>{job.isEmergency ? <span className="urgent-badge">{t("admin.priority.urgent")}</span> : badge ? <span className="status-pill neutral">{badge}</span> : null}</div>
      <div><h3>{job.title}</h3><p>{job.description}</p></div>
      <dl className="job-facts"><div><dt>{t("home.budget")}</dt><dd>{money(job.budget)}</dd></div><div><dt>{t("postJob.dateLabel")}</dt><dd>{date(job.date)}</dd></div><div><dt>{t("home.people")}</dt><dd>{job.peopleNeeded}</dd></div></dl>
      <p className="job-address">{job.address}</p>
      <div className="job-card-actions"><Link className="button button-secondary" href={detailHref}>{t("admin.jobs.details")}</Link>{chatHref ? <Link className="button button-primary" href={chatHref}>{t("chat.title")}</Link> : null}{onDelete ? <button type="button" className="button button-danger job-delete-button" onClick={onDelete}>{t("jobDetail.delete")}</button> : null}</div>
    </div>
    <div className={`job-card-mobile ${onDelete ? "has-delete" : ""}`}>
      {thumbnail ? <div className="mobile-job-media">{thumbnail.type === "photo" ? <img src={thumbnail.url} alt=""/> : <video src={thumbnail.url} muted preload="metadata"/>}{thumbnail.type === "video" ? <span className="mobile-video-play">▶</span> : null}</div> : null}
      <div className="mobile-job-body">
        <div className="mobile-job-title-row"><h3>{job.title}</h3><span className={`status-pill ${job.status === "active" ? "success" : "neutral"}`}>{t(`jobs.status.${job.status}`)}</span></div>
        <div className="mobile-job-metadata"><Meta icon="◇" value={localizedName(job.categoryId, locale)}/><Meta icon="▣" value={shortDay(job.date, locale, t("jobs.today"))}/><Meta icon="◷" value={shortTime(job.date, locale)}/><Meta icon="€" value={money(job.budget)}/><Meta icon="♙" value={String(job.peopleNeeded)}/></div>
        <div className="mobile-job-description-row"><p>{job.description}</p>{badge ? <span className="mobile-job-badge">{badge}</span> : null}</div>
        {job.isEmergency ? <span className="urgent-badge mobile-job-urgent">{t("admin.priority.urgent")}</span> : null}
      </div>
      <Link className="mobile-job-card-link" href={detailHref} aria-label={t("admin.jobs.viewJob", { title: job.title })}/>
      {onDelete ? <button type="button" className="mobile-job-delete" aria-label={t("jobDetail.deleteLabel")} onClick={onDelete}>⌫</button> : null}
    </div>
  </article>;
}
