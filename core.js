export const money = value => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value));
export const number = value => Number(String(value).replaceAll(',', '').replace('−', '-').replace(/×$/, ''));
export const tone = value => number(value) > 0 ? 'positive' : number(value) < 0 ? 'negative' : 'neutral';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const playerId = name => ({shawn1328:'P1328',demo_1001:'P1001',demo_1002:'P1002',demo_1003:'P1003'}[name] || name);
export const defaultFilters = () => ({start:'2026-10-15',end:'2026-10-15',merchant:'',type:'',query:'',event:'',result:'',difficulty:'',recon:'',room:'',fish:'',shot:'',tool:'',endReason:'',multiplier:''});
export function filterRecords(records, key, filters) {
  const category = {electronic:'電子遊戲',slots:'老虎機',fishing:'捕魚',chess:'棋牌'}[key];
  return records.filter(r => {
    if (category && category !== r.kind) return false;
    if (filters.start && r.date < filters.start || filters.end && r.date > filters.end) return false;
    if (filters.type && ![r.kind,r.game].includes(filters.type)) return false;
    if (filters.merchant && r.site !== filters.merchant) return false;
    const text = [r.id,r.player,playerId(r.player),r.round,r.game,r.event].join(' ').toLowerCase();
    if (filters.query && !text.includes(filters.query.trim().toLowerCase())) return false;
    if (filters.event && !r.event.includes(filters.event)) return false;
    if (filters.result === 'win' && r.net <= 0 || filters.result === 'loss' && r.net >= 0 || filters.result === 'zero' && r.net !== 0) return false;
    if (filters.difficulty && (r.id === 'DEMO-E001' ? '一般' : r.id === 'DEMO-E002' ? '困難' : '') !== filters.difficulty) return false;
    if (filters.endReason && (r.id === 'DEMO-E001' ? '玩家主動收取' : r.id === 'DEMO-E002' ? '闖關失敗' : '') !== filters.endReason) return false;
    if (filters.multiplier && (filters.multiplier === 'high' ? r.id !== 'DEMO-E002' : r.id !== 'DEMO-E001')) return false;
    if (filters.recon && r.recon !== filters.recon) return false;
    if (filters.room && r.kind !== '捕魚') return false;
    if (filters.fish && !((r.id === 'DEMO-F001' ? 'F9001 F9002 F9003 F9004 F9005 F9006 金龍 小丑魚 河豚' : r.id === 'DEMO-F002' ? 'F9101 河豚' : '').toLowerCase().includes(filters.fish.toLowerCase()))) return false;
    if (filters.shot && !(r.id.startsWith('DEMO-F') && fishingDetail(r).shots.some(s=>s.id.toLowerCase().includes(filters.shot.toLowerCase())))) return false;
    if (filters.tool && (filters.tool === '雷射炮' ? r.id !== 'DEMO-F001' : r.id !== 'DEMO-F002')) return false;
    return true;
  });
}
export function totals(records) {
  return {
    count: records.length, players: new Set(records.map(r=>r.player)).size,
    games: new Set(records.map(r=>r.game)).size, categories: new Set(records.map(r=>r.kind)).size,
    bet: records.reduce((s,r)=>s+r.bet,0), payout: records.reduce((s,r)=>s+r.payout,0),
    net: records.reduce((s,r)=>s+r.net,0)
  };
}
export function rowsFor(def, records) {
  const ids = new Set(records.map(r=>r.id));
  if (!['player','stats'].includes(def.key)) return def.rows.filter(row => ids.has(def.key === 'slots' ? 'DEMO-S'+row[3].replace('#','') : row[1]));
  if (def.key === 'stats') return ['電子遊戲','老虎機','捕魚','棋牌'].flatMap(kind => {
    const rs=records.filter(r=>r.kind===kind);if(!rs.length)return [];
    const t=totals(rs), free=rs.filter(r=>r.bet===0).length;
    const rate=kind==='電子遊戲' ? '收取 '+rs.filter(r=>r.payout>0).length+' / '+rs.length+' 回合' :
      kind==='老虎機' ? '免費觸發 '+rs.filter(r=>r.event==='觸發免費旋轉').length+' / '+(rs.length-free)+' 付費轉' :
      kind==='捕魚' ? '首領擊殺 '+(ids.has('DEMO-F001')?1:0)+' / '+((ids.has('DEMO-F001')?100:0)+(ids.has('DEMO-F002')?60:0))+' 發' :
      '炸彈 '+rs.filter(r=>r.game==='經典鬥地主').length+' / '+rs.filter(r=>r.game==='經典鬥地主').length+' 鬥地主局';
    return [[kind,String(t.players),String(t.games),String(t.count),money(t.bet),money(t.bet),money(t.payout),signed(-t.net),String(t.count),'0.00','0.00',money(rs.reduce((s,r)=>s+r.bonus,0)),'0','0',rate,'查看']];
  });
  const groups=new Map();
  for(const r of records) {const k=r.player+'|'+r.game;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  return [...groups.values()].map(rs=>({rs,t:totals(rs)})).sort((a,b)=>b.t.bet-a.t.bet).map(({rs,t},i)=>
    [rs[0].player,playerId(rs[0].player),rs.map(r=>r.time).sort().at(-1),rs[0].kind,rs[0].game,String(t.count),
      money(t.bet),money(t.payout),signed(t.net),rs[0].site,money(t.bet),'第 '+(i+1)+' 名',
      String(rs.reduce((s,r)=>s+r.event_count,0)),'0.00','0','查看']);
}
export function summaryFor(def, records) {
  const t=totals(records);
  if(def.key==='player')return [['不重複玩家數',String(t.players)],['遊戲數',String(t.games)],['實扣投注（USDT）',money(t.bet)],['玩家淨盈虧（USDT）',signed(t.net)]];
  if(def.key==='stats')return [['遊戲類型',String(t.categories)],['記錄筆數',String(t.count)],['有效投注（USDT）',money(t.bet)],['投注派彩差額（USDT）',signed(-t.net)]];
  return [[def.key==='slots'?'旋轉次數（免費 '+records.filter(r=>!r.bet).length+' 次）':'記錄筆數',String(t.count)],
    ['實扣投注（USDT）',money(t.bet)],['結算派彩（USDT）',money(t.payout)],['玩家淨盈虧（USDT）',signed(t.net)]];
}
export function sortedRows(rows, sort) {
  if(!sort)return rows;
  return [...rows].sort((a,b)=>{
    const av=a[sort.index],bv=b[sort.index],numeric=/^[+−-]?\d[\d,.]*(×)?$/;
    const result=numeric.test(av)&&numeric.test(bv)?number(av)-number(bv):av.localeCompare(bv,'zh-Hant',{numeric:true});
    return sort.direction==='asc'?result:-result;
  });
}
export function csv(headers, rows) {
  return '\ufeff'+[headers,...rows].map(row=>row.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export function balances(records, target) {
  let balance=10000;
  for(const r of [...records].filter(r=>r.player===target.player).sort((a,b)=>a.time.localeCompare(b.time))) {
    if(r.id===target.id)return {before:balance,after:balance+r.net};
    balance+=r.net;
  }
  return {before:balance,after:balance};
}
export function fishingDetail(record) {
  const first=record.id==='DEMO-F001',paid=first?90:60,free=first?10:0,prefix=first?'0301':'0302';
  const shots=Array.from({length:paid+free},(_,i)=>({
    id:'SH-'+prefix+'-'+String(i+1).padStart(3,'0'),
    time:'T+'+String(Math.floor(i/60)).padStart(2,'0')+':'+String(i%60).padStart(2,'0'),
    bullet:i<paid?'普通子彈 B-01':'獎勵子彈 B-02',cost:i<paid?2:0,
    source:i<paid?'付費':'首領獎勵',target:first?(i>=90?'F9010':'F'+(9001+Math.min(Math.floor(i/15),5))):'F9101',
    result:first&&[14,29,44,59,74,89].includes(i)?'擊殺':'命中未擊殺',
    tool:first&&i>=75&&i<=89?'雷射炮':'普通炮台'
  }));
  const fish=first?Array.from({length:6},(_,i)=>[
    'F'+(9001+i),i===5?'金龍首領':i<3?'小丑魚':'河豚',i===5?'FS-009':'FS-00'+(i<3?1:2),
    'SH-0301-'+String((i+1)*15).padStart(3,'0'),i===5?'雷射擊殺':'子彈擊殺',
    i===5?'技能 20×＋轉盤 30×':'6.00×',money(i===5?0:12),money(i===5?40:0),
    money(i===5?60:0),money(i===5?100:12),'PAY-F001-'+(i+1),'已入帳'
  ]):[['F9101','河豚','FS-002','SH-0302-060','命中未擊殺','未達捕獲條件','0.00','0.00','0.00','0.00','無派彩交易','未產生派彩']];
  return {shots,fish,paid,free,toolCost:first?20:0,normal:first?60:0,skill:first?40:0,bonus:first?60:0};
}
