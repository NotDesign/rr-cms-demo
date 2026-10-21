// Original 24px line icons. Decorative icons always accompany a readable label.
export const paths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 reports:'<path d="M4 4v16h17M8 15l4-5 4 3 5-7"/>',
 promotion:'<path d="M3 10v5l10 3V7L3 10Zm10-3 6-3v17l-6-3M6 16l1 5h4l-1-4M22 9v6"/>',
 jackpot:'<path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm4 9v5m-4 4h8m-9 0 1-4h8l1 4M8 5H3v2a5 5 0 0 0 6 5m7-7h5v2a5 5 0 0 1-6 5"/>',
 games:'<path d="M7 7h10c3 0 4 3 5 9 .5 3-2 4-4 2l-2-2H8l-2 2c-2 2-4.5 1-4-2 1-6 2-9 5-9Zm1 3v5m-2.5-2.5h5M16 11h.01M19 14h.01"/>',
 channels:'<rect x="3" y="3" width="6" height="6" rx="2"/><rect x="15" y="15" width="6" height="6" rx="2"/><rect x="15" y="3" width="6" height="6" rx="2"/><path d="M9 6h6M6 9v6c0 2 2 3 4 3h5"/>',
 players:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-18a4 4 0 0 1 0 8m5 10v-3a7 7 0 0 0-4-6"/>',
 wallet:'<rect x="3" y="5" width="19" height="15" rx="3"/><path d="M17 11h5v5h-5a2.5 2.5 0 0 1 0-5ZM4 5l12-3v3"/><circle cx="18" cy="13.5" r=".5"/>',
 settings:'<path d="m10 3 .5-1h3l.5 1 1 2 2 .5 2-1 2 3-1.5 2v3l1.5 2-2 3-2-1-2 .5-1 2-.5 1h-3l-.5-1-1-2-2-.5-2 1-2-3 1.5-2v-3L3 7.5l2-3 2 1L9 5l1-2Z"/><circle cx="12" cy="11" r="3"/>',
 receipt:'<path d="M6 3h12v19l-3-2-3 2-3-2-3 2V3Zm3 4h6m-6 4h6m-6 4h4"/>',
 coins:'<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 4 12 4 12 0V6M3 11v5c0 4 12 4 12 0v-5m3-3c4 0 4 5 0 5m0 0c4 0 4 5 0 5"/>',
 payout:'<path d="M3 7h18v13H3V7Zm4 0V3h10v4m-5 4v6m-3-3 3 3 3-3"/>',
 profit:'<path d="M3 18 9 12l4 3L21 5m-6 0h6v6"/>',
 loss:'<path d="m3 6 6 6 4-3 8 10m-6 0h6v-6"/>',
 activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h.01m4 0h.01m4 0h.01"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
 id:'<rect x="2" y="5" width="20" height="15" rx="3"/><circle cx="8" cy="11" r="2"/><path d="M5 17c0-4 6-4 6 0m3-7h5m-5 5h4"/>',
 fish:'<path d="M3 12c6-8 12-8 17 0-5 8-11 8-17 0Zm0 0L1 7v10l2-5Z"/><circle cx="15" cy="10" r=".5"/>',
 cards:'<path d="m4 6 9-3 6 15-9 3L4 6Zm2-1L3 4 1 20l7 1m4-12 4 3-2 4-4-3 2-4Z"/>',
 slot:'<rect x="2" y="5" width="17" height="15" rx="3"/><path d="M5 9h3l-2 6m4-6h3l-2 6m4-6h2l-1 6m3-7 3-2v10M5 2h10"/>',
 percent:'<path d="m5 19 14-14"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/>'
};
export function uiIcon(name,cls=''){return '<svg class="ui-icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.receipt)+'</svg>';}
export function metricIcon(label){return /總虧損/.test(label)?'loss':/總盈利|盈虧|差額/.test(label)?'profit':/獎池/.test(label)?'jackpot':/派彩|獎金/.test(label)?'payout':/投注|成本|面額|費率|金額|餘額/.test(label)?'coins':/玩家|帳號/.test(label)?'players':/遊戲/.test(label)?'games':/時間|日期/.test(label)?'clock':/ID|單號/.test(label)?'id':/倍|率/.test(label)?'percent':/核對|結算|狀態/.test(label)?'shield':/射擊|子彈|擊殺/.test(label)?'target':'receipt';}
