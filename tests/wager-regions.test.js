import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {organizationRecords} from '../core.js';
import {wagerMetrics, wagerRegions} from '../game-wagers.js';
import {withDemoOrganizationHierarchy} from '../organization-hierarchy.js';
import {createPlayerCatalog} from '../player-management.js';
import {createGameOperations, GAME_SECTIONS} from '../game-operations.js';
import {hydrateConfiguration} from '../cms-configuration.js';
import {managementPage, gameAccessView} from '../game-management-view.js';
import {jackpotPage} from '../jackpot-view.js';

const source = JSON.parse(readFileSync(new URL('../data/demo-data.json', import.meta.url)));
const data = withDemoOrganizationHierarchy(source);

test('regional wagers deduplicate site accounts and exclude free plays from the average', () => {
  const records = [
    {cashId: 'A', siteRegion: '台灣', player_id: 'P1', bet: 0},
    {cashId: 'A', siteRegion: '台灣', player_id: 'P1', bet: 10},
    {cashId: 'B', player_id: 'P1', bet: 30},
    {cashId: 'C', player_id: 'P1', bet: 0}
  ];
  const sites = [{id: 'A', name: '越南站', level: '現金網'}, {id: 'B', name: '泰國站', level: '現金網'}];
  assert.deepEqual(wagerMetrics(records), {players: 3, paid: 2, total: 40, average: 20});
  assert.deepEqual(wagerRegions(records, sites).map(r => [r.region, r.players, r.average]), [
    ['泰國', 1, 30], ['台灣', 1, 10], ['未標示地區', 1, null]
  ]);
  const regions = wagerRegions(data.records, data.organizations);
  assert.equal(regions.reduce((total, region) => total + region.total, 0), 291350);
});

test('new hierarchy preserves bet totals and resolves players through both agent levels', () => {
  const p = createPlayerCatalog(data).find(p => p.id === 'P1001');
  assert.deepEqual(p.chain.map(o => o.level), ['遊戲商', '遊戲集成商', '包網商', '現金網', '第一層代理', '第二層代理']);
  const agentRecords = organizationRecords(data.records, data.organizations, p.chain.at(-1).id);
  assert.ok(p.records.every(r => agentRecords.includes(r)));
  assert.ok(agentRecords.every(r => r.cashId === p.siteId));
  assert.equal(organizationRecords(data.records, data.organizations, p.chain[1].id).length, source.records.length);
  assert.equal(wagerMetrics(data.records).total, wagerMetrics(source.records).total);
});

test('game and jackpot management show wager totals with matching table cells', () => {
  const sites = data.organizations.filter(o => o.level === '現金網');
  const state = hydrateConfiguration(data, createGameOperations(data.games, sites));
  const pages = [
    ...GAME_SECTIONS.filter(([key]) => key !== 'rules').map(([key]) => managementPage(data, state, key)),
    ...['pools', 'rules', 'games', 'wins', 'reports'].map(key => jackpotPage(data, state, key)),
    gameAccessView(data, state, data.games[0].id)
  ];
  for (const html of pages) {
    assert.match(html, /class="wager-overview"/);
    for (const [, head, body] of html.matchAll(/<table class="mg-table"><thead>(.*?)<\/thead><tbody>(.*?)<\/tbody>/gs)) {
      const columns = (head.match(/<th\b/g) || []).length;
      for (const [, row] of body.matchAll(/<tr>(.*?)<\/tr>/gs)) {
        assert.equal((row.match(/<td\b/g) || []).length, columns);
      }
    }
  }
  assert.match(managementPage(data, state, 'catalog', {query: 'EG-01'}), /21,550\.00 USDT/);
});
