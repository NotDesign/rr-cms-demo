import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRecords,defaultFilters,totals,rowsFor,summaryFor,tableTotals,migrateWorkspace,number,playerId,rowRecordId,sortedRows,csv,balances,fishingDetail} from '../core.js';
const d=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('all seven reports reconcile the same USDT fixture',()=>{
  assert.deepEqual(totals(d.records),{count:96,players:29,games:6,categories:4,bet:13100,payout:13555,net:455});
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
  assert.equal(filterRecords(d.records,'chess',{...f(),type:'經典 21 點'}).length,7);
  assert.equal(filterRecords(d.records,'electronic',{...f(),result:'loss'}).length,9);
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
    assert.equal(f.normal+f.skill+f.bonus,record.payout);
    assert.equal(new Set(f.shots.map(s=>s.id)).size,f.shots.length);
    assert.equal(f.shots.filter(s=>s.result==='擊殺').length,record.seedId==='DEMO-F001'?6:0);
    assert.equal(f.fish.reduce((s,row)=>s+Number(row[9]),0),record.payout);
  }
});
test('player ID remains linked to the same player in every report and CSV',()=>{
  assert.equal(new Set(d.records.map(r=>r.id)).size,96);
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
  assert.deepEqual(next.tabs[0].columns,[2,3,0,6,8]);assert.equal(next.tabs[0].sort.index,8);assert.equal(next.tabs[0].filters.query,'P1001');assert.equal(next.tabs[0].page,2);
  assert.deepEqual(next.tabs[1],saved.tabs[1]);assert.deepEqual(migrateWorkspace(next,d.reports),next);
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
