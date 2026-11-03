import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameOperations,gameAccess,availabilityImpact,effectiveRtp,setGameAvailability,setGameMaintenance,setRtpOverride,setDefaultRtp,fromOperationsTime,versionUsage,gameReleases} from '../game-operations.js';
const data=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url))),sites=data.organizations.filter(o=>o.level==='現金網'),gameId=data.games[0].id,siteId=sites[0].id,now=new Date('2026-11-03T01:00:00Z');
const fresh=()=>createGameOperations(data.games,sites,null,now);
test('each game version group partitions deployed sites without duplicates or omissions',()=>{
 const state=fresh();for(const game of data.games){const usage=versionUsage(state,game.id,sites),ids=usage.groups.flatMap(v=>v.sites.map(s=>s.id));assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,usage.deployed.length);assert.equal(ids.length+usage.unassigned.length,sites.length);assert.ok(usage.groups.filter(v=>v.sites.length).length>1);for(const v of usage.groups)assert.equal(v.playable.length,v.sites.filter(s=>gameAccess(state,game.id,s.id).canPlay).length);}
 assert.deepEqual(gameReleases('1.1.0'),['1.1.0','1.0.2','1.0.1']);
});
test('global delisting preserves deployed versions but every version has zero playable sites',()=>{
 const state=fresh(),before=versionUsage(state,gameId,sites),off=setGameAvailability(state,gameId,false,'測試',now),after=versionUsage(off,gameId,sites);assert.deepEqual(after.deployed,before.deployed);assert.ok(after.groups.every(v=>v.playable.length===0));
});
test('version migration preserves valid site versions, delisting and RTP overrides',()=>{
 const state=setGameAvailability(fresh(),gameId,false,'測試',now),site=versionUsage(state,gameId,sites).deployed[0];state.games[gameId].sites[site.id].version=state.games[gameId].releases[2];const loaded=createGameOperations(data.games,sites,JSON.parse(JSON.stringify(state)),now);assert.equal(loaded.games[gameId].sites[site.id].version,state.games[gameId].releases[2]);assert.equal(loaded.games[gameId].listed,false);assert.deepEqual(loaded.games[gameId].overrides,state.games[gameId].overrides);
});
test('the global game switch blocks every site and overrides maintenance/site/RTP settings',()=>{
 const original=fresh(),off=setGameAvailability(original,gameId,false,'例行下架',now);
 assert.ok(sites.every(s=>!gameAccess(off,gameId,s.id).canPlay&&gameAccess(off,gameId,s.id).reason==='global-off'));
 const notMaintenance=setGameMaintenance(off,gameId,false,'結束維護',now);
 assert.ok(sites.every(s=>!gameAccess(notMaintenance,gameId,s.id).canPlay));
 assert.equal(original.games[gameId].listed,true);assert.equal(off.audit[0].after,false);assert.equal(off.audit[0].reason,'例行下架');
});
test('impact names and counts match actual access changes; relisting preserves site restrictions',()=>{
 const state=fresh(),impact=availabilityImpact(state,gameId,sites,false),before=sites.filter(s=>gameAccess(state,gameId,s.id).canPlay);
 assert.equal(impact.filter(i=>i.before.canPlay!==i.after.canPlay).length,before.length);assert.deepEqual(impact.map(i=>i.site.id),sites.map(s=>s.id));
 const on=setGameAvailability(setGameAvailability(state,gameId,false,'下架',now),gameId,true,'恢復',now);
 for(const site of sites)assert.deepEqual(gameAccess(on,gameId,site.id),gameAccess(state,gameId,site.id));
});
test('scheduled RTP begins at its start and restores the current game default exactly at its end',()=>{
 const config={mode:'scheduled',rtp:94,start:'2026-11-03T02:00:00Z',end:'2026-11-03T03:00:00Z'};
 let state=setRtpOverride(fresh(),gameId,siteId,config,'活動排程',now);
 assert.equal(effectiveRtp(state,gameId,siteId,now).status,'pending');
 assert.equal(effectiveRtp(state,gameId,siteId,new Date(config.start)).value,94);
 state=setDefaultRtp(state,gameId,97,'更新預設',now);
 const expired=effectiveRtp(state,gameId,siteId,new Date(config.end));assert.equal(expired.status,'expired');assert.equal(expired.value,97);
 assert.equal(state.games[gameId].overrides[siteId].rtp,94); // retain the historical schedule
});
test('per-site RTP is isolated, supports inheritance, and cannot reopen a globally delisted game',()=>{
 const initial=fresh(),state=setRtpOverride(initial,gameId,siteId,{mode:'permanent',rtp:94},'個別設定',now);
 assert.equal(effectiveRtp(state,gameId,siteId,now).value,94);
 assert.deepEqual(effectiveRtp(state,gameId,sites[1].id,now),effectiveRtp(initial,gameId,sites[1].id,now));
 const off=setGameAvailability(state,gameId,false,'下架',now);assert.equal(gameAccess(off,gameId,siteId).canPlay,false);
 const inherit=setRtpOverride(state,gameId,siteId,null,'恢復預設',now);assert.equal(effectiveRtp(inherit,gameId,siteId,now).value,initial.games[gameId].defaultRtp);
});
test('invalid/expired schedules, unsupported profiles and missing reasons cannot be saved',()=>{
 const state=fresh(),config={mode:'scheduled',rtp:95,start:'2026-11-03T04:00:00Z',end:'2026-11-03T03:00:00Z'};
 assert.throws(()=>setRtpOverride(state,gameId,siteId,config,'測試',now));
 assert.throws(()=>setRtpOverride(state,gameId,siteId,{...config,start:'2026-11-02T02:00:00Z',end:'2026-11-02T03:00:00Z'},'測試',now));
 assert.throws(()=>setRtpOverride(state,gameId,siteId,{mode:'permanent',rtp:200},'測試',now));
 assert.throws(()=>setGameAvailability(state,gameId,false,' ',now));assert.equal(state.revision,0);
});
test('saved game settings survive reload and schedule times use UTC+8 independently of the clock',()=>{
 const state=setGameAvailability(fresh(),gameId,false,'測試',now),loaded=createGameOperations(data.games,sites,JSON.parse(JSON.stringify(state)),now);
 assert.equal(loaded.games[gameId].listed,false);assert.equal(loaded.audit[0].reason,'測試');
 assert.equal(fromOperationsTime('2026-11-03T09:00'),'2026-11-03T01:00:00.000Z');
 assert.equal(fromOperationsTime('2026-02-30T09:00'),null);assert.equal(fromOperationsTime('not-a-date'),null);
});
