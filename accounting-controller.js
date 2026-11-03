import {accountingLines,accountingModelFromLines} from './accounting.js?v=14.3';
import {accountingPage,accountingDetail,accountingCsvRows} from './accounting-view.js?v=14.3';
import {createBusinessState} from './business-management.js?v=14.2';
import {selectionValues,csv} from './core.js?v=12.6';
export function installAccountingController({data,currentTab,renderMain,showDialog,saveView,queryForm,setDialog,rememberDetail,detailNavigation,organizations,toast}){
 let pricingKey='',lines=[];
 const isAccounting=()=>currentTab().key==='draft:reports:總帳務';
 function model(){let state;try{state=createBusinessState(data,JSON.parse(localStorage.getItem('rr-cms-business-v1'))||{});}catch{state=createBusinessState(data);}const next=JSON.stringify(state.pricing);if(next!==pricingKey){lines=accountingLines(data.records,state.pricing);pricingKey=next;}return accountingModelFromLines(lines,currentTab().filters);}
 function render(filtersHtml){return accountingPage(data,model(),currentTab(),organizations(),filtersHtml);}
 function detail(key,replace=false){const group=model().groups.find(g=>g.key===key);if(!group){toast('此範圍沒有對應帳務明細');return;}rememberDetail(replace);setDialog({type:'accounting',key,label:'帳務來源明細'});showDialog('帳務來源明細',detailNavigation()+accountingDetail(data,group,organizations()),{drawer:true,subtitle:currentTab().filters.start+' — '+currentTab().filters.end+' · USDT · UTC+8'});}
 function handleClick(target){
  if(target.dataset.acctItem){saveView();const f=currentTab().draft,key=target.dataset.acctItem,chosen=selectionValues(f.accountingItems),excluded=selectionValues(f.excludeAccounting),active=chosen.includes(key)&&!excluded.includes(key),next=active?chosen.filter(v=>v!==key):[...new Set([...chosen,key])];f.accountingItems=next.length?next:'';f.excludeAccounting=excluded.filter(v=>v!==key);queryForm();return true;}
  if(target.hasAttribute('data-acct-show-all')){saveView();currentTab().accountingAllItems=!currentTab().accountingAllItems;renderMain();return true;}
  if(target.dataset.acctAmounts){saveView();currentTab().accountingAmounts=target.dataset.acctAmounts;renderMain();return true;}
  if(target.dataset.acctDetail){detail(decodeURIComponent(target.dataset.acctDetail));return true;}
  if(target.dataset.acctPage){saveView();currentTab().page=Number(target.dataset.acctPage);renderMain();return true;}
  if(target.dataset.acctRemoveField){saveView();const f=currentTab().draft,key=target.dataset.acctRemoveField;f[key]=Array.isArray(f[key])?selectionValues(f[key]).filter(v=>v!==target.dataset.acctRemoveValue):'';queryForm();return true;}
  if(target.hasAttribute('data-acct-export')){const out=accountingCsvRows(model(),data,organizations(),currentTab().accountingAmounts==='service'),safe=out.rows.map(row=>row.map(value=>typeof value==='string'&&/^[=+@\t\r]/.test(value)?"'"+value:value)),blob=new Blob(['\ufeff'+csv(out.headers,safe)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rr-accounting-'+currentTab().filters.start+'-'+currentTab().filters.end+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
  return false;
 }
 window.addEventListener('storage',event=>{if(event.key==='rr-cms-business-v1'&&isAccounting()&&!document.querySelector('#modal').open)renderMain();});
 return {render,handleClick,detail};
}
