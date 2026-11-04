import {escape as e,money} from './core.js?v=14.4.1';
import {chartTipAttrs} from './chart-interactions.js?v=14.4.6';
import {donutArc,captureChartState,animateCharts} from './chart-motion.js?v=14.4.1';

const palette=['#E6C066','#65e3b6','#79cfdc','#e7a68c','#a8bfbd','#a0adb9','#c8d0c6','#d4bd98'];
export function regionSelection(groups,metric='players',hidden=[]){
 const excluded=new Set(hidden),visible=groups.filter(g=>!excluded.has(g.region));
 const total=visible.reduce((n,g)=>n+(metric==='total'?g.total:g.players),0);
 let start=0;
 return {total,regions:visible.length,slices:groups.map((g,index)=>{
  const enabled=!excluded.has(g.region),value=metric==='total'?g.total:g.players,fraction=enabled&&total?value/total:0;
  const slice={...g,index,enabled,start,end:start+fraction,percent:fraction*100};start+=fraction;return slice;
 })};
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
  '<div class="donut-legend" role="group" aria-label="地區佔比圖例">'+slices.map(g=>'<button type="button" data-region-key="'+e(g.region)+'" aria-pressed="'+g.enabled+'"'+tip(g)+'><i style="background:'+palette[g.index%palette.length]+'"></i><span>'+e(g.region)+'</span><strong>'+ (g.enabled?g.percent.toFixed(1)+'%':'—')+'</strong></button>').join('')+'</div></div>'+
  '<div class="donut-summary" aria-live="polite"><span>目前顯示 <strong>'+regions+' / '+groups.length+'</strong> 個地區</span><span>'+(isBet?'總投注額':'遊玩人數')+' <strong>'+(isBet?money(total)+' USDT':total+' 位')+'</strong></span></div>';
}
export function regionChart(groups){
 return '<div class="region-chart" data-region-chart="'+e(JSON.stringify(groups))+'" data-region-metric="players" data-region-hidden="[]">'+regionDonut(groups)+'</div>';
}
export function installRegionCharts({beforeChange=()=>{},translate=v=>v}={}){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-region-mode],[data-region-key]'),root=button?.closest('[data-region-chart]');if(!root)return;
  const groups=JSON.parse(root.dataset.regionChart),hidden=JSON.parse(root.dataset.regionHidden),mode=button.dataset.regionMode;
  if(mode)root.dataset.regionMetric=mode;
  else{const index=hidden.indexOf(button.dataset.regionKey);if(index<0)hidden.push(button.dataset.regionKey);else hidden.splice(index,1);}
  const focusKey=mode?'data-region-mode':'data-region-key',focusValue=button.getAttribute(focusKey),previous=captureChartState(root);
  beforeChange();root.dataset.regionHidden=JSON.stringify(hidden);root.innerHTML=regionDonut(groups,root.dataset.regionMetric,hidden);
  animateCharts(root,previous,translate);root.querySelector('['+focusKey+'="'+CSS.escape(focusValue)+'"]')?.focus({preventScroll:true});
 });
}
