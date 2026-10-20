import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRecords,defaultFilters,totals,rowsFor,summaryFor,sortedRows,csv,balances,fishingDetail} from '../core.js';
const d=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('all seven reports reconcile the same USDT fixture',()=>{
  assert.deepEqual(totals(d.records),{count:21,players:4,games:6,categories:4,bet:1780,payout:2790,net:1010});
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
  assert.equal(filterRecords(d.records,'chess',{...f(),type:'經典 21 點'}).length,1);
  assert.equal(filterRecords(d.records,'electronic',{...f(),result:'loss'}).length,1);
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
  for(const id of ['DEMO-F001','DEMO-F002']){
    const record=d.records.find(r=>r.id===id),f=fishingDetail(record);
    assert.equal(f.shots.reduce((s,r)=>s+r.cost,0)+f.toolCost,record.bet);
    assert.equal(f.normal+f.skill+f.bonus,record.payout);
    assert.equal(new Set(f.shots.map(s=>s.id)).size,f.shots.length);
    assert.equal(f.shots.filter(s=>s.result==='擊殺').length,id==='DEMO-F001'?6:0);
    assert.equal(f.fish.reduce((s,row)=>s+Number(row[9]),0),record.payout);
  }
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
