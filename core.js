export const money = value => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value));
export const number = value => Number(String(value).replaceAll(',', '').replace('−', '-').replace(/×$/, '').replace(/（[^）]*）$/, ''));
export const tone = value => number(value) > 0 ? 'positive' : number(value) < 0 ? 'negative' : 'neutral';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Color actual financial results by meaning, before translating the label.
export function financialTone(label,value){
 const text=String(value).replaceAll(',','').replace('−','-');
 if(!/^[+\-]?\d+(?:\.\d+)?(?:\s*USDT)?$/.test(text))return '';
 if(/倍率|倍數|交易|狀態|時間|未入帳|未收取|基準|面額|費率|參考/.test(label))return '';
 return /盈虧|投注派彩差額|派彩|獎金|入帳 USDT|合計 USDT/.test(label)?tone(parseFloat(text)):'';
}
export function organizationRecords(records,organizations,id){
 const n=organizations.find(o=>o.id===id);if(!n)return [];
 return records.filter(r=>[r.providerId,r.wrapperId,r.cashId].includes(id));
}
export const playerId = name => name === 'shawn1328' ? 'P1328' : /^demo_\d+$/.test(name) ? 'P'+name.slice(5) : name;
export const scenario = record => record.seedId || record.id;
export const columnIndex = (def, header) => def.headers.indexOf(header);
export const rowRecordId = (def, row) => def.recordIds?.[def.rows.indexOf(row)] || row[columnIndex(def,'投注單號')] || row[columnIndex(def,'結算單號')];
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
    if (filters.difficulty && r.difficulty !== filters.difficulty) return false;
    if (filters.endReason && r.endReason !== filters.endReason) return false;
    if (filters.multiplier && (filters.multiplier === 'high' ? !(r.maxMultiplier>=1.5) : !(r.maxMultiplier<1.5))) return false;
    if (filters.recon && r.recon !== filters.recon) return false;
    if (filters.room && r.kind !== '捕魚') return false;
    if (filters.fish && !(r.kind==='捕魚' && fishingDetail(r).fish.flat().join(' ').toLowerCase().includes(filters.fish.toLowerCase()))) return false;
    if (filters.shot && !(r.kind==='捕魚' && fishingDetail(r).shots.some(s=>s.id.toLowerCase().includes(filters.shot.toLowerCase())))) return false;
    if (filters.tool && (filters.tool === '雷射炮' ? scenario(r)!=='DEMO-F001' : scenario(r)!=='DEMO-F002')) return false;
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
  if (!['player','stats'].includes(def.key)) return def.rows.filter((row,i) => ids.has(def.recordIds[i]));
  if (def.key === 'stats') return ['電子遊戲','老虎機','捕魚','棋牌'].flatMap(kind => {
    const rs=records.filter(r=>r.kind===kind);if(!rs.length)return [];
    const t=totals(rs), free=rs.filter(r=>r.bet===0).length;
    const rate=kind==='電子遊戲' ? '收取 '+rs.filter(r=>r.payout>0).length+' / '+rs.length+' 回合' :
      kind==='老虎機' ? '免費觸發 '+rs.filter(r=>r.event==='觸發免費旋轉').length+' / '+(rs.length-free)+' 付費轉' :
      kind==='捕魚' ? '首領擊殺 '+rs.filter(r=>scenario(r)==='DEMO-F001').length+' / '+rs.reduce((s,r)=>s+fishingDetail(r).shots.length,0)+' 發' :
      '炸彈 '+rs.filter(r=>r.game==='經典鬥地主').length+' / '+rs.filter(r=>r.game==='經典鬥地主').length+' 鬥地主局';
    return [[kind,String(t.players),[...new Set(rs.map(r=>playerId(r.player)))].join('、'),String(t.games),String(t.count),money(t.bet),money(t.bet),money(t.payout),signed(-t.net),String(t.count),'0.00','0.00',money(rs.reduce((s,r)=>s+r.bonus,0)),'0','0',rate,'查看']];
  });
  const groups=new Map();
  for(const r of records) {const k=r.player+'|'+r.game;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  return [...groups.values()].map(rs=>({rs,t:totals(rs)})).sort((a,b)=>b.t.bet-a.t.bet).map(({rs,t},i)=>
    [rs[0].player,playerId(rs[0].player),rs.map(r=>r.time).sort().at(-1),rs[0].kind,rs[0].game,String(t.count),
      money(t.bet),money(t.payout),signed(t.net),rs[0].site,money(t.bet),'第 '+(i+1)+' 名',
      String(rs.reduce((s,r)=>s+r.event_count,0)),'0.00','0',money(rs.reduce((s,r)=>s+(r.jackpotAward||0),0)),'查看']);
}
export function summaryFor(def, records) {
  const t=totals(records);
  if(def.key==='player')return [['不重複玩家數',String(t.players)],['遊戲數',String(t.games)],['實扣投注（USDT）',money(t.bet)],['玩家淨盈虧（USDT）',signed(t.net)]];
  if(def.key==='stats')return [['遊戲類型',String(t.categories)],['記錄筆數',String(t.count)],['有效投注（USDT）',money(t.bet)],['投注派彩差額（USDT）',signed(-t.net)]];
  return [[def.key==='slots'?'旋轉次數（免費 '+records.filter(r=>!r.bet).length+' 次）':'記錄筆數',String(t.count)],
    ['實扣投注（USDT）',money(t.bet)],['結算派彩（USDT）',money(t.payout)],['玩家淨盈虧（USDT）',signed(t.net)]];
}
// Column filters run on the displayed report grain. Player/game and category
// aggregates keep their underlying records so cards, totals and drill-down agree.
export const hasColumnFilter = rule => !!rule && (!!String(rule.query||'').trim() || Array.isArray(rule.values) || rule.min!==undefined&&rule.min!=='' || rule.max!==undefined&&rule.max!=='');
const normalized = value => String(value??'').normalize('NFKC').trim().toLocaleLowerCase();
export function filterReportColumns(def, records, filters={}, display=value=>String(value)) {
  const active=Object.entries(filters).filter(([index,rule])=>Number.isInteger(Number(index))&&Number(index)>=0&&Number(index)<def.headers.length-1&&hasColumnFilter(rule));
  const rows=rowsFor(def,records).filter(row=>active.every(([index,rule])=>{
    const value=String(row[index]),query=normalized(rule.query);
    if(query && !normalized(value).includes(query) && !normalized(display(value)).includes(query))return false;
    if(Array.isArray(rule.values)&&!rule.values.includes(value))return false;
    const time=rule.kind==='time',convert=x=>time?String(x).padEnd(8,':00'.slice(0,8-String(x).length)):number(x);
    const actual=convert(value);
    if(rule.min!==undefined&&rule.min!=='' && (Number.isNaN(actual)||actual<convert(rule.min)))return false;
    if(rule.max!==undefined&&rule.max!=='' && (Number.isNaN(actual)||actual>convert(rule.max)))return false;
    return true;
  }));
  if(!active.length)return {rows,records};
  if(def.key==='player'){
    const groups=new Set(rows.map(row=>row[0]+'\u0000'+row[4]));
    return {rows,records:records.filter(r=>groups.has(r.player+'\u0000'+r.game))};
  }
  if(def.key==='stats'){
    const kinds=new Set(rows.map(row=>row[0]));
    return {rows,records:records.filter(r=>kinds.has(r.kind))};
  }
  const ids=new Set(rows.map(row=>rowRecordId(def,row)));
  return {rows,records:records.filter(r=>ids.has(r.id))};
}
// Keep pinned columns usable at narrow widths; freeze only complete columns,
// leaving room for the unfrozen part of the horizontally scrollable table.
export function visibleFreezeCount(widths, requested, viewportWidth) {
  const count=Math.min(Math.max(0,Number(requested)||0),widths.length);
  const budget=Math.max(0,viewportWidth-Math.min(160,viewportWidth*.45));
  let sum=0,shown=0;
  for(let i=0;i<count;i++){if(sum+widths[i]>budget)break;sum+=widths[i];shown++;}
  return shown;
}
// Aggregate the entire filtered result, never only the visible page. Balances,
// multipliers, ranking and cumulative P&L are deliberately non-additive.
export function tableTotals(def, records, rows=rowsFor(def,records)) {
  const t=totals(records);
  return def.headers.map((header,i)=>{
    if(i===0)return '合計';
    if(header==='玩家數')return String(t.players);
    if(header==='遊戲數')return String(t.games);
    if(header==='玩家 ID')return String(t.players)+' 位玩家';
    if(def.aggregates?.[i]==='sum'){
      const n=rows.reduce((sum,row)=>sum+number(row[i]),0);
      return def.columnTypes[i]==='money'?money(n):def.columnTypes[i]==='signed'?signed(n):String(n);
    }
    if(def.aggregates?.[i]==='shots')return rows.reduce((s,r)=>s+Number(r[i].split(' / ')[0]),0)+' / '+rows.reduce((s,r)=>s+Number(r[i].split(' / ')[1]),0);
    return '';
  });
}
export function migrateWorkspace(saved, definitions) {
 if(!saved)return saved;
 let next=saved;
 if(!(saved.schemaVersion>=2)){
  const insertions={all:3,electronic:3,slots:2,fishing:3,chess:3,stats:2};
  next={...saved,schemaVersion:2,tabs:saved.tabs?.map(tab=>{
   const at=insertions[tab.key];if(at===undefined)return tab;
   const columns=tab.columns?.map(i=>i>=at?i+1:i);
   if(columns){const pos=columns.indexOf(at-1);columns.splice(pos<0?0:pos+1,0,at);}
   return {...tab,columns:columns||definitions.find(d=>d.key===tab.key)?.headers.map((_,i)=>i),sort:tab.sort?{...tab.sort,index:tab.sort.index>=at?tab.sort.index+1:tab.sort.index}:null};
  })};
 }
 if(next.schemaVersion>=3)return next;
 return {...next,schemaVersion:3,tabs:next.tabs?.map(tab=>{
  if(!['all','electronic','chess','player'].includes(tab.key))return tab;
  const at=definitions.find(d=>d.key===tab.key).headers.indexOf('獎池派彩');
  const columns=tab.columns?.map(i=>i>=at?i+1:i);
  if(columns){const pos=columns.indexOf(at+1);columns.splice(pos<0?columns.length:pos,0,at);}
  return {...tab,columns,sort:tab.sort?{...tab.sort,index:tab.sort.index>=at?tab.sort.index+1:tab.sort.index}:null};
 })};
}
export function sortedRows(rows, sort) {
  if(!sort)return rows;
  return [...rows].sort((a,b)=>{
    const av=a[sort.index],bv=b[sort.index],numeric=/^[+−-]?\d[\d,.]*(?:×|（[^）]*）)?$/;
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
 const first=scenario(record)==='DEMO-F001',paid=first?90:60,free=first?10:0,prefix=record.round.replace('FB-',''),scale=record.scale||1,base=record.fishBase||(first?9001:9101);
 const award=scale*(record.rewardMultiplier||1);
 const limits=first?[30,75]:[20,50];
 const shots=Array.from({length:paid+free},(_,i)=>{
  const level=i<limits[0]?1:i<limits[1]?2:3,rate=2**(level-1),unit=rate*scale;
  return {id:'SH-'+prefix+'-'+String(i+1).padStart(3,'0'),time:'T+'+String(Math.floor(i/60)).padStart(2,'0')+':'+String(i%60).padStart(2,'0'),
   bullet:i<paid?'普通子彈 B-01':'獎勵子彈 B-02',level:'Lv.'+level,rate,unit,denomination:scale,cost:i<paid?unit:0,
   source:i<paid?'付費':'首領獎勵',debitId:i<paid?'DEBIT-'+prefix+'-'+String(i+1).padStart(3,'0'):'免扣款',pricePlan:'DEMO-BULLET-1.0',
   target:first?'F'+(i>=90?base+9:base+Math.min(Math.floor(i/15),5)):'F'+base,
   result:first&&[14,29,44,59,74,89].includes(i)?'擊殺':'命中未擊殺',tool:first&&i>=75&&i<=89?'雷射炮':'普通炮台'};
 });
 const grouped=new Map();for(const shot of shots){const key=[shot.level,shot.unit,shot.source].join('|');if(!grouped.has(key))grouped.set(key,{level:shot.level,rate:shot.rate,unit:shot.unit,source:shot.source,count:0,cost:0,reference:0});const g=grouped.get(key);g.count++;g.cost+=shot.cost;g.reference+=shot.unit;}
 const changes=shots.flatMap((s,i)=>i&&s.level!==shots[i-1].level?[{time:s.time,from:shots[i-1].level,to:s.level,unit:s.unit,shot:s.id}]:[]);
 const fish=first?Array.from({length:6},(_,i)=>{
  const shot=shots[(i+1)*15-1],multiplier=i===5?'技能 '+money(10*(record.rewardMultiplier||1))+'×＋轉盤 '+money(15*(record.rewardMultiplier||1))+'×':money(12*award/shot.unit)+'×';
  return ['F'+(base+i),i===5?'金龍首領':i<3?'小丑魚':'河豚',i===5?'FS-009':'FS-00'+(i<3?1:2),shot.id,i===5?'雷射擊殺':'子彈擊殺',multiplier,money((i===5?0:12)*award),money((i===5?40:0)*award),money((i===5?60:0)*award),money((i===5?100:12)*award),'PAY-'+record.id+'-'+(i+1),'已入帳',shot.level,money(shot.unit)];
 }):[['F'+base,'河豚','FS-002',shots.at(-1).id,'命中未擊殺','未達捕獲條件','0.00','0.00','0.00','0.00','無派彩交易','未產生派彩',shots.at(-1).level,money(shots.at(-1).unit)]];
 return {shots,fish,paid,free,levels:[...grouped.values()],changes,bulletCost:shots.reduce((s,x)=>s+x.cost,0),freeReference:shots.filter(x=>!x.cost).reduce((s,x)=>s+x.unit,0),toolCost:first?20*scale:0,normal:first?60*award:0,skill:first?40*award:0,bonus:first?60*award:0};
}
// Demonstration rules only; exact supplier rules remain a future API contract.
export function chessDetail(r){
 const s=r.scale||1,v=r.cardVariant||0;
 if(r.game==='經典 21 點'){
  const variants=[
   {result:'玩家 20 點勝莊家 18 點',player:['K♠','Q♥'],dealer:['10♣','8♦'],payout:600,bet:300,action:'停牌'},
   {result:'玩家 18 點負莊家 20 點',player:['10♠','8♥'],dealer:['K♣','Q♦'],payout:0,bet:300,action:'停牌'},
   {result:'雙方 19 點，和局',player:['10♠','9♥'],dealer:['K♣','9♦'],payout:300,bet:300,action:'停牌'},
   {result:'自然 21 點，3:2 派彩',player:['A♠','K♥'],dealer:['10♣','8♦'],payout:750,bet:300,action:'自然 21 點'},
   {result:'加倍後 21 點勝莊家 18 點',player:['5♠','6♥','K♦'],dealer:['10♣','8♦'],payout:600,bet:300,action:'加倍：150.00 → 300.00'},
   {result:'分牌：一手負、一手勝',player:['8♠','K♥','8♦','3♣','K♦'],dealer:['10♣','Q♦'],payout:300,bet:300,action:'分牌：每手 150.00'},
   {result:'莊家自然 21 點；保險中獎',player:['10♠','8♥'],dealer:['A♣','K♦'],payout:450,bet:450,action:'主注 300.00＋保險 150.00'}
  ],x=variants[v%variants.length];
  return {...x,action:v%7===4?'加倍：'+money(150*s)+' → '+money(300*s):v%7===5?'分牌：每手 '+money(150*s):v%7===6?'主注 '+money(300*s)+'＋保險 '+money(150*s):x.action,bet:x.bet*s,payout:x.payout*s,base:(v%7===4||v%7===5?150:300)*s,net:(x.payout-x.bet)*s,rule:'DEMO-BJ-1.0',variant:v%7,
   hands:v%7===5?[[r.round+'-H1','8♠ K♥','負',150*s,0],[r.round+'-H2','8♦ 3♣ K♦','勝',150*s,300*s]]:v%7===6?[[r.round+'-MAIN','10♠ 8♥','負',300*s,0],[r.round+'-INS','莊家 A♣ K♦','保險中獎',150*s,450*s]]:[[r.round+'-H1',x.player.join(' '),x.result,x.bet*s,x.payout*s]]};
 }
 if(r.game==='搶莊牛牛'){
  const a=[['牛牛勝牛七','牛牛','牛七',300],['牛七負牛牛','牛七','牛牛',0],['雙方牛牛，和局','牛牛','牛牛',150],['牛七勝牛六，1 倍結算','牛七','牛六',200]][v%4];
  return {result:a[0],player:a[1]==='牛牛'?['10♠','J♥','Q♣','K♦','10♥']:['7♠','8♥','5♣','2♦','5♥'],dealer:a[2]==='牛牛'?['10♣','J♦','Q♠','K♥','10♦']:a[2]==='牛七'?['7♣','8♦','5♠','2♥','5♣']:['6♣','8♦','6♠','2♥','4♣'],bet:150*s,payout:a[3]*s,net:(a[3]-150)*s,base:50*s,multiplier:v%4===3?'1×':'3×',action:a[0],rule:'DEMO-NIU-1.0',variant:v%4};
 }
 const win=v%3!==0,spring=v%3===2;
 return {result:win?'地主勝，'+(spring?'春天':'炸彈 1 次'):'農民勝，地主負',player:['大王','A♠','3♦'],dealer:[],bet:400*s,payout:win?800*s:0,net:win?400*s:-400*s,base:50*s,multiplier:'2 × 2 = 4×',action:spring?'叫分 2×；春天 2×':'叫分 2×；炸彈 2×',rule:'DEMO-DDZ-1.0',variant:v%3,spring};
}
