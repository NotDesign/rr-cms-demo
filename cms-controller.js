import {splitPoolFunding} from './jackpot-partnership.js?v=14.4.1';
import {uiIcon} from './ui-icons.js?v=14.4.1';
import {escape as e,money} from './core.js?v=14.4.1';
import {gameAccess,effectiveRtp} from './game-operations.js?v=14.4.6';
import {defaultRuleSettings,validateRule,saveRuleDraft,publishRule,assignedRule,rulePreviewContext,jackpotTrial,advanceSync,retrySync,syncCounts} from './cms-configuration.js?v=14.4.6';
import {ruleEditorHtml,ruleApplyHtml,syncView,siteConfigurationView,ruleAssignmentsView,cmsBanner} from './cms-rule-view.js?v=14.4.6';

export function installCmsController(options){
 const {data,getState,loadState,commitState,renderMain,showDialog,closeDialog,getDialog,setDialog,localize,translate,toast,enhance,currentTab,openManager}=options;
 const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],running=new Map();let previewTimer;
 const action=(label,key,primary=false)=>'<button class="button '+(primary?'primary':'')+'" data-cms-action="'+key+'">'+label+'</button>';
 const footer=primary=>action('取消','cancel')+primary;
 function persist(state){commitState(state);refresh();return state;}
 function fresh(expected=null){const state=loadState();if(expected!==null&&state.revision!==expected)throw Error('CMS 設定已變更，請關閉視窗後重新載入再操作');return state;}
 function fail(selector,message){const element=$(selector);if(element){element.textContent=translate(message);element.hidden=false;element.scrollIntoView({block:'nearest'});}else toast(message);}
 function showEditor({id=null,gameId=null,kind='game',clone=false}){
  const state=getState(),old=id?state.configuration.rules[id]:null;if(old){gameId=old.gameId;kind=old.kind;}
  showDialog(clone?'複製規則':id?'編輯規則':'新增規則',ruleEditorHtml(data,state,{id,gameId,kind,clone}),{drawer:true,subtitle:'CMS 草稿 · 儲存後再選擇發布及同步對象',footer:footer(action('儲存草稿','save-draft')+action('儲存並套用','save-apply',true))});
  $('#modal').classList.add('cms-dialog');setDialog({type:'cms-editor',id:clone?null:id,sourceId:id,gameId,kind,revision:state.revision});updateEditor();
 }
 function readEditor(){
  const context=getDialog(),n=id=>Number($('#'+id)?.value),b=id=>Boolean($('#'+id)?.checked),v=id=>$('#'+id)?.value,game=data.games.find(g=>g.id===context.gameId);let settings;
  if(context.kind==='game'){
   const params=game.type==='電子遊戲'?{maxStages:n('cr-max-stages')}:game.type==='老虎機'?{paylines:n('cr-paylines')}:game.type==='捕魚'?{bullets:[0,1,2,3,4].map(i=>n('cr-bullet-'+i)),maxBullets:n('cr-max-bullets')}:{turnSeconds:n('cr-turn-seconds'),maxMultiplier:n('cr-max-multiplier')};
   settings={rtp:v('cr-rtp')===''?null:n('cr-rtp'),minBet:n('cr-min-bet'),maxBet:n('cr-max-bet'),maxWin:n('cr-max-win'),allowFreeRounds:b('cr-free'),params};
  }else{
   const base=defaultRuleSettings(data,getState(),context.gameId,'jackpot');settings={...base,funding:{seedAmount:n('cr-seed-amount'),providerCapitalShare:n('cr-provider-capital'),providerNetShare:n('cr-provider-net')},enabled:b('cr-enabled'),basis:v('cr-basis'),rate:n('cr-rate'),cap:n('cr-cap'),triggerType:v('cr-trigger'),eventCount:n('cr-event-count'),minBet:n('cr-min-bet'),minPool:n('cr-min-pool'),cooldown:n('cr-cooldown'),allowFreeRounds:b('cr-free'),payoutMode:v('cr-payout-mode'),payoutValue:n('cr-payout-value'),maxAward:n('cr-max-award'),retain:n('cr-retain'),insufficient:v('cr-insufficient')};
  }
  return {id:context.id,gameId:context.gameId,kind:context.kind,name:$('#cr-name').value.trim(),settings};
 }
 function updateEditor(){
  if(getDialog()?.type!=='cms-editor'||!$('[data-cms-editor]'))return;
  const c=getDialog(),row=readEditor();if(c.kind==='jackpot'){$('#cr-payout-value').disabled=row.settings.payoutMode==='game';$('#cr-event-count').disabled=row.settings.triggerType!=='gameEvent';enhance();}
  try{
   const errors=validateRule(data,c.gameId,c.kind,'試算',row.settings);if(errors.length)throw Error(errors.join('；'));const state=getState(),preview=rulePreviewContext(data,state,c.gameId,c.kind,row.settings,$('#cr-preview-site').value),{siteId,bet}=preview.input;let html,resultForFunding;
   if(c.kind==='jackpot'){
    const funding=splitPoolFunding(row.settings.funding);$('#cr-cash-capital').textContent=translate('現金網')+' '+(100-funding.providerCapitalShare).toFixed(2)+'%';$('#cr-cash-net').textContent=translate('現金網')+' '+(100-funding.providerNetShare).toFixed(2)+'%';$('#cms-funding-preview').innerHTML=[['遊戲商投入',funding.provider.initial],['現金網投入',funding.cash.initial]].map(([label,value])=>'<div><dt>'+translate(label)+'</dt><dd>'+money(value)+' USDT</dd></div>').join('');
    const current=assignedRule(state,c.gameId,siteId,'jackpot'),binding=current?.binding||{rate:null,contribute:true,canWin:true};
    const result=jackpotTrial(data,state,c.gameId,row.settings,binding,preview.input);
    resultForFunding=result;html='<div class="cms-trial-metrics">'+[['coins','本次提撥',result.contribution],['payout','本次派彩',result.award],['wallet','派後獎池餘額',result.after]].map(([icon,label,value])=>'<div>'+uiIcon(icon)+'<small>'+label+'</small><strong>'+money(value)+'</strong></div>').join('')+'</div><p class="cms-trial-outcome '+(result.triggered?'good':'')+'">'+e(translate(result.reasons.join('；')))+'</p><p class="mg-note">'+(result.rate!==undefined?translate('本次使用提撥比例')+' '+result.rate.toFixed(2)+'% · ':'')+translate('套用此現金網目前的個別提撥及中獎設定。')+'</p>';
   }else{
    const reasons=[],access=gameAccess(state,c.gameId,siteId);if(!access.canPlay)reasons.push('此現金網目前不可遊玩此遊戲');if(!Number.isFinite(bet)||bet<0||bet>row.settings.maxBet||bet>0&&bet<row.settings.minBet)reasons.push('投注超出此規則範圍');if(!bet&&!row.settings.allowFreeRounds)reasons.push('此規則不允許免費回合');
    const override=effectiveRtp(state,c.gameId,siteId),rtp=override.status==='active'?override.value:row.settings.rtp??state.games[c.gameId].defaultRtp;
    html='<div class="cms-trial-metrics"><div>'+uiIcon('check')+'<small>投注資格</small><strong>'+(reasons.length?'不符合':'符合')+'</strong></div><div>'+uiIcon('percent')+'<small>套用後 CMS RTP</small><strong>'+rtp.toFixed(2)+'%</strong></div></div><p class="cms-trial-outcome">'+e(translate(reasons.join('；')||'投注符合規則範圍'))+'</p><p class="mg-note">'+translate('RTP 是長期數學基準，試算不預測單局輸贏。')+'</p>';
   }
   if(c.kind==='jackpot'){const parts=splitPoolFunding(row.settings.funding,resultForFunding.contribution,resultForFunding.award);html+='<div class="cms-trial-metrics">'+[['遊戲商獎池盈虧',parts.provider.net],['現金網獎池盈虧',parts.cash.net]].map(([label,value])=>'<div>'+uiIcon('activity')+'<small>'+translate(label)+'</small><strong class="'+(value>0?'positive':value<0?'negative':'')+'">'+(value>0?'+':'')+money(value)+'</strong></div>').join('')+'</div>';}
   const basis=[['現金網',preview.siteName],['投注額',money(bet)+' USDT'],...(c.kind==='jackpot'?[['試算起始獎池',money(preview.input.balance)+' USDT（使用上方初始資金）'],['退款',money(preview.input.refund)+' USDT'],['事件次數',preview.input.eventCount+' 次'],['距離上次派彩',preview.input.elapsed+' 秒'+(preview.elapsedAssumed?'（模擬值）':'')],['事件回報派彩',money(preview.input.gameAward)+' USDT'],['遊戲事件',preview.eventDescription+'（'+(preview.input.eventMatched?'符合':'未符合')+'）']]:[])];
   $('#cms-trial-result').innerHTML='<p class="cms-preview-source">'+e(preview.siteName)+' · '+translate('投注額')+' '+money(bet)+' USDT <small>'+e(preview.sourceId?'模擬投注 '+preview.sourceId+' · '+preview.sampleTime:'預設模擬情境')+'</small></p>'+html+'<details class="cms-preview-basis"><summary>查看試算依據</summary><dl class="cms-summary">'+basis.map(([label,value])=>'<div><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>').join('')+'</dl></details>';localize($('#cms-trial-result'));
  }catch(error){$('#cms-trial-result').innerHTML='<p class="mg-error">'+e(translate(error.message))+'</p>';}
 }
 function saveDraft(apply=false){
  try{for(const element of $$('#modal [data-cms-editor] input[type=number]:not(:disabled),#cr-name'))if(!element.reportValidity())return;const context=getDialog(),state=fresh(context.revision),result=saveRuleDraft(data,state,readEditor());persist(result.state);closeDialog();renderMain();if(apply)showApply(result.id);else toast('草稿已儲存，現金網尚未變更');}catch(error){fail('#cms-editor-error',error.message);}
 }
 function showApply(id){
  const state=getState();showDialog('發布規則並套用現金網',ruleApplyHtml(data,state,id),{drawer:true,subtitle:'先確認版本與影響範圍，再發布及同步',footer:footer(action('發布並同步','publish',true))});$('#modal').classList.add('cms-dialog');setDialog({type:'cms-apply',id,revision:state.revision});updateTargets();
 }
 function updateTargets(){
  if(getDialog()?.type!=='cms-apply')return;const selected=$$('[data-cms-target]:checked'),visible=$$('[data-cms-target-row]:not([hidden]) [data-cms-target]'),selectedVisible=visible.filter(t=>t.checked),rule=getState().configuration.rules[getDialog().id],playable=selected.filter(t=>gameAccess(getState(),rule.gameId,t.dataset.cmsTarget).canPlay).length;
  $('#cms-apply-count').textContent=translate('已選 ')+selected.length+translate(' 家現金網')+' · '+playable+' '+translate('家可遊玩');$('#cms-target-all').checked=Boolean(visible.length&&selectedVisible.length===visible.length);$('#cms-target-all').indeterminate=selectedVisible.length>0&&selectedVisible.length<visible.length;
  $('[data-cms-action="publish"]').disabled=!selected.length;for(const row of $$('[data-cms-target-row]')){const checked=row.querySelector('[data-cms-target]').checked;for(const control of row.querySelectorAll('[data-cms-rate],[data-cms-contribute],[data-cms-win]'))control.disabled=!checked;}
 }
 function publish(){
  try{const context=getDialog(),state=fresh(context.revision),rule=state.configuration.rules[context.id],assignments=$$('[data-cms-target]:checked').map(t=>{const siteId=t.dataset.cmsTarget;return {siteId,...(rule.kind==='jackpot'?{rate:$('[data-cms-rate="'+siteId+'"]').value===''?null:Number($('[data-cms-rate="'+siteId+'"]').value),contribute:$('[data-cms-contribute="'+siteId+'"]').checked,canWin:$('[data-cms-win="'+siteId+'"]').checked}:{})};}),reason=$('#cms-publish-reason').value.trim();if(reason.length<2)throw Error('請填寫至少兩個字的發布原因');
   const next=publishRule(data,state,context.id,assignments,reason);persist(next);closeDialog();renderMain();const batch=next.configuration.batches[0];showSync(batch.id);runSync(batch.id);toast('CMS 版本已發布，開始同步現金網');
  }catch(error){fail('#cms-apply-error',error.message);}
 }
 function showSync(id='all'){showDialog('設定同步中心',syncView(data,getState(),id==='all'?null:id),{drawer:true,subtitle:'R&R CMS → 現金網 · 模擬同步結果'});setDialog({type:'cms-sync',id});}
 function showAssignments(id){showDialog('規則套用現金網',ruleAssignmentsView(data,getState(),id),{drawer:true,subtitle:'CMS 指定版本與現金網已套用版本'});setDialog({type:'cms-assignments',id});}
 function showSite(gameId,siteId){const previous=getDialog();showDialog('現金網設定快照',(previous?.type?.startsWith('cms-')?buttonBack():'')+siteConfigurationView(data,getState(),gameId,siteId),{drawer:true,subtitle:'唯讀 · 修改請回到 R&R CMS'});setDialog({type:'cms-site',gameId,siteId,previous});}
 const buttonBack=()=>'<div class="cms-sync-actions">'+action('返回上一層','back')+'</div>';
 function refresh(){
  const counts=syncCounts(getState().configuration);for(const label of $$('.cms-sync-summary'))label.textContent=translate('待同步 ')+(counts.pending+counts.applying)+' · '+translate('失敗 ')+counts.failed;
  for(const element of $$('[data-cms-applied-count]')){const state=getState(),rule=state.configuration.rules[element.dataset.cmsAppliedCount];if(rule)element.textContent=Object.values(state.configuration.applied[rule.gameId]).filter(s=>s[rule.kind]?.binding?.ruleId===rule.id).length+translate(' 家');}
  const d=getDialog();if($('#modal').open&&['cms-sync','cms-site','cms-assignments'].includes(d?.type)){const body=$('#modal .dialog-body'),scroll=body.scrollTop;body.innerHTML=d.type==='cms-sync'?syncView(data,getState(),d.id==='all'?null:d.id):d.type==='cms-assignments'?ruleAssignmentsView(data,getState(),d.id):buttonBack()+siteConfigurationView(data,getState(),d.gameId,d.siteId);localize(body);body.scrollTop=scroll;}
 }
 function runSync(id){
  if(running.has(id))return;running.set(id,true);
  setTimeout(()=>{try{persist(advanceSync(fresh(),id,'start'));}catch(error){toast(error.message);}},220);
  setTimeout(()=>{try{persist(advanceSync(fresh(),id,'finish'));}catch(error){toast(error.message);}finally{running.delete(id);}},850);
 }
 function handleClick(target){
  if(target.dataset.cmsNew){showEditor({gameId:target.dataset.cmsNew,kind:target.dataset.cmsKind});return true;}
  if(target.dataset.cmsEdit){showEditor({id:target.dataset.cmsEdit});return true;}
  if(target.dataset.cmsClone){showEditor({id:target.dataset.cmsClone,clone:true});return true;}
  if(target.dataset.cmsApply){showApply(target.dataset.cmsApply);return true;}
  if(target.dataset.cmsAssignments){showAssignments(target.dataset.cmsAssignments);return true;}
  if(target.dataset.cmsOpen){openManager(target.dataset.cmsKind||'game',target.dataset.cmsOpen);return true;}
  if(target.dataset.cmsSync){showSync(target.dataset.cmsSync);return true;}
  if(target.dataset.cmsSite){showSite(target.dataset.cmsGame,target.dataset.cmsSite);return true;}
  if(target.dataset.cmsRetry){try{const next=retrySync(fresh(),target.dataset.cmsRetry);persist(next);runSync(target.dataset.cmsRetry);}catch(error){toast(error.message);}return true;}
  if(target.dataset.cmsAction){const action=target.dataset.cmsAction;if(action==='cancel')closeDialog({animated:true});else if(action==='save-draft')saveDraft();else if(action==='save-apply')saveDraft(true);else if(action==='publish')publish();else if(action==='back'){const p=getDialog()?.previous;if(p?.type==='cms-sync')showSync(p.id);else if(p?.type==='cms-assignments')showAssignments(p.id);else showSync();}return true;}
  return false;
 }
 document.addEventListener('input',event=>{
  if(event.target.closest('[data-cms-editor]')){clearTimeout(previewTimer);previewTimer=setTimeout(updateEditor,160);}
  if(event.target.id==='cms-target-search'){const q=event.target.value.trim().toLocaleLowerCase();for(const row of $$('[data-cms-target-row]'))row.hidden=!row.dataset.cmsSearch.toLocaleLowerCase().includes(q);updateTargets();}
 });
 document.addEventListener('change',event=>{
  if(event.target.id==='cms-rule-game'){currentTab().ruleUI={gameId:event.target.value};renderMain();$('#cms-rule-game-trigger')?.focus({preventScroll:true});return;}
  if(event.target.closest('[data-cms-editor]'))updateEditor();
  if(event.target.id==='cms-target-all'){for(const checkbox of $$('[data-cms-target-row]:not([hidden]) [data-cms-target]'))checkbox.checked=event.target.checked;updateTargets();}
  else if(event.target.hasAttribute('data-cms-target'))updateTargets();
 });
 function installBanner(){const page=$('.management-page');if(page&&!page.querySelector('.cms-banner')){page.querySelector('.page-heading')?.insertAdjacentHTML('afterend',cmsBanner(getState()));localize(page.querySelector('.cms-banner'));}refresh();}
 function resume(){for(const batch of getState().configuration.batches)if(batch.targets.some(t=>['pending','applying'].includes(t.status)))runSync(batch.id);}
 return {handleClick,installBanner,refresh,runSync,resume,showSync,openManager};
}
