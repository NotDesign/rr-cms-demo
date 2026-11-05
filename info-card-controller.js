import {INFO_CARDS_KEY,normalizeCardLayout,moveCard,placeCard} from './info-cards.js?v=14.4.5';
import {escape as e} from './core.js?v=14.4.1';
import {uiIcon} from './ui-icons.js?v=14.4.8';
import {animateRegion,animateExit,cancelRegion} from './motion.js?v=14.4.1';

// Only summary metrics are included. Data rows, charts, filters and entity cards keep their meaning.
const definitions=[
 ['.summary','summary','財務摘要','.summary-card','.summary-label'],
 ['.mg-metrics','overview','總覽資訊','.mg-metric,.wager-info-card','small,.wager-card-label'],
 ['.wager-card-grid','wagers','投注與盈虧','.wager-info-card','.wager-card-label'],
 ['.operation-metrics','operations','營運指標',':scope > div','small'],
 ['.pm-financials','player-finance','玩家盈虧','.mg-metric','small'],
 ['.mg-version-overview','versions','版本資訊','.mg-metric','small'],
 ['.acct-metrics','accounting','帳務摘要','.acct-metric','small'],
 ['.acct-detail-summary','accounting-detail','來源摘要','.acct-metric','small'],
 ['.cms-trial-metrics','trial','規則試算',':scope > div','small'],
 ['.mg-category-metrics','category-metrics','遊戲分類資訊',':scope > div','.metric-card-label'],
 ['.game-card-metrics','game-metrics','遊戲卡片資訊',':scope > span','small']
];
const selector=definitions.map(([s])=>s).join(',');
const readStore=()=>{try{const v=JSON.parse(localStorage.getItem(INFO_CARDS_KEY));return v?.schema===1&&v.layouts&&typeof v.layouts==='object'&&!Array.isArray(v.layouts)?v.layouts:{};}catch{return {};}};
const signature=keys=>keys.slice().sort().join('|');

export function installInfoCards({pageScope,translate=text=>text,localize=root=>root,toast=()=>{}}){
 const registry=new WeakMap();let draft=null,drag=null;
 const dialog=document.getElementById('info-card-settings-modal');
 const areaFor=root=>root.id==='modal'||root.closest?.('#modal')?document.querySelector('#modal .dialog-body'):root.id==='content'||root.closest?.('#content')||root.id==='app'?document.getElementById('content'):null;
 function enhance(root){
  const area=areaFor(root);if(!area||area.closest('#info-card-settings-modal'))return;
  // Management count cards and their adjacent financial cards are one sortable overview.
  for(const grid of area.querySelectorAll('.mg-metrics')){
   const next=grid.nextElementSibling,wager=next?.matches('.wager-overview')&&next.querySelector('.wager-card-grid');
   if(wager){grid.append(...wager.children);wager.remove();grid.classList.add('info-combined-grid');next.classList.add('info-meta-only');}
  }
  const groups=[],store=readStore(),scope=area.id==='content'?'page:'+pageScope():'detail',occurrences=new Map();
  for(const grid of area.querySelectorAll(selector)){
   const def=definitions.find(([s])=>grid.matches(s)),[,kind,title,cardSelector,labelSelector]=def;
   const cards=[...grid.querySelectorAll(cardSelector)].filter(card=>card.parentElement===grid);
   if(!cards.length)continue;
   const counts=new Map(),items=cards.map(card=>{
    const label=card.dataset.infoLabel||card.querySelector(labelSelector)?.textContent.trim()||'';
    const base=card.dataset.wagerCard||label,count=counts.get(base)||0;counts.set(base,count+1);
    const id=card.dataset.infoCard||base+(count?'#'+count:'');card.dataset.infoCard=id;card.dataset.infoLabel=label;
    if(!card.dataset.infoDefault)card.dataset.infoDefault=String(itemsIndex(card,grid));
    return {id,label,icon:card.querySelector('svg')?.outerHTML||uiIcon('dashboard'),node:card,initial:Number(card.dataset.infoDefault)};
   }).sort((a,b)=>a.initial-b.initial);
   const ordinal=occurrences.get(kind)||0;occurrences.set(kind,ordinal+1);
   const key=grid.dataset.infoGroup||JSON.stringify([scope,kind,scope==='detail'?signature(items.map(item=>item.id)):kind==='game-metrics'?0:ordinal]);
   grid.dataset.infoGroup=key;
   const group={key,kind,title,items,grid,layout:normalizeCardLayout(Object.hasOwn(store,key)?store[key]:null,items.map(item=>item.id))};
   apply(group);groups.push(group);
  }
  registry.set(area,groups);
  let toolbar=area.querySelector('.info-card-toolbar');
  if(groups.length&&!toolbar){
   toolbar=document.createElement('div');toolbar.className='info-card-toolbar';
   toolbar.innerHTML='<button type="button" class="button small" data-info-open aria-haspopup="dialog" aria-controls="info-card-settings-modal">'+uiIcon('sliders')+'資訊卡設定</button>';
   const first=groups[0].grid,anchor=first.closest('.wager-overview')||first;
   anchor.before(toolbar);localize(toolbar);
  }
 }
 function itemsIndex(card,grid){return [...grid.children].indexOf(card);}
 function apply(group){
  const nodes=new Map(group.items.map(item=>[item.id,item.node]));
  for(const id of group.layout.order){const card=nodes.get(id);card.hidden=!group.layout.visible.includes(id);group.grid.append(card);}
  group.grid.classList.toggle('info-grid-empty',!group.layout.visible.length);
 }
 function uniqueGroups(area){return [...new Map((registry.get(area)||[]).map(group=>[group.key,group])).values()];}
 function show(area,trigger){
  const groups=uniqueGroups(area);if(!groups.length)return;
  draft={area,trigger,groups:groups.map(group=>({...group,layout:normalizeCardLayout(group.layout,group.items.map(item=>item.id))})),active:0};
  dialog.innerHTML='<div class="dialog-header"><div><h2 id="info-card-settings-title">資訊卡設定</h2><small>選擇顯示資訊與排列順序</small></div><button type="button" class="icon-button close" data-info-close aria-label="關閉資訊卡設定">×</button></div><div class="dialog-body"></div><div class="dialog-footer"><button class="button" data-info-close>取消</button><button class="button primary" data-info-save>套用設定</button></div>';
  renderEditor();localize(dialog);dialog.showModal();animateRegion(dialog,'popover');
 }
 function renderEditor(focusId=null,direction=null){
  const body=dialog.querySelector('.dialog-body'),top=body.scrollTop,group=draft.groups[draft.active],byId=new Map(group.items.map(item=>[item.id,item]));
  body.innerHTML=(draft.groups.length>1?'<div class="info-group-tabs" role="group" aria-label="資訊區域">'+draft.groups.map((g,i)=>'<button type="button" data-info-section="'+i+'" aria-pressed="'+(i===draft.active)+'">'+e(g.title)+'</button>').join('')+'</div>':'')+
   '<div class="info-editor-tools"><span id="info-card-count" role="status">已顯示 '+group.layout.visible.length+' / '+group.items.length+' 項</span><div><button class="button small" data-info-preset="all">全選</button><button class="button small" data-info-preset="none">清空</button><button class="button small" data-info-preset="default">恢復預設</button></div></div>'+
   '<p class="info-editor-hint">拖曳排序，或使用上下箭頭調整；取消勾選即可隱藏。</p><ol class="info-editor-list">'+group.layout.order.map((id,index)=>{const item=byId.get(id);return '<li data-info-row="'+e(id)+'"><span class="info-drag-handle" aria-hidden="true">⠿</span><label><input type="checkbox" data-info-visible="'+e(id)+'"'+(group.layout.visible.includes(id)?' checked':'')+'>'+item.icon+'<span>'+e(item.label)+'</span></label><div class="info-move-controls"><button type="button" class="icon-button" data-info-move="'+e(id)+'" data-info-direction="-1" aria-label="上移 '+e(item.label)+'"'+(!index?' disabled':'')+'>'+uiIcon('arrow','info-arrow-up')+'</button><button type="button" class="icon-button" data-info-move="'+e(id)+'" data-info-direction="1" aria-label="下移 '+e(item.label)+'"'+(index===group.items.length-1?' disabled':'')+'>'+uiIcon('arrow','info-arrow-down')+'</button></div></li>';}).join('')+'</ol>'+
   '<p class="info-editor-note">設定會記住在目前瀏覽器，套用於此頁的資訊卡。</p><p class="mg-error" data-info-error role="alert" hidden></p>';
  localize(body);body.scrollTop=top;
  if(focusId){const moves=[...body.querySelectorAll('[data-info-move]')],target=moves.find(b=>b.dataset.infoMove===focusId&&b.dataset.infoDirection===String(direction)&&!b.disabled)||[...body.querySelectorAll('[data-info-visible]')].find(b=>b.dataset.infoVisible===focusId);target?.focus({preventScroll:true});}
 }
 function close({animated=true,restoreFocus=true}={}){
  if(!dialog.open||(dialog.dataset.closing&&animated))return;
  const trigger=draft?.trigger;const finish=()=>{dialog.close();dialog.replaceChildren();delete dialog.dataset.closing;draft=null;drag=null;if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});};
  if(animated){dialog.dataset.closing='true';for(const button of dialog.querySelectorAll('button'))button.disabled=true;animateExit(dialog,'popover',finish);}else{cancelRegion(dialog);finish();}
 }
 function save(){
  if(!draft||dialog.dataset.closing)return;
  const store=readStore();for(const group of draft.groups)store[group.key]=group.layout;
  try{localStorage.setItem(INFO_CARDS_KEY,JSON.stringify({schema:1,layouts:store}));}
  catch{const error=dialog.querySelector('[data-info-error]');error.hidden=false;error.textContent=translate('無法儲存顯示設定，請檢查瀏覽器儲存空間');return;}
  const area=draft.area,top=area.scrollTop;
  for(const group of registry.get(area)||[]){const changed=draft.groups.find(g=>g.key===group.key);if(changed){group.layout=changed.layout;apply(group);animateRegion(group.grid);}}
  area.scrollTop=top;close();toast('資訊卡設定已儲存');
 }
 function handleClick(target){
  if(target.hasAttribute('data-info-open')){show(target.closest('#modal')?document.querySelector('#modal .dialog-body'):document.getElementById('content'),target);return true;}
  if(!target.closest('#info-card-settings-modal'))return false;
  if(target.hasAttribute('data-info-close')){close();return true;}
  if(target.hasAttribute('data-info-save')){save();return true;}
  if(!draft||dialog.dataset.closing)return true;
  if(target.hasAttribute('data-info-section')){draft.active=Number(target.dataset.infoSection);renderEditor();return true;}
  const group=draft.groups[draft.active];
  if(target.hasAttribute('data-info-move')){const direction=Number(target.dataset.infoDirection),id=target.dataset.infoMove;group.layout=moveCard(group.layout,id,direction);renderEditor(id,direction);return true;}
  if(target.dataset.infoPreset){const preset=target.dataset.infoPreset;group.layout=preset==='default'?normalizeCardLayout(null,group.items.map(item=>item.id)):{...group.layout,visible:preset==='all'?[...group.layout.order]:[]};renderEditor();return true;}
  return true;
 }
 dialog.addEventListener('change',event=>{const id=event.target.dataset.infoVisible;if(!draft||id===undefined)return;const group=draft.groups[draft.active];group.layout.visible=event.target.checked?[...new Set([...group.layout.visible,id])]:group.layout.visible.filter(key=>key!==id);const count=dialog.querySelector('#info-card-count');count.textContent=translate('已顯示 ')+group.layout.visible.length+' / '+group.items.length+translate(' 項');});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 function clearDrag(){drag=null;for(const row of dialog.querySelectorAll('.info-dragging,.info-drop-target,.info-drop-after'))row.classList.remove('info-dragging','info-drop-target','info-drop-after');}
 dialog.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('.info-drag-handle');if(!handle||!draft||event.button!==0)return;
  drag={key:handle.closest('[data-info-row]').dataset.infoRow,pointer:event.pointerId,start:event.clientY,moved:false,target:null,after:false};
  handle.setPointerCapture(event.pointerId);event.preventDefault();
 });
 dialog.addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId||Math.abs(event.clientY-drag.start)<6&&!drag.moved)return;
  drag.moved=true;
  const rows=[...dialog.querySelectorAll('[data-info-row]')],row=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-info-row]');
  rows.find(n=>n.dataset.infoRow===drag.key)?.classList.add('info-dragging');
  for(const node of rows)node.classList.remove('info-drop-target','info-drop-after');
  if(row&&dialog.contains(row)){const r=row.getBoundingClientRect();drag.target=row.dataset.infoRow;drag.after=event.clientY>r.top+r.height/2;row.classList.add('info-drop-target');row.classList.toggle('info-drop-after',drag.after);}
  const body=dialog.querySelector('.dialog-body'),r=body.getBoundingClientRect();if(event.clientY>r.bottom-28)body.scrollTop+=12;else if(event.clientY<r.top+28)body.scrollTop-=12;
 });
 dialog.addEventListener('pointerup',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  const finished=drag;if(event.target.hasPointerCapture?.(event.pointerId))event.target.releasePointerCapture(event.pointerId);clearDrag();
  if(draft&&finished.moved&&finished.target){const group=draft.groups[draft.active];group.layout=placeCard(group.layout,finished.key,finished.target,finished.after);renderEditor(finished.key);}
 });
 dialog.addEventListener('pointercancel',clearDrag);
 window.addEventListener('storage',event=>{if(event.key===INFO_CARDS_KEY&&!dialog.open){for(const area of [document.getElementById('content'),document.querySelector('#modal .dialog-body')])if(area)enhance(area);}});
 return {enhance,handleClick,close,isOpen:()=>dialog.open};
}
