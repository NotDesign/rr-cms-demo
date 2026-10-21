import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statisticsModel,playerProfitLoss} from '../analytics.js';
import {statisticsDashboard} from '../statistics-view.js';
import {monthDays,shiftMonth} from '../date-picker.js';
const records=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url))).records;
const range={start:'2026-10-15',end:'2026-10-15'};
test('operating charts reconcile to selected wagers and use distinct players',()=>{
 const m=statisticsModel(records,range);
 assert.equal(m.players,132);assert.equal(m.games.length,18);assert.equal(m.series.length,24);
 assert.equal(m.series.reduce((s,b)=>s+b.count,0),1200);
 assert.equal(m.series.reduce((s,b)=>s+b.bet,0),291350);
 assert.equal(m.games.reduce((s,g)=>s+g.payout,0),440560);
 assert.equal(m.triggers,records.filter(r=>r.jackpotAward>0).length);
 assert.equal(m.difference,-149210);
 assert.equal(m.peak.players,Math.max(...m.series.map(b=>b.players)));
});
test('daily buckets keep returning players distinct over the full interval',()=>{
 const source=records[0],rs=[{...source,date:'2026-10-15'},{...source,date:'2026-10-16'}];
 const m=statisticsModel(rs,{start:'2026-10-14',end:'2026-10-17'});
 assert.equal(m.granularity,'day');assert.equal(m.players,1);
 assert.deepEqual(m.series.map(b=>b.players),[0,1,1,0]);
 assert.equal(m.series.reduce((n,b)=>n+b.bet,0),source.bet*2);
});
test('player winnings plus signed losses reconcile to player net without counting stakes twice',()=>{
 assert.deepEqual(playerProfitLoss([{net:120},{net:-50},{net:0},{net:30},{net:-20}]),{profit:150,loss:-70,net:80});
 for(const player of new Set(records.map(r=>r.player))){const rs=records.filter(r=>r.player===player),t=playerProfitLoss(rs);assert.equal(t.net,rs.reduce((n,r)=>n+r.net,0));}
});
test('empty analytics preserve zero amounts and never produce NaN or Infinity',()=>{
 const m=statisticsModel([],range);assert.equal(m.rtp,null);assert.equal(m.players,0);
 for(const metric of ['count','bet'])assert.doesNotMatch(statisticsDashboard([],range,metric),/NaN|Infinity/);
});
test('range calendar uses full leap months and safe month/year navigation',()=>{
 assert.equal(monthDays('2024-02').filter(Boolean).length,29);
 assert.equal(monthDays('2026-06')[0],'2026-06-01');
 assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2027-01',-1),'2026-12');
});
