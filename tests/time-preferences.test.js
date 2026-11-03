import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTimeZone,clockSnapshot,timeZoneChoices} from '../time-preferences.js';
test('clock formats the configured zone with date, seconds and UTC offset',()=>{
 const s=clockSnapshot('Asia/Taipei',new Date('2026-11-03T01:30:10Z'));
 assert.equal(s.date,'2026/11/03');assert.equal(s.time,'09:30:10');assert.equal(s.offset,'UTC+08:00');
 assert.equal(clockSnapshot('America/Los_Angeles',new Date('2026-11-03T01:30:10Z')).date,'2026/11/02');
});
test('clock follows daylight saving and fractional-hour zones',()=>{
 assert.equal(clockSnapshot('America/New_York',new Date('2026-07-03T12:00:00Z')).offset,'UTC-04:00');
 assert.equal(clockSnapshot('America/New_York',new Date('2026-11-03T12:00:00Z')).offset,'UTC-05:00');
 assert.equal(clockSnapshot('Asia/Kathmandu',new Date('2026-11-03T00:00:00Z')).time,'05:45:00');
});
test('invalid saved preferences fall back safely and city search finds supported zones',()=>{
 assert.equal(normalizeTimeZone('bad-zone'),'Asia/Taipei');assert.equal(normalizeTimeZone(null),'Asia/Taipei');
 assert.equal(normalizeTimeZone('auto'),'auto');assert.ok(clockSnapshot('auto').timeZone);
 assert.ok(timeZoneChoices('Tokyo').some(z=>z.value==='Asia/Tokyo'));
 assert.ok(timeZoneChoices('胡志明').length);assert.ok(timeZoneChoices('this-zone-does-not-exist').length===0);
});
