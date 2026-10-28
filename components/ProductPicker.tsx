'use client';
import { useMemo, useRef, useState } from 'react';
export type PricedProduct = { id:string; name:string; price:number|null };
const normalized = (text:string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase();
const initial = (name:string) => { const letter=normalized(name).charAt(0).toUpperCase(); return /^[A-Z]$/.test(letter)?letter:'#'; };
const yen = (value:number)=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(value);
export function ProductPicker({products,value,onSelect}:{products:PricedProduct[];value:string;onSelect:(product:PricedProduct|null)=>void}) {
  const [query,setQuery]=useState('');const [letter,setLetter]=useState('All');
  const root=useRef<HTMLDetailsElement>(null);const trigger=useRef<HTMLElement>(null);
  const selected=products.find(p=>p.id===value);
  const letters=useMemo(()=>new Set(products.map(p=>initial(p.name))),[products]);
  const filtered=products.filter(p=>(letter==='All'||initial(p.name)===letter)&&normalized(p.name).includes(normalized(query))).sort((a,b)=>a.name.localeCompare(b.name));
  function choose(product:PricedProduct|null) {onSelect(product);if(root.current)root.current.open=false;trigger.current?.focus();}
  return <div className="product-field"><span className="field-label">Product</span><details ref={root} className="product-picker" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();if(root.current)root.current.open=false;trigger.current?.focus();}}}><summary ref={trigger} aria-label="Choose product"><span>{selected?.name || 'Choose cocktail / other item'}</span><span className="product-price">{selected?.price !== null && selected?.price !== undefined ? yen(selected.price):''}<span aria-hidden="true">⌄</span></span></summary><div className="product-picker-body"><input type="search" aria-label="Search products by name" placeholder="Search cocktail name…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="alphabet-filter" role="group" aria-label="Filter products by first letter">{['All',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'].map(l=><button type="button" className="small-button letter-button" key={l} aria-label={l==='All'?'All initials':`Names starting with ${l}`} aria-pressed={letter===l} disabled={l!=='All'&&!letters.has(l)} onClick={()=>setLetter(l)}>{l}</button>)}</div><div className="product-results" aria-label="Matching products">{filtered.map(product=><button type="button" className="secondary product-option" key={product.id} aria-pressed={value===product.id} onClick={()=>choose(product)}><span>{product.name}</span><small>{product.price === null?'Price not set':yen(product.price)}</small></button>)}{!filtered.length && <p className="product-empty">No matches. Try another letter or search.</p>}</div><button type="button" className="text-button custom-product" onClick={()=>choose(null)}>+ Other item / custom name</button></div></details></div>;
}
