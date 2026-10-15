"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Category, Job } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";
import { usePortalI18n } from "@/lib/portal-i18n";
import { PostLocationPickerMap } from "@/components/portal/PostLocationPickerMap";

const STEP_COUNT = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const recurrenceOptions: JobDraft["recurrence"][] = ["none", "daily", "weekly", "monthly"];
const paymentOptions: JobDraft["paymentPreference"][] = ["cash", "paypal", "both"];
const categoryGlyphs: Record<string, string> = { "elderly-care": "♥", gastronomy: "♨", pets: "♞", beauty: "✦", assistance: "▣", education: "▤", transport: "➜", entertainment: "♫", cleaning: "✧", security: "◆", repair: "⚒", it: "⌘", gardening: "❧", childcare: "☺", handyman: "⌂" };

interface UploadedMedia { url: string; type: "photo" | "video" }
interface JobDraft {
  title: string; description: string; address: string; date: string; budget: string; peopleNeeded: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  paymentPreference: "cash" | "paypal" | "both";
  isEmergency: boolean;
}
const initialDraft: JobDraft = { title: "", description: "", address: "", date: "", budget: "", peopleNeeded: "1", recurrence: "none", paymentPreference: "cash", isEmergency: false };
function localDateTime(value: string | Date) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }

export function PostJobPage({ jobId, mode = "create" }: { jobId?: string; mode?: "create" | "edit" | "repost" } = {}) {
  const { t, date, money, locale } = usePortalI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const customDateRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [draft, setDraft] = useState<JobDraft>(initialDraft);
  const [coordinates, setCoordinates] = useState({ lng: 13.405, lat: 52.52 });
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const stepLabels = [t("profileFlow.categories"), t("postJob.describeHeading"), t("postJob.whenWhereHeading"), t("postJob.optionsHeading"), t("postJob.reviewHeading")];

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("categories").then((data) => setCategories(data.categories)).catch(() => setError("Categories could not be loaded. Please refresh and try again."));
    if (jobId) apiFetch<{ job: Job }>(`jobs/${jobId}`).then(({ job }) => {
      setCategoryId(job.categoryId._id); setMedia(job.media); setCoordinates({ lng: job.location.coordinates[0], lat: job.location.coordinates[1] });
      setDraft({ title: job.title, description: job.description, address: job.address, date: mode === "repost" ? "" : localDateTime(job.date), budget: String(job.budget), peopleNeeded: String(job.peopleNeeded), recurrence: job.recurrence, paymentPreference: job.paymentPreference, isEmergency: job.isEmergency });
    }).catch(() => setError("This job could not be loaded."));
  }, [jobId, mode]);

  useEffect(() => {
    if (!jobId) setDraft((current) => current.date ? current : { ...current, date: localDateTime(new Date(Date.now() + 60 * 60 * 1000)) });
    if (!jobId && navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude }), () => undefined, { enableHighAccuracy: true, timeout: 10000 });
  }, [jobId]);

  const selected = categories.find((category) => category._id === categoryId);
  const updateDraft = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const scrollToTop = () => requestAnimationFrame(() => titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  function validateStep(currentStep: number) {
    if (currentStep === 0 && !categoryId) { setError("Choose a category to continue."); return false; }
    const section = formRef.current?.querySelector<HTMLElement>(`[data-post-step="${currentStep}"]`);
    const fields = section?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    for (const field of fields ?? []) {
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    setError("");
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEP_COUNT - 1));
    scrollToTop();
  }
  function goBack() { setError(""); setStep((current) => Math.max(current - 1, 0)); scrollToTop(); }

  function chooseDay(offset: 0 | 1) {
    const current = draft.date ? new Date(draft.date) : new Date();
    const next = new Date();
    next.setDate(next.getDate() + offset);
    next.setHours(current.getHours(), current.getMinutes(), 0, 0);
    updateDraft("date", localDateTime(next));
  }

  function chooseCustomDate(value: string) {
    if (!value) return;
    const current = draft.date ? new Date(draft.date) : new Date();
    const [year, month, day] = value.split("-").map(Number);
    current.setFullYear(year, month - 1, day);
    updateDraft("date", localDateTime(current));
  }

  function chooseTime(value: string) {
    if (!value) return;
    const current = draft.date ? new Date(draft.date) : new Date();
    const [hours, minutes] = value.split(":").map(Number);
    current.setHours(hours, minutes, 0, 0);
    updateDraft("date", localDateTime(current));
  }

  function dayChoice() {
    if (!draft.date) return "custom";
    const selectedDate = new Date(draft.date); selectedDate.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const delta = Math.round((selectedDate.getTime() - today.getTime()) / 86400000);
    return delta === 0 ? "today" : delta === 1 ? "tomorrow" : "custom";
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const photos = media.filter((item) => item.type === "photo").length + files.filter((file) => file.type.startsWith("image/")).length;
    const videos = media.filter((item) => item.type === "video").length + files.filter((file) => file.type.startsWith("video/")).length;
    if (photos > 5 || videos > 2) { setError("You can add up to 5 photos and 2 videos."); return; }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) { setError("Each photo or video must be 10 MB or smaller."); return; }
    setUploading(true); setError("");
    try {
      const uploaded: UploadedMedia[] = [];
      for (const file of files) {
        const body = new FormData(); body.append("file", file);
        uploaded.push(await apiFetch<UploadedMedia>("media", { method: "POST", body }));
      }
      setMedia((current) => [...current, ...uploaded]);
    } catch (value) { setError(value instanceof Error ? value.message : "Could not upload the selected media."); }
    finally { setUploading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId) { setStep(0); setError("Choose a category before publishing the job."); return; }
    if (uploading) { setError("Please wait for your media to finish uploading."); return; }
    setLoading(true); setError("");
    try {
      const endpoint = mode === "edit" && jobId ? `jobs/${jobId}` : mode === "repost" && jobId ? `jobs/${jobId}/repost` : "jobs";
      const method = mode === "edit" ? "PATCH" : "POST";
      const data = await apiFetch<{ job: Job }>(endpoint, { method, body: JSON.stringify({
          categoryId, title: draft.title.trim(), description: draft.description.trim(), media, location: coordinates,
        address: draft.address.trim(), date: new Date(draft.date).toISOString(), peopleNeeded: Number(draft.peopleNeeded),
        budget: Number(draft.budget), recurrence: draft.recurrence, isEmergency: draft.isEmergency, paymentPreference: draft.paymentPreference,
      }) });
      router.push(`/portal/jobs/${data.job._id}`);
    } catch (value) { setError(value instanceof Error ? value.message : "Could not post the job."); setLoading(false); }
  }

  return <>
    <section className="portal-title-row" ref={titleRef}><div><span className="eyebrow">{t("navigation.post")}</span><h1>{mode === "edit" ? t("jobEditing.title") : mode === "repost" ? t("jobReposting.action") : t("navigation.post")}</h1><p>{mode === "repost" ? t("jobReposting.confirmBody") : t("postJob.helpHeading")}</p></div></section>
    <ol className="mobile-post-progress" aria-label="Post a job progress">
      {stepLabels.map((label, index) => <li key={label} className={index === step ? "current" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? "✓" : index + 1}</span><small>{label}</small></li>)}
    </ol>

    <form ref={formRef} className="post-job-layout" onSubmit={submit}>
      <section className={`post-category-panel post-step ${step === 0 ? "post-step-active" : ""}`} data-post-step="0">
        <StepHeading number={1} title={t("postJob.helpHeading")} description={t("workerProfile.chooseCategories", { count: 1 })} />
        <div className="post-category-grid">{categories.map((category) => <button type="button" key={category._id} className={categoryId === category._id ? "selected" : ""} aria-pressed={categoryId === category._id} onClick={() => { setCategoryId(category._id); setError(""); }}>{category.imageUrl ? <img src={category.imageUrl} alt="" /> : <span>{categoryGlyphs[category.slug] ?? "•"}</span>}<strong>{localizedName(category, locale)}</strong></button>)}</div>
      </section>

      <section className={`portal-form-card post-details-panel ${step === 0 ? "mobile-step-hidden" : ""}`}>
        <div className={`post-step ${step === 1 ? "post-step-active" : ""}`} data-post-step="1">
          <StepHeading number={2} title={t("postJob.describeHeading")} description={selected ? localizedName(selected, locale) : t("postJob.descriptionLabel")} />
          <div className="post-media-field"><span className="form-label">{t("postJob.mediaOptional")}</span><label className="post-media-picker"><input type="file" accept="image/*,video/*" multiple onChange={uploadMedia} disabled={uploading} /><span>{uploading ? t("common.loading") : t("postJob.mediaOptional")}</span></label>
            {media.length ? <div className="post-media-preview">{media.map((item, index) => <div key={`${item.url}-${index}`}>{item.type === "photo" ? <img src={item.url} alt={`Job upload ${index + 1}`} /> : <video src={item.url} muted />}<button type="button" aria-label={`Remove upload ${index + 1}`} onClick={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div> : null}
          </div>
          <div className="form-grid"><label className="full"><span>{t("postJob.titleLabel")}</span><input name="title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} minLength={3} maxLength={120} required /></label><label className="full"><span>{t("postJob.descriptionLabel")}</span><textarea name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} minLength={10} maxLength={1000} required /></label></div>
        </div>

        <div className={`post-step when-where-step ${step === 2 ? "post-step-active" : ""}`} data-post-step="2">
          <StepHeading number={3} title={t("postJob.whenWhereHeading")} description={t("postJob.addressLabel")} />
          <div className="when-where-fields">
            <div className="post-date-field"><span className="form-label">{t("postJob.dateLabel")}</span><div className="post-date-row"><div className="post-day-tabs"><button type="button" className={dayChoice() === "today" ? "selected" : ""} onClick={() => chooseDay(0)}>{t("postJob.today")}</button><button type="button" className={dayChoice() === "tomorrow" ? "selected" : ""} onClick={() => chooseDay(1)}>{t("postJob.tomorrow")}</button></div><label className={dayChoice() === "custom" ? "post-pick-date selected" : "post-pick-date"}>{dayChoice() === "custom" && draft.date ? date(draft.date, { month: "short", day: "numeric" }) : t("postJob.pickDate")}<input ref={customDateRef} type="date" min={localDateTime(new Date()).slice(0, 10)} value={draft.date.slice(0, 10)} onChange={(event) => chooseCustomDate(event.target.value)}/></label></div></div>
            <label className="post-time-field"><span>{t("postJob.timeLabel")}</span><input type="time" value={draft.date.slice(11, 16)} onChange={(event) => chooseTime(event.target.value)} required /></label>
            <input className="post-datetime-value" name="date" type="datetime-local" value={draft.date} readOnly required tabIndex={-1}/>
            <div className="post-address-field"><span className="form-label">{t("postJob.addressLabel")}</span><PostLocationPickerMap coordinates={coordinates} address={draft.address} onChange={(next) => { setCoordinates(next.coords); updateDraft("address", next.address); }}/></div>
            <div className="post-people-field"><span className="form-label">{t("postJob.peopleNeeded")}</span><div className="post-number-stepper"><button type="button" aria-label={t("accessibility.decrease")} disabled={Number(draft.peopleNeeded) <= 1} onClick={() => updateDraft("peopleNeeded", String(Math.max(1, Number(draft.peopleNeeded) - 1)))}>−</button><strong>{draft.peopleNeeded}</strong><button type="button" aria-label={t("accessibility.increase")} disabled={Number(draft.peopleNeeded) >= 15} onClick={() => updateDraft("peopleNeeded", String(Math.min(15, Number(draft.peopleNeeded) + 1)))}>＋</button><input name="peopleNeeded" type="number" min="1" max="15" value={draft.peopleNeeded} readOnly required tabIndex={-1}/></div></div>
            <label className="post-budget-field"><span>{t("postJob.budgetLabel")}</span><input name="budget" type="number" min="1" step="1" value={draft.budget} onChange={(event) => updateDraft("budget", event.target.value)} required /></label>
          </div>
        </div>

        <div className={`post-step options-step ${step === 3 ? "post-step-active" : ""}`} data-post-step="3">
          <StepHeading number={4} title={t("postJob.optionsHeading")} description={t("postJob.recurrenceHeading")} />
          <div className="post-options-fields">
            <fieldset className="post-option-group"><legend>{t("postJob.recurrenceHeading")}</legend><div>{recurrenceOptions.map((option) => <button type="button" key={option} className={draft.recurrence === option ? "selected" : ""} aria-pressed={draft.recurrence === option} onClick={() => updateDraft("recurrence", option)}>{t(`postJob.recurrence.${option}`)}</button>)}</div></fieldset>
            <fieldset className="post-option-group"><legend>{t("postJob.paymentHeading")}</legend><div>{paymentOptions.map((option) => <button type="button" key={option} className={draft.paymentPreference === option ? "selected" : ""} aria-pressed={draft.paymentPreference === option} onClick={() => updateDraft("paymentPreference", option)}>{t(`postJob.payment.${option}`)}</button>)}</div></fieldset>
            <button type="button" className="post-emergency-toggle" role="switch" aria-checked={draft.isEmergency} onClick={() => updateDraft("isEmergency", !draft.isEmergency)}><span>{t("postJob.emergency")}</span><i className={draft.isEmergency ? "active" : ""}><b/></i></button>
          </div>
        </div>

        <div className={`post-step post-review-step ${step === 4 ? "post-step-active" : ""}`} data-post-step="4">
          <StepHeading number={5} title={t("postJob.reviewHeading")} description={t("postJob.reviewHeading")} />
          {media.length ? <div className="post-review-media">{media[0].type === "photo" ? <img src={media[0].url} alt="Job preview" /> : <video src={media[0].url} controls />}</div> : null}
          <span className="job-category">{selected ? localizedName(selected) : "No category selected"}</span><h2 className="post-review-title">{draft.title || "Untitled job"}</h2><p className="post-review-description">{draft.description || "No description added."}</p>
          <dl className="post-review-facts"><div><dt>{t("home.budget")}</dt><dd>{money(Number(draft.budget || 0))}</dd></div><div><dt>{t("postJob.dateLabel")}</dt><dd>{draft.date ? date(draft.date, { dateStyle: "medium", timeStyle: "short" }) : t("profileFlow.notAvailable")}</dd></div><div><dt>{t("home.people")}</dt><dd>{draft.peopleNeeded}</dd></div><div><dt>{t("postJob.paymentHeading")}</dt><dd>{t(`postJob.payment.${draft.paymentPreference}`)}</dd></div></dl>
          <p className="post-review-address">⌖ {draft.address || t("profileFlow.notAvailable")}</p>{draft.isEmergency ? <span className="urgent-badge">{t("postJob.emergency")}</span> : null}
        </div>

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="portal-form-actions desktop-post-actions"><button type="button" className="button button-secondary" onClick={() => router.back()}>{t("common.cancel")}</button><button className="button button-primary" disabled={loading || uploading || !categoryId}>{loading ? t("common.loading") : mode === "edit" ? t("jobEditing.saveChanges") : mode === "repost" ? t("jobReposting.publish") : t("postJob.publish")}</button></div>
      </section>

      {step === 0 && error ? <div className="form-error mobile-category-error" role="alert">{error}</div> : null}
      <div className="mobile-wizard-actions"><div>{step > 0 ? <button type="button" className="button button-secondary" onClick={goBack}>{t("common.back")}</button> : null}{step < STEP_COUNT - 1 ? <button type="button" className="button button-primary" onClick={goNext}>{t("common.continue")}</button> : <button type="submit" className="button button-primary" disabled={loading || uploading}>{loading ? t("common.loading") : mode === "edit" ? t("jobEditing.saveChanges") : mode === "repost" ? t("jobReposting.publish") : t("postJob.publish")}</button>}</div></div>
    </form>
  </>;
}

function StepHeading({ number, title, description }: { number: number; title: string; description: string }) {
  return <div className="post-section-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>;
}
