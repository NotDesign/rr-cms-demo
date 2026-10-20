import {money,signed,number,tone,escape as e,playerId,defaultFilters,filterRecords,totals,rowsFor,summaryFor,sortedRows,csv,balances,fishingDetail} from './core.js';

const DATA=await fetch('./data/demo-data.json').then(r=>{if(!r.ok)throw Error('資料載入失敗');return r.json();});
const defs=new Map(DATA.reports.map(d=>[d.key,d]));
const icons={dashboard:'6398b.svg',reports:'8ec9b.svg',promotion:'5783c.svg',jackpot:'a4bc9.svg',games:'e6435.svg',merchant:'7aa63.svg',players:'a24ad.svg',settlement:'59865.svg',system:'8a8c6.svg'};
const menus=[
 ['dashboard','儀表板',['總覽','即時數據','遊戲表現']],['reports','遊戲報表',DATA.reports.map(d=>d.title)],
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
function tab(key='new',title='新增分頁'){return {id:crypto.randomUUID(),key,title:defs.get(key)?.title||title,filters:defaultFilters(),draft:defaultFilters(),sort:null,page:1,pageSize:50,columns:defs.has(key)?defs.get(key).headers.map((_,i)=>i):[],freeze:3,scroll:{x:0,y:0,main:0}};}
let saved;
try{saved=JSON.parse(localStorage.getItem(storageKey));}catch{}
let tabs=Array.isArray(saved?.tabs)&&saved.tabs.length?saved.tabs.filter(t=>t&&typeof t.id==='string'&&(defs.has(t.key)||t.key==='new'||t.key.startsWith('draft:'))).map(t=>({...tab(t.key,t.title),...t,filters:{...defaultFilters(),...t.filters},draft:{...defaultFilters(),...t.draft}})):[tab('all'),tab('slots'),tab('fishing'),tab('player')];
if(!tabs.length)tabs=[tab('all')];
let activeId=tabs.some(t=>t.id===saved?.activeId)?saved.activeId:tabs[0].id;
let category='reports',submenuOpen=saved?.submenuOpen??true,languageOpen=false,dialogState=null,toastTimer;
if(saved?.theme==='light')document.documentElement.dataset.theme='light';
const current=()=>tabs.find(t=>t.id===activeId)||tabs[0];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({tabs,activeId,submenuOpen,theme:document.documentElement.dataset.theme||'dark'}));}catch{}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function saveView(){const t=current(),v=$('.table-viewport');if(v)t.scroll={x:v.scrollLeft,y:v.scrollTop,main:$('#content').scrollTop};else t.scroll.main=$('#content').scrollTop;persist();}
function activate(id){saveView();activeId=id;if(defs.has(current().key))category='reports';closeDialog();render();}
function openReport(key,{duplicate=false,filters=null}={}){
  saveView();let t=current().key==='new'?current():!duplicate?tabs.find(t=>t.key===key):null;
  if(!t){t=tab(key);tabs.push(t);}else if(t.key==='new'){Object.assign(t,tab(key),{id:t.id});}
  if(filters){t.filters={...defaultFilters(),...filters};t.draft={...t.filters};t.page=1;t.scroll={x:0,y:0,main:0};}
  activeId=t.id;category='reports';submenuOpen=true;closeDialog();$('#app').classList.remove('mobile-open');render();
}
function newTab(){saveView();const t=tab();tabs.push(t);activeId=t.id;closeDialog();render();}
function closeTab(id){
  saveView();const i=tabs.findIndex(t=>t.id===id);if(i<0)return;tabs.splice(i,1);
  if(!tabs.length)tabs=[tab()];if(activeId===id)activeId=tabs[Math.max(0,i-1)]?.id||tabs[0].id;
  closeDialog();render();
}
function renderRail(){
  $('#rail').innerHTML='<a class="brand" href="#all" data-action="open-all" aria-label="R&R 所有遊戲報表">'+img('56714.svg','R&R')+'</a><nav class="nav-categories">'+menus.map(([key,label])=>'<button class="category '+(category===key?'active':'')+'" data-category="'+key+'" aria-label="'+label+'" aria-expanded="'+(category===key&&submenuOpen)+'">'+icon(icons[key])+'<span>'+label+'</span></button>').join('')+'</nav><div class="rail-footer"><button class="language-trigger" data-action="language" aria-expanded="'+languageOpen+'" aria-haspopup="menu">'+img('f6d64.svg')+'<span>繁體中文</span><span class="chevron">'+img('07623.svg')+'</span></button><small class="version">DEMO · 2026.10.20</small></div>';
  let old=$('.language-menu');if(old)old.remove();
  if(languageOpen)document.body.insertAdjacentHTML('beforeend','<div class="language-menu" role="menu"><button data-lang="zh-Hant" role="menuitem">✓　繁體中文</button><button data-lang="zh-Hans" role="menuitem" aria-disabled="true">　　简体中文<small>　　此 Demo 目前提供繁體中文</small></button><button data-lang="en" role="menuitem" aria-disabled="true">　　English<small>　　此 Demo 目前提供繁體中文</small></button></div>');
}
function renderMenu(){
  const menu=menus.find(m=>m[0]===category);
  $('#submenu').innerHTML='<div class="submenu-head"><span>'+menu[1]+'</span><button class="icon-button close" data-action="collapse" aria-label="收合子選單">×</button></div><nav>'+menu[2].map((label,i)=>{
    const d=category==='reports'?DATA.reports[i]:null;
    return '<button class="submenu-link '+(d&&current().key===d.key?'active':'')+'" '+(d?'data-report="'+d.key+'"':'data-draft="'+e(label)+'"')+'>'+(d?icon(d.icon):icon(icons[category]))+'<span>'+label+'</span></button>';
  }).join('')+'</nav>';
}
function renderHeader(){
  $('#header').innerHTML='<button class="icon-button mobile-menu" data-action="mobile-menu" aria-label="開啟主選單">☰</button><div class="work-tabs" role="tablist" aria-label="工作分頁">'+tabs.map(t=>'<div class="work-tab '+(t.id===activeId?'active':'')+'" role="presentation"><button role="tab" class="work-tab-label" aria-selected="'+(t.id===activeId)+'" tabindex="'+(t.id===activeId?0:-1)+'" data-tab="'+t.id+'" title="'+e(t.title)+'">'+e(t.title)+'</button><button class="tab-close" data-close-tab="'+t.id+'" aria-label="關閉 '+e(t.title)+'">×</button></div>').join('')+'</div><button class="add-tab" data-action="new-tab" aria-label="新增工作分頁" title="新增工作分頁">＋</button><div class="utilities"><button class="icon-button optional" data-action="search" aria-label="快速搜尋">'+icon('24459.svg')+'</button><button class="icon-button optional-small" data-action="apps" aria-label="頁面捷徑">'+icon('f04ae.svg')+'</button><button class="icon-button optional-small" data-action="notifications" aria-label="通知">'+icon('cac57.svg')+'<span class="notification-count">2</span></button><button class="icon-button" data-action="theme" aria-label="切換明暗外觀" title="切換明暗外觀">'+icon('7e997.svg')+'</button><button class="avatar" data-action="profile" aria-label="平台管理員帳號"><span>平台管理員</span>'+img('fbeb1.png','平台管理員')+'</button></div>';
}
const option=(value,label,selected)=>'<option value="'+e(value)+'" '+(value===selected?'selected':'')+'>'+e(label)+'</option>';
function selectField(label,name,choices,cls=''){
  const f=current().draft;
  return '<div class="field '+cls+'"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'">'+choices.map(x=>option(typeof x==='string'?x:x[0],typeof x==='string'?x:x[1],f[name]||'')).join('')+'</select></div>';
}
function textField(label,name,placeholder,cls=''){
  return '<div class="field '+cls+'"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" value="'+e(current().draft[name]||'')+'" placeholder="'+e(placeholder)+'" autocomplete="off"></div>';
}
function filtersHtml(def){
  const f=current().draft;
  const types=def.key==='chess'?[['','全部玩法'],['經典 21 點','21 點'],['搶莊牛牛','牛牛'],['經典鬥地主','鬥地主']]:[['','全部類型'],'電子遊戲','老虎機','捕魚','棋牌'];
  const typeLabel=def.key==='chess'?'棋牌玩法':def.key==='fishing'?'房間／場次':def.key==='electronic'?'玩法':'遊戲類型';
  const gameSelect=def.key==='fishing'?selectField(typeLabel,'room',[['','全部場次'],['深海 01 房','深海 01 房']]):
    def.key==='electronic'?selectField(typeLabel,'type',[['','全部玩法'],['星際闖關','星際闖關']]):
    def.key==='slots'?selectField('旋轉類型','event',[['','全部旋轉'],['免費旋轉','免費旋轉'],['獎勵','獎勵事件'],['累積獎池','累積獎池']]):
    selectField(typeLabel,'type',types);
  let extra='';
  if(def.key==='electronic')extra=selectField('觸發事件','event',[['','全部事件'],['收取','主動收取'],['失敗','闖關失敗'],['追加','追加下注']])+selectField('結束原因','endReason',[['','全部原因'],'玩家主動收取','闖關失敗'])+selectField('難度','difficulty',[['','全部難度'],'一般','困難'])+selectField('最高倍率','multiplier',[['','不限倍率'],['high','≥ 1.50×'],['low','< 1.50×']])+selectField('結算／對帳','recon',[['','全部狀態'],'已核對','補單已核對']);
  if(def.key==='fishing')extra=textField('魚種／魚隻實例 ID','fish','例如 F9006')+textField('射擊 ID','shot','例如 SH-0301-090')+selectField('道具／技能','tool',[['','全部類型'],'雷射炮',['無道具','無道具']])+selectField('觸發事件','event',[['','全部事件'],['雷射炮','雷射炮'],['金龍','首領事件'],['未捕獲','未捕獲']])+selectField('結算／對帳','recon',[['','全部狀態'],'已核對','補單已核對']);
  return '<form id="query-form" class="filters"><div class="filter-row"><div class="field date"><label>日期區間</label><button type="button" class="date-button" data-action="date">'+e(f.start.replaceAll('-','/'))+(f.start!==f.end?' — '+e(f.end.replaceAll('-','/')):'')+'<span class="chevron">'+img('7d07b.svg')+'</span></button></div>'+selectField('商戶／站點','merchant',[['','全部站點'],['示範商戶／主站','示範商戶／主站']])+gameSelect+textField('投注單號／玩家','query','輸入單號、帳號或玩家 ID','search')+'<div class="field currency"><label for="currency">幣別</label><select id="currency" aria-label="幣別"><option>USDT</option></select></div><div class="filter-actions"><button class="button primary" type="submit">查詢</button><button class="button" type="button" data-action="reset">重設</button></div></div>'+(extra?'<div class="filter-row extra-filters">'+extra+'</div>':'')+'</form>';
}
function summaryHtml(def,rs){return '<div class="summary">'+summaryFor(def,rs).map(([label,v],i)=>'<div class="summary-card"><p class="summary-label">'+label+'</p><p class="summary-number '+(i===3?tone(v):'')+'">'+v+'</p></div>').join('')+'</div>';}
function getReport(){
  const t=current(),d=defs.get(t.key),rs=filterRecords(DATA.records,t.key,t.filters);
  return {t,d,rs,rows:sortedRows(rowsFor(d,rs),t.sort)};
}
function linkCell(d,row,index,text){
  if(index===d.headers.length-1)return '<button class="detail-link" data-row-detail="'+e(rowId(d,row))+'">'+e(text)+'</button>';
  if(d.headers[index].includes('玩家帳號')||d.headers[index].includes('玩家 ID')){
    const name=d.key==='player'?row[0]:d.key==='slots'?row[1]:row[2];
    return '<button class="text-link" data-player="'+e(name)+'">'+e(text)+'</button>';
  }
  if(d.headers[index].includes('投注單號')||d.headers[index].includes('結算單號'))return '<button class="text-link" data-record="'+e(text)+'">'+e(text)+'</button>';
  return e(text);
}
function rowId(d,row){return d.key==='player'?'player:'+row[0]:d.key==='stats'?'stats:'+row[0]:d.key==='slots'?'DEMO-S'+row[3].replace('#',''):row[1];}
const isNumeric=h=>/投注|派彩|盈虧|成本|獎金|餘額|金額|倍數|倍率|數$|次數|排行/.test(h)&&!/(單號|類型|時間|摘要|記錄)/.test(h);
function tableHtml(d,rs,rows){
  const t=current(),visible=t.columns.filter(i=>i>=0&&i<d.headers.length);
  if(!visible.length)t.columns=[0];
  const cols=visible.length?visible:[0],freeze=Math.min(innerWidth<760?1:t.freeze,cols.length);
  let left=0;
  const style=cols.map((col,i)=>{const x={width:d.widths[col],left:i<freeze?left:null,last:i===freeze-1};left+=d.widths[col];return x;});
  const tableWidth=style.reduce((n,c)=>n+c.width,0);
  const pageCount=Math.max(1,Math.ceil(rows.length/t.pageSize));t.page=Math.max(1,Math.min(t.page,pageCount));
  const pageRows=rows.slice((t.page-1)*t.pageSize,t.page*t.pageSize);
  const tdStyle=(st,i)=>' style="width:'+st.width+'px;min-width:'+st.width+'px;'+(st.left!==null?'left:'+st.left+'px;':'')+'"';
  const heads=cols.map((col,i)=>'<th scope="col" data-column="'+col+'" aria-sort="'+(t.sort?.index===col?(t.sort.direction==='asc'?'ascending':'descending'):'none')+'" class="'+(isNumeric(d.headers[col])?'num ':'')+(style[i].left!==null?'frozen ':'')+(style[i].last?'freeze-end ':'')+(t.sort?.index===col?'sorted':'')+'"'+tdStyle(style[i],i)+'><button data-sort="'+col+'" title="點擊排序；右鍵凍結欄位">'+e(d.headers[col])+'<span class="sort-mark">'+(t.sort?.index===col?(t.sort.direction==='asc'?'↑':'↓'):'↕')+'</span></button></th>').join('');
  const body=pageRows.map(row=>'<tr>'+cols.map((col,i)=>'<td title="'+e(row[col])+'" class="'+(isNumeric(d.headers[col])?'num ':'')+(style[i].left!==null?'frozen ':'')+(style[i].last?'freeze-end ':'')+(col===d.pnlColumn||d.key==='slots'&&col===17?tone(row[col]):'')+'"'+tdStyle(style[i],i)+'>'+linkCell(d,row,col,row[col])+'</td>').join('')+'</tr>').join('');
  const note=rows.length?'顯示 '+((t.page-1)*t.pageSize+1)+'–'+Math.min(rows.length,t.page*t.pageSize)+' 筆，共 '+rows.length+' 筆 · USDT · 橫向捲動查看完整欄位 · 右鍵表頭可凍結至該欄':'符合條件的記錄為 0 筆';
  return '<section class="report-card" aria-label="報表資料"><div class="table-toolbar"><h2>'+e(d.title.replace('記錄','明細'))+' · USDT</h2><div class="table-actions">'+button('欄位設定','columns','small')+button('匯出 CSV','export','small','title="匯出目前篩選結果的所有頁與可見欄位"')+'</div></div><div class="table-viewport" tabindex="0" aria-label="可橫向與縱向捲動的報表">'+(rows.length?'<table class="report-table" style="width:'+tableWidth+'px"><colgroup>'+cols.map((col,i)=>'<col style="width:'+style[i].width+'px">').join('')+'</colgroup><thead><tr>'+heads+'</tr></thead><tbody>'+body+'</tbody></table>':'<div class="empty-state"><h2>沒有符合條件的記錄</h2><p>請調整日期、玩家或其他篩選條件。</p>'+button('重設篩選','reset','primary')+'</div>')+'</div><p class="table-note">'+note+'</p><div class="pagination"><label class="page-size">每頁 <select id="page-size" aria-label="每頁筆數">'+[10,20,50,100].map(n=>option(String(n),n,t.pageSize+'')).join('')+'</select> 筆</label><div class="page-controls"><button data-page="'+(t.page-1)+'" '+(t.page===1?'disabled':'')+'>上一頁</button>'+Array.from({length:pageCount},(_,i)=>'<button class="'+(t.page===i+1?'current':'')+'" data-page="'+(i+1)+'" aria-label="第 '+(i+1)+' 頁" '+(t.page===i+1?'aria-current="page"':'')+'>'+(i+1)+'</button>').join('')+'<button data-page="'+(t.page+1)+'" '+(t.page===pageCount?'disabled':'')+'>下一頁</button></div></div></section>';
}
function distribution(rs){
  const types=['電子遊戲','老虎機','捕魚','棋牌'],values=types.map(k=>totals(rs.filter(r=>r.kind===k)).bet),max=Math.max(...values,1);
  return '<section class="distribution"><h2>投注額分布（USDT）</h2><div class="distribution-grid">'+types.map((k,i)=>'<div class="distribution-item"><span>'+k+' '+money(values[i])+'</span><div class="track"><div class="bar" style="width:'+values[i]/max*100+'%"></div></div></div>').join('')+'</div></section>';
}
function chooser(){return '<div class="page"><div class="page-heading"><div><h1>新增工作分頁</h1><p class="breadcrumb">選擇報表，開始新的查詢</p></div><span class="badge">USDT · 模擬資料</span></div><div class="chooser-grid">'+DATA.reports.map(d=>'<button class="chooser-card" data-report="'+d.key+'">'+icon(d.icon)+'<span>'+d.title+'<small>獨立保存篩選、排序、頁碼及欄位</small></span></button>').join('')+'</div></div>';}
function renderContent(){
  const t=current();
  if(t.key==='new'){$('#content').innerHTML=chooser();return;}
  if(!defs.has(t.key)){$('#content').innerHTML='<div class="page"><div class="page-heading"><div><h1>'+e(t.title)+'</h1><p class="breadcrumb">'+menus.find(m=>m[0]===category)?.[1]+' / '+e(t.title)+'</p></div><span class="badge">導覽示意</span></div><section class="generic-page"><h2>此頁內容待後續規劃</h2><p class="muted">目前 Demo 優先提供完整的遊戲報表與模擬明細。</p>'+button('開啟所有遊戲投注記錄','open-all','primary')+'</section></div>';return;}
  const {d,rs,rows}=getReport();
  $('#content').innerHTML='<div class="page"><div class="page-heading"><div><h1>'+e(d.title)+'</h1><p class="breadcrumb">遊戲報表 / '+e(d.title)+'</p></div><span class="badge">模擬資料</span></div>'+filtersHtml(d)+summaryHtml(d,rs)+tableHtml(d,rs,rows)+(d.key==='stats'?distribution(rs):'')+'<p class="page-note">模擬資料 · USDT · UTC+8 · 派彩含本金；玩家淨盈虧＝派彩−實扣投注（示例無退款／費用）。各頁使用同一組資料。</p></div>';
}
function render(){
  $('#app').classList.toggle('submenu-closed',!submenuOpen);renderRail();renderMenu();renderHeader();renderContent();persist();
  document.title=(current().title||'遊戲報表')+' · R&R CMS Demo';
  if(defs.has(current().key))history.replaceState(null,'','#'+current().key);
  requestAnimationFrame(()=>{
    const t=current(),v=$('.table-viewport');if(v){v.scrollLeft=t.scroll.x;v.scrollTop=t.scroll.y;}
    $('#content').scrollTop=t.scroll.main;
    const active=$('.work-tab.active');if(active)active.scrollIntoView({block:'nearest',inline:'nearest'});
    alignHeader();
  });
}
function alignHeader(){const page=$('.page');if(page)$('#header').style.width=page.getBoundingClientRect().width+'px';}
new ResizeObserver(alignHeader).observe($('#content'));
function showDialog(title,html,{drawer=false,subtitle='',footer=''}={}){
  const dialog=$('#modal');if(dialog.open)dialog.close();
  dialog.className=drawer?'drawer':'';
  dialog.innerHTML='<div class="dialog-header"><div><h2 id="dialog-title">'+title+'</h2>'+(subtitle?'<small>'+subtitle+'</small>':'')+'</div><button class="icon-button close" data-action="close-dialog" aria-label="關閉視窗">×</button></div><div class="dialog-body">'+html+'</div>'+(footer?'<div class="dialog-footer">'+footer+'</div>':'');
  dialog.showModal();
}
function closeDialog(){if($('#modal').open)$('#modal').close();dialogState=null;}
function miniTable(headers,rows){
  return '<div class="mini-scroll"><table class="mini-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td class="'+(/^[+−][\d,]+\.\d\d$/.test(String(v))?tone(v):'')+'">'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function kv(values){return '<div class="key-values">'+values.map(([label,value])=>'<div><small>'+e(label)+'</small><span>'+e(value)+'</span></div>').join('')+'</div>';}
function detailSummary(r){return '<div class="summary">'+[['實扣投注',money(r.bet)],['結算派彩',money(r.payout)],['玩家淨盈虧',signed(r.net)]].map(([label,v],i)=>'<div class="summary-card"><p class="summary-label">'+label+'（USDT）</p><p class="summary-number '+(i===2?tone(v):'')+'">'+v+'</p></div>').join('')+'</div>';}
function section(title,html){return '<section class="detail-section"><h3>'+title+'</h3>'+html+'</section>';}
function timeline(events){return '<ol class="timeline">'+events.map(([time,title,text])=>'<li><small>'+e(time)+'</small><p>'+e(title)+'</p><small>'+e(text)+'</small></li>').join('')+'</ol>';}
function openPlayer(name){
  const rs=DATA.records.filter(r=>r.player===name);if(!rs.length)return;
  const t=totals(rs),groups=DATA.reports.find(d=>d.key==='player'),rows=rowsFor(groups,rs),recent=[...rs].sort((a,b)=>b.time.localeCompare(a.time));
  dialogState={type:'player',name};
  const data=kv([['玩家帳號',name],['玩家 ID',playerId(name)],['商戶／站點','示範商戶／主站'],['最近遊戲',recent[0].game],['最近遊玩時間',recent[0].date+' '+recent[0].time],['結算後餘額',money(10000+t.net)+' USDT']]);
  const html=data+detailSummary({bet:t.bet,payout:t.payout,net:t.net})+
    section('各遊戲盈虧／投注額排行',miniTable(['排行','遊戲','類型','記錄筆數','投注 USDT','派彩 USDT','玩家淨盈虧'],rows.map((r,i)=>[i+1,r[4],r[3],r[5],r[6],r[7],r[8]])))+
    section('最近遊玩',miniTable(['時間','遊戲','投注單號','投注','派彩','玩家淨盈虧'],recent.map(r=>[r.time,r.game,r.id,money(r.bet),money(r.payout),signed(r.net)])))+
    button('在新分頁查看此玩家投注記錄','player-records','primary','data-name="'+name+'"');
  showDialog('玩家詳情 · '+e(name),html,{drawer:true,subtitle:playerId(name)+' · USDT · 模擬玩家資料'});
}
function openRecord(id){
  const r=DATA.records.find(r=>r.id===id);if(!r){toast('找不到此模擬記錄');return;}
  dialogState={type:'record',id};const b=balances(DATA.records,r);
  const common=kv([['投注單號',r.id],['玩家帳號／ID',r.player+' / '+playerId(r.player)],['遊戲名稱',r.game],['回合／批次 ID',r.round],['記錄時間',r.date+' '+r.time],['結算狀態／對帳',r.status+' / '+r.recon]]);
  const wallet=section('資金與對帳',miniTable(['交易 ID','類型','扣款 USDT','入帳 USDT','餘額 USDT','狀態'],[
    ['BAL-'+r.round,'結算前餘額','0.00','0.00',money(b.before),'已核對'],
    ['DEBIT-'+r.round,'投注扣款',money(r.bet),'0.00',money(b.before-r.bet),'已入帳'],
    ['CREDIT-'+r.round,'結算派彩','0.00',money(r.payout),money(b.after),'已入帳']
  ])+'<p class="detail-note">退款 0.00 USDT · 費用 0.00 USDT · 對帳差額 0.00 USDT。父層總額與明細交易不重複加總。</p>');
  let specific='';
  if(r.kind==='電子遊戲'){
    const win=r.id==='DEMO-E001';
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
    ]))+section('收取與終局',kv([['結束原因',win?'玩家主動收取':'第 3 關失敗'],['實際收取倍率',win?'1.20×':'未收取'],['實際派彩',money(r.payout)+' USDT'],['收取方式',win?'手動全額收取':'未執行收取'],['最後未入帳金額',win?'0.00 USDT':'240.00 USDT（已失效）'],['規則版本','DEMO-PROGRESS-1.0']]))+'<p class="detail-note">示例追加下注會增加實扣本金；單純繼續闖關不再扣款。失敗前可領金額不屬於已入帳派彩。</p>';
  }else if(r.kind==='捕魚'){
    const f=fishingDetail(r),first=r.id==='DEMO-F001';
    const shots=f.shots.map(s=>[s.id,s.time,s.bullet,s.source,money(s.cost),s.target,s.result,s.tool]);
    specific=section('射擊與道具摘要',kv([['付費／免費射擊',f.paid+' / '+f.free+' 發'],['單發成本','2.00 USDT（免費彈 0.00）'],['子彈成本',money(f.paid*2)+' USDT'],['使用道具',first?'雷射炮 IT-LAS01 × 1':'未使用道具'],['道具成本',money(f.toolCost)+' USDT'],['擊殺／首領擊殺',first?'6 / 1':'0 / 0']]))+
      section('魚隻命中、擊殺與獎金',miniTable(['魚隻實例 ID','魚種','魚種 ID','關聯射擊','結果','實際倍率','一般獎金','技能獎金','轉盤獎金','合計 USDT','派彩交易 ID','入帳'],f.fish))+
      (first?section('道具與特殊事件',miniTable(['事件 ID','觸發來源','道具／事件','扣款 USDT','獎金 USDT','關聯對象','結果'],[
        ['EV-F001-01','購買道具','雷射炮 IT-LAS01','20.00','0.00','TOOL-F001-01','庫存 1 → 0'],
        ['EV-F001-02','SH-0301-090','雷射擊殺','0.00','40.00','金龍首領 F9006','已入帳'],
        ['EV-F001-03','EV-F001-02','首領倍率轉盤','0.00','60.00','BONUS-F001-01','完成；免費彈 10 發']
      ])):section('補單與對帳事件',timeline([['原結算','批次完成，未捕獲','60 發付費子彈，實扣 120.00 USDT'],['補單處理','收到重送結算結果','使用原交易 ID 去重，未再次扣款'],['核對完成','補單已核對','投注 120.00、派彩 0.00、差額 0.00 USDT']])) )+
      section('逐發射擊 · '+f.shots.length+' 發',miniTable(['射擊 ID','相對時間','子彈類型','來源','成本 USDT','魚隻 ID','命中結果','武器／道具'],shots))+
      '<p class="detail-note">每發與魚隻實例均保留 ID。付費子彈 '+money(f.paid*2)+'＋道具 '+money(f.toolCost)+'＝'+money(r.bet)+' USDT；一般 '+money(f.normal)+'＋技能 '+money(f.skill)+'＋獎勵 '+money(f.bonus)+'＝'+money(r.payout)+' USDT。</p>';
  }else if(r.kind==='老虎機'){
    const row=defs.get('slots').rows.find(row=>row[3]==='#'+r.id.replace('DEMO-S',''));
    const index=number(row[3].slice(1))-601;
    specific=section('旋轉與獎勵關聯',kv([['旋轉編號',row[3]],['遊戲場次','SL-001'],['旋轉類型',row[4]],['父旋轉',row[11]],['免費旋轉序號',row[12]],['消除／重轉次數',row[13]],['觸發事件',row[5]],['派彩倍數',row[19]],['場次累積盈虧',row[17]+' USDT']]))+
      section('派彩拆分',miniTable(['基本派彩','獎勵派彩','累積獎池派彩','合計 USDT'],[[row[14],row[15],row[16],row[7]]]))+
      section('場次旋轉關聯',miniTable(['旋轉','類型','事件','實扣','派彩','淨盈虧','結算後餘額'],defs.get('slots').rows.filter((x,i)=>Math.abs(i-index)<=2).map(x=>[x[3],x[4],x[5],x[6],x[7],x[8],x[18]])))+
      '<p class="detail-note">金額沿用設計參考的 14 次旋轉範例；父子關聯與消除次數為補充模擬。免費旋轉不使用零投注作為倍數分母。</p>';
  }else{
    const blackjack=r.id==='DEMO-C001',bull=r.id==='DEMO-C002';
    const cards=values=>'<div class="card-hand">'+values.map(v=>'<span class="playing-card '+(/[♥♦]/.test(v)?'negative':'')+'">'+v+'</span>').join('')+'</div>';
    specific=blackjack?section('21 點 · 已結束牌局',kv([['房間／桌號','21 點／T-01'],['座位','02'],['結果','玩家 20 點勝莊家 18 點'],['分牌／加倍','未分牌／未加倍'],['保險下注','未投保，0.00 USDT'],['派彩倍數','2.00×（含本金）']]))+
      section('玩家手牌 · 20 點',cards(['K♠','Q♥']))+section('莊家手牌 · 18 點',cards(['10♣','8♦']))+
      section('牌局事件',miniTable(['手牌 ID','操作','投注','派彩','結果'],[['HAND-BJ0401-01','停牌','300.00','600.00','勝']])):
      bull?section('牛牛 · 已結束牌局',kv([['房間／桌號','牛牛／T-02'],['座位／角色','03／閒家'],['底注／下注倍數','50.00 USDT／1×'],['搶莊倍數','1×'],['玩家牌型／牌型倍率','牛牛／3×'],['莊家牌型','牛七']]))+
      section('玩家牌面',cards(['10♠','J♥','Q♣','K♦','10♥']))+section('莊家牌面',cards(['7♣','8♦','5♠','2♥','5♣']))+
      '<p class="detail-note">示例淨贏＝底注 50.00 × 牌型 3＝150.00 USDT；返還實扣 150.00 後，結算派彩為 300.00 USDT。</p>':
      section('鬥地主 · 已結束牌局',kv([['房間／桌號','鬥地主／T-03'],['角色／座位','地主／01'],['底分','50.00 USDT'],['叫分倍數','2×'],['炸彈／春天','炸彈 1 次／未觸發春天'],['最終倍數','2 × 2＝4×']]))+
      section('底牌',cards(['大王','A♠','3♦']))+
      section('倍數與終局',miniTable(['事件','倍數前','倍數後','結算影響'],[['叫分完成','1×','2×','底分 × 2'],['四張 7 炸彈','2×','4×','底分 × 4'],['農民陣營勝','4×','4×','地主對兩位農民各負 200.00']]))+
      '<p class="detail-note">示例地主淨損失＝50.00 × 4 × 2 位農民＝400.00 USDT；此局派彩為 0.00 USDT。</p>';
  }
  showDialog('投注明細 · '+e(r.game),common+detailSummary(r)+specific+wallet+button('查看玩家詳情','detail-player','primary','data-name="'+r.player+'"'),{drawer:true,subtitle:r.id+' · USDT · 模擬資料'});
}
function showColumns(){
  if(!dialogState||dialogState.type!=='columns'){
    const d=defs.get(current().key);dialogState={type:'columns',order:current().columns.concat(d.headers.map((_,i)=>i).filter(i=>!current().columns.includes(i))),shown:[...current().columns],freeze:current().freeze};
  }
  const d=defs.get(current().key),s=dialogState;
  const list='<div class="column-grid">'+s.order.map((index,pos)=>'<div class="column-item"><label><input type="checkbox" data-show-column="'+index+'" '+(s.shown.includes(index)?'checked':'')+'>'+e(d.headers[index])+'</label><button data-move-column="'+pos+'" data-direction="-1" aria-label="向前移動 '+e(d.headers[index])+'" '+(pos===0?'disabled':'')+'>↑</button><button data-move-column="'+pos+'" data-direction="1" aria-label="向後移動 '+e(d.headers[index])+'" '+(pos===s.order.length-1?'disabled':'')+'>↓</button></div>').join('')+'</div>';
  showDialog('欄位設定', '<p class="notice">勾選顯示欄位，使用箭頭調整順序。此設定只套用目前工作分頁。</p>'+list+'<label>凍結左側欄位　<select id="freeze-count">'+[0,1,2,3,4,5].map(n=>option(String(n),n===0?'不凍結':n+' 欄',String(s.freeze))).join('')+'</select></label>',{footer:button('恢復預設','columns-default')+button('套用','columns-apply','primary')});
}
function showDate(){
  const f=current().draft;
  showDialog('日期區間','<div class="dates"><label>開始日期<br><br><input type="date" id="date-start" value="'+e(f.start)+'"></label><label>結束日期<br><br><input type="date" id="date-end" value="'+e(f.end)+'"></label></div><div class="date-presets">'+button('模擬資料日 · 10/15','date-demo','small')+button('本月','date-month','small')+'</div><p class="notice">目前模擬資料日期為 2026/10/15，時間採 UTC+8。選擇其他日期可查看無資料狀態。</p>',{footer:button('取消','close-dialog')+button('套用日期','date-apply','primary')});
}
function showSearch(query=''){
  const matches=DATA.reports.filter(d=>d.title.includes(query));
  const players=[...new Set(DATA.records.map(r=>r.player))].filter(n=>query&&(n.includes(query)||playerId(n).toLowerCase().includes(query.toLowerCase())));
  return '<div class="search-results">'+matches.map(d=>'<button class="search-result" data-report="'+d.key+'">'+icon(d.icon)+'<span>'+d.title+'</span></button>').join('')+players.map(n=>'<button class="search-result" data-player="'+n+'">'+icon('a24ad.svg')+'<span>'+n+' · '+playerId(n)+'</span></button>').join('')+(!matches.length&&!players.length?'<p class="notice">找不到符合的頁面或玩家。</p>':'')+'</div>';
}
function queryForm(){
  const values=Object.fromEntries(new FormData($('#query-form')));
  current().draft={...current().draft,...values};current().filters={...current().draft};current().page=1;current().scroll={x:current().scroll.x,y:0,main:0};render();
}
document.addEventListener('submit',event=>{if(event.target.id==='query-form'){event.preventDefault();queryForm();}});
document.addEventListener('input',event=>{
  if(event.target.closest('#query-form')&&event.target.name)current().draft[event.target.name]=event.target.value;
  if(event.target.id==='quick-search')$('#search-list').innerHTML=showSearch(event.target.value);
});
document.addEventListener('change',event=>{
  if(event.target.id==='page-size'){saveView();current().pageSize=Number(event.target.value);current().page=1;current().scroll.y=0;render();}
  if(event.target.matches('[data-show-column]')){
    const i=Number(event.target.dataset.showColumn),s=dialogState;
    s.shown=event.target.checked?[...s.shown,i]:s.shown.filter(x=>x!==i);
  }
  if(event.target.id==='freeze-count'&&dialogState)dialogState.freeze=Number(event.target.value);
  if(event.target.closest('#query-form')&&event.target.name)current().draft[event.target.name]=event.target.value;
});
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.closest('form')&&target.type!=='submit')event.preventDefault();
  if(target.dataset.report){openReport(target.dataset.report,{duplicate:event.metaKey||event.ctrlKey||event.shiftKey});return;}
  if(target.dataset.tab){activate(target.dataset.tab);return;}
  if(target.dataset.closeTab){closeTab(target.dataset.closeTab);return;}
  if(target.dataset.category){
    const key=target.dataset.category;submenuOpen=category===key?!submenuOpen:true;category=key;languageOpen=false;renderRail();renderMenu();$('#app').classList.toggle('submenu-closed',!submenuOpen);persist();return;
  }
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
  if(target.hasAttribute('data-page')){saveView();current().page=Number(target.dataset.page);current().scroll.y=0;render();return;}
  if(target.dataset.lang){languageOpen=false;renderRail();if(target.dataset.lang!=='zh-Hant')toast('此 Demo 目前以繁體中文提供完整內容');return;}
  if(target.hasAttribute('data-move-column')){
    const i=Number(target.dataset.moveColumn),j=i+Number(target.dataset.direction),s=dialogState;
    [s.order[i],s.order[j]]=[s.order[j],s.order[i]];showColumns();return;
  }
  switch(target.dataset.action){
    case 'collapse':submenuOpen=false;$('#app').classList.remove('mobile-open');render();break;
    case 'mobile-menu':$('#app').classList.toggle('mobile-open');submenuOpen=true;$('#app').classList.remove('submenu-closed');renderMenu();break;
    case 'new-tab':newTab();break;
    case 'language':languageOpen=!languageOpen;renderRail();break;
    case 'theme':document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light';persist();break;
    case 'reset':current().filters=defaultFilters();current().draft=defaultFilters();current().sort=null;current().page=1;current().scroll={x:0,y:0,main:0};render();break;
    case 'open-all':openReport('all');break;
    case 'close-dialog':closeDialog();break;
    case 'date':showDate();break;
    case 'date-demo':$('#date-start').value='2026-10-15';$('#date-end').value='2026-10-15';break;
    case 'date-month':$('#date-start').value='2026-10-01';$('#date-end').value='2026-10-31';break;
    case 'date-apply':{
      const start=$('#date-start').value,end=$('#date-end').value;if(!start||!end||start>end){toast('請確認開始日期不晚於結束日期');return;}
      current().draft.start=start;current().draft.end=end;current().filters={...current().draft};current().page=1;closeDialog();render();break;
    }
    case 'columns':showColumns();break;
    case 'columns-default':{const d=defs.get(current().key);dialogState={type:'columns',order:d.headers.map((_,i)=>i),shown:d.headers.map((_,i)=>i),freeze:3};showColumns();break;}
    case 'columns-apply':{
      if(!dialogState.shown.length){toast('請至少保留一個欄位');return;}
      saveView();current().columns=dialogState.order.filter(i=>dialogState.shown.includes(i));current().freeze=dialogState.freeze;current().scroll.x=0;closeDialog();render();toast('已套用目前分頁的欄位設定');break;
    }
    case 'export':{
      const {d,rows}=getReport(),cols=current().columns;
      const blob=new Blob([csv(cols.map(i=>d.headers[i]),rows.map(r=>cols.map(i=>r[i])))],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='R&R_'+d.title+'_USDT_'+current().filters.start+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出 '+rows.length+' 筆篩選結果（USDT）');break;
    }
    case 'detail-player':openPlayer(target.dataset.name);break;
    case 'player-records':openReport('all',{duplicate:true,filters:{query:target.dataset.name}});break;
    case 'search':showDialog('快速搜尋','<input id="quick-search" class="dialog-search" placeholder="搜尋報表名稱、玩家帳號或 ID" aria-label="快速搜尋"><div id="search-list">'+showSearch()+'</div>');requestAnimationFrame(()=>$('#quick-search').focus());break;
    case 'apps':showDialog('頁面捷徑','<div class="search-results">'+DATA.reports.map(d=>'<button class="search-result" data-report="'+d.key+'">'+icon(d.icon)+d.title+'</button>').join('')+'</div>');break;
    case 'notifications':showDialog('通知','<div class="small-menu"><button data-record="DEMO-F002"><strong>補單核對完成</strong><p class="notice">捕魚批次 FB-0302 已完成核對，未重複扣款。</p></button><button data-action="open-all"><strong>模擬資料準備完成</strong><p class="notice">21 筆記錄、4 位玩家、6 款遊戲，幣別為 USDT。</p></button></div>');break;
    case 'profile':showDialog('平台管理員',kv([['使用者','平台管理員'],['環境','互動 Demo'],['資料來源','USDT 模擬資料']])+'<p class="notice">操作與分頁設定儲存在目前瀏覽器。此示範未連接正式帳號與資金系統。</p>');break;
  }
});
document.addEventListener('click',event=>{if(languageOpen&&!event.target.closest('.language-menu,.language-trigger')){languageOpen=false;renderRail();}});
document.addEventListener('contextmenu',event=>{
  const th=event.target.closest('.report-table th');if(!th)return;event.preventDefault();
  const index=current().columns.indexOf(Number(th.dataset.column));
  showDialog('凍結欄位','<p class="notice">將左側欄位固定，橫向捲動時仍可辨識記錄。</p><div class="small-menu"><button data-freeze="'+(index+1)+'">凍結至「'+e(defs.get(current().key).headers[Number(th.dataset.column)])+'」</button><button data-freeze="0">取消凍結</button></div>');
});
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-freeze]');if(!b)return;saveView();current().freeze=Number(b.dataset.freeze);closeDialog();render();toast(current().freeze?'已凍結左側 '+current().freeze+' 欄':'已取消凍結');
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){languageOpen=false;renderRail();$('#app').classList.remove('mobile-open');}
  const button=event.target.closest('[role=tab]');
  if(button&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();let index=tabs.findIndex(t=>t.id===activeId);
    index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    activate(tabs[index].id);requestAnimationFrame(()=>$('[data-tab="'+activeId+'"]').focus());
  }
});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
$('#modal').addEventListener('cancel',()=>{dialogState=null;});
window.addEventListener('beforeunload',saveView);
const requested=location.hash.slice(1);if(defs.has(requested)){let t=tabs.find(t=>t.key===requested);if(!t){t=tab(requested);tabs.push(t);}activeId=t.id;}
render();
