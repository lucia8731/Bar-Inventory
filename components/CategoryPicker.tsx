'use client';
import { useEffect, useRef, useState } from 'react';
const groups = [
  {id:'spirits',label:'Spirits',categories:['Gin','Vodka','Rum','Tequila & Agave','Whisky','Brandy','Other Spirits']},
  {id:'liqueurs',label:'Liqueurs',categories:['Orange Liqueur','Fruit Liqueur','Herbal Liqueur','Other Liqueur']},
  {id:'wine',label:'Aperitifs & Wine',categories:['Aperitif & Amaro','Vermouth & Wine']},
  {id:'mixers',label:'Mixers & Syrups',categories:['Bitters','Syrup','Juice & Purée','Mixer']},
  {id:'produce',label:'Produce & Pantry',categories:['Fruit','Garnish & Pantry']},
];
const known = new Set(groups.flatMap(g=>g.categories));
export function matchesCategory(category:string, value:string):boolean {
  if(value==='All')return true;
  if(value==='group:other')return !known.has(category);
  if(value.startsWith('group:'))return groups.find(g=>value===`group:${g.id}`)?.categories.includes(category)??false;
  return category===value;
}
export function CategoryPicker({items,value,onChange}:{items:{category:string}[];value:string;onChange:(value:string)=>void}) {
  const [query,setQuery]=useState('');const root=useRef<HTMLDetailsElement>(null);const trigger=useRef<HTMLElement>(null);
  const counts=new Map<string,number>();items.forEach(i=>counts.set(i.category,(counts.get(i.category)??0)+1));
  const other=Array.from(counts.keys()).filter(c=>!known.has(c)).sort();
  const allGroups=[...groups,{id:'other',label:'Other',categories:other}];
  const selected=value==='All'?'All categories':value.startsWith('group:')?allGroups.find(g=>value===`group:${g.id}`)?.label:value;
  useEffect(()=>{function outside(e:PointerEvent){if(e.target instanceof Node && !root.current?.contains(e.target) && root.current)root.current.open=false;}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
  function choose(next:string){onChange(next);setQuery('');if(root.current)root.current.open=false;trigger.current?.focus();}
  return <details ref={root} className="category-picker" onKeyDown={e=>{if(e.key==='Escape'){if(root.current)root.current.open=false;trigger.current?.focus();}}}><summary ref={trigger} aria-label={`Filter by category: ${selected}`}><span>{selected}</span><span aria-hidden="true">⌄</span></summary><div className="category-menu"><input type="search" aria-label="Find a category" placeholder="Find a category…" value={query} onChange={e=>setQuery(e.target.value)}/><button type="button" className="secondary category-all" aria-pressed={value==='All'} onClick={()=>choose('All')}>All categories <small>{items.length}</small></button>{allGroups.map(group=>{const categories=group.categories.filter(c=>counts.has(c));const visible=categories.filter(c=>`${group.label} ${c}`.toLowerCase().includes(query.toLowerCase()));if(!visible.length)return null;return <section className="category-group" key={group.id}><button type="button" className="text-button category-group-title" aria-pressed={value===`group:${group.id}`} onClick={()=>choose(`group:${group.id}`)}><strong>{group.label}</strong><small>{categories.reduce((total,c)=>total+(counts.get(c)??0),0)} items · View all →</small></button><div className="category-chips">{visible.map(c=><button type="button" className="small-button category-chip" key={c} aria-pressed={value===c} onClick={()=>choose(c)}>{c}<small>{counts.get(c)}</small></button>)}</div></section>;})}{!allGroups.some(g=>g.categories.some(c=>counts.has(c)&&`${g.label} ${c}`.toLowerCase().includes(query.toLowerCase())))&&<p className="empty">No categories found.</p>}</div></details>;
}
