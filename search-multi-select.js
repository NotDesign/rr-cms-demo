import {uiIcon} from './ui-icons.js?v=14.4.8';
import {animateRegion,animateExit} from './motion.js?v=14.4.1';

// Opt-in enhancement: the native selectedOptions remain the form's source of truth.
export function installSearchMultiSelect({onOpen=()=>{}}={}){
 const controls=new WeakMap();let opened=null,sequence=0;
 const norm=value=>String(value).normalize('NFKC').trim().toLocaleLowerCase();
 function close({focus=false,animated=false}={}){
  if(!opened)return;const state=opened;opened=null;
  state.button.setAttribute('aria-expanded','false');state.panel.inert=true;
  const remove=()=>{if(state.panel.matches(':popover-open'))state.panel.hidePopover();state.panel.remove();};
  if(animated)animateExit(state.panel,'popover',remove);else remove();
  if(focus&&state.button.isConnected)state.button.focus({preventScroll:true});
 }
 function position(){
  if(!opened)return;const {button,panel}=opened,r=button.getBoundingClientRect(),pad=12,gap=7;
  panel.style.width=Math.min(Math.max(r.width,300),innerWidth-pad*2)+'px';
  panel.style.maxHeight=Math.min(430,Math.max(180,Math.max(r.top,innerHeight-r.bottom)-gap-pad))+'px';
  const h=panel.getBoundingClientRect().height;
  panel.style.left=Math.max(pad,Math.min(r.left,innerWidth-panel.offsetWidth-pad))+'px';
  panel.style.top=(r.bottom+gap+h<=innerHeight-pad?r.bottom+gap:Math.max(pad,r.top-gap-h))+'px';
 }
 function matching(){const q=norm(opened.search.value);return opened.options.filter(o=>!q||norm(o.textContent+' '+o.value+' '+(o.dataset.meta||'')).includes(q));}
 function syncSelection(){
  if(!opened)return;const selected=opened.select.selectedOptions.length;
  opened.count.textContent=!selected&&opened.select.dataset.emptyMeansAll?'所有 '+opened.options.length+' 項':'已選 '+selected+' / '+opened.options.length+' 項';
  opened.all.textContent=opened.search.value.trim()?'全選結果':'全選';
  const matches=matching();opened.all.disabled=!matches.length||matches.every(o=>o.selected);
  opened.clear.disabled=!selected;
  for(const input of opened.list.querySelectorAll('input'))input.checked=opened.options.find(o=>o.value===input.value)?.selected||false;
  controls.get(opened.select).sync();
 }
 function renderOptions(){
  if(!opened)return;const {list,select}=opened;list.replaceChildren();
  const matches=matching();
  for(const option of matches){
   const row=document.createElement('label');row.className='scope-choice';
   const input=document.createElement('input');input.type='checkbox';input.value=option.value;input.checked=option.selected;
   const copy=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');
   name.textContent=option.textContent;meta.textContent=option.value+(option.dataset.meta?' · '+option.dataset.meta:'');
   copy.append(name,meta);row.append(input,copy);list.append(row);
   input.addEventListener('change',()=>{option.selected=input.checked;select.dispatchEvent(new Event('change',{bubbles:true}));syncSelection();});
  }
  if(!matches.length){const empty=document.createElement('p');empty.className='scope-empty';empty.textContent='沒有符合的選項';list.append(empty);}
  syncSelection();position();
 }
 function open(select,button){
  if(opened?.select===select){close({focus:true,animated:true});return;}close();onOpen();
  const panel=document.createElement('div'),id='scope-menu-'+(++sequence);panel.id=id;panel.className='select-popover scope-popover';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label',button.getAttribute('aria-label'));panel.setAttribute('popover','manual');
  const head=document.createElement('div');head.className='scope-menu-head';
  const title=document.createElement('strong');title.textContent=button.getAttribute('aria-label');
  const done=document.createElement('button');done.type='button';done.className='scope-done';done.textContent='完成';done.addEventListener('click',()=>close({focus:true,animated:true}));head.append(title,done);
  const search=document.createElement('input');search.type='search';search.className='scope-search';search.placeholder='搜尋名稱或 ID';search.setAttribute('aria-label','搜尋'+title.textContent+'名稱或 ID');search.autocomplete='off';
  const tools=document.createElement('div');tools.className='scope-menu-tools';const count=document.createElement('span'),all=document.createElement('button'),clear=document.createElement('button');
  count.setAttribute('role','status');all.type=clear.type='button';clear.textContent='清除全部';tools.append(count,all,clear);
  const list=document.createElement('div');list.className='scope-options';list.setAttribute('role','group');list.setAttribute('aria-label',title.textContent+'選項');
  panel.append(head,search,tools,list);(select.closest('dialog[open]')||document.body).append(panel);panel.showPopover();
  opened={select,button,panel,search,count,all,clear,list,options:[...select.options].filter(o=>!o.disabled&&!o.hidden)};
  button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','true');
  search.addEventListener('input',renderOptions);
  all.addEventListener('click',()=>{for(const o of matching())o.selected=true;select.dispatchEvent(new Event('change',{bubbles:true}));syncSelection();});
  clear.addEventListener('click',()=>{for(const o of select.options)o.selected=false;select.dispatchEvent(new Event('change',{bubbles:true}));syncSelection();});
  search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();list.querySelector('input')?.focus();}});
  renderOptions();animateRegion(panel,'popover');search.focus({preventScroll:true});
 }
 function enhance(){
  if(opened&&!opened.select.isConnected)close();
  for(const select of document.querySelectorAll('select[multiple][data-search-multi]')){
   if(controls.has(select)){controls.get(select).sync();continue;}
   const button=document.createElement('button');button.type='button';button.id=select.id+'-trigger';button.className='select-trigger scope-trigger';
   const label=select.labels?.[0],name=select.getAttribute('aria-label')||label?.textContent.trim()||select.name;
   button.setAttribute('aria-label',name);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
   const copy=document.createElement('span'),count=document.createElement('span');copy.className='select-value';count.className='multi-count';button.append(copy,count);button.insertAdjacentHTML('beforeend',uiIcon('chevronDown'));
   function sync(){
    const selected=[...select.selectedOptions],all=select.dataset.allLabel&&selected.length===select.options.length,text=all?select.dataset.allLabel:selected.length?selected.slice(0,2).map(o=>o.textContent).join('、'):select.dataset.placeholder||'請選擇';
    if(copy.textContent!==text)copy.textContent=text;if(count.textContent!==String(selected.length))count.textContent=String(selected.length);count.hidden=!selected.length||Boolean(all);
    const title=selected.map(o=>o.textContent+'（'+o.value+'）').join('、');if(button.title!==title)button.title=title;
    button.disabled=select.disabled;
   }
   controls.set(select,{button,sync});select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);if(label?.htmlFor===select.id)label.htmlFor=button.id;
   button.addEventListener('click',event=>{event.preventDefault();open(select,button);});
   button.addEventListener('keydown',event=>{if(['ArrowDown','Enter',' '].includes(event.key)){event.preventDefault();open(select,button);}});
   select.addEventListener('change',sync);sync();
  }
 }
 document.addEventListener('pointerdown',event=>{if(opened&&!opened.button.contains(event.target)&&!opened.panel.contains(event.target))close({animated:true});},true);
 document.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close({focus:true,animated:true});}},true);
 document.addEventListener('focusin',event=>{if(opened&&!opened.button.contains(event.target)&&!opened.panel.contains(event.target))close();});
 document.addEventListener('scroll',event=>{if(opened&&!opened.panel.contains(event.target))close();},true);
 window.addEventListener('resize',position);new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 return {enhance,close};
}
