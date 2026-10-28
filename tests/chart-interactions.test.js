import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartTipAttrs,chartTipPosition} from '../chart-interactions.js';
import {statisticsDashboard} from '../statistics-view.js';
import {trendChart} from '../detail-views.js';
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
