'use client';
import {formatAmount,useUnit,type RecipeUnit} from './Units';
import { GlassIcon, type GlassStyle } from './GlassIcon';
import { ContainerIcon, type Appearance } from './ContainerIcon';
type Stock=Appearance&{id:string;name:string;unit:string};
export function CompactRecipe({cocktail,ingredients,items,servings,edit}:{cocktail:GlassStyle&{id:string;name:string;price:number|null};ingredients:{inventory_id:string;amount:number;amount_unit?:RecipeUnit|null}[];items:Stock[];servings:number|null;edit?:()=>void}) {
  const preferred=useUnit();
  return <section className="recipe compact-recipe" aria-label={`${cocktail.name} recipe`}><span className="eyebrow">RECIPE</span><div className="compact-recipe-title"><GlassIcon {...cocktail}/><h2>{cocktail.name}</h2></div><div className="compact-recipe-meta"><strong>{cocktail.price===null?'Price not set':new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(cocktail.price)}</strong><span>{servings===null?'No ingredients yet':`${servings} ${servings===1?'drink':'drinks'} available`}</span></div><div className="compact-recipe-ingredients">{ingredients.map(line=>{const item=items.find(i=>i.id===line.inventory_id);return <div className="compact-recipe-line" key={line.inventory_id}>{item&&<ContainerIcon {...item}/>}<span>{item?.name||'Ingredient'}</span><strong>{formatAmount(line.amount,item?.unit||'ml',preferred,line.amount_unit)}</strong></div>;})}{!ingredients.length&&<p className="empty">Add ingredients using Edit recipe.</p>}</div>{edit&&<button type="button" className="secondary compact-recipe-edit" onClick={edit}>Edit recipe</button>}</section>;
}
