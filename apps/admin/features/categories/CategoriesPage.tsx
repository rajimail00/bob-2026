"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, LoadingState, PageIntro, SearchField } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import type { Category, LocalizedText } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";

const emptyNames: LocalizedText = { en: "", de: "", es: "", fr: "" };
interface CategoryDraft { slug: string; icon: string; imageUrl: string; order: number; name: LocalizedText }

export function CategoriesPage() {
  const query = useRemoteData<{ categories: Category[] }>("admin/categories");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<CategoryDraft>({ slug: "", icon: "briefcase-outline", imageUrl: "", order: 0, name: emptyNames });
  const categories = useMemo(() => (query.data?.categories ?? []).filter((item) => `${item.name.en} ${item.name.de} ${item.slug}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);

  function open(item?: Category) {
    setEditing(item ?? "new");
    setDraft(item ? { slug: item.slug, icon: item.icon, imageUrl: item.imageUrl ?? "", order: item.order, name: { ...item.name } } : { slug: "", icon: "briefcase-outline", imageUrl: "", order: query.data?.categories.length ?? 0, name: { ...emptyNames } });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const body = { slug: draft.slug.trim(), icon: draft.icon.trim(), imageUrl: draft.imageUrl.trim() || null, order: Number(draft.order), name: Object.fromEntries(Object.entries(draft.name).map(([key, value]) => [key, value.trim()])) };
    try {
      if (editing === "new") await apiFetch("admin/categories", { method: "POST", body: JSON.stringify(body) });
      else if (editing) await apiFetch(`admin/categories/${editing._id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditing(null); await query.reload();
    } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to save this category."); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { window.alert("Choose a JPG, PNG, or other image file."); return; }
    setUploading(true);
    try { const form = new FormData(); form.append("file", file); const media = await apiFetch<{ url: string }>("media", { method: "POST", body: form }); setDraft((value) => ({ ...value, imageUrl: media.url })); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(false); }
  }

  async function remove(item: Category) {
    if (!window.confirm(`Delete “${item.name.en}”? Existing jobs may still reference this category.`)) return;
    try { await apiFetch(`admin/categories/${item._id}`, { method: "DELETE" }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to delete this category."); }
  }

  async function move(item: Category, direction: -1 | 1) {
    if (!query.data) return;
    const ordered = [...query.data.categories].sort((a,b) => a.order - b.order);
    const index = ordered.findIndex((entry) => entry._id === item._id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await apiFetch("admin/categories/reorder", { method: "PATCH", body: JSON.stringify({ items: ordered.map((entry, order) => ({ id: entry._id, order })) }) }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to reorder categories."); }
  }

  return <>
    <PageIntro title="Categories" description="Manage the multilingual services available when customers post jobs." action={<button className="button button-primary" onClick={() => open()}><Icon name="plus" size={17} />Add category</button>} />
    <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search categories" /></div>
    <section className="card">{query.loading ? <LoadingState label="Loading categories…" /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !categories.length ? <EmptyState title="No categories found" /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Category</th><th>Slug</th><th>Icon</th><th>Translations</th><th /></tr></thead><tbody>{categories.sort((a,b) => a.order - b.order).map((item, index) => <tr key={item._id}><td><div className="table-actions" style={{ justifyContent: "flex-start" }}><button className="button button-secondary button-small" disabled={index === 0} onClick={() => move(item,-1)} aria-label={`Move ${item.name.en} up`}>↑</button><button className="button button-secondary button-small" disabled={index === categories.length - 1} onClick={() => move(item,1)} aria-label={`Move ${item.name.en} down`}>↓</button></div></td><td><div className="table-primary"><strong>{item.name.en}</strong><small>{item.imageUrl ? "Custom image" : "Icon fallback"}</small></div></td><td>{item.slug}</td><td>{item.icon}</td><td>EN · DE · ES · FR</td><td><div className="table-actions"><button className="button button-secondary button-small" onClick={() => open(item)}><Icon name="edit" size={14} />Edit</button><button className="button button-danger button-small" onClick={() => remove(item)}><Icon name="trash" size={14} />Delete</button></div></td></tr>)}</tbody></table></div>}</section>
    {editing ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="category-modal-title"><div className="modal-header"><h3 id="category-modal-title">{editing === "new" ? "Add category" : "Edit category"}</h3><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><Icon name="close" /></button></div><div className="modal-body form-grid">
      <label><span>English name</span><input value={draft.name.en} onChange={(event) => setDraft((value) => ({ ...value, name: { ...value.name, en: event.target.value } }))} required /></label>
      <label><span>German name</span><input value={draft.name.de} onChange={(event) => setDraft((value) => ({ ...value, name: { ...value.name, de: event.target.value } }))} required /></label>
      <label><span>Spanish name</span><input value={draft.name.es} onChange={(event) => setDraft((value) => ({ ...value, name: { ...value.name, es: event.target.value } }))} required /></label>
      <label><span>French name</span><input value={draft.name.fr} onChange={(event) => setDraft((value) => ({ ...value, name: { ...value.name, fr: event.target.value } }))} required /></label>
      <label><span>Unique slug</span><input value={draft.slug} onChange={(event) => setDraft((value) => ({ ...value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-") }))} placeholder="home-cleaning" pattern="[a-z0-9-]+" required /></label>
      <label><span>Icon name</span><input value={draft.icon} onChange={(event) => setDraft((value) => ({ ...value, icon: event.target.value }))} placeholder="briefcase-outline" required /></label>
      <label><span>Display order</span><input type="number" min="0" value={draft.order} onChange={(event) => setDraft((value) => ({ ...value, order: Number(event.target.value) }))} required /></label>
      <label><span>Category image</span><input type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} disabled={uploading} /><p className="form-help">{uploading ? "Uploading…" : "Maximum upload size: 10 MB"}</p></label>
      {draft.imageUrl ? <div className="full"><img className="image-preview" src={draft.imageUrl} alt="Category preview" /> <button type="button" className="text-button" onClick={() => setDraft((value) => ({ ...value, imageUrl: "" }))}>Remove image</button></div> : null}
    </div><div className="modal-footer"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={busy || uploading}>{busy ? "Saving…" : "Save category"}</button></div></form></div> : null}
  </>;
}
