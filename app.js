import {money,signed,number,tone,financialTone,organizationRecords,escape as e,playerId,scenario,columnIndex,rowRecordId,defaultFilters,filterRecords,filterReportColumns,hasColumnFilter,visibleFreezeCount,totals,rowsFor,summaryFor,tableTotals,migrateWorkspace,sortedRows,csv,balances,fishingDetail,chessDetail,datePresetRange,detailTableTotals,defaultFreezeCount,selectionValues,matchesSelection,reconcileFilters} from './core.js?v=12.6';
import {gameIdentity,gameCards,trendChart,gameMetrics} from './detail-views.js?v=12.10';
import {localize,translate,languageNames} from './i18n.js?v=12.13';

import {uiIcon,metricIcon} from './ui-icons.js?v=12.6';
import {playerProfitLoss,playerSourceProfile} from './analytics.js?v=12.13';
import {statisticsDashboard} from './statistics-view.js?v=12.14';
import {captureChartState,animateCharts,cancelChartMotion} from './chart-motion.js?v=12.13';
import {chartTipAttrs,installChartInteractions} from './chart-interactions.js?v=12.10';
import {datePickerHtml,shiftMonth,dateRangeLabel} from './date-picker.js?v=12.6';
import {answerQuestion} from './assistant.js?v=12.6';
import {multiNames,multiFieldHtml,matchingChoices,multiOptionsHtml} from './filter-multi.js?v=12.6';
import {animateRegion,animateExit,cancelRegion} from './motion.js?v=12.6';
import {installSelectControls} from './select-control.js?v=12.6';

const DATA=await fetch('./data/demo-data.json?v=9').then(r=>{if(!r.ok)throw Error('資料載入失敗');return r.json();});
const defs=new Map(DATA.reports.map(d=>[d.key,d]));
const icons={dashboard:'6398b.svg',reports:'8ec9b.svg',promotion:'5783c.svg',jackpot:'a4bc9.svg',games:'e6435.svg',merchant:'7aa63.svg',players:'a24ad.svg',settlement:'59865.svg',system:'8a8c6.svg'};
const menus=[
 ['dashboard','儀表板',['總覽','遊戲表現','最近投注']],['reports','遊戲報表',DATA.reports.map(d=>d.title)],
 ['promotion','營運活動',['活動中心','RTP 活動','免費旋轉','紅利／獎勵','活動紀錄']],
 ['jackpot','累積獎池',['累積獎池列表','累積獎池規則','參與遊戲','中獎紀錄','累積獎池報表']],
 ['games','遊戲管理',['遊戲列表','遊戲分類','RTP 設定檔','遊戲上下架','版本管理','維護管理']],
 ['merchant','商戶與渠道',['全部機構','API 中介','包網商','現金網']],['players','玩家管理',[]],
 ['settlement','傭金與結算',['傭金規則','渠道價差','GGR 結算','週結／月結','結算報表']],
 ['system','系統管理',['帳號管理','API 金鑰','角色／權限','IP 白名單','API 日誌','系統設定','操作審計紀錄']]
];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const img=(file,alt='')=>'<img src="assets/figma/'+file+'" alt="'+e(alt)+'" loading="eager">';
const icon=file=>'<span class="icon" aria-hidden="true">'+img(file)+'</span>';
const button=(label,action,cls='',attrs='')=>'<button class="button '+cls+'" data-action="'+action+'" '+attrs+'>'+label+'</button>';
const storageKey='rr-cms-workspace-v1';
function tab(key='new',title='新增分頁'){return {id:crypto.randomUUID(),key,title:defs.get(key)?.title||title,filters:defaultFilters(),draft:defaultFilters(),columnFilters:{},sort:null,page:1,pageSize:50,statsView:'visual',shareMetric:'count',chartHidden:{},columns:defs.has(key)?defs.get(key).headers.map((_,i)=>i):[],freeze:defs.has(key)?defaultFreezeCount(defs.get(key)):0,scroll:{x:0,y:0,main:0}};}
let saved;
try{saved=JSON.parse(localStorage.getItem(storageKey));}catch{}
saved=migrateWorkspace(saved,DATA.reports);
let locale=languageNames[saved?.locale]?saved.locale:'zh-Hant';
const tr=text=>translate(text,locale);
const localized=root=>localize(root,locale);
let tabs=Array.isArray(saved?.tabs)&&saved.tabs.length?saved.tabs.filter(t=>t&&typeof t.id==='string'&&(defs.has(t.key)||t.key==='dashboard'||t.key==='new'||t.key.startsWith('draft:'))).map(t=>({...tab(t.key,t.title),...t,filters:{...defaultFilters(),...t.filters},draft:{...defaultFilters(),...t.draft}})):[tab('dashboard','儀表板')];
if(!tabs.length)tabs=[tab('dashboard','儀表板')];
for(const t of tabs)if(['electronic','chess'].includes(t.key))for(const field of ['filters','draft']){const game=DATA.games.find(g=>g.name===t[field].type);if(game){t[field].game=game.name;t[field].type=game.family;}}
let activeId=tabs.some(t=>t.id===saved?.activeId)?saved.activeId:tabs[0].id;
let detailTrail=[],detailRange={start:'2026-10-15',end:'2026-10-15'};
let category=currentKeyCategory(),submenuOpen=saved?.submenuOpen??true,languageOpen=false,dialogState=null,toastTimer;
const queryTimers=new Map();let columnTimer,composing=false,datePanel=null,multiPanel=null;
const filterCatalog=new Map();
let assistantOpen=false;const assistantMessages=[];
if(saved?.theme==='light')document.documentElement.dataset.theme='light';
function currentKeyCategory(){return tabs.find(t=>t.id===activeId)?.key==='dashboard'?'dashboard':'reports';}
const current=()=>tabs.find(t=>t.id===activeId)||tabs[0];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({schemaVersion:4,tabs,activeId,submenuOpen,locale,theme:document.documentElement.dataset.theme||'dark'}));}catch{}}
function toast(text){$('#toast').textContent=tr(text);$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function saveView(){const t=current(),v=$('.table-viewport');if(v)t.scroll={x:v.scrollLeft,y:v.scrollTop,main:$('#content').scrollTop};else t.scroll.main=$('#content').scrollTop;persist();}
function activate(id){saveView();activeId=id;if(defs.has(current().key))category='reports';else if(current().key==='dashboard')category='dashboard';closeDialog();render();animateRegion($('#content'));}
function openReport(key,{duplicate=false,filters=null}={}){
  saveView();let t=current().key==='new'?current():!duplicate?tabs.find(t=>t.key===key):null;
  if(!t){t=tab(key);tabs.push(t);}if(t.key==='new'){Object.assign(t,tab(key),{id:t.id});}
  if(filters){t.filters={...defaultFilters(),...filters};t.draft={...t.filters};t.page=1;t.scroll={x:0,y:0,main:0};}
  activeId=t.id;category='reports';submenuOpen=true;closeDialog();$('#app').classList.remove('mobile-open');render();animateRegion($('#content'));
}
function openDashboard({clear=false}={}){
 saveView();closeDialog();
 if(clear){for(const timer of queryTimers.values())clearTimeout(timer);queryTimers.clear();tabs=[];}
 let t=tabs.find(t=>t.key==='dashboard');if(!t){t=tab('dashboard','儀表板');tabs.push(t);}
 activeId=t.id;category='dashboard';submenuOpen=true;$('#app').classList.remove('mobile-open');render();animateRegion($('#content'));
}
function newTab(){saveView();const t=tab();tabs.push(t);activeId=t.id;closeDialog();render();animateRegion($('#content'));}
function closeTab(id){
  saveView();clearTimeout(queryTimers.get(id));queryTimers.delete(id);const i=tabs.findIndex(t=>t.id===id);if(i<0)return;tabs.splice(i,1);
  if(!tabs.length)tabs=[tab('dashboard','儀表板')];if(activeId===id)activeId=tabs[Math.max(0,i-1)]?.id||tabs[0].id;
  category=currentKeyCategory();closeDialog();render();
}
const navIcon=key=>uiIcon(({merchant:'channels',settlement:'wallet',system:'settings'})[key]||key);
function submenuIcon(label,def){
 const reportIcons={all:'receipt',electronic:'games',slots:'slot',fishing:'fish',chess:'cards',player:'players',stats:'reports'};
 return uiIcon(category==='dashboard'?({'總覽':'dashboard','遊戲表現':'reports','最近投注':'clock'})[label]:def?reportIcons[def.key]:/獎池|中獎/.test(label)?'jackpot':/帳號|玩家/.test(label)?'players':/權限|白名單|金鑰/.test(label)?'shield':/日誌|紀錄|記錄|報表/.test(label)?'receipt':/包網|現金網|機構|API|渠道/.test(label)?'channels':/遊戲|RTP/.test(label)?'games':/傭金|結算|價差/.test(label)?'wallet':/活動|紅利|免費/.test(label)?'promotion':'settings');
}
function renderRail(){
  $('#rail').innerHTML='<a class="brand" href="#dashboard" data-action="home" aria-label="R&R 儀表板">'+'<img src="assets/rr-logo.svg" alt="R&R" width="108" height="82">'+'</a><nav class="nav-categories">'+menus.map(([key,label])=>'<button class="category '+(category===key?'active':'')+'" data-category="'+key+'" aria-label="'+label+'" aria-expanded="'+(category===key&&submenuOpen)+'">'+navIcon(key)+'<span>'+label+'</span></button>').join('')+'</nav><div class="rail-footer"><button class="language-trigger" data-action="language" aria-expanded="'+languageOpen+'" aria-haspopup="menu">'+img('f6d64.svg')+'<span>繁體中文</span><span class="chevron">'+uiIcon('chevronDown')+'</span></button><small class="version">DEMO · 2026.10.21</small></div>';
  const trigger=$('.language-trigger');trigger.querySelector('span').textContent=languageNames[locale];trigger.title=languageNames[locale];
  let old=$('.language-menu');if(old)old.remove();
  if(languageOpen)document.body.insertAdjacentHTML('beforeend','<div class="language-menu" role="menu">'+Object.entries(languageNames).map(([code,name])=>'<button data-lang="'+code+'" role="menuitemradio" aria-checked="'+(locale===code)+'">'+(locale===code?'✓　':'　　')+(code==='vi'?'VN · ':code==='th'?'TH · ':'')+name+'</button>').join('')+'</div>');
  localized($('#rail'));
}
function openMenu({mobile=false}={}){const shell=$('#app');submenuOpen=true;shell.classList.remove('nav-closing','submenu-closed');if(mobile)shell.classList.add('mobile-open');renderRail();renderMenu();cancelRegion($('#rail'));animateRegion($('#submenu'),'submenu');if(mobile)animateRegion($('#rail'),'rail');persist();}
function closeMenu(){const shell=$('#app'),mobile=shell.classList.contains('mobile-open');submenuOpen=false;persist();renderRail();if(mobile)animateExit($('#rail'),'rail');else{shell.classList.add('nav-closing');shell.classList.add('submenu-closed');}animateExit($('#submenu'),'submenu',()=>{if(submenuOpen)return;shell.classList.add('submenu-closed');shell.classList.remove('mobile-open','nav-closing');});}
function closeLanguage(){languageOpen=false;$('.language-trigger')?.setAttribute('aria-expanded','false');const menu=$('.language-menu');if(menu)animateExit(menu,'popover',()=>menu.remove());}
function renderMenu(){
  const menu=menus.find(m=>m[0]===category);
  $('#submenu').innerHTML='<div class="submenu-head"><span>'+menu[1]+'</span><button class="icon-button close" data-action="collapse" aria-label="收合子選單">×</button></div><nav>'+menu[2].map((label,i)=>{
    const d=category==='reports'?DATA.reports[i]:null;
    return '<button title="'+e(label)+'" class="submenu-link '+(d&&current().key===d.key||category==='dashboard'&&label==='總覽'&&current().key==='dashboard'?'active':'')+'" '+(d?'data-report="'+d.key+'"':category==='dashboard'?(i===0?'data-action="home"':'data-report="'+(i===1?'stats':'all')+'"'):'data-draft="'+e(label)+'"')+'>'+submenuIcon(label,d)+'<span>'+label+'</span></button>';
  }).join('')+'</nav>';
  localized($('#submenu'));
  updateNavigationWidths();
}
function renderHeader(){
  $('#header').innerHTML='<button class="icon-button mobile-menu" data-action="mobile-menu" aria-label="開啟主選單">☰</button><div class="work-tabs" role="tablist" aria-label="工作分頁">'+tabs.map(t=>'<div class="work-tab '+(t.id===activeId?'active':'')+'" role="presentation"><button role="tab" class="work-tab-label" aria-selected="'+(t.id===activeId)+'" tabindex="'+(t.id===activeId?0:-1)+'" data-tab="'+t.id+'" title="'+e(t.title)+'">'+e(t.title)+'</button><button class="tab-close" data-close-tab="'+t.id+'" aria-label="關閉 '+e(t.title)+'">×</button></div>').join('')+'</div><button class="icon-button close-tabs" data-action="close-tabs" aria-label="關閉所有分頁" title="關閉所有分頁">'+uiIcon('closeTabs')+'</button><button class="add-tab" data-action="new-tab" aria-label="新增工作分頁" title="新增工作分頁">＋</button><div class="utilities"><button class="icon-button optional" data-action="search" aria-label="快速搜尋">'+icon('24459.svg')+'</button><button class="icon-button optional-small" data-action="apps" aria-label="頁面捷徑">'+icon('f04ae.svg')+'</button><button class="icon-button optional-small" data-action="notifications" aria-label="通知">'+icon('cac57.svg')+'<span class="notification-count">2</span></button><button class="icon-button" data-action="theme" aria-label="切換明暗外觀" title="切換明暗外觀">'+icon('7e997.svg')+'</button><button class="avatar" data-action="profile" aria-label="平台管理員帳號"><span>平台管理員</span>'+img('fbeb1.png','平台管理員')+'</button></div>';
}
const option=(value,label,selected)=>'<option value="'+e(value)+'" '+(value===selected?'selected':'')+'>'+e(label)+'</option>';
function selectField(label,name,choices,cls=''){
  const f=current().draft;
  if(multiNames.has(name)){filterCatalog.set(name,{label,choices});return multiFieldHtml(label,name,choices,f[name],multiPanel?.name===name);}
  return '<div class="field '+cls+'"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'">'+choices.map(x=>option(typeof x==='string'?x:x[0],typeof x==='string'?x:x[1],f[name]||'')).join('')+'</select></div>';
}
function textField(label,name,placeholder,cls=''){
  return '<div class="field '+cls+'"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" value="'+e(current().draft[name]||'')+'" placeholder="'+e(placeholder)+'" autocomplete="off"></div>';
}
function filtersHtml(def){
  filterCatalog.clear();const f=current().draft;
  const types=def.key==='chess'?[['','全部玩法'],['blackjack','21 點'],['bull','牛牛'],['landlord','鬥地主']]:[['','全部類型'],'電子遊戲','老虎機','捕魚','棋牌'];
  const typeLabel=def.key==='chess'?'棋牌玩法':def.key==='fishing'?'房間／場次':def.key==='electronic'?'玩法':'遊戲類型';
  const rooms=[...new Set(DATA.records.filter(r=>r.kind==='捕魚'&&matchesSelection(f.game,[r.game])).map(r=>r.room))];
  const gameSelect=def.key==='fishing'?selectField(typeLabel,'room',[['','全部場次'],...rooms]):
    def.key==='electronic'?selectField(typeLabel,'type',[['','全部玩法'],['progression','闖關加碼']]):
    def.key==='slots'?selectField('旋轉類型','event',[['','全部旋轉'],['免費旋轉','免費旋轉'],['獎勵','獎勵事件'],['累積獎池','累積獎池']]):
    selectField(typeLabel,'type',types);
  let extra='';
  if(def.key==='electronic')extra=selectField('觸發事件','event',[['','全部事件'],['收取','主動收取'],['失敗','闖關失敗'],['追加','追加下注'],['獎池觸發','獎池觸發']])+selectField('結束原因','endReason',[['','全部原因'],'玩家主動收取','闖關失敗'])+selectField('難度','difficulty',[['','全部難度'],'一般','困難'])+selectField('最高倍率','multiplier',[['','不限倍率'],['high','≥ 1.50×'],['low','< 1.50×']])+selectField('結算／對帳','recon',[['','全部狀態'],'已核對','補單已核對']);
  if(def.key==='fishing')extra=textField('魚種／魚隻實例 ID','fish','例如 F9006')+textField('射擊 ID','shot','例如 SH-0301-090')+selectField('道具／技能','tool',[['','全部類型'],'雷射炮',['無道具','無道具']])+selectField('觸發事件','event',[['','全部事件'],['雷射炮','雷射炮'],['金龍','首領事件'],['獎池觸發','獎池觸發'],['未捕獲','未捕獲']])+selectField('結算／對帳','recon',[['','全部狀態'],'已核對','補單已核對']);
  const category={electronic:'電子遊戲',slots:'老虎機',fishing:'捕魚',chess:'棋牌'}[def.key];
  const games=DATA.games.filter(g=>(!category||g.type===category)&&matchesSelection(f.type,[g.type,g.family,g.name]));
  return '<form id="query-form" class="filters">'+dateToolbar(f)+'<div class="filter-row">'+selectField('包網商','wrapper',[['','全部包網商'],...DATA.organizations.filter(o=>o.level==='包網商').map(o=>[o.id,o.name])])+selectField('商戶／站點','merchant',[['','全部站點'],...DATA.organizations.filter(o=>o.level==='現金網'&&matchesSelection(f.wrapper,[o.parent])).map(o=>[o.name,o.name])])+gameSelect+selectField('遊戲名稱','game',[['','全部遊戲'],...games.map(g=>[g.name,g.name])])+textField('投注單號／玩家','query','輸入單號、帳號或玩家 ID','search')+'<div class="field currency"><label for="currency">幣別</label><select id="currency" aria-label="幣別"><option>USDT</option></select></div><div class="field filter-reset"><label class="filter-live" role="status">即時篩選</label><button class="button" type="button" data-action="reset">重設</button></div></div>'+(extra?'<div class="filter-row extra-filters">'+extra+'</div>':'')+'</form>';
}
function metricCard(label,value){return '<div class="summary-card"><span class="metric-icon">'+uiIcon(metricIcon(label))+'</span><div class="metric-copy"><p class="summary-label">'+e(label)+'</p><p class="summary-number '+financialTone(label,value)+'">'+e(value)+'</p></div></div>';}
function summaryHtml(def,rs){return '<div class="summary">'+summaryFor(def,rs).map(([label,value])=>metricCard(label,value)).join('')+'</div>';}
function statsViewControl(){const mode=current().statsView||'visual';return '<div class="view-toggle" role="group" aria-label="統計呈現方式">'+[['visual','視覺總覽'],['table','傳統表格']].map(([v,label])=>'<button data-stats-view="'+v+'" aria-pressed="'+(v===mode)+'">'+uiIcon(v==='visual'?'dashboard':'receipt')+label+'</button>').join('')+'</div>';}
function getReport(){
  const t=current(),d=defs.get(t.key),base=filterRecords(DATA.records,t.key,t.filters),result=filterReportColumns(d,base,t.columnFilters,tr);
  return {t,d,rs:result.records,rows:sortedRows(result.rows,t.sort)};
}
function linkCell(d,row,index,text){
  if(index===d.headers.length-1)return '<button class="detail-link" data-row-detail="'+e(rowId(d,row))+'">'+e(text)+'</button>';
  if(d.key==='stats'&&d.headers[index]==='玩家 ID')return text.split('、').map(id=>'<button class="text-link" data-player="'+e(DATA.records.find(r=>playerId(r.player)===id)?.player||id)+'">'+e(id)+'</button>').join('、');
  if(d.headers[index].includes('玩家帳號')||d.headers[index].includes('玩家 ID')){
    const name=d.key==='player'?row[0]:d.key==='slots'?row[1]:row[2];
    return '<button class="text-link" data-player="'+e(name)+'">'+e(text)+'</button>';
  }
  if(d.headers[index]==='供應商')return '<button class="text-link" data-org="PROV-RR">'+e(text)+'</button>';
  if(d.headers[index]==='商戶／站點'){const org=DATA.organizations.find(o=>o.name===text);if(org)return '<button class="text-link" data-org="'+org.id+'">'+e(text)+'</button>';}
  if(d.headers[index]==='遊戲名稱')return '<button class="text-link" data-game="'+e(text)+'">'+e(text)+'</button>';
  if(d.headers[index].includes('投注單號')||d.headers[index].includes('結算單號'))return '<button class="text-link" data-record="'+e(text)+'">'+e(text)+'</button>';
  return e(text);
}
function rowId(d,row){return d.key==='player'?'player:'+row[0]:d.key==='stats'?'stats:'+row[0]:rowRecordId(d,row);}
const isNumeric=(d,i)=>['money','signed','number'].includes(d.columnTypes[i])||/倍率|倍數|排行/.test(d.headers[i]);
const filterIcon='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14l-5.4 6.3V16l-3.2-1.7v-4L3 4Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
function columnFilterDescription(d,index,rule){
  return [rule.query?'包含「'+rule.query+'」':'',Array.isArray(rule.values)?'已選 '+rule.values.length+' 項':'',rule.min!==undefined&&rule.min!==''?'≥ '+rule.min:'',rule.max!==undefined&&rule.max!==''?'≤ '+rule.max:''].filter(Boolean).join('；');
}
const widthCache=new Map(),measureContext=document.createElement('canvas').getContext('2d');
function reportColumnWidth(d,col,rows){const font=getComputedStyle(document.body).fontFamily,measure=(value,size)=>{const text=tr(value),key=locale+'|'+size+'|'+font+'|'+text;if(!widthCache.has(key)){measureContext.font=size+'px '+font;widthCache.set(key,measureContext.measureText(text).width);}return widthCache.get(key);};return Math.ceil(Math.max(d.widths[col],measure(d.headers[col],12)+106,...rows.map(row=>measure(row[col],13)+40)));}
function tableHtml(d,rs,rows){
  const t=current(),visible=t.columns.filter(i=>i>=0&&i<d.headers.length);
  if(!visible.length)t.columns=[0];
  const cols=visible.length?visible:[0],viewportWidth=Math.max(0,($('#content').clientWidth||innerWidth)-(innerWidth<760?64:232));
  const freeze=visibleFreezeCount(cols.map(i=>reportColumnWidth(d,i,rows)),t.freeze,viewportWidth);
  let left=0;
  const style=cols.map((col,i)=>{const width=reportColumnWidth(d,col,rows),x={width,left:i<freeze?left:null,last:i===freeze-1};left+=width;return x;});
  const tableWidth=style.reduce((n,c)=>n+c.width,0);
  const pageCount=Math.max(1,Math.ceil(rows.length/t.pageSize));t.page=Math.max(1,Math.min(t.page,pageCount));
  const pageRows=rows.slice((t.page-1)*t.pageSize,t.page*t.pageSize);
  const tdStyle=(st,i)=>' style="width:'+st.width+'px;min-width:'+st.width+'px;'+(st.left!==null?'left:'+st.left+'px;':'')+'"';
  const heads=cols.map((col,i)=>'<th scope="col" data-column="'+col+'" aria-sort="'+(t.sort?.index===col?(t.sort.direction==='asc'?'ascending':'descending'):'none')+'" class="'+(isNumeric(d,col)?'num ':'')+(style[i].left!==null?'frozen ':'')+(style[i].last?'freeze-end ':'')+(t.sort?.index===col?'sorted ':'')+(hasColumnFilter(t.columnFilters[col])?'filtered':'')+'"'+tdStyle(style[i],i)+'><div class="header-content"><button data-sort="'+col+'" title="'+e(tr(d.headers[col]))+'"><span class="header-label">'+e(d.headers[col])+'</span><span class="sort-mark">'+(t.sort?.index===col?(t.sort.direction==='asc'?'↑':'↓'):'↕')+'</span></button><button class="column-trigger" data-column-menu="'+col+'" title="'+e(tr('欄位操作：'+d.headers[col]))+'" aria-label="'+e(tr('欄位操作：'+d.headers[col]))+'" aria-haspopup="dialog">'+(col===d.headers.length-1?'⋯':filterIcon)+'<span class="filter-dot" aria-hidden="true"></span></button></div></th>').join('');
  const totalsRow=tableTotals(d,rs,rows);
  const total='<tr class="totals-row" aria-label="查詢結果合計">'+cols.map((col,i)=>'<td title="'+e(totalsRow[col]||'此欄不適用加總')+'" class="'+(isNumeric(d,col)?'num ':'')+(style[i].left!==null?'frozen ':'')+(style[i].last?'freeze-end ':'')+financialTone(d.headers[col],totalsRow[col])+'"'+tdStyle(style[i],i)+'>'+e(totalsRow[col])+'</td>').join('')+'</tr>';
  const body=pageRows.map(row=>'<tr>'+cols.map((col,i)=>'<td title="'+e(tr(row[col]))+'" class="'+(isNumeric(d,col)?'num ':'')+(style[i].left!==null?'frozen ':'')+(style[i].last?'freeze-end ':'')+financialTone(d.headers[col],row[col])+'"'+tdStyle(style[i],i)+'>'+linkCell(d,row,col,row[col])+'</td>').join('')+'</tr>').join('');
  const note=rows.length?'顯示 '+((t.page-1)*t.pageSize+1)+'–'+Math.min(rows.length,t.page*t.pageSize)+' 筆，共 '+rows.length+' 筆 · USDT · 表頭漏斗可搜尋、篩選與凍結欄位':'符合條件的記錄為 0 筆';
  const chips=Object.entries(t.columnFilters).filter(([,r])=>hasColumnFilter(r)).map(([col,r])=>'<button class="filter-chip" data-column-menu="'+col+'" title="'+e(tr(columnFilterDescription(d,Number(col),r)))+'">'+e(d.headers[col])+' · '+e(columnFilterDescription(d,Number(col),r))+'</button><button class="chip-remove" data-clear-column="'+col+'" aria-label="'+e(tr('清除此欄篩選：'+d.headers[col]))+'">×</button>').join('');
  const filterBar='<div class="column-filter-bar"><span class="freeze-status" data-freeze-status>'+freezeDescription(t.freeze,freeze)+'</span>'+(chips?'<div class="active-column-filters">'+chips+'</div>'+button('清除欄位篩選','column-clear-all','text-button'):'<span class="muted">表頭漏斗可搜尋、篩選與凍結欄位</span>')+'</div>';
  return '<section class="report-card" aria-label="報表資料"><div class="table-toolbar"><h2>'+e(d.title.replace('記錄','明細'))+' · USDT</h2><div class="table-actions">'+button('機構總覽','organizations','small')+button('欄位設定','columns','small')+button('匯出 CSV','export','small','title="匯出目前篩選結果的所有頁與可見欄位"')+'</div></div>'+filterBar+'<div class="table-frame"><div class="table-viewport" tabindex="0" aria-label="可橫向與縱向捲動的報表"><table class="report-table" style="width:'+tableWidth+'px"><colgroup>'+cols.map((col,i)=>'<col style="width:'+style[i].width+'px">').join('')+'</colgroup><thead><tr>'+heads+'</tr>'+total+'</thead><tbody>'+body+'</tbody></table>'+(rows.length?'':'<div class="empty-state"><h2>沒有符合條件的記錄</h2><p>請調整日期、玩家或其他篩選條件。</p>'+button('重設篩選','reset','primary')+'</div>')+'</div><span class="freeze-divider" aria-hidden="true" hidden></span></div><p class="table-note">'+note+'<br>合計涵蓋全部篩選結果；玩家與遊戲數去重，倍率、餘額及累積盈虧不相加。獎池派彩已含在結算派彩內。</p><div class="pagination"><label class="page-size">每頁 <select id="page-size" aria-label="每頁筆數">'+[10,20,50,100].map(n=>option(String(n),n,t.pageSize+'')).join('')+'</select> 筆</label><div class="page-controls"><button data-page="'+(t.page-1)+'" '+(t.page===1?'disabled':'')+'>上一頁</button>'+Array.from({length:pageCount},(_,i)=>'<button class="'+(t.page===i+1?'current':'')+'" data-page="'+(i+1)+'" aria-label="第 '+(i+1)+' 頁" '+(t.page===i+1?'aria-current="page"':'')+'>'+(i+1)+'</button>').join('')+'<button data-page="'+(t.page+1)+'" '+(t.page===pageCount?'disabled':'')+'>下一頁</button></div></div></section>';
}
function distribution(rs){
  const types=['電子遊戲','老虎機','捕魚','棋牌'],values=types.map(k=>totals(rs.filter(r=>r.kind===k)).bet),max=Math.max(...values,1),total=values.reduce((a,b)=>a+b,0);
  return '<section class="distribution"><h2>投注額分布（USDT）</h2><div class="distribution-grid" data-chart-scope>'+types.map((k,i)=>'<div class="distribution-item"'+chartTipAttrs(k,[{label:'實扣投注',value:money(values[i])+' USDT'},{label:'投注佔比',value:(total?values[i]/total*100:0).toFixed(1)+'%'}],{focusable:true})+'><span>'+k+' '+money(values[i])+'</span><div class="track"><div class="bar" style="width:'+values[i]/max*100+'%"></div></div></div>').join('')+'</div></section>';
}
function chooser(){return '<div class="page"><div class="page-heading"><div><h1>新增工作分頁</h1><p class="breadcrumb">選擇報表，開始新的查詢</p></div><span class="badge">USDT · 模擬資料</span></div><div class="chooser-grid">'+DATA.reports.map(d=>'<button class="chooser-card" data-report="'+d.key+'">'+icon(d.icon)+'<span>'+d.title+'<small>獨立保存篩選、排序、頁碼及欄位</small></span></button>').join('')+'</div></div>';}
function renderContent(){
  const t=current();
  if(t.key==='dashboard'){const rs=DATA.records;$('#content').innerHTML='<div class="page dashboard-page"><div class="page-heading"><div><h1>營運總覽</h1><p class="breadcrumb">2026/10/15 · USDT · UTC+8</p></div><span class="badge">模擬資料</span></div><div class="dashboard-shortcuts">'+button(uiIcon('receipt')+'所有遊戲投注記錄','open-all')+'<button class="button" data-report="stats">'+uiIcon('reports')+'遊戲統計</button></div>'+summaryHtml(defs.get('all'),rs)+statisticsDashboard(rs,t.filters,t.shareMetric,t.chartHidden)+'</div>';return;}
    if(t.key==='new'){$('#content').innerHTML=chooser();return;}
  if(!defs.has(t.key)){$('#content').innerHTML='<div class="page"><div class="page-heading"><div><h1>'+e(t.title)+'</h1><p class="breadcrumb">'+menus.find(m=>m[0]===category)?.[1]+' / '+e(t.title)+'</p></div><span class="badge">導覽示意</span></div><section class="generic-page"><h2>此頁內容待後續規劃</h2><p class="muted">目前 Demo 優先提供完整的遊戲報表與模擬明細。</p>'+button('開啟所有遊戲投注記錄','open-all','primary')+'</section></div>';return;}
  const {d,rs,rows}=getReport();
  $('#content').innerHTML='<div class="page"><div class="page-heading"><div><h1>'+e(d.title)+'</h1><p class="breadcrumb">遊戲報表 / '+e(d.title)+'</p></div><span class="badge">模擬資料</span></div>'+filtersHtml(d)+summaryHtml(d,rs)+(d.key==='stats'?statsViewControl():'')+(d.key==='stats'&&t.statsView!=='table'?statisticsDashboard(rs,t.filters,t.shareMetric,t.chartHidden):tableHtml(d,rs,rows))+'<p class="page-note">模擬資料 · USDT · UTC+8 · 派彩含本金；玩家淨盈虧＝派彩−實扣投注（示例無退款／費用）。各頁使用同一組資料。</p></div>';
}
function render({keepMulti=false}={}){
  const previousCharts=captureChartState($('#content'));
  chartInteractions.hide();
  if(!keepMulti)closeMulti();
  document.documentElement.lang=locale;
  if(submenuOpen){$('#app').classList.remove('nav-closing');cancelRegion($('#submenu'));cancelRegion($('#rail'));}
  $('#app').classList.toggle('submenu-closed',!submenuOpen);renderRail();renderMenu();renderHeader();renderContent();persist();
  document.documentElement.lang=locale;localized($('#app'));updateNavigationWidths();
  selectControls.enhance();document.title=tr(current().title||'遊戲報表')+' · R&R CMS Demo';renderAssistant();
  animateCharts($('#content'),previousCharts,tr);
  if(defs.has(current().key)||current().key==='dashboard')history.replaceState(null,'','#'+current().key);
  requestAnimationFrame(()=>{
    const t=current(),v=$('.table-viewport');if(v){v.scrollLeft=t.scroll.x;v.scrollTop=t.scroll.y;}
    $('#content').scrollTop=t.scroll.main;
    const active=$('.work-tab.active');if(active)active.scrollIntoView({block:'nearest',inline:'nearest'});
    alignHeader();
    updateFrozenColumns();
  });
}
function alignHeader(){const page=$('.page');if(page)$('#header').style.width=page.getBoundingClientRect().width+'px';updateReportHeight();}
// Measure localized labels at their rendered font size, including fonts loaded later.
function updateNavigationWidths(){
  const shell=$('#app'),rail=$('#rail'),submenu=$('#submenu');if(!rail?.children.length||!submenu?.children.length)return;
  const context=document.createElement('canvas').getContext('2d');
  const textWidth=node=>{if(!node)return 0;context.font=getComputedStyle(node).font;return context.measureText(node.textContent.trim()).width;};
  const widest=Math.max(0,...$$('.category>span').map(textWidth));
  const primary=Math.max(120,Math.ceil(widest+26));
  const longest=Math.max(0,...$$('.submenu-link>span').map(textWidth));
  const heading=textWidth($('.submenu-head>span'))+40+12;
  const padding=(parseFloat(getComputedStyle(submenu).getPropertyValue('--submenu-side-padding'))||16)*2;
  const desired=Math.max(188+padding,Math.ceil(Math.max(longest+62,heading)+padding));
  const available=innerWidth<=760?innerWidth-primary-16:Math.max(188+padding,innerWidth-primary-400);
  const secondary=Math.max(120,Math.min(desired,308+padding,available));
  for(const [name,value]of [['--rail',primary],['--submenu',secondary]])if(shell.style.getPropertyValue(name)!==value+'px')shell.style.setProperty(name,value+'px');
}
window.addEventListener('resize',updateNavigationWidths);
document.fonts.addEventListener('loadingdone',updateNavigationWidths);
function updateReportHeight(){
  const content=$('#content'),page=$('.page'),card=$('.report-card'),viewport=$('.table-viewport');
  if(!page||!card||!viewport)return;
  const view=viewport.getBoundingClientRect(),report=card.getBoundingClientRect();
  const top=view.top-content.getBoundingClientRect().top+content.scrollTop;
  const below=report.bottom-view.bottom+page.getBoundingClientRect().bottom-report.bottom;
  viewport.style.maxHeight=Math.max(240,Math.floor(content.clientHeight-top-below))+'px';
}
function freezeDescription(requested,visible){return requested?'凍結左側 '+requested+' 欄'+(visible<requested?'（此寬度顯示 '+visible+' 欄）':''):'未凍結欄位';}
const frozenSignatures=new WeakMap();
function updateFrozenColumns(){
  const viewport=$('.table-viewport'),table=$('.report-table');if(!viewport||!table)return;
  const t=current(),widths=Array.from(table.tHead.rows[0].cells,cell=>cell.getBoundingClientRect().width),count=visibleFreezeCount(widths,t.freeze,viewport.clientWidth),signature=t.freeze+'|'+count+'|'+widths.join('|');
  const divider=viewport.parentElement.querySelector('.freeze-divider');
  if(divider){divider.hidden=!count||count===widths.length||table.scrollWidth<=viewport.clientWidth+1||!table.tBodies[0]?.rows.length;divider.style.left=widths.slice(0,count).reduce((sum,width)=>sum+width,0)+'px';divider.style.height=Math.min(viewport.clientHeight,table.offsetHeight)+'px';}
  if(frozenSignatures.get(table)===signature)return;frozenSignatures.set(table,signature);
  for(const row of table.rows){let left=0;Array.from(row.cells).forEach((cell,i)=>{cell.classList.toggle('frozen',i<count);cell.classList.toggle('freeze-end',i===count-1);cell.style.left=i<count?left+'px':'';left+=widths[i];});}
  const status=$('[data-freeze-status]');if(status)status.textContent=tr(freezeDescription(t.freeze,count));
}
function fitReportColumns(){const table=$('.report-table');if(!table||!defs.has(current().key))return;widthCache.clear();const {d,rows}=getReport(),cols=current().columns.filter(i=>i>=0&&i<d.headers.length),widths=cols.map(i=>reportColumnWidth(d,i,rows));table.style.width=widths.reduce((s,v)=>s+v,0)+'px';for(const row of table.rows)if(row.cells.length===widths.length)Array.from(row.cells).forEach((cell,i)=>{cell.style.width=widths[i]+'px';cell.style.minWidth=widths[i]+'px';});updateFrozenColumns();}
document.fonts.addEventListener('loadingdone',fitReportColumns);
new ResizeObserver(()=>{alignHeader();updateFrozenColumns();if(datePanel)renderDatePicker();if(multiPanel)positionMulti();}).observe($('#content'));
document.fonts.ready.then(()=>{updateNavigationWidths();alignHeader();updateFrozenColumns();});
function showDialog(title,html,{drawer=false,subtitle='',footer=''}={}){
  const previousCharts=captureChartState($('#modal'));
  chartInteractions.hide();
  selectControls.close();closeDate();closeMulti();
  const dialog=$('#modal'),drilling=dialog.open&&dialog.classList.contains('drawer')&&drawer;cancelRegion(dialog);if(dialog.open)dialog.close();
  dialog.style.cssText='';
  dialog.className=drawer?'drawer':'';
  dialog.innerHTML='<div class="dialog-header"><div><h2 id="dialog-title">'+title+'</h2>'+(subtitle?'<small>'+subtitle+'</small>':'')+'</div><button class="icon-button close" data-action="close-dialog" aria-label="關閉視窗">×</button></div><div class="dialog-body">'+html+'</div>'+(footer?'<div class="dialog-footer">'+footer+'</div>':'');
  localized(dialog);
  selectControls.enhance();dialog.showModal();animateCharts(dialog,previousCharts,tr);animateRegion(drilling?dialog.querySelector('.dialog-body'):dialog,drilling?'detail':drawer?'drawer':'popover');
}
function closeDialog({animated=false}={}){cancelChartMotion($('#modal'));chartInteractions.hide();selectControls.close();closeDate();clearTimeout(columnTimer);const dialog=$('#modal'),finish=()=>{if(dialog.open)dialog.close();dialogState=null;detailTrail=[];};if(animated&&dialog.open)animateExit(dialog,dialog.classList.contains('drawer')?'drawer':'popover',finish);else{cancelRegion(dialog);finish();}}
function finishDialog(){if(dialogState?.type==='column')applyColumnFilter({close:false});if(dialogState?.type==='date')applyDate();closeDialog({animated:true});}
function miniTable(headers,rows,rich={},totalValues=null){
  totalValues??=detailTableTotals(headers,rows);
  const numeric=h=>/USDT|投注|派彩|盈虧|獎金|成本|本金|金額|倍率|倍數|發數|筆數|數量/.test(h)&&!/單號|記錄時間|投注時間|等級/.test(h);
  return '<div class="mini-scroll"><table class="mini-table"><thead><tr>'+headers.map(h=>'<th class="'+(numeric(h)?'num':'')+'">'+h+'</th>').join('')+'</tr>'+(totalValues?'<tr class="mini-totals">'+totalValues.map((v,i)=>'<th class="'+(numeric(headers[i])?'num ':'')+financialTone(headers[i],v)+'">'+e(v)+'</th>').join('')+'</tr>':'')+'</thead><tbody>'+rows.map((row,ri)=>'<tr>'+row.map((v,i)=>'<td class="'+(numeric(headers[i])?'num ':'')+financialTone(headers[i],v)+'">'+(rich[i]?rich[i](v,ri):e(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function kv(values){return '<div class="key-values">'+values.map(([label,value])=>'<div><small>'+uiIcon(metricIcon(label))+e(label)+'</small><span class="'+financialTone(label,value)+'">'+e(value)+'</span></div>').join('')+'</div>';}
function detailSummary(r,profitLoss=null){const items=[['實扣投注',money(r.bet)],['結算派彩',money(r.payout)],['玩家淨盈虧',signed(r.net)]];if(profitLoss)items.push(['總盈利',signed(profitLoss.profit)],['總虧損',signed(profitLoss.loss)]);return '<div class="summary '+(profitLoss?'player-summary':'')+'">'+items.map(([label,v])=>metricCard(label+'（USDT）',v)).join('')+'</div>';}
function section(title,html){return '<section class="detail-section"><h3>'+title+'</h3>'+html+'</section>';}
function timeline(events){return '<ol class="timeline">'+events.map(([time,title,text])=>'<li><small>'+e(time)+'</small><p>'+e(title)+'</p><small>'+e(text)+'</small></li>').join('')+'</ol>';}
function detailDateLabel(){return detailRange.start.replaceAll('-','/')+(detailRange.start!==detailRange.end?' – '+detailRange.end.replaceAll('-','/'):'');}
function detailBaseRecords(){const f=$('#modal').open&&['org','player','game','record'].includes(dialogState?.type)?detailRange:current().filters;return DATA.records.filter(r=>r.date>=f.start&&r.date<=f.end);}
function rememberDetail(replace=false){const isDetail=$('#modal').open&&['org','player','game','record'].includes(dialogState?.type);if(!replace&&isDetail)detailTrail.push({...dialogState,scroll:$('.dialog-body')?.scrollTop||0});else if(!replace){detailTrail=[];detailRange={start:current().filters.start,end:current().filters.end};}}
function restoreDetail(view){if(view.type==='org')openOrganization(view.id,view.mode,true);else if(view.type==='player')openPlayer(view.name,view.mode,true);else if(view.type==='game')openGame(view.game,view.context,true);else openRecord(view.id,true);if($('.dialog-body'))$('.dialog-body').scrollTop=view.scroll||0;}
function detailNavigation(){return detailTrail.length?'<div class="detail-return"><button data-action="detail-back">'+uiIcon('arrow')+'返回上一層</button><small>'+e(detailTrail.at(-1).type==='org'?DATA.organizations.find(o=>o.id===detailTrail.at(-1).id).name:detailTrail.at(-1).type==='player'?detailTrail.at(-1).name:detailTrail.at(-1).type==='game'?detailTrail.at(-1).game:detailTrail.at(-1).id)+'</small></div>':'';}
function viewToggle(mode){return '<div class="view-controls"><small>'+e(detailDateLabel())+' · USDT · 模擬資料</small><div class="view-toggle" role="group" aria-label="呈現方式">'+['visual','table'].map((v,i)=>'<button data-detail-mode="'+v+'" aria-pressed="'+(mode===v)+'">'+(i?'傳統表格':'視覺摘要')+'</button>').join('')+'</div></div>';}
function organizationPath(id){const path=[];let n=DATA.organizations.find(o=>o.id===id);while(n){path.unshift(n);n=DATA.organizations.find(o=>o.id===n.parent);}return '<nav class="hierarchy-context" aria-label="所屬機構">'+path.map((o,i)=>'<button class="hierarchy-node" data-org="'+o.id+'" title="'+e(o.level+' · '+o.name)+'"><span class="hierarchy-icon">'+uiIcon(i===0?'games':o.level==='現金網'?'wallet':'channels')+'</span><span class="hierarchy-copy"><small>'+e(o.level)+'</small><strong>'+e(o.name)+'</strong></span></button>').join('')+'</nav>';}
function financialSummary(records){const t=totals(records);return detailSummary(t)+'<div class="detail-counts"><span>玩家 '+t.players+'</span><span>遊戲 '+t.games+'</span><span>記錄 '+t.count+'</span><span>獎池派彩 <strong class="'+tone(records.reduce((n,r)=>n+r.jackpotAward,0))+'">'+money(records.reduce((n,r)=>n+r.jackpotAward,0))+' USDT</strong></span><span>投注派彩差額 <strong class="'+tone(-t.net)+'">'+signed(-t.net)+' USDT</strong></span></div>';}
function gameTable(records){const rows=rowsFor(defs.get('player'),records),groups=new Map();for(const row of rows){if(!groups.has(row[4]))groups.set(row[4],[]);groups.get(row[4]).push(row);}return miniTable(['遊戲','類型','記錄筆數','投注 USDT','派彩 USDT','玩家淨盈虧'],[...groups].map(([game])=>{const t=totals(records.filter(r=>r.game===game));return [game,DATA.records.find(r=>r.game===game).kind,t.count,money(t.bet),money(t.payout),signed(t.net)];}),{0:v=>'<button class="text-link" data-game="'+e(v)+'">'+e(v)+'</button>'},['合計','',records.length,money(totals(records).bet),money(totals(records).payout),signed(totals(records).net)]);}
function recordList(records,visual=false){return miniTable(['時間','玩家帳號','玩家 ID','遊戲','投注單號','投注 USDT','派彩 USDT','玩家淨盈虧'],[...records].sort((a,b)=>b.time.localeCompare(a.time)).map(r=>[r.time,r.player,playerId(r.player),r.game,r.id,money(r.bet),money(r.payout),signed(r.net)]),{1:v=>'<button class="text-link" data-player="'+e(v)+'">'+e(v)+'</button>',2:(v,i)=>'<button class="text-link" data-player="'+e([...records].sort((a,b)=>b.time.localeCompare(a.time))[i].player)+'">'+e(v)+'</button>',3:v=>visual?gameIdentity(v):e(v),4:v=>'<button class="text-link" data-record="'+e(v)+'">'+e(v)+'</button>'},['合計','',totals(records).players+' 位玩家','','',money(totals(records).bet),money(totals(records).payout),signed(totals(records).net)]);}
function openOrganization(id='PROV-RR',mode='visual',replace=false){
 const org=DATA.organizations.find(o=>o.id===id);if(!org)return;rememberDetail(replace);dialogState={type:'org',id,mode};
 const records=organizationRecords(detailBaseRecords(),DATA.organizations,id),children=DATA.organizations.filter(o=>o.parent===id),t=totals(records);
 const childRows=children.length?children.map(o=>{const t=totals(organizationRecords(records,DATA.organizations,o.id));return [o.name,o.id,t.players,t.count,money(t.bet),money(t.payout),signed(-t.net)];}):[...new Set(records.map(r=>r.player))].map(name=>{const t=totals(records.filter(r=>r.player===name));return [name,playerId(name),t.games,t.count,money(t.bet),money(t.payout),signed(t.net)];});
 const childHeading=children.length?(org.level==='遊戲商'?'包網商列表':'現金網列表'):'玩家列表';
 const details=miniTable([children.length?'名稱':'玩家帳號',children.length?'機構 ID':'玩家 ID',children.length?'玩家數':'遊戲數','記錄筆數','投注 USDT','派彩 USDT',children.length?'投注派彩差額':'玩家淨盈虧'],childRows,{0:(v,i)=>'<button class="text-link" '+(children.length?'data-org="'+children[i].id:'data-player="'+v)+'">'+e(v)+' →</button>',1:(v,i)=>children.length?e(v):'<button class="text-link" data-player="'+childRows[i][0]+'">'+e(v)+'</button>'},['合計','',t.players,t.count,money(t.bet),money(t.payout),signed(children.length?-t.net:t.net)]);
 const cards=children.length?'<div class="entity-cards">'+children.map(o=>{const t=totals(organizationRecords(records,DATA.organizations,o.id));return '<button class="entity-card" data-org="'+o.id+'"><small>'+uiIcon('channels')+o.level+' · '+o.id+'</small><h3>'+o.name+' →</h3><div class="entity-values"><span><small>'+uiIcon('coins')+'投注 USDT</small><strong>'+money(t.bet)+'</strong></span><span><small>'+uiIcon('profit')+'投注派彩差額</small><strong class="'+tone(-t.net)+'">'+signed(-t.net)+'</strong></span></div><small>'+t.players+' 位玩家 · '+t.count+' 筆記錄</small></button>';}).join('')+'</div>':details;
 const html=detailNavigation()+organizationPath(id)+viewToggle(mode)+financialSummary(records)+
  '<p class="notice">投注派彩差額＝實扣投注−結算派彩；未扣分潤與營運費用。此數值不等同機構實際收益。</p>'+
  (mode==='visual'?trendChart(records,detailDateLabel())+section(childHeading,cards)+section('各遊戲投注／盈虧',gameCards(records)):section(childHeading,details)+section('各遊戲投注／盈虧',gameTable(records)));
 showDialog(org.level+'詳情 · '+e(org.name),html,{drawer:true,subtitle:org.id+' · '+t.count+' 筆模擬記錄'});
}
function playerSourceCard(name){const p=playerSourceProfile(name,DATA.records.filter(r=>r.player===name),DATA.organizations);return '<section class="source-card"><h3>'+uiIcon('shield')+'來源及安全性</h3>'+kv([['所屬代理',p.agent],['註冊地區',p.region],['註冊時間',p.registered],['註冊 IP',p.registrationIp],['註冊裝置',p.registrationDevice],['VPN／代理 IP',p.vpnIp],['ISP',p.isp],['上次登入時間',p.lastLogin],['上次登入 IP',p.lastIp],['上次登入裝置',p.lastDevice]])+'<p class="detail-note">來源與登入資訊為模擬資料；時間皆為 UTC+8。</p></section>';}
function openPlayer(name,mode='visual',replace=false){
 const rs=detailBaseRecords().filter(r=>r.player===name);if(!rs.length){toast('此日期區間沒有玩家記錄');return;}rememberDetail(replace);
 const t=totals(rs),recent=[...rs].sort((a,b)=>b.time.localeCompare(a.time));dialogState={type:'player',name,mode};
 const html=detailNavigation()+organizationPath(rs[0].cashId)+viewToggle(mode)+kv([['玩家帳號',name],['玩家 ID',playerId(name)],['商戶／站點',rs[0].site],['最近遊戲',recent[0].game],['最近遊玩時間',recent[0].date+' '+recent[0].time],['結算後餘額',money(10000+t.net)+' USDT']])+playerSourceCard(name)+detailSummary(t,playerProfitLoss(rs))+'<p class="notice">總盈利為正數淨盈虧加總；總虧損為負數淨盈虧加總；兩者合計等於玩家淨盈虧。統計依目前日期區間。</p>'+
 (mode==='visual'?trendChart(rs,detailDateLabel())+section('各遊戲盈虧／投注額排行',gameCards(rs)):section('各遊戲盈虧／投注額排行',gameTable(rs)))+
 section('最近遊玩',recordList(rs,mode==='visual'))+button('在新分頁查看此玩家投注記錄','player-records','primary','data-name="'+name+'"');
 showDialog('玩家詳情 · '+e(name),html,{drawer:true,subtitle:playerId(name)+' · USDT · 模擬玩家資料'});
}
function openGame(game,context=dialogState,replace=false){
 const scope=context?.type==='org'?organizationRecords(detailBaseRecords(),DATA.organizations,context.id):context?.type==='player'?detailBaseRecords().filter(r=>r.player===context.name):detailBaseRecords();
 const rs=scope.filter(r=>r.game===game);rememberDetail(replace);dialogState={type:'game',game,context};
 const explanation={'電子遊戲':'逐關下注、加碼、最高倍率與主動收取／失敗原因。','老虎機':'付費／免費旋轉、父旋轉、獎勵及累積獎池派彩。','捕魚':'各子彈等級、單發費率、道具、擊殺魚隻與獎金事件。','棋牌':'依 21 點、牛牛、鬥地主顯示手牌、操作、角色與結算倍數。'}[rs[0]?.kind];
 showDialog('遊戲詳情 · '+e(game),detailNavigation()+gameIdentity(game,96)+financialSummary(rs)+kv([...gameMetrics(rs),['獎池觸發筆數',rs.filter(r=>r.jackpotAward>0).length],['獎池派彩',money(rs.reduce((n,r)=>n+r.jackpotAward,0))+' USDT']])+'<p class="detail-note">'+explanation+'</p>'+section('投注記錄',recordList(rs)),{drawer:true,subtitle:(context?.type==='player'?context.name:context?.type==='org'?DATA.organizations.find(o=>o.id===context.id).name:'所有機構')+' · USDT'});
}
function openRecord(id,replace=false){
  const r=DATA.records.find(r=>r.id===id);if(!r){toast('找不到此模擬記錄');return;}
  rememberDetail(replace);dialogState={type:'record',id};const b=balances(DATA.records,r);
  const common=kv([['投注單號',r.id],['玩家帳號／ID',r.player+' / '+playerId(r.player)],['遊戲名稱',r.game],['回合／批次 ID',r.round],['記錄時間',r.date+' '+r.time],['結算狀態／對帳',r.status+' / '+r.recon]]);
  const walletRows=[['BAL-'+r.round,'結算前餘額','0.00','0.00',money(b.before),'已核對'],['DEBIT-'+r.round,'投注扣款',money(r.bet),'0.00',money(b.before-r.bet),'已入帳']];
  if(r.basePayout)walletRows.push(['CREDIT-'+r.round,'一般派彩','0.00',money(r.basePayout),money(b.before-r.bet+r.basePayout),'已入帳']);
  if(r.jackpotAward)walletRows.push([r.jackpot.transactionId,'獎池派彩','0.00',money(r.jackpotAward),money(b.after),'已入帳']);
  const wallet=section('資金與對帳',miniTable(['交易 ID','類型','扣款 USDT','入帳 USDT','餘額 USDT','狀態'],walletRows))+'<p class="detail-note">獎池提撥已含在投注內，不另行扣款。一般派彩與獎池派彩各保留交易 ID，合計只計入一次。</p>';
  const jp=r.jackpot;
  const jackpotSection=section('獎池事件與派彩',jp?kv([['獎池 ID',jp.poolId],['獎池名稱',jp.poolName],['獎池級別',jp.level],['本筆提撥（已含投注）',money(jp.contribution)+' USDT'],['獎池派彩',money(jp.award)+' USDT'],['獎池狀態',jp.status],['觸發條件',jp.trigger],['觸發事件 ID',jp.triggerId],['父事件 ID',jp.parentEventId],['觸發來源 ID',jp.sourceId],['魚隻實例 ID',jp.targetId],['派彩交易 ID',jp.transactionId],['獎池期初餘額',money(jp.before)+' USDT'],['獎池期末餘額',money(jp.after)+' USDT'],['規則版本',jp.ruleVersion]]):'<p class="notice">此遊戲未配置獎池。</p>');
  let specific='';
  if(r.kind==='電子遊戲'){
    const win=scenario(r)==='DEMO-E001';
    specific=section('逐關歷程',miniTable(['事件 ID','關卡','操作／結果','本金','倍率','當時可領 USDT'],win?[
      ['EV-E001-01','開始','初始下注','80.00','1.00×','80.00'],
      ['EV-E001-02','第 1 關','通過','80.00','1.05×','84.00'],
      ['EV-E001-03','第 2 關','追加 20.00 後通過','100.00','1.10×','110.00'],
      ['EV-E001-04','第 3 關','通過並主動收取','100.00','1.20×','120.00']
    ]:[
      ['EV-E002-01','開始','初始下注','150.00','1.00×','150.00'],
      ['EV-E002-02','第 1 關','通過','150.00','1.20×','180.00'],
      ['EV-E002-03','第 2 關','通過','150.00','1.60×','240.00'],
      ['EV-E002-04','第 3 關','失敗，未領獎金作廢','150.00','0.00×','0.00']
    ]))+section('收取與終局',kv([['結束原因',win?'玩家主動收取':'第 3 關失敗'],['實際收取倍率',win?'1.20×':'未收取'],['闖關派彩',money(r.basePayout)+' USDT'],['收取方式',win?'手動全額收取':'未執行收取'],['最後未入帳金額',win?'0.00 USDT':'240.00 USDT（已失效）'],['規則版本','DEMO-PROGRESS-1.0']]))+'<p class="detail-note">示例追加下注會增加實扣本金；單純繼續闖關不再扣款。失敗前可領金額不屬於已入帳派彩。</p>';
  }else if(r.kind==='捕魚'){
    const f=fishingDetail(r),first=scenario(r)==='DEMO-F001';
    const shots=f.shots.map(s=>[s.id,s.time,s.bullet,s.level,money(s.denomination),s.rate+'×',money(s.unit),s.source,money(s.cost),s.debitId,s.target,s.result,s.tool,s.pricePlan]);
    specific=section('射擊與道具摘要',kv([['付費／免費射擊',f.paid+' / '+f.free+' 發'],['子彈等級','Lv.1／Lv.2／Lv.3／Lv.4／Lv.5'],['子彈成本',money(f.bulletCost)+' USDT'],['使用道具',first?'雷射炮 IT-LAS01 × 1':'未使用道具'],['道具成本',money(f.toolCost)+' USDT'],['擊殺／首領擊殺',first?'6 / 1':'0 / 0']]))+
      section('子彈等級與費用',miniTable(['等級','炮倍','單發費率 USDT','來源','發數','實扣成本 USDT','參考面值 USDT'],f.levels.map(g=>[g.level,g.rate+'×',money(g.unit),g.source,g.count,money(g.cost),money(g.reference)])))+
      '<p class="detail-note">單發費率＝基礎面額 × 炮倍。免費彈實扣為 0；參考面值不計入投注。雷射炮僅在購買時收費，啟用期間不重複收取道具費。費率為示範設定。</p>'+
      section('等級切換',miniTable(['時間','原等級','新等級','生效單價 USDT','首發射擊 ID'],f.changes.map(c=>[c.time,c.from,c.to,money(c.unit),c.shot])))+
      section('魚隻命中、擊殺與獎金',miniTable(['魚隻實例 ID','魚種','魚種 ID','關聯射擊','結果','實際倍率','一般獎金','技能獎金','轉盤獎金','合計 USDT','派彩交易 ID','入帳','擊殺彈等級','獎金基準 USDT'],f.fish))+
      (first?section('道具與特殊事件',miniTable(['事件 ID','觸發來源','道具／事件','扣款 USDT','獎金 USDT','關聯對象','結果'],[
        ['EV-F001-01','購買道具','雷射炮 IT-LAS01',money(f.toolCost),'0.00','TOOL-F001-01','庫存 1 → 0'],
        ['EV-F001-02','SH-0301-090','雷射擊殺','0.00',money(f.skill),'金龍首領 F9006','已入帳'],
        ['EV-F001-03','EV-F001-02','首領倍率轉盤','0.00',money(f.bonus),'BONUS-F001-01','完成；免費彈 10 發']
      ])):section('補單與對帳事件',timeline([['原結算','批次完成，未捕獲',f.paid+' 發付費子彈，實扣 '+money(r.bet)+' USDT'],['補單處理','收到重送結算結果','使用原交易 ID 去重，未再次扣款'],['核對完成','補單已核對','投注 '+money(r.bet)+'、派彩 0.00、差額 0.00 USDT']])) )+
      section('逐發射擊 · '+f.shots.length+' 發',miniTable(['射擊 ID','相對時間','子彈類型','等級','基礎面額 USDT','炮倍','單發費率 USDT','來源','實扣成本 USDT','扣款交易 ID','魚隻 ID','命中結果','武器／道具','費率版本'],shots))+
      '<p class="detail-note">付費子彈 '+money(f.bulletCost)+'＋道具 '+money(f.toolCost)+'＝'+money(r.bet)+' USDT；一般 '+money(f.normal)+'＋技能 '+money(f.skill)+'＋獎勵 '+money(f.bonus)+'＝'+money(r.basePayout)+' USDT；另計獎池 '+money(r.jackpotAward)+' USDT，總派彩 '+money(r.payout)+' USDT。</p>';
  }else if(r.kind==='老虎機'){
    const d=defs.get('slots'),row=d.rows.find(row=>rowRecordId(d,row)===r.id),v=h=>row[columnIndex(d,h)],sessionRows=d.rows.filter(x=>x[columnIndex(d,'遊戲場次')]===v('遊戲場次')),index=sessionRows.indexOf(row);
    specific=section('旋轉與獎勵關聯',kv([['旋轉編號',v('旋轉編號')],['遊戲場次',v('遊戲場次')],['旋轉類型',v('旋轉類型')],['父旋轉',v('父旋轉／獎勵回合 ID')],['免費旋轉序號',v('免費旋轉序號')],['消除／重轉次數',v('消除／重轉次數')],['觸發事件',v('觸發事件')],['派彩倍數',v('派彩倍數')],['場次累積盈虧',v('場次累積盈虧')+' USDT']]))+
      section('派彩拆分',miniTable(['基本派彩','獎勵派彩','累積獎池派彩','合計 USDT'],[['基本派彩','獎勵派彩','累積獎池派彩','結算派彩'].map(v)]))+
      section('場次旋轉關聯',miniTable(['旋轉','類型','事件','實扣','派彩','淨盈虧','結算後餘額'],sessionRows.filter((x,i)=>Math.abs(i-index)<=2).map(x=>['旋轉編號','旋轉類型','觸發事件','實扣投注','結算派彩','本次淨盈虧','結算後餘額'].map(h=>x[columnIndex(d,h)]))))+
      '<p class="detail-note">金額沿用設計參考的 14 次旋轉範例；父子關聯與消除次數為補充模擬。免費旋轉不使用零投注作為倍數分母。</p>';
  }else{
    const c=chessDetail(r),cards=values=>'<div class="card-hand">'+values.map(v=>'<span class="playing-card '+(/[♥♦]/.test(v)?'negative':'')+'">'+v+'</span>').join('')+'</div>';
    specific=section(r.game+' · 已結束牌局',kv([['玩法',r.game],['結果',c.result],['底注／底分',money(c.base)+' USDT'],['操作／倍數',c.action.replace(/(?<![\d.])([0-9]+\.[0-9]{2})(?![\d×])/g,(_,v)=>money(Number(v)*(r.scale||1)))],['規則版本',c.rule],['結算倍數',c.multiplier||money(c.payout/c.bet)+'×（含本金）']]))+
      section(r.game==='經典鬥地主'?'底牌':'玩家手牌',cards(c.player))+(c.dealer.length?section('莊家手牌',cards(c.dealer)):'')+
      (c.hands?section('各手牌與保險結算',miniTable(['手牌 ID','牌面','結果','實扣投注','結算派彩','玩家淨盈虧'],c.hands.map(h=>[h[0],h[1],h[2],money(h[3]),money(h[4]),signed(h[4]-h[3])]))):section('結算事件',miniTable(['回合／局號','操作／結果','實扣投注','結算派彩','玩家淨盈虧'],[[r.round,c.result,money(c.bet),money(c.payout),signed(c.net)]])))+
      '<p class="detail-note">模擬規則：派彩含返還本金。21 點含勝負、和局、自然 21 點、加倍、分牌與保險；牛牛保留底注、牌型與結算倍數；鬥地主保留角色、叫分、炸彈／春天與各方結算。正式規則以供應商版本為準。</p>';
  }
  if((r.scale||1)!==1&&r.kind==='電子遊戲')specific=specific.replace(/(?<![\d.])([0-9]+\.[0-9]{2})(?![\d×])/g,(_,v)=>money(Number(v)*r.scale));
  if(r.id!==scenario(r)){
    specific=specific.replaceAll(scenario(r).replace('DEMO-',''),r.id.replace('DEMO-',''));
    const seed=DATA.records.find(x=>x.id===scenario(r));
    if(seed)specific=specific.replaceAll(seed.round,r.round);
    if(r.kind==='捕魚')specific=specific.replaceAll('0301',r.round.replace('FB-','')).replaceAll('0302',r.round.replace('FB-','')).replaceAll('F9006','F'+(r.fishBase+5));
  }
  showDialog('投注明細 · '+e(r.game),detailNavigation()+organizationPath(r.cashId)+common+detailSummary(r)+specific+jackpotSection+wallet+button('查看玩家詳情','detail-player','primary','data-name="'+r.player+'"'),{drawer:true,subtitle:r.id+' · USDT · 模擬資料'});
}
function showColumns(){
  if(!dialogState||dialogState.type!=='columns'){
    const d=defs.get(current().key);dialogState={type:'columns',order:current().columns.concat(d.headers.map((_,i)=>i).filter(i=>!current().columns.includes(i))),shown:[...current().columns],freeze:current().freeze};
  }
  const d=defs.get(current().key),s=dialogState;
  const list='<div class="column-grid">'+s.order.map((index,pos)=>'<div class="column-item"><label><input type="checkbox" data-show-column="'+index+'" '+(s.shown.includes(index)?'checked':'')+'>'+e(d.headers[index])+'</label><button data-move-column="'+pos+'" data-direction="-1" aria-label="向前移動 '+e(d.headers[index])+'" '+(pos===0?'disabled':'')+'>↑</button><button data-move-column="'+pos+'" data-direction="1" aria-label="向後移動 '+e(d.headers[index])+'" '+(pos===s.order.length-1?'disabled':'')+'>↓</button></div>').join('')+'</div>';
  showDialog('欄位設定', '<p class="notice">勾選顯示欄位，使用箭頭調整順序。此設定只套用目前工作分頁。</p>'+list+'<label>凍結左側欄位　<select id="freeze-count" aria-label="凍結左側欄位">'+Array.from({length:s.shown.length+1},(_,n)=>option(String(n),n===0?'不凍結':n+' 欄',String(s.freeze))).join('')+'</select></label><p class="notice">凍結依目前欄位順序；窄螢幕會保留可捲動區域。</p>',{footer:button('恢復預設','columns-default')+button('套用','columns-apply','primary')});
}
function showColumnMenu(index,anchor){
  const t=current(),d=defs.get(t.key),rule=structuredClone(t.columnFilters[index]||{}),others={...t.columnFilters};delete others[index];
  const rows=filterReportColumns(d,filterRecords(DATA.records,t.key,t.filters),others,tr).rows,counts=new Map();
  for(const row of rows){const value=String(row[index]);counts.set(value,(counts.get(value)||0)+1);}
  const numeric=['money','signed','number'].includes(d.columnTypes[index]),time=/時間/.test(d.headers[index]);
  const s=dialogState={type:'column',index,query:rule.query||'',values:rule.values??null,min:rule.min??'',max:rule.max??'',kind:time?'time':numeric?'number':'text',options:[...counts].sort((a,b)=>numeric?number(a[0])-number(b[0]):tr(a[0]).localeCompare(tr(b[0]),locale,{numeric:true})),anchor:anchor?.getBoundingClientRect()};
  const pos=t.columns.indexOf(index),filterable=index<d.headers.length-1;
  const range=numeric||time?'<div class="column-range"><label>'+(time?'開始時間':'最小值')+'<input id="column-min" type="'+(time?'time':'number')+'" '+(time?'step="1"':'step="any"')+' value="'+e(s.min)+'"></label><label>'+(time?'結束時間':'最大值')+'<input id="column-max" type="'+(time?'time':'number')+'" '+(time?'step="1"':'step="any"')+' value="'+e(s.max)+'"></label></div>':'';
  const html='<div class="column-freeze"><button class="button small" data-freeze="'+(pos+1)+'">凍結至此欄</button><button class="button small" data-freeze="0" '+(!t.freeze?'disabled':'')+'>取消凍結</button></div><p class="notice">凍結依目前欄位順序；窄螢幕會保留可捲動區域。</p>'+(filterable?'<div class="column-filter-form"><label for="column-query">搜尋此欄</label><input id="column-query" value="'+e(s.query)+'" placeholder="輸入關鍵字" autocomplete="off">'+range+'<div class="column-value-toolbar"><strong>篩選值</strong><button data-action="column-select-all">全選</button><button data-action="column-select-none">清空</button></div><small id="column-selection" aria-live="polite"></small><div id="column-values" class="column-values"></div><p class="column-error" role="alert" id="column-error"></p></div>':'');
  showDialog('欄位操作 · '+e(d.headers[index]),html,{footer:filterable?button('清除此欄','column-clear')+button('完成','column-apply','primary'):''});
  const dialog=$('#modal');dialog.classList.add('column-popover');
  if(filterable)renderColumnValues();
  const rect=s.anchor||{left:12,bottom:12};const left=Math.max(12,Math.min(rect.left,innerWidth-dialog.offsetWidth-12)),top=Math.max(12,Math.min(rect.bottom+6,innerHeight-dialog.offsetHeight-12));
  dialog.style.left=left+'px';dialog.style.top=top+'px';
  if(filterable)$('#column-query').focus();
}
function renderColumnValues(){
  const s=dialogState,q=s.query.normalize('NFKC').trim().toLocaleLowerCase();
  const matches=s.options.filter(([v])=>v.normalize('NFKC').toLocaleLowerCase().includes(q)||tr(v).normalize('NFKC').toLocaleLowerCase().includes(q));
  $('#column-values').innerHTML=matches.length?matches.map(([v,count])=>'<label class="column-value"><input type="checkbox" data-column-value="'+e(v)+'" '+(s.values===null||s.values.includes(v)?'checked':'')+'><span title="'+e(tr(v))+'">'+e(tr(v))+'</span><small>'+count+'</small></label>').join(''):'<p class="notice">沒有符合的選項</p>';
  $('#column-selection').textContent=tr(s.values===null?'全部值':'已選 '+s.values.length+' 項');
}
function applyColumnFilter({close=true}={}){
  clearTimeout(columnTimer);
  const s=dialogState,min=$('#column-min')?.value||'',max=$('#column-max')?.value||'';
  if(!s||s.type!=='column')return false;
  if(min!==''&&max!==''&&(s.kind==='number'?Number(min)>Number(max):min>max)){$('#column-error').textContent=tr('最小值或開始時間不可大於最大值或結束時間');return false;}
  if($('#column-error'))$('#column-error').textContent='';
  const rule={query:s.query.trim(),values:s.values,min,max,kind:s.kind};
  if(rule.values===null)delete rule.values;
  saveView();if(hasColumnFilter(rule))current().columnFilters[s.index]=rule;else delete current().columnFilters[s.index];
  current().page=1;current().scroll.y=0;if(close)closeDialog();render();return true;
}
function scheduleColumnFilter(){const s=dialogState,id=activeId;clearTimeout(columnTimer);columnTimer=setTimeout(()=>{if(dialogState===s&&activeId===id)applyColumnFilter({close:false});},350);}
const datePresets=[['today','今天'],['yesterday','昨天'],['week','近一週'],['month','近一月'],['last-month','上個月'],['demo','模擬資料日']];
function dateToolbar(f){
 const now=new Date(),selected=datePresets.find(([key])=>{const r=datePresetRange(key,now);return r.start===f.start&&r.end===f.end;})?.[0]||'custom';
 const range=dateRangeLabel(f.start,f.end),full=e(range.full);
 return '<div class="date-toolbar"><div class="field"><label for="date-preset">日期快捷</label><select id="date-preset">'+option('custom','自訂區間',selected)+datePresets.map(([key,label])=>option(key,label,selected)).join('')+'</select></div><div class="field date-range-field"><label for="date-range-trigger"><span>日期區間</span><small>'+(range.years?'<span class="date-caption-years">'+range.years+' · </span>':'')+'UTC+8</small></label><button id="date-range-trigger" type="button" class="date-button" data-action="date" data-range-full="'+full+'" title="'+full+' · UTC+8" aria-label="日期區間：'+full+' · UTC+8" aria-haspopup="dialog" aria-expanded="'+Boolean(datePanel)+'"><span><span class="date-full">'+full+'</span><span class="date-compact">'+e(range.compact)+'</span></span>'+uiIcon('calendar')+'</button></div></div>';
}
function closeDate({animated=false}={}){const wasOpen=Boolean(datePanel),popup=$('#date-popover');datePanel=null;$('[data-action=date]')?.setAttribute('aria-expanded','false');if(popup){if(animated)animateExit(popup,'popover',()=>popup.remove());else{cancelRegion(popup);popup.remove();}}return wasOpen;}
function renderDatePicker(){
 const popup=$('#date-popover');if(!popup||!datePanel)return;
 popup.innerHTML=datePickerHtml({...current().draft,...datePanel});localized(popup);
 const anchor=$('[data-action=date]').getBoundingClientRect(),width=Math.min(680,innerWidth-24);
 popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(anchor.left,innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(anchor.bottom+8,innerHeight-Math.min(popup.scrollHeight,innerHeight-24)-12))+'px';
}
function showDate(){
 closeMulti();
 if(datePanel){closeDate({animated:true});return;}
 closeDate();datePanel={month:current().draft.start.slice(0,7),anchor:null};
 document.body.insertAdjacentHTML('beforeend','<section id="date-popover" class="date-popover" role="dialog" aria-label="日期區間"></section>');
 $('[data-action=date]')?.setAttribute('aria-expanded','true');renderDatePicker();animateRegion($('#date-popover'),'popover');
}
function applyDate({close=false,notify=false}={}){
 const start=$('#date-start')?.value,end=$('#date-end')?.value;
 if(!start||!end||start>end){if($('#date-error'))$('#date-error').textContent=tr('請確認開始日期不晚於結束日期');if(notify)toast('請確認開始日期不晚於結束日期');return false;}
 current().draft.start=start;current().draft.end=end;if(datePanel)datePanel.anchor=null;if(close)closeDate();queryForm();if(datePanel)renderDatePicker();return true;
}
function showSearch(query=''){
  const matches=DATA.reports.filter(d=>d.title.includes(query));
  const players=[...new Set(DATA.records.map(r=>r.player))].filter(n=>query&&(n.includes(query)||playerId(n).toLowerCase().includes(query.toLowerCase())));
  return '<div class="search-results">'+matches.map(d=>'<button class="search-result" data-report="'+d.key+'">'+icon(d.icon)+'<span>'+d.title+'</span></button>').join('')+players.map(n=>'<button class="search-result" data-player="'+n+'">'+icon('a24ad.svg')+'<span>'+n+' · '+playerId(n)+'</span></button>').join('')+(!matches.length&&!players.length?'<p class="notice">找不到符合的頁面或玩家。</p>':'')+'</div>';
}
function renderAssistant(){let root=$('#assistant-root');if(!root){document.body.insertAdjacentHTML('beforeend','<div id="assistant-root"></div>');root=$('#assistant-root');}const range=current().filters;root.innerHTML='<button class="assistant-launcher" data-action="assistant" aria-label="資料助理" aria-expanded="'+assistantOpen+'">'+uiIcon('customerService')+'</button>'+(assistantOpen?'<section class="assistant-panel" role="dialog" aria-labelledby="assistant-title"><div class="assistant-head"><div><strong id="assistant-title">'+uiIcon('customerService')+'資料助理</strong><small>模擬資料 · USDT · UTC+8</small></div><button class="icon-button close" data-action="assistant" aria-label="關閉資料助理">×</button></div><p class="assistant-scope">'+e(range.start+' — '+range.end)+'</p><div id="assistant-messages" class="assistant-messages" aria-live="polite">'+(assistantMessages.length?assistantMessages.map(m=>m.question?'<div class="assistant-question">'+e(m.question)+'</div>':'<div class="assistant-answer"><strong>'+e(m.title)+'</strong>'+(m.text?'<p>'+e(m.text)+'</p>':'')+(m.metrics?'<dl>'+m.metrics.map(([label,value])=>'<div><dt>'+e(label)+'</dt><dd class="'+financialTone(label,value)+'">'+e(value)+'</dd></div>').join('')+'</dl>':'')+(m.actions?.length?'<div class="assistant-actions">'+m.actions.map(a=>'<button data-'+a.kind+'="'+e(a.value)+'">'+e(a.label)+' '+uiIcon('arrow')+'</button>').join('')+'</div>':'')+'</div>').join(''):'<div class="assistant-welcome">'+uiIcon('activity')+'<strong>想查什麼資料？</strong><p>查找玩家、投注單、遊戲與機構，或查看目前篩選的營運數據。</p></div>')+'</div><div class="assistant-suggestions">'+['目前投注總額','玩家盈利排行','獎池概況'].map(q=>'<button data-assistant-question="'+q+'">'+q+'</button>').join('')+'</div><form id="assistant-form"><label class="sr-only" for="assistant-query">輸入查詢內容</label><input id="assistant-query" placeholder="輸入玩家 ID、單號或問題" autocomplete="off"><button type="submit" class="assistant-send" aria-label="送出查詢">'+uiIcon('arrow')+'</button></form></section>':'');localized(root);}
function askAssistant(question){const q=question.trim();if(!q)return;const f=current().filters,records=filterRecords(DATA.records,'all',{...defaultFilters(),start:f.start,end:f.end}),scope=defs.has(current().key)?getReport().rs:records;assistantMessages.push({question:q},answerQuestion(q,{records,scope,organizations:DATA.organizations,games:DATA.games,display:tr}));if(assistantMessages.length>20)assistantMessages.splice(0,2);renderAssistant();const list=$('#assistant-messages');list.scrollTop=list.scrollHeight;$('#assistant-query').focus();}
function toggleAssistant(){assistantOpen=!assistantOpen;if(assistantOpen)cancelRegion($('.assistant-panel'));if(!assistantOpen){const panel=$('.assistant-panel');if(panel){animateExit(panel,'popover',renderAssistant);return;}}renderAssistant();if(assistantOpen){animateRegion($('.assistant-panel'),'detail');$('#assistant-query').focus();}}
function closeMulti({animated=false,focus=false}={}){const panel=multiPanel,popup=$('#filter-popover');multiPanel=null;if(panel)$('#f-'+panel.name)?.setAttribute('aria-expanded','false');const finish=()=>{popup?.remove();if(focus&&panel)$('#f-'+panel.name)?.focus({preventScroll:true});};if(popup&&animated)animateExit(popup,'popover',finish);else{cancelRegion(popup);finish();}return Boolean(panel);}
function positionMulti(){const popup=$('#filter-popover'),trigger=multiPanel&&$('#f-'+multiPanel.name);if(!popup||!trigger)return;const anchor=trigger.getBoundingClientRect(),width=Math.min(440,Math.max(300,anchor.width),innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(anchor.left,innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(anchor.bottom+8,innerHeight-Math.min(popup.scrollHeight,460)-12))+'px';}
function renderMultiOptions(){if(!multiPanel)return;const catalog=filterCatalog.get(multiPanel.name);if(!catalog){closeMulti();return;}$('#filter-values').innerHTML=multiOptionsHtml(catalog.choices,multiPanel.query,current().draft[multiPanel.name],tr);$('#filter-selection').textContent=tr('已選 ')+selectionValues(current().draft[multiPanel.name]).length+tr(' 項');positionMulti();}
function showMulti(name){if(multiPanel?.name===name){closeMulti({animated:true,focus:true});return;}closeDate();closeMulti();if(!filterCatalog.has(name))return;const catalog=filterCatalog.get(name);multiPanel={name,query:''};document.body.insertAdjacentHTML('beforeend','<section id="filter-popover" class="filter-popover" role="dialog" aria-labelledby="filter-title"><div class="filter-popover-head"><strong id="filter-title">'+e(catalog.label)+'</strong><button class="icon-button close" data-multi-action="done" aria-label="關閉視窗">×</button></div><label class="sr-only" for="filter-search">搜尋選項</label><input id="filter-search" class="dialog-search" placeholder="搜尋選項" autocomplete="off"><div class="multi-tools"><span id="filter-selection" role="status"></span><button data-multi-action="all">全選</button><button data-multi-action="clear">清除</button></div><div id="filter-values" class="filter-values"></div><div class="multi-foot"><small>勾選後即時篩選</small><button class="button small" data-multi-action="done">完成</button></div></section>');localized($('#filter-popover'));$('#f-'+name)?.setAttribute('aria-expanded','true');renderMultiOptions();animateRegion($('#filter-popover'),'popover');$('#filter-search').focus();}
function queryForm(t=current(),{preserveMulti=false}={}){
  clearTimeout(queryTimers.get(t.id));queryTimers.delete(t.id);
  if(!tabs.includes(t)||JSON.stringify(t.filters)===JSON.stringify(t.draft))return;
  const f=t.draft=reconcileFilters(t.draft,DATA.organizations,DATA.games,DATA.records);
  const active=t.id===activeId,focus=active&&document.activeElement?.closest('#query-form')?document.activeElement:null;
  const selection=focus?.tagName==='INPUT'&&focus.selectionStart!==null?[focus.selectionStart,focus.selectionEnd]:null,id=focus?.id;
  if(active)saveView();t.filters={...f};t.page=1;t.scroll.y=0;
  if(!active){persist();return;}render({keepMulti:preserveMulti});if(preserveMulti&&multiPanel)renderMultiOptions();
  if(id)requestAnimationFrame(()=>{if(activeId!==t.id)return;const input=document.getElementById(id);input?.focus({preventScroll:true});if(input&&selection)input.setSelectionRange(...selection);});
}
function scheduleQuery(){const t=current();clearTimeout(queryTimers.get(t.id));queryTimers.set(t.id,setTimeout(()=>queryForm(t),350));}
document.addEventListener('submit',event=>{if(event.target.id==='assistant-form'){event.preventDefault();askAssistant($('#assistant-query').value);return;}if(event.target.id==='query-form'){event.preventDefault();queryForm();}});
document.addEventListener('input',event=>{
  if(event.target.id==='filter-search'){multiPanel.query=event.target.value;renderMultiOptions();return;}
  if(event.target.closest('#query-form')&&event.target.name){current().draft[event.target.name]=event.target.value;if(event.target.tagName==='INPUT'&&!event.isComposing&&!composing)scheduleQuery();}
  if(event.target.id==='quick-search')$('#search-list').innerHTML=showSearch(event.target.value);
  if(event.target.id==='column-query'){dialogState.query=event.target.value;renderColumnValues();if(!event.isComposing&&!composing)scheduleColumnFilter();}
  if(['column-min','column-max'].includes(event.target.id))scheduleColumnFilter();
});
document.addEventListener('compositionstart',()=>{composing=true;});
document.addEventListener('compositionend',event=>{composing=false;if(event.target.closest('#query-form')&&event.target.name){current().draft[event.target.name]=event.target.value;scheduleQuery();}if(event.target.id==='column-query'){dialogState.query=event.target.value;renderColumnValues();scheduleColumnFilter();}});
document.addEventListener('change',event=>{
  if(event.target.hasAttribute('data-multi-value')&&multiPanel){const name=multiPanel.name,v=event.target.dataset.multiValue,values=selectionValues(current().draft[name]);current().draft[name]=event.target.checked?[...new Set([...values,v])]:values.filter(x=>x!==v);queryForm(current(),{preserveMulti:true});renderMultiOptions();return;}
  if(event.target.id==='date-preset'){if(event.target.value!=='custom'){Object.assign(current().draft,datePresetRange(event.target.value));closeDate();queryForm();}else showDate();return;}
  if(event.target.id==='page-size'){saveView();current().pageSize=Number(event.target.value);current().page=1;current().scroll.y=0;render();requestAnimationFrame(()=>$('#page-size-trigger')?.focus({preventScroll:true}));}
  if(event.target.matches('[data-show-column]')){
    const i=Number(event.target.dataset.showColumn),s=dialogState;
    s.shown=event.target.checked?[...s.shown,i]:s.shown.filter(x=>x!==i);
  }
  if(event.target.id==='freeze-count'&&dialogState)dialogState.freeze=Number(event.target.value);
  if(event.target.hasAttribute('data-column-value')){
    const s=dialogState,v=event.target.dataset.columnValue;
    if(s.values===null)s.values=s.options.map(([v])=>v);
    s.values=event.target.checked?[...new Set([...s.values,v])]:s.values.filter(x=>x!==v);
    $('#column-selection').textContent=tr('已選 '+s.values.length+' 項');
    applyColumnFilter({close:false});
  }
  if(['column-min','column-max'].includes(event.target.id))applyColumnFilter({close:false});
  if(['date-start','date-end'].includes(event.target.id))applyDate();
  if(event.target.closest('#query-form')&&event.target.name&&!composing){current().draft[event.target.name]=event.target.value;queryForm();}
});
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.dataset.assistantQuestion){askAssistant(target.dataset.assistantQuestion);return;}
  if(target.dataset.filterMulti){showMulti(target.dataset.filterMulti);return;}
  if(target.dataset.multiAction){const action=target.dataset.multiAction;if(action==='done'){closeMulti({animated:true,focus:true});return;}if(!multiPanel)return;const name=multiPanel.name;if(action==='clear')current().draft[name]='';else{const values=matchingChoices(filterCatalog.get(name).choices,multiPanel.query,tr).map(([v])=>v);current().draft[name]=[...new Set([...selectionValues(current().draft[name]),...values])];}queryForm(current(),{preserveMulti:true});renderMultiOptions();return;}
  if(target.closest('form')&&target.type!=='submit')event.preventDefault();
  if(target.dataset.report){openReport(target.dataset.report,{duplicate:event.metaKey||event.ctrlKey||event.shiftKey});return;}
  if(target.dataset.tab){activate(target.dataset.tab);return;}
  if(target.hasAttribute('data-calendar-month')){datePanel.month=shiftMonth(datePanel.month,Number(target.dataset.calendarMonth));renderDatePicker();return;}
  if(target.dataset.dateDay){const day=target.dataset.dateDay;if(!datePanel.anchor){datePanel.anchor=day;renderDatePicker();}else{const start=datePanel.anchor<day?datePanel.anchor:day,end=datePanel.anchor<day?day:datePanel.anchor;current().draft.start=start;current().draft.end=end;datePanel.anchor=null;queryForm();renderDatePicker();}return;}
  if(target.dataset.statsView){saveView();current().statsView=target.dataset.statsView;render();animateRegion($('#content'));return;}
  if(target.dataset.chartLegend&&['players','activity','popular'].includes(target.dataset.chartLegend)){
    saveView();const t=current(),id=target.dataset.chartLegend,key=target.dataset.chartKey,selected=Array.isArray(t.chartHidden?.[id])?t.chartHidden[id]:[];
    t.chartHidden={...t.chartHidden,[id]:selected.includes(key)?selected.filter(v=>v!==key):[...selected,key]};render();
    $$('[data-chart-legend]').find(b=>b.dataset.chartLegend===id&&b.dataset.chartKey===key)?.focus({preventScroll:true});return;
  }
  if(target.dataset.shareMetric){saveView();current().shareMetric=target.dataset.shareMetric;render();return;}
  if(target.dataset.closeTab){closeTab(target.dataset.closeTab);return;}
  if(target.dataset.category){
    const key=target.dataset.category;if(key==='dashboard'){openDashboard();return;}if(category===key&&submenuOpen){closeMenu();return;}category=key;languageOpen=false;openMenu();return;
  }
  if(target.dataset.org){openOrganization(target.dataset.org);return;}
  if(target.dataset.game){openGame(target.dataset.game);return;}
  if(target.hasAttribute('data-detail-index')){const i=Number(target.dataset.detailIndex),v=detailTrail[i];detailTrail=detailTrail.slice(0,i);restoreDetail(v);return;}
  if(target.dataset.detailMode){restoreDetail({...dialogState,mode:target.dataset.detailMode});return;}
  if(target.dataset.draft&&['全部機構','包網商','現金網'].includes(target.dataset.draft)){openOrganization();return;}
  if(target.dataset.draft){
    saveView();const t=tab('draft:'+category+':'+target.dataset.draft,target.dataset.draft);tabs.push(t);activeId=t.id;$('#app').classList.remove('mobile-open');render();return;
  }
  if(target.dataset.player){openPlayer(target.dataset.player);return;}
  if(target.dataset.record){openRecord(target.dataset.record);return;}
  if(target.dataset.rowDetail){
    const id=target.dataset.rowDetail;
    if(id.startsWith('player:'))openPlayer(id.slice(7));
    else if(id.startsWith('stats:'))openReport('all',{duplicate:true,filters:{...current().filters,type:id.slice(6)}});
    else openRecord(id);return;
  }
  if(target.hasAttribute('data-sort')){
    saveView();const index=Number(target.dataset.sort),t=current();t.sort={index,direction:t.sort?.index===index&&t.sort.direction==='asc'?'desc':'asc'};t.page=1;t.scroll.y=0;render();return;
  }
  if(target.hasAttribute('data-column-menu')){showColumnMenu(Number(target.dataset.columnMenu),target);return;}
  if(target.hasAttribute('data-clear-column')){saveView();delete current().columnFilters[target.dataset.clearColumn];current().page=1;current().scroll.y=0;render();return;}
  if(target.hasAttribute('data-page')){saveView();current().page=Number(target.dataset.page);current().scroll.y=0;render();return;}
  if(target.dataset.lang){saveView();const selected=target.dataset.lang;languageOpen=false;animateExit($('.language-menu'),'popover',()=>{locale=selected;render();});return;}
  if(target.hasAttribute('data-move-column')){
    const i=Number(target.dataset.moveColumn),j=i+Number(target.dataset.direction),s=dialogState;
    [s.order[i],s.order[j]]=[s.order[j],s.order[i]];showColumns();return;
  }
  switch(target.dataset.action){
    case 'assistant':toggleAssistant();break;
    case 'organizations':openOrganization();break;
    case 'detail-back':{const v=detailTrail.pop();if(v)restoreDetail(v);break;}
    case 'collapse':closeMenu();break;
    case 'mobile-menu':if($('#app').classList.contains('mobile-open'))closeMenu();else openMenu({mobile:true});break;
    case 'new-tab':newTab();break;
    case 'home':openDashboard();break;
    case 'close-tabs':openDashboard({clear:true});break;
    case 'language':if(languageOpen)closeLanguage();else{languageOpen=true;renderRail();animateRegion($('.language-menu'),'popover');}break;
    case 'theme':document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light';persist();break;
    case 'reset':clearTimeout(queryTimers.get(activeId));queryTimers.delete(activeId);current().filters=defaultFilters();current().draft=defaultFilters();current().columnFilters={};current().sort=null;current().page=1;current().scroll={x:0,y:0,main:0};render();break;
    case 'column-select-all':dialogState.values=null;renderColumnValues();applyColumnFilter({close:false});break;
    case 'column-select-none':dialogState.values=[];renderColumnValues();applyColumnFilter({close:false});break;
    case 'column-apply':applyColumnFilter();break;
    case 'column-clear':{const i=dialogState.index;saveView();delete current().columnFilters[i];current().page=1;current().scroll.y=0;closeDialog();render();break;}
    case 'column-clear-all':saveView();current().columnFilters={};current().page=1;current().scroll.y=0;render();break;
    case 'open-all':openReport('all');break;
    case 'close-dialog':finishDialog();break;
    case 'date':showDate();break;
    case 'date-today':case 'date-yesterday':case 'date-week':case 'date-month':case 'date-last-month':case 'date-demo':{const range=datePresetRange(target.dataset.action.slice(5));$('#date-start').value=range.start;$('#date-end').value=range.end;applyDate();break;}
    case 'date-apply':closeDate({animated:true});$('[data-action=date]')?.focus({preventScroll:true});break;
    case 'columns':showColumns();break;
    case 'columns-default':{const d=defs.get(current().key);dialogState={type:'columns',order:d.headers.map((_,i)=>i),shown:d.headers.map((_,i)=>i),freeze:defaultFreezeCount(d)};showColumns();break;}
    case 'columns-apply':{
      if(!dialogState.shown.length){toast('請至少保留一個欄位');return;}
      saveView();current().columns=dialogState.order.filter(i=>dialogState.shown.includes(i));current().freeze=Math.min(dialogState.freeze,current().columns.length);current().freezeCustomized=true;current().scroll.x=0;closeDialog();render();toast('已套用目前分頁的欄位設定');break;
    }
    case 'export':{
      const {d,rows}=getReport(),cols=current().columns;
      const blob=new Blob([csv(cols.map(i=>tr(d.headers[i])),rows.map(r=>cols.map(i=>tr(r[i]))))],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='R&R_'+d.title+'_USDT_'+current().filters.start+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出 '+rows.length+' 筆篩選結果（USDT）');break;
    }
    case 'detail-player':openPlayer(target.dataset.name);break;
    case 'player-records':openReport('all',{duplicate:true,filters:{query:target.dataset.name}});break;
    case 'search':showDialog('快速搜尋','<input id="quick-search" class="dialog-search" placeholder="搜尋報表名稱、玩家帳號或 ID" aria-label="快速搜尋"><div id="search-list">'+showSearch()+'</div>');requestAnimationFrame(()=>$('#quick-search').focus());break;
    case 'apps':showDialog('頁面捷徑','<div class="search-results">'+DATA.reports.map(d=>'<button class="search-result" data-report="'+d.key+'">'+icon(d.icon)+d.title+'</button>').join('')+'</div>');break;
    case 'notifications':showDialog('通知','<div class="small-menu"><button data-record="DEMO-F002"><strong>補單核對完成</strong><p class="notice">捕魚批次 FB-0302 已完成核對，未重複扣款。</p></button><button data-action="open-all"><strong>模擬資料準備完成</strong><p class="notice">'+DATA.records.length.toLocaleString('en-US')+' 筆記錄、'+DATA.totals.players+' 位玩家、'+DATA.totals.games+' 款遊戲，幣別為 USDT。</p></button></div>');break;
    case 'profile':showDialog('平台管理員',kv([['使用者','平台管理員'],['環境','互動 Demo'],['資料來源','USDT 模擬資料']])+'<p class="notice">操作與分頁設定儲存在目前瀏覽器。此示範未連接正式帳號與資金系統。</p>');break;
  }
});
document.addEventListener('click',event=>{if(datePanel&&!event.composedPath().some(n=>n.id==='date-popover'||n.id==='date-preset'||n.dataset?.action==='date'))closeDate({animated:true});if(multiPanel&&!event.target.closest('#filter-popover,[data-filter-multi]'))closeMulti({animated:true});if(languageOpen&&!event.target.closest('.language-menu,.language-trigger')){closeLanguage();}});
document.addEventListener('contextmenu',event=>{
  const th=event.target.closest('.report-table th');if(!th)return;event.preventDefault();
  showColumnMenu(Number(th.dataset.column),th);
});
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-freeze]');if(!b)return;saveView();current().freeze=Number(b.dataset.freeze);current().freezeCustomized=true;closeDialog();render();toast(current().freeze?'已凍結左側 '+current().freeze+' 欄':'已取消凍結');
});
document.addEventListener('keydown',event=>{
  if(dialogState?.type==='column'&&event.key==='Enter'&&event.target.matches('#column-query,#column-min,#column-max')){event.preventDefault();applyColumnFilter();return;}
  if(event.key==='Escape'){if(closeMulti({animated:true,focus:true})){event.preventDefault();return;}if(closeDate({animated:true})){event.preventDefault();$('[data-action=date]')?.focus({preventScroll:true});return;}if($('#modal').open){event.preventDefault();finishDialog();return;}if(languageOpen)closeLanguage();if(assistantOpen){toggleAssistant();event.preventDefault();return;}if($('#app').classList.contains('mobile-open'))closeMenu();}
  const button=event.target.closest('[role=tab]');
  if(button&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();let index=tabs.findIndex(t=>t.id===activeId);
    index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    activate(tabs[index].id);requestAnimationFrame(()=>$('[data-tab="'+activeId+'"]').focus());
  }
});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)finishDialog();}});
$('#modal').addEventListener('cancel',event=>{event.preventDefault();finishDialog();});
window.addEventListener('beforeunload',saveView);
const selectControls=installSelectControls({onOpen:()=>{closeDate();closeMulti();closeLanguage();}});
const chartInteractions=installChartInteractions({translate:tr});
const requested=location.hash.slice(1);if(defs.has(requested)||requested==='dashboard'){let t=tabs.find(t=>t.key===requested);if(!t){t=tab(requested,requested==='dashboard'?'儀表板':'新增分頁');tabs.push(t);}activeId=t.id;}
category=currentKeyCategory();
render();
