export const RTP_PROFILES=[94,95,96,97,98];
export const GAME_SECTIONS=[['catalog','遊戲列表'],['categories','遊戲分類'],['rules','遊戲規則'],['rtp','RTP 設定檔'],['availability','遊戲上下架'],['versions','版本管理'],['maintenance','維護管理']];
const profile=value=>RTP_PROFILES.includes(Number(value))?Number(value):null;
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function gameReleases(version){const [major,minor,patch]=version.split('.').map(Number);const previous=patch>0?[major,minor,patch-1]:[major,minor-1,2];const legacy=previous[2]>0?[...previous.slice(0,2),previous[2]-1]:[major,previous[1]-1,2];return [version,previous.join('.'),legacy.join('.')];}
export function createGameOperations(games,sites,saved=null,now=new Date()){
 const state={revision:Number.isInteger(saved?.revision)?saved.revision:0,games:{},configuration:saved?.configuration,audit:Array.isArray(saved?.audit)?saved.audit.filter(a=>games.some(g=>g.id===a.gameId)&&validDate(a.at)).slice(0,200):[]};
 games.forEach((g,i)=>{
  const old=saved?.games?.[g.id],overrides={};
  for(const [id,value] of Object.entries(old?.overrides||{}))if(sites.some(s=>s.id===id)&&profile(value?.rtp)&&(value.mode==='permanent'||value.mode==='scheduled'&&validDate(value.start)&&validDate(value.end)&&Date.parse(value.end)>Date.parse(value.start)))overrides[id]={...value,rtp:profile(value.rtp)};
  const version='1.'+(1+i%4)+'.'+i%3,releases=gameReleases(version),enabledSites=sites.filter((s,j)=>(j+i)%6!==5);
  state.games[g.id]={listed:typeof old?.listed==='boolean'?old.listed:![3,17].includes(i),maintenance:typeof old?.maintenance==='boolean'?old.maintenance:i===8,defaultRtp:profile(old?.defaultRtp)||[96,97,98][i%3],version,releases,sites:Object.fromEntries(sites.map((s,j)=>{const seededEnabled=(j+i)%6!==5,savedSite=old?.sites?.[s.id],enabled=typeof savedSite?.enabled==='boolean'?savedSite.enabled:seededEnabled,index=(enabledSites.findIndex(v=>v.id===s.id)+i)%enabledSites.length,seeded=releases[index<8+i%3?0:index<enabledSites.length-2?1:2],savedVersion=old?.sites?.[s.id]?.version;return [s.id,{enabled,maintenance:typeof savedSite?.maintenance==='boolean'?savedSite.maintenance:(j+i)%13===12,version:releases.includes(savedVersion)?savedVersion:enabled?(seededEnabled?seeded:version):null}];})),overrides};
 });
 if(!saved&&games[0]&&sites.length>=3){const g=state.games[games[0].id];g.overrides[sites[0].id]={mode:'scheduled',rtp:98,start:new Date(+now-3600000).toISOString(),end:new Date(+now+21600000).toISOString()};g.overrides[sites[1].id]={mode:'scheduled',rtp:95,start:new Date(+now+86400000).toISOString(),end:new Date(+now+172800000).toISOString()};g.overrides[sites[2].id]={mode:'scheduled',rtp:97,start:new Date(+now-172800000).toISOString(),end:new Date(+now-86400000).toISOString()};}
 return state;
}
export function gameAccess(state,gameId,siteId){
 const game=state.games[gameId],site=game?.sites[siteId];
 const reason=!game?'unknown':!game.listed?'global-off':game.maintenance?'game-maintenance':!site?.enabled?'site-off':site.maintenance?'site-maintenance':'playable';
 return {canPlay:reason==='playable',reason};
}
export function versionUsage(state,gameId,sites){
 const game=state.games[gameId];if(!game)return {groups:[],deployed:[],unassigned:[]};
 const releases=game.releases||gameReleases(game.version),deployed=sites.filter(s=>releases.includes(game.sites[s.id]?.version));
 return {groups:releases.map(version=>{const assigned=deployed.filter(s=>game.sites[s.id].version===version);return {version,recommended:version===game.version,sites:assigned,playable:assigned.filter(s=>gameAccess(state,gameId,s.id).canPlay)};}),deployed,unassigned:sites.filter(s=>!deployed.some(d=>d.id===s.id))};
}
export function effectiveRtp(state,gameId,siteId,now=new Date()){
 const game=state.games[gameId],override=game?.overrides[siteId];if(!game)return null;
 const binding=state.configuration?.bindings?.[gameId]?.[siteId]?.game,version=binding?state.configuration.rules[binding.ruleId]?.versions.find(v=>v.version===binding.version):null,baseline=version?.settings.rtp??game.defaultRtp;
 if(!override)return {value:baseline,baseline,status:'inherited',override:null};
 const status=override.mode==='permanent'?'active':+now<Date.parse(override.start)?'pending':+now>=Date.parse(override.end)?'expired':'active';
 return {value:status==='active'?override.rtp:baseline,baseline,status,override};
}
export function availabilityImpact(state,gameId,sites,listed){
 const next={...state,games:{...state.games,[gameId]:{...state.games[gameId],listed}}};
 return sites.map(site=>({site,before:gameAccess(state,gameId,site.id),after:gameAccess(next,gameId,site.id)}));
}
function record(state,gameId,kind,before,after,reason,at,siteId=null){return {...state,revision:state.revision+1,audit:[{id:state.revision+1,at:new Date(at).toISOString(),gameId,siteId,kind,before,after,reason,actor:'平台管理員'},...state.audit].slice(0,200)};}
export function setGameAvailability(state,gameId,listed,reason,at=new Date()){
 if(!state.games[gameId]||typeof listed!=='boolean'||!reason?.trim())throw Error('請填寫異動原因');
 if(state.games[gameId].listed===listed)return state;
 const next=record(state,gameId,'availability',state.games[gameId].listed,listed,reason.trim(),at);
 return {...next,games:{...next.games,[gameId]:{...next.games[gameId],listed}}};
}
export function setGameSiteAvailability(state,gameId,siteId,enabled,reason,at=new Date()){
 const game=state.games[gameId],site=game?.sites[siteId];if(!site||typeof enabled!=='boolean'||!reason?.trim())throw Error('請選擇現金網並填寫異動原因');
 if(site.enabled===enabled)return state;
 const after={...site,enabled,version:site.version||(enabled?game.version:null)},next=record(state,gameId,'site-availability',{enabled:site.enabled,version:site.version},{enabled:after.enabled,version:after.version},reason.trim(),at,siteId);
 return {...next,games:{...next.games,[gameId]:{...game,sites:{...game.sites,[siteId]:after}}}};
}
export function setGameMaintenance(state,gameId,maintenance,reason,at=new Date()){
 if(!state.games[gameId]||!reason?.trim())throw Error('請填寫異動原因');
 const next=record(state,gameId,'maintenance',state.games[gameId].maintenance,Boolean(maintenance),reason.trim(),at);
 return {...next,games:{...next.games,[gameId]:{...next.games[gameId],maintenance:Boolean(maintenance)}}};
}
export function setRtpOverride(state,gameId,siteId,config,reason,at=new Date()){
 const game=state.games[gameId];if(!game||!game.sites[siteId]||!reason?.trim())throw Error('請填寫異動原因');
 if(config&&(!profile(config.rtp)||!['permanent','scheduled'].includes(config.mode)))throw Error('請選擇可用的 RTP 設定檔');
 if(config?.mode==='scheduled'&&(!validDate(config.start)||!validDate(config.end)||Date.parse(config.end)<=Date.parse(config.start)||Date.parse(config.end)<=+at))throw Error('結束時間須晚於開始時間及目前時間');
 const overrides={...game.overrides};if(config)overrides[siteId]={...config,rtp:profile(config.rtp)};else delete overrides[siteId];
 const next=record(state,gameId,'rtp',game.overrides[siteId]||null,config,reason.trim(),at,siteId);
 return {...next,games:{...next.games,[gameId]:{...game,overrides}}};
}
export function setDefaultRtp(state,gameId,value,reason,at=new Date()){
 if(!state.games[gameId]||!profile(value)||!reason?.trim())throw Error('請選擇設定檔並填寫原因');
 const game=state.games[gameId],next=record(state,gameId,'default-rtp',game.defaultRtp,Number(value),reason.trim(),at);
 return {...next,games:{...next.games,[gameId]:{...game,defaultRtp:Number(value)}}};
}
export function fromOperationsTime(value){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;const date=new Date(value+':00+08:00');return Number.isFinite(+date)&&operationsTime(date).replace(' ','T')===value?date.toISOString():null;}
export function operationsTime(value){if(!value)return '—';const d=new Date(value);return new Date(+d+8*3600000).toISOString().slice(0,16).replace('T',' ');}
