import {withOriginalCurrency} from './currency-display.js?v=14.5.0';
import {wagerOverview} from './game-wagers.js?v=14.5.2';
import {escape as e,money,signed,tone,totals,organizationRecords} from './core.js?v=14.5.0';
import {cashWrapper,cashWrapperName,organizationParents,organizationSections,optionalOrganizationParent} from './organization-hierarchy.js?v=14.4.9';
import {uiIcon} from './ui-icons.js?v=14.4.8';
import {gameIdentity} from './detail-views.js?v=14.5.3';
import {managementMetric as metric} from './game-management-view.js?v=14.5.3';
import {operationsTime} from './game-operations.js?v=14.5.2';
import {BUSINESS_SECTIONS,campaignTypes,businessStatus,businessOrganizations,campaignStatus,settlementPeriod,settlementPreview} from './business-management.js?v=14.5.0';
const button=(text,attrs,cls='')=>'<button class="button small '+cls+'" '+attrs+'>'+text+'</button>';
const badge=value=>'<span class="mg-status '+(['active','confirmed'].includes(value)?'good':['paused','review','held'].includes(value)?'gold':'')+'">'+e(businessStatus[value]||value)+'</span>';
const table=(headers,rows,empty='目前沒有資料')=>'<div class="biz-scroll" role="region" aria-label="資料列表" tabindex="0"><table class="biz-table"><thead><tr>'+headers.map(([h,n])=>'<th scope="col"'+(n?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>'+(rows.length?'':'<p class="biz-empty">'+empty+'</p>')+'</div>';
const td=(text,num=false,cls='')=>'<td class="'+(num?'num ':'')+cls+'">'+text+'</td>';
const field=(label,id,html)=>'<div class="field"><label for="'+id+'">'+label+'</label>'+html+'</div>';
const select=(id,choices,value)=>'<select id="'+id+'">'+choices.map(([v,label])=>'<option value="'+e(v)+'"'+(v===value?' selected':'')+'>'+e(label)+'</option>').join('')+'</select>';
const name=(orgs,id)=>orgs.find(o=>o.id===id)?.name||id;
const orgButton=(orgs,id)=>'<button class="text-link" data-org="'+e(id)+'">'+e(name(orgs,id))+'</button>';
const create=(type,label,extra='')=>button(uiIcon('plus')+label,'data-biz-new="'+type+'" '+extra,'primary');
function topTools(ui,extra=''){return '<div class="biz-toolbar">'+field('搜尋','biz-query','<input id="biz-query" value="'+e(ui.query||'')+'" placeholder="搜尋名稱或 ID" autocomplete="off">')+extra+'</div>';}
const matchesCampaignWager=(campaign,record)=>{
 const time=record.date+'T'+record.time;
 return campaign.sites.includes(record.cashId)&&campaign.games.includes(record.gameId)&&
   time>=campaign.start+':00'&&time<=campaign.end+':59';
};
const flowSteps=active=>'<ol class="biz-steps">'+[['draft','草稿'],['review','待覆核'],['confirmed','已確認']].map(([key,label])=>'<li class="'+(key===active?'active':'')+'">'+uiIcon(key==='confirmed'?'check':key==='review'?'shield':'receipt')+'<span>'+label+'</span></li>').join('')+'</ol>';
export function businessPage(data,state,category,section,ui={}){
 const orgs=businessOrganizations(data,state),q=(ui.query||'').trim().toLocaleLowerCase(),has=r=>!q||JSON.stringify(r).toLocaleLowerCase().includes(q),title=BUSINESS_SECTIONS[category].find(([key])=>key===section)[1];let metrics='',body='',tools='',action='';
 if(category==='promotion'){
  const items=state.campaigns.filter(r=>(!['rtp','free','bonus'].includes(section)||r.type===section)&&has(r)),active=items.filter(r=>campaignStatus(r)==='active');
  metrics=metric('promotion','活動數',items.length)+metric('check','啟用中',active.length)+metric('clock','草稿／暫停',items.filter(r=>['draft','paused'].includes(r.status)).length)+metric('coins','活動預算 · USDT',money(items.reduce((n,r)=>n+r.budget,0)));
  if(section==='logs'){const events=state.audit.filter(r=>r.module==='promotion'&&has(r));body=table([['時間 · UTC+8'],['活動'],['操作'],['操作原因'],['操作人']],events.map(r=>'<tr>'+td(operationsTime(r.at))+td(e(r.subject))+td(e(r.action))+td(e(r.reason),false,'biz-wrap')+td(e(r.actor))+'</tr>'),'尚無活動操作紀錄');}
  else{
   action=create('campaign','新增活動','data-biz-kind="'+(['rtp','free','bonus'].includes(section)?section:'rtp')+'"');
   tools=topTools(ui,field('活動狀態','biz-status',select('biz-status',[['','全部狀態'],['draft','草稿'],['active','啟用中'],['paused','已暫停'],['ended','已結束']],ui.status||'')));
   const shown=items.filter(r=>!ui.status||campaignStatus(r)===ui.status);
   const records=data.records.filter(r=>shown.some(campaign=>matchesCampaignWager(campaign,r)));
   body=wagerOverview(records,data.date,'活動範圍總投注額')+'<div class="biz-campaign-grid">'+shown.map(r=>{const status=campaignStatus(r),scheduled=status==='active'&&new Date()<new Date(r.start+'+08:00');return '<article class="biz-campaign-card"><div class="biz-card-title">'+uiIcon(r.type==='rtp'?'percent':r.type==='free'?'slot':'coins')+'<div><small>'+campaignTypes[r.type]+' · '+r.id+'</small><h2>'+e(r.name)+'</h2></div>'+badge(status)+'</div><p class="biz-dates">'+e(r.start.replace('T',' '))+' — '+e(r.end.replace('T',' '))+' · UTC+8'+(scheduled?' · 待開始':'')+'</p><div class="biz-values"><div><small>'+({rtp:'活動 RTP',free:'每人旋轉次數',bonus:'每人獎勵 · USDT'})[r.type]+'</small><strong>'+e(r.value)+(r.type==='rtp'?'%':r.type==='free'?' 次':'')+'</strong></div><div><small>預算 · USDT</small><strong>'+money(r.budget)+'</strong></div></div><div class="biz-scope">'+uiIcon('games')+r.games.length+' 款遊戲 <span>·</span>'+uiIcon('wallet')+r.sites.length+' 家現金網</div><div class="biz-card-actions">'+button('詳情','data-biz-detail="campaign" data-biz-id="'+r.id+'"')+button('編輯','data-biz-edit="campaign" data-biz-id="'+r.id+'"')+button(status==='active'?'暫停':'啟用示範','data-biz-campaign-status="'+r.id+'" data-biz-value="'+(status==='active'?'paused':'active')+'"'+(status==='ended'?' disabled':''))+'</div></article>';}).join('')+(shown.length?'':'<p class="biz-empty">沒有符合條件的活動</p>')+'</div>';
  }
 }else if(category==='merchant'){
  const level=organizationSections.find(([key])=>key===section)?.[1];
  const entities=orgs.filter(org=>!level||org.level===level).filter(has);
  const visibleCounts=section.startsWith('agents-')
    ? [['wallet','現金網'],['id','第一層代理'],['players','第二層代理']]
    : [['games','遊戲商'],['network','遊戲集成商'],['layers','包網商'],['wallet','現金網']];
  metrics=visibleCounts.map(([icon,label])=>metric(icon,label,orgs.filter(o=>o.level===label).length)).join('');
  if(section==='gateways')metrics=metric('api','API 中介',state.gateways.length)+metric('check','啟用中',state.gateways.filter(g=>g.status==='active').length)+metric('channels','已配置閘道機構',orgs.filter(o=>o.gatewayId).length);
  if(section==='gateways'){
   action=create('gateway','新增 API 中介');tools=topTools(ui);body=table([['名稱／ID'],['區域'],['端點'],['狀態'],['套用機構',true],['操作']],state.gateways.filter(has).map(r=>'<tr>'+td('<strong>'+e(r.name)+'</strong><small>'+r.id+'</small>')+td(e(r.region))+td('<code>'+e(r.url)+'</code>')+td(badge(r.status))+td(String(orgs.filter(o=>o.gatewayId===r.id).length),true)+td('<div class="biz-actions">'+button('使用機構','data-biz-detail="gateway" data-biz-id="'+r.id+'"')+button('編輯','data-biz-edit="gateway" data-biz-id="'+r.id+'"')+button('模擬連線測試','data-biz-test="'+r.id+'"')+'</div>')+'</tr>'));
  }else{
   const newLevels=level?[level]:['包網商','現金網'];
   action=newLevels.map(label=>create('org','新增'+label,'data-biz-level="'+e(label)+'"')).join('');
   tools=topTools(ui,field('狀態','biz-status',select('biz-status',[['','全部狀態'],['active','啟用中'],['disabled','停用']],ui.status||'')));
   body=table([['機構／ID'],['類型'],['上層機構'],['狀態'],['下層機構',true],['玩家',true],['投注 USDT',true],['GGR USDT',true],['操作']],entities.filter(o=>!ui.status||o.status===ui.status).map(o=>{const t=totals(organizationRecords(data.records,orgs,o.id));return '<tr>'+td(orgButton(orgs,o.id)+'<small>'+e(o.id)+'</small>')+td(e(o.level))+td(o.parent?orgButton(orgs,o.parent):'無上層機構')+td(badge(o.status))+td(String(orgs.filter(r=>r.parent===o.id).length),true)+td(String(t.players),true)+td(money(t.bet),true)+td(signed(-t.net),true,tone(-t.net))+td('<div class="biz-actions">'+button('詳情','data-org="'+o.id+'"')+(o.level!=='遊戲商'?button('編輯','data-biz-edit="org" data-biz-id="'+o.id+'"'):'')+'</div>')+'</tr>'; }));
  }
 }else{
  const range=settlementPeriod(data.date,ui.period||'week'),wrappers=orgs.filter(o=>o.level==='包網商'||o.level==='現金網'&&!cashWrapper(orgs,o)),previews=wrappers.map(o=>settlementPreview(data,state,o.id,range));
  metrics=metric('coins','投注 · USDT',money(previews.reduce((n,r)=>n+r.bet,0)))+metric('payout','派彩 · USDT',money(previews.reduce((n,r)=>n+r.payout,0)))+metric('profit','GGR · USDT','<span class="'+tone(previews.reduce((n,r)=>n+r.ggr,0))+'">'+signed(previews.reduce((n,r)=>n+r.ggr,0))+'</span>')+metric('receipt','結算單',state.statements.length);
  if(section==='rules'){
   action=create('commission','新增傭金規則');tools=topTools(ui);body=table([['規則／ID'],['計算基礎'],['比例',true],['套用現金網',true],['狀態'],['操作']],state.commissions.filter(has).map(r=>'<tr>'+td('<strong>'+e(r.name)+'</strong><small>'+r.id+'</small>')+td('正向 GGR × 傭金比例')+td(r.rate.toFixed(2)+'%',true)+td(String(r.sites.length),true)+td(badge(r.status))+td('<div class="biz-actions">'+button('規則詳情','data-biz-detail="commission" data-biz-id="'+r.id+'"')+button('編輯','data-biz-edit="commission" data-biz-id="'+r.id+'"')+'</div>')+'</tr>'));
  }else if(section==='pricing'){
   action=create('pricing','新增渠道費率');tools=topTools(ui);body=table([['包網商'],['成本費率',true],['報價費率',true],['費率差',true],['投注 USDT',true],['預估價差 USDT',true],['操作']],state.pricing.filter(r=>has({...r,name:name(orgs,r.wrapperId)})).map(r=>{const t=totals(organizationRecords(data.records,orgs,r.wrapperId));return '<tr>'+td(orgButton(orgs,r.wrapperId))+td(r.costRate.toFixed(2)+'%',true)+td(r.saleRate.toFixed(2)+'%',true)+td((r.saleRate-r.costRate).toFixed(2)+' pp',true)+td(money(t.bet),true)+td(money(t.bet*(r.saleRate-r.costRate)/100),true,'positive')+td(button('編輯費率','data-biz-edit="pricing" data-biz-id="'+r.id+'"'))+'</tr>'; }));
  }else if(section==='reports'){
   tools=topTools(ui,field('結算狀態','biz-status',select('biz-status',[['','全部狀態'],['draft','草稿'],['review','待覆核'],['confirmed','已確認'],['held','暫緩']],ui.status||'')));action=button(uiIcon('receipt')+'匯出 CSV','data-biz-export="statements"');
   const statements=state.statements.filter(r=>(!ui.status||r.status===ui.status)&&has({...r,name:name(orgs,r.orgId)}));body=table([['結算單'],['機構'],['期間'],['GGR USDT',true],['傭金 USDT',true],['遊戲商淨額 USDT',true],['狀態'],['操作']],statements.map(r=>'<tr>'+td(e(r.id))+td(orgButton(orgs,r.orgId))+td(r.start+' — '+r.end)+td(signed(r.ggr),true,tone(r.ggr))+td(money(r.commission),true)+td(signed(r.net),true,tone(r.net))+td(badge(r.status))+td(button('開啟結算單','data-biz-detail="statement" data-biz-id="'+r.id+'"'))+'</tr>'),'尚無結算單，可在 GGR 結算或週結／月結建立');
  }else{
   tools=topTools(ui,field('結算期間','biz-period',select('biz-period',[['week','週結'],['month','月結']],ui.period||'week')));body='<p class="biz-period">'+uiIcon('calendar')+range.start+' — '+range.end+' · USDT · UTC+8</p>'+table([['結算機構'],['投注 USDT',true],['派彩 USDT',true],['GGR USDT',true],['傭金 USDT',true],['遊戲商淨額 USDT',true],['操作']],previews.filter(r=>has({...r,name:name(orgs,r.orgId)})).map(r=>{const existing=state.statements.find(s=>s.orgId===r.orgId&&s.start===r.start&&s.end===r.end);return '<tr>'+td(orgButton(orgs,r.orgId))+td(money(r.bet),true)+td(money(r.payout),true)+td(signed(r.ggr),true,tone(r.ggr))+td(money(r.commission),true)+td(signed(r.net),true,tone(r.net))+td('<div class="biz-actions">'+button('查看試算','data-biz-preview="'+r.orgId+'"')+(existing?button('結算單','data-biz-detail="statement" data-biz-id="'+existing.id+'"'):button('建立結算單','data-biz-create-statement="'+r.orgId+'"'+(!r.count?' disabled':'')))+'</div>')+'</tr>'; }));
  }
 }
 return '<div class="page business-page"><div class="page-heading"><h1>'+title+'</h1><div class="biz-heading-actions">'+action+'<span class="badge">互動示範</span></div></div><div class="mg-metrics">'+metrics+'</div><section class="mg-surface">'+tools+body+'</section><p class="page-note">'+(category==='promotion'?'活動設定及啟停為本機示範，未實際變更 RTP 或發放獎勵。':category==='merchant'?'機構與連線設定為本機示範；新增現金網尚無遊戲部署，不會自動開放遊戲。':'示例規則試算 · GGR＝投注−派彩；傭金按各站正向 GGR 計算，遊戲商淨額＝GGR−傭金。未含稅費及其他合約調整，確認結算單不執行付款。')+'</p></div>';
}
function scopeSelect(label,group,items,selected=[]){return '<div class="field"><label for="be-'+group+'">'+label+'</label><select multiple data-search-multi data-placeholder="選擇'+label+'" id="be-'+group+'" name="be-'+group+'">'+items.map(([id,label,meta])=>'<option value="'+e(id)+'" data-meta="'+e(meta||'')+'"'+(selected.includes(id)?' selected':'')+'>'+e(label)+'</option>').join('')+'</select></div>';}
function assignedSitesTable(orgs,siteIds){return table([['現金網'],['現金網 ID'],['包網商'],['包網商 ID'],['狀態']],siteIds.map(id=>{const site=orgs.find(o=>o.id===id),wrapper=cashWrapper(orgs,site);return '<tr>'+td(orgButton(orgs,id))+td(e(id))+td(wrapper?orgButton(orgs,wrapper.id):'無包網商')+td(e(wrapper?.id||'—'))+td(badge(site.status))+'</tr>';}));}

function businessEditorContent(data,state,type,id,kind){
 const orgs=businessOrganizations(data,state),sites=orgs.filter(o=>o.level==='現金網'),wrappers=orgs.filter(o=>o.level==='包網商'),row=type==='org'?orgs.find(o=>o.id===id):state[({gateway:'gateways',campaign:'campaigns',commission:'commissions',pricing:'pricing'})[type]]?.find(r=>r.id===id),input=(key,value='',kind='text',attrs='')=>'<input class="mg-input" id="be-'+key+'" type="'+kind+'" value="'+e(value)+'" '+attrs+'>',f=(label,key,value,kind,attrs)=>field(label,'be-'+key,input(key,value,kind,attrs));let html='<div class="cms-form-grid">';
 if(type==='org'){
  const level=row?.level||kind||'現金網',parents=organizationParents(orgs,level),optional=optionalOrganizationParent(level),parentChoices=[...(optional?[['','無上層機構']]:[]),...parents.map(o=>[o.id,o.name+' · '+o.level+' · '+o.id])],parentValue=row?(row.parent||''):(optional?'':parents[0]?.id);
  html+=f('機構名稱','name',row?.name)+field('上層機構','be-parent',select('be-parent',parentChoices,parentValue).replace('<select ', '<select '+(row?'disabled ':'') ))+field('狀態','be-status',select('be-status',[['active','啟用中'],['disabled','停用']],row?.status||'active'));
  if(level!=='第一層代理'&&level!=='第二層代理'){
   html+=f('區域','region',row?.region||'亞洲')+field('API 中介','be-gateway',select('be-gateway',state.gateways.map(g=>[g.id,g.name]),row?.gatewayId||state.gateways[0]?.id))+f('幣別','currency','USDT','text','disabled');
  }
 }else if(type==='gateway')html+=f('中介名稱','name',row?.name)+f('HTTPS 端點','url',row?.url||'https://gateway.example.com/rr-api','url')+f('區域','region',row?.region||'亞太')+field('狀態','be-status',select('be-status',[['active','啟用中'],['paused','已暫停']],row?.status||'active'));
 else if(type==='campaign'){
  const ctype=row?.type||kind||'rtp';html+=f('活動名稱','name',row?.name)+field('活動類型','be-type',select('be-type',Object.entries(campaignTypes),ctype))+f('開始時間 · UTC+8','start',row?.start||'2026-11-03T00:00','datetime-local')+f('結束時間 · UTC+8','end',row?.end||'2026-11-30T23:59','datetime-local')+f('活動值：RTP %／旋轉次數／紅利 USDT','value',row?.value||(ctype==='rtp'?97:20),'number','min="0" step="0.01"')+f('預算 · USDT','budget',row?.budget||1000,'number','min="0" step="0.01"')+'</div>'+'<div class="biz-scope-selects">'+scopeSelect('參與遊戲','games',data.games.map(g=>[g.id,g.name,g.type]),row?.games||[])+scopeSelect('套用現金網','sites',sites.map(o=>[o.id,o.name,cashWrapperName(orgs,o)]),row?.sites||[])+'</div>'+'<p class="mg-note">編輯後儲存為草稿；活動啟停在活動列表操作。免費旋轉僅適用老虎機；實際 RTP 與遊戲參數仍由遊戲規則發布流程管理。</p><div>';
 }else if(type==='commission')html+=f('規則名稱','name',row?.name)+f('正向 GGR 傭金比例 · %','rate',row?.rate??15,'number','min="0" max="100" step="0.01"')+field('狀態','be-status',select('be-status',[['active','啟用中'],['disabled','停用']],row?.status||'active'))+'</div>'+'<div class="biz-scope-selects">'+scopeSelect('套用現金網','sites',sites.map(o=>[o.id,o.name,cashWrapperName(orgs,o)]),row?.sites||[])+'</div>'+'<div>';
 else if(type==='pricing')html+=field('包網商','be-wrapper',select('be-wrapper',wrappers.map(o=>[o.id,o.name]),row?.wrapperId||wrappers[0]?.id))+f('成本費率 · %','cost',row?.costRate??.5,'number','min="0" max="100" step="0.01"')+f('報價費率 · %','sale',row?.saleRate??.8,'number','min="0" max="100" step="0.01"')+'<p class="mg-note">按實扣投注額試算服務費率價差，與 RTP 及 GGR 傭金分開呈現。</p>';
 return html+'</div>'+reasonField();
}
export const reasonField=()=>'<label class="mg-label" for="be-reason">操作原因</label><textarea class="mg-input" id="be-reason" required minlength="2" maxlength="300" rows="2"></textarea><p class="mg-error" id="be-error" role="alert" hidden></p>';
export function settlementDetail(data,state,record,{statement=false}={}){
 const orgs=businessOrganizations(data,state);return '<div class="biz-detail-title">'+uiIcon('receipt')+'<div><h3>'+e(name(orgs,record.orgId))+'</h3><small>'+record.start+' — '+record.end+' · USDT</small></div>'+(statement?badge(record.status):'')+'</div>'+(statement?flowSteps(record.status):'')+'<div class="mg-metrics">'+metric('coins','投注 · USDT',money(record.bet))+metric('payout','派彩 · USDT',money(record.payout))+metric('profit','GGR · USDT','<span class="'+tone(record.ggr)+'">'+signed(record.ggr)+'</span>')+metric('wallet','遊戲商淨額 · USDT','<span class="'+tone(record.net)+'">'+signed(record.net)+'</span>')+'</div>'+table([['現金網'],['GGR USDT',true],['傭金比例',true],['傭金 USDT',true],['遊戲商淨額 USDT',true],['規則']],record.lines.map(r=>'<tr>'+td(orgButton(orgs,r.siteId))+td(signed(r.ggr),true,tone(r.ggr))+td(r.rate.toFixed(2)+'%',true)+td(money(r.commission),true)+td(signed(r.net),true,tone(r.net))+td(e(r.ruleId||'未配置'))+'</tr>'))+'<p class="mg-note">'+(statement?'金額與比例取自建立時的快照；後續修改費率不會改寫此單。':'試算尚未建立結算單。')+'負 GGR 不產生傭金；確認不執行付款。</p>'+(statement?'<div class="biz-actions">'+({draft:button('送交覆核','data-biz-statement-status="'+record.id+'" data-biz-value="review"'),review:button('確認示例結算','data-biz-statement-status="'+record.id+'" data-biz-value="confirmed"','primary')+button('暫緩','data-biz-statement-status="'+record.id+'" data-biz-value="held"'),held:button('重新送交覆核','data-biz-statement-status="'+record.id+'" data-biz-value="review"'),confirmed:'<span class="mg-status good">示例結算已確認</span>'})[record.status]+'</div>':'');
}
export function businessDetail(data,state,type,id){
 const orgs=businessOrganizations(data,state);if(type==='statement')return settlementDetail(data,state,state.statements.find(r=>r.id===id),{statement:true});
 if(type==='gateway'){const row=state.gateways.find(r=>r.id===id);return '<div class="biz-detail-title">'+uiIcon('api')+'<h3>'+e(row.name)+'</h3>'+badge(row.status)+'</div><p><code>'+e(row.url)+'</code></p>'+table([['套用機構'],['類型'],['狀態']],orgs.filter(o=>o.gatewayId===id).map(o=>'<tr>'+td(orgButton(orgs,o.id))+td(e(o.level))+td(badge(o.status))+'</tr>'));}
 if(type==='commission'){const row=state.commissions.find(r=>r.id===id);return '<h3>'+e(row.name)+'</h3><p>各現金網正向 GGR × '+row.rate.toFixed(2)+'%</p>'+assignedSitesTable(orgs,row.sites);}
 const row=state.campaigns.find(r=>r.id===id),records=data.records.filter(r=>matchesCampaignWager(row,r)),t=totals(records);
 return '<div class="biz-detail-title">'+uiIcon('promotion')+'<h3>'+e(row.name)+'</h3>'+badge(campaignStatus(row))+'</div><p>'+e(row.start.replace('T',' '))+' — '+e(row.end.replace('T',' '))+' · UTC+8</p>'+wagerOverview(records,data.date,'活動範圍總投注額')+'<div class="biz-values"><div><small>設定值</small><strong>'+(row.type==='bonus'?money(row.value):row.value)+(row.type==='rtp'?'%':row.type==='free'?' 次':' USDT')+'</strong></div><div><small>預算</small><strong>'+money(row.budget)+' USDT</strong></div></div><h3 class="cms-section-title">參與遊戲</h3><div class="biz-game-list">'+row.games.map(id=>{const game=data.games.find(g=>g.id===id);return '<button class="biz-game-item" data-game="'+e(game.name)+'">'+gameIdentity(game.name,44)+'</button>';}).join('')+'</div><h3 class="cms-section-title">套用現金網</h3>'+assignedSitesTable(orgs,row.sites)+'<p class="mg-note">活動期間、遊戲與現金網範圍內有 '+t.count+' 筆示例投注，'+t.players+' 位玩家；不代表實際參與、發放或 RTP 已套用。</p>'+(row.type==='rtp'?button('前往 RTP 設定檔','data-gm-section="rtp"'):'');
}

export function businessEditor(...args){return '<div data-currency-original>'+withOriginalCurrency(()=>businessEditorContent(...args))+'</div>';}
