import {ACCOUNTING_DISPLAY_KEY,normalizeAccountingDisplay,moveAccountingCard} from './accounting-display.js?v=14.4.1';
import {accountingLines,accountingModelFromLines} from './accounting.js?v=14.4.1';
import {accountingPage,accountingDetail,accountingCsvRows,accountingDisplaySettings} from './accounting-view.js?v=14.4.1';
import {createBusinessState} from './business-management.js?v=14.4.1';
import {selectionValues,csv} from './core.js?v=14.4.1';
export function installAccountingController({data,currentTab,renderMain,showDialog,closeDialog,saveView,queryForm,setDialog,rememberDetail,detailNavigation,organizations,toast,localize=root=>root}){
 let pricingKey='',lines=[],displayDraft=null;
 const isAccounting=()=>currentTab().key==='draft:reports:總帳務';
 function model(){let state;try{state=createBusinessState(data,JSON.parse(localStorage.getItem('rr-cms-business-v1'))||{});}catch{state=createBusinessState(data);}const next=JSON.stringify(state.pricing);if(next!==pricingKey){lines=accountingLines(data.records,state.pricing);pricingKey=next;}return accountingModelFromLines(lines,currentTab().filters);}
 function readDisplay(){try{return normalizeAccountingDisplay(JSON.parse(localStorage.getItem(ACCOUNTING_DISPLAY_KEY)),Boolean(currentTab().accountingAllItems));}catch{return normalizeAccountingDisplay(null,Boolean(currentTab().accountingAllItems));}}
 function render(filtersHtml){return accountingPage(data,model(),{...currentTab(),accountingDisplay:readDisplay()},organizations(),filtersHtml);}
 function showDisplay(){saveView();displayDraft=readDisplay();showDialog('顯示設定',accountingDisplaySettings(displayDraft),{management:true,subtitle:'收費與機制概覽',footer:'<button class="button" data-acct-display-cancel>取消</button><button class="button primary" data-acct-display-save>套用設定</button>'});setDialog({type:'accounting-display'});}
 function updateDisplay(focusKey=null,direction=null){if(!displayDraft)return;const body=document.querySelector('#modal .dialog-body'),top=body.scrollTop;body.innerHTML=accountingDisplaySettings(displayDraft);localize(body);body.scrollTop=top;if(focusKey){const buttons=[...body.querySelectorAll('[data-acct-display-move]')],button=buttons.find(b=>b.dataset.acctDisplayMove===focusKey&&b.dataset.acctDisplayDirection===String(direction));if(button&&!button.disabled)button.focus({preventScroll:true});else body.querySelector('[data-acct-display-item="'+focusKey+'"]')?.focus({preventScroll:true});}}
 function cancelDisplay(){displayDraft=null;closeDialog({animated:true});}
 function saveDisplay(){if(!displayDraft)return;try{localStorage.setItem(ACCOUNTING_DISPLAY_KEY,JSON.stringify(normalizeAccountingDisplay(displayDraft)));displayDraft=null;closeDialog({animated:true});renderMain();toast('顯示設定已儲存');}catch{const error=document.querySelector('#acct-display-error');error.textContent='無法儲存顯示設定，請檢查瀏覽器儲存空間';error.hidden=false;localize(error);}}

 function detail(key,replace=false){const group=model().groups.find(g=>g.key===key);if(!group){toast('此範圍沒有對應帳務明細');return;}rememberDetail(replace);setDialog({type:'accounting',key,label:'帳務來源明細'});showDialog('帳務來源明細',detailNavigation()+accountingDetail(data,group,organizations()),{drawer:true,subtitle:currentTab().filters.start+' — '+currentTab().filters.end+' · USDT · UTC+8'});}
 function handleClick(target){
  if(target.dataset.acctItem){saveView();const f=currentTab().draft,key=target.dataset.acctItem,chosen=selectionValues(f.accountingItems),excluded=selectionValues(f.excludeAccounting),active=chosen.includes(key)&&!excluded.includes(key),next=active?chosen.filter(v=>v!==key):[...new Set([...chosen,key])];f.accountingItems=next.length?next:'';f.excludeAccounting=excluded.filter(v=>v!==key);queryForm();return true;}
  if(target.hasAttribute('data-acct-display-open')){showDisplay();return true;}
  if(target.hasAttribute('data-acct-display-save')){saveDisplay();return true;}
  if(target.hasAttribute('data-acct-display-cancel')){cancelDisplay();return true;}
  if(target.dataset.acctDisplayMove&&displayDraft){displayDraft=moveAccountingCard(displayDraft,target.dataset.acctDisplayMove,Number(target.dataset.acctDisplayDirection));updateDisplay(target.dataset.acctDisplayMove,target.dataset.acctDisplayDirection);return true;}
  if(target.dataset.acctDisplayPreset&&displayDraft){const preset=target.dataset.acctDisplayPreset;if(preset==='default')displayDraft=normalizeAccountingDisplay();else displayDraft={...displayDraft,visible:preset==='all'?[...displayDraft.order]:[]};updateDisplay();return true;}
  if(target.dataset.acctAmounts){saveView();currentTab().accountingAmounts=target.dataset.acctAmounts;renderMain();return true;}
  if(target.dataset.acctDetail){detail(decodeURIComponent(target.dataset.acctDetail));return true;}
  if(target.dataset.acctPage){saveView();currentTab().page=Number(target.dataset.acctPage);renderMain();return true;}
  if(target.dataset.acctRemoveField){saveView();const f=currentTab().draft,key=target.dataset.acctRemoveField;f[key]=Array.isArray(f[key])?selectionValues(f[key]).filter(v=>v!==target.dataset.acctRemoveValue):'';queryForm();return true;}
  if(target.hasAttribute('data-acct-export')){const out=accountingCsvRows(model(),data,organizations(),currentTab().accountingAmounts==='service'),safe=out.rows.map(row=>row.map(value=>typeof value==='string'&&/^[=+@\t\r]/.test(value)?"'"+value:value)),blob=new Blob(['\ufeff'+csv(out.headers,safe)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rr-accounting-'+currentTab().filters.start+'-'+currentTab().filters.end+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
  return false;
 }
 document.addEventListener('change',event=>{if(!displayDraft)return;const item=event.target.dataset.acctDisplayItem,field=event.target.dataset.acctDisplayField;if(item){displayDraft.visible=event.target.checked?[...new Set([...displayDraft.visible,item])]:displayDraft.visible.filter(key=>key!==item);const status=document.querySelector('#acct-display-count');status.textContent='已選 '+displayDraft.visible.length+' / '+displayDraft.order.length+' 項';localize(status);}else if(['details','counts'].includes(field))displayDraft[field]=event.target.checked;});
 window.addEventListener('storage',event=>{if(['rr-cms-business-v1',ACCOUNTING_DISPLAY_KEY].includes(event.key)&&isAccounting()&&!document.querySelector('#modal').open)renderMain();});
 return {render,handleClick,detail,cancelDisplay};
}
