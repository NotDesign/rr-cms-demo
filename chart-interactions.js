import {escape as e} from './core.js?v=12.6';

// Shared by SVG charts, HTML bars and the charts inside detail drawers.
export function chartTipAttrs(title,rows,{focusable=false,note=''}={}){
 const data={title,rows,note};
 const label=[title,...rows.map(r=>r.label+' '+r.value),note].filter(Boolean).join(' · ');
 return ' data-chart-tip="'+e(JSON.stringify(data))+'"'+(focusable?' tabindex="0" role="img"':'')+' aria-label="'+e(label)+'"';
}
export function chartTipPosition(point,size,viewport){
 const gap=14,pad=12;
 let left=point.x+gap,top=point.y-size.height-gap;
 if(left+size.width>viewport.width-pad)left=point.x-size.width-gap;
 if(top<pad)top=point.y+gap;
 return {left:Math.max(pad,Math.min(left,viewport.width-size.width-pad)),top:Math.max(pad,Math.min(top,viewport.height-size.height-pad))};
}
export function installChartInteractions({translate=value=>value}={}){
 const tooltip=document.createElement('div');
 tooltip.id='chart-tooltip';tooltip.className='chart-tooltip';tooltip.setAttribute('role','tooltip');tooltip.setAttribute('popover','manual');tooltip.hidden=true;
 document.body.append(tooltip);
 let anchor=null,description=null,keyboard=false;
 const target=event=>event.target.closest?.('[data-chart-tip]');
 function hide(){
  if(anchor){anchor.classList.remove('chart-highlight');if(description===null)anchor.removeAttribute('aria-describedby');else anchor.setAttribute('aria-describedby',description);const scope=anchor.closest('[data-chart-scope]');scope?.querySelectorAll('.chart-highlight').forEach(n=>n.classList.remove('chart-highlight'));scope?.querySelector('.chart-crosshair')?.setAttribute('visibility','hidden');}
  if(tooltip.matches(':popover-open'))tooltip.hidePopover();
  tooltip.hidden=true;anchor=null;
 }
 function position(point){
  const rect=tooltip.getBoundingClientRect(),at=chartTipPosition(point,rect,{width:innerWidth,height:innerHeight});
  tooltip.style.left=at.left+'px';tooltip.style.top=at.top+'px';
 }
 function show(next,point){
  if(!next.isConnected)return;
  keyboard=!point;
  if(next!==anchor||tooltip.hidden){
   hide();let data;try{data=JSON.parse(next.dataset.chartTip);}catch{return;}
   anchor=next;description=anchor.getAttribute('aria-describedby');anchor.setAttribute('aria-describedby',[description,tooltip.id].filter(Boolean).join(' '));anchor.classList.add('chart-highlight');
   tooltip.innerHTML='<strong class="chart-tooltip-title">'+e(translate(data.title))+'</strong>'+(data.note?'<small>'+e(translate(data.note))+'</small>':'')+'<dl>'+data.rows.map(row=>'<div><dt>'+(row.color?'<i style="background:'+e(row.color)+'"></i>':'')+e(translate(row.label))+'</dt><dd'+(['positive','negative'].includes(row.tone)?' class="'+row.tone+'"':'')+'>'+e(translate(row.value))+'</dd></div>').join('')+'</dl>';
   const scope=anchor.closest('[data-chart-scope]'),index=anchor.dataset.chartIndex;
   if(index!==undefined){scope?.querySelectorAll('.chart-dot[data-chart-index="'+index+'"]').forEach(n=>n.classList.add('chart-highlight'));const line=scope?.querySelector('.chart-crosshair');if(line){line.setAttribute('x1',anchor.dataset.chartX);line.setAttribute('x2',anchor.dataset.chartX);line.setAttribute('visibility','visible');}}
   tooltip.hidden=false;if(typeof tooltip.showPopover==='function')tooltip.showPopover();
  }
  const rect=anchor.getBoundingClientRect();position(point||{x:rect.left+rect.width/2,y:rect.top+rect.height/2});
 }
 document.addEventListener('pointerover',event=>{const next=target(event);if(next&&event.pointerType!=='touch')show(next,{x:event.clientX,y:event.clientY});});
 document.addEventListener('pointermove',event=>{if(anchor&&target(event)===anchor&&event.pointerType!=='touch')position({x:event.clientX,y:event.clientY});});
 document.addEventListener('pointerout',event=>{if(anchor&&anchor.contains(event.target)&&!anchor.contains(event.relatedTarget))hide();});
 document.addEventListener('focusin',event=>{const next=target(event);if(next)show(next);});
 document.addEventListener('focusout',event=>{if(anchor?.contains(event.target))hide();});
 document.addEventListener('click',event=>{const next=target(event);if(next)show(next,event.detail?{x:event.clientX,y:event.clientY}:undefined);else hide();});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!tooltip.hidden){hide();event.preventDefault();event.stopImmediatePropagation();return;}
  const next=target(event),scope=next?.closest('[data-chart-scope]');
  if(!scope||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const items=[...scope.querySelectorAll('[data-chart-tip][tabindex="0"]')],index=items.indexOf(next);if(index<0)return;
  const i=event.key==='Home'?0:event.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+(event.key==='ArrowRight'?1:-1)));
  event.preventDefault();items[i].focus({preventScroll:true});
 },true);
 document.addEventListener('scroll',()=>{if(anchor&&keyboard&&document.activeElement===anchor){const r=anchor.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)position({x:r.left+r.width/2,y:r.top+r.height/2});else hide();}else hide();},true);window.addEventListener('resize',hide);
 return {hide};
}
