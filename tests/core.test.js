import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRecords,defaultFilters,totals,rowsFor,summaryFor,tableTotals,migrateWorkspace,number,playerId,rowRecordId,sortedRows,csv,balances,fishingDetail,financialTone,organizationRecords,chessDetail,money} from '../core.js';
const d=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('all seven reports reconcile the same USDT fixture',()=>{
  assert.deepEqual(totals(d.records),{count:400,players:36,games:6,categories:4,bet:95740,payout:146555,net:50815});
  for(const def of d.reports){
    const records=filterRecords(d.records,def.key,defaultFilters()),rows=rowsFor(def,records),t=totals(records);
    assert.equal(rows.length,def.rows.length,def.key);
    assert.equal(rows.reduce((s,r)=>s+Number(r[def.pnlColumn].replaceAll(',','').replace('−','-')),0),def.key==='stats'?-t.net:t.net);
    assert.ok(rows.every(r=>r.length===def.headers.length&&r.every(v=>!['','—','-'].includes(String(v)))));
  }
});
test('search, date, type, outcome and exact shot queries affect record sets',()=>{
  const f=()=>defaultFilters();
  assert.equal(filterRecords(d.records,'all',{...f(),query:'P1001'}).length,4);
  assert.equal(filterRecords(d.records,'all',{...f(),query:'DEMO-E001'}).length,1);
  assert.equal(filterRecords(d.records,'all',{...f(),start:'2026-10-20',end:'2026-10-20'}).length,0);
  assert.equal(filterRecords(d.records,'chess',{...f(),type:'經典 21 點'}).length,34);
  assert.equal(filterRecords(d.records,'electronic',{...f(),result:'loss'}).length,34);
  assert.equal(filterRecords(d.records,'fishing',{...f(),shot:'SH-0301-090'}).length,1);
  assert.equal(filterRecords(d.records,'fishing',{...f(),shot:'SH-0301-999'}).length,0);
  assert.equal(filterRecords(d.records,'fishing',{...f(),fish:'F9006',tool:'雷射炮'}).length,1);
});
test('filtered summary is recalculated, including empty and player aggregates',()=>{
  const all=d.reports[0],rs=filterRecords(d.records,'all',{...defaultFilters(),query:'P1001'});
  assert.equal(summaryFor(all,rs)[3][1],'+160.00');
  assert.equal(summaryFor(all,[])[1][1],'0.00');
  const player=d.reports.find(r=>r.key==='player');
  assert.equal(rowsFor(player,rs).length,3);
});
test('fishing shots, kills, tool costs and payout breakdown reconcile',()=>{
  for(const record of d.records.filter(r=>r.kind==='捕魚')){
    const f=fishingDetail(record);
    assert.equal(f.shots.reduce((s,r)=>s+r.cost,0)+f.toolCost,record.bet);
    assert.equal(f.normal+f.skill+f.bonus+(record.jackpotAward||0),record.payout);
    assert.equal(new Set(f.shots.map(s=>s.id)).size,f.shots.length);
    assert.equal(f.shots.filter(s=>s.result==='擊殺').length,record.seedId==='DEMO-F001'?6:0);
    assert.equal(f.fish.reduce((s,row)=>s+number(row[9]),0),record.basePayout);
  }
});
test('player ID remains linked to the same player in every report and CSV',()=>{
  assert.equal(new Set(d.records.map(r=>r.id)).size,400);
  assert.ok(d.records.every(r=>r.player_id===playerId(r.player)));
  for(const def of d.reports){
    const id=def.headers.indexOf('玩家 ID');assert.notEqual(id,-1,def.key);
    assert.ok(def.rows.every(row=>row[id].split('、').every(id=>d.records.some(r=>r.player_id===id))));
    if(!['stats','player'].includes(def.key))for(const row of def.rows){const record=d.records.find(r=>r.id===rowRecordId(def,row));assert.equal(row[id],record.player_id);}
    assert.ok(csv(def.headers,def.rows).includes('"玩家 ID"'));
  }
});
test('totals span all filtered rows, deduplicate entities and omit non-additive fields',()=>{
  for(const def of d.reports){
    for(const query of ['', 'P1001','P2001','nonexistent']){
      const rs=filterRecords(d.records,def.key,{...defaultFilters(),query}),rows=rowsFor(def,rs),values=tableTotals(def,rs,rows),t=totals(rs);
      assert.equal(values.length,def.headers.length);
      assert.equal(number(values[def.pnlColumn]),(def.key==='stats'?-t.net:t.net)||0);
      for(const h of ['結算後餘額','場次累積盈虧','實際收取倍率','投注額排行','最高達成倍率'])if(def.headers.includes(h))assert.equal(values[def.headers.indexOf(h)],'');
      if(def.key==='stats'){assert.equal(values[1],String(t.players));assert.equal(values[3],String(t.games));}
    }
  }
});
test('existing workspace columns and sort migrate without losing filters or tab state',()=>{
  const saved={tabs:[{key:'electronic',columns:[2,0,5,7],sort:{index:7,direction:'desc'},filters:{query:'P1001'},page:2},{key:'player',columns:[0,1]}]};
  const next=migrateWorkspace(saved,d.reports);
  assert.deepEqual(next.tabs[0].columns,[2,3,0,6,8,21]);assert.equal(next.tabs[0].sort.index,8);assert.equal(next.tabs[0].filters.query,'P1001');assert.equal(next.tabs[0].page,2);
  assert.deepEqual(next.tabs[1].columns,[0,1,15]);assert.deepEqual(migrateWorkspace(next,d.reports),next);
});
test('wallet balances retain the reference slot sequence and player net',()=>{
  const last=d.records.find(r=>r.id==='DEMO-S614');
  assert.deepEqual(balances(d.records,last),{before:11270,after:11250});
  const electronic=d.records.find(r=>r.id==='DEMO-E001');
  assert.deepEqual(balances(d.records,electronic),{before:10140,after:10160});
});
test('CSV preserves numeric precision, signs, quoting and Chinese headers',()=>{
  const text=csv(['玩家','盈虧'],[['demo_"a"','−40.00']]);
  assert.equal(text,'\ufeff"玩家","盈虧"\r\n"demo_""a""","−40.00"');
});
test('numeric sorting handles commas and negative signs',()=>{
  assert.deepEqual(sortedRows([['−20.00'],['1,000.00'],['+15.00']],{index:0,direction:'asc'}),[['−20.00'],['+15.00'],['1,000.00']]);
});

test('all categories contain 100 samples; every row keeps its source wager and payout',()=>{
 for(const kind of ['電子遊戲','老虎機','捕魚','棋牌'])assert.equal(d.records.filter(r=>r.kind===kind).length,100);
 const seed=JSON.parse(readFileSync(new URL('../data/seed-data.json',import.meta.url)));
 for(const r of seed.records){const current=d.records.find(x=>x.id===r.id);for(const k of ['bet','payout','net'])assert.equal(current[k],r[k]);}
 for(const def of d.reports.filter(x=>!['stats','player'].includes(x.key)))for(const row of def.rows){
  const r=d.records.find(x=>x.id===rowRecordId(def,row));
  assert.equal(number(row[def.headers.indexOf('實扣投注')]),r.bet,r.id);
  assert.equal(number(row[def.headers.indexOf('結算派彩')]),r.payout,r.id);
 }
});
test('mixed bullet levels reconcile free references, debit counts and kill-shot award bases',()=>{
 for(const r of d.records.filter(r=>r.kind==='捕魚')){
  const f=fishingDetail(r);assert.equal(f.levels.reduce((s,g)=>s+g.count,0),f.shots.length);
  assert.equal(f.levels.reduce((s,g)=>s+g.cost,0),f.bulletCost);
  assert.equal(new Set(f.shots.map(s=>s.level)).size,3);
  for(const shot of f.shots){assert.equal(shot.unit,shot.denomination*shot.rate);assert.equal(shot.cost,shot.source==='付費'?shot.unit:0);}
  assert.equal(f.shots.filter(x=>x.debitId==='免扣款').length,f.free);
  for(const row of f.fish.filter(row=>row[4]==='子彈擊殺'))assert.equal(number(row[13])*number(row[5]),number(row[6]));
  assert.ok(f.changes.every(c=>f.shots.find(s=>s.id===c.shot).unit===c.unit));
 }
 const f=fishingDetail(d.records.find(r=>r.id==='DEMO-F001'));
 assert.deepEqual(f.levels.map(g=>[g.level,g.count,g.cost]),[['Lv.1',30,30],['Lv.2',45,90],['Lv.3',15,60],['Lv.3',10,0]]);
 assert.equal(f.freeReference,40);assert.equal(f.bulletCost+f.toolCost,200);
});
test('income colors cover unsigned prizes without treating stakes and balances as losses',()=>{
 for(const h of ['一般獎金','結算派彩','合計 USDT','入帳 USDT']){assert.equal(financialTone(h,'12.00'),'positive');assert.equal(financialTone(h,'0.00'),'neutral');}
 assert.equal(financialTone('玩家淨盈虧','−12.00'),'negative');assert.equal(financialTone('實際派彩','160.00 USDT'),'positive');
 for(const h of ['實扣投注','子彈成本','結算後餘額','派彩倍數','最後可領金額（未入帳）','獎金基準 USDT'])assert.equal(financialTone(h,'12.00'),'');
});
test('hierarchy partitions records and amounts once and keeps every player in one cash site',()=>{
 for(const parent of d.organizations){
  const children=d.organizations.filter(o=>o.parent===parent.id);if(!children.length)continue;
  const rs=organizationRecords(d.records,d.organizations,parent.id),desc=children.flatMap(c=>organizationRecords(d.records,d.organizations,c.id));
  assert.equal(new Set(desc.map(r=>r.id)).size,rs.length);assert.equal(desc.length,rs.length);
  for(const k of ['bet','payout','net'])assert.equal(totals(desc)[k],totals(rs)[k]);
 }
 for(const name of new Set(d.records.map(r=>r.player)))assert.equal(new Set(d.records.filter(r=>r.player===name).map(r=>r.cashId)).size,1);
 assert.deepEqual(organizationRecords(d.records,d.organizations,'invalid'),[]);
});

test('card variants preserve hand settlement and provide wins, losses and pushes',()=>{
 const rs=d.records.filter(r=>r.kind==='棋牌');
 for(const r of rs){const c=chessDetail(r);assert.equal(c.bet,r.bet);assert.equal(c.payout+r.jackpotAward,r.payout);assert.equal(c.net+r.jackpotAward,r.net);if(c.hands){assert.equal(c.hands.reduce((n,h)=>n+h[3],0),r.bet);assert.equal(c.hands.reduce((n,h)=>n+h[4],0),r.basePayout);}}
 for(const game of new Set(rs.map(r=>r.game)))for(const outcome of [-1,0,1])if(game!=='經典鬥地主'||outcome!==0)assert.ok(rs.some(r=>r.game===game&&Math.sign(r.net)===outcome),game+': '+outcome);
});

test('blackjack scaled actions agree with per-hand stake',()=>{
 for(const scale of [.5,1,2,3]){
 const r={game:'經典 21 點',round:'BJ-TEST',scale};
 const doubled=chessDetail({...r,cardVariant:4});
 assert.equal(doubled.base,150*scale);
 assert.equal(doubled.action,'加倍：'+money(150*scale)+' → '+money(300*scale));
 const split=chessDetail({...r,cardVariant:5});
 assert.equal(split.action,'分牌：每手 '+money(split.hands[0][3]));
 }
});

test('optional jackpots reconcile contributions, payout splits and pool balances once',()=>{
 for(const r of d.records){assert.equal(r.basePayout+r.jackpotAward,r.payout);assert.equal(r.payout-r.bet,r.net);if(!r.jackpot){assert.equal(r.jackpotAward,0);continue;}const j=r.jackpot;assert.equal(j.award,r.jackpotAward);assert.equal(Math.round((j.before+j.contribution-j.award)*100)/100,j.after);if(j.award){assert.equal(j.status,'已入帳');assert.ok(j.triggerId.startsWith('JP-EV-'));assert.ok(j.transactionId.startsWith('JP-CREDIT-'));}}
 for(const pool of d.jackpotPools){const rs=d.records.filter(r=>r.jackpot?.poolId===pool.id);assert.equal(Math.round((pool.opening+rs.reduce((n,r)=>n+r.jackpot.contribution-r.jackpotAward,0))*100)/100,pool.closing);}
 for(const kind of ['電子遊戲','老虎機','捕魚','棋牌'])assert.ok(d.records.some(r=>r.kind===kind&&r.jackpotAward>0));
 assert.ok(d.records.some(r=>!r.jackpot));assert.ok(d.records.some(r=>r.jackpot?.status==='未觸發'));
});

test('annotated unavailable amounts retain source notes and scale without NaN',()=>{
 const def=d.reports.find(r=>r.key==='electronic'),at=def.headers.indexOf('最後可領金額（未入帳）');
 assert.equal(def.rows.find(r=>r[1]==='DEMO-E002')[at],'240.00（已失效）');
 for(const r of d.records.filter(r=>r.kind==='電子遊戲'&&r.seedId==='DEMO-E002'))assert.equal(number(def.rows.find(row=>row[1]===r.id)[at]),240*(r.scale||1));
 for(const def of d.reports)assert.ok(def.rows.every(row=>row.every(v=>!/(?:NaN|Infinity)/.test(String(v)))));
 assert.deepEqual(sortedRows([['720.00（已失效）'],['0.00'],['120.00（已失效）']],{index:0,direction:'asc'}),[['0.00'],['120.00（已失效）'],['720.00（已失效）']]);
});
