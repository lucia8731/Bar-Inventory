'use client';
import { useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import {formatAmount,useUnit} from './Units';
import { ContainerIcon, type Appearance } from './ContainerIcon';
import { categoryGroupsFor, matchesCategory } from './CategoryPicker';

type IngredientOption = Appearance & { id:string; name:string; category:string; unit:string; quantity:number };
const normalize = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
export function IngredientPicker({items,value,onChange,disabled=false}:{items:IngredientOption[];value:string;onChange:(id:string)=>void;disabled?:boolean}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [open,setOpen]=useState(false);const preferred=useUnit();
  const search=useRef<HTMLInputElement>(null);
  const selected=items.find(item=>item.id===value);
  const groups=categoryGroupsFor(items);
  const counts=new Map<string,number>();
  items.forEach(item=>counts.set(item.category,(counts.get(item.category)??0)+1));
  const filtered=useMemo(()=>items.filter(item=>matchesCategory(item.category,category)&&normalize(`${item.name} ${item.category}`).includes(normalize(query))).sort((a,b)=>a.name.localeCompare(b.name)),[items,category,query]);
  function close(){setOpen(false);}
  return <div className="ingredient-field"><span className="field-label">Ingredient</span><button type="button" className="ingredient-trigger secondary" disabled={disabled} aria-haspopup="dialog" onClick={()=>{setQuery('');setCategory('All');setOpen(true);}}><span className="ingredient-choice">{selected&&<ContainerIcon {...selected}/>}<span>{selected?.name||'Choose an ingredient…'}</span></span><span aria-hidden="true">⌄</span></button>{open&&!disabled&&<Modal title="Choose an ingredient" close={close}>
    <div className="ingredient-picker-body"><input autoFocus ref={search} type="search" aria-label="Search ingredients by name or category" placeholder="Search bottle name or category…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(filtered.length===1){onChange(filtered[0].id);close();}}}}/>
      <div className="ingredient-browser"><div className="ingredient-categories" aria-label="Ingredient categories"><button type="button" className="secondary category-all" aria-pressed={category==='All'} onClick={()=>setCategory('All')}>All ingredients <small>{items.length}</small></button>{groups.map(group=><section className="category-group" key={group.id}><button type="button" className="text-button category-group-title" aria-pressed={category===`group:${group.id}`} onClick={()=>setCategory(`group:${group.id}`)}><strong>{group.label}</strong><small>{group.categories.reduce((total,c)=>total+(counts.get(c)??0),0)} items · View all →</small></button><div className="category-chips">{group.categories.map(c=><button type="button" className="small-button category-chip" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}<small>{counts.get(c)}</small></button>)}</div></section>)}</div>
      <div className="ingredient-matches"><div className="ingredient-results-heading"><span>{filtered.length} ingredients</span>{(query||category!=='All')&&<button type="button" className="text-button" onClick={()=>{setQuery('');setCategory('All');search.current?.focus();}}>Clear filters</button>}</div><div className="ingredient-results" aria-label="Matching ingredients">{filtered.map(item=><button type="button" className="secondary ingredient-option" key={item.id} aria-pressed={item.id===value} onClick={()=>{onChange(item.id);close();}}><ContainerIcon {...item}/><span><strong>{item.name}</strong><small>{item.category} · {formatAmount(item.quantity,item.unit,preferred)} in stock</small></span>{item.id===value&&<span aria-hidden="true">✓</span>}</button>)}{!filtered.length&&<p className="product-empty">{items.length?'No matches. Try another category or search.':'No ingredients available. Add stock to Inventory or check the ingredients already in this recipe.'}</p>}</div></div></div>
    </div>
  </Modal>}</div>;
}
