import {netWinCents} from './net-win.js?v=14.3.2';
import {fishingDetail,selectionValues,matchesSelection} from './core.js?v=14.4';
export const ACCOUNTING_ITEMS=[
 ['regular','一般投注','coins','charge'],['progression','闖關／加碼投注','reports','charge'],['chess','棋牌／籌碼投注','cards','charge'],['bullet','捕魚子彈','target','charge'],['tool','道具／技能','tools','charge'],['bonus-buy','購買獎勵','slot','charge'],['free-spin','免費旋轉','slot','payout'],['spin-bonus','旋轉獎勵','payout','payout'],['big-prize','大獎','jackpot','payout'],['jackpot','累積獎池','jackpot','fund']
];
export const ACCOUNTING_FIELDS=['charge','generalPayout','jackpotPayout','contribution','refund','serviceGross','serviceCost'];
export const accountingCents=n=>Math.round((Number(n)||0)*100);
export function accountingTotals(rows){if(new Set(rows.map(r=>r.currency)).size>1)throw Error('不同幣別不可直接合計');const t=Object.fromEntries(ACCOUNTING_FIELDS.map(k=>[k,rows.reduce((n,r)=>n+r[k],0)]));const wins=netWinCents(t.charge,t.refund,t.generalPayout+t.jackpotPayout);return {...t,payout:t.generalPayout+t.jackpotPayout,...wins,ggr:wins.operatorNetWin,serviceNet:t.serviceGross-t.serviceCost,records:new Set(rows.map(r=>r.recordId)).size,players:new Set(rows.map(r=>r.cashId+'|'+r.playerId)).size,sites:new Set(rows.map(r=>r.cashId)).size};}
// Integer cents. Each original wager is partitioned once; jackpot transfers are informational, not additional charges.
export function accountingLines(records,pricing=[]){
 const result=[];
 for(const r of records){
  const base=accountingCents(r.basePayout??(r.payout-(r.jackpotAward||0))),jp=accountingCents(r.jackpotAward),contribution=accountingCents(r.jackpot?.contribution),charge=accountingCents(r.bet),refund=accountingCents(r.refund),parts=[];
  if(r.kind==='捕魚'){
   const detail=fishingDetail(r),tool=accountingCents(detail.toolCost),bullet=accountingCents(detail.bulletCost),normal=accountingCents(detail.normal),extra=accountingCents(detail.skill+detail.bonus);
   if(tool+bullet!==charge)throw Error('捕魚扣款明細與原交易不一致：'+r.id);
   // Reuse the existing demonstrator's split when it reconciles; never infer additional payouts.
   const split=normal+extra===base;parts.push({item:'bullet',charge:bullet,generalPayout:split?normal:base});if(tool||split&&extra)parts.push({item:'tool',charge:tool,generalPayout:split?extra:0});
  }else{
   const item=r.kind==='棋牌'?'chess':r.kind==='電子遊戲'?'progression':/購買獎勵/.test(r.event)?'bonus-buy':/免費旋轉/.test(r.event)&&!charge?'free-spin':/獎勵回合大獎/.test(r.event)?'big-prize':/獎勵派彩/.test(r.event)?'spin-bonus':'regular';parts.push({item,charge,generalPayout:base});
  }
  if(jp||contribution)parts.push({item:'jackpot',charge:0,generalPayout:0,jackpotPayout:jp,contribution});
  const plan=pricing.find(p=>p.wrapperId===r.wrapperId&&p.status==='active'),grossRate=plan?.saleRate||0,costRate=plan?.costRate||0;
  parts.forEach((p,i)=>result.push({id:r.id+':'+p.item,recordId:r.id,round:r.round,player:r.player,playerId:r.player_id,providerId:r.providerId,wrapperId:r.wrapperId,cashId:r.cashId,site:r.site,gameId:r.gameId,game:r.game,kind:r.kind,slotGameplay:r.slotGameplay,date:r.date,time:r.time,currency:r.currency||'USDT',event:r.event,charge:0,generalPayout:0,jackpotPayout:0,contribution:0,refund:i?0:refund,serviceGross:0,serviceCost:0,pricingId:plan?.id||null,grossRate,costRate,...p}));
 }
 // Match the existing channel-pricing basis: calculate once per wrapper/currency, then allocate cents.
 const buckets=new Map();for(const row of result){const key=row.wrapperId+'|'+row.currency;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(row);}
 for(const rows of buckets.values()){
  const base=rows.reduce((n,r)=>n+r.charge,0);if(!base)continue;
  for(const [field,rate] of [['serviceGross',rows[0].grossRate],['serviceCost',rows[0].costRate]]){
   const total=Math.round(base*Math.round(rate*100)/10000),shares=rows.map((row,index)=>{const exact=total*row.charge/base;return {row,index,value:Math.floor(exact),fraction:exact-Math.floor(exact)};});
   let remainder=total-shares.reduce((n,s)=>n+s.value,0);for(const share of [...shares].sort((a,b)=>b.fraction-a.fraction||a.index-b.index)){if(remainder<=0)break;share.value++;remainder--;}
   for(const share of shares)share.row[field]=share.value;
  }
 }
 return result;
}
export function filterAccounting(lines,filters={}){
 const query=String(filters.query||'').trim().toLocaleLowerCase(),excluded=selectionValues(filters.excludeAccounting);
 return lines.filter(r=>(!filters.start||r.date>=filters.start)&&(!filters.end||r.date<=filters.end)&&matchesSelection(filters.wrapper,[r.wrapperId])&&matchesSelection(filters.merchant,[r.site,r.cashId])&&matchesSelection(filters.type,[r.kind])&&matchesSelection(filters.game,[r.game])&&matchesSelection(filters.slotGameplay,[r.slotGameplay])&&matchesSelection(filters.accountingItems,[r.item])&&!excluded.includes(r.item)&&(!query||[r.recordId,r.round,r.player,r.playerId,r.game,r.site].some(v=>String(v).toLocaleLowerCase().includes(query))));
}
export function groupAccounting(lines,group='item'){
 const dimensions=group==='site-item'?['item','cashId']:group==='game-item'?['item','gameId']:group==='wrapper-item'?['item','wrapperId']:group==='date-item'?['item','date']:group==='record'?['id']:['item'],map=new Map();
 for(const row of lines){const key=dimensions.map(k=>row[k]).join('|');if(!map.has(key))map.set(key,[]);map.get(key).push(row);}
 const groups=[...map].map(([key,rows])=>({key,item:rows[0].item,rows,totals:accountingTotals(rows),cashIds:[...new Set(rows.map(r=>r.cashId))],wrapperIds:[...new Set(rows.map(r=>r.wrapperId))],gameIds:[...new Set(rows.map(r=>r.gameId))],dates:[...new Set(rows.map(r=>r.date))]}));
 return groups.sort((a,b)=>ACCOUNTING_ITEMS.findIndex(([k])=>k===a.item)-ACCOUNTING_ITEMS.findIndex(([k])=>k===b.item)||b.totals.charge-a.totals.charge||a.key.localeCompare(b.key));
}
export function accountingModel(data,pricing,filters={}){return accountingModelFromLines(accountingLines(data.records,pricing),filters);}
export function accountingModelFromLines(all,filters={}){
 const rows=filterAccounting(all,filters),context=filterAccounting(all,{...filters,accountingItems:'',excludeAccounting:''}),group=filters.accountingGroup||'item';
 return {rows,totals:accountingTotals(rows),groups:groupAccounting(rows,group),items:ACCOUNTING_ITEMS.map(([key,label,icon,kind])=>({key,label,icon,kind,...accountingTotals(context.filter(r=>r.item===key))})),group};
}
