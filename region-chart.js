import {currencyCode} from './currency-display.js?v=14.5.0';
import {escape as e,money,signed,tone} from './core.js?v=14.5.0';
import {chartTipAttrs} from './chart-interactions.js?v=14.5.0';
import {donutArc,captureChartState,animateCharts} from './chart-motion.js?v=14.7.0';

const palette=['#E6C066','#65e3b6','#79cfdc','#e7a68c','#a8bfbd','#a0adb9','#c8d0c6','#d4bd98','#58baa4','#d6a86b','#7ba3b6','#a5cc91','#c89179','#8faaa5','#c5b987','#88bdb5','#95a6bc','#d3cba9','#b49c80','#7db69a','#bfc6b0','#acb7c3'];
export function regionSelection(groups,metric='players',hidden=[]){
 const excluded=new Set(hidden),visible=groups.filter(g=>!excluded.has(g.region));
 const total=visible.reduce((n,g)=>n+(metric==='total'?g.total:g.players),0);
 let start=0;
 return {total,regions:visible.length,slices:groups.map((g,index)=>{
  const enabled=!excluded.has(g.region),value=metric==='total'?g.total:g.players,fraction=enabled&&total?value/total:0;
  const slice={...g,index,enabled,start,end:start+fraction,percent:fraction*100};start+=fraction;return slice;
 })};
}
export function donutLegendDetails(players,total,average){
 const figure=(label,value,unit='')=>'<span><small>'+e(label)+'</small><b>'+e(value)+(unit?' <em>'+e(unit)+'</em>':'')+'</b></span>';
 return '<span class="donut-legend-details">'+figure('遊玩人數',players,'位')+figure('投注額',money(total),currencyCode())+figure('平均每筆',average===null?'—':money(average),average===null?'':currencyCode())+'</span>';
}
export function regionDonut(groups,metric='players',hidden=[]){
 const {total,regions,slices}=regionSelection(groups,metric,hidden),isBet=metric==='total';
 const tip=g=>chartTipAttrs(g.region,[{label:'遊玩人數',value:g.players+' 位'},{label:'總投注額',value:money(g.total)+' USDT'},
  {label:'平均每筆投注額',value:g.average===null?'—':money(g.average)+' USDT'},{label:'目前佔比',value:g.enabled?g.percent.toFixed(1)+'%':'已關閉'}]);
 return '<div class="region-chart-heading"><h3>地區佔比</h3><div class="chart-toggle" role="group" aria-label="地區統計指標">'+
  [['players','遊玩人數'],['total','投注額']].map(([key,label])=>'<button type="button" data-region-mode="'+key+'" aria-pressed="'+(metric===key)+'">'+label+'</button>').join('')+'</div></div>'+
  '<div class="donut-layout" data-chart-scope><svg class="donut-chart" viewBox="0 0 200 200" role="group" aria-label="地區'+(isBet?'投注額':'遊玩人數')+'佔比">'+
  '<circle cx="100" cy="100" r="70" fill="none" stroke="var(--line)" stroke-width="24"/>'+
  slices.map(g=>'<path class="donut-motion-segment region-segment" data-donut-key="region:'+e(g.region)+'" data-arc-start="'+g.start+'" data-arc-end="'+g.end+'" data-arc-visible="'+Boolean(g.enabled&&g.percent)+'" d="'+donutArc(g.start,g.end)+'" fill="none" stroke="'+palette[g.index%palette.length]+'" stroke-width="24" opacity="'+(g.enabled&&g.percent?1:0)+'"'+(g.enabled&&g.percent?tip(g)+' tabindex="0" role="img"':' aria-hidden="true"')+'/>').join('')+
  '<text x="100" y="98" text-anchor="middle" class="donut-total" data-chart-number="region-count" data-chart-value="'+regions+'">'+regions+'</text><text x="100" y="122" text-anchor="middle" class="chart-axis">顯示地區</text></svg>'+
  '<div class="donut-legend" role="group" aria-label="地區佔比圖例">'+slices.map(g=>'<button type="button" data-region-key="'+e(g.region)+'" aria-pressed="'+g.enabled+'"'+tip(g)+'><i style="background:'+palette[g.index%palette.length]+'"></i><span>'+e(g.region)+'</span><strong>'+ (g.enabled?g.percent.toFixed(1)+'%':'—')+'</strong>'+donutLegendDetails(g.players,g.total,g.average)+'</button>').join('')+'</div></div>'+
  '<div class="donut-summary" aria-live="polite"><span>目前顯示 <strong>'+regions+' / '+groups.length+'</strong> 個地區</span><span>'+(isBet?'總投注額':'遊玩人數')+' <strong>'+(isBet?money(total)+' USDT':total+' 位')+'</strong></span></div>';
}
export function regionChart(groups,period=''){
 return ('<div class="region-chart" data-region-chart="'+e(JSON.stringify(groups))+'" data-region-metric="players" data-region-hidden="[]">'+(period?'<p class="region-period">'+e(period)+' · 所選區間</p>':'')+'<div class="region-chart-content">'+regionDonut(groups)+'</div>'+'</div>').replaceAll('USDT',currencyCode());
}
export function installRegionCharts({beforeChange=()=>{},translate=v=>v,onRender=()=>{}}={}){
 function updateTable(root,page,pageSize,focusSelector){
  const groups=JSON.parse(root.dataset.regionTable),total=JSON.parse(root.dataset.regionTotal),p=regionPage(groups,page,pageSize),scrollLeft=root.querySelector('.mini-scroll')?.scrollLeft||0;
  beforeChange();root.dataset.regionPageCurrent=p.page;root.dataset.regionPageSizeCurrent=p.pageSize;root.innerHTML=regionTableBody(groups,total,p.page,p.pageSize);onRender(root);
  root.querySelector('.mini-scroll').scrollLeft=scrollLeft;
  const focus=root.querySelector(focusSelector);if(focus&&!focus.disabled)focus.focus({preventScroll:true});else{const range=root.querySelector('.region-page-range');range.setAttribute('tabindex','-1');range.focus({preventScroll:true});}
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-region-page]'),root=button?.closest('[data-region-table]');if(!root||button.disabled)return;updateTable(root,button.dataset.regionPage,Number(root.dataset.regionPageSizeCurrent),'[data-region-page="'+button.dataset.regionPage+'"]');});
 document.addEventListener('change',event=>{const select=event.target.closest('[data-region-page-size]'),root=select?.closest('[data-region-table]');if(root)updateTable(root,1,Number(select.value),'.region-pagination .select-trigger');});
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-region-mode],[data-region-key]'),root=button?.closest('[data-region-chart]');if(!root)return;
  const groups=JSON.parse(root.dataset.regionChart),hidden=JSON.parse(root.dataset.regionHidden),mode=button.dataset.regionMode;
  if(mode)root.dataset.regionMetric=mode;
  else{const index=hidden.indexOf(button.dataset.regionKey);if(index<0)hidden.push(button.dataset.regionKey);else hidden.splice(index,1);}
  const focusKey=mode?'data-region-mode':'data-region-key',focusValue=button.getAttribute(focusKey),previous=captureChartState(root),legendTop=root.querySelector('.donut-legend')?.scrollTop||0;
  beforeChange();root.dataset.regionHidden=JSON.stringify(hidden);root.querySelector('.region-chart-content').innerHTML=regionDonut(groups,root.dataset.regionMetric,hidden).replaceAll('USDT',currencyCode());
  onRender(root);root.querySelector('.donut-legend').scrollTop=legendTop;animateCharts(root,previous,translate);root.querySelector('['+focusKey+'="'+CSS.escape(focusValue)+'"]')?.focus({preventScroll:true});
 });
}

export const REGION_PAGE_SIZES=[5,10,20,50];
export function regionPage(groups,page=1,pageSize=5){
 const size=REGION_PAGE_SIZES.includes(Number(pageSize))?Number(pageSize):5,pages=Math.max(1,Math.ceil(groups.length/size));
 const current=Math.min(pages,Math.max(1,Number.isFinite(Number(page))?Math.trunc(Number(page)):1)),offset=(current-1)*size;
 return {page:current,pageSize:size,pages,count:groups.length,start:groups.length?offset+1:0,end:Math.min(offset+size,groups.length),rows:groups.slice(offset,offset+size)};
}
function regionTableBody(groups,total,page=1,pageSize=5){
 const p=regionPage(groups,page,pageSize),unit=currencyCode();
 const cells=row=>'<td class="num">'+row.players+'</td><td class="num">'+row.paid+'</td><td class="num">'+money(row.total)+'</td><td class="num">'+(row.average===null?'—':money(row.average))+'</td><td class="num '+tone(row.playerNetWin)+'">'+signed(row.playerNetWin)+'</td><td class="num '+tone(row.operatorNetWin)+'">'+signed(row.operatorNetWin)+'</td>';
 const headings=['地區','遊玩人數','實扣投注筆數','總投注額 '+unit,'平均每筆投注額 '+unit,'玩家淨盈虧 '+unit,'營運淨輸贏 '+unit];
 const pager='<nav class="region-pagination" aria-label="地區統計分頁"><div><span class="region-page-range" aria-live="polite">顯示 '+p.start+'–'+p.end+' 個地區，共 '+p.count+' 個地區</span><label>每頁 <select data-region-page-size aria-label="每頁地區筆數">'+REGION_PAGE_SIZES.map(size=>'<option value="'+size+'"'+(size===p.pageSize?' selected':'')+'>'+size+'</option>').join('')+'</select> 筆</label></div><div class="region-page-controls"><button type="button" data-region-page="'+(p.page-1)+'"'+(p.page===1?' disabled':'')+'>上一頁</button><span>第 '+p.page+' / '+p.pages+' 頁</span><button type="button" data-region-page="'+(p.page+1)+'"'+(p.page===p.pages?' disabled':'')+'>下一頁</button></div></nav>';
 return '<div class="mini-scroll" tabindex="0" role="region" aria-label="地區遊玩統計"><table class="mini-table"><thead><tr>'+headings.map((title,i)=>'<th scope="col"'+(i?' class="num"':'')+'>'+e(title)+'</th>').join('')+'</tr></thead><tbody><tr class="mini-totals"><th scope="row">合計 · 全部 '+groups.length+' 個地區</th>'+cells(total)+'</tr>'+p.rows.map(g=>'<tr><th scope="row">'+e(g.region)+'</th>'+cells(g)+'</tr>').join('')+'</tbody></table></div>'+pager;
}
export function regionTable(groups,total){
 return '<div class="region-table-panel" data-region-table="'+e(JSON.stringify(groups))+'" data-region-total="'+e(JSON.stringify(total))+'" data-region-page-current="1" data-region-page-size-current="5">'+regionTableBody(groups,total)+'</div>';
}
