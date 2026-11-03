import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {poolSummary,jackpotOverview,jackpotHours,filterJackpotWins,cents} from '../jackpot-analytics.js';
const data=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('every jackpot reconciles its opening, contributions, awards and source closing in cents',()=>{
 for(const pool of data.jackpotPools){const p=poolSummary(pool,data.records);assert.equal(p.difference,0,p.id);assert.equal(cents(p.expectedClosing),cents(pool.closing));assert.equal(p.entries.length,data.records.filter(r=>r.jackpot?.poolId===pool.id).length);}
 const all=jackpotOverview(data);assert.equal(all.award,42540);assert.equal(all.wins.length,79);assert.equal(cents(all.opening+all.contribution-all.award),cents(all.balance));
});
test('hourly totals match the source ledger and zero-stake free rounds never contribute',()=>{
 const hours=jackpotHours(data.records),all=jackpotOverview(data);assert.equal(hours.length,24);assert.equal(hours.reduce((n,h)=>n+cents(h.contribution),0),cents(all.contribution));assert.equal(hours.reduce((n,h)=>n+cents(h.award),0),cents(all.award));assert.equal(hours.reduce((n,h)=>n+h.wins,0),79);assert.ok(data.records.filter(r=>r.jackpot&&r.bet===0).every(r=>r.jackpot.contribution===0));
});
test('winner search drills into exact records and filters by pool, family and player',()=>{
 const winner=filterJackpotWins(data)[0],pool=winner.jackpot.poolId;assert.equal(new Set(filterJackpotWins(data).map(r=>r.jackpot.transactionId)).size,79);assert.ok(filterJackpotWins(data,{poolId:pool}).every(r=>r.jackpot.poolId===pool));assert.ok(filterJackpotWins(data,{type:winner.kind}).every(r=>r.kind===winner.kind));assert.ok(filterJackpotWins(data,{query:winner.player_id}).some(r=>r.id===winner.id));assert.deepEqual(filterJackpotWins(data,{query:'no-such-player-000'}),[]);
});
test('jackpot filters and empty scopes retain consistent pool totals and no unrelated games',()=>{
 const p=data.jackpotPools[0],one=jackpotOverview(data,{poolId:p.id});assert.equal(one.pools.length,1);assert.equal(one.balance,p.closing);const empty=jackpotOverview(data,{query:'no-such-pool'});assert.equal(empty.balance,0);assert.equal(empty.contribution,0);assert.equal(empty.award,0);assert.equal(empty.wins.length,0);assert.ok(jackpotOverview(data,{type:'捕魚'}).pools.every(p=>data.games.find(g=>g.name===p.game).type==='捕魚'));
});
