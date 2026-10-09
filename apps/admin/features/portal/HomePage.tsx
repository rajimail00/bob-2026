"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, queryString } from "@/lib/api-client";
import type { Category, JobListResponse } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";
import { JobCard } from "@/components/portal/JobCard";
import { PortalState } from "@/components/portal/PortalState";
import { GoogleJobMap } from "@/components/portal/GoogleJobMap";

type ViewMode = "map" | "list";
interface Filters { categoryIds: string[]; minBudget: number; maxBudget: number; peopleNeeded: string }
const defaults: Filters = { categoryIds: [], minBudget: 0, maxBudget: 1000, peopleNeeded: "" };

export function HomePage({ locale = "en" }: { locale?: string }) {
  const [jobs, setJobs] = useState<JobListResponse | null>(null); const [categories, setCategories] = useState<Category[]>([]); const [search, setSearch] = useState(""); const [view, setView] = useState<ViewMode>("map"); const [filtersOpen, setFiltersOpen] = useState(false); const [filters, setFilters] = useState<Filters>(defaults); const [radiusKm, setRadiusKm] = useState(18); const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null); const [locationState, setLocationState] = useState<"loading" | "granted" | "denied">("loading"); const [error, setError] = useState("");

  async function load(next = filters, location = coords) {
    setError("");
    try {
      const result = await apiFetch<JobListResponse>(`jobs${queryString({ search: search || undefined, categoryId: next.categoryIds.length ? next.categoryIds.join(",") : undefined, minBudget: next.minBudget > 0 ? next.minBudget : undefined, maxBudget: next.maxBudget < 1000 ? next.maxBudget : undefined, peopleNeeded: next.peopleNeeded || undefined, lng: location?.lng, lat: location?.lat, radiusKm: location ? radiusKm : undefined, pageSize: 50 })}`);
      setJobs(result);
    } catch (value) { setError(value instanceof Error ? value.message : "Could not load jobs."); }
  }
  useEffect(() => { apiFetch<{ categories: Category[] }>("categories").then((data) => setCategories(data.categories)).catch(() => undefined); if (!navigator.geolocation) { setLocationState("denied"); void load(defaults, null); return; } navigator.geolocation.getCurrentPosition((position) => { const location = { lat: position.coords.latitude, lng: position.coords.longitude }; setCoords(location); setLocationState("granted"); void load(defaults, location); }, () => { setLocationState("denied"); void load(defaults, null); }, { enableHighAccuracy: true, timeout: 10000 }); }, []);
  function submit(event: FormEvent) { event.preventDefault(); void load(); }
  function toggleCategory(id: string) { setFilters((current) => ({ ...current, categoryIds: current.categoryIds.includes(id) ? current.categoryIds.filter((value) => value !== id) : [...current.categoryIds, id] })); }
  function applyFilters() { setFiltersOpen(false); void load(); }
  function clearFilters() { setFilters(defaults); setFiltersOpen(false); void load(defaults); }
  const activeFilters = filters.categoryIds.length + (filters.minBudget > 0 || filters.maxBudget < 1000 ? 1 : 0) + (filters.peopleNeeded ? 1 : 0);

  return <>
    <section className="discover-toolbar"><div><span className="eyebrow">Discover</span><h1>Find help near you</h1><p>Explore available BOB jobs using the same map, filters and list workflow as the mobile app.</p></div><a className="button button-primary" href="/portal/post-job">Post a job</a></section>
    <form className="discover-controls" onSubmit={submit}><input aria-label="Search jobs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs or services"/><button type="button" className={`button button-secondary ${activeFilters ? "filter-active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}>Filters{activeFilters ? ` (${activeFilters})` : ""}</button><div className="view-switch" aria-label="View mode"><button type="button" className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Map</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button></div><button className="button button-primary">Search</button></form>
    {filtersOpen ? <section className="discover-filters"><div className="filter-heading"><div><h2>Filter jobs</h2><p>Choose the same discovery options available in the mobile portal.</p></div><button className="text-button" type="button" onClick={clearFilters}>Clear all</button></div><div className="filter-category-grid">{categories.map((category) => <button type="button" key={category._id} className={filters.categoryIds.includes(category._id) ? "selected" : ""} onClick={() => toggleCategory(category._id)}>{category.imageUrl ? <img src={category.imageUrl} alt=""/> : <span>{localizedName(category, locale).slice(0,1)}</span>}<b>{localizedName(category, locale)}</b></button>)}</div><div className="filter-fields"><label><span>Minimum budget</span><input type="number" min="0" max="1000" value={filters.minBudget} onChange={(event) => setFilters({ ...filters, minBudget: Number(event.target.value) })}/></label><label><span>Maximum budget</span><input type="number" min="0" max="1000" value={filters.maxBudget} onChange={(event) => setFilters({ ...filters, maxBudget: Number(event.target.value) })}/></label><label><span>People needed</span><input type="number" min="1" max="15" value={filters.peopleNeeded} onChange={(event) => setFilters({ ...filters, peopleNeeded: event.target.value })}/></label><button type="button" className="button button-primary" onClick={applyFilters}>Apply filters</button></div></section> : null}
    {locationState === "granted" ? <div className="radius-control"><span>Search radius</span><input type="range" min="1" max="50" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} onMouseUp={() => void load()} onTouchEnd={() => void load()}/><strong>{radiusKm} km</strong></div> : <div className="location-note">Location access is unavailable. Showing jobs without a distance filter.</div>}
    <div className="discover-result-bar"><div><h2>{view === "map" ? "Map view" : "Available jobs"}</h2><p>{jobs ? `${jobs.total} opportunities found` : "Loading opportunities…"}</p></div></div>
    {error ? <PortalState error title="Jobs could not be loaded" message={error}/> : !jobs ? <PortalState title="Loading jobs…"/> : view === "map" ? <GoogleJobMap jobs={jobs.items} userCoords={coords}/> : jobs.items.length === 0 ? <PortalState title="No jobs found" message="Try a wider radius or different filters."/> : <div className="portal-job-grid">{jobs.items.map((job) => <JobCard key={job._id} job={job} locale={locale}/>)}</div>}
  </>;
}
