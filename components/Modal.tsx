'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const startedOutside=useRef(false);
  useEffect(()=>{const el=dialog.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';el?.showModal();return()=>{el?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
  function outside(e:React.PointerEvent<HTMLDialogElement>){const r=dialog.current!.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;}
  return <dialog ref={dialog} className="workspace-modal" aria-label={title} onCancel={e=>{e.preventDefault();e.stopPropagation();close();}} onPointerDown={e=>{startedOutside.current=e.target===e.currentTarget&&outside(e);}} onClick={e=>{if(startedOutside.current&&e.target===e.currentTarget)close();startedOutside.current=false;}}><div className="modal-heading"><h2>{title}</h2><button type="button" className="text-button modal-close" aria-label={`Close ${title}`} onClick={close}>×</button></div>{children}</dialog>;
}
