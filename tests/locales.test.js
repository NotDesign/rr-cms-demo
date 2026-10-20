import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDictionary} from '../i18n.js';
const dictionary=parseDictionary(readFileSync(new URL('../data/locales.tsv',import.meta.url),'utf8'));
const data=JSON.parse(readFileSync(new URL('../data/demo-data.json',import.meta.url)));
test('VN and Thai cover every report title, column and shared filter label',()=>{
  const labels=[...data.reports.flatMap(d=>[d.title,...d.headers]),...data.games.map(g=>g.name),...data.organizations.filter(o=>o.level!=='遊戲商').map(o=>o.name),'包網商','全部包網商','全部遊戲','即時篩選','闖關加碼','日期區間','商戶／站點','玩法','投注單號／玩家','幣別','重設','觸發事件','結束原因','難度','最高倍率','結算／對帳'];
  for(const label of labels)for(const locale of ['vi','th']){
    assert.ok(dictionary[label]?.[locale],locale+': '+label);
    assert.ok(!/[\u3400-\u9fff]/.test(dictionary[label][locale]),label);
  }
  for(const locale of ['vi','th'])assert.equal(new Set(['實扣投注','結算派彩','玩家淨盈虧'].map(k=>dictionary[k][locale])).size,3);
});
