'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, type Session } from '@/lib/api';

type Item = { id: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number };
type CatalogItem = { id: number; name: string; category: string; unit: string };
type Cocktail = { id: string; name: string };
type Ingredient = { cocktail_id: string; inventory_id: string; amount: number };
type Page = 'overview' | 'inventory' | 'catalog' | 'cocktails' | 'profile';
const pages: [Page, string][] = [['overview', 'Overview'], ['inventory', 'Inventory'], ['catalog', 'Ingredients'], ['cocktails', 'Cocktails'], ['profile', 'Profile']];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [items, setItems] = useState<Item[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [profile, setProfile] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
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
      setItems(result.inventory); setCatalog(result.catalog); setCocktails(result.cocktails); setIngredients(result.ingredients);
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
  function navigate(next: Page) { setPage(next); setQuery(''); setCategory('All'); setError(''); setNotice(''); }
  const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || i.category === category)), [items, query, category]);
  const filteredCatalog = useMemo(() => catalog.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || i.category === category)), [catalog, query, category]);
  const categories = Array.from(new Set((page === 'catalog' ? catalog : items).map(i => i.category))).sort();
  const low = items.filter(i => Number(i.quantity) <= Number(i.low_stock_threshold));
  const selectedCocktail = cocktails.find(c => c.id === selected);

  if (!ready) return <main className="center">Loading…</main>;
  if (!session) return <main className="center"><div className="login panel"><span className="eyebrow">BAR INVENTORY</span><h1>A little more<br />room to pour.</h1><p>Keep track of your ingredients and make the most of your bar.</p><button onClick={() => { window.location.href = '/api/auth/login'; }}>Continue with Google <span>↗</span></button>{error && <p className="error" role="alert">{error}</p>}</div></main>;

  return <div className="shell"><aside><div className="brand"><span className="mark">b.</span><span>bar inventory<small>YOUR BAR, IN ORDER</small></span></div><nav aria-label="Main navigation">{pages.map(([id, label]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}>{label}<span>↗</span></button>)}</nav><div className="aside-footer">A little space for<br />everything behind the bar.</div></aside>
    <main className="content"><header><div><span className="eyebrow">YOUR BAR / {page.toUpperCase()}</span><h1>{pages.find(p => p[0] === page)?.[1]}</h1></div><div className="account">{session.user.email}</div></header>
      {error && <div className="message error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="message success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {page === 'overview' && <><div className="intro"><p>Everything in its place.</p><span>A clear view of what you have and what needs a little attention.</span></div><div className="stats"><button onClick={() => navigate('inventory')}><small>IN YOUR INVENTORY</small><strong>{items.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('inventory')}><small>LOW OR OUT</small><strong>{low.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('cocktails')}><small>YOUR RECIPES</small><strong>{cocktails.length}</strong><span>cocktails ↗</span></button></div><section className="section"><div className="section-title"><div><span className="eyebrow">KEEP AN EYE ON</span><h2>Running low</h2></div><button className="text-button" onClick={() => navigate('inventory')}>View inventory ↗</button></div>{low.length ? <div className="rows">{low.slice(0, 6).map(i => <div className="row" key={i.id}><div><strong>{i.name}</strong><small>{i.category}</small></div><span className="low">{i.quantity} {i.unit}</span></div>)}</div> : <p className="empty">{items.length ? 'Nothing is running low.' : 'Your inventory is empty. Add ingredients to get started.'}</p>}<button className="secondary" onClick={() => navigate('catalog')}>Browse ingredients →</button></section></>}
      {(page === 'inventory' || page === 'catalog') && <><div className="toolbar"><input aria-label="Search ingredients" placeholder="Search ingredients…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select><span className="count">{page === 'catalog' ? filteredCatalog.length : filteredItems.length} items</span></div>
      {page === 'inventory' ? <><div className="section-title"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Ingredients</h2></div><button className="secondary" onClick={() => navigate('catalog')}>+ Browse ingredients</button></div><div className="rows">{filteredItems.map(item => <InventoryRow key={item.id} item={item} busy={busy} onSave={(quantity, threshold) => act(() => api.request('PATCH', `/api/inventory/${item.id}`, { quantity, low_stock_threshold: threshold }), 'Stock updated.')} onDelete={() => { if (window.confirm(`Remove ${item.name} from your inventory?`)) void act(() => api.request('DELETE', `/api/inventory/${item.id}`), 'Ingredient removed.'); }} />)}</div>{!filteredItems.length && <p className="empty">No ingredients found.</p>}<CustomItem busy={busy} add={(name, category, unit, quantity, threshold) => act(() => api.request('POST', '/api/inventory', { name, category, unit, quantity, low_stock_threshold: threshold }), 'Ingredient added.')} /></> : <><div className="section-title"><div><span className="eyebrow">THE COLLECTION</span><h2>Ingredient library</h2><p>Choose ingredients to add to your inventory.</p></div></div><div className="rows">{filteredCatalog.map(item => { const exists = items.some(i => i.name.toLowerCase() === item.name.toLowerCase()); return <div className="row" key={item.id}><div><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></div><button className="small-button" disabled={exists || busy} onClick={() => void act(() => api.request('POST', '/api/inventory', { name: item.name, category: item.category, unit: item.unit }), `${item.name} added to inventory.`)}>{exists ? 'Added' : '+ Add'}</button></div>; })}</div>{!filteredCatalog.length && <p className="empty">No ingredients found.</p>}</>}
      </>}
      {page === 'cocktails' && <><div className="section-title"><div><span className="eyebrow">YOUR RECIPES</span><h2>Cocktails</h2><p>Add a recipe and record each drink as you make it.</p></div></div><NewCocktail busy={busy} add={name => act(() => api.request('POST', '/api/cocktails', { name }), 'Cocktail added.')} /><div className="cocktail-layout"><div className="rows">{cocktails.map(c => <button className={'row select-row ' + (selected === c.id ? 'selected' : '')} key={c.id} onClick={() => setSelected(c.id)}><strong>{c.name}</strong><span>→</span></button>)}{!cocktails.length && <p className="empty">No cocktails yet. Add your first recipe above.</p>}</div>{selectedCocktail && <section className="recipe"><span className="eyebrow">RECIPE</span><h2>{selectedCocktail.name}</h2><div className="rows">{ingredients.filter(i => i.cocktail_id === selected).map(i => { const item = items.find(x => x.id === i.inventory_id); return <div className="row" key={i.inventory_id}><div><strong>{item?.name ?? 'Ingredient'}</strong><small>{i.amount} {item?.unit}</small></div><button className="text-button" disabled={busy} onClick={() => void act(() => api.request('DELETE', `/api/recipes/${selected}/${i.inventory_id}`), 'Ingredient removed from recipe.')}>Remove</button></div>; })}</div><RecipeForm items={items.filter(i => !ingredients.some(r => r.cocktail_id === selected && r.inventory_id === i.id))} busy={busy} add={(inventory_id, amount) => act(() => api.request('POST', '/api/recipes', { cocktail_id: selected, inventory_id, amount }), 'Recipe updated.')} /><MakeForm busy={busy} make={servings => act(() => api.request('POST', '/api/make', { cocktail_id: selected, servings }), 'Stock updated for your cocktail.')} /><button className="danger" disabled={busy} onClick={() => { if (window.confirm(`Delete ${selectedCocktail.name}?`)) void act(() => api.request('DELETE', `/api/cocktails/${selected}`), 'Cocktail deleted.').then(() => setSelected('')); }}>Delete cocktail</button></section>}</div></>}
      {page === 'profile' && <section className="panel profile"><span className="eyebrow">YOUR ACCOUNT</span><h2>Profile</h2><p>{session.user.email}</p><form onSubmit={e => { e.preventDefault(); void act(() => api.request('PUT', '/api/profile', { display_name: profile.trim() }), 'Profile saved.'); }}><label>Display name<input value={profile} onChange={e => setProfile(e.target.value)} maxLength={100} /></label><button disabled={busy}>Save profile</button></form><button className="text-button" onClick={() => void api.signOut().then(() => { setSession(null); setItems([]); setCocktails([]); setIngredients([]); })}>Sign out →</button></section>}
    </main></div>;
}

function InventoryRow({ item, busy, onSave, onDelete }: { item: Item; busy: boolean; onSave: (quantity: number, threshold: number) => Promise<void>; onDelete: () => void }) {
  const [quantity, setQuantity] = useState(String(item.quantity)); const [threshold, setThreshold] = useState(String(item.low_stock_threshold));
  useEffect(() => { setQuantity(String(item.quantity)); setThreshold(String(item.low_stock_threshold)); }, [item.quantity, item.low_stock_threshold]);
  return <form className="row inventory-row" onSubmit={e => { e.preventDefault(); void onSave(Number(quantity), Number(threshold)); }}><div><strong>{item.name}</strong><small>{item.category} · {item.unit} {Number(item.quantity) <= Number(item.low_stock_threshold) && <span className="low"> · Low</span>}</small></div><label>Stock<input aria-label={`${item.name} stock`} type="number" min="0" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input aria-label={`${item.name} low stock threshold`} type="number" min="0" step="any" required value={threshold} onChange={e => setThreshold(e.target.value)} /></label><button className="small-button" disabled={busy}>Save</button><button type="button" className="text-button" disabled={busy} onClick={onDelete}>Remove</button></form>;
}
function CustomItem({ busy, add }: { busy: boolean; add: (name: string, category: string, unit: string, quantity: number, threshold: number) => Promise<void> }) {
  const [name,setName] = useState(''); const [category,setCategory] = useState('Other'); const [unit,setUnit] = useState('ml'); const [quantity,setQuantity] = useState('0'); const [threshold,setThreshold] = useState('0');
  return <details className="add-details"><summary>+ Add a custom ingredient</summary><form className="form-grid" onSubmit={e => { e.preventDefault(); if (name.trim() && category.trim()) void add(name.trim(), category.trim(), unit, Number(quantity), Number(threshold)); }}><label>Name<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Category<input required value={category} onChange={e => setCategory(e.target.value)} /></label><label>Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="ml">ml</option><option value="piece">piece</option></select></label><label>Stock<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input required type="number" min="0" step="any" value={threshold} onChange={e => setThreshold(e.target.value)} /></label><button disabled={busy}>Add ingredient</button></form></details>;
}
function NewCocktail({ busy, add }: { busy: boolean; add: (name: string) => Promise<void> }) { const [name,setName] = useState(''); return <form className="inline-form" onSubmit={e => { e.preventDefault(); if (name.trim()) void add(name.trim()); }}><input required placeholder="Cocktail name" aria-label="Cocktail name" value={name} onChange={e => setName(e.target.value)} /><button disabled={busy}>+ Add cocktail</button></form>; }
function RecipeForm({items, busy, add}: {items: Item[]; busy: boolean; add: (id: string, amount: number) => Promise<void>}) { const [id,setId] = useState(''); const [amount,setAmount] = useState(''); useEffect(() => { if (!items.some(i => i.id === id)) setId(items[0]?.id ?? ''); }, [items,id]); return <form className="recipe-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (id && Number(amount) > 0) void add(id, Number(amount)); }}><label>Ingredient<select required value={id} onChange={e => setId(e.target.value)}><option value="">Select an ingredient</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></label><label>Amount per drink<input required type="number" min="0.01" step="any" value={amount} onChange={e => setAmount(e.target.value)} /></label><button className="secondary" disabled={busy || !id}>Add to recipe</button></form>; }
function MakeForm({busy, make}: {busy: boolean; make: (servings: number) => Promise<void>}) { const [count,setCount] = useState('1'); return <form className="make-form" onSubmit={e => { e.preventDefault(); void make(Number(count)); }}><label>Number of drinks<input required type="number" min="1" max="1000" step="1" value={count} onChange={e => setCount(e.target.value)} /></label><button disabled={busy}>Make cocktail</button></form>; }
