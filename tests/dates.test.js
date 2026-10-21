import {test} from 'node:test';
import assert from 'node:assert/strict';
import {datePresetRange} from '../core.js';
import {dateRangeLabel} from '../date-picker.js';

test('date shortcuts use the UTC+8 report day across the UTC midnight boundary',()=>{
 const now=new Date('2026-10-19T16:30:00Z');
 assert.deepEqual(datePresetRange('today',now),{start:'2026-10-20',end:'2026-10-20'});
 assert.deepEqual(datePresetRange('yesterday',now),{start:'2026-10-19',end:'2026-10-19'});
 assert.deepEqual(datePresetRange('week',now),{start:'2026-10-14',end:'2026-10-20'});
 assert.deepEqual(datePresetRange('month',now),{start:'2026-09-21',end:'2026-10-20'});
 assert.deepEqual(datePresetRange('last-month',now),{start:'2026-09-01',end:'2026-09-30'});
});

test('previous calendar month handles leap February and year rollover',()=>{
 assert.deepEqual(datePresetRange('last-month',new Date('2024-03-30T18:00:00Z')),{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(datePresetRange('last-month',new Date('2027-01-31T00:00:00Z')),{start:'2026-12-01',end:'2026-12-31'});
 assert.deepEqual(datePresetRange('week',new Date('2027-01-01T00:00:00Z')),{start:'2026-12-26',end:'2027-01-01'});
 assert.deepEqual(datePresetRange('demo'),{start:'2026-10-15',end:'2026-10-15'});
});

test('compact date captions keep same-day, cross-month and cross-year ranges unambiguous',()=>{
 assert.deepEqual(dateRangeLabel('2026-10-15','2026-10-15'),{full:'2026/10/15',compact:'2026/10/15',years:''});
 assert.deepEqual(dateRangeLabel('2026-09-21','2026-10-20'),{full:'2026/09/21 — 2026/10/20',compact:'09/21 — 10/20',years:'2026'});
 assert.deepEqual(dateRangeLabel('2026-12-30','2027-01-02'),{full:'2026/12/30 — 2027/01/02',compact:'12/30 — 01/02',years:'2026–2027'});
});
