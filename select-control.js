import {uiIcon} from './ui-icons.js?v=12.5';
import {animateRegion,animateExit} from './motion.js?v=12.5';

// Keep the form's native value/change contract while presenting one shared menu.
export function installSelectControls({onOpen=()=>{}}={}){
 let opened=null,sequence=0,typeahead='',typedAt=0;
 const controls=new WeakMap();
 function close({focus=false,animated=false}={}){
  if(!opened)return;
  const state=opened;opened=null;
  state.button.setAttribute('aria-expanded','false');state.button.removeAttribute('aria-activedescendant');
  state.panel.inert=true;
  const remove=()=>{if(state.panel.matches(':popover-open'))state.panel.hidePopover();state.panel.remove();};
  if(animated)animateExit(state.panel,'popover',remove);else remove();
  if(focus&&state.button.isConnected)state.button.focus({preventScroll:true});
 }
 function position(){
  if(!opened)return;
  const {button,panel}=opened,r=button.getBoundingClientRect(),gap=7,pad=12;
  panel.style.width=Math.min(Math.max(r.width,136),innerWidth-pad*2)+'px';
  panel.style.maxHeight=Math.max(80,Math.min(296,Math.max(innerHeight-r.bottom,r.top)-gap-pad))+'px';
  const h=panel.getBoundingClientRect().height;
  panel.style.left=Math.max(pad,Math.min(r.left,innerWidth-panel.offsetWidth-pad))+'px';
  panel.style.top=(r.bottom+gap+h<=innerHeight-pad?r.bottom+gap:Math.max(pad,r.top-gap-h))+'px';
 }
 function highlight(index){
  if(!opened)return;
  const items=[...opened.panel.querySelectorAll('[role=option]')];
  opened.index=(index+items.length)%items.length;
  items.forEach((item,i)=>item.classList.toggle('highlighted',i===opened.index));
  const item=items[opened.index];if(!item)return;
  opened.button.setAttribute('aria-activedescendant',item.id);item.scrollIntoView({block:'nearest'});
 }
 function choose(index){
  if(!opened)return;
  const {select,button,options}=opened,option=options[index];if(!option)return;
  close();button.focus({preventScroll:true});
  if(select.value!==option.value){select.value=option.value;controls.get(select).sync();select.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 function open(select,button){
  if(opened?.select===select){close({animated:true});return;}
  close();onOpen();
  const options=[...select.options].filter(o=>!o.disabled&&!o.hidden);if(!options.length)return;
  const panel=document.createElement('div');panel.className='select-popover';panel.id='select-menu-'+(++sequence);
  panel.setAttribute('role','listbox');panel.setAttribute('aria-label',button.getAttribute('aria-label'));panel.setAttribute('popover','manual');
  options.forEach((option,i)=>{
   const item=document.createElement('button');item.type='button';item.tabIndex=-1;item.id=panel.id+'-'+i;
   item.className='select-option';item.dataset.selectOption=i;item.setAttribute('role','option');item.setAttribute('aria-selected',option.selected);
   const label=document.createElement('span');label.textContent=option.textContent;item.append(label);item.insertAdjacentHTML('beforeend',uiIcon('check'));panel.append(item);
  });
  // A popover enters the top layer, so the same menu also works inside a modal.
  (select.closest('dialog[open]')||document.body).append(panel);panel.showPopover();
  button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','true');
  opened={select,button,panel,options,index:Math.max(0,options.findIndex(o=>o.selected))};
  position();highlight(opened.index);animateRegion(panel,'popover');
 }
 function enhance(){
  if(opened&&!opened.select.isConnected)close();
  document.querySelectorAll('select:not([multiple])').forEach(select=>{
   if(controls.has(select)){controls.get(select).sync();return;}
   const button=document.createElement('button');button.type='button';button.id=(select.id||'select-'+(++sequence))+'-trigger';
   button.className='select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
   const sourceLabel=select.labels?.[0],label=select.getAttribute('aria-label')||sourceLabel?.textContent.trim()||select.name;
   button.setAttribute('aria-label',label);button.innerHTML='<span class="select-value"></span>'+uiIcon('chevronDown');
   const copy=button.querySelector('.select-value');
   function sync(){const value=select.selectedOptions[0]?.textContent||'';if(copy.textContent!==value)copy.textContent=value;button.disabled=select.disabled;}
   controls.set(select,{button,sync});select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);
   if(sourceLabel?.htmlFor===select.id)sourceLabel.htmlFor=button.id;
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open(select,button);});
   select.addEventListener('change',sync);sync();
  });
 }
 document.addEventListener('click',event=>{
  const item=event.target.closest('[data-select-option]');
  if(item&&opened?.panel.contains(item)){event.preventDefault();event.stopPropagation();choose(Number(item.dataset.selectOption));return;}
  if(opened&&!opened.button.contains(event.target)&&!opened.panel.contains(event.target))close({animated:true});
 },true);
 document.addEventListener('pointerover',event=>{const item=event.target.closest('[data-select-option]');if(item&&opened?.panel.contains(item))highlight(Number(item.dataset.selectOption));});
 document.addEventListener('keydown',event=>{
  const button=event.target.closest('.select-trigger');if(!button)return;
  const select=button.previousElementSibling;if(select?.tagName!=='SELECT')return;
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
   if(event.key==='Escape'&&!opened)return;
   event.preventDefault();event.stopImmediatePropagation();
   if(event.key==='Escape'){close({focus:true,animated:true});return;}
   if(!opened||opened.select!==select){open(select,button);if(event.key==='Home')highlight(0);if(event.key==='End')highlight(opened.options.length-1);return;}
   if(event.key==='Enter'||event.key===' '){choose(opened.index);return;}
   highlight(event.key==='Home'?0:event.key==='End'?opened.options.length-1:opened.index+(event.key==='ArrowDown'?1:-1));
  }else if(event.key==='Tab')close();
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   event.preventDefault();if(!opened)open(select,button);
   typeahead=(Date.now()-typedAt<700?typeahead:'')+event.key.toLocaleLowerCase();typedAt=Date.now();
   const index=opened.options.findIndex(o=>o.textContent.trim().toLocaleLowerCase().startsWith(typeahead));if(index>=0)highlight(index);
  }
 },true);
 document.addEventListener('focusin',event=>{if(opened&&!opened.button.contains(event.target)&&!opened.panel.contains(event.target))close();});
 window.addEventListener('resize',position);
 document.addEventListener('scroll',event=>{if(opened&&!opened.panel.contains(event.target))close();},true);
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 return {enhance,close};
}
