import {organizationRecords,totals} from './core.js?v=14.4.1';
import {cashWrapper,DEMO_INTEGRATOR_ID,organizationParents,organizationSections,optionalOrganizationParent} from './organization-hierarchy.js?v=14.4.9';
export const BUSINESS_SECTIONS={promotion:[['center','活動中心'],['rtp','RTP 活動'],['free','免費旋轉'],['bonus','紅利／獎勵'],['logs','活動紀錄']],merchant:[['all','全部機構'],...organizationSections,['gateways','API 中介']],settlement:[['rules','傭金規則'],['pricing','渠道價差'],['ggr','GGR 結算'],['periods','週結／月結'],['reports','結算報表']]};
export const campaignTypes={rtp:'RTP 活動',free:'免費旋轉',bonus:'紅利／獎勵'};
export const businessStatus={draft:'草稿',active:'啟用中',paused:'已暫停',ended:'已結束',disabled:'停用',review:'待覆核',confirmed:'已確認',held:'暫緩'};
const clone=x=>JSON.parse(JSON.stringify(x)),round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function createBusinessState(data,raw={}){
 const sites=data.organizations.filter(o=>o.level==='現金網'),wrappers=data.organizations.filter(o=>o.level==='包網商'),direct=sites.filter(s=>!cashWrapper(data.organizations,s));
 const directExample={id:'ACT-DIRECT',name:'直營現金網回饋',type:'bonus',games:data.games.filter(g=>g.type==='電子遊戲').slice(0,2).map(g=>g.id),sites:direct.map(s=>s.id),start:data.date+'T00:00',end:'2026-11-30T23:59',value:30,budget:2000,status:'draft'};
 return {schema:1,revision:Number.isSafeInteger(raw?.revision)?raw.revision:0,entities:raw?.entities||[],orgConfig:raw?.orgConfig||{},gateways:raw?.gateways||[{id:'GW-APAC',name:'亞太遊戲閘道',url:'https://apac.example.com/rr-api',region:'亞太',status:'active'},{id:'GW-SEA',name:'東南亞遊戲閘道',url:'https://sea.example.com/rr-api',region:'東南亞',status:'active'},{id:'GW-DR',name:'備援遊戲閘道',url:'https://backup.example.com/rr-api',region:'備援',status:'paused'}],campaigns:raw?.campaigns?(direct.length&&!raw.campaigns.some(c=>c.id==='ACT-DIRECT')?[...raw.campaigns,directExample]:raw.campaigns):[
 {id:'ACT-001',name:'週末闖關回饋',type:'rtp',games:data.games.filter(g=>g.type==='電子遊戲').slice(0,2).map(g=>g.id),sites:sites.slice(0,4).map(s=>s.id),start:'2026-11-01T00:00',end:'2026-11-30T23:59',value:97,budget:10000,status:'active'},
 {id:'ACT-002',name:'翡翠免費旋轉',type:'free',games:data.games.filter(g=>g.type==='老虎機').slice(0,2).map(g=>g.id),sites:sites.slice(3,7).map(s=>s.id),start:'2026-11-01T00:00',end:'2026-11-30T23:59',value:20,budget:5000,status:'draft'},
 {id:'ACT-003',name:'新玩家紅利計畫',type:'bonus',games:data.games.slice(0,3).map(g=>g.id),sites:sites.slice(0,3).map(s=>s.id),start:'2026-11-01T00:00',end:'2026-11-30T23:59',value:50,budget:3000,status:'paused'},...(direct.length?[directExample]:[])],commissions:raw?.commissions||[{id:'COM-001',name:'標準正向 GGR 傭金',sites:sites.map(s=>s.id),rate:15,status:'active'}],pricing:raw?.pricing||wrappers.map((w,i)=>({id:'PRICE-'+w.id,wrapperId:w.id,costRate:.5,saleRate:.8+i*.05,status:'active'})),statements:raw?.statements||[],audit:raw?.audit||[]};
}
export function businessOrganizations(data,state){
 const demoIntegrator=data.organizations.find(org=>org.id===DEMO_INTEGRATOR_ID);
 return [...data.organizations,...state.entities].map(o=>{
  const gatewayId=o.level==='第一層代理'||o.level==='第二層代理'?null:'GW-APAC';
  const org={...o,status:'active',currency:'USDT',region:o.region||'亞洲',gatewayId,...state.orgConfig[o.id]};
  if(demoIntegrator&&org.level==='包網商'&&org.parent===demoIntegrator.parent){
   org.parent=o.parent;
  }
  org.name=data.organizationAliases?.[org.name]||org.name;
  return org;
 });
}
const reasonText=reason=>{reason=String(reason||'').trim();if(reason.length<2||reason.length>300)throw Error('請輸入 2–300 字的操作原因');return reason;};
const finite=(n,min,max,label)=>{if(n===null||n===undefined||String(n).trim()==='')throw Error('請填入'+label);n=Number(n);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出有效範圍');return n;};
const required=value=>{const s=String(value||'').trim();if(!s||s.length>100)throw Error('名稱須為 1–100 字');return s;};
function https(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.href;}catch{throw Error('請填入不含帳密的 HTTPS 網址');}}
function selected(values,valid,label){const chosen=[...new Set(values||[])];if(!chosen.length||chosen.some(id=>!valid.includes(id)))throw Error('請選擇有效的'+label);return chosen;}
function writeEvent(state,module,action,subject,before,after,reason,at){return {...state,revision:state.revision+1,audit:[{id:'BUS-'+(state.revision+1),module,source:'business',actor:'平台管理員',at,action,subject,before:clone(before),after:clone(after),reason},...state.audit]};}
export function saveBusinessRecord(data,state,type,id,values,reason,{revision=state.revision,at=new Date().toISOString()}={}){
 if(revision!==state.revision)throw Error('內容已由其他分頁更新，請重新開啟後確認');reason=reasonText(reason);
 const orgs=businessOrganizations(data,state),sites=orgs.filter(o=>o.level==='現金網'),next={...state};let before=null,after,module;
 if(type==='org'){
  before=id?orgs.find(o=>o.id===id):null;if(id&&!before)throw Error('找不到機構');
  const level=before?.level||values.level;
  if(!organizationSections.some(([,label])=>label===level))throw Error('請選擇機構類型');
  const parentId=String(values.parent||'').trim()||null;
  if(before&&parentId!==(before.parent||null))throw Error('既有機構的歷史隸屬關係不可直接移動');
  const parent=organizationParents(orgs,level).find(o=>o.id===parentId);
  if(parentId&&!parent||!parentId&&!optionalOrganizationParent(level))throw Error('上層機構不符合層級');
  const isAgent=level==='第一層代理'||level==='第二層代理';
  const gatewayId=isAgent?null:values.gatewayId;
  const region=isAgent?parent.region:required(values.region);
  if(!['active','disabled'].includes(values.status))throw Error('無效的機構狀態');
  if(!isAgent&&!state.gateways.some(g=>g.id===gatewayId))throw Error('請選擇 API 中介');
  const name=required(values.name);if(orgs.some(o=>o.id!==id&&(o.parent||null)===(parent?.id||null)&&o.level===level&&o.name===name))throw Error('相同層級已有此機構名稱');
  after={id:id||'ORG-'+(state.revision+1),name,level,parent:parent?.id||null,status:values.status,region,gatewayId,currency:'USDT'};
  if(id){next.orgConfig={...state.orgConfig,[id]:after};}else next.entities=[...state.entities,after];module='merchant';
 }else if(type==='gateway'){
  before=id?state.gateways.find(r=>r.id===id):null;if(id&&!before)throw Error('找不到 API 中介');
  if(!['active','paused'].includes(values.status))throw Error('無效的閘道狀態');after={id:id||'GW-'+(state.revision+1),name:required(values.name),url:https(values.url),region:required(values.region),status:values.status};next.gateways=id?state.gateways.map(r=>r.id===id?after:r):[...state.gateways,after];module='merchant';
 }else if(type==='campaign'){
  before=id?state.campaigns.find(r=>r.id===id):null;if(id&&!before)throw Error('找不到活動');if(!campaignTypes[values.type])throw Error('無效的活動類型');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.start)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.end)||values.start>=values.end||!Number.isFinite(Date.parse(values.start+'+08:00'))||!Number.isFinite(Date.parse(values.end+'+08:00')))throw Error('結束時間須晚於開始時間');
  const games=selected(values.games,data.games.map(g=>g.id),'遊戲'),chosen=selected(values.sites,sites.map(s=>s.id),'現金網');if(values.type==='free'&&games.some(id=>data.games.find(g=>g.id===id).type!=='老虎機'))throw Error('免費旋轉僅支援老虎機');
  const value=finite(values.value,values.type==='rtp'?80:1,values.type==='rtp'?100:100000,'活動值');if(values.type==='free'&&!Number.isInteger(value))throw Error('免費旋轉次數須為整數');
  after={id:id||'ACT-'+(state.revision+1),name:required(values.name),type:values.type,games,sites:chosen,start:values.start,end:values.end,value,budget:finite(values.budget,0,100000000,'預算'),status:'draft'};next.campaigns=id?state.campaigns.map(r=>r.id===id?after:r):[...state.campaigns,after];module='promotion';
 }else if(type==='commission'){
  before=id?state.commissions.find(r=>r.id===id):null;if(id&&!before)throw Error('找不到傭金規則');if(!['active','disabled'].includes(values.status))throw Error('無效的規則狀態');
  const chosen=selected(values.sites,sites.map(s=>s.id),'現金網');if(values.status==='active'&&state.commissions.some(r=>r.id!==id&&r.status==='active'&&r.sites.some(s=>chosen.includes(s))))throw Error('現金網已有啟用中的傭金規則，請先停用或調整原規則');
  after={id:id||'COM-'+(state.revision+1),name:required(values.name),sites:chosen,rate:finite(values.rate,0,100,'傭金比例'),status:values.status};next.commissions=id?state.commissions.map(r=>r.id===id?after:r):[...state.commissions,after];module='settlement';
 }else if(type==='pricing'){
  before=id?state.pricing.find(r=>r.id===id):null;if(id&&!before)throw Error('找不到渠道費率');if(!orgs.some(o=>o.id===values.wrapperId&&o.level==='包網商'))throw Error('請選擇包網商');if(state.pricing.some(r=>r.id!==id&&r.wrapperId===values.wrapperId))throw Error('此包網商已有渠道費率');
  const costRate=finite(values.costRate,0,100,'成本率'),saleRate=finite(values.saleRate,0,100,'報價率');if(saleRate<costRate)throw Error('報價率不可低於成本率');
  after={id:id||'PRICE-'+(state.revision+1),wrapperId:values.wrapperId,costRate,saleRate,status:'active'};next.pricing=id?state.pricing.map(r=>r.id===id?after:r):[...state.pricing,after];module='settlement';
 }else throw Error('不支援的設定類型');
 return writeEvent(next,module,(id?'編輯':'新增')+({org:'機構',gateway:'API 中介',campaign:'營運活動',commission:'傭金規則',pricing:'渠道費率'})[type],after.id,before,after,reason,at);
}
export function campaignStatus(campaign,now=new Date()){if(campaign.status==='active'&&now>=new Date(campaign.end+'+08:00'))return 'ended';return campaign.status;}
export function changeCampaignStatus(state,id,status,reason,{revision=state.revision,at=new Date().toISOString()}={}){
 if(revision!==state.revision)throw Error('活動已在其他分頁更新');const before=state.campaigns.find(r=>r.id===id);if(!before)throw Error('找不到活動');if(!['active','paused'].includes(status)||status===before.status)throw Error('無效的活動狀態');if(status==='active'&&new Date(before.end+'+08:00')<=new Date(at))throw Error('已過期的活動無法啟用，請先編輯活動期間');
 const after={...before,status},next={...state,campaigns:state.campaigns.map(r=>r.id===id?after:r)};return writeEvent(next,'promotion',status==='active'?'啟用活動示範':'暫停活動示範',id,before,after,reasonText(reason),at);
}
export function settlementPeriod(day,period='week'){const d=new Date(day+'T00:00:00Z'),start=new Date(d),end=new Date(d);if(period==='month'){start.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1,0);}else{start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);end.setUTCDate(start.getUTCDate()+6);}return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};}
export function settlementPreview(data,state,orgId,range){
 const organizations=businessOrganizations(data,state),org=organizations.find(o=>o.id===orgId);if(!org)throw Error('找不到結算機構');
 const scoped=organizationRecords(data.records.filter(r=>r.date>=range.start&&r.date<=range.end),organizations,orgId),siteIds=[...new Set(scoped.map(r=>r.cashId))];
 const lines=siteIds.map(siteId=>{const rs=scoped.filter(r=>r.cashId===siteId),t=totals(rs),rule=state.commissions.find(r=>r.status==='active'&&r.sites.includes(siteId)),ggr=round(t.bet-t.payout),commission=round(Math.max(0,ggr)*(rule?.rate||0)/100);return {siteId,bet:round(t.bet),payout:round(t.payout),ggr,rate:rule?.rate||0,ruleId:rule?.id||null,commission,net:round(ggr-commission),count:rs.length};});
 return {orgId,start:range.start,end:range.end,lines,...Object.fromEntries(['bet','payout','ggr','commission','net','count'].map(k=>[k,round(lines.reduce((n,r)=>n+r[k],0))]))};
}
export function createStatement(data,state,orgId,range,reason,{revision=state.revision,at=new Date().toISOString()}={}){
 if(revision!==state.revision)throw Error('結算設定已變更，請重新確認');if(!range.start||!range.end||range.start>range.end)throw Error('無效的結算期間');if(state.statements.some(r=>r.orgId===orgId&&r.start<=range.end&&r.end>=range.start))throw Error('此機構已有重疊期間的結算單，請開啟原結算單');
 const preview=settlementPreview(data,state,orgId,range);if(state.statements.some(r=>r.start<=range.end&&r.end>=range.start&&r.lines.some(line=>preview.lines.some(p=>p.siteId===line.siteId))))throw Error('此範圍內的現金網已有重疊期間結算單');if(!preview.count)throw Error('此期間沒有可結算的投注');const statement={...preview,id:'ST-'+(state.revision+1),status:'draft',createdAt:at},next={...state,statements:[statement,...state.statements]};return writeEvent(next,'settlement','建立結算單',statement.id,null,statement,reasonText(reason),at);
}
export function changeStatementStatus(state,id,status,reason,{revision=state.revision,at=new Date().toISOString()}={}){
 if(revision!==state.revision)throw Error('結算單已在其他分頁更新');const before=state.statements.find(r=>r.id===id);if(!before)throw Error('找不到結算單');if(!({draft:['review'],review:['confirmed','held'],held:['review'],confirmed:[]})[before.status]?.includes(status))throw Error('此結算狀態不允許此操作');const after={...before,status,updatedAt:at},next={...state,statements:state.statements.map(r=>r.id===id?after:r)};return writeEvent(next,'settlement','結算單：'+businessStatus[status],id,before,after,reasonText(reason),at);
}
