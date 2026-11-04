import {gameFunding,validateFunding} from './jackpot-partnership.js?v=14.4.1';
import {RTP_PROFILES,gameAccess} from './game-operations.js?v=14.4.1';
import {cents} from './jackpot-analytics.js?v=14.4.1';

const copy=value=>JSON.parse(JSON.stringify(value));
const sitesOf=data=>data.organizations.filter(s=>s.level==='現金網');
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export const ruleKindLabels={game:'遊戲設定規則',jackpot:'獎池規則'};
export function gameEvent(game){return game.type==='電子遊戲'?['stageClear','連闖關卡']:game.type==='老虎機'?['jackpotSymbol','獎池符號']:game.type==='捕魚'?['bossKill','首領擊殺']:game.family==='blackjack'?['natural21','自然 21 點']:['bullPattern','牛牛牌型'];}
export function defaultRuleSettings(data,state,gameId,kind){
 const game=data.games.find(g=>g.id===gameId);
 if(kind==='game')return {rtp:null,minBet:1,maxBet:10000,maxWin:0,allowFreeRounds:true,params:game.type==='電子遊戲'?{maxStages:10}:game.type==='老虎機'?{paylines:20}:game.type==='捕魚'?{bullets:[1,1.5,2,3,4],maxBullets:1000}:{turnSeconds:30,maxMultiplier:16}};
 const pool=data.jackpotPools.find(p=>p.game===game.name);
 return {funding:gameFunding(data,gameId),enabled:true,basis:'paid',rate:(pool?.contributionRate||.02)*100,cap:0,triggerType:'gameEvent',event:gameEvent(game)[0],eventCount:game.type==='電子遊戲'?3:1,minBet:0,minPool:0,cooldown:0,allowFreeRounds:true,payoutMode:'game',payoutValue:100,maxAward:0,retain:0,insufficient:'cap'};
}
export function validateRule(data,gameId,kind,name,settings){
 const errors=[],game=data.games.find(g=>g.id===gameId);
 if(!game)errors.push('請選擇遊戲');if(!['game','jackpot'].includes(kind))errors.push('規則類型無效');if(!String(name||'').trim()||String(name).length>60)errors.push('規則名稱須為 1–60 個字');
 if(!game)return errors;
 if(!settings||typeof settings!=='object')return [...errors,'規則設定無效'];
 if(typeof settings.allowFreeRounds!=='boolean'||kind==='jackpot'&&typeof settings.enabled!=='boolean')errors.push('規則開關無效');
 if(kind==='game'){
  if(settings.rtp!==null&&!RTP_PROFILES.includes(settings.rtp))errors.push('請選擇可用的 RTP 設定檔');
  if(!finite(settings.minBet,0,1000000)||!finite(settings.maxBet,.01,1000000)||Number(settings.minBet)>Number(settings.maxBet))errors.push('投注上限須大於或等於下限');
  if(!finite(settings.maxWin,0,100000000))errors.push('單局派彩上限無效');
  const p=settings.params||{};
  if(game.type==='電子遊戲'&&(!Number.isInteger(p.maxStages)||!finite(p.maxStages,1,100)))errors.push('關卡數須為 1–100');
  if(game.type==='老虎機'&&(!Number.isInteger(p.paylines)||!finite(p.paylines,1,100)))errors.push('線數須為 1–100');
  if(game.type==='捕魚'&&(!Array.isArray(p.bullets)||p.bullets.length!==5||p.bullets.some((v,i)=>!finite(v,.01,1000)||i&&Number(v)<=Number(p.bullets[i-1]))||!Number.isInteger(p.maxBullets)||!finite(p.maxBullets,1,100000)))errors.push('捕魚須設定五個遞增的子彈等級及有效發數上限');
  if(game.type==='棋牌'&&(!finite(p.turnSeconds,5,120)||!finite(p.maxMultiplier,1,100)))errors.push('棋牌操作秒數或倍率無效');
 }else{
  if(settings.funding!==undefined&&!validateFunding(settings.funding))errors.push('合資金額或合作比例無效');
  if(!data.jackpotPools.some(p=>p.game===game.name))errors.push('此遊戲未配置獎池');
  if(!['paid','valid'].includes(settings.basis)||!finite(settings.rate,0,100)||!finite(settings.cap,0,1000000))errors.push('提撥比例須為 0–100%，提撥上限不得為負數');
  if(!['gameEvent','stakeThreshold','poolThreshold'].includes(settings.triggerType)||settings.event!==gameEvent(game)[0]||!Number.isInteger(settings.eventCount)||!finite(settings.eventCount,1,100))errors.push('觸發條件無效');
  if(!finite(settings.minBet,0,1000000)||!finite(settings.minPool,0,100000000)||!finite(settings.cooldown,0,86400))errors.push('門檻或冷卻時間無效');
  if(settings.triggerType==='stakeThreshold'&&Number(settings.minBet)<=0)errors.push('投注觸發門檻須大於 0');
  if(settings.triggerType==='poolThreshold'&&Number(settings.minPool)<=0)errors.push('獎池觸發門檻須大於 0');
  if(!['game','fixed','poolPercent','betMultiplier'].includes(settings.payoutMode)||settings.payoutMode!=='game'&&(!finite(settings.payoutValue,.01,100000000)||settings.payoutMode==='poolPercent'&&Number(settings.payoutValue)>100))errors.push('派彩金額或比例無效');
  if(!finite(settings.maxAward,0,100000000)||!finite(settings.retain,0,100000000)||!['cap','skip'].includes(settings.insufficient))errors.push('派彩上限或保留餘額無效');
 }
 return errors;
}
function seededConfiguration(data,state){
 const rules={},bindings={},applied={};
 for(const game of data.games){
  bindings[game.id]={};applied[game.id]={};
  for(const kind of ['game',...(game.hasJackpot?['jackpot']:[])]){
   const id='CMS-'+kind.toUpperCase()+'-'+game.id,settings=defaultRuleSettings(data,state,game.id,kind),name=game.name+'・預設'+(kind==='game'?'遊戲規則':'獎池規則');
   rules[id]={id,gameId:game.id,kind,name,draft:{name,systemName:true,settings:copy(settings),revision:1,updatedAt:null},versions:[{version:1,name,systemName:true,settings:copy(settings),at:null,reason:'既有示例設定',actor:'R&R CMS'}]};
  }
  for(const site of sitesOf(data)){
   const gameBinding={ruleId:'CMS-GAME-'+game.id,version:1},jackpotBinding=game.hasJackpot&&state.games[game.id].sites[site.id].enabled?{ruleId:'CMS-JACKPOT-'+game.id,version:1,rate:null,contribute:true,canWin:true}:null;
   bindings[game.id][site.id]={game:gameBinding,jackpot:jackpotBinding};
   applied[game.id][site.id]={'site-control':{seq:0,snapshot:copy(state.games[game.id].sites[site.id]),at:null},game:{seq:0,binding:copy(gameBinding),snapshot:copy(rules[gameBinding.ruleId].versions[0]),at:null},jackpot:{seq:0,binding:copy(jackpotBinding),snapshot:jackpotBinding?copy(rules[jackpotBinding.ruleId].versions[0]):null,at:null},rtp:{seq:0,snapshot:{defaultRtp:state.games[game.id].defaultRtp,override:copy(state.games[game.id].overrides[site.id]||null)},at:null},control:{seq:0,snapshot:{listed:state.games[game.id].listed,maintenance:state.games[game.id].maintenance},at:null}};
  }
 }
 return {schema:1,seq:0,syncRevision:0,rules,bindings,applied,desired:{},batches:[],history:[]};
}
export function hydrateConfiguration(data,state,saved=state.configuration){
 const seed=seededConfiguration(data,state);if(!saved||saved.schema!==1||!saved.rules||!saved.bindings||!saved.applied)return {...state,configuration:seed};
 const config=copy(saved);config.seq=Number.isInteger(config.seq)?config.seq:0;config.syncRevision=Number.isInteger(config.syncRevision)?config.syncRevision:0;config.rules={...seed.rules,...config.rules};config.bindings={...seed.bindings,...config.bindings};config.applied={...seed.applied,...config.applied};config.desired||={};config.batches=Array.isArray(config.batches)?config.batches.slice(0,50):[];config.history=Array.isArray(config.history)?config.history.slice(0,200):[];
 for(const rule of Object.values(config.rules)){const original=seed.rules[rule.id];if(original){if(rule.draft.systemName===undefined)rule.draft.systemName=rule.draft.name===original.name;for(const v of rule.versions)if(v.systemName===undefined)v.systemName=v.name===original.name;}}
 for(const g of data.games)for(const site of sitesOf(data))for(const kind of ['game','jackpot']){const a=config.applied[g.id]?.[site.id]?.[kind],original=seed.rules[a?.binding?.ruleId];if(a?.snapshot&&a.snapshot.systemName===undefined)a.snapshot.systemName=Boolean(original&&a.snapshot.name===original.name);}
 for(const g of data.games){config.bindings[g.id]={...seed.bindings[g.id],...config.bindings[g.id]};config.applied[g.id]={...seed.applied[g.id],...config.applied[g.id]};for(const site of sitesOf(data))config.applied[g.id][site.id]={...seed.applied[g.id][site.id],...config.applied[g.id][site.id]};}
 return {...state,configuration:config};
}
export function assignedRule(state,gameId,siteId,kind,source='cms'){
 const c=state.configuration;if(!c)return null;
 if(source==='applied'){const a=c.applied[gameId]?.[siteId]?.[kind];return a?.snapshot?{binding:a.binding,snapshot:a.snapshot,rule:c.rules[a.binding.ruleId]}:null;}
 const binding=c.bindings[gameId]?.[siteId]?.[kind],rule=binding?c.rules[binding.ruleId]:null,snapshot=rule?.versions.find(v=>v.version===binding.version);return snapshot?{binding,rule,snapshot}:null;
}
export function saveRuleDraft(data,state,{id=null,gameId,kind,name,settings},at=new Date()){
 const errors=validateRule(data,gameId,kind,name,settings);if(errors.length)throw Error(errors.join('；'));
 const c=copy(state.configuration),old=id?c.rules[id]:null;if(id&&(!old||old.gameId!==gameId||old.kind!==kind))throw Error('規則不屬於此遊戲');
 id||='CMS-'+kind.toUpperCase()+'-'+gameId+'-N'+(Object.keys(c.rules).length+1);
 c.rules[id]={...(old||{id,gameId,kind,versions:[]}),name:String(name).trim(),draft:{name:String(name).trim(),systemName:Boolean(old?.draft.systemName&&old.draft.name===String(name).trim()),settings:copy(settings),revision:(old?.draft.revision||0)+1,updatedAt:at.toISOString()}};
 c.history=[{at:at.toISOString(),action:old?'edit-draft':'create-rule',ruleId:id,gameId,reason:String(name).trim()},...c.history].slice(0,200);
 return {state:{...state,revision:state.revision+1,configuration:c},id};
}
function enqueue(state,gameId,domain,targets,title,reason,meta,at){
 const c=copy(state.configuration),seq=++c.seq,id='SYNC-'+String(seq).padStart(5,'0');
 const ids=new Set(targets.map(t=>t.siteId));for(const old of c.batches)if(old.gameId===gameId&&old.domain===domain)for(const t of old.targets)if(ids.has(t.siteId)&&['pending','applying','failed'].includes(t.status)){t.status='superseded';t.error='已有較新的 CMS 設定，此版本不再套用';}
 c.desired[gameId]||={};for(const target of targets){c.desired[gameId][target.siteId]||={};c.desired[gameId][target.siteId][domain]=seq;}
 c.batches=[{id,seq,gameId,domain,title,reason,meta,at:at.toISOString(),transport:'demo',targets:targets.map(t=>({...copy(t),status:'pending',attempts:0,error:'',appliedAt:null}))},...c.batches].slice(0,50);
 return {...state,configuration:c};
}
export function publishRule(data,state,id,assignments,reason,at=new Date()){
 const c=copy(state.configuration),rule=c.rules[id];if(!rule)throw Error('找不到規則');const errors=validateRule(data,rule.gameId,rule.kind,rule.draft.name,rule.draft.settings);if(errors.length)throw Error(errors.join('；'));if(String(reason||'').trim().length<2||String(reason).trim().length>200)throw Error('發布原因須為 2–200 個字');
 const known=new Set(sitesOf(data).map(s=>s.id));if(!assignments.length||new Set(assignments.map(a=>a.siteId)).size!==assignments.length||assignments.some(a=>!known.has(a.siteId)||rule.kind==='jackpot'&&a.rate!==null&&!finite(a.rate,0,100)))throw Error('請選擇現金網並確認個別提撥比例');
 let version=rule.versions.at(-1);if(!version||JSON.stringify(version.settings)!==JSON.stringify(rule.draft.settings)||version.name!==rule.draft.name){version={version:(version?.version||0)+1,name:rule.draft.name,systemName:Boolean(rule.draft.systemName),settings:copy(rule.draft.settings),at:at.toISOString(),reason:reason.trim(),actor:'平台管理員'};rule.versions.push(version);}
 const targets=assignments.map(a=>{const binding={ruleId:id,version:version.version,...(rule.kind==='jackpot'?{rate:a.rate===null?null:Number(a.rate),contribute:a.contribute!==false,canWin:a.canWin!==false}:{})};c.bindings[rule.gameId][a.siteId][rule.kind]=binding;return {siteId:a.siteId,snapshot:copy(version),binding};});
 c.history=[{at:at.toISOString(),action:'publish-rule',ruleId:id,gameId:rule.gameId,version:version.version,sites:assignments.map(a=>a.siteId),reason:reason.trim()},...c.history].slice(0,200);
 return enqueue({...state,revision:state.revision+1,configuration:c},rule.gameId,rule.kind,targets,rule.draft.name,reason.trim(),{ruleId:id,version:version.version},at);
}
export function queueLegacyChange(data,state,operation,reason,at=new Date()){
 const sites=operation.siteId?[operation.siteId]:sitesOf(data).map(s=>s.id),game=state.games[operation.gameId],domain=operation.kind==='site-availability'?'site-control':['availability','maintenance'].includes(operation.kind)?'control':'rtp';
 const targets=sites.map(siteId=>({siteId,snapshot:domain==='site-control'?copy(game.sites[siteId]):domain==='control'?{listed:game.listed,maintenance:game.maintenance}:{defaultRtp:game.defaultRtp,override:copy(game.overrides[siteId]||null)}}));
 const title={'site-availability':'單站遊戲上下架',availability:'遊戲全域上下架',maintenance:'遊戲維護',rtp:'現金網 RTP','default-rtp':'遊戲預設 RTP'}[operation.kind];return enqueue(state,operation.gameId,domain,targets,title,reason,{kind:operation.kind},at);
}
export function advanceSync(state,id,phase,at=new Date(),simulateFailure=true){
 const c=copy(state.configuration),batch=c.batches.find(b=>b.id===id);if(!batch)return state;
 for(let i=0;i<batch.targets.length;i++){
  const target=batch.targets[i];if(!['pending','applying'].includes(target.status))continue;
  if(c.desired[batch.gameId]?.[target.siteId]?.[batch.domain]!==batch.seq){target.status='superseded';target.error='已有較新的 CMS 設定，此版本不再套用';continue;}
  if(phase==='start'&&target.status==='pending'){target.status='applying';target.attempts++;continue;}
  if(phase!=='finish'||target.status!=='applying')continue;
  if(simulateFailure&&batch.targets.length>3&&i===1&&target.attempts===1){target.status='failed';target.error='示範：現金網連線逾時，可重試';continue;}
  target.status='success';target.error='';target.appliedAt=at.toISOString();c.applied[batch.gameId][target.siteId][batch.domain]={seq:batch.seq,binding:target.binding||null,snapshot:copy(target.snapshot),at:target.appliedAt};
 }
 c.syncRevision++;return {...state,configuration:c};
}
export function retrySync(state,id){const c=copy(state.configuration),batch=c.batches.find(b=>b.id===id);if(!batch)return state;for(const t of batch.targets)if(t.status==='failed'){t.status='pending';t.error='';}c.syncRevision++;return {...state,configuration:c};}
export function syncCounts(config){return config.batches.reduce((all,b)=>{for(const t of b.targets)all[t.status]=(all[t.status]||0)+1;return all;},{pending:0,applying:0,failed:0,success:0,superseded:0});}
export function deployedRtp(state,gameId,siteId,now=new Date()){
 const a=state.configuration?.applied[gameId]?.[siteId],base=a?.game?.snapshot?.settings?.rtp??a?.rtp?.snapshot?.defaultRtp??state.games[gameId]?.defaultRtp,override=a?.rtp?.snapshot?.override;
 return override&&(override.mode==='permanent'||+now>=Date.parse(override.start)&&+now<Date.parse(override.end))?override.rtp:base;
}
export function jackpotTrial(data,state,gameId,settings,binding,input){
 const errors=validateRule(data,gameId,'jackpot','試算',settings);if(errors.length)throw Error(errors.join('；'));
 const amount=Number(input.bet),balance=Number(input.balance),refund=Number(input.refund||0);if(!finite(amount,0,1000000)||!finite(balance,0,100000000)||!finite(refund,0,amount)||!finite(input.eventCount??0,0,1000000)||!finite(input.elapsed??0,0,10000000)||!finite(input.gameAward??0,0,100000000)||binding.rate!==null&&binding.rate!==undefined&&!finite(binding.rate,0,100))throw Error('試算投注、退款、條件或獎池餘額無效');
 const before=cents(balance),access=gameAccess(state,gameId,input.siteId),reasons=[];
 if(input.duplicate)return {contribution:0,award:0,after:balance,triggered:false,reasons:['同一事件已處理，不重複提撥或派彩']};
 if(!access.canPlay||!settings.enabled)return {contribution:0,award:0,after:balance,triggered:false,reasons:[!settings.enabled?'此獎池規則未啟用':'此現金網目前不可遊玩此遊戲']};
 const rate=binding.rate??settings.rate,base=settings.basis==='valid'?Math.max(0,amount-refund):amount;
 let contribution=binding.contribute===false?0:Math.round(cents(base)*Number(rate)/100);if(Number(settings.cap)>0)contribution=Math.min(contribution,cents(settings.cap));const accumulated=before+contribution;
 if(binding.canWin===false)reasons.push('此現金網未開放中獎');if(amount===0&&!settings.allowFreeRounds)reasons.push('免費回合不符合中獎資格');if(amount<Number(settings.minBet))reasons.push('未達單局投注門檻');if(accumulated<cents(settings.minPool))reasons.push('未達獎池餘額門檻');if(Number(input.elapsed||0)<Number(settings.cooldown))reasons.push('仍在派彩冷卻期間');
 if(settings.triggerType==='gameEvent'&&(!input.eventMatched||Number(input.eventCount)<settings.eventCount))reasons.push('遊戲事件或次數未達條件');
 let desired=settings.payoutMode==='game'?cents(input.gameAward||0):settings.payoutMode==='fixed'?cents(settings.payoutValue):settings.payoutMode==='poolPercent'?Math.round(accumulated*Number(settings.payoutValue)/100):Math.round(cents(amount)*Number(settings.payoutValue));
 if(settings.payoutMode==='game'&&!Number(input.gameAward))reasons.push('需由遊戲事件提供派彩金額');if(Number(settings.maxAward)>0)desired=Math.min(desired,cents(settings.maxAward));const available=Math.max(0,accumulated-cents(settings.retain));
 if(settings.insufficient==='skip'&&desired>available)reasons.push('可用獎池餘額不足，本次不派彩');const award=reasons.length?0:Math.min(desired,available);if(!reasons.length&&award<=0)reasons.push('可派彩餘額不足');
 return {contribution:contribution/100,award:award/100,after:(accumulated-award)/100,triggered:award>0,rate:Number(rate),reasons:reasons.length?reasons:['觸發條件成立，按設定派彩']};
}
export function jackpotEligibility(state,gameId,siteId){const a=assignedRule(state,gameId,siteId,'jackpot'),access=gameAccess(state,gameId,siteId);if(!state.configuration)return {participates:access.canPlay,contribute:access.canPlay,canWin:access.canPlay,rate:2,rule:null};const enabled=Boolean(a&&a.snapshot.settings.enabled&&access.canPlay);return {participates:enabled&&(a.binding.contribute||a.binding.canWin),contribute:enabled&&a.binding.contribute,canWin:enabled&&a.binding.canWin,rate:a?a.binding.rate??a.snapshot.settings.rate:0,rule:a};}


// Unchanged per-site defaults are recreated during hydration to keep large demos persistable.
export function compactGameOperations(data,state){
 const config=state.configuration,seed=seededConfiguration(data,state),bindings={},applied={};
 for(const game of data.games){
  const gameBindings={},gameApplied={};
  for(const site of sitesOf(data)){
   const binding=config.bindings[game.id]?.[site.id];
   if(JSON.stringify(binding)!==JSON.stringify(seed.bindings[game.id][site.id]))gameBindings[site.id]=binding;
   const domains={};
   for(const [kind,value] of Object.entries(config.applied[game.id]?.[site.id]||{})){
    if(JSON.stringify(value)!==JSON.stringify(seed.applied[game.id][site.id][kind]))domains[kind]=value;
   }
   if(Object.keys(domains).length)gameApplied[site.id]=domains;
  }
  if(Object.keys(gameBindings).length)bindings[game.id]=gameBindings;
  if(Object.keys(gameApplied).length)applied[game.id]=gameApplied;
 }
 return {...state,configuration:{...config,bindings,applied}};
}
