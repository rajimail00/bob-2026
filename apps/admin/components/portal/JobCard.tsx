import Link from "next/link";
import type { Job } from "@/lib/portal-types";
import { formatMoney, localizedName } from "@/lib/portal-types";

function shortDay(value: string, locale: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? "Today"
    : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
}

function shortTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function preciseMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function Meta({ icon, value }: { icon: string; value: string }) {
  return <span className="mobile-job-meta"><i aria-hidden="true">{icon}</i>{value}</span>;
}

export function JobCard({ job, locale = "en", badge, chatHref, onDelete }: { job: Job; locale?: string; badge?: string; chatHref?: string; onDelete?: () => void }) {
  const detailHref = `/portal/jobs/${job._id}`;
  const thumbnail = job.media?.[0];
  return <article className="portal-job-card">
    <div className="job-card-desktop">
      <div className="job-card-top"><span className="job-category">{localizedName(job.categoryId, locale)}</span>{job.isEmergency ? <span className="urgent-badge">Urgent</span> : badge ? <span className="status-pill neutral">{badge}</span> : null}</div>
      <div><h3>{job.title}</h3><p>{job.description}</p></div>
      <dl className="job-facts"><div><dt>Budget</dt><dd>{formatMoney(job.budget)}</dd></div><div><dt>Date</dt><dd>{new Date(job.date).toLocaleDateString()}</dd></div><div><dt>People</dt><dd>{job.peopleNeeded}</dd></div></dl>
      <p className="job-address">{job.address}</p>
      <div className="job-card-actions"><Link className="button button-secondary" href={detailHref}>View details</Link>{chatHref ? <Link className="button button-primary" href={chatHref}>Messages</Link> : null}{onDelete ? <button type="button" className="button button-danger job-delete-button" onClick={onDelete}>Delete</button> : null}</div>
    </div>

    <div className={`job-card-mobile ${onDelete ? "has-delete" : ""}`}>
      {thumbnail ? <div className="mobile-job-media">{thumbnail.type === "photo" ? <img src={thumbnail.url} alt=""/> : <video src={thumbnail.url} muted preload="metadata"/>}{thumbnail.type === "video" ? <span className="mobile-video-play">▶</span> : null}</div> : null}
      <div className="mobile-job-body">
        <div className="mobile-job-title-row"><h3>{job.title}</h3><span className={`status-pill ${job.status === "active" ? "success" : "neutral"}`}>{job.status.replace("_", " ")}</span></div>
        <div className="mobile-job-metadata">
          <Meta icon="◇" value={localizedName(job.categoryId, locale)}/>
          <Meta icon="▣" value={shortDay(job.date, locale)}/>
          <Meta icon="◷" value={shortTime(job.date, locale)}/>
          <Meta icon="€" value={preciseMoney(job.budget, locale)}/>
          <Meta icon="♙" value={String(job.peopleNeeded)}/>
        </div>
        <div className="mobile-job-description-row"><p>{job.description}</p>{badge ? <span className="mobile-job-badge">{badge}</span> : null}</div>
        {job.isEmergency ? <span className="urgent-badge mobile-job-urgent">Urgent</span> : null}
      </div>
      <Link className="mobile-job-card-link" href={detailHref} aria-label={`View ${job.title}`}/>
      {onDelete ? <button type="button" className="mobile-job-delete" aria-label={`Delete ${job.title}`} onClick={onDelete}>⌫</button> : null}
    </div>
  </article>;
}
