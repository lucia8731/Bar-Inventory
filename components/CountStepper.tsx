'use client';
export function CountStepper({value,onChange,label,disabled=false}:{value:string;onChange:(value:string)=>void;label:string;disabled?:boolean}) {
  function adjust(change:number){onChange(String(Math.min(1000000,Math.max(0,Math.round(((Number(value)||0)+change)*1000000)/1000000))));}
  return <span className="count-stepper"><button type="button" aria-label={`Decrease ${label}`} disabled={disabled||Number(value)<=0} onClick={()=>adjust(-1)}>−</button><input aria-label={label} type="number" inputMode="decimal" required min="0" max="1000000" step="any" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/><button type="button" aria-label={`Increase ${label}`} disabled={disabled||Number(value)>=1000000} onClick={()=>adjust(1)}>+</button></span>;
}
