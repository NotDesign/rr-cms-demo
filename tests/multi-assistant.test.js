import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultFilters,filterRecords,reconcileFilters,totals,playerId,money} from '../core.js';
import {multiFieldHtml,matchingChoices,multiOptionsHtml} from '../filter-multi.js';
import {answerQuestion} from '../assistant.js';
import {playerSourceProfile} from '../analytics.js';
const data=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
const {records,organizations,games}=data;
test('multi filters union values within a field and intersect across fields',()=>{
 const f={...defaultFilters(),type:['電子遊戲','捕魚'],wrapper:['PKG-A','PKG-B']};
 const expected=records.filter(r=>['電子遊戲','捕魚'].includes(r.kind)&&['PKG-A','PKG-B'].includes(r.wrapperId));
 assert.deepEqual(filterRecords(records,'all',f),expected);assert.ok(expected.length>0);
 assert.equal(filterRecords(records,'all',{...f,game:['星際闖關','龍宮爭霸']}).length,expected.filter(r=>['星際闖關','龍宮爭霸'].includes(r.game)).length);
 assert.equal(filterRecords(records,'all',{...defaultFilters(),type:[]}).length,records.length);
});
test('parent changes retain compatible selected children and clear the rest',()=>{
 const a=organizations.find(o=>o.level==='現金網'&&o.parent==='PKG-A'),b=organizations.find(o=>o.level==='現金網'&&o.parent==='PKG-B');
 const f=reconcileFilters({...defaultFilters(),wrapper:['PKG-A'],merchant:[a.name,b.name],type:['電子遊戲','捕魚'],game:['星際闖關','深海獵場','經典 21 點'],room:'深海 01 房'},organizations,games,records);
 assert.deepEqual(f.merchant,[a.name]);assert.deepEqual(f.game,['星際闖關','深海獵場']);assert.equal(f.room,'深海 01 房');
 const next=reconcileFilters({...f,type:['老虎機']},organizations,games,records);assert.equal(next.game,'');
 assert.deepEqual(reconcileFilters({...defaultFilters(),wrapper:['PKG-A','PKG-B'],merchant:[a.name,b.name]},organizations,games,records).merchant,[a.name,b.name]);
});
test('multi controls preserve escaped values, searchable labels and checked state',()=>{
 const choices=[['','全部遊戲'],['g1','Long <game>'],['g2','Other']];
 assert.deepEqual(matchingChoices(choices,'translated',x=>x==='Other'?'Translated':x),[['g2','Other']]);
 const html=multiFieldHtml('遊戲名稱','game',choices,['g1','g2'],true);assert.match(html,/&lt;game&gt;/);assert.match(html,/aria-expanded="true"/);assert.match(html,/\+1/);
 assert.match(multiOptionsHtml(choices,'',['g2']),/data-multi-value="g2" checked/);
});
test('assistant answers use selected records and link to actual entities',()=>{
 const scope=records.filter(r=>r.wrapperId==='PKG-A'),context={records,scope,organizations,games};
 const answer=answerQuestion('目前投注總額',context),t=totals(scope);assert.ok(answer.metrics.some(([k,v])=>k==='實扣投注'&&v===money(t.bet)+' USDT'));
 for(const [q,kind,value]of [['p1001','player','demo_1001'],['demo-f001','record','DEMO-F001'],['深海獵場','game','深海獵場'],['PKG-A','org','PKG-A']]){const r=answerQuestion(q,context);assert.equal(r.actions[0].kind,kind);assert.equal(r.actions[0].value,value);}
 const jp=answerQuestion('獎池概況',context);assert.equal(jp.metrics[0][1],String(scope.filter(r=>r.jackpotAward>0).length));
 const source=answerQuestion('P1001 上次登入 IP',context);assert.ok(source.metrics.some(([label,value])=>label==='上次登入 IP'&&value.startsWith('192.0.2.')));
 const today=answerQuestion('今天投注', {...context,now:new Date('2026-10-21T01:00:00Z')});assert.equal(today.metrics[0][1],'0');assert.match(today.text,/沒有/);
 assert.equal(answerQuestion('沒有定義的分析',context).actions.length,0);
});
test('player source metadata stays stable, complete and explicitly fictional',()=>{
 for(const name of new Set(records.map(r=>r.player))){const rs=records.filter(r=>r.player===name),p=playerSourceProfile(name,rs,organizations);assert.deepEqual(p,playerSourceProfile(name,rs,organizations));assert.match(p.registrationIp,/^203\.0\.113\./);assert.match(p.lastIp,/^192\.0\.2\./);assert.ok(p.registered<p.lastLogin);assert.ok(p.agent&&p.region&&p.isp&&p.lastDevice);assert.equal(playerId(name)[0],'P');}
});
