'use client';
import {useRef,useState} from 'react';
import {formatAmount,useUnit} from './Units';
import {Modal} from './Modal';
import {CountStepper} from './CountStepper';
import {ContainerIcon,type Appearance} from './ContainerIcon';
type Stock=Appearance&{id:string;name:string;category:string;unit:string;bottle_size:number|null;quantity:number};
type Delivery={id:string;entries:{inventory_id:string;bottles:number}[]};
export function RestockDialog({items,busy,error,close,save}:{items:Stock[];busy:boolean;error:string;close:()=>void;save:(delivery:Delivery)=>Promise<boolean>}) {
 const preferred=useUnit();
 const [query,setQuery]=useState('');const [counts,setCounts]=useState<Record<string,string>>({});const attempt=useRef<string|null>(null);const [working,setWorking]=useState(false);
 const entries=Object.entries(counts).filter(([,value])=>Number(value)>0).map(([inventory_id,value])=>({inventory_id,bottles:Number(value)})).sort((a,b)=>a.inventory_id.localeCompare(b.inventory_id));
 const shown=items.filter(item=>`${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 return <Modal title="Record delivery" close={()=>{if(!working)close();}}><form className="restock-form" onSubmit={async e=>{e.preventDefault();if(!entries.length||working)return;setWorking(true);attempt.current??=crypto.randomUUID();try{if(await save({id:attempt.current,entries}))close();}finally{setWorking(false);}}}><p>Add the bottles or packs received. These quantities will be added to your current stock.</p><fieldset disabled={busy||working} className="modal-fields"><input aria-label="Search delivery ingredients" placeholder="Search ingredients…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="delivery-list">{shown.map(item=><div className="delivery-row" key={item.id}><ContainerIcon {...item}/><div><strong>{item.name}</strong><small>{item.bottle_size?`${Number((Number(item.quantity)/Number(item.bottle_size)).toFixed(3))} ${item.unit==='ml'?'bottles':'packs'} in stock · ${formatAmount(item.bottle_size,item.unit,preferred)} each`:'Set capacity in Inventory before recording delivery'}</small></div>{item.bottle_size?<CountStepper label={`Received ${item.name}`} value={counts[item.id]??'0'} onChange={value=>setCounts(current=>({...current,[item.id]:value}))}/>:<span className="delivery-unavailable">Capacity needed</span>}</div>)}{!shown.length&&<p>No ingredients found.</p>}</div></fieldset><div className="delivery-total"><span>{entries.length} ingredients · {Number(entries.reduce((sum,line)=>sum+line.bottles,0).toFixed(4))} bottles / packs</span><button className="primary-action" disabled={busy||working||!entries.length}>{working?'Recording…':'Confirm delivery'}</button></div>{error&&<p className="dialog-error" role="alert">{error}</p>}</form></Modal>;
}
