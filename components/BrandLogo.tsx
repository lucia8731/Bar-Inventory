export function BrandMark() {
  return <svg className="barbase-mark" viewBox="0 0 64 76" aria-hidden="true" fill="none"><path d="M7 20h48c0 15-10 20-25 20S7 34 7 20ZM28 40v29M20 69h20c22 0 22-29 0-29H28" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="50" cy="14" r="8" fill="#f4cf62" stroke="white" strokeWidth="2.5"/></svg>;
}
export function BrandLogo({className=''}:{className?:string}) {return <span className={`barbase-logo ${className}`} aria-label="BarBase"><BrandMark/><span className="brand-label">BarBase</span></span>;}
