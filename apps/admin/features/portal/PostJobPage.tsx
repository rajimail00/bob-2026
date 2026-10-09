"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Category, Job } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";

const STEP_COUNT = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const categoryGlyphs: Record<string, string> = { "elderly-care": "♥", gastronomy: "♨", pets: "♞", beauty: "✦", assistance: "▣", education: "▤", transport: "➜", entertainment: "♫", cleaning: "✧", security: "◆", repair: "⚒", it: "⌘", gardening: "❧", childcare: "☺", handyman: "⌂" };
const stepLabels = ["Category", "Description", "Details", "Options", "Review"];

interface UploadedMedia { url: string; type: "photo" | "video" }
interface JobDraft {
  title: string; description: string; address: string; date: string; budget: string; peopleNeeded: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  paymentPreference: "cash" | "paypal" | "both";
  isEmergency: boolean;
}
const initialDraft: JobDraft = { title: "", description: "", address: "", date: "", budget: "", peopleNeeded: "1", recurrence: "none", paymentPreference: "cash", isEmergency: false };
function localDateTime(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }

export function PostJobPage({ jobId, mode = "create" }: { jobId?: string; mode?: "create" | "edit" | "repost" } = {}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [draft, setDraft] = useState<JobDraft>(initialDraft);
  const [coordinates, setCoordinates] = useState({ lng: 13.405, lat: 52.52 });
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("categories").then((data) => setCategories(data.categories)).catch(() => setError("Categories could not be loaded. Please refresh and try again."));
    if (jobId) apiFetch<{ job: Job }>(`jobs/${jobId}`).then(({ job }) => {
      setCategoryId(job.categoryId._id); setMedia(job.media); setCoordinates({ lng: job.location.coordinates[0], lat: job.location.coordinates[1] });
      setDraft({ title: job.title, description: job.description, address: job.address, date: mode === "repost" ? "" : localDateTime(job.date), budget: String(job.budget), peopleNeeded: String(job.peopleNeeded), recurrence: job.recurrence, paymentPreference: job.paymentPreference, isEmergency: job.isEmergency });
    }).catch(() => setError("This job could not be loaded."));
  }, [jobId, mode]);

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

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (position) => { setCoordinates({ lng: position.coords.longitude, lat: position.coords.latitude }); setError(""); },
      () => setError("Location permission was not granted. You can enter coordinates manually.")
    );
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
    <section className="portal-title-row" ref={titleRef}><div><span className="eyebrow">{mode === "edit" ? "Update opportunity" : mode === "repost" ? "Create another opportunity" : "Create an opportunity"}</span><h1>{mode === "edit" ? "Edit job" : mode === "repost" ? "Repost job" : "Post a job"}</h1><p>{mode === "repost" ? "Review the details and choose a new date before publishing." : "Tell nearby BOB workers what help you need."}</p></div></section>
    <ol className="mobile-post-progress" aria-label="Post a job progress">
      {stepLabels.map((label, index) => <li key={label} className={index === step ? "current" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? "✓" : index + 1}</span><small>{label}</small></li>)}
    </ol>

    <form ref={formRef} className="post-job-layout" onSubmit={submit}>
      <section className={`post-category-panel post-step ${step === 0 ? "post-step-active" : ""}`} data-post-step="0">
        <StepHeading number={1} title="What help do you need?" description="Select the category that best matches your job." />
        <div className="post-category-grid">{categories.map((category) => <button type="button" key={category._id} className={categoryId === category._id ? "selected" : ""} aria-pressed={categoryId === category._id} onClick={() => { setCategoryId(category._id); setError(""); }}>{category.imageUrl ? <img src={category.imageUrl} alt="" /> : <span>{categoryGlyphs[category.slug] ?? "•"}</span>}<strong>{localizedName(category)}</strong></button>)}</div>
      </section>

      <section className={`portal-form-card post-details-panel ${step === 0 ? "mobile-step-hidden" : ""}`}>
        <div className={`post-step ${step === 1 ? "post-step-active" : ""}`} data-post-step="1">
          <StepHeading number={2} title="Describe the job" description={selected ? `${localizedName(selected)} selected` : "Add a clear title and description."} />
          <div className="post-media-field"><span className="form-label">Photos or videos <small>(optional)</small></span><label className="post-media-picker"><input type="file" accept="image/*,video/*" multiple onChange={uploadMedia} disabled={uploading} /><span>{uploading ? "Uploading…" : "+ Add photos or videos"}</span></label>
            {media.length ? <div className="post-media-preview">{media.map((item, index) => <div key={`${item.url}-${index}`}>{item.type === "photo" ? <img src={item.url} alt={`Job upload ${index + 1}`} /> : <video src={item.url} muted />}<button type="button" aria-label={`Remove upload ${index + 1}`} onClick={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div> : null}
          </div>
          <div className="form-grid"><label className="full"><span>Job title</span><input name="title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} minLength={3} maxLength={120} required placeholder="Example: Help moving a sofa" /></label><label className="full"><span>Description</span><textarea name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} minLength={10} maxLength={1000} required placeholder="Describe the work and anything the worker should know." /></label></div>
        </div>

        <div className={`post-step ${step === 2 ? "post-step-active" : ""}`} data-post-step="2">
          <StepHeading number={3} title="When and where?" description="Add the schedule, location and job size." />
          <div className="form-grid">
            <label className="full"><span>Address</span><input name="address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} required placeholder="Street, city or meeting point" /></label>
            <label><span>Date and time</span><input name="date" type="datetime-local" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} required /></label>
            <label><span>People needed</span><input name="peopleNeeded" type="number" min="1" max="15" value={draft.peopleNeeded} onChange={(event) => updateDraft("peopleNeeded", event.target.value)} required /></label>
            <label><span>Budget</span><input name="budget" type="number" min="1" step="1" value={draft.budget} onChange={(event) => updateDraft("budget", event.target.value)} required /></label>
            <div className="full"><span className="form-label">Location coordinates</span><div className="coordinate-row"><input aria-label="Longitude" type="number" step="any" value={coordinates.lng} onChange={(event) => setCoordinates({ ...coordinates, lng: Number(event.target.value) })} /><input aria-label="Latitude" type="number" step="any" value={coordinates.lat} onChange={(event) => setCoordinates({ ...coordinates, lat: Number(event.target.value) })} /><button type="button" className="button button-secondary" onClick={locate}>Use my location</button></div></div>
          </div>
        </div>

        <div className={`post-step ${step === 3 ? "post-step-active" : ""}`} data-post-step="3">
          <StepHeading number={4} title="Job options" description="Choose recurrence, payment and urgency." />
          <div className="form-grid"><label><span>Recurrence</span><select name="recurrence" value={draft.recurrence} onChange={(event) => updateDraft("recurrence", event.target.value as JobDraft["recurrence"])}><option value="none">One time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label><span>Payment preference</span><select name="paymentPreference" value={draft.paymentPreference} onChange={(event) => updateDraft("paymentPreference", event.target.value as JobDraft["paymentPreference"])}><option value="cash">Cash</option><option value="paypal">PayPal</option><option value="both">Cash or PayPal</option></select></label><label className="checkbox-label full"><input name="isEmergency" type="checkbox" checked={draft.isEmergency} onChange={(event) => updateDraft("isEmergency", event.target.checked)} /><span>This is an urgent job</span></label></div>
        </div>

        <div className={`post-step post-review-step ${step === 4 ? "post-step-active" : ""}`} data-post-step="4">
          <StepHeading number={5} title="Review your job" description="Check everything before publishing." />
          {media.length ? <div className="post-review-media">{media[0].type === "photo" ? <img src={media[0].url} alt="Job preview" /> : <video src={media[0].url} controls />}</div> : null}
          <span className="job-category">{selected ? localizedName(selected) : "No category selected"}</span><h2 className="post-review-title">{draft.title || "Untitled job"}</h2><p className="post-review-description">{draft.description || "No description added."}</p>
          <dl className="post-review-facts"><div><dt>Budget</dt><dd>€{Number(draft.budget || 0).toLocaleString()}</dd></div><div><dt>Date</dt><dd>{draft.date ? new Date(draft.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not set"}</dd></div><div><dt>People</dt><dd>{draft.peopleNeeded}</dd></div><div><dt>Payment</dt><dd>{draft.paymentPreference === "both" ? "Cash or PayPal" : draft.paymentPreference}</dd></div></dl>
          <p className="post-review-address">⌖ {draft.address || "No address added"}</p>{draft.isEmergency ? <span className="urgent-badge">Urgent</span> : null}
        </div>

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="portal-form-actions desktop-post-actions"><button type="button" className="button button-secondary" onClick={() => router.back()}>Cancel</button><button className="button button-primary" disabled={loading || uploading || !categoryId}>{loading ? "Saving…" : mode === "edit" ? "Save changes" : mode === "repost" ? "Repost job" : "Publish job"}</button></div>
      </section>

      {step === 0 && error ? <div className="form-error mobile-category-error" role="alert">{error}</div> : null}
      <div className="mobile-wizard-actions"><div>{step > 0 ? <button type="button" className="button button-secondary" onClick={goBack}>Back</button> : null}{step < STEP_COUNT - 1 ? <button type="button" className="button button-primary" onClick={goNext}>Continue</button> : <button type="submit" className="button button-primary" disabled={loading || uploading}>{loading ? "Saving…" : mode === "edit" ? "Save changes" : mode === "repost" ? "Repost job" : "Publish job"}</button>}</div></div>
    </form>
  </>;
}

function StepHeading({ number, title, description }: { number: number; title: string; description: string }) {
  return <div className="post-section-heading"><span>Step {number}</span><div><h2>{title}</h2><p>{description}</p></div></div>;
}
