export function PortalState({ title, message, error = false }: { title: string; message?: string; error?: boolean }) {
  return <div className={`portal-state ${error ? "error" : ""}`}><strong>{title}</strong>{message ? <p>{message}</p> : null}</div>;
}
