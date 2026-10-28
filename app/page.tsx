'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, type Session } from '@/lib/api';
import { GlassIcon, GlassPicker, type GlassStyle } from '@/components/GlassIcon';
import { SalesPanel, type SaleEntry, type SalesSummary, type SaleInput } from '@/components/SalesPanel';
import { CategoryPicker, matchesCategory } from '@/components/CategoryPicker';
import { NavIcon } from '@/components/NavIcon';
import { ContainerIcon, AppearancePicker, type Appearance } from '@/components/ContainerIcon';

type Item = Appearance & { id: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; target_stock: number; supplier: string; image_url: string; purchase_price: number | null; bottle_size: number | null; bottle_count: number | null };
type CatalogItem = Appearance & { id: number; name: string; category: string; unit: string };
type Cocktail = GlassStyle & { id: string; name: string; price: number | null };
type Ingredient = { cocktail_id: string; inventory_id: string; amount: number };
type Event = { id: string; item_name: string; unit: string; change: number; reason: string; created_at: string };
type Page = 'overview' | 'inventory' | 'catalog' | 'cocktails' | 'shopping' | 'activity' | 'sales' | 'settings';
const pages: [Page, string][] = [['overview', 'Overview'], ['inventory', 'Inventory'], ['catalog', 'Ingredients'], ['cocktails', 'Cocktails'], ['shopping', 'Shopping list'], ['activity', 'Activity'], ['sales', 'Sales'], ['settings', 'Settings']];

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
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({revenue:0,units:0,entries:0});
  const [profile, setProfile] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarVersion, setAvatarVersion] = useState<string | null>(null);
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
      setItems(result.inventory); setCatalog(result.catalog); setCocktails(result.cocktails); setIngredients(result.ingredients); setActivity(result.activity); setSales(result.sales); setSalesSummary(result.sales_summary);
      setProfile(result.profile?.display_name ?? '');
      setDisplayName(result.profile?.display_name ?? '');
      setAvatarVersion(result.profile?.avatar_version ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load inventory.'); }
  }, [session]);
  useEffect(() => { if (session) { void load(); } }, [session, load]);

  async function act(action: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); if (result.error) throw new Error(result.error.message); await load(); setNotice(success); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }
  async function recordSale(data: SaleInput): Promise<boolean> {
    setBusy(true); setError(''); setNotice('');
    try { const result = await api.request('POST', '/api/sales', data); if(result.error) throw new Error(result.error.message); await load(); setNotice('Sale recorded.'); return true; }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to record sale.'); return false; }
    finally { setBusy(false); }
  }
  function navigate(next: Page) { if (window.matchMedia('(max-width: 760px)').matches) closeSidebar(); setPage(next); setQuery(''); setCategory('All'); setError(''); setNotice(''); }
  const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && matchesCategory(i.category, category)).sort((a,b) => sort === 'name-desc' ? b.name.localeCompare(a.name) : sort === 'category' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [items, query, category, sort]);
  const filteredCatalog = useMemo(() => catalog.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && matchesCategory(i.category, category)).sort((a,b) => sort === 'name-desc' ? b.name.localeCompare(a.name) : sort === 'category' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [catalog, query, category, sort]);

  const low = items.filter(i => Number(i.quantity) <= Number(i.low_stock_threshold));
  const selectedCocktail = cocktails.find(c => c.id === selected);
  const selectedRecipe = ingredients.filter(r => r.cocktail_id === selected);
  const servingsAvailable = selectedRecipe.length ? Math.min(...selectedRecipe.map(r => {
    const item = items.find(i => i.id === r.inventory_id);
    return item && Number(r.amount) > 0 ? Math.floor(Number(item.quantity) / Number(r.amount)) : 0;
  })) : null;

  const avatarUrl = avatarVersion ? `/api/profile/photo?v=${avatarVersion}` : '';
  const accountName = displayName || session?.user.display_name || session?.user.email.split('@')[0] || 'Your account';
  const initials = accountName.split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();

  if (!ready) return <main className="center">Loading…</main>;
  if (!session) return <main className="center"><div className="login panel"><span className="eyebrow">BAR INVENTORY</span><h1>A little more<br />room to pour.</h1><p>Keep track of your ingredients and make the most of your bar.</p><button onClick={() => { window.location.href = '/api/auth/login'; }}>Continue with Google <span>↗</span></button>{error && <p className="error" role="alert">{error}</p>}</div></main>;

  return <div className={`shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
    {sidebarOpen && <button className="secondary sidebar-backdrop" aria-label="Close sidebar" onClick={closeSidebar} />}
    <aside id="bar-sidebar" className="minimal-sidebar" aria-label="Sidebar">
      <div className="sidebar-heading"><div className="brand"><span className="mark">b.</span><span className="brand-label">bar inventory</span></div><button ref={sidebarToggle} className="secondary sidebar-toggle" aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} aria-controls="sidebar-navigation" onClick={toggleSidebar}><NavIcon name="panel" /></button></div>
      <nav id="sidebar-navigation" aria-label="Main navigation">{[
        { label: 'MAIN MENU', ids: ['overview', 'inventory', 'catalog', 'cocktails'] },
        { label: 'WORKSPACE', ids: ['shopping', 'activity', 'sales'] },
        { label: 'GENERAL', ids: ['settings'] },
      ].map(group => <div className="nav-group" key={group.label}><p className="nav-group-label">{group.label}</p>{pages.filter(([id]) => group.ids.includes(id)).map(([id,label]) => <button key={id} aria-label={label} title={!sidebarOpen ? label : undefined} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><NavIcon name={id} /><span className="nav-label">{label}</span></button>)}{group.label === 'GENERAL' && <button aria-label="Log out" title={!sidebarOpen ? "Log out" : undefined} className="text-button sidebar-logout" onClick={() => void api.signOut().then(() => { setSession(null); setItems([]); setCocktails([]); setIngredients([]); }).catch(e => setError(e.message))}><NavIcon name="logout" /><span className="nav-label">Log out</span></button>}</div>)}</nav>

    </aside>
    <main className="content"><header><div className="heading-with-toggle"><div><span className="eyebrow">YOUR BAR / {page.toUpperCase()}</span><h1 className="welcome">Welcome back, {accountName}!</h1></div></div><button className="secondary account-profile" aria-label="Open profile settings" title="Profile settings" onClick={() => navigate('settings')}><span className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials}</span><span className="account-details"><strong>{accountName}</strong><small>{session.user.email}</small></span><span className="account-chevron" aria-hidden="true">⌄</span></button></header>
      {error && <div className="message error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="message success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {page === 'overview' && <><div className="intro"><p>Everything in its place.</p><span>A clear view of what you have and what needs a little attention.</span></div><div className="stats"><button onClick={() => navigate('inventory')}><small>IN YOUR INVENTORY</small><strong>{items.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('inventory')}><small>LOW OR OUT</small><strong>{low.length}</strong><span>ingredients ↗</span></button><button onClick={() => navigate('cocktails')}><small>YOUR RECIPES</small><strong>{cocktails.length}</strong><span>cocktails ↗</span></button></div><section className="section"><div className="section-title"><div><span className="eyebrow">KEEP AN EYE ON</span><h2>Running low</h2></div><button className="text-button" onClick={() => navigate('shopping')}>Shopping list ↗</button></div>{low.length ? <div className="rows">{low.slice(0, 6).map(i => <div className="row" key={i.id}><div className="item-name"><ContainerIcon {...i} /><div><strong>{i.name}</strong><small>{i.category}</small></div></div><span className="low">{i.quantity} {i.unit}</span></div>)}</div> : <p className="empty">{items.length ? 'Nothing is running low.' : 'Your inventory is empty. Add ingredients to get started.'}</p>}<button className="secondary" onClick={() => navigate('catalog')}>Browse ingredients →</button></section></>}
      {(page === 'inventory' || page === 'catalog') && <><div className="toolbar"><input aria-label="Search ingredients" placeholder="Search ingredients…" value={query} onChange={e => setQuery(e.target.value)} /><CategoryPicker items={page === 'catalog' ? catalog : items} value={category} onChange={setCategory}/><label className="sort-label">Sort<select aria-label="Sort ingredients" value={sort} onChange={e => setSort(e.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="category">Category A–Z</option></select></label><span className="count">{page === 'catalog' ? filteredCatalog.length : filteredItems.length} items</span></div>
      {page === 'inventory' ? <><div className="section-title"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Ingredients</h2></div><div className="actions"><button className="secondary" onClick={() => exportInventory(items)}>Export CSV</button><button className="secondary" onClick={() => navigate('catalog')}>+ Browse ingredients</button></div></div><div className="rows">{filteredItems.map(item => <InventoryRow key={item.id} item={item} busy={busy} onSave={(quantity, threshold, target, supplier, image_url, appearance, purchase_price, bottle_size) => act(() => api.request('PATCH', `/api/inventory/${item.id}`, { quantity, low_stock_threshold: threshold, target_stock: target, supplier, image_url, ...appearance, purchase_price, bottle_size }), 'Stock updated.')} onDelete={() => { if (window.confirm(`Warning: remove ${item.name} from your inventory?\n\nIts saved stock and details will be permanently deleted. This cannot be undone. Ingredients used in recipes must be removed from those recipes first.`)) void act(() => api.request('DELETE', `/api/inventory/${item.id}`), 'Ingredient removed.'); }} />)}</div>{!filteredItems.length && <p className="empty">No ingredients found.</p>}<CustomItem busy={busy} add={(name, category, unit, quantity, threshold, appearance) => act(() => api.request('POST', '/api/inventory', { name, category, unit, quantity, low_stock_threshold: threshold, ...appearance }), 'Ingredient added.')} /></> : <><div className="section-title"><div><span className="eyebrow">THE COLLECTION</span><h2>Ingredient library</h2><p>Find an ingredient, then set its capacity, price and quantity before adding.</p></div></div><div className="rows">{filteredCatalog.map(item => { const exists = items.some(i => i.name.toLowerCase() === item.name.toLowerCase()); return <div className="row" key={item.id}><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></div></div><button className="small-button" disabled={exists || busy} onClick={() => {setError('');setNotice('');setAdding(item);}}>{exists ? 'Added' : 'Set details & add'}</button></div>; })}</div>{!filteredCatalog.length && <p className="empty">No ingredients found.</p>}</>}
      </>}
      {page === 'cocktails' && <><div className="section-title"><div><span className="eyebrow">YOUR RECIPES</span><h2>Cocktails</h2><p>Create recipes and choose a glass for each cocktail.</p></div></div><NewCocktail busy={busy} add={(name, style, price) => act(() => api.request('POST', '/api/cocktails', { name, ...style, price }), 'Cocktail added.')} /><div className="cocktail-layout"><div className="rows">{cocktails.map(c => <button className={'row select-row ' + (selected === c.id ? 'selected' : '')} key={c.id} onClick={() => setSelected(c.id)}><span className="cocktail-name"><GlassIcon {...c}/><strong>{c.name}</strong></span><span>→</span></button>)}{!cocktails.length && <p className="empty">No cocktails yet. Add your first recipe above.</p>}</div>{selectedCocktail && <section className="recipe"><span className="eyebrow">RECIPE</span><CocktailTitle key={`name-${selectedCocktail.id}`} cocktail={selectedCocktail} busy={busy} rename={name=>act(()=>api.request('PATCH', `/api/cocktails/${selected}`, {name,glass_shape:selectedCocktail.glass_shape,glass_color:selectedCocktail.glass_color}), 'Cocktail renamed.')} /><CocktailAppearance key={selectedCocktail.id} cocktail={selectedCocktail} busy={busy} save={style => act(() => api.request('PATCH', `/api/cocktails/${selected}`, {name:selectedCocktail.name,...style}), 'Glass updated.')} /><CocktailPrice key={`price-${selectedCocktail.id}`} cocktail={selectedCocktail} busy={busy} save={price => act(() => api.request('PATCH', `/api/cocktails/${selected}`, {name:selectedCocktail.name,glass_shape:selectedCocktail.glass_shape,glass_color:selectedCocktail.glass_color,price}), 'Price saved.')} /><div className="availability"><span>AVAILABLE TO MAKE</span><strong>{servingsAvailable === null ? "Add ingredients" : `${servingsAvailable} ${servingsAvailable === 1 ? "drink" : "drinks"}`}</strong></div><div className="rows">{ingredients.filter(i => i.cocktail_id === selected).map(i => { const item = items.find(x => x.id === i.inventory_id); return <RecipeIngredientRow key={i.inventory_id} item={item} ingredient={i} busy={busy} save={amount=>act(()=>api.request('PATCH', `/api/recipes/${selected}/${i.inventory_id}`, {amount}), 'Recipe amount updated.')} remove={()=>void act(()=>api.request('DELETE', `/api/recipes/${selected}/${i.inventory_id}`), 'Ingredient removed from recipe.')} />; })}</div><RecipeForm items={items.filter(i => !ingredients.some(r => r.cocktail_id === selected && r.inventory_id === i.id))} busy={busy} add={(inventory_id, amount) => act(() => api.request('POST', '/api/recipes', { cocktail_id: selected, inventory_id, amount }), 'Recipe updated.')} /><button className="danger" disabled={busy} onClick={() => { if (window.confirm(`Delete ${selectedCocktail.name}?`)) void act(() => api.request('DELETE', `/api/cocktails/${selected}`), 'Cocktail deleted.').then(() => setSelected('')); }}>Delete cocktail</button></section>}</div></>}
      {page === 'sales' && <SalesPanel cocktails={cocktails} sales={sales} summary={salesSummary} busy={busy} save={recordSale} />}
      {page === 'shopping' && <section><div className="section-title"><div><span className="eyebrow">PLAN YOUR NEXT ORDER</span><h2>Shopping list</h2><p>Items at or below their low-stock level. Set a target in Inventory to see how much to order.</p></div><button className="secondary" onClick={() => exportShopping(low)}>Export CSV</button></div><div className="rows">{low.map(item => <div className="row" key={item.id}><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.supplier || 'No supplier set'} · {item.category}</small></div></div><div className="shopping-numbers"><small>IN STOCK</small><strong>{item.quantity} {item.unit}</strong></div><div className="shopping-numbers"><small>SUGGESTED ORDER</small><strong>{Number(item.target_stock) > 0 ? `${Math.max(0, Number(item.target_stock) - Number(item.quantity))} ${item.unit}` : 'Set target'}</strong></div></div>)}</div>{!low.length && <p className="empty">Nothing on your list yet. Set low-stock levels in Inventory.</p>}<button className="secondary section-action" onClick={() => navigate('inventory')}>Edit stock levels →</button></section>}
      {page === 'activity' && <section><div className="section-title"><div><span className="eyebrow">YOUR STOCK JOURNAL</span><h2>Recent activity</h2><p>Stock changes recorded from now on, including drinks made and manual adjustments.</p></div></div><div className="rows">{activity.map(event => <div className="row" key={event.id}><div><strong>{event.item_name}</strong><small>{event.reason} · {new Date(event.created_at).toLocaleString()}</small></div><strong className={Number(event.change) < 0 ? 'low' : 'positive'}>{Number(event.change) > 0 ? '+' : ''}{event.change} {event.unit}</strong></div>)}</div>{!activity.length && <p className="empty">No changes recorded yet.</p>}</section>}
      {page === 'settings' && <section className="settings-panel"><div className="section-title"><div><h2>Profile</h2><p>Your name and photo, just how you like them.</p></div></div><ProfilePhotoEditor avatarUrl={avatarUrl} initials={initials} busy={busy} upload={file => act(() => api.uploadPhoto(file), 'Profile photo updated.')} remove={() => act(() => api.request('DELETE', '/api/profile/photo'), 'Profile photo removed.')} /><form className="settings-form" onSubmit={e => { e.preventDefault(); void act(() => api.request('PUT', '/api/profile', { display_name: profile.trim() }), 'Profile saved.'); }}><label>Display name<input value={profile} onChange={e => setProfile(e.target.value)} maxLength={100} /></label><label>Email<input value={session.user.email} readOnly /></label><button disabled={busy}>Save changes</button></form></section>}

      {adding && <CatalogDialog item={adding} error={error} busy={busy} exists={items.some(i => i.name.toLowerCase() === adding.name.toLowerCase())} close={() => setAdding(null)} add={setup => act(() => api.request('POST', '/api/inventory', { name: adding.name, category: adding.category, unit: adding.unit, ...setup }), `${adding.name} added to inventory.`)} />}
    </main></div>;
}

function RecipeIngredientRow({item,ingredient,busy,save,remove}:{item:Item|undefined;ingredient:Ingredient;busy:boolean;save:(amount:number)=>Promise<void>;remove:()=>void}) {
  const [editing,setEditing]=useState(false);const [amount,setAmount]=useState(String(ingredient.amount));
  useEffect(()=>{setAmount(String(ingredient.amount));setEditing(false);},[ingredient.amount]);
  return <div className="row recipe-ingredient-row"><div className="item-name">{item && <ContainerIcon {...item}/>}<div><strong>{item?.name ?? 'Ingredient'}</strong><small>{ingredient.amount} {item?.unit}</small></div></div><div className="recipe-row-actions">{editing ? <form className="amount-edit" onSubmit={e=>{e.preventDefault();if(Number(amount)===Number(ingredient.amount))setEditing(false);else void save(Number(amount));}}><label><span className="sr-only">Amount per drink for {item?.name}</span><input autoFocus aria-label={`Amount per drink for ${item?.name}`} type="number" min="0.01" step="any" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><span>{item?.unit}</span><button className="secondary" disabled={busy}>Save</button><button type="button" className="text-button" disabled={busy} onClick={()=>{setAmount(String(ingredient.amount));setEditing(false);}}>Cancel</button></form> : <button className="text-button" disabled={busy} onClick={()=>setEditing(true)}>Change amount</button>}<button className="text-button" disabled={busy} onClick={remove}>Remove</button></div></div>;
}

function InventoryRow({ item, busy, onSave, onDelete }: { item: Item; busy: boolean; onSave: (quantity: number, threshold: number, target: number, supplier: string, image_url: string, appearance: Appearance, purchase_price: number | null, bottle_size: number | null) => Promise<void>; onDelete: () => void }) {
  const [quantity, setQuantity] = useState(String(item.quantity)); const [threshold, setThreshold] = useState(String(item.low_stock_threshold));
  const [target, setTarget] = useState(String(item.target_stock)); const [supplier, setSupplier] = useState(item.supplier); const [photo, setPhoto] = useState(item.image_url); const [purchasePrice, setPurchasePrice] = useState(item.purchase_price === null ? '' : String(item.purchase_price)); const [bottleSize,setBottleSize] = useState(item.bottle_size === null ? '' : String(item.bottle_size));
  const [appearance, setAppearance] = useState<Appearance>({ container_shape: item.container_shape, container_color: item.container_color });
  useEffect(() => { setQuantity(String(item.quantity)); setThreshold(String(item.low_stock_threshold)); setTarget(String(item.target_stock)); setSupplier(item.supplier); setPhoto(item.image_url); setBottleSize(item.bottle_size === null ? '' : String(item.bottle_size)); setPurchasePrice(item.purchase_price === null ? '' : String(item.purchase_price)); setAppearance({ container_shape: item.container_shape, container_color: item.container_color }); }, [item.quantity, item.low_stock_threshold, item.target_stock, item.supplier, item.image_url, item.container_shape, item.container_color, item.purchase_price, item.bottle_size]);
  return <details className="inventory-item"><summary><div className="item-name"><ContainerIcon {...item} /><div><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></div></div><span className={Number(item.quantity) <= Number(item.low_stock_threshold) ? 'low' : ''}>{item.quantity} {item.unit}{item.bottle_count !== null && <small className="bottle-count">{Number(Number(item.bottle_count).toFixed(3))} {item.unit === 'ml' ? 'bottles' : 'packs'}</small>}</span><span className="edit-label">Edit</span><button className="text-button inventory-trash" type="button" aria-label={`Remove ${item.name}`} title="Remove ingredient" disabled={busy} onClick={e=>{e.preventDefault();e.stopPropagation();onDelete();}}><NavIcon name="trash" /></button></summary><form className="inventory-editor" onSubmit={e => { e.preventDefault(); void onSave(Number(quantity), Number(threshold), Number(target), supplier, photo, appearance, purchasePrice === '' ? null : Number(purchasePrice), bottleSize === '' ? null : Number(bottleSize)); }}><div className="form-grid"><label>Stock<input aria-label={`${item.name} stock`} type="number" min="0" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input type="number" min="0" step="any" required value={threshold} onChange={e => setThreshold(e.target.value)} /></label><label>Target<input type="number" min="0" step="any" required value={target} onChange={e => setTarget(e.target.value)} /></label><label>Capacity per bottle / pack · {item.unit}<input type="number" aria-label={`${item.name} bottle capacity`} min="0.01" max="1000000" step="any" placeholder="Not set" value={bottleSize} onChange={e=>setBottleSize(e.target.value)}/></label><label>Bottle / pack price · JPY<input aria-label={`${item.name} purchase price in JPY`} type="number" min="0" max="10000000" step="1" placeholder="Not set" value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value)} /></label><label>Supplier<input maxLength={120} placeholder="Optional" value={supplier} onChange={e => setSupplier(e.target.value)} /></label><label>Photo URL<input type="url" placeholder="https://" maxLength={2048} value={photo} onChange={e => setPhoto(e.target.value)} /></label>{item.image_url && <img src={item.image_url} alt={`${item.name} photo`} className="item-photo" referrerPolicy="no-referrer" />}</div><AppearancePicker value={appearance} onChange={setAppearance} /><div className="actions"><button disabled={busy}>Save changes</button><button type="button" className="danger" disabled={busy} onClick={onDelete}>Remove ingredient</button></div></form></details>;
}
function CustomItem({ busy, add }: { busy: boolean; add: (name: string, category: string, unit: string, quantity: number, threshold: number, appearance: Appearance) => Promise<void> }) {
  const [name,setName] = useState(''); const [category,setCategory] = useState('Other'); const [unit,setUnit] = useState('ml'); const [quantity,setQuantity] = useState('0'); const [threshold,setThreshold] = useState('0');
  const [appearance,setAppearance] = useState<Appearance>({ container_shape: 'bottle', container_color: 'clear' });
  return <details className="add-details"><summary>+ Add a custom ingredient</summary><form onSubmit={e => { e.preventDefault(); if (name.trim() && category.trim()) void add(name.trim(), category.trim(), unit, Number(quantity), Number(threshold), appearance); }}><div className="form-grid"><label>Name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label>Category<input required maxLength={120} value={category} onChange={e => setCategory(e.target.value)} /></label><label>Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="ml">ml</option><option value="piece">piece</option></select></label><label>Stock<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Low at<input required type="number" min="0" step="any" value={threshold} onChange={e => setThreshold(e.target.value)} /></label></div><AppearancePicker value={appearance} onChange={setAppearance} /><button disabled={busy}>Add ingredient</button></form></details>;
}
type CatalogSetup = Appearance & {bottle_size:number;bottle_count:number;purchase_price:number|null};
function CatalogDialog({ item, error, busy, exists, close, add }: { item: CatalogItem; error: string; busy: boolean; exists: boolean; close: () => void; add: (setup: CatalogSetup) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [appearance,setAppearance] = useState<Appearance>({ container_shape: item.container_shape, container_color: item.container_color });
  const [capacity,setCapacity] = useState(item.unit === 'piece' ? '1' : '');const [count,setCount] = useState('1');const [price,setPrice] = useState('');
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  const total=Number(capacity)*Number(count);
  return <dialog ref={dialog} onCancel={close} aria-labelledby="add-item-title" className="add-dialog"><div className="section-title"><div><h2 id="add-item-title">{item.name}</h2><p>{item.category} · Set up your inventory</p></div><button type="button" className="text-button dialog-close" aria-label="Close ingredient dialog" onClick={close}>✕</button></div><form onSubmit={e=>{e.preventDefault();void add({...appearance,bottle_size:Number(capacity),bottle_count:Number(count),purchase_price:price === '' ? null : Number(price)});}}><fieldset disabled={busy||exists} className="bottle-setup"><label>{item.unit === 'ml'?'Bottle capacity · ml':'Pack size · pieces'}<input autoFocus aria-label="Bottle or pack capacity" required type="number" min="0.01" max="1000000" step="any" placeholder={item.unit === 'ml'?'e.g. 700':'e.g. 1'} value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><label>{item.unit === 'ml'?'Bottles on hand':'Packs on hand'}<input aria-label="Bottles or packs on hand" required type="number" min="0" max="1000000" step="any" placeholder="e.g. 1.5" value={count} onChange={e=>setCount(e.target.value)}/><small>Half a bottle or pack = 0.5</small></label><label>Price per {item.unit === 'ml'?'bottle':'pack'} · JPY<input aria-label="Price per bottle or pack in JPY" type="number" min="0" max="10000000" step="1" placeholder="Optional" value={price} onChange={e=>setPrice(e.target.value)}/></label><div className="setup-total"><span>Total stock</span><strong>{capacity && count && Number.isFinite(total)?`${new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(total)} ${item.unit}`:'Enter capacity and quantity'}</strong></div><div className="setup-appearance"><AppearancePicker value={appearance} onChange={setAppearance}/></div></fieldset>{error && <p className="dialog-error" role="alert">{error}</p>}<div className="actions"><button disabled={busy||exists}>{exists?'Added to inventory ✓':busy?'Adding…':'Confirm & add to inventory'}</button><button type="button" className="secondary" onClick={close}>{exists?'Done':'Cancel'}</button></div></form></dialog>;
}
function NewCocktail({busy,add}:{busy:boolean;add:(name:string,style:GlassStyle,price:number|null)=>Promise<void>}) {
  const [name,setName]=useState('');const [price,setPrice]=useState('');const [style,setStyle]=useState<GlassStyle>({glass_shape:'coupe',glass_color:'gold'});
  return <form className="new-cocktail" onSubmit={e=>{e.preventDefault();if(name.trim()) void add(name.trim(),style,price === '' ? null : Number(price));}}><div className="inline-form"><input required maxLength={120} placeholder="Cocktail name" aria-label="Cocktail name" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Cocktail price in JPY" type="number" min="0" max="10000000" step="1" placeholder="Price · JPY (optional)" value={price} onChange={e=>setPrice(e.target.value)}/><button disabled={busy}>+ Add cocktail</button></div><details><summary>Choose glass & color</summary><GlassPicker value={style} onChange={setStyle}/></details></form>;
}
function CocktailTitle({cocktail,busy,rename}:{cocktail:Cocktail;busy:boolean;rename:(name:string)=>Promise<void>}) {
  const [editing,setEditing]=useState(false);const [name,setName]=useState(cocktail.name);
  useEffect(()=>{setName(cocktail.name);setEditing(false);},[cocktail.name]);
  return <div className="cocktail-title"><GlassIcon {...cocktail}/>{editing ? <form className="cocktail-rename" onSubmit={e=>{e.preventDefault();const next=name.trim();if(!next)return;if(next===cocktail.name)setEditing(false);else void rename(next);}}><input autoFocus required maxLength={120} aria-label="Cocktail name" value={name} disabled={busy} onChange={e=>setName(e.target.value)}/><button className="secondary" disabled={busy||!name.trim()}>Save</button><button type="button" className="text-button" disabled={busy} onClick={()=>{setName(cocktail.name);setEditing(false);}}>Cancel</button></form> : <><h2>{cocktail.name}</h2><button className="text-button rename-button" onClick={()=>setEditing(true)} disabled={busy}>Rename</button></>}</div>;
}
function CocktailPrice({cocktail,busy,save}:{cocktail:Cocktail;busy:boolean;save:(price:number|null)=>Promise<void>}) {
  const [price,setPrice]=useState(cocktail.price === null ? '' : String(cocktail.price));
  useEffect(()=>setPrice(cocktail.price === null ? '' : String(cocktail.price)),[cocktail.price]);
  return <form className="cocktail-price" onSubmit={e=>{e.preventDefault();void save(price === '' ? null : Number(price));}}><label>Selling price · JPY<input aria-label="Selling price in JPY" type="number" min="0" max="10000000" step="1" placeholder="Not set" value={price} onChange={e=>setPrice(e.target.value)}/></label><button className="secondary" disabled={busy}>Save price</button></form>;
}
function CocktailAppearance({cocktail,busy,save}:{cocktail:Cocktail;busy:boolean;save:(style:GlassStyle)=>Promise<void>}) {
  const [style,setStyle]=useState<GlassStyle>({glass_shape:cocktail.glass_shape,glass_color:cocktail.glass_color});
  useEffect(()=>setStyle({glass_shape:cocktail.glass_shape,glass_color:cocktail.glass_color}),[cocktail.glass_shape,cocktail.glass_color]);
  return <details className="glass-editor"><summary>Edit glass & color</summary><GlassPicker value={style} onChange={setStyle}/><button className="secondary" disabled={busy} onClick={()=>void save(style)}>Save glass</button></details>;
}
function RecipeForm({items, busy, add}: {items: Item[]; busy: boolean; add: (id: string, amount: number) => Promise<void>}) { const [id,setId] = useState(''); const [amount,setAmount] = useState(''); useEffect(() => { if (!items.some(i => i.id === id)) setId(items[0]?.id ?? ''); }, [items,id]); return <form className="recipe-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (id && Number(amount) > 0) void add(id, Number(amount)); }}><label>Ingredient<select required value={id} onChange={e => setId(e.target.value)}><option value="">Select an ingredient</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></label><label>Amount per drink<input required type="number" min="0.01" step="any" value={amount} onChange={e => setAmount(e.target.value)} /></label><button className="secondary" disabled={busy || !id}>Add to recipe</button></form>; }

function csvCell(value: string | number): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(['\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function exportInventory(items: Item[]) { downloadCsv('bar-inventory.csv', [['Name', 'Category', 'Stock', 'Unit', 'Low at', 'Target', 'Supplier', 'Bottle/pack price JPY', 'Capacity per bottle/pack', 'Bottles/packs on hand'], ...items.map(i => [i.name, i.category, i.quantity, i.unit, i.low_stock_threshold, i.target_stock, i.supplier, i.purchase_price ?? '', i.bottle_size ?? '', i.bottle_count ?? ''])]); }
function exportShopping(items: Item[]) { downloadCsv('bar-shopping-list.csv', [['Name', 'Supplier', 'Stock', 'Unit', 'Suggested order'], ...items.map(i => [i.name, i.supplier, i.quantity, i.unit, Number(i.target_stock) > 0 ? Math.max(0, Number(i.target_stock) - Number(i.quantity)) : 'Set target'])]); }

function ProfilePhotoEditor({ avatarUrl, initials, busy, upload, remove }: { avatarUrl: string; initials: string; busy: boolean; upload: (file: File) => Promise<void>; remove: () => Promise<void> }) {
  const [file,setFile] = useState<File | null>(null);
  const [preview,setPreview] = useState('');
  const [error,setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setFile(null); if (input.current) input.current.value = ''; }, [avatarUrl]);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <div className="photo-editor"><span className="profile-avatar large">{preview || avatarUrl ? <img src={preview || avatarUrl} alt="Profile photo preview" /> : initials}</span><div className="photo-controls"><label className="photo-file-label">Choose profile photo<input ref={input} disabled={busy} aria-label="Choose profile photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const selected = e.target.files?.[0]; setError(''); setFile(null); if (!selected) return; if (selected.size > 5 * 1024 * 1024) { setError('Choose a photo smaller than 5 MB.'); return; } if (!['image/jpeg','image/png','image/webp'].includes(selected.type)) { setError('Choose a JPG, PNG or WebP photo.'); return; } setFile(selected); }} /></label><small>JPG, PNG or WebP · up to 5 MB / 12 megapixels · cropped to a square</small><div className="actions">{file && <button className="secondary" disabled={busy} onClick={() => void upload(file)}>{busy ? 'Uploading…' : 'Upload photo'}</button>}{avatarUrl && <button className="text-button" disabled={busy} onClick={() => void remove()}>Remove photo</button>}</div>{error && <p className="photo-error" role="alert">{error}</p>}</div></div>;
}
