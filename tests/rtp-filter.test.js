import test from 'node:test';
import assert from 'node:assert/strict';
import {rtpRows} from '../game-management-view.js';
const games=Array.from({length:100},(_,i)=>({id:'G'+i}));
const sites=Array.from({length:50},(_,i)=>({id:'S'+i}));
test('RTP starts with all games and keeps the whole scope when paging',()=>{
 const first=rtpRows(games,sites),next=rtpRows(games,sites,{rtpPage:2});
 assert.equal(first.games.length,100);assert.equal(first.total,5000);assert.equal(first.pages,100);
 assert.equal(first.rows.length,50);assert.equal(first.rows[0].game.id,'G0');assert.equal(next.rows[0].game.id,'G1');
 assert.equal(next.total,first.total);assert.equal(next.games.length,first.games.length);
});
test('RTP multiple selection contains only selected game/site pairs and resets empty scope to all',()=>{
 const model=rtpRows(games,sites,{gameIds:['G2','G7','G2','missing'],rtpPage:999});
 assert.deepEqual(model.games.map(g=>g.id),['G2','G7']);assert.equal(model.total,100);assert.equal(model.page,2);
 assert.equal(model.rows.length,50);assert.ok(model.rows.every(row=>row.game.id==='G7'));
 assert.equal(rtpRows(games,sites,{gameIds:[]}).total,5000);
 assert.equal(rtpRows(games,[],{gameIds:['G2']}).rows.length,0);
});
