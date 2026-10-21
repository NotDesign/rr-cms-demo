// Calculated from selected wager records, never invented telemetry.
const dayMs=86400000;
export function playerProfitLoss(records){
 const profit=records.reduce((n,r)=>n+Math.max(0,r.net),0),loss=records.reduce((n,r)=>n+Math.min(0,r.net),0);
 return {profit,loss,net:profit+loss};
}
export function statisticsModel(records,{start,end}){
 const span=Math.round((Date.parse(end)-Date.parse(start))/dayMs)+1;
 const granularity=span===1?'hour':span<=62?'day':'month',buckets=[];
 if(granularity==='hour')for(let h=0;h<24;h++)buckets.push({key:String(h).padStart(2,'0'),label:String(h).padStart(2,'0')+':00'});
 else if(granularity==='day')for(let time=Date.parse(start);time<=Date.parse(end);time+=dayMs){const key=new Date(time).toISOString().slice(0,10);buckets.push({key,label:key.slice(5).replace('-','/')});}
 else {const cursor=new Date(start+'T00:00:00Z');cursor.setUTCDate(1);while(cursor.toISOString().slice(0,10)<=end&&buckets.length<1200){const key=cursor.toISOString().slice(0,7);buckets.push({key,label:key});cursor.setUTCMonth(cursor.getUTCMonth()+1);}}
 const byKey=new Map(buckets.map(b=>[b.key,Object.assign(b,{players:new Set(),bet:0,payout:0,count:0})]));
 const games=new Map();let bet=0,payout=0,jackpot=0,triggers=0;
 for(const r of records){
  const key=granularity==='hour'?r.time.slice(0,2):granularity==='day'?r.date:r.date.slice(0,7),bucket=byKey.get(key);
  if(bucket){bucket.players.add(r.player);bucket.bet+=r.bet;bucket.payout+=r.payout;bucket.count++;}
  if(!games.has(r.game))games.set(r.game,{name:r.game,kind:r.kind,players:new Set(),count:0,bet:0,payout:0,net:0});
  const g=games.get(r.game);g.players.add(r.player);g.count++;g.bet+=r.bet;g.payout+=r.payout;g.net+=r.net;
  bet+=r.bet;payout+=r.payout;jackpot+=r.jackpotAward||0;if(r.jackpotAward>0)triggers++;
 }
 const series=buckets.map(b=>({...b,players:b.players.size}));
 return {granularity,series,games:[...games.values()].map(g=>({...g,players:g.players.size})),players:new Set(records.map(r=>r.player)).size,count:records.length,bet,payout,difference:bet-payout,rtp:bet?payout/bet*100:null,jackpot,triggers,peak:series.reduce((a,b)=>b.players>a.players?b:a,{label:'無記錄',players:0})};
}
