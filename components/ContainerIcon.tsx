'use client';

import options from '@/data/appearance.json';

export type Appearance = { container_shape: string; container_color: string };
export const shapes = options.shapes;
export const colors = options.colors;
const paths: Record<string, string> = {
  bottle: 'M18 5h12v15l6 8v35a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V28l6-8Z',
  tall: 'M19 4h10v22l5 8v30a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V34l5-8Z',
  round: 'M19 5h10v18c0 4 12 8 12 22v7c0 9-5 15-17 15S7 61 7 52v-7c0-14 12-18 12-22Z',
  square: 'M18 6h12v15l9 8v35a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V29l9-8Z',
  wine: 'M20 4h8v22c0 9 10 11 10 22v16a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V48c0-11 10-13 10-22Z',
  dropper: 'M18 13h12v15l7 8v27a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V36l7-8Z',
  can: 'M13 16h22l3 5v42a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V21Z',
  carton: 'M12 24l7-14h15l5 14v43H9V24Z',
  jar: 'M11 25h26v7l3 5v24a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V37l3-5Z',
  crate: 'M5 32h38v31a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z',
};
export function ContainerIcon({ container_shape, container_color }: Appearance) {
  const shape = shapes.find(s => s.id === container_shape) ?? shapes[0];
  const color = colors.find(c => c.id === container_color) ?? colors[0];
  return <svg className="container-icon" viewBox="0 0 48 72" role="img" aria-label={`${color.label}, ${shape.label}`}>
    <title>{color.label} · {shape.label}</title>
    <path d={paths[shape.id]} fill={color.hex} stroke="#59616b" strokeWidth="1.5" strokeLinejoin="round" />
    {shape.id === 'crate' ? <><path d="M7 43h34M7 55h34M17 33v33M31 33v33" stroke="#59616b" strokeWidth="1.3"/><path d="M12 31c-4-15 10-19 12-7 5-17 16-12 13 7" fill={color.hex} stroke="#59616b" strokeWidth="1.5"/></> : <>
      {['bottle','tall','round','square','wine','dropper'].includes(shape.id) && <path d={shape.id === 'dropper' ? 'M18 13V7q6-6 12 0v6Z' : `M${shape.id === 'wine' ? 20 : shape.id === 'tall' ? 19 : 18} 8h${shape.id === 'wine' ? 8 : shape.id === 'tall' ? 10 : 12}`} fill="#59616b" stroke="#59616b" strokeWidth="3" strokeLinecap="round" />}
      <rect x="16" y="41" width="16" height="14" rx="1.5" fill="#fff" opacity=".76" />
      <path d="M19 46h10m-10 4h7" stroke="#59616b" strokeWidth="1" opacity=".55" />
      {shape.id === 'can' && <path d="M14 20h20m-18-1 4-2h8" stroke="#59616b" fill="none" />}
      {shape.id === 'carton' && <path d="M12 24h27M19 10l8 14v15" stroke="#59616b" fill="none" />}
      {shape.id === 'jar' && <rect x="10" y="21" width="28" height="6" rx="2" fill="#59616b" />}
    </>}
  </svg>;
}
export function AppearancePicker({ value, onChange }: { value: Appearance; onChange: (value: Appearance) => void }) {
  return <fieldset className="appearance-picker"><legend>Container appearance</legend><div className="shape-options" role="group" aria-label="Container shape">{shapes.map(shape => <button type="button" className="small-button shape-option" key={shape.id} aria-label={shape.label} title={shape.label} aria-pressed={value.container_shape === shape.id} onClick={() => onChange({ ...value, container_shape: shape.id })}><ContainerIcon container_shape={shape.id} container_color={value.container_color} /></button>)}</div><div className="color-options" role="group" aria-label="Container fill color">{colors.map(color => <button type="button" className="small-button color-option" key={color.id} title={color.label} aria-label={color.label} aria-pressed={value.container_color === color.id} style={{ backgroundColor: color.hex }} onClick={() => onChange({ ...value, container_color: color.id })}>{value.container_color === color.id && <span>✓</span>}</button>)}</div></fieldset>;
}
