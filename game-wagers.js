import {escape as e, money, recordPlayerKey} from './core.js?v=14.4';
import {uiIcon} from './ui-icons.js?v=14.1';

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
  return [...grouped].map(([region, entries]) => ({region, ...wagerMetrics(entries)}))
    .sort((a, b) => b.players - a.players || b.total - a.total || a.region.localeCompare(b.region, 'zh-Hant'));
}

export function wagerOverview(records, date, label = '總投注額') {
  const {total, average} = wagerMetrics(records);
  return '<div class="wager-overview"><span class="wager-metric">'+uiIcon('coins')+'<span>'+label+'</span><strong>'+money(total)+' USDT</strong></span>'+
    '<span class="wager-metric"><span>平均每筆投注額</span><strong>'+(average === null ? '—' : money(average)+' USDT')+'</strong></span>'+
    '<small>'+e(date)+' · 模擬投注 · 平均按實扣投注筆數計算</small></div>';
}

export function wagerRegionTable(records, organizations) {
  const groups = wagerRegions(records, organizations), total = wagerMetrics(records);
  const cells = row => '<td class="num">'+row.players+'</td><td class="num">'+row.paid+'</td><td class="num">'+money(row.total)+'</td><td class="num">'+
    (row.average === null ? '—' : money(row.average))+'</td>';
  const headings = ['地區', '遊玩人數', '實扣投注筆數', '總投注額 USDT', '平均每筆投注額 USDT'];
  return '<section class="analytics-card wager-regions"><div class="analytics-card-head"><div><h2>'+uiIcon('globe')+
    '地區遊玩統計</h2><p>依現金網所屬地區統計 · 遊玩人數按現金網玩家帳號去重</p></div></div>'+
    '<div class="mini-scroll" tabindex="0" role="region" aria-label="地區遊玩統計"><table class="mini-table"><thead><tr>'+
    headings.map((title,i) => '<th scope="col"'+(i?' class="num"':'')+'>'+title+'</th>').join('')+
    '</tr></thead><tbody><tr class="mini-totals"><th scope="row">合計</th>'+cells(total)+'</tr>'+
    groups.map(group => '<tr><th scope="row">'+e(group.region)+'</th>'+cells(group)+'</tr>').join('')+
    '</tbody></table></div>'+(groups.length ? '' : '<p class="notice">此篩選範圍沒有遊玩記錄</p>')+
    '<p class="detail-note">平均每筆投注額＝總投注額 ÷ 實扣投注筆數。免費回合計入遊玩人數。</p></section>';
}
