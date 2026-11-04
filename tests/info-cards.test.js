import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCardLayout,moveCard,placeCard} from '../info-cards.js';

const keys=['games','listed','sites','bet','player','operator'];
test('saved layout retains hidden metrics and reordering as fresh values arrive',()=>{
 const saved={order:['operator','bet','games','listed','sites','player'],visible:['operator','bet']};
 assert.deepEqual(normalizeCardLayout(saved,keys),saved);
 assert.deepEqual(normalizeCardLayout(saved,[...keys,'refund']),{order:[...saved.order,'refund'],visible:[...saved.visible,'refund']});
 assert.deepEqual(normalizeCardLayout(saved,keys.filter(k=>k!=='bet')),{order:saved.order.filter(k=>k!=='bet'),visible:['operator']});
});
test('empty visibility is intentional and can be restored to defaults',()=>{
 assert.deepEqual(normalizeCardLayout({order:keys,visible:[]},keys),{order:keys,visible:[]});
 assert.deepEqual(normalizeCardLayout(null,keys),{order:keys,visible:keys});
});
test('damaged and retired preference IDs never create cards or duplicate metrics',()=>{
 assert.deepEqual(normalizeCardLayout({order:['bet','bet','retired'],visible:['bet','retired','bet']},['games','bet']),{order:['bet','games'],visible:['bet','games']});
 for(const bad of [null,42,'bad',[],{order:42,visible:false}])assert.deepEqual(normalizeCardLayout(bad,keys),{order:keys,visible:keys});
});
test('keyboard and drag ordering preserve visibility and do not mutate the saved draft',()=>{
 const saved={order:keys,visible:['bet','player']},copy=structuredClone(saved);
 assert.deepEqual(moveCard(saved,'bet',-1).order,['games','listed','bet','sites','player','operator']);
 assert.deepEqual(moveCard(saved,'games',-1),saved);
 assert.deepEqual(moveCard(saved,'operator',1),saved);
 assert.deepEqual(placeCard(saved,'operator','games'),{order:['operator','games','listed','sites','bet','player'],visible:saved.visible});
 assert.deepEqual(placeCard(saved,'missing','games'),saved);
 assert.deepEqual(placeCard(saved,'games','operator',true).order,['listed','sites','bet','player','operator','games']);
 assert.deepEqual(saved,copy);
});
