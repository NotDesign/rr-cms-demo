import {cents} from './jackpot-analytics.js?v=13.1';

// Historical funding is an explicit synthetic 50/50 agreement, independent of CMS drafts.
export function defaultPoolFunding(pool){return {seedAmount:pool?.opening||0,providerCapitalShare:50,providerNetShare:50};}
export function gameFunding(data,gameId){const game=data.games.find(g=>g.id===gameId);return defaultPoolFunding(data.jackpotPools.find(p=>p.game===game?.name));}
export function validateFunding(funding){return Boolean(funding&&typeof funding.seedAmount==='number'&&Number.isFinite(funding.seedAmount)&&funding.seedAmount>=0&&funding.seedAmount<=100000000&&['providerCapitalShare','providerNetShare'].every(k=>typeof funding[k]==='number'&&Number.isFinite(funding[k])&&funding[k]>=0&&funding[k]<=100));}
export function splitPoolFunding(funding,contribution=0,award=0){
 if(!validateFunding(funding)||![contribution,award].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))throw Error('合資金額或合作比例無效');
 const seed=cents(funding.seedAmount),incoming=cents(contribution),outgoing=cents(award),providerSeed=Math.round(seed*funding.providerCapitalShare/100),providerIncoming=Math.round(incoming*funding.providerNetShare/100),providerOutgoing=Math.round(outgoing*funding.providerNetShare/100);
 const role=(initial,add,paid)=>({initial:initial/100,contribution:add/100,award:paid/100,net:(add-paid)/100,equity:(initial+add-paid)/100});
 return {...funding,initial:seed/100,contribution:incoming/100,award:outgoing/100,net:(incoming-outgoing)/100,balance:(seed+incoming-outgoing)/100,provider:role(providerSeed,providerIncoming,providerOutgoing),cash:role(seed-providerSeed,incoming-providerIncoming,outgoing-providerOutgoing)};
}
// Largest-remainder allocation keeps every cent while making equal-weight ties stable by site ID.
function allocate(total,weights){if(!weights.length)return [];const sum=weights.reduce((n,v)=>n+v,0),basis=sum?weights:weights.map(()=>1),denominator=sum||weights.length,raw=basis.map(v=>total*v/denominator),values=raw.map(Math.floor),rest=total-values.reduce((n,v)=>n+v,0),order=raw.map((v,i)=>({i,fraction:v-values[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);for(let i=0;i<rest;i++)values[order[i%order.length].i]++;return values;}
export function poolPartnership(data,pool,funding=defaultPoolFunding(pool)){
 const entries=data.records.filter(r=>r.jackpot?.poolId===pool.id),contribution=entries.reduce((n,r)=>n+cents(r.jackpot.contribution),0),award=entries.reduce((n,r)=>n+cents(r.jackpot.award),0),total=splitPoolFunding(funding,contribution/100,award/100);
 const providerId=entries.find(r=>r.providerId)?.providerId||data.organizations.find(o=>o.level==='遊戲商')?.id,provider=data.organizations.find(o=>o.id===providerId),ids=[...new Set(entries.map(r=>r.cashId).filter(Boolean))].sort(),sites=ids.map(id=>{const org=data.organizations.find(o=>o.id===id),records=entries.filter(r=>r.cashId===id);return {id,name:org?.name||id,parent:org?.parent,contribution:records.reduce((n,r)=>n+cents(r.jackpot.contribution),0),award:records.reduce((n,r)=>n+cents(r.jackpot.award),0)};});
 const providerSeed=allocate(cents(total.provider.initial),sites.map(()=>1)),cashSeed=allocate(cents(total.cash.initial),sites.map(()=>1)),providerIn=allocate(cents(total.provider.contribution),sites.map(s=>s.contribution)),providerOut=allocate(cents(total.provider.award),sites.map(s=>s.award));
 return {...total,providerId,providerName:provider?.name||'遊戲商',poolId:pool.id,sites:sites.map((s,i)=>{const providerNet=providerIn[i]-providerOut[i],cashNet=s.contribution-s.award-providerNet;return {...s,contribution:s.contribution/100,award:s.award/100,providerInitial:providerSeed[i]/100,cashInitial:cashSeed[i]/100,providerNet:providerNet/100,cashNet:cashNet/100,providerEquity:(providerSeed[i]+providerNet)/100,cashEquity:(cashSeed[i]+cashNet)/100};})};
}
