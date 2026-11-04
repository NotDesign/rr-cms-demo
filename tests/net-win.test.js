import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {netWinCents,netWinsFromAmounts,netWinsFor,playerResultTotals} from '../net-win.js';
import {accountingModel,accountingTotals,groupAccounting} from '../accounting.js';
import {accountingPage,accountingDetail,accountingCsvRows} from '../accounting-view.js';
import {createPlayerCatalog,createPlayerState,playerDirectory} from '../player-management.js';
import {playerPage} from '../player-management-view.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/demo-data.json',import.meta.url))),model=accountingModel(data,[],{});

test('each side uses net paid stakes and the same inclusive payout, never the stored legacy net',()=>{
  assert.deepEqual(netWinsFromAmounts({bet:100,refund:25,payout:20,net:999}),{playerNetWin:-55,operatorNetWin:55});
  assert.deepEqual(netWinsFromAmounts({bet:100,payout:120,jackpotAward:30}),{playerNetWin:20,operatorNetWin:-20});
  assert.deepEqual(netWinsFromAmounts({bet:0,payout:20}),{playerNetWin:20,operatorNetWin:-20});
});
test('full refunds and empty results have neither invented win nor negative zero',()=>{
  for(const wins of [netWinCents(10000,10000,0),netWinsFor([]),netWinsFromAmounts({})]){
    assert.equal(wins.playerNetWin,0);assert.equal(wins.operatorNetWin,0);
    assert.equal(Object.is(wins.playerNetWin,-0),false);assert.equal(Object.is(wins.operatorNetWin,-0),false);
  }
});
test('cent precision reconciles profit, loss and both sides after refunds',()=>{
  const rows=[{bet:.1,payout:.3},{bet:.3,refund:.1,payout:0},{bet:1,refund:1,payout:0}];
  assert.deepEqual(netWinsFor(rows),{playerNetWin:0,operatorNetWin:0,refund:1.1});
  assert.deepEqual(playerResultTotals(rows),{profit:.2,loss:-.2,net:0});
});
test('all 1200 unchanged wagers reconcile to both directions and the existing GGR',()=>{
  const before=JSON.stringify(data),wins=netWinsFor(data.records);
  assert.equal(wins.playerNetWin,149210);assert.equal(wins.operatorNetWin,-149210);
  assert.equal(model.totals.playerNetWin,14921000);assert.equal(model.totals.operatorNetWin,-14921000);
  assert.equal(model.totals.ggr,model.totals.operatorNetWin);
  for(const group of groupAccounting(model.rows,'record'))assert.equal(group.totals.playerNetWin+group.totals.operatorNetWin,0);
  for(const item of model.items)assert.equal(item.playerNetWin+item.operatorNetWin,0);
  assert.equal(JSON.stringify(data),before);
});
test('refunds propagate into accounting totals without changing charges or payouts',()=>{
  const row={...model.rows[0],charge:10000,refund:2500,generalPayout:2000,jackpotPayout:0};
  const t=accountingTotals([row]);assert.equal(t.playerNetWin,-5500);assert.equal(t.operatorNetWin,5500);
  assert.equal(t.charge,10000);assert.equal(t.payout,2000);
});
test('both CSV views expose separate signed columns that match every filtered group',()=>{
  const selected=accountingModel(data,[],{merchant:['示範商戶／主站'],accountingItems:['bullet','tool'],accountingGroup:'record'});
  for(const trial of [false,true]){
    const out=accountingCsvRows(selected,data,data.organizations,trial),player=out.headers.indexOf('玩家淨盈虧 USDT'),operator=out.headers.indexOf('營運淨輸贏 USDT');
    assert.ok(player>=0&&operator>=0);assert.ok(out.rows.length);
    out.rows.forEach((row,i)=>{assert.equal(row.length,out.headers.length);assert.equal(Math.round(Number(row[player])*100),selected.groups[i].totals.playerNetWin);assert.equal(Math.round(Number(row[operator])*100),selected.groups[i].totals.operatorNetWin);});
  }
});
test('cards, totals and source rows retain both perspectives in game and service modes',()=>{
  const selected=accountingModel(data,[],{query:'DEMO-F001'});
  for(const accountingAmounts of ['game','service']){
    const html=accountingPage(data,selected,{filters:{},accountingAmounts},data.organizations,'');
    assert.match(html,/玩家淨盈虧/);assert.match(html,/營運淨輸贏/);
    assert.match(html,/class="negative">−40\.00/);assert.match(html,/class="positive">\+40\.00/);
    assert.match(html,/<th class="num" scope="col">玩家淨盈虧 USDT/);assert.match(html,/<th class="num" scope="col">營運淨輸贏 USDT/);
  }
  const html=accountingDetail(data,selected.groups[0],data.organizations);
  assert.match(html,/玩家淨盈虧/);assert.match(html,/營運淨輸贏/);
  const table=html.match(/<table class="acct-table">([\s\S]*?)<\/table>/)[1],count=[...table.match(/<thead>([\s\S]*?)<\/thead>/)[1].matchAll(/<th /g)].length;
  for(const row of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g))if(row[1].includes('<td'))assert.equal([...row[1].matchAll(/<td[ >]/g)].length,count);
});
test('player directory retains both independent numeric columns and matches filtered records',()=>{
  const players=playerDirectory(createPlayerCatalog(data),createPlayerState(),{start:data.date,end:data.date,query:'P1001'}),html=playerPage(data,players,createPlayerState(),'directory',{filters:{},playerUI:{}},'');
  assert.ok(players.length);assert.match(html,/<th scope="col" class="num">玩家淨盈虧 USDT/);assert.match(html,/<th scope="col" class="num">營運淨輸贏 USDT/);
  const table=html.match(/<table class="pm-table"[\s\S]*?<\/table>/)[0],count=[...table.matchAll(/<th /g)].length;
  for(const row of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g))if(row[1].includes('<td'))assert.equal([...row[1].matchAll(/<td /g)].length,count);
});
