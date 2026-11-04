// Store identities rather than positions or values, so changing data never changes a layout.
export const INFO_CARDS_KEY='rr-cms-info-cards-v1';
export function normalizeCardLayout(value,keys){
 const known=[...new Set(keys)],raw=value&&typeof value==='object'?value:{};
 const clean=list=>[...new Set(list.filter(key=>known.includes(key)))];
 const order=Array.isArray(raw.order)?clean(raw.order):[];
 const visible=Array.isArray(raw.visible)?clean(raw.visible):known;
 const added=known.filter(key=>!order.includes(key));
 return {order:[...order,...added],visible:Array.isArray(raw.visible)?[...visible,...added]:[...known]};
}
export function moveCard(layout,key,direction){
 const next={order:[...layout.order],visible:[...layout.visible]},index=next.order.indexOf(key),target=index+direction;
 if([-1,1].includes(direction)&&index>=0&&target>=0&&target<next.order.length)[next.order[index],next.order[target]]=[next.order[target],next.order[index]];
 return next;
}
export function placeCard(layout,key,before,after=false){
 if(key===before||!layout.order.includes(key)||!layout.order.includes(before))return layout;
 const order=layout.order.filter(id=>id!==key);order.splice(order.indexOf(before)+(after?1:0),0,key);
 return {...layout,order};
}
