import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {expandDemoScenarios} from '../demo-scenarios.js';
import {runtimeDetailTable,explorerRelations,sourceNumber,filteredExplorerRows,explorerPage,explorerCsv,sourceCurrency} from '../detail-explorer.js';
const data=expandDemoScenarios(JSON.parse(fs.readFileSync(new URL('../data/demo-data.json',import.meta.url)))),client=JSON.parse(fs.readFileSync(new URL('../data/customer-parameters.json',import.meta.url)));
const table=id=>client.tables.find(t=>t.id===id);
test('the complete synthetic CSV preserves tables, original IDs, signs and declared undecided parameters',()=>{
 assert.equal(client.tables.length,45);assert.equal(table('bets').rows.length,20);assert.equal(table('wallet').rows.length,96);assert.equal(table('fish_bullets').rows.length,14);assert.equal(table('slot_events').rows.length,6);assert.equal(table('dictionary').rows.length,604);
 assert.equal(sourceNumber('(35.00)'),-35);assert.equal(sourceNumber('1,000.00'),1000);assert.equal(sourceNumber(''),null);
 assert.equal(table('bets').rows.find(r=>r.bet_id==='SLOT002').gross_payout,'45.00');assert.equal(table('config').rows[0].pvp_turnover_rule,'UNDECIDED');
 const batchOnly=table('fish_hits').rows.find(r=>r.event_granularity==='BATCH_ONLY');assert.equal(batchOnly.bullet_id,'');assert.equal(batchOnly.billing_batch_uid,'FB_FISH001');assert.equal(sourceCurrency(client,table('fish_bullets'),table('fish_bullets').rows[0]),'USD');
 assert.match(explorerCsv(data,client,{source:'client',table:'wallet',query:'TX00001'}),/TX00001/);
});
test('runtime bullets have unique IDs, five levels, reconciled cost and links back to the single wager',()=>{
 const bullets=runtimeDetailTable(data,'fish_bullets'),batch=runtimeDetailTable(data,'fish_batches');
 assert.equal(new Set(bullets.rows.map(r=>r.bullet_id)).size,bullets.rows.length);assert.equal(new Set(bullets.rows.map(r=>r.bullet_level)).size,5);
 const b=batch.rows[0],shots=bullets.rows.filter(r=>r.bet_id===b.bet_id);assert.equal(Math.round(shots.reduce((sum,r)=>sum+r.allocated_cost,0)*100),Math.round((b.debit_amount-b.tool_cost)*100));
 assert.equal(filteredExplorerRows(bullets,{baseRecordIds:[]}).length,0);
 const matching=filteredExplorerRows(bullets,{query:shots[0].bullet_id});assert.equal(matching.length,1);assert.equal(matching[0].row.source_record_id,b.bet_id);
 const pages=explorerPage(bullets.rows,2,20);assert.equal(pages.start,21);assert.equal(pages.rows.length,20);
});
test('CSV foreign keys trace bullets to batches, wagers, rounds and sessions without inventing null bullet IDs',()=>{
 const bullet=table('fish_bullets').rows[0],links=explorerRelations(client,table('fish_bullets'),bullet);
 for(const id of ['fish_batches','bets','rounds','sessions'])assert.ok(links.some(r=>r.table===id),id);assert.ok(!links.some(r=>r.table==='card_players'));
 assert.equal(filteredExplorerRows(table('fish_bullets'),{site:'SITE_B'},client).length,3);
 const spins=runtimeDetailTable(data,'slot_events'),free=spins.rows.find(r=>r.parent_spin_id);assert.ok(free);assert.ok(spins.rows.some(r=>r.spin_id===free.parent_spin_id));
 assert.equal(new Set(spins.rows.map(r=>r.spin_id)).size,spins.rows.length);
});
