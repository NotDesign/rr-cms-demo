// Short, interruptible transitions preserve context without delaying data updates.
export function animateRegion(element,kind='content'){
  if(!element)return;
  for(const animation of element.getAnimations())animation.cancel();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const presets={
    submenu:[{transform:'translateX(-24px)',opacity:.55},{transform:'translateX(0)',opacity:1}],
    drawer:[{transform:'translateX(100%)',opacity:.85},{transform:'translateX(0)',opacity:1}],
    detail:[{transform:'translateX(18px)',opacity:.65},{transform:'translateX(0)',opacity:1}],
    popover:[{transform:'translateY(-6px)',opacity:.6},{transform:'translateY(0)',opacity:1}],
    content:[{transform:'translateY(5px)',opacity:.75},{transform:'translateY(0)',opacity:1}]
  };
  return element.animate(presets[kind]||presets.content,{duration:kind==='drawer'?260:kind==='submenu'?220:kind==='detail'?190:160,easing:'cubic-bezier(.22,.8,.25,1)'});
}
