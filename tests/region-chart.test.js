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
