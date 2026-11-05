import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGameOperations,gameAccess} from '../game-operations.js';
import {hydrateConfiguration} from '../cms-configuration.js';
import {applyAvailability,scheduleAvailability,advanceAvailability,cancelAvailability} from '../availability-schedules.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/demo-data.json',import.meta.url))),sites=data.organizations.filter(s=>s.level==='現金網'),now=new Date('2026-11-05T00:00:00Z');
const fresh=()=>hydrateConfiguration(data,createGameOperations(data.games,sites,null,now));
test('bulk availability is scoped, validates before mutation and enqueues CMS synchronization',()=>{
 const state=fresh(),gameIds=data.games.slice(0,3).map(g=>g.id),siteIds=[sites[0].id];
 const next=applyAvailability(data,state,{gameIds,siteIds,listed:false,reason:'批次單站下架'},now);
 for(const id of gameIds){assert.equal(next.games[id].sites[siteIds[0]].enabled,false);assert.deepEqual(next.games[id].sites[sites[1].id],state.games[id].sites[sites[1].id]);assert.equal(next.games[id].listed,state.games[id].listed);}
 assert.ok(next.configuration.batches.length>state.configuration.batches.length);
 assert.throws(()=>applyAvailability(data,state,{gameIds:[...gameIds,'BAD'],listed:false,reason:'測試'}));assert.equal(state.revision,0);
});
test('scheduled bulk changes execute chronologically once, restore after expiry and survive reload',()=>{
 const state=fresh(),gameIds=data.games.slice(0,2).map(g=>g.id),plan={gameIds,listed:false,reason:'定期維護',start:'2026-11-05T01:00:00Z',end:'2026-11-05T02:00:00Z'};
 const scheduled=scheduleAvailability(state,plan,now);assert.equal(scheduled.games[gameIds[0]].listed,true);assert.equal(advanceAvailability(data,scheduled,now),scheduled);
 const loaded=hydrateConfiguration(data,createGameOperations(data.games,sites,JSON.parse(JSON.stringify(scheduled)),now),scheduled.configuration);
 assert.equal(loaded.availabilitySchedules[0].id,'AS-1');
 const active=advanceAvailability(data,loaded,new Date('2026-11-05T01:30:00Z'));assert.equal(active.games[gameIds[0]].listed,false);assert.equal(active.availabilitySchedules[0].status,'active');
 assert.equal(advanceAvailability(data,active,new Date('2026-11-05T01:30:00Z')),active);
 const expired=advanceAvailability(data,active,new Date('2026-11-05T03:00:00Z'));assert.equal(expired.games[gameIds[0]].listed,true);assert.equal(expired.availabilitySchedules[0].status,'completed');
 const closedThenReopened=advanceAvailability(data,scheduled,new Date('2026-11-05T03:00:00Z'));assert.equal(closedThenReopened.games[gameIds[0]].listed,true);assert.equal(closedThenReopened.availabilitySchedules[0].status,'completed');
 assert.throws(()=>scheduleAvailability(scheduled,plan,now),/重疊/);assert.throws(()=>scheduleAvailability(state,{...plan,end:'2026-11-05T00:30:00Z'},now));
 const cancelled=cancelAvailability(scheduled,'AS-1',now);assert.equal(advanceAvailability(data,cancelled,new Date('2026-11-05T03:00:00Z')),cancelled);
});
test('scheduled single-site enable never bypasses a global delisting',()=>{
 const gameId=data.games[0].id,siteId=sites[0].id,off=applyAvailability(data,fresh(),{gameIds:[gameId],listed:false,reason:'全域停止'},now);
 const planned=scheduleAvailability(off,{gameIds:[gameId],siteIds:[siteId],listed:true,reason:'單站上架',start:'2026-11-05T01:00:00Z'},now),applied=advanceAvailability(data,planned,new Date('2026-11-05T02:00:00Z'));
 assert.equal(applied.games[gameId].sites[siteId].enabled,true);assert.equal(gameAccess(applied,gameId,siteId).reason,'global-off');
});
