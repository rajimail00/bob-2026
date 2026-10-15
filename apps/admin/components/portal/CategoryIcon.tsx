import type { ReactNode } from "react";

const categoryPaths: Record<string, ReactNode> = {
  "elderly-care": <path d="M12 20S4 15.7 4 9.7A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 8 1.9C20 15.7 12 20 12 20Z"/>,
  gastronomy: <><path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11M14 3v8c0 1.7 1.3 3 3 3h1V3M18 14v7"/></>,
  pets: <><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="4.5" cy="12" r="1.7"/><circle cx="19.5" cy="12" r="1.7"/><path d="M7 17c0-3 2.2-5 5-5s5 2 5 5c0 2-1.4 3-3 2.2a4.2 4.2 0 0 0-4 0C8.4 20 7 19 7 17Z"/></>,
  beauty: <><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3ZM6 13l.9 2.1L9 16l-2.1.9L6 19l-.9-2.1L3 16l2.1-.9L6 13ZM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9L18 13Z"/></>,
  assistance: <><rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  education: <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="m7 12v5c3 2 7 2 10 0v-5M21 9v6"/></>,
  transport: <><path d="m5 16-1 2v2h2l1-2h10l1 2h2v-2l-1-2-2-7H7l-2 7Z"/><path d="M6 13h12M8 16h.01M16 16h.01"/></>,
  entertainment: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14a3 3 0 0 1 3-3v7a3 3 0 0 1-3-3v-1ZM20 14a3 3 0 0 0-3-3v7a3 3 0 0 0 3-3v-1Z"/></>,
  cleaning: <><path d="m14 4 6 6M12.5 5.5l2-2a2.1 2.1 0 0 1 3 3l-2 2M13 8 4 17l3 3 9-9"/><path d="m4 17-1 4 4-1"/></>,
  security: <><path d="M12 3 4.5 6v5c0 4.8 3.2 8.3 7.5 10 4.3-1.7 7.5-5.2 7.5-10V6L12 3Z"/><path d="m9 12 2 2 4-5"/></>,
  repair: <><path d="m14 6 4-3 3 3-3 4M13 7l4 4M4 20l7-7M5 4l3 3-2 2-3-3 2-2ZM15 13l6 6-2 2-6-6"/></>,
  it: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  gardening: <><path d="M20 4C11 4 5 8 5 15c5 1 11-1 15-11Z"/><path d="M4 20c3-5 7-8 12-11"/></>,
  childcare: <><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8 14c1 2 2.4 3 4 3s3-1 4-3"/></>,
  handyman: <><path d="m14 5 5 5M13 6l3-3 5 5-3 3M15 9 6 18M4 17l3 3M3 21l3-3"/></>,
};

export function CategoryIcon({ slug, size = 30 }: { slug: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{categoryPaths[slug] ?? <circle cx="12" cy="12" r="7"/>}</svg>;
}
