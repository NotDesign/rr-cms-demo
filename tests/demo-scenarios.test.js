import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandDemoScenarios,migrateDemoNames} from '../demo-scenarios.js';
import {filterRecords,reconcileFilters,totals,balances,money} from '../core.js';
import {wagerMetrics} from '../game-wagers.js';
import {accountingLines,accountingTotals,filterAccounting} from '../accounting.js';
import {createGameOperations,setGameAvailability} from '../game-operations.js';
import {hydrateConfiguration,compactGameOperations,queueLegacyChange} from '../cms-configuration.js';
import {managementPage,gameAccessView,impactView} from '../game-management-view.js';
import {ruleApplyHtml} from '../cms-rule-view.js';
import {cashWrapper,organizationParents} from '../organization-hierarchy.js';
import {organizationRecords} from '../core.js';
import {createPlayerCatalog} from '../player-management.js';
import {createBusinessState,saveBusinessRecord,settlementPreview,settlementPeriod} from '../business-management.js';
import {businessDetail} from '../business-management-view.js';
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

test('direct cash-network scenarios skip the wrapper without inventing organization identities',()=>{
 const direct=sites.filter(site=>!cashWrapper(data.organizations,site));assert.equal(direct.length,4);
 assert.deepEqual(direct.map(site=>data.organizations.find(o=>o.id===site.parent)?.level||'無上層機構').sort(),['遊戲商','遊戲集成商','無上層機構','無上層機構'].sort());
 for(const site of direct){
  const records=organizationRecords(data.records,data.organizations,site.id);assert.ok(records.length);assert.ok(records.every(r=>r.wrapperId===null));
  const parent=data.organizations.find(o=>o.id===site.parent);assert.ok(records.every(r=>r.integratorId===(parent?.level==='遊戲集成商'?parent.id:null)));
  const player=createPlayerCatalog(data).find(p=>p.siteId===site.id);assert.ok(player);assert.ok(!player.chain.some(o=>o.level==='包網商'));assert.equal(player.chain[0].level,site.parent?'遊戲商':'現金網');assert.ok(player.chain.some(o=>o.level==='第二層代理'));
  assert.ok(impactView(data,state,'EG-01',false).includes(site.name));
 }
 const scopes=[...data.organizations.filter(o=>o.level==='包網商'),...direct],counts=scopes.flatMap(o=>organizationRecords(data.records,data.organizations,o.id));assert.equal(counts.length,data.records.length);assert.equal(new Set(counts.map(r=>r.id)).size,data.records.length);
 const business=createBusinessState(data),range=settlementPeriod(data.date),sum=scopes.reduce((n,o)=>n+Math.round(settlementPreview(data,business,o.id,range).bet*100),0);assert.equal(sum,Math.round(wagerMetrics(data.records).total*100));
});
test('direct campaign persists independent sites and displays independent IDs with an empty wrapper identity',()=>{
 const business=createBusinessState(data),example=business.campaigns.find(c=>c.id==='ACT-DIRECT');assert.equal(example.sites.length,4);
 const html=businessDetail(data,business,'campaign',example.id);assert.match(html,/>現金網 ID<\/th>/);assert.match(html,/>包網商 ID<\/th>/);
 for(const id of example.sites){assert.ok(html.includes('>'+id+'<'));assert.ok(!cashWrapper(data.organizations,id));}
 assert.equal((html.match(/無包網商/g)||[]).length,4);assert.equal((html.match(/>—<\/td>/g)||[]).length,4);
 const changed=saveBusinessRecord(data,business,'campaign',example.id,{...example,games:data.games.slice(0,5).map(g=>g.id)},'測試複選範圍'),reloaded=createBusinessState(data,JSON.parse(JSON.stringify(changed)));
 assert.deepEqual(reloaded.campaigns.find(c=>c.id===example.id).sites,example.sites);assert.equal(reloaded.campaigns.find(c=>c.id===example.id).games.length,5);assert.equal(reloaded.campaigns.filter(c=>c.id==='ACT-DIRECT').length,1);
 const legacy={campaigns:business.campaigns.filter(c=>c.id!=='ACT-DIRECT')};assert.equal(createBusinessState(data,legacy).campaigns.filter(c=>c.id==='ACT-DIRECT').length,1);
});
test('new cash networks can connect to a wrapper, an integrator or the game supplier',()=>{
 const parents=organizationParents(data.organizations,'現金網');for(const level of ['包網商','遊戲集成商','遊戲商']){
  const parent=parents.find(o=>o.level===level);assert.ok(parent);
  const business=saveBusinessRecord(data,createBusinessState(data),'org',null,{name:level+'直連測試現金網',level:'現金網',parent:parent.id,status:'active',region:'台灣',gatewayId:'GW-APAC'},'測試可選層級');
  assert.equal(business.entities.at(-1).parent,parent.id);
 }
});

test('parentless wrapper and cash-network examples retain real relationships and financial totals',()=>{
 const roots=data.organizations.filter(o=>!o.parent&&o.level!=='遊戲商');
 assert.equal(roots.filter(o=>o.level==='包網商').length,2);assert.equal(roots.filter(o=>o.level==='現金網').length,2);
 for(const root of roots){const records=organizationRecords(data.records,data.organizations,root.id);assert.ok(records.length);assert.ok(records.every(r=>r.integratorId===null));}
 assert.equal(Math.round(totals(data.records).bet*100),95124000);
});
