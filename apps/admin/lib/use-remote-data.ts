"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api-client";

export function useRemoteData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await apiFetch<T>(path)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load data."); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
