'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContainerIcon, type Appearance } from './ContainerIcon';
import { categoryGroupsFor, matchesCategory } from './CategoryPicker';

type IngredientOption = Appearance & { id:string; name:string; category:string; unit:string; quantity:number };
const normalize = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
export function IngredientPicker({items,value,onChange,disabled=false}:{items:IngredientOption[];value:string;onChange:(id:string)=>void;disabled?:boolean}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const root=useRef<HTMLDetailsElement>(null);
  const trigger=useRef<HTMLElement>(null);
  const search=useRef<HTMLInputElement>(null);
  const selected=items.find(item=>item.id===value);
  const groups=categoryGroupsFor(items);
  const counts=new Map<string,number>();
  items.forEach(item=>counts.set(item.category,(counts.get(item.category)??0)+1));
  const filtered=useMemo(()=>items.filter(item=>matchesCategory(item.category,category)&&normalize(`${item.name} ${item.category}`).includes(normalize(query))).sort((a,b)=>a.name.localeCompare(b.name)),[items,category,query]);
  useEffect(()=>{
    function outside(event:PointerEvent){if(event.target instanceof Node&&!root.current?.contains(event.target)&&root.current)root.current.open=false;}
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[]);
  useEffect(()=>{if(disabled&&root.current)root.current.open=false;},[disabled]);
  function close(){if(root.current)root.current.open=false;trigger.current?.focus();}
  return <div className="ingredient-field"><span className="field-label">Ingredient</span><details ref={root} className="ingredient-picker" onToggle={()=>{if(root.current?.open){setQuery('');setCategory('All');search.current?.focus();}}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
    <summary ref={trigger} aria-label={selected?`Choose ingredient: ${selected.name}`:'Choose an ingredient'} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}><span className="ingredient-choice">{selected&&<ContainerIcon {...selected}/>}<span>{selected?.name||'Choose an ingredient…'}</span></span><span aria-hidden="true">⌄</span></summary>
    <div className="ingredient-picker-body"><input ref={search} type="search" aria-label="Search ingredients by name or category" placeholder="Search bottle name or category…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(filtered.length===1){onChange(filtered[0].id);close();}}}}/>
      <div className="ingredient-browser"><div className="ingredient-categories" aria-label="Ingredient categories"><button type="button" className="secondary category-all" aria-pressed={category==='All'} onClick={()=>setCategory('All')}>All ingredients <small>{items.length}</small></button>{groups.map(group=><section className="category-group" key={group.id}><button type="button" className="text-button category-group-title" aria-pressed={category===`group:${group.id}`} onClick={()=>setCategory(`group:${group.id}`)}><strong>{group.label}</strong><small>{group.categories.reduce((total,c)=>total+(counts.get(c)??0),0)} items · View all →</small></button><div className="category-chips">{group.categories.map(c=><button type="button" className="small-button category-chip" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}<small>{counts.get(c)}</small></button>)}</div></section>)}</div>
      <div className="ingredient-matches"><div className="ingredient-results-heading"><span>{filtered.length} ingredients</span>{(query||category!=='All')&&<button type="button" className="text-button" onClick={()=>{setQuery('');setCategory('All');search.current?.focus();}}>Clear filters</button>}</div><div className="ingredient-results" aria-label="Matching ingredients">{filtered.map(item=><button type="button" className="secondary ingredient-option" key={item.id} aria-pressed={item.id===value} onClick={()=>{onChange(item.id);close();}}><ContainerIcon {...item}/><span><strong>{item.name}</strong><small>{item.category} · {Number(item.quantity).toLocaleString()} {item.unit} in stock</small></span>{item.id===value&&<span aria-hidden="true">✓</span>}</button>)}{!filtered.length&&<p className="product-empty">{items.length?'No matches. Try another category or search.':'No ingredients available. Add stock to Inventory or check the ingredients already in this recipe.'}</p>}</div></div></div>
    </div>
  </details></div>;
}
