import test from 'node:test';
import assert from 'node:assert/strict';
import {regionSelection,regionDonut} from '../region-chart.js';
const groups=[{region:'台灣',players:6,total:240,average:40},{region:'越南',players:3,total:60,average:20},{region:'泰國',players:1,total:0,average:null}];
test('regional donut recomputes shares and totals when a region is hidden',()=>{
 const all=regionSelection(groups);assert.equal(all.total,10);assert.equal(all.slices[0].percent,60);
 const selected=regionSelection(groups,'players',['台灣']);assert.equal(selected.total,4);assert.equal(selected.regions,2);assert.equal(selected.slices[1].percent,75);assert.equal(selected.slices[0].percent,0);
 const amounts=regionSelection(groups,'total',['越南']);assert.equal(amounts.total,240);assert.equal(amounts.slices[0].percent,100);assert.equal(amounts.slices[2].percent,0);
 const empty=regionSelection(groups,'total',groups.map(g=>g.region));assert.equal(empty.total,0);assert.equal(empty.regions,0);assert.ok(empty.slices.every(g=>g.start===0&&g.end===0));
 assert.doesNotMatch(regionDonut(groups,'total',groups.map(g=>g.region)),/NaN|Infinity/);
 assert.doesNotMatch(regionDonut([]),/NaN|Infinity/);
});

import {gameCards} from '../detail-views.js';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gameCatalog} from '../game-catalog.js';
const demo=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('game cards show both sides of refunded play without invalid amounts',()=>{
 const html=gameCards([{...demo.records[0],bet:100,refund:25,payout:150,net:50}]);
 assert.match(html,/玩家淨盈虧/);assert.match(html,/營運淨輸贏/);
 assert.match(html,/\+75\.00/);assert.match(html,/−75\.00/);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('all 100 games have a unique local cover',()=>{
 const hashes=gameCatalog.map(game=>{const file=new URL('../assets/games/'+game.cover+'.jpg',import.meta.url);assert.ok(existsSync(file));return createHash('sha256').update(readFileSync(file)).digest('hex');});
 assert.equal(hashes.length,100);assert.equal(new Set(hashes).size,100);
});

import {regionPage} from '../region-chart.js';
import {statisticsModel,popularitySelection} from '../analytics.js';
test('regional pages cover all regions once and clamp empty or out-of-range requests',()=>{
 const regions=Array.from({length:22},(_,i)=>({region:'Region '+i,players:i,total:i*10}));
 const pages=Array.from({length:5},(_,i)=>regionPage(regions,i+1));assert.deepEqual(pages.flatMap(p=>p.rows),regions);
 assert.deepEqual([pages.at(-1).start,pages.at(-1).end,pages.at(-1).count],[21,22,22]);
 assert.equal(regionPage(regions,999).page,5);assert.equal(regionPage(regions,-1).page,1);
 assert.equal(regionPage(regions,5,20).page,2);assert.equal(regionPage(regions,NaN,7).pageSize,5);
 assert.deepEqual([regionPage([]).start,regionPage([]).end,regionPage([]).pages],[0,0,1]);
});
test('other-game player counts deduplicate shared players and averages exclude free bets',()=>{
 const entries=Array.from({length:7},(_,i)=>[0,(i+1)*10].map((bet,j)=>({game:'Game '+i,kind:'老虎機',cashId:'A',player_id:'P'+j,date:'2026-10-15',time:'08:00:00',bet,payout:0,net:-bet})) ).flat();
 const model=statisticsModel(entries,{start:'2026-10-15',end:'2026-10-15'}),other=popularitySelection(model.games).slices.find(s=>s.name==='其他遊戲');
 assert.equal(other.players,2);assert.equal(other.count,4);assert.equal(other.paid,2);assert.equal(other.bet,130);assert.equal(other.average,65);
 const html=regionDonut([{region:'美國',players:2,paid:1,total:100,average:100}]);assert.match(html,/donut-legend-details/);assert.match(html,/100\.00/);assert.doesNotMatch(html,/NaN|Infinity/);
});
