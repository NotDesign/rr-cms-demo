import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartTipAttrs,chartTipPosition} from '../chart-interactions.js';
import {statisticsDashboard} from '../statistics-view.js';
import {trendChart} from '../detail-views.js';
import {popularitySelection,statisticsModel} from '../analytics.js';
import {donutArc,chartEase,captureChartState,animateCharts} from '../chart-motion.js';
const records=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url))).records;
const range={start:'2026-10-15',end:'2026-10-15'};
const decode=html=>[...html.matchAll(/data-chart-tip="([^"]+)"/g)].map(m=>JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')));
test('line hover details preserve zero hours and both monetary series with full precision',()=>{
 const tips=decode(statisticsDashboard(records,range));
 const zero=tips.find(t=>t.title==='00:00'&&t.rows[0].label==='活躍玩家');
 assert.equal(zero.rows[0].value,'0 位');assert.equal(zero.note,'UTC+8');
 const amounts=tips.filter(t=>t.rows[0].label==='實扣投注'&&t.note==='UTC+8');
 assert.equal(amounts.length,24);assert.ok(amounts.every(t=>t.rows.some(r=>r.label==='結算派彩'&&/\.\d{2} USDT$/.test(r.value))));
 assert.ok(decode(statisticsDashboard(records,{start:'2026-10-14',end:'2026-10-16'})).some(t=>t.title==='2026/10/15'));
});
test('donut details change with metric and retain correct other-game sums',()=>{
 for(const metric of ['count','bet']){
  const tips=decode(statisticsDashboard(records,range,metric)).filter(t=>t.rows[1]?.label==='佔比');
  assert.equal(tips.length,12); // Six segments and their six matching legends.
  assert.deepEqual(tips.slice(0,6),tips.slice(6));
  assert.ok(tips.every(t=>t.rows[0].label===(metric==='bet'?'實扣投注':'遊玩筆數')));
  const total=tips.slice(0,6).reduce((n,t)=>n+Number(t.rows[0].value.replace(/[^\d.]/g,'')),0);
  assert.equal(total,metric==='bet'?291350:1200);
 }
 assert.doesNotMatch(statisticsDashboard([],range),/NaN|Infinity/);
});
test('detail bar tooltips preserve signed player earnings and escape arbitrary labels',()=>{
 const tips=decode(trendChart(records));assert.equal(tips.length,16);
 assert.ok(tips.some(t=>t.rows.some(r=>r.label==='玩家淨盈虧'&&r.tone==='negative')));
 const unsafe='A" <img src=x onerror=alert(1)> & B',attrs=chartTipAttrs(unsafe,[{label:'盈虧',value:'-10.00 USDT',tone:'negative'}],{focusable:true});
 assert.doesNotMatch(attrs,/<img/);assert.equal(decode(attrs)[0].title,unsafe);
});
test('chart tooltip flips and stays inside desktop and narrow viewport edges',()=>{
 for(const viewport of [{width:1920,height:1080},{width:390,height:844}])for(const point of [{x:0,y:0},{x:viewport.width,y:viewport.height},{x:viewport.width/2,y:20}]){
  const size={width:260,height:160},at=chartTipPosition(point,size,viewport);
  assert.ok(at.left>=12&&at.top>=12);assert.ok(at.left+size.width<=viewport.width-12);assert.ok(at.top+size.height<=viewport.height-12);
 }
});
test('curve legends can hide individual or all series without changing underlying totals',()=>{
 const html=statisticsDashboard(records,range,'count',{players:['players'],activity:['bet']}),tips=decode(html);
 assert.doesNotMatch(html,/data-chart-series="players"|data-chart-series="bet"/);
 assert.match(html,/data-chart-series="payout"/);assert.match(html,/點擊圖例以顯示資料/);
 const amounts=tips.filter(t=>t.note==='UTC+8');assert.equal(amounts.length,24);
 assert.ok(amounts.every(t=>t.rows[0].label==='結算派彩'&&!t.rows.some(r=>r.label==='實扣投注')));
 assert.match(html,/149,210\.00/);assert.match(html,/132 位玩家/);
 assert.doesNotMatch(statisticsDashboard(records,range,'count',{players:['players'],activity:['bet','payout']}),/class="chart-hit"/);
});
test('donut legends recalculate visible shares and selected game totals',()=>{
 const html=statisticsDashboard(records,range,'count',{popular:['深海獵場']});
 assert.equal((html.match(/class="donut-motion-segment donut-segment"/g)||[]).length,5);
 assert.match(html,/data-chart-key="深海獵場"[^>]+aria-pressed="false"/);
 const tip=decode(html).find(t=>t.title==='深海獵場');assert.equal(tip.rows[1].value,'—');
 const all=['深海獵場','星際闖關','翡翠金礦','經典 21 點','搶莊牛牛','其他遊戲'];
 const empty=statisticsDashboard(records,range,'count',{popular:all});assert.doesNotMatch(empty,/class="donut-motion-segment donut-segment"/);assert.doesNotMatch(empty,/NaN|Infinity/);
 const games=statisticsModel(records,range).games,shown=popularitySelection(games,'count',all.slice(0,4));
 assert.equal(shown.games,14);assert.equal(shown.total,673);assert.equal(shown.slices.filter(s=>s.enabled).reduce((n,s)=>n+s.percent,0),100);
 assert.equal(shown.slices.find(s=>s.name==='搶莊牛牛').percent,67/673*100);
 const only=popularitySelection(games,'count',all.filter(n=>n!=='搶莊牛牛'));assert.equal(only.games,1);assert.equal(only.total,67);assert.equal(only.slices.find(s=>s.enabled).percent,100);
 const none=popularitySelection(games,'count',all);assert.equal(none.total,0);assert.equal(none.games,0);assert.ok(none.slices.every(s=>s.percent===0));
 const cash=popularitySelection(games,'bet',['深海獵場']);assert.equal(cash.total,291350-46640);assert.ok(Math.abs(cash.slices.reduce((n,s)=>n+s.percent,0)-100)<1e-10);
});
test('donut motion handles zero, full circles and monotonic easing without invalid geometry',()=>{
 assert.doesNotMatch(donutArc(0,0),/ A /);assert.equal((donutArc(0,1).match(/ A /g)||[]).length,2);
 for(let i=0;i<=20;i++){const t=i/20;assert.doesNotMatch(donutArc(t/4,t/4+t*.75),/NaN|Infinity/);if(i)assert.ok(chartEase(t)>=chartEase(t-.05));}
 assert.equal(chartEase(0),0);assert.equal(chartEase(1),1);
});
test('rapid chart updates capture the current intermediate state and reduced motion skips animation',()=>{
 const arc={dataset:{donutKey:'game',arcStart:'.2',arcEnd:'.8',currentStart:'.1',currentEnd:'.4'},getAttribute:()=>'.6'},number={dataset:{chartNumber:'total',chartValue:'18',currentValue:'4'}};
 const root={querySelectorAll:s=>s==='[data-donut-key]'?[arc]:s==='[data-chart-number]'?[number]:[]};const state=captureChartState(root);
 assert.deepEqual(state.arcs.get('game'),{start:.1,end:.4,opacity:.6});assert.equal(state.numbers.get('total'),4);
 globalThis.matchMedia=()=>({matches:true});assert.doesNotThrow(()=>animateCharts({}));delete globalThis.matchMedia;
});
