'use client';
import { colors } from './ContainerIcon';
export type GlassStyle = { glass_shape: string; glass_color: string };
const shapes = [ ['coupe','Coupe'],['martini','Martini'],['rocks','Rocks'],['highball','Highball'],['collins','Collins'],['wine','Wine'],['flute','Flute'],['hurricane','Hurricane'] ];
const bowls: Record<string,string> = {
  coupe:'M5 15h38c0 15-8 21-19 21S5 30 5 15Z', martini:'M4 12h40L24 38Z', rocks:'M8 30h32l-3 34H11Z', highball:'M11 13h26l-2 51H13Z', collins:'M15 6h18l-1 58H16Z', wine:'M12 8h24l4 17c2 14-7 20-16 20S6 39 8 25Z', flute:'M17 5h14l-1 30c0 6-3 9-6 9s-6-3-6-9Z', hurricane:'M14 8h20c-5 13 9 20 6 32-2 8-8 10-16 10S10 48 8 40c-3-12 11-19 6-32Z',
};
export function GlassIcon({glass_shape,glass_color}:GlassStyle) {
  const shape = shapes.find(s=>s[0]===glass_shape) ?? shapes[0];
  const color = colors.find(c=>c.id===glass_color) ?? colors[0];
  const stem = ['coupe','martini','wine','flute','hurricane'].includes(shape[0]);
  const top = shape[0]==='coupe'?36:shape[0]==='martini'?38:shape[0]==='hurricane'?50:44;
  return <svg className="container-icon glass-icon" viewBox="0 0 48 72" role="img" aria-label={`${color.label}, ${shape[1]} glass`}><title>{color.label} · {shape[1]}</title><path d={bowls[shape[0]]} fill={color.hex} fillOpacity=".8" stroke="#68717e" strokeWidth="1.5" strokeLinejoin="round"/>{stem && <path d={`M24 ${top}v20M14 65h20`} stroke="#68717e" strokeWidth="1.7" strokeLinecap="round"/>}<path d={stem ? 'M17 20h14' : 'M18 37h12'} stroke="#fff" strokeWidth="2" opacity=".75"/></svg>;
}
export function GlassPicker({value,onChange}:{value:GlassStyle;onChange:(value:GlassStyle)=>void}) {
  return <fieldset className="appearance-picker"><legend>Glass & drink color</legend><div className="shape-options">{shapes.map(([id,label])=><button className="small-button shape-option" type="button" key={id} aria-label={`${label} glass`} aria-pressed={value.glass_shape===id} onClick={()=>onChange({...value,glass_shape:id})}><GlassIcon glass_shape={id} glass_color={value.glass_color}/><span>{label}</span></button>)}</div><div className="color-options" role="group" aria-label="Drink color">{colors.map(color=><button type="button" className="small-button color-option" key={color.id} title={color.label} aria-label={`${color.label} drink`} aria-pressed={value.glass_color===color.id} style={{backgroundColor:color.hex}} onClick={()=>onChange({...value,glass_color:color.id})}>{value.glass_color===color.id && <span>✓</span>}</button>)}</div></fieldset>;
}
