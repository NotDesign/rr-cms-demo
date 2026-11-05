import {CURRENCY_KEY,CURRENCIES,currencyCode,currencyPreferences,configureCurrency} from './currency-display.js?v=14.5.0';
import {uiIcon} from './ui-icons.js?v=14.4.8';

export function installCurrencyDisplay({render,showDialog,closeDialog,enhanceSelects,toast}){
 try{configureCurrency(JSON.parse(localStorage.getItem(CURRENCY_KEY))||{});}catch{configureCurrency({});}
 const persist=next=>{localStorage.setItem(CURRENCY_KEY,JSON.stringify(next));configureCurrency(next);};
 function labels(root){
  const code=currencyCode();if(code==='USDT'||!root)return;
  const skip=node=>node.parentElement?.closest('[data-currency-original],script,style,select,input,textarea,option,.column-popover');
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())if(!skip(node)&&node.nodeValue.includes('USDT'))node.nodeValue=node.nodeValue.replaceAll('USDT',code);
  for(const el of root.querySelectorAll('[data-chart-tip],[data-chart-suffix],[title],[aria-label]')){
   if(el.closest('[data-currency-original],.column-popover'))continue;
   for(const attr of ['data-chart-tip','data-chart-suffix','title','aria-label'])if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).replaceAll('USDT',code));
  }
 }
 function enhance(root){
  labels(root);const content=document.getElementById('content');if(!content||!(root===content||root.contains?.(content)))return;
  const page=content.querySelector('.page'),heading=page?.querySelector('.page-heading');if(!heading)return;if(page.hasAttribute('data-native-currency')){page.querySelector('.currency-display-bar')?.remove();return;}
  const old=page.querySelector('.currency-display-bar');if(old)old.remove();const state=currencyPreferences(),code=state.currency;
  const bar=document.createElement('div');bar.className='currency-display-bar';bar.setAttribute('data-currency-original','');
  bar.innerHTML='<label for="display-currency">顯示幣別</label><select id="display-currency" aria-label="顯示幣別">'+CURRENCIES.map(([id,name])=>'<option value="'+id+'"'+(id===code?' selected':'')+'>'+id+' · '+name+'</option>').join('')+'</select><span class="currency-rate-note">原幣 USDT'+(code==='USDT'?'':' · 1 USDT = '+state.rates[code].toLocaleString('en-US',{maximumFractionDigits:6})+' '+code)+' <small>示例匯率</small></span><button type="button" class="button small" data-fx-settings>'+uiIcon('sliders')+'匯率設定</button>';
  heading.after(bar);enhanceSelects();
 }
 function settings(){
  const state=currencyPreferences();
  showDialog('顯示幣別與匯率','<div class="fx-settings" data-currency-original><p class="mg-note">每 1 USDT 可換算的顯示金額。以下為示例匯率，可修改供 Demo 討論；未連接即時匯率服務。</p><div class="fx-rate-grid">'+CURRENCIES.filter(([code])=>code!=='USDT').map(([code,name])=>'<div class="field"><label for="fx-'+code+'">'+name+' · '+code+'</label><input id="fx-'+code+'" data-fx-rate="'+code+'" type="number" inputmode="decimal" min="0.000001" max="1000000000" step="any" value="'+state.rates[code]+'" required></div>').join('')+'</div><p class="mg-note">畫面金額與圖表同步換算；原始帳務、編輯輸入、欄位篩選及 CSV 匯出維持原幣 USDT，不改寫投注或結算紀錄。</p><p data-fx-error class="mg-error" role="alert" hidden></p></div>',{management:true,footer:'<button class="button" data-action="close-dialog">取消</button><button class="button primary" data-fx-save>儲存示例匯率</button>'});
 }
 function handleClick(target){
  if(target.hasAttribute('data-fx-settings')){settings();return true;}
  if(!target.hasAttribute('data-fx-save'))return false;
  try{const state=currencyPreferences();for(const input of document.querySelectorAll('[data-fx-rate]')){const value=Number(input.value);if(!input.value.trim()||!Number.isFinite(value)||value<=0||value>1e9)throw Error('請輸入大於 0 的有效匯率');state.rates[input.dataset.fxRate]=value;}persist(state);closeDialog();render();toast('示例匯率已儲存');}
  catch(error){const field=document.querySelector('[data-fx-error]');field.hidden=false;field.textContent=error.message;}
  return true;
 }
 document.addEventListener('change',event=>{if(event.target.id!=='display-currency')return;const next={...currencyPreferences(),currency:event.target.value};persist(next);render();});
 window.addEventListener('storage',event=>{if(event.key===CURRENCY_KEY){try{configureCurrency(JSON.parse(event.newValue)||{});render();}catch{}}});
 return {enhance,labels,handleClick};
}
