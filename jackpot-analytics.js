export const JACKPOT_SECTIONS=[['pools','累積獎池列表'],['rules','累積獎池規則'],['games','參與遊戲'],['wins','中獎紀錄'],['reports','累積獎池報表']];
export const cents=value=>Math.round(Number(value||0)*100);
export function poolSummary(pool,records){
 const entries=records.filter(r=>r.jackpot?.poolId===pool.id),wins=entries.filter(r=>cents(r.jackpot.award)>0);
 const contribution=entries.reduce((n,r)=>n+cents(r.jackpot.contribution),0),award=wins.reduce((n,r)=>n+cents(r.jackpot.award),0),opening=cents(pool.opening),closing=cents(pool.closing);
 return {...pool,entries,wins,contribution:contribution/100,award:award/100,expectedClosing:(opening+contribution-award)/100,difference:(closing-opening-contribution+award)/100,players:new Set(entries.map(r=>r.player_id||r.player)).size,sites:new Set(entries.map(r=>r.cashId)).size,triggers:[...new Set(wins.map(r=>r.jackpot.trigger))]};
}
export function jackpotOverview(data,{poolId='',type='',query=''}={}){
 const q=query.trim().toLowerCase(),games=new Map(data.games.map(g=>[g.name,g]));
 const pools=data.jackpotPools.filter(p=>(!poolId||p.id===poolId)&&(!type||games.get(p.game)?.type===type)&&(!q||(p.name+' '+p.id+' '+p.game).toLowerCase().includes(q))).map(p=>poolSummary(p,data.records));
 const wins=pools.flatMap(p=>p.wins).sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time)||b.id.localeCompare(a.id));
 return {pools,wins,balance:pools.reduce((n,p)=>n+cents(p.closing),0)/100,opening:pools.reduce((n,p)=>n+cents(p.opening),0)/100,contribution:pools.reduce((n,p)=>n+cents(p.contribution),0)/100,award:pools.reduce((n,p)=>n+cents(p.award),0)/100};
}
export function jackpotHours(records){
 const hours=Array.from({length:24},(_,hour)=>({hour,contribution:0,award:0,wins:0}));
 for(const row of records){if(!row.jackpot)continue;const slot=hours[Number(row.time.slice(0,2))];if(!slot)continue;slot.contribution+=cents(row.jackpot.contribution);slot.award+=cents(row.jackpot.award);if(cents(row.jackpot.award)>0)slot.wins++;}
 return hours.map(h=>({...h,contribution:h.contribution/100,award:h.award/100}));
}
export function filterJackpotWins(data,{poolId='',type='',query=''}={}){
 const q=query.trim().toLowerCase();return data.records.filter(r=>cents(r.jackpot?.award)>0&&(!poolId||r.jackpot.poolId===poolId)&&(!type||r.kind===type)&&(!q||[r.id,r.player,r.player_id,r.site,r.game,r.jackpot.poolName,r.jackpot.triggerId,r.jackpot.transactionId].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time)||b.id.localeCompare(a.id));
}
