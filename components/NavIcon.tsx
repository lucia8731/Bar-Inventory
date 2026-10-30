import type { ReactNode } from 'react';

const symbols: Record<string, ReactNode> = {
  costs:<><path d="M4 4h16v16H4Z M8 8h8 M8 12h2 M14 12h2 M8 16h2 M14 16h2"/></>,
  stocktake:<><path d="M8 4h12v17H4V4h2 M9 2h6v4H9Z M8 11l2 2 5-5 M8 17h8"/></>,
  waste:<><path d="M4 6h16 M8 6V3h8v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7"/></>,
  purchases:<><path d="M3 5h3l3 11h10l2-8H7 M10 21h1 M18 21h1"/></>,
  closing:<><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4 M16 3v4 M4 10h16 M8 15l3 3 5-5"/></>,
  team:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M16 4a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 5v2"/></>,
  audit:<><path d="M5 3h14v18H5Z M9 7h6 M9 11h6 M9 15h4"/></>,
  overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  inventory: <><path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/></>,
  catalog: <><path d="M4 5a2 2 0 0 1 2-2h3l3 2 3-2h3a2 2 0 0 1 2 2v15h-5l-3 2-3-2H4Z"/><path d="M12 5v17M7 8h2M7 12h2M15 8h2M15 12h2"/></>,
  cocktails: <><path d="m3 4 9 10 9-10ZM12 14v7M7 21h10M7 8h10"/></>,
  shopping: <><path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/><path d="M8 11v1M16 11v1"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
  sales: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/></>,
  logout: <><path d="M10 3H5v18h5M10 12h11m-4-4 4 4-4 4"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M5.5 8h1M5.5 11h1"/></>,
};
export function NavIcon({ name }: { name: string }) {
  return <svg className="nav-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{symbols[name] ?? symbols.overview}</svg>;
}
