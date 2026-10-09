"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AdminConfiguration } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { ErrorState, LoadingState, PageIntro } from "@/components/ui";

export function AdminConfigurationPage() {
  const query = useRemoteData<{ config: AdminConfiguration }>("admin/configuration");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) { setSupportEmail(query.data.config.supportEmail ?? ""); setMaintenanceMessage(query.data.config.maintenanceMessage ?? ""); } }, [query.data]);
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); try { await apiFetch("admin/configuration", { method: "PATCH", body: JSON.stringify({ supportEmail, maintenanceMessage }) }); await query.reload(); } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to save configuration."); } finally { setBusy(false); } }
  return <><PageIntro title="Configuration" description="Manage safe application settings. Secrets are never shown here." />{query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : <form className="card native-settings-form" onSubmit={save}><div className="card-header"><div><h3>Safe settings</h3><p>These values are shared with the mobile administration workflow.</p></div></div><div className="card-body form-grid"><label className="full"><span>Support email</span><input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} /></label><label className="full"><span>Maintenance message</span><textarea value={maintenanceMessage} maxLength={1000} onChange={(event) => setMaintenanceMessage(event.target.value)} /></label><button className="button button-primary full" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div></form>}</>;
}
