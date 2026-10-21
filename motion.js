// Short, interruptible transitions preserve context without delaying data updates.
const exits=new WeakMap();
const enter={
 submenu:[{transform:'translateX(-24px)',opacity:.55},{transform:'translateX(0)',opacity:1}],
 rail:[{transform:'translateX(-100%)',opacity:.75},{transform:'translateX(0)',opacity:1}],
 drawer:[{transform:'translateX(100%)',opacity:.85},{transform:'translateX(0)',opacity:1}],
 detail:[{transform:'translateX(18px)',opacity:.65},{transform:'translateX(0)',opacity:1}],
 popover:[{transform:'translateY(-6px)',opacity:.6},{transform:'translateY(0)',opacity:1}],
 content:[{transform:'translateY(5px)',opacity:.75},{transform:'translateY(0)',opacity:1}]
};
export function cancelRegion(element){
 if(!element)return;exits.delete(element);
 for(const animation of element.getAnimations())animation.cancel();
}
export function animateRegion(element,kind='content'){
 if(!element)return;cancelRegion(element);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 return element.animate(enter[kind]||enter.content,{duration:kind==='drawer'?260:kind==='submenu'?220:kind==='detail'?190:160,easing:'cubic-bezier(.22,.8,.25,1)'});
}
export function animateExit(element,kind='popover',complete=()=>{}){
 cancelRegion(element);
 if(!element||matchMedia('(prefers-reduced-motion: reduce)').matches){complete();return;}
 const frames=kind==='drawer'?[{transform:'translateX(0)',opacity:1},{transform:'translateX(100%)',opacity:.7}]:kind==='rail'?[{transform:'translateX(0)',opacity:1},{transform:'translateX(-100%)',opacity:.7}]:kind==='submenu'?[{transform:'translateX(0)',opacity:1},{transform:'translateX(-24px)',opacity:0}]:[{transform:'translateY(0)',opacity:1},{transform:'translateY(-6px)',opacity:0}];
 const animation=element.animate(frames,{duration:kind==='drawer'?220:kind==='rail'||kind==='submenu'?180:140,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
 exits.set(element,animation);
 animation.finished.then(()=>{if(exits.get(element)!==animation)return;exits.delete(element);complete();animation.cancel();},()=>{if(exits.get(element)===animation)exits.delete(element);});
 return animation;
}
