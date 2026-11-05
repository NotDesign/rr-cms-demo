import {matchesSelection,totals} from './core.js?v=14.5.0';
import {playerSourceProfile} from './analytics.js?v=14.5.0';
import {playerResultTotals as playerProfitLoss} from './net-win.js?v=14.4.1';
import {recordOrganizationId} from './organization-hierarchy.js?v=14.4.9';
export const PLAYER_SECTIONS=[['overview','玩家總覽'],['directory','玩家列表'],['risk','風險與 BOT'],['restrictions','凍結與封鎖'],['audit','玩家操作紀錄']];
export const accessLabels={active:'正常',frozen:'已凍結',blocked:'已封鎖'};
export const botLabels={unreviewed:'尚未判定',watch:'觀察中',bot:'人工判定為 BOT',human:'正常玩家'};
export const playerKey=r=>r.cashId+'|'+r.player_id;
export function organizationChain(organizations,id){const seen=new Set(),path=[];let node=organizations.find(o=>o.id===id);while(node&&!seen.has(node.id)){seen.add(node.id);path.unshift(node);node=organizations.find(o=>o.id===node.parent);}return path;}
export function createPlayerCatalog(data){
 const groups=new Map();for(const r of data.records){const key=playerKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return [...groups].map(([key,records])=>{const r=records[0],latest=[...records].sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time))[0];return {key,name:r.player,id:r.player_id,siteId:r.cashId,wrapperId:r.wrapperId,providerId:r.providerId,site:r.site,records,latest,source:playerSourceProfile(r.player,records,data.organizations),chain:organizationChain(data.organizations,recordOrganizationId(latest))};});
}
export function createPlayerState(raw={}){return {schema:1,revision:Number.isSafeInteger(raw?.revision)?raw.revision:0,profiles:{...(raw?.profiles||{})},audit:Array.isArray(raw?.audit)?raw.audit:[]};}
export function playerPolicy(state,key){const p=state.profiles[key]||{};return {access:accessLabels[p.access]?p.access:'active',bot:botLabels[p.bot]?p.bot:'unreviewed'};}
export function playerAccess(policy){return {login:policy.access!=='blocked',newRound:policy.access==='active',settlement:true,history:true};}
export function updatePlayerPolicy(state,catalog,key,field,value,reason,{revision=state.revision,actor='平台管理員',at=new Date().toISOString()}={}){
 if(revision!==state.revision)throw Error('玩家狀態已在其他分頁更新，請重新開啟後確認');
 const player=catalog.find(p=>p.key===key);if(!player)throw Error('找不到此現金網的玩家');
 if(!['access','bot'].includes(field)||!Object.hasOwn(field==='access'?accessLabels:botLabels,value))throw Error('無效的玩家狀態');
 reason=String(reason||'').trim();if(reason.length<2||reason.length>300)throw Error('請輸入 2–300 字的操作原因');
 const before=playerPolicy(state,key);if(before[field]===value)throw Error('此狀態未變更');
 const after={...before,[field]:value},action=field==='access'?{active:before.access==='blocked'?'解除封鎖':'解除凍結',frozen:'凍結玩家',blocked:'封鎖玩家'}[value]:'BOT 判定：'+botLabels[value];
 const event={id:'PLAYER-'+(state.revision+1),at,actor,key,name:player.name,siteId:player.siteId,subject:player.id+' / '+player.site,module:'players',source:'players',action,field,before,after,reason};
 return {...state,revision:state.revision+1,profiles:{...state.profiles,[key]:after},audit:[event,...state.audit]};
}
export function playerEvidence(records){
 const ordered=[...records].sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
 const deltas=ordered.slice(1).map((r,i)=>(Date.parse(r.date+'T'+r.time+'+08:00')-Date.parse(ordered[i].date+'T'+ordered[i].time+'+08:00'))/1000);
 const amounts=new Map();for(const r of records)amounts.set(r.bet,(amounts.get(r.bet)||0)+1);
 const most=Math.max(0,...amounts.values()),short=deltas.filter(n=>n>=0&&n<=60).length;
 return {count:records.length,minInterval:deltas.length?Math.min(...deltas):null,shortIntervals:short,repeatedShare:records.length?most/records.length:0,distinctGames:new Set(records.map(r=>r.gameId)).size,signals:(short>0?1:0)+(records.length>=5&&most/records.length>=.7?1:0)};
}
export function playerDirectory(catalog,state,filters={},section='directory'){
 const q=String(filters.query||'').trim().toLocaleLowerCase();
 return catalog.filter(p=>matchesSelection(filters.wrapper,[p.wrapperId])&&matchesSelection(filters.merchant,[p.site,p.siteId])&&(!q||[p.name,p.id,p.site,p.source.registrationIp,p.source.lastIp].some(v=>String(v).toLocaleLowerCase().includes(q))))
 .map(p=>{const policy=playerPolicy(state,p.key),records=p.records.filter(r=>(!filters.start||r.date>=filters.start)&&(!filters.end||r.date<=filters.end)&&matchesSelection(filters.type,[r.kind])&&matchesSelection(filters.game,[r.game]));return {...p,policy,period:records,totals:totals(records),profitLoss:playerProfitLoss(records),evidence:playerEvidence(records)};})
 .filter(p=>(!filters.pmAccess||p.policy.access===filters.pmAccess)&&(!filters.pmBot||p.policy.bot===filters.pmBot)&&(!filters.pmActivity||(filters.pmActivity==='active'?p.period.length>0:p.period.length===0))&&(!filters.game?.length&&!filters.type?.length||p.period.length>0)&&(section!=='restrictions'||p.policy.access!=='active'));
}
