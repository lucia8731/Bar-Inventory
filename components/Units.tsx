'use client';
import {createContext,useContext} from 'react';
export type LiquidUnit='ml'|'oz';
export type RecipeUnit=LiquidUnit|'drop'|'dash'|'piece';
export const UnitsContext=createContext<LiquidUnit>('ml');
export const useUnit=()=>useContext(UnitsContext);
export const factors:Record<RecipeUnit,number>={ml:1,oz:29.5735295625,drop:0.05,dash:1,piece:1};
export function recipeUnit(stockUnit:string|undefined,saved:RecipeUnit|null|undefined,preferred:LiquidUnit):RecipeUnit{return stockUnit==='piece'?'piece':saved==='drop'||saved==='dash'?saved:preferred;}
export function formatAmount(amount:number,stockUnit:string,preferred:LiquidUnit,saved?:RecipeUnit|null){const unit=recipeUnit(stockUnit,saved,preferred);return `${Number((Number(amount)/factors[unit]).toFixed(4))} ${unit}`;}
export function UnitSelect({value,onChange,stockUnit,disabled=false}:{value:RecipeUnit;onChange:(unit:RecipeUnit)=>void;stockUnit?:string;disabled?:boolean}){return <select aria-label="Recipe amount unit" value={value} disabled={disabled} onChange={e=>onChange(e.target.value as RecipeUnit)}>{(stockUnit==='piece'?['piece']:['ml','oz','drop','dash']).map(unit=><option key={unit} value={unit}>{unit}</option>)}</select>;}
export function UnitHint(){return <small className="unit-hint">Stock estimates: 1 dash ≈ 1 ml · 1 drop ≈ 0.05 ml. Actual pours vary.</small>;}
