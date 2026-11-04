import {gameCatalog} from './game-catalog.js?v=14.4.1';
import {money,signed,totals,rowsFor,summaryFor,tableTotals,chessDetail} from './core.js?v=14.4.1';

const wrapperNames=['星河','遠航','極光','天域','藍海','金曜','宏宇','鼎盛','雲端','盛世','天啟','環球','智匯','富邦','卓越','領航','星瀚','博遠','眾鑫','新銳'];
const cashNames=[
 '金鼎','皇家','盛樂','百勝','金富','富豪','樂盈','鼎豐','金鑽','萬利',
 '龍騰','瑞豐','永利','金獅','彩虹','皇冠','金鳳','樂寶','星耀','豪門',
 '金都','寶盛','樂天','新濠','永盛','鑽石','銀河','華麗','金龍','海王',
 '富彩','財富','金牌','凱旋','福星','大滿貫','金冠','豪運','嘉年華','金悅',
 '御金','悅彩','天樂','寶運','金祥','鼎樂','御彩','金瑞','鳳凰','雲頂'
];
const existingSiteIds=['A1','A2','B1','B2','A3','B3','C1','C2','C3','D1','D2','D3','E1','E2','E3','F1','F2','F3'];
const originalRegions=['未標示地區','越南','泰國','多地區','多地區','越南','台灣','越南','多地區','泰國','多地區','台灣','越南','泰國','多地區','台灣','泰國','多地區'];
const regions=['台灣','越南','泰國','馬來西亞','菲律賓','印尼'];
const integratorNames=['寰宇','天際','聯創','匯通','卓聯'];

function organizationsForDemo(source) {
  const supplier=source.organizations.find(org=>org.level==='遊戲商');
  const integrators=integratorNames.map((name,index)=>({
    id:index===0?'INT-DEMO':'INT-'+(index+1),name:name+'遊戲集成商',level:'遊戲集成商',parent:supplier.id
  }));
  const wrappers=wrapperNames.map((name,index)=>({
    id:'PKG-'+String.fromCharCode(65+index),name:name+'包網商',level:'包網商',parent:integrators[Math.floor(index/4)].id
  }));
  const sites=cashNames.map((name,index)=>{
    const oldId=existingSiteIds[index],wrapper=index<18?wrappers.find(org=>org.id==='PKG-'+oldId[0]):wrappers[6+(index-18)%14];
    return {id:oldId?'SITE-'+oldId:'SITE-'+String(index+1).padStart(3,'0'),name:name+'現金網',
      level:'現金網',parent:wrapper.id,region:originalRegions[index]||regions[(index-18)%regions.length]};
  });
  const agents=sites.flatMap(site=>{
    const first={id:'AG1-'+site.id,name:site.name+'一級代理',level:'第一層代理',parent:site.id};
    return [first,...[1,2].map(group=>({
      id:'AG2-'+site.id+'-'+group,name:site.name+'二級代理 '+group,level:'第二層代理',parent:first.id
    }))];
  });
  return [supplier,...integrators,...wrappers,...sites,...agents];
}

function recordWithOrganization(record,site,organizations) {
  const wrapper=organizations.find(org=>org.id===site.parent);
  const identity=String(record.player_id||record.player);
  const group=Array.from(identity).reduce((sum,char)=>sum+char.codePointAt(0),0)%2+1;
  return {...record,site:site.name,siteRegion:site.region,cashId:site.id,wrapperId:wrapper.id,
    integratorId:wrapper.parent,agent1Id:'AG1-'+site.id,agent2Id:'AG2-'+site.id+'-'+group};
}

function rebuildReports(source,records) {
  const types={electronic:'電子遊戲',slots:'老虎機',fishing:'捕魚',chess:'棋牌'};
  return source.reports.map(original=>{
    const def={...original,headers:original.headers.map(label=>label==='商戶／站點'?'現金網':label)};
    const entries=records.filter(record=>!types[def.key]||record.kind===types[def.key]);
    if(!['player','stats'].includes(def.key)){
      const templates=new Map(original.recordIds.map((id,index)=>[id,original.rows[index]]));
      def.recordIds=entries.map(record=>record.id);
      const balancesByRecord=new Map();
      if(def.key==='slots'){
        const accounts=new Map(),sessions=new Map();
        for(const record of [...records].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))){
          const account=record.cashId+'|'+record.player_id,session=account+'|'+(record.session||'SL-001');
          const after=(accounts.get(account)??10000)+record.net;
          accounts.set(account,after);
          if(record.kind!=='老虎機')continue;
          sessions.set(session,(sessions.get(session)||0)+record.net);
          balancesByRecord.set(record.id,{after,session:sessions.get(session)});
        }
      }
      def.rows=entries.map(record=>{
        const template=templates.get(record.id)||templates.get(record.seedId);
        const row=[...template];
        const values={
          '投注時間':record.time,'遊戲時間':record.time,'投注單號':record.id,'結算單號':record.id,
          '玩家帳號':record.player,'玩家 ID':record.player_id,'遊戲類型':record.kind,'遊戲名稱':record.game,
          '現金網':record.site,'供應商':'R&R 模擬遊戲商','實扣投注':money(record.bet),'結算派彩':money(record.payout),
          '玩家淨盈虧':signed(record.net),'本次淨盈虧':signed(record.net),'結算狀態':record.status,
          '觸發事件摘要':record.event,'觸發事件':record.event,'結算時間':record.settled,
          '退款':money(record.refund),'費用／抽水':money(record.fee),'對帳狀態':record.recon,
          '獎池派彩':money(record.jackpotAward),'累積獎池派彩':money(record.jackpotAward),
          '回合／批次 ID':record.round,'回合／局號':record.round,'場次／批次':record.round,'局號':record.round
        };
        if(def.key==='slots'){
          const balance=balancesByRecord.get(record.id);
          Object.assign(values,{'旋轉編號':record.spin||row[4],'遊戲場次':record.session||row[11],
            '場次累積盈虧':signed(balance.session),'結算後餘額':money(balance.after)});
          if(!templates.has(record.id)&&row[12].startsWith('#')){
            values['父旋轉／獎勵回合 ID']='#'+(Number(row[12].slice(1))+(record.parentOffset||0));
          }
          if(record.poolConvertedToBonus)Object.assign(values,{'基本派彩':'0.00','獎勵派彩':money(record.basePayout)});
        }
        if(def.key==='fishing')values['房間']=record.room;
        if(def.key==='chess'){
          const detail=chessDetail(record);
          Object.assign(values,{'玩法':{blackjack:'21 點',bull:'牛牛',landlord:'鬥地主'}[record.gameFamily],
            '結果摘要':detail.result,'底注／底分':money(detail.base),'結算倍數':detail.multiplier||money(detail.payout/detail.bet)+'×'});
        }
        def.headers.forEach((label,index)=>{if(Object.hasOwn(values,label))row[index]=values[label];});
        return row;
      });
    }
    def.rows=rowsFor(def,entries);
    def.summaryValues=summaryFor(def,entries);
    def.totalValues=tableTotals(def,entries,def.rows);
    def.note=def.rows.length+' 筆模擬資料 · USDT';
    return def;
  });
}

export function migrateDemoNames(workspace,data) {
  if(!workspace)return workspace;
  const rename=value=>typeof value==='string'?(data.organizationAliases[value]||value):Array.isArray(value)?value.map(rename):value;
  return {...workspace,tabs:workspace.tabs?.map(tab=>{
    const next={...tab};
    for(const field of ['filters','draft'])if(next[field])next[field]={...next[field],merchant:rename(next[field].merchant)};
    const def=data.reports.find(report=>report.key===tab.key),column=def?.headers.indexOf('現金網');
    if(column>=0&&next.columnFilters?.[column]){
      const rule=next.columnFilters[column];
      next.columnFilters={...next.columnFilters,[column]:{...rule,query:rename(rule.query),values:rename(rule.values)}};
    }
    return next;
  })};
}
export function expandDemoScenarios(source) {
  const organizations=organizationsForDemo(source),sites=organizations.filter(org=>org.level==='現金網');
  const siteMap=new Map(sites.map(site=>[site.id,site]));
  const records=source.records.map(record=>recordWithOrganization({
    ...record,slotGameplay:gameCatalog.find(game=>game.id===record.gameId)?.slotGameplay
  },siteMap.get(record.cashId),organizations));
  const templates=new Map(source.records.filter(record=>record.id===record.seedId).map(record=>[record.id,record]));
  const gamesByType=Object.fromEntries(['電子遊戲','老虎機','捕魚','棋牌'].map(type=>[type,gameCatalog.filter(game=>game.type===type)]));
  const existingPlayers=new Set(records.map(record=>record.player));
  const extraPlayers=500-existingPlayers.size;
  let sequence=0;
  function addRecord(templateId,game,player,site,slot=null) {
    const template=templates.get(templateId),record=structuredClone(template),index=++sequence;
    const seconds=(7*3600+index*7)%(24*3600);
    record.time=new Date(seconds*1000).toISOString().slice(11,19);
    record.settled=new Date((seconds+1)*1000).toISOString().slice(11,19);
    Object.assign(record,{id:'DEMO-EXP-'+String(index).padStart(6,'0'),player,player_id:'P'+player.slice(5),
      game:game.name,gameId:game.id,gameFamily:game.family,slotGameplay:game.slotGameplay,round:game.id+'-EXP-'+index});
    if(game.type==='捕魚'){
      record.round='FB-EXP-'+index;record.room=game.name+' 01 房';record.fishBase=100000+index*20;
    }
    if(slot){
      record.spin='#'+slot.spin;record.session=slot.session;record.parentOffset=slot.spin-Number(templateId.slice(6));
    }
    record.jackpot=null;
    if(!game.hasJackpot&&record.jackpotAward){
      record.poolConvertedToBonus=true;record.event='獎勵回合大獎';
    }
    record.jackpotAward=game.hasJackpot?template.jackpotAward:0;
    record.basePayout=record.payout-record.jackpotAward;
    if(game.hasJackpot&&game.type!=='老虎機'&&template.payout>0&&index%7===0){
      record.jackpotAward=game.type==='捕魚'?250:60;
      record.payout+=record.jackpotAward;record.net=record.payout-record.bet;
      record.bonus+=record.jackpotAward;record.event+='；獎池觸發';record.event_count++;
    }
    records.push(recordWithOrganization(record,site,organizations));
  }
  for(let index=0;index<extraPlayers;index++){
    const player='demo_'+(4001+index),site=sites[index%sites.length],cycle=Math.floor(index/sites.length);
    for(let round=0;round<2;round++)addRecord(round?'DEMO-E002':'DEMO-E001',gamesByType['電子遊戲'][(index*2+round+cycle*3)%25],player,site);
    const slotGame=gamesByType['老虎機'][(index+cycle*7)%25];
    for(let spin=0;spin<14;spin++)addRecord('DEMO-S'+(601+spin),slotGame,player,site,{spin:100000+index*14+spin,session:'SL-EXP-'+index});
    for(let round=0;round<2;round++)addRecord(round?'DEMO-F002':'DEMO-F001',gamesByType['捕魚'][(index*2+round+cycle*4)%25],player,site);
    for(let round=0;round<3;round++){
      const game=gamesByType['棋牌'][(index*3+round+cycle*5)%25];
      addRecord({blackjack:'DEMO-C001',bull:'DEMO-C002',landlord:'DEMO-C003'}[game.family],game,player,site);
    }
  }
  const originalPools=new Map(source.jackpotPools.map(pool=>[pool.game,pool]));
  const jackpotPools=gameCatalog.filter(game=>game.hasJackpot).map(game=>({
    ...(originalPools.get(game.name)||{id:'JP-'+game.id,game:game.name,name:game.name+'共用獎池',opening:100000,contributionRate:.02,ruleVersion:'DEMO-JP-1.0'})
  }));
  const poolsByGame=new Map(jackpotPools.map(pool=>[pool.game,pool]));
  const running=new Map(jackpotPools.map(pool=>[pool.id,Math.round(pool.opening*100)]));
  for(const record of [...records].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id))){
    const pool=poolsByGame.get(record.game);if(!pool)continue;
    const before=running.get(pool.id),contribution=Math.round(record.bet*pool.contributionRate*100);
    const after=before+contribution-Math.round(record.jackpotAward*100);
    const template=templates.get(record.seedId)?.jackpot;
    record.jackpot={...template,...record.jackpot,poolId:pool.id,poolName:pool.name,eligible:true,
      contribution:contribution/100,award:record.jackpotAward,before:before/100,after:after/100,
      triggerId:record.jackpotAward?'JP-EV-'+record.id:'尚未觸發',
      transactionId:record.jackpotAward?'JP-CREDIT-'+record.id:'未產生派彩',
      status:record.jackpotAward?'已入帳':'未觸發'};
    if(record.id.startsWith('DEMO-EXP-')&&record.jackpotAward){
      record.jackpot.parentEventId=record.round;
      record.jackpot.sourceId=record.kind==='捕魚'?'SH-'+record.round.replace('FB-','')+'-090':record.spin||record.round;
      record.jackpot.targetId=record.kind==='捕魚'?'F'+(record.fishBase+5):'不適用';
    }
    running.set(pool.id,after);
  }
  for(const pool of jackpotPools)pool.closing=running.get(pool.id)/100;
  const organizationAliases=Object.fromEntries(source.organizations.map(org=>[org.name,organizations.find(next=>next.id===org.id)?.name||org.name]));
  organizationAliases['示例遊戲集成商']=integratorNames[0]+'遊戲集成商';
  return {...source,revision:'discussion-5-20-50-100-500',games:gameCatalog,organizations,organizationAliases,records,
    jackpotPools,reports:rebuildReports(source,records),totals:totals(records)};
}
