import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandDemoScenarios,migrateDemoNames} from '../demo-scenarios.js';
import {filterRecords,reconcileFilters,totals,balances,money} from '../core.js';
import {wagerMetrics} from '../game-wagers.js';
import {accountingLines,accountingTotals,filterAccounting} from '../accounting.js';
import {createGameOperations,setGameAvailability} from '../game-operations.js';
import {hydrateConfiguration,compactGameOperations,queueLegacyChange} from '../cms-configuration.js';
import {managementPage,gameAccessView} from '../game-management-view.js';
import {ruleApplyHtml} from '../cms-rule-view.js';
import {SLOT_GAMEPLAYS,hasSlotScope} from '../slot-gameplay.js';

const source=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
const data=expandDemoScenarios(source);
const sites=data.organizations.filter(org=>org.level==='現金網');
const state=hydrateConfiguration(data,createGameOperations(data.games,sites));

test('expanded discussion data has complete requested hierarchy and unique names',()=>{
  for(const [level,count] of [['遊戲集成商',5],['包網商',20],['現金網',50]]){
    const organizations=data.organizations.filter(org=>org.level===level);
    assert.equal(organizations.length,count);
    assert.equal(new Set(organizations.map(org=>org.name)).size,count);
    assert.ok(organizations.every(org=>org.name.endsWith(level)&&!org.name.includes('站')));
  }
  assert.equal(data.games.length,100);
  assert.equal(totals(data.records).players,500);
  assert.equal(new Set(data.records.map(record=>record.gameId)).size,100);
  assert.equal(new Set(data.records.map(record=>record.cashId)).size,50);
  assert.ok(data.organizations.every(org=>!org.parent||data.organizations.some(parent=>parent.id===org.parent)));
  assert.deepEqual(totals(data.records.slice(0,source.records.length)),totals(source.records));
});

test('expanded report rows preserve identifiers and reconcile every wager and jackpot',()=>{
  assert.equal(new Set(data.records.map(record=>record.id)).size,data.records.length);
  for(const def of data.reports){
    assert.ok(def.rows.every(row=>row.length===def.headers.length));
    if(!['player','stats'].includes(def.key)){
      assert.equal(def.rows.length,def.recordIds.length);
      const bet=def.headers.indexOf('實扣投注');
      const amount=def.rows.reduce((sum,row)=>sum+Math.round(Number(row[bet].replaceAll(',',''))*100),0);
      assert.equal(amount,Math.round(wagerMetrics(data.records.filter(r=>def.recordIds.includes(r.id))).total*100));
    }
  }
  for(const pool of data.jackpotPools){
    const records=data.records.filter(record=>record.jackpot?.poolId===pool.id);
    const ending=records.reduce((sum,record)=>sum+Math.round(record.jackpot.contribution*100)-Math.round(record.jackpotAward*100),pool.opening*100);
    assert.equal(ending,Math.round(pool.closing*100));
  }
  const slots=data.reports.find(report=>report.key==='slots');
  const expandedSlot=data.records.find(record=>record.id.startsWith('DEMO-EXP-')&&record.kind==='老虎機');
  const row=slots.rows[slots.recordIds.indexOf(expandedSlot.id)];
  assert.equal(row[slots.headers.indexOf('結算後餘額')],money(balances(data.records,expandedSlot).after));
  const ledger=accountingTotals(accountingLines(data.records));
  assert.equal(ledger.charge,Math.round(wagerMetrics(data.records).total*100));
});

test('saved cash-site selections migrate to independent cash-network names',()=>{
  const old=source.organizations.find(org=>org.id==='SITE-A1').name;
  const workspace={tabs:[{key:'all',filters:{merchant:[old]},draft:{merchant:old},columnFilters:{11:{values:[old]}}}]};
  const migrated=migrateDemoNames(workspace,data).tabs[0];
  assert.deepEqual(migrated.filters.merchant,['金鼎現金網']);
  assert.equal(migrated.draft.merchant,'金鼎現金網');
  assert.deepEqual(migrated.columnFilters[11].values,['金鼎現金網']);
  assert.equal(filterRecords(data.records,'all',migrated.filters).length,data.records.filter(r=>r.cashId==='SITE-A1').length);
});

test('slot gameplay filters apply across reporting and accounting and clear with other categories',()=>{
  assert.ok(hasSlotScope({type:['老虎機']},data.games));
  assert.ok(!hasSlotScope({type:['捕魚']},data.games));
  for(const [key] of SLOT_GAMEPLAYS){
    const filters={type:['老虎機'],slotGameplay:[key]};
    const records=filterRecords(data.records,'all',filters);
    assert.ok(records.length);
    assert.ok(records.every(record=>record.kind==='老虎機'&&record.slotGameplay===key));
    assert.equal(new Set(records.map(record=>record.gameId)).size,5);
    assert.equal(accountingTotals(filterAccounting(accountingLines(data.records),filters)).charge,Math.round(wagerMetrics(records).total*100));
  }
  const next=reconcileFilters({type:['捕魚'],slotGameplay:['cascade']},data.organizations,data.games,data.records);
  assert.equal(next.slotGameplay,'');
});

test('RTP, access and rule-publish tables separate cash networks and wrappers',()=>{
  const pages=[managementPage(data,state,'rtp'),gameAccessView(data,state,'EG-01'),ruleApplyHtml(data,state,'CMS-GAME-EG-01')];
  for(const html of pages){
    assert.doesNotMatch(html,/現金網／包網商/);
    for(const [,head,body] of html.matchAll(/<table class="mg-table[^"]*"><thead>(.*?)<\/thead><tbody>(.*?)<\/tbody>/gs)){
      assert.match(head,/>現金網<\/th><th[^>]*>包網商<\/th>/);
      const columns=(head.match(/<th\b/g)||[]).length;
      for(const [,row] of body.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs))assert.equal((row.match(/<td\b/g)||[]).length,columns);
    }
  }
});

test('compact operation storage preserves pending application across reloading a large demo',()=>{
  const now=new Date('2026-11-04T02:00:00Z');
  const changed=setGameAvailability(state,'EG-01',false,'測試全域下架',now);
  const pending=queueLegacyChange(data,changed,{kind:'availability',gameId:'EG-01',listed:false},'測試全域下架',now);
  const compact=compactGameOperations(data,pending);
  assert.ok(JSON.stringify(compact).length<1000000);
  const restored=hydrateConfiguration(data,createGameOperations(data.games,sites,compact),compact.configuration);
  assert.deepEqual(restored.configuration,pending.configuration);
});
