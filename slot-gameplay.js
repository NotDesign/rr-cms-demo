export const SLOT_GAMEPLAYS=[
  ['classic','經典轉軸'],['paylines','連線賠付'],['ways','全路線'],
  ['cascade','連鎖消除'],['megaways','Megaways']
];
export function hasSlotScope(filters,games,key='all') {
  const types=Array.isArray(filters.type)?filters.type:[filters.type];
  const selected=Array.isArray(filters.game)?filters.game:[filters.game];
  const chosen=games.filter(game=>selected.includes(game.name));
  return key==='slots'||types.includes('老虎機')||
    Boolean(chosen.length&&chosen.every(game=>game.type==='老虎機'));
}
