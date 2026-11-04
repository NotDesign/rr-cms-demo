import {ACCOUNTING_ITEMS} from './accounting.js?v=14.4.1';
const keys=ACCOUNTING_ITEMS.map(([key])=>key),featured=['chess','bullet','tool','bonus-buy','free-spin','jackpot'];
export const ACCOUNTING_DISPLAY_KEY='rr-cms-accounting-display-v1';
export function normalizeAccountingDisplay(value,legacyAll=false){
 const raw=value&&typeof value==='object'?value:{},known=list=>[...new Set(list.filter(key=>keys.includes(key)))];
 const order=Array.isArray(raw.order)?known(raw.order):legacyAll?[...keys]:[...featured,...keys.filter(key=>!featured.includes(key))],visible=Array.isArray(raw.visible)?known(raw.visible):legacyAll?[...keys]:[...featured];
 return {schema:1,order:[...order,...keys.filter(key=>!order.includes(key))],visible,details:typeof raw.details==='boolean'?raw.details:true,counts:typeof raw.counts==='boolean'?raw.counts:true};
}
export function visibleAccountingCards(items,display){const normalized=normalizeAccountingDisplay(display),byKey=new Map(items.map(item=>[item.key,item]));return normalized.order.filter(key=>normalized.visible.includes(key)&&byKey.has(key)).map(key=>byKey.get(key));}
export function moveAccountingCard(display,key,direction){const next=normalizeAccountingDisplay(display),index=next.order.indexOf(key),target=index+direction;if(index>=0&&[-1,1].includes(direction)&&target>=0&&target<next.order.length)[next.order[index],next.order[target]]=[next.order[target],next.order[index]];return next;}
