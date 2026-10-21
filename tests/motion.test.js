import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animateRegion} from '../motion.js';
import {detailTableTotals} from '../core.js';
test('motion cancels in-flight transitions and skips motion when requested',()=>{
 let cancelled=0,calls=[];const el={getAnimations:()=>[{cancel(){cancelled++;}}],animate:(frames,options)=>{calls.push({frames,options});return true;}};
 globalThis.matchMedia=()=>({matches:false});animateRegion(el,'submenu');animateRegion(el,'drawer');
 assert.equal(cancelled,2);assert.equal(calls[0].options.duration,220);assert.equal(calls[1].options.duration,260);assert.equal(calls[1].frames[0].transform,'translateX(100%)');
 globalThis.matchMedia=()=>({matches:true});animateRegion(el,'detail');assert.equal(cancelled,3);assert.equal(calls.length,2);delete globalThis.matchMedia;
});
test('detail totals do not sum unit rates, running balances or multipliers',()=>{
 assert.deepEqual(detailTableTotals(['等級','單發費率 USDT','發數','實扣成本 USDT','餘額 USDT','玩家淨盈虧'],[['Lv.1','1.00',30,'30.00','900.00','+10.00'],['Lv.2','1.50',20,'30.00','950.00','−5.00']]),['合計 · 2 筆','', '50','60.00','', '+5.00']);
});
test('exit completes once and reopening cancels the stale close callback',async()=>{
 const {animateExit,cancelRegion}=await import('../motion.js');let active=[],callbacks=0;
 const el={getAnimations:()=>active,animate:()=>{let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const a={finished,resolve,cancel(){reject();active=[];}};active=[a];return a;}};
 globalThis.matchMedia=()=>({matches:false});const first=animateExit(el,'drawer',()=>callbacks++);cancelRegion(el);first.resolve();await Promise.resolve();assert.equal(callbacks,0);
 const second=animateExit(el,'drawer',()=>callbacks++);second.resolve();await Promise.resolve();assert.equal(callbacks,1);
 globalThis.matchMedia=()=>({matches:true});animateExit(el,'submenu',()=>callbacks++);assert.equal(callbacks,2);delete globalThis.matchMedia;
});
