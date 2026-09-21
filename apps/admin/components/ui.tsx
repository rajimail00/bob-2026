"use client";

import { Icon } from "./Icon";

export function StatusPill({ value }: { value: string }) {
  const tone = ["active", "approved", "completed", "resolved"].includes(value) ? "success" : ["banned", "rejected", "cancelled", "urgent"].includes(value) ? "danger" : ["pending", "in_progress", "scheduled", "high"].includes(value) ? "warning" : "neutral";
  return <span className={`status-pill ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return <div className="state-card"><span className="spinner" /><p>{label}</p></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-card state-error"><strong>Something went wrong</strong><p>{message}</p>{retry ? <button className="button button-secondary" onClick={retry}>Try again</button> : null}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className="state-card"><strong>{title}</strong>{detail ? <p>{detail}</p> : null}</div>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="search-field"><Icon name="search" size={18} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination"><span>Page {page} of {pages} · {total} results</span><div><button className="button button-secondary button-small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button className="button button-secondary button-small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div></div>;
}

export function PageIntro({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function formatName(person?: { firstName?: string; lastName?: string; email?: string }) {
  if (!person) return "—";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Unknown";
}

export function formatDate(value?: string, includeTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }).format(value);
}
