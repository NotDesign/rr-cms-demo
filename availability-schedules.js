import {setGameAvailability,setGameSiteAvailability} from './game-operations.js?v=14.5.2';
import {queueLegacyChange} from './cms-configuration.js?v=14.5.2';

const ids=value=>[...new Set(Array.isArray(value)?value:[])];
function validateTargets(state,gameIds,siteIds,listed,reason){
 if(!gameIds.length||gameIds.some(id=>!state.games[id]))throw Error('請選擇有效的遊戲');
 if(typeof listed!=='boolean'||String(reason||'').trim().length<2)throw Error('請填寫至少兩個字的異動原因');
 if(siteIds.some(siteId=>gameIds.some(gameId=>!state.games[gameId].sites[siteId])))throw Error('現金網不在可設定範圍');
}
export function applyAvailability(data,state,{gameIds,siteIds=[],listed,reason},at=new Date()){
 gameIds=ids(gameIds);siteIds=ids(siteIds);validateTargets(state,gameIds,siteIds,listed,reason);
 let next=state;
 for(const gameId of gameIds)for(const siteId of siteIds.length?siteIds:[null]){
  const operation={kind:siteId?'site-availability':'availability',gameId,...(siteId?{siteId}:{})};
  const changed=siteId?setGameSiteAvailability(next,gameId,siteId,listed,reason,at):setGameAvailability(next,gameId,listed,reason,at);
  if(changed!==next)next=queueLegacyChange(data,changed,operation,reason,at);
 }
 return next;
}
export function scheduleAvailability(state,{gameIds,siteIds=[],listed,reason,start,end=null},at=new Date()){
 gameIds=ids(gameIds);siteIds=ids(siteIds);validateTargets(state,gameIds,siteIds,listed,reason);
 if(!Number.isFinite(Date.parse(start))||Date.parse(start)<=+at)throw Error('生效時間須晚於目前時間');
 if(end&&(!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start)))throw Error('結束時間須晚於生效時間');
 const conflict=(state.availabilitySchedules||[]).some(p=>['pending','active'].includes(p.status)&&p.gameIds.some(id=>gameIds.includes(id))&&(!p.siteIds.length&&!siteIds.length||p.siteIds.some(id=>siteIds.includes(id)))&&Date.parse(p.start)<(end?Date.parse(end):Infinity)&&(p.end?Date.parse(p.end):Infinity)>Date.parse(start));
 if(conflict)throw Error('所選遊戲已有重疊的上下架排程，請先取消原排程');
 const seq=(state.availabilityScheduleSeq||0)+1,plan={id:'AS-'+seq,gameIds,siteIds,listed,start:new Date(start).toISOString(),end:end?new Date(end).toISOString():null,reason:reason.trim(),createdAt:at.toISOString(),status:'pending'};
 return {...state,revision:state.revision+1,availabilityScheduleSeq:seq,availabilitySchedules:[plan,...state.availabilitySchedules||[]]};
}
export function cancelAvailability(state,id,at=new Date()){
 const plan=state.availabilitySchedules?.find(p=>p.id===id);if(!plan||!['pending','active'].includes(plan.status))throw Error('此排程已結束或已取消');
 return {...state,revision:state.revision+1,availabilitySchedules:state.availabilitySchedules.map(p=>p.id===id?{...p,status:'cancelled',cancelledAt:at.toISOString()}:p)};
}
export function dueAvailability(state,now=new Date()){
 const events=[];
 for(const plan of state.availabilitySchedules||[]){
  if(plan.status==='pending'&&Date.parse(plan.start)<=+now)events.push({plan,phase:'start',at:plan.start});
  if(['pending','active'].includes(plan.status)&&plan.end&&Date.parse(plan.end)<=+now)events.push({plan,phase:'end',at:plan.end});
 }
 return events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.plan.id.localeCompare(b.plan.id));
}
export function advanceAvailability(data,state,now=new Date()){
 let next=state;
 for(const event of dueAvailability(state,now)){
  const plan=next.availabilitySchedules.find(p=>p.id===event.plan.id);
  if(event.phase==='end'&&plan.status!=='active'||event.phase==='start'&&plan.status!=='pending')continue;
  next=applyAvailability(data,next,{...plan,listed:event.phase==='start'?plan.listed:!plan.listed,reason:'排程 '+plan.id+' · '+plan.reason},new Date(event.at));
  const status=event.phase==='start'?(plan.end?'active':'completed'):'completed';
  next={...next,revision:next.revision+1,availabilitySchedules:next.availabilitySchedules.map(p=>p.id===plan.id?{...p,status,...(event.phase==='start'?{activatedAt:event.at}:{completedAt:event.at})}:p)};
 }
 return next;
}
