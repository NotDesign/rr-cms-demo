import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameCatalog,featuredSlotGames} from '../game-catalog.js';
import {expandDemoScenarios,migrateDemoNames} from '../demo-scenarios.js';
import {createGameOperations} from '../game-operations.js';
import {hydrateConfiguration} from '../cms-configuration.js';
import {filteredManagementGames} from '../game-management-view.js';

const source=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
const data=expandDemoScenarios(source),sites=data.organizations.filter(org=>org.level==='現金網');
const names=['Golden Legacy','Panda Fist','Taste of Empire','Ebisu Fortune','Lucky Cat','Poker Wars','Fitness Lady','Glory of the Colosseum','Dragon King','Mafia Legacy','Goddess of Eternal Gold','Legends of Lubu & Diaochan','Royal Pirates'];

test('the 13 supplied English slot titles lead the catalog without changing operational identities',()=>{
 assert.deepEqual(featuredSlotGames.map(game=>game.name),names);
 assert.equal(gameCatalog.length,100);
 assert.equal(new Set(gameCatalog.map(game=>game.id)).size,100);
 const operations=createGameOperations(data.games,sites);
 const sorted=filteredManagementGames(data,operations);
 assert.deepEqual(sorted.slice(0,13).map(game=>game.name),names);
 assert.equal(data.games[0].id,'EG-01');
 for(const [index,primary] of featuredSlotGames.entries()){
  const game=data.games.find(game=>game.id===primary.id);
  assert.equal(game.id,'SL-'+String(index+1).padStart(2,'0'));
  assert.equal(game.type,'老虎機');
  assert.doesNotMatch(game.name,/R&R/);
  const bytes=readFileSync(new URL('../assets/games/'+game.cover+'.jpg',import.meta.url));
  assert.equal(bytes.readUInt16BE(0),0xffd8);
 }
});

test('renaming keeps wager amounts, source IDs and jackpot balances attached to their existing games',()=>{
 for(const original of source.records){
  const record=data.records.find(record=>record.id===original.id);
  const game=data.games.find(game=>game.id===record.gameId);
  assert.equal(record.game,game.name);
  for(const field of ['gameId','bet','payout','net','round','spin','session'])assert.equal(record[field],original[field]);
  if(original.jackpot){assert.equal(record.jackpot.poolId,original.jackpot.poolId);assert.equal(record.jackpotAward,original.jackpotAward);}
 }
 for(const game of data.games.filter(game=>game.legacyName)){
  const pool=data.jackpotPools.find(pool=>pool.game===game.name);
  if(game.hasJackpot){assert.ok(pool);assert.equal(pool.name,game.name+'共用獎池');}
  const old=source.jackpotPools.find(pool=>pool.game===game.legacyName);
  if(old){assert.equal(pool.id,old.id);assert.equal(pool.opening,old.opening);}
 }
 const slots=data.reports.find(report=>report.key==='slots'),column=slots.headers.indexOf('遊戲名稱');
 assert.ok(column>=0);
 for(const [index,id] of slots.recordIds.entries())assert.equal(slots.rows[index][column],data.records.find(record=>record.id===id).game);
});

test('saved game selections migrate to English while keeping unrelated search values intact',()=>{
 const column=data.reports.find(report=>report.key==='slots').headers.indexOf('遊戲名稱');
 const workspace={tabs:[{key:'slots',filters:{game:['翡翠金礦','埃及祕寶']},draft:{game:'福運招財'},columnFilters:{[column]:{query:'翡翠金礦',values:['翡翠金礦','水果狂歡']}},managementUI:{query:'雷霆之神'}}]};
 const migrated=migrateDemoNames(workspace,data).tabs[0];
 assert.deepEqual(migrated.filters.game,['Golden Legacy','Panda Fist']);
 assert.equal(migrated.draft.game,'Taste of Empire');
 assert.equal(migrated.columnFilters[column].query,'Golden Legacy');
 assert.deepEqual(migrated.columnFilters[column].values,['Golden Legacy','水果狂歡']);
 assert.equal(migrated.managementUI.query,'Ebisu Fortune');
});

test('saved generated rule labels migrate without modifying custom rules, RTP or site bindings',()=>{
 const legacyData={...data,games:data.games.map(game=>({...game,name:game.legacyName||game.name}))};
 const before=hydrateConfiguration(legacyData,createGameOperations(legacyData.games,sites));
 const custom=structuredClone(before.configuration.rules['CMS-GAME-SL-01']);
 custom.id='CMS-GAME-SL-01-CUSTOM';custom.name='翡翠金礦 客戶自訂';custom.draft.name=custom.name;custom.draft.systemName=false;
 before.configuration.rules[custom.id]=custom;
 const after=hydrateConfiguration(data,before);
 assert.equal(after.configuration.rules['CMS-GAME-SL-01'].draft.name,'Golden Legacy・預設遊戲規則');
 assert.equal(after.configuration.rules['CMS-GAME-SL-01'].versions[0].name,'Golden Legacy・預設遊戲規則');
 assert.deepEqual(after.configuration.rules[custom.id],custom);
 assert.deepEqual(after.games,before.games);
 assert.deepEqual(after.configuration.bindings,before.configuration.bindings);
 assert.deepEqual(after.configuration.rules['CMS-GAME-SL-01'].draft.settings,before.configuration.rules['CMS-GAME-SL-01'].draft.settings);
 assert.equal(after.configuration.applied['SL-01'][sites[0].id].game.snapshot.name,'Golden Legacy・預設遊戲規則');
 assert.deepEqual(hydrateConfiguration(data,after),after);
});
