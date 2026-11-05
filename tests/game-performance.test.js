import test from 'node:test';
import assert from 'node:assert/strict';
import {performanceModel,performancePageRows,gamePerformancePage} from '../game-performance.js';
const records=[{game:'甲',kind:'老虎機',player:'p1',cashId:'a',bet:100,refund:20,payout:50},{game:'乙',kind:'捕魚',player:'p1',cashId:'a',bet:50,refund:0,payout:20},{game:'甲',kind:'老虎機',player:'p2',cashId:'b',bet:0,payout:10}];
test('performance reconciles refunds and weighted averages with distinct interval players',()=>{
 const m=performanceModel(records,[{id:'SL-1',name:'甲',type:'老虎機'}]);
 assert.equal(m.players,2);assert.equal(m.rows.reduce((sum,g)=>sum+g.players,0),3);
 assert.equal(m.total,150);assert.equal(m.average,75);assert.equal(m.paid,2);assert.equal(m.payout,80);assert.equal(m.operatorNetWin,50);assert.equal(m.playerNetWin,-50);
 assert.equal(m.rows[0].id,'SL-1');assert.equal(m.rows[0].average,100);assert.equal(m.rows[0].rtp,60);
 assert.equal(performanceModel(records,[],'operator').rows[0].name,'乙');
});
test('performance pages do not lose games and empty scopes have no invalid rates',()=>{
 const rows=Array.from({length:23},(_,id)=>({id}));assert.equal(performancePageRows(rows,9,10).page,3);assert.deepEqual(performancePageRows(rows,3,10).rows.map(g=>g.id),[20,21,22]);
 const m=performanceModel([]);assert.equal(m.rtp,null);assert.equal(m.average,null);assert.equal(m.games,0);
 const html=gamePerformancePage({games:[],organizations:[]},[],{filters:{start:'2026-10-15',end:'2026-10-15'}},'');assert.doesNotMatch(html,/NaN|Infinity/);assert.match(html,/遊戲表現明細/);
});
