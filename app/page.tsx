'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, type Session } from '@/lib/api';
import { NavIcon } from '@/components/NavIcon';
import { ContainerIcon, AppearancePicker, type Appearance } from '@/components/ContainerIcon';

type Item = Appearance & { id: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; target_stock: number; supplier: string; image_url: string };
type CatalogItem = Appearance & { id: number; name: string; category: string; unit: string };
type Cocktail = { id: string; name: string };
type Ingredient = { cocktail_id: string; inventory_id: string; amount: number };
type Event = { id: string; item_name: string; unit: string; change: number; reason: string; created_at: string };
type Page = 'overview' | 'inventory' | 'catalog' | 'cocktails' | 'shopping' | 'activity' | 'profile';
const pages: [Page, string][] = [['overview', 'Overview'], ['inventory', 'Inventory'], ['catalog', 'Ingredients'], ['cocktails', 'Cocktails'], ['shopping', 'Shopping list'], ['activity', 'Activity'], ['profile', 'Profile']];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bar-sidebar-open');
      setSidebarOpen(saved === null ? window.matchMedia('(min-width: 761px)').matches : saved === 'true');
    } catch { setSidebarOpen(window.matchMedia('(min-width: 761px)').matches); }
  }, []);
  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try { localStorage.setItem('bar-sidebar-open', String(next)); } catch { /* Storage may be disabled. */ }
  }
  function closeSidebar() { setSidebarOpen(false); try { localStorage.setItem('bar-sidebar-open', 'false'); } catch { /* Storage may be disabled. */ } sidebarToggle.current?.focus(); }
  useEffect(() => {
    if (!sidebarOpen) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]') && window.matchMedia('(max-width: 760px)').matches) closeSidebar();
    }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [sidebarOpen]);
  const [items, setItems] = useState<Item[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activity, setActivity] = useState<Event[]>([]);
  const [profile, setProfile] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('name-asc');
  const [adding, setAdding] = useState<CatalogItem | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    api.session().then(setSession).catch(e => setError(e.message)).finally(() => setReady(true));
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const result = await api.state();
      setItems(result.inventory); setCatalog(result.catalog); setCocktails(result.cocktails); setIngredients(result.ingredients); setActivity(result.activity);
      setProfile(result.profile?.display_name ?? '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load inventory.'); }
  }, [session]);
  useEffect(() => { if (session) { void load(); } }, [session, load]);

  async function act(action: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); if (result.error) throw new Error(result.error.message); await load(); setNotice(success); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }
  function navigate(next: Page) { if (window.matchMedia('(max-width: 760px)').matches) closeSidebar(); setPage(next); setQuery(''); setCategory('All'); setError(''); setNotice(''); }
  const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || i.category === category)).sort((a,b) => sort === 'name-desc' ? b.name.localeCompare(a.name) : sort === 'category' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [items, query, category, sort]);
  const filteredCatalog = useMemo(() => catalog.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || i.category === category)).sort((a,b) => sort === 'name-desc' ? b.name.localeCompare(a.name) : sort === 'category' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [catalog, query, category, sort]);
  const categories = Array.from(new Set((page === 'catalog' ? catalog : items).map(i => i.category))).sort();
  const low = items.filter(i => Number(i.quantity) <= Number(i.low_stock_threshold));
  const selectedCocktail = cocktails.find(c => c.id === selected);
  const selectedRecipe = ingredients.filter(r => r.cocktail_id === selected);
  const servingsAvailable = selectedRecipe.length ? Math.min(...selectedRecipe.map(r => {
    const item = items.find(i => i.id === r.inventory_id);
    return item && Number(r.amount) > 0 ? Math.floor(Number(item.quantity) / Number(r.amount)) : 0;
  })) : null;

  if (!ready) return <main className="center">Loading…</main>;
  if (!session) return <main className="center"><div className="login panel"><span className="eyebrow">BAR INVENTORY</span><h1>A little more<br />room to pour.</h1><p>Keep track of your ingredients and make the most of your bar.</p><button onClick={() => { window.location.href = '/api/auth/login'; }}>Continue with Google <span>↗</span></button>{error && <p className="error" role="alert">{error}</p>}</div></main>;

  return <div className={`shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
    {sidebarOpen && <button className="secondary sidebar-backdrop" aria-label="Close sidebar" onClick={closeSidebar} />}
    <aside id="bar-sidebar" className="minimal-sidebar" aria-label="Sidebar">
      <div className="sidebar-heading"><div className="brand"><span className="mark">b.</span><span className="brand-label">bar inventory</span></div><button ref={sidebarToggle} className="secondary sidebar-toggle" aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} aria-controls="sidebar-navigation" onClick={toggleSidebar}><NavIcon name="panel" /></button></div>
      <nav id="sidebar-navigation" aria-label="Main navigation">{[
        { label: 'MAIN MENU', ids: ['overview', 'inventory', 'catalog', 'cocktails'] },
        { label: 'WORKSPACE', ids: ['shopping', 'activity'] },
        { label: 'GENERAL', ids: ['profile'] },
      ].map(group => <div className="nav-group" key={group.label}><p className="nav-group-label">{group.label}</p>{pages.filter(([id]) => group.ids.includes(id)).map(([id,label]) => <button key={id} aria-label={label} title={!sidebarOpen ? label : undefined} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><NavIcon name={id} /><span className="nav-label">{label}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><span className="sidebar-email">{session.user.email}</span><button aria-label="Log out" title={!sidebarOpen ? "Log out" : undefined} className="text-button sidebar-logout" onClick={() => void api.signOut().then(() => { setSession(null); setItems([]); setCocktails([]); setIngredients([]); }).catch(e => setError(e.message))}><NavIcon name="logout" /><span className="nav-label">Log out</span></button></div>
    </aside>
    <main className="content"><header><div className="heading-with-toggle"><div><span className="eyebrow">YOUR BAR / {page.toUpperCase()}</span><h1>{pages.find(p => p[0] === page)?.[1]}</h1></div></div><div className="account">{session.user.email}</div></header>
      {error && <div className="message error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="message success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {page === 'overview' && <><div className="cover" role="img" aria-label="Bottles arranged on a bar shelf" /><div className="intro"><p>Everything in its place.</p><span>A clear view of what you have and what needs a little attention.</span></div><div className="stats"><button onClick={() => navigate('inventory')}><small>IN YOUR INVENTORY</small><strong>{items.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('inventory')}><small>LOW OR OUT</small><strong>{low.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('cocktails')}><small>YOUR RECIPES</small><strong>{cocktails.length}</strong><span>cocktails ↗</span></button></div><section className="section"><div className="section-title"><div><span className="eyebrow">KEEP AN EYE ON</span><h2>Running low</h2></div><button className="text-button" onClick={() => navigate('shopping')}>Shopping list ↗</button></div>{low.length ? <div className="rows">{low.slice(0, 6).map(i => <div className="row" key={i.id}><div className="item-name"><ContainerIcon {...i} /><div><strong>{i.name}</strong><small>{i.category}</small></div></div><span className="low">{i.quantity} {i.unit}</span></div>)}</div> : <p className="empty">{items.length ? 'Nothing is running low.' : 'Your inventory is empty. Add ingredients to get started.'}</p>}<button className="secondary" onClick={() => navigate('catalog')}>Browse ingredients →</button></section></>}
      {(page === 'inventory' || page === 'catalog') && <><div className="toolbar"><input aria-label="Search ingredients" placeholder="Search ingredients…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select><label className="sort-label">Sort<select aria-label="Sort ingredients" value={sort} onChange={e => setSort(e.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="category">Category A–Z</option></select></label><span className="count">{page === 'catalog' ? filteredCatalog.length : filteredItems.length} items</span></div>
      {page === 'inventory' ? <><div className="section-title"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Ingredients</h2></div><div className="actions"><button className="secondary" onClick={() => exportInventory(items)}>Export CSV</button><button className="secondary" onClick={() => navigate('catalog')}>+ Browse ingredients</button></div></div><div className="rows">{filteredItems.map(item => <InventoryRow key={item.id} item={item} busy={busy} onSave={(quantity, threshold, target, supplier, image_url, appearance) => act(() => api.request('PATCH', `/api/inventory/${item.id}`, { quantity, low_stock_threshold: threshold, target_stock: target, supplier, image_url, ...appearance }), 'Stock updated.')} onDelete={() => { if (window.confirm(`Remove ${item.name} from your inventory?`)) void act(() => api.request('DELETE', `/api/inventory/${item.id}`), 'Ingredient removed.'); }} />)}</div>{!filteredItems.length && <p className="empty">No ingredients found.</p>}<CustomItem busy={busy} add={(name, category, unit, quantity, threshold, appearance) => act(() => api.request('POST', '/api/inventory', { name, category, unit, quantity, low_stock_threshold: threshold, ...appearance }), 'Ingredient added.')} /></> : <><div className="section-title"><div><span className="eyebrow">THE COLLECTION</span><h2>Ingredient library</h2><p>Choose ingredients to add to your inventory.</p></div></div><div className="rows">{filteredCatalog.map(item => { const exists = items.some(i => i.name.toLowerCase() === item.name.toLowerCase()); return <div className="row" key={item.id}><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></div></div><button className="small-button" disabled={exists || busy} onClick={() => setAdding(item)}>{exists ? 'Added' : '+ Add'}</button></div>; })}</div>{!filteredCatalog.length && <p className="empty">No ingredients found.</p>}</>}
      </>}
      {page === 'cocktails' && <><div className="section-title"><div><span className="eyebrow">YOUR RECIPES</span><h2>Cocktails</h2><p>Add a recipe and record each drink as you make it.</p></div></div><NewCocktail busy={busy} add={name => act(() => api.request('POST', '/api/cocktails', { name }), 'Cocktail added.')} /><div className="cocktail-layout"><div className="rows">{cocktails.map(c => <button className={'row select-row ' + (selected === c.id ? 'selected' : '')} key={c.id} onClick={() => setSelected(c.id)}><strong>{c.name}</strong><span>→</span></button>)}{!cocktails.length && <p className="empty">No cocktails yet. Add your first recipe above.</p>}</div>{selectedCocktail && <section className="recipe"><span className="eyebrow">RECIPE</span><h2>{selectedCocktail.name}</h2><div className="availability"><span>AVAILABLE TO MAKE</span><strong>{servingsAvailable === null ? "Add ingredients" : `${servingsAvailable} ${servingsAvailable === 1 ? "drink" : "drinks"}`}</strong></div><div className="rows">{ingredients.filter(i => i.cocktail_id === selected).map(i => { const item = items.find(x => x.id === i.inventory_id); return <div className="row" key={i.inventory_id}><div className="item-name">{item && <ContainerIcon {...item} />}<div><strong>{item?.name ?? 'Ingredient'}</strong><small>{i.amount} {item?.unit}</small></div></div><button className="text-button" disabled={busy} onClick={() => void act(() => api.request('DELETE', `/api/recipes/${selected}/${i.inventory_id}`), 'Ingredient removed from recipe.')}>Remove</button></div>; })}</div><RecipeForm items={items.filter(i => !ingredients.some(r => r.cocktail_id === selected && r.inventory_id === i.id))} busy={busy} add={(inventory_id, amount) => act(() => api.request('POST', '/api/recipes', { cocktail_id: selected, inventory_id, amount }), 'Recipe updated.')} /><MakeForm busy={busy} make={servings => act(() => api.request('POST', '/api/make', { cocktail_id: selected, servings }), 'Stock updated for your cocktail.')} /><button className="danger" disabled={busy} onClick={() => { if (window.confirm(`Delete ${selectedCocktail.name}?`)) void act(() => api.request('DELETE', `/api/cocktails/${selected}`), 'Cocktail deleted.').then(() => setSelected('')); }}>Delete cocktail</button></section>}</div></>}
      {page === 'shopping' && <section><div className="section-title"><div><span className="eyebrow">PLAN YOUR NEXT ORDER</span><h2>Shopping list</h2><p>Items at or below their low-stock level. Set a target in Inventory to see how much to order.</p></div><button className="secondary" onClick={() => exportShopping(low)}>Export CSV</button></div><div className="rows">{low.map(item => <div className="row" key={item.id}><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.supplier || 'No supplier set'} · {item.category}</small></div></div><div className="shopping-numbers"><small>IN STOCK</small><strong>{item.quantity} {item.unit}</strong></div><div className="shopping-numbers"><small>SUGGESTED ORDER</small><strong>{Number(item.target_stock) > 0 ? `${Math.max(0, Number(item.target_stock) - Number(item.quantity))} ${item.unit}` : 'Set target'}</strong></div></div>)}</div>{!low.length && <p className="empty">Nothing on your list yet. Set low-stock levels in Inventory.</p>}<button className="secondary section-action" onClick={() => navigate('inventory')}>Edit stock levels →</button></section>}
      {page === 'activity' && <section><div className="section-title"><div><span className="eyebrow">YOUR STOCK JOURNAL</span><h2>Recent activity</h2><p>Stock changes recorded from now on, including drinks made and manual adjustments.</p></div></div><div className="rows">{activity.map(event => <div className="row" key={event.id}><div><strong>{event.item_name}</strong><small>{event.reason} · {new Date(event.created_at).toLocaleString()}</small></div><strong className={Number(event.change) < 0 ? 'low' : 'positive'}>{Number(event.change) > 0 ? '+' : ''}{event.change} {event.unit}</strong></div>)}</div>{!activity.length && <p className="empty">No changes recorded yet.</p>}</section>}
      {page === 'profile' && <section className="panel profile"><span className="eyebrow">YOUR ACCOUNT</span><h2>Profile</h2><p>{session.user.email}</p><form onSubmit={e => { e.preventDefault(); void act(() => api.request('PUT', '/api/profile', { display_name: profile.trim() }), 'Profile saved.'); }}><label>Display name<input value={profile} onChange={e => setProfile(e.target.value)} maxLength={100} /></label><button disabled={busy}>Save profile</button></form><button className="text-button" onClick={() => void api.signOut().then(() => { setSession(null); setItems([]); setCocktails([]); setIngredients([]); })}>Sign out →</button></section>}
      {adding && <CatalogDialog item={adding} busy={busy} exists={items.some(i => i.name.toLowerCase() === adding.name.toLowerCase())} close={() => setAdding(null)} add={appearance => act(() => api.request('POST', '/api/inventory', { name: adding.name, category: adding.category, unit: adding.unit, ...appearance }), `${adding.name} added to inventory.`)} />}
    </main></div>;
}

function InventoryRow({ item, busy, onSave, onDelete }: { item: Item; busy: boolean; onSave: (quantity: number, threshold: number, target: number, supplier: string, image_url: string, appearance: Appearance) => Promise<void>; onDelete: () => void }) {
  const [quantity, setQuantity] = useState(String(item.quantity)); const [threshold, setThreshold] = useState(String(item.low_stock_threshold));
  const [target, setTarget] = useState(String(item.target_stock)); const [supplier, setSupplier] = useState(item.supplier); const [photo, setPhoto] = useState(item.image_url);
  const [appearance, setAppearance] = useState<Appearance>({ container_shape: item.container_shape, container_color: item.container_color });
  useEffect(() => { setQuantity(String(item.quantity)); setThreshold(String(item.low_stock_threshold)); setTarget(String(item.target_stock)); setSupplier(item.supplier); setPhoto(item.image_url); setAppearance({ container_shape: item.container_shape, container_color: item.container_color }); }, [item.quantity, item.low_stock_threshold, item.target_stock, item.supplier, item.image_url, item.container_shape, item.container_color]);
  return <details className="inventory-item"><summary><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></div></div><span className={Number(item.quantity) <= Number(item.low_stock_threshold) ? 'low' : ''}>{item.quantity} {item.unit}</span><span className="edit-label">Edit</span></summary><form className="inventory-editor" onSubmit={e => { e.preventDefault(); void onSave(Number(quantity), Number(threshold), Number(target), supplier, photo, appearance); }}><div className="form-grid"><label>Stock<input aria-label={`${item.name} stock`} type="number" min="0" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input type="number" min="0" step="any" required value={threshold} onChange={e => setThreshold(e.target.value)} /></label><label>Target<input type="number" min="0" step="any" required value={target} onChange={e => setTarget(e.target.value)} /></label><label>Supplier<input maxLength={120} placeholder="Optional" value={supplier} onChange={e => setSupplier(e.target.value)} /></label><label>Photo URL<input type="url" placeholder="https://" maxLength={2048} value={photo} onChange={e => setPhoto(e.target.value)} /></label>{item.image_url && <img src={item.image_url} alt={`${item.name} photo`} className="item-photo" referrerPolicy="no-referrer" />}</div><AppearancePicker value={appearance} onChange={setAppearance} /><div className="actions"><button disabled={busy}>Save changes</button><button type="button" className="danger" disabled={busy} onClick={onDelete}>Remove ingredient</button></div></form></details>;
}
function CustomItem({ busy, add }: { busy: boolean; add: (name: string, category: string, unit: string, quantity: number, threshold: number, appearance: Appearance) => Promise<void> }) {
  const [name,setName] = useState(''); const [category,setCategory] = useState('Other'); const [unit,setUnit] = useState('ml'); const [quantity,setQuantity] = useState('0'); const [threshold,setThreshold] = useState('0');
  const [appearance,setAppearance] = useState<Appearance>({ container_shape: 'bottle', container_color: 'clear' });
  return <details className="add-details"><summary>+ Add a custom ingredient</summary><form onSubmit={e => { e.preventDefault(); if (name.trim() && category.trim()) void add(name.trim(), category.trim(), unit, Number(quantity), Number(threshold), appearance); }}><div className="form-grid"><label>Name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label>Category<input required maxLength={120} value={category} onChange={e => setCategory(e.target.value)} /></label><label>Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="ml">ml</option><option value="piece">piece</option></select></label><label>Stock<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input required type="number" min="0" step="any" value={threshold} onChange={e => setThreshold(e.target.value)} /></label></div><AppearancePicker value={appearance} onChange={setAppearance} /><button disabled={busy}>Add ingredient</button></form></details>;
}
function CatalogDialog({ item, busy, exists, close, add }: { item: CatalogItem; busy: boolean; exists: boolean; close: () => void; add: (appearance: Appearance) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [appearance,setAppearance] = useState<Appearance>({ container_shape: item.container_shape, container_color: item.container_color });
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={dialog} onCancel={close} aria-labelledby="add-item-title" className="add-dialog"><div className="section-title"><div><h2 id="add-item-title">{item.name}</h2><p>{item.category} · {item.unit}</p></div><button type="button" className="text-button" aria-label="Close ingredient dialog" onClick={close}>✕</button></div><AppearancePicker value={appearance} onChange={setAppearance} /><div className="actions"><button disabled={busy || exists} onClick={() => void add(appearance)}>{exists ? 'Added to inventory ✓' : busy ? 'Adding…' : 'Add to inventory'}</button><button className="secondary" onClick={close}>Done</button></div></dialog>;
}
function NewCocktail({ busy, add }: { busy: boolean; add: (name: string) => Promise<void> }) { const [name,setName] = useState(''); return <form className="inline-form" onSubmit={e => { e.preventDefault(); if (name.trim()) void add(name.trim()); }}><input required placeholder="Cocktail name" aria-label="Cocktail name" value={name} onChange={e => setName(e.target.value)} /><button disabled={busy}>+ Add cocktail</button></form>; }
function RecipeForm({items, busy, add}: {items: Item[]; busy: boolean; add: (id: string, amount: number) => Promise<void>}) { const [id,setId] = useState(''); const [amount,setAmount] = useState(''); useEffect(() => { if (!items.some(i => i.id === id)) setId(items[0]?.id ?? ''); }, [items,id]); return <form className="recipe-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (id && Number(amount) > 0) void add(id, Number(amount)); }}><label>Ingredient<select required value={id} onChange={e => setId(e.target.value)}><option value="">Select an ingredient</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></label><label>Amount per drink<input required type="number" min="0.01" step="any" value={amount} onChange={e => setAmount(e.target.value)} /></label><button className="secondary" disabled={busy || !id}>Add to recipe</button></form>; }
function MakeForm({busy, make}: {busy: boolean; make: (servings: number) => Promise<void>}) { const [count,setCount] = useState('1'); return <form className="make-form" onSubmit={e => { e.preventDefault(); void make(Number(count)); }}><label>Number of drinks<input required type="number" min="1" max="1000" step="1" value={count} onChange={e => setCount(e.target.value)} /></label><button disabled={busy}>Make cocktail</button></form>; }

function csvCell(value: string | number): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(['\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function exportInventory(items: Item[]) { downloadCsv('bar-inventory.csv', [['Name', 'Category', 'Stock', 'Unit', 'Low at', 'Target', 'Supplier'], ...items.map(i => [i.name, i.category, i.quantity, i.unit, i.low_stock_threshold, i.target_stock, i.supplier])]); }
function exportShopping(items: Item[]) { downloadCsv('bar-shopping-list.csv', [['Name', 'Supplier', 'Stock', 'Unit', 'Suggested order'], ...items.map(i => [i.name, i.supplier, i.quantity, i.unit, Number(i.target_stock) > 0 ? Math.max(0, Number(i.target_stock) - Number(i.quantity)) : 'Set target'])]); }
