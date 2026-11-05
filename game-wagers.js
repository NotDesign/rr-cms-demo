import {infoCard} from './metric-card.js?v=14.5.0';
import {escape as e, money, signed, tone, recordPlayerKey} from './core.js?v=14.5.0';
import {netWinsFor} from './net-win.js?v=14.4.1';
import {regionChart,regionTable} from './region-chart.js?v=14.5.2';
import {uiIcon} from './ui-icons.js?v=14.4.8';

export function wagerMetrics(records) {
  let cents = 0;
  let paid = 0;
  const players = new Set();
  for (const record of records) {
    players.add(recordPlayerKey(record));
    const amount = Math.round(record.bet * 100);
    if (amount > 0) {
      cents += amount;
      paid++;
    }
  }
  return {players: players.size, paid, total: cents / 100, average: paid ? cents / paid / 100 : null};
}

export function wagerRegions(records, organizations) {
  const siteRegions = new Map(organizations.filter(org => org.level === '現金網').map(site => [
    site.id, site.region || site.name.match(/(台灣|越南|泰國)站$/)?.[1] ||
      (site.name.includes('國際') ? '國際站' : '未標示地區')
  ]));
  const grouped = new Map();
  for (const record of records) {
    const region = record.siteRegion || siteRegions.get(record.cashId) || '未標示地區';
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region).push(record);
  }
  return [...grouped].map(([region, entries]) => ({region, ...wagerMetrics(entries), ...netWinsFor(entries)}))
    .sort((a, b) => b.players - a.players || b.total - a.total || a.region.localeCompare(b.region, 'zh-Hant'));
}

export function wagerOverview(records, date, label = '總投注額', {compact=false}={}) {
  const {total, average} = wagerMetrics(records), wins=netWinsFor(records);
  const metrics=[
    {key:'bet',icon:'coins',label,value:money(total),tone:''},
    {key:'average',icon:'activity',label:'平均每筆投注額',value:average===null?'—':money(average),tone:''},
    {key:'player',icon:'players',label:'玩家淨盈虧',value:signed(wins.playerNetWin),tone:tone(wins.playerNetWin)},
    {key:'operator',icon:'profit',label:'營運淨輸贏',value:signed(wins.operatorNetWin),tone:tone(wins.operatorNetWin)}
  ];
  const meta='<small class="wager-meta">'+e(date)+' · 模擬投注 · 平均按實扣投注筆數計算</small>';
  if(compact)return '<div class="wager-overview wager-overview--compact">'+metrics.map(m=>'<span class="wager-metric"><span>'+e(m.label)+'</span><strong class="'+m.tone+'">'+e(m.value)+(m.value==='—'?'':' USDT')+'</strong></span>').join('')+meta+'</div>';
  return '<div class="wager-overview"><div class="wager-card-grid">'+metrics.map(m=>infoCard({icon:m.icon,label:m.label,value:m.value,unit:m.value==='—'?'':'USDT',tone:m.tone,className:'wager-info-card',tag:'article',attrs:'data-wager-card="'+m.key+'" role="group" aria-label="'+e(m.label+' '+m.value+(m.value==='—'?'':' USDT'))+'"'})).join('')+'</div>'+meta+'</div>';
}

// Sum underlying records for the same filter scope; percentages and versions stay blank.
export function wagerTableTotals(records,label='合計'){
 const wins=netWinsFor(records);
 return {label,values:{'總投注額 USDT':money(wagerMetrics(records).total),'投注額 USDT':money(wagerMetrics(records).total),
  '玩家淨盈虧 USDT':signed(wins.playerNetWin),'營運淨輸贏 USDT':signed(wins.operatorNetWin)}};
}

export function wagerRegionTable(records, organizations, filters={}) {
 const groups=wagerRegions(records,organizations),total={...wagerMetrics(records),...netWinsFor(records)};
 const dates=records.map(r=>r.date).filter(Boolean).sort(),start=filters.start||dates[0],end=filters.end||dates.at(-1);
 const period=start?(start===end?start:start+' — '+end).replaceAll('-','/') : '';
 return '<section class="analytics-card wager-regions"><div class="analytics-card-head"><div><h2>'+uiIcon('globe')+
  '地區遊玩統計</h2><p>依現金網所屬地區統計 · 遊玩人數按現金網玩家帳號去重</p></div></div>'+
  '<div class="wager-region-layout">'+regionChart(groups,period)+regionTable(groups,total)+'</div>'+
  (groups.length?'':'<p class="notice">此篩選範圍沒有遊玩記錄</p>')+
  '<p class="detail-note">平均每筆投注額＝所選區間總投注額 ÷ 實扣投注筆數。免費回合計入遊玩人數；合計與圓環圖涵蓋全部地區，不受表格分頁影響。</p></section>';
}
