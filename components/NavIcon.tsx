import type { ReactNode } from 'react';

const symbols: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  inventory: <><path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/></>,
  catalog: <><path d="M4 5a2 2 0 0 1 2-2h3l3 2 3-2h3a2 2 0 0 1 2 2v15h-5l-3 2-3-2H4Z"/><path d="M12 5v17M7 8h2M7 12h2M15 8h2M15 12h2"/></>,
  cocktails: <><path d="m3 4 9 10 9-10ZM12 14v7M7 21h10M7 8h10"/></>,
  shopping: <><path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/><path d="M8 11v1M16 11v1"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  logout: <><path d="M10 3H5v18h5M10 12h11m-4-4 4 4-4 4"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M5.5 8h1M5.5 11h1"/></>,
};
export function NavIcon({ name }: { name: string }) {
  return <svg className="nav-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{symbols[name] ?? symbols.overview}</svg>;
}
