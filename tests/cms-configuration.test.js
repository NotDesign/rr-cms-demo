import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameOperations,gameAccess,effectiveRtp,setRtpOverride,setGameAvailability} from '../game-operations.js';
import {hydrateConfiguration,defaultRuleSettings,validateRule,saveRuleDraft,publishRule,assignedRule,advanceSync,retrySync,queueLegacyChange,deployedRtp,rulePreviewContext,jackpotTrial,jackpotEligibility} from '../cms-configuration.js';
const data=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url))),sites=data.organizations.filter(o=>o.level==='現金網'),game=data.games.find(g=>g.hasJackpot),fishing=data.games.find(g=>g.type==='捕魚'),at=new Date('2026-11-03T01:00:00Z');
const fresh=()=>hydrateConfiguration(data,createGameOperations(data.games,sites,null,at));
const settings=(state,kind='jackpot',gameId=game.id)=>defaultRuleSettings(data,state,gameId,kind);
const make=(state,kind='jackpot',values={},gameId=game.id,id=null)=>saveRuleDraft(data,state,{id,gameId,kind,name:'QA 測試規則',settings:{...settings(state,kind,gameId),...values}},at);
const targets=n=>sites.slice(0,n).map(s=>({siteId:s.id,rate:null,contribute:true,canWin:true}));
const sync=(state,id=state.configuration.batches[0].id,failure=false)=>advanceSync(advanceSync(state,id,'start',at),id,'finish',at,failure);
const input=(state,extra={})=>({siteId:(sites.find(s=>gameAccess(state,game.id,s.id).canPlay)||sites[0]).id,bet:100,balance:1000,refund:0,eventCount:3,elapsed:3600,gameAward:100,eventMatched:true,...extra});
const trial=(state,values={},binding={},extra={})=>jackpotTrial(data,state,game.id,{...settings(state),...values},{rate:null,contribute:true,canWin:true,...binding},input(state,extra));

test('configuration migration seeds independent game and jackpot rules and preserves legacy schedules',()=>{
 const old=createGameOperations(data.games,sites,null,at),state=hydrateConfiguration(data,old);
 assert.equal(Object.keys(state.configuration.rules).length,data.games.length+data.games.filter(g=>g.hasJackpot).length);
 assert.deepEqual(state.games,old.games);assert.equal(state.configuration.batches.length,0);
 for(const g of data.games)for(const s of sites){assert.equal(assignedRule(state,g.id,s.id,'game').snapshot.settings.rtp,null);assert.equal(deployedRtp(state,g.id,s.id,at),effectiveRtp(state,g.id,s.id,at).value);}
 assert.deepEqual(hydrateConfiguration(data,state,JSON.parse(JSON.stringify(state.configuration))),state);
});
test('saving and editing a draft never mutates published snapshots, site bindings or deployed settings',()=>{
 const start=fresh(),id='CMS-JACKPOT-'+game.id,original=JSON.stringify(start.configuration),oldVersion=start.configuration.rules[id].versions[0];
 const {state}=make(start,'jackpot',{rate:3},game.id,id);
 assert.equal(JSON.stringify(start.configuration),original);assert.deepEqual(state.configuration.rules[id].versions[0],oldVersion);
 assert.deepEqual(state.configuration.bindings,start.configuration.bindings);assert.deepEqual(state.configuration.applied,start.configuration.applied);assert.equal(state.configuration.batches.length,0);assert.equal(state.revision,start.revision+1);
});
test('new rules coexist; publishing changes selected sites only and retains immutable older versions',()=>{
 const initial=fresh(),a=make(initial),published=publishRule(data,a.state,a.id,targets(2),'首批套用',at),v1=published.configuration.rules[a.id].versions[0],edited=make(published,'jackpot',{rate:4},game.id,a.id),v2=publishRule(data,edited.state,a.id,targets(1),'單站更新',at);
 assert.equal(v2.configuration.rules[a.id].versions.length,2);assert.deepEqual(v2.configuration.rules[a.id].versions[0],v1);
 assert.equal(assignedRule(v2,game.id,sites[0].id,'jackpot').binding.version,2);assert.equal(assignedRule(v2,game.id,sites[1].id,'jackpot').binding.version,1);
 assert.deepEqual(v2.configuration.bindings[game.id][sites[2].id],initial.configuration.bindings[game.id][sites[2].id]);assert.deepEqual(v2.configuration.applied,initial.configuration.applied);
 const clone=make(v2);assert.notEqual(clone.id,a.id);assert.equal(clone.state.configuration.rules[clone.id].versions.length,0);
});
test('publishing validates target identity, uniqueness, reason and per-site contribution rates',()=>{
 const {state,id}=make(fresh());for(const a of [[],[...targets(1),...targets(1)],[{siteId:'missing',rate:null}],[{...targets(1)[0],rate:101}]])assert.throws(()=>publishRule(data,state,id,a,'測試',at));
 assert.throws(()=>publishRule(data,state,id,targets(1),' ',at));assert.throws(()=>publishRule(data,state,id,targets(1),'x',at));
 const next=publishRule(data,state,id,[{...targets(1)[0],rate:0,contribute:false,canWin:true}],'資格例外',at),b=assignedRule(next,game.id,sites[0].id,'jackpot').binding;assert.equal(b.rate,0);assert.equal(b.contribute,false);assert.equal(b.canWin,true);
});
test('demo synchronization separates CMS desired settings from site application and retries only failures',()=>{
 const draft=make(fresh(),'jackpot',{rate:3}),queued=publishRule(data,draft.state,draft.id,targets(4),'四站同步',at),id=queued.configuration.batches[0].id;
 assert.equal(queued.configuration.batches[0].transport,'demo');assert.notEqual(assignedRule(queued,game.id,sites[0].id,'jackpot','applied').binding.ruleId,draft.id);
 const done=sync(queued,id,true),batch=done.configuration.batches[0];assert.deepEqual(batch.targets.map(t=>t.status),['success','failed','success','success']);assert.equal(done.revision,queued.revision);assert.equal(assignedRule(done,game.id,sites[0].id,'jackpot','applied').binding.ruleId,draft.id);
 const retried=sync(retrySync(done,id),id,true);assert.ok(retried.configuration.batches[0].targets.every(t=>t.status==='success'));assert.deepEqual(retried.configuration.batches[0].targets.map(t=>t.attempts),[1,2,1,1]);
});
test('a superseded sync batch cannot overwrite newer settings on the same site or block other targets',()=>{
 const d=make(fresh()),old=publishRule(data,d.state,d.id,targets(2),'舊版',at),oldId=old.configuration.batches[0].id,started=advanceSync(old,oldId,'start',at),edit=make(started,'jackpot',{rate:4},game.id,d.id),newer=publishRule(data,edit.state,d.id,targets(1),'新版',at),newId=newer.configuration.batches[0].id;
 const result=sync(sync(newer,newId),oldId);assert.equal(assignedRule(result,game.id,sites[0].id,'jackpot','applied').binding.version,2);assert.equal(assignedRule(result,game.id,sites[1].id,'jackpot','applied').binding.version,1);assert.equal(result.configuration.batches.find(b=>b.id===oldId).targets[0].status,'superseded');
});
test('RTP overrides retain priority and scheduled expiry returns to the assigned rule baseline',()=>{
 let state=setRtpOverride(fresh(),game.id,sites[0].id,{mode:'scheduled',rtp:94,start:'2026-11-03T02:00:00Z',end:'2026-11-03T03:00:00Z'},'短期活動',at);state=queueLegacyChange(data,state,{kind:'rtp',gameId:game.id,siteId:sites[0].id},'短期活動',at);state=sync(state);
 const d=make(state,'game',{rtp:98}),queued=publishRule(data,d.state,d.id,targets(1),'新規則',at),applied=sync(queued);
 assert.equal(effectiveRtp(queued,game.id,sites[0].id,at).value,98);assert.notEqual(deployedRtp(queued,game.id,sites[0].id,at),98);
 for(const time of ['2026-11-03T02:00:00Z','2026-11-03T02:59:59Z']){assert.equal(effectiveRtp(applied,game.id,sites[0].id,new Date(time)).value,94);assert.equal(deployedRtp(applied,game.id,sites[0].id,new Date(time)),94);}
 assert.equal(deployedRtp(applied,game.id,sites[0].id,new Date('2026-11-03T03:00:00Z')),98);
});
test('legacy master switches queue every cash site and block play before any site acknowledges',()=>{
 const initial=fresh(),off=queueLegacyChange(data,setGameAvailability(initial,game.id,false,'全域下架',at),{kind:'availability',gameId:game.id},'全域下架',at);assert.equal(off.configuration.batches[0].targets.length,sites.length);assert.ok(sites.every(s=>!gameAccess(off,game.id,s.id).canPlay));assert.equal(off.configuration.applied[game.id][sites[0].id].control.snapshot.listed,true);assert.equal(trial(off).award,0);
});
test('invalid settings are rejected including types, limits, trigger thresholds and exactly five fishing levels',()=>{
 const state=fresh(),base=settings(state);for(const changes of [{rate:-1},{rate:101},{rate:'3'},{enabled:'yes'},{minPool:-1},{triggerType:'poolThreshold',minPool:0},{triggerType:'stakeThreshold',minBet:0},{payoutMode:'poolPercent',payoutValue:101},{retain:-1},{eventCount:1.5}])assert.ok(validateRule(data,game.id,'jackpot','規則',{...base,...changes}).length);
 assert.ok(validateRule(data,game.id,'jackpot','規則',null).length);
 const fish=settings(state,'game',fishing.id);assert.equal(validateRule(data,fishing.id,'game','規則',fish).length,0);for(const bullets of [[1,2,3,4],[1,2,2,4,5],[1,2,3,4,0]])assert.ok(validateRule(data,fishing.id,'game','規則',{...fish,params:{...fish.params,bullets}}).length);
 assert.ok(validateRule(data,game.id,'game','規則',{...settings(state,'game'),minBet:100,maxBet:50}).length);
});
test('contributions round per bet to cents, deduct refunds only for valid basis, and honor site overrides/caps',()=>{
 const s=fresh();assert.equal(trial(s,{}, {},{bet:.25,eventMatched:false}).contribution,.01);assert.equal(trial(s,{basis:'valid'},{rate:3},{bet:100,refund:40,eventMatched:false}).contribution,1.8);assert.equal(trial(s,{cap:1},{rate:3},{eventMatched:false}).contribution,1);assert.equal(trial(s,{},{contribute:false},{eventMatched:false}).contribution,0);
});
test('payout algorithms use game amounts, fixed amount, accumulated pool percentage or bet multiplier',()=>{
 const s=fresh();assert.equal(trial(s).award,100);assert.equal(trial(s,{payoutMode:'fixed',payoutValue:50}).award,50);assert.equal(trial(s,{payoutMode:'poolPercent',payoutValue:10}).award,100.2);assert.equal(trial(s,{payoutMode:'betMultiplier',payoutValue:2.5}).award,250);
});
test('payout cap, retained balance and insufficient balance policy never overdraw the pool',()=>{
 const s=fresh();assert.equal(trial(s,{payoutMode:'fixed',payoutValue:10000,maxAward:30}).award,30);const result=trial(s,{payoutMode:'fixed',payoutValue:10000,retain:100});assert.equal(result.award,902);assert.equal(result.after,100);assert.equal(trial(s,{payoutMode:'fixed',payoutValue:10000,retain:100,insufficient:'skip'}).award,0);
});
test('all eligibility gates apply while contribution and win eligibility remain independent',()=>{
 const s=fresh();for(const [values,binding,extra] of [[{enabled:false},{},{}],[{allowFreeRounds:false},{},{bet:0}],[{minBet:200},{},{}],[{minPool:2000},{},{}],[{cooldown:4000},{},{}],[{}, {canWin:false},{}],[{},{},{eventMatched:false}],[{eventCount:4},{},{}]])assert.equal(trial(s,values,binding,extra).award,0);
 assert.equal(trial(s,{}, {rate:0,contribute:false,canWin:true}).award,100);assert.equal(trial(s,{triggerType:'stakeThreshold',minBet:100},{},{eventMatched:false}).award,100);assert.equal(trial(s,{triggerType:'poolThreshold',minPool:1000},{},{eventMatched:false}).award,100);
});
test('duplicate events do not contribute or pay twice and existing historical ledgers remain untouched',()=>{
 const before=JSON.stringify(data),s=fresh(),result=trial(s,{},{},{duplicate:true});assert.deepEqual([result.contribution,result.award,result.after],[0,0,1000]);assert.equal(JSON.stringify(data),before);assert.equal(JSON.stringify(fresh().configuration),JSON.stringify(s.configuration));
});
test('site jackpot counts follow published eligibility but not unpublished drafts',()=>{
 const s=fresh(),site=sites.find(v=>jackpotEligibility(s,game.id,v.id).participates),d=make(s,'jackpot',{enabled:false}),target=[{siteId:site.id,rate:null,contribute:true,canWin:true}];assert.equal(jackpotEligibility(d.state,game.id,site.id).participates,true);assert.equal(jackpotEligibility(publishRule(data,d.state,d.id,target,'停用規則',at),game.id,site.id).participates,false);
});

test('decimal game-rule RTP survives publishing, sync and configuration hydration',()=>{
 const original=fresh(),draft=make(original,'game',{rtp:96.25}),published=publishRule(data,draft.state,draft.id,targets(1),'小數 RTP',at),synced=sync(published),loaded=hydrateConfiguration(data,synced,JSON.parse(JSON.stringify(synced.configuration)));
 assert.equal(assignedRule(loaded,game.id,sites[0].id,'game').snapshot.settings.rtp,96.25);assert.equal(assignedRule(loaded,game.id,sites[0].id,'game','applied').snapshot.settings.rtp,96.25);
 assert.ok(validateRule(data,game.id,'game','測試',{...settings(original,'game'),rtp:96.255}).length);
});
test('integrated rule preview reuses one mock transaction, updates with the draft, and writes nothing',()=>{
 const state=fresh(),rule=settings(state),before=JSON.stringify(state),preview=rulePreviewContext(data,state,game.id,'jackpot',rule),source=data.records.find(r=>r.id===preview.sourceId);
 assert.ok(source);assert.equal(preview.input.bet,source.bet);assert.equal(preview.input.refund,source.refund);assert.equal(preview.input.eventCount,source.event_count);assert.equal(preview.input.balance,rule.funding.seedAmount);
 const changed={...rule,rate:5,funding:{...rule.funding,seedAmount:54321}},same=rulePreviewContext(data,state,game.id,'jackpot',changed,preview.siteId);assert.equal(same.sourceId,preview.sourceId);assert.equal(same.input.balance,54321);
 const a=jackpotTrial(data,state,game.id,rule,{rate:null,contribute:true,canWin:true},preview.input),b=jackpotTrial(data,state,game.id,changed,{rate:null,contribute:true,canWin:true},same.input);assert.notEqual(a.contribution,b.contribution);assert.equal(JSON.stringify(state),before);
 const empty=rulePreviewContext({...data,records:[]},state,game.id,'jackpot',changed,preview.siteId);assert.equal(empty.sourceId,null);assert.equal(empty.input.bet,100);assert.equal(empty.input.balance,54321);
});
