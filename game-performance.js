import {escape as e,money,signed,tone} from './core.js?v=14.5.0';
import {netWinsFor} from './net-win.js?v=14.4.1';
import {wagerMetrics,wagerRegionTable} from './game-wagers.js?v=14.7.0';
import {infoCard} from './metric-card.js?v=14.5.0';
import {gameIdentity} from './detail-views.js?v=14.5.3';
import {uiIcon} from './ui-icons.js?v=14.4.8';
import {chartTipAttrs} from './chart-interactions.js?v=14.5.0';

export const PERFORMANCE_KEY='draft:dashboard:遊戲表現';
export const PERFORMANCE_SORTS=[['bet','投注額由高至低'],['operator','營運淨輸贏由高至低'],['players','遊玩人數由高至低'],['rtp','實際返還率由高至低']];
const amount=records=>records.reduce((sum,r)=>sum+Math.round((Number(r.payout)||0)*100),0)/100;
function metrics(records){
 const wager=wagerMetrics(records),payout=amount(records);
 return {...wager,...netWinsFor(records),payout,count:records.length,rtp:wager.total?payout/wager.total*100:null};
}
// Totals are computed from the filtered wagers, never by adding per-game player counts or averages.
export function performanceModel(records,catalog=[],sort='bet'){
 const grouped=new Map(),byName=new Map(catalog.map(g=>[g.name,g]));
 for(const record of records){if(!grouped.has(record.game))grouped.set(record.game,[]);grouped.get(record.game).push(record);}
 const rows=[...grouped].map(([name,entries])=>{const game=byName.get(name);return {id:game?.id||entries[0].gameId||'—',name,type:game?.type||entries[0].kind,...metrics(entries)};});
 const field={bet:'total',operator:'operatorNetWin',players:'players',rtp:'rtp'}[sort]||'total';
 rows.sort((a,b)=>(b[field]??-Infinity)-(a[field]??-Infinity)||b.total-a.total||a.name.localeCompare(b.name,'zh-Hant'));
 return {rows,...metrics(records),games:rows.length};
}
export function performancePageRows(rows,page=1,size=10){
 const pageSize=[10,20,50,100].includes(Number(size))?Number(size):10,pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const current=Math.min(pages,Math.max(1,Number.isFinite(Number(page))?Math.trunc(Number(page)):1)),offset=(current-1)*pageSize;
 return {rows:rows.slice(offset,offset+pageSize),page:current,pageSize,pages,start:rows.length?offset+1:0,end:Math.min(offset+pageSize,rows.length),count:rows.length};
}
const rtp=value=>value===null?'—':value.toFixed(2)+'%';
function ranking(model,mode){
 const isBet=mode==='bet',rows=[...model.rows].sort((a,b)=>isBet?b.total-a.total:Math.abs(b.operatorNetWin)-Math.abs(a.operatorNetWin)).slice(0,5);
 const value=g=>isBet?g.total:g.operatorNetWin,max=Math.max(1,...rows.map(g=>Math.abs(value(g))));
 return '<section class="analytics-card performance-ranking"><div class="analytics-card-head"><div><h2>'+uiIcon(isBet?'coins':'profit')+(isBet?'投注額排行':'營運盈虧比較')+'</h2><p>'+(isBet?'投注額最高的五款遊戲':'淨輸贏金額最大的五款遊戲 · 正值為營運盈利')+'</p></div></div><div class="performance-rank-list" data-chart-scope>'+rows.map((g,i)=>'<button type="button" data-game="'+e(g.name)+'" data-chart-bar-key="performance:'+mode+':'+e(g.id)+'"'+chartTipAttrs(g.name,[{label:'總投注額',value:money(g.total)+' USDT'},{label:'遊玩人數',value:g.players+' 位'},{label:'營運淨輸贏',value:signed(g.operatorNetWin)+' USDT',tone:tone(g.operatorNetWin)},{label:'實際返還率',value:rtp(g.rtp)}])+'><span class="ranking-place">'+(i+1)+'</span>'+gameIdentity(g.name,44)+'<span class="performance-rank-value '+(isBet?'':tone(value(g)))+'"><strong>'+(isBet?money(value(g)):signed(value(g)))+'</strong><small>USDT</small></span><span class="ranking-track"><i style="width:'+Math.abs(value(g))/max*100+'%;background:'+(isBet?'var(--accent-gold-ink)':value(g)<0?'var(--negative)':'var(--brand)')+'"></i></span></button>').join('')+(rows.length?'':'<p class="notice">此區間沒有遊玩記錄</p>')+'</div></section>';
}
function comparisonTable(model,tab){
 const p=performancePageRows(model.rows,tab.page,tab.pageSize),heads=['遊戲','遊戲 ID','類型','遊玩人數','實扣投注筆數','總投注額 USDT','平均每筆投注額 USDT','結算派彩 USDT','玩家淨盈虧 USDT','營運淨輸贏 USDT','實際返還率'];
 const cells=g=>'<td class="num">'+g.players+'</td><td class="num">'+g.paid+'</td><td class="num">'+money(g.total)+'</td><td class="num">'+(g.average===null?'—':money(g.average))+'</td><td class="num">'+money(g.payout)+'</td><td class="num '+tone(g.playerNetWin)+'">'+signed(g.playerNetWin)+'</td><td class="num '+tone(g.operatorNetWin)+'">'+signed(g.operatorNetWin)+'</td><td class="num">'+rtp(g.rtp)+'</td>';
 return '<section class="analytics-card performance-comparison"><div class="analytics-card-head"><div><h2>'+uiIcon('reports')+'遊戲表現明細</h2><p>點擊遊戲開啟詳情；合計涵蓋全部篩選結果。</p></div><div class="field performance-sort"><label for="performance-sort">排序方式</label><select id="performance-sort">'+PERFORMANCE_SORTS.map(([key,label])=>'<option value="'+key+'"'+((tab.performanceSort||'bet')===key?' selected':'')+'>'+label+'</option>').join('')+'</select></div></div><div class="performance-table-scroll" tabindex="0" role="region" aria-label="遊戲表現比較表"><table class="mini-table"><thead><tr>'+heads.map((h,i)=>'<th scope="col"'+(i>2?' class="num"':'')+'>'+e(h)+'</th>').join('')+'<tr class="mini-totals"><th scope="row" colspan="3">合計 · '+model.games+' 款遊戲</th>'+cells(model)+'</tr></thead><tbody>'+p.rows.map(g=>'<tr><td><button class="performance-game" data-game="'+e(g.name)+'">'+gameIdentity(g.name,64)+'</button></td><td>'+e(g.id)+'</td><td>'+e(g.type)+'</td>'+cells(g)+'</tr>').join('')+(p.count?'':'<tr><td colspan="11" class="performance-empty">沒有符合條件的遊戲，請調整日期或篩選內容。</td></tr>')+'</tbody></table></div><div class="pagination performance-pagination"><span aria-live="polite">顯示 '+p.start+'–'+p.end+' 款，共 '+p.count+' 款遊戲</span><label class="page-size">每頁 <select id="page-size" aria-label="每頁筆數">'+[10,20,50,100].map(size=>'<option value="'+size+'"'+(p.pageSize===size?' selected':'')+'>'+size+'</option>').join('')+'</select> 款</label><div class="page-controls"><button data-page="'+(p.page-1)+'"'+(p.page===1?' disabled':'')+'>上一頁</button><span>第 '+p.page+' / '+p.pages+' 頁</span><button data-page="'+(p.page+1)+'"'+(p.page===p.pages?' disabled':'')+'>下一頁</button></div></div></section>';
}
export function gamePerformancePage(data,records,tab,filtersHtml){
 const m=performanceModel(records,data.games,tab.performanceSort),visual=tab.performanceView!=='table';
 const cards=[
  {icon:'games',label:'有遊玩遊戲',value:m.games,unit:'款'},
  {icon:'players',label:'區間遊玩人數',value:m.players,unit:'位'},
  {icon:'coins',label:'總投注額',value:money(m.total),unit:'USDT',caption:'平均每筆 '+(m.average===null?'—':money(m.average)+' USDT')},
  {icon:'payout',label:'結算派彩',value:money(m.payout),unit:'USDT'},
  {icon:'profit',label:'營運淨輸贏',value:signed(m.operatorNetWin),unit:'USDT',tone:tone(m.operatorNetWin)},
  {icon:'percent',label:'實際返還率',value:rtp(m.rtp),caption:'結算派彩 ÷ 總投注額'}
 ];
 return '<div class="page performance-page"><div class="page-heading"><div><h1>遊戲表現</h1><p class="breadcrumb">比較各遊戲的投注、玩家與營運盈虧</p></div><span class="badge">模擬資料</span></div>'+filtersHtml+'<div class="operation-metrics performance-metrics">'+cards.map(card=>infoCard(card)).join('')+'</div><div class="performance-view-bar"><p>'+e(tab.filters.start+' — '+tab.filters.end)+' · UTC+8</p><div class="view-toggle" role="group" aria-label="遊戲表現呈現方式">'+[['visual','視覺比較'],['table','傳統表格']].map(([key,label])=>'<button data-performance-view="'+key+'" aria-pressed="'+(visual?key==='visual':key==='table')+'">'+uiIcon(key==='visual'?'reports':'receipt')+label+'</button>').join('')+'</div></div>'+(visual?'<div class="performance-charts">'+ranking(m,'bet')+ranking(m,'operator')+'</div>':'')+comparisonTable(m,tab)+wagerRegionTable(records,data.organizations,tab.filters)+'<p class="page-note">玩家依現金網帳號去重；平均每筆投注額依實扣投注筆數計算。營運淨輸贏＝實扣投注−退款−結算派彩，未扣分潤與費用；實際返還率為區間結果。</p></div>';
}
