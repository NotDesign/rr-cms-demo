// Calculated from selected wager records, never invented telemetry.
const dayMs=86400000;
export function playerProfitLoss(records){
 const profit=records.reduce((n,r)=>n+Math.max(0,r.net),0),loss=records.reduce((n,r)=>n+Math.min(0,r.net),0);
 return {profit,loss,net:profit+loss};
}
// Stable fictional metadata; documentation-only IP ranges never identify a real user.
export function playerSourceProfile(player,records,organizations){
 const seed=Number(String(player).replace(/\D/g,''))||1,first=records[0],site=organizations.find(o=>o.id===first?.cashId),wrapper=organizations.find(o=>o.id===first?.wrapperId);
 const region=/越南/.test(site?.name)?'越南':/泰國/.test(site?.name)?'泰國':'台灣',device=['iOS／iPhone 示範裝置','Android／示範手機','Windows／桌面瀏覽器','macOS／桌面瀏覽器'][seed%4];
 const latest=[...records].sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time)).at(-1),vpn=seed%4===0;
 return {agent:(wrapper?.name||'示範包網商').replace('包網','代理')+' A-'+String(seed%12+1).padStart(2,'0'),region,registered:'2026-07-'+String(seed%27+1).padStart(2,'0')+' 09:'+String(seed%60).padStart(2,'0')+':00',registrationIp:'203.0.113.'+(seed%200+10),registrationDevice:device.split('／')[0],vpnIp:vpn?'198.51.100.'+(seed%200+10):'未偵測 VPN／代理',isp:'示範 ISP／'+region,lastLogin:latest?latest.date+' '+latest.time:'尚無登入記錄',lastIp:'192.0.2.'+(seed%200+10),lastDevice:device,vpn};
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
