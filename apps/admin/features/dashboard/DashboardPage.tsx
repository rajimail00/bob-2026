"use client";

import { useMemo, useState } from "react";
import { ErrorState, LoadingState, PageIntro } from "@/components/ui";
import { queryString } from "@/lib/api-client";
import type { AdminPeriod, DashboardData, Metric } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";

const metrics: { key: keyof DashboardData["metrics"]; label: string; suffix?: string }[] = [
  { key: "allUsers", label: "All users" }, { key: "activeUsers", label: "Active users" },
  { key: "averageTime", label: "Average activity", suffix: " min" }, { key: "jobPosts", label: "Job posts" },
  { key: "activeJobs", label: "Active jobs" }, { key: "supportTickets", label: "Support tickets" },
];

function Sparkline({ metric }: { metric: Metric }) {
  const max = Math.max(1, ...metric.series.map((point) => point.value));
  return <div className="sparkline" aria-hidden="true">{metric.series.slice(-12).map((point, index) => <i key={`${point.label}-${index}`} style={{ height: `${Math.max(8, point.value / max * 100)}%` }} />)}</div>;
}

export function DashboardPage() {
  const [period, setPeriod] = useState<AdminPeriod>("week");
  const { data, loading, error, reload } = useRemoteData<DashboardData>(`admin/dashboard${queryString({ period })}`);
  const maxActivity = useMemo(() => Math.max(1, ...(data?.activity.map((point) => point.value) ?? [1])), [data]);
  const statusTotal = data ? Object.values(data.statusBreakdown).reduce((sum, count) => sum + count, 0) || 1 : 1;

  return (
    <>
      <PageIntro title="Dashboard" description="A live overview of BOB users, jobs, activity and support." action={<select value={period} onChange={(event) => setPeriod(event.target.value as AdminPeriod)} aria-label="Dashboard period"><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option></select>} />
      {loading ? <LoadingState label="Loading dashboard…" /> : error ? <ErrorState message={error} retry={reload} /> : data ? (
        <>
          <section className="metrics-grid" aria-label="Dashboard metrics">
            {metrics.map(({ key, label, suffix }) => { const metric = data.metrics[key]; return (
              <article className="metric-card" key={key}><div className="metric-top"><span>{label}</span><span className="metric-compare">{metric.comparison === null ? "No comparison" : `${metric.comparison >= 0 ? "+" : ""}${metric.comparison}%`}</span></div><div className="metric-value">{metric.value ?? "—"}{metric.value !== null ? suffix : ""}</div><Sparkline metric={metric} /></article>
            ); })}
          </section>
          <section className="dashboard-grid">
            <article className="card"><div className="card-header"><div><h3>App activity</h3><p>Activity is calculated in {data.timezone}.</p></div></div><div className="card-body"><div className="chart-bars">{data.activity.length ? data.activity.map((point, index) => <div className="chart-column" key={`${point.label}-${index}`} title={`${point.label}: ${point.value}`}><i style={{ height: `${Math.max(3, point.value / maxActivity * 100)}%` }} /><small>{point.label}</small></div>) : <div className="state-card">No activity for this period.</div>}</div></div></article>
            <div className="section-stack">
              <article className="card"><div className="card-header"><div><h3>Job status</h3><p>Current operational breakdown</p></div></div><div className="card-body status-breakdown">{Object.entries(data.statusBreakdown).map(([label, count]) => <div className="status-row" key={label}><div><span style={{ textTransform: "capitalize" }}>{label}</span><strong>{count}</strong></div><span className="progress"><i style={{ width: `${count / statusTotal * 100}%` }} /></span></div>)}</div></article>
              <article className="card"><div className="card-header"><div><h3>Geographic activity</h3><p>Relative distribution of active coordinates</p></div></div><div className="card-body"><div className="geo-grid">{data.geo.slice(0, 30).map((point, index) => { const x = ((point.longitude + 180) / 360) * 100; const y = ((90 - point.latitude) / 180) * 100; const size = Math.min(38, 14 + point.count * 2); return <span key={`${point.latitude}-${point.longitude}-${index}`} className="geo-point" style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }} title={`${point.count} jobs at ${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}`}>{point.count}</span>; })}</div></div></article>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
