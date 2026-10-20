import {readFileSync,writeFileSync} from 'node:fs';
import {money,signed,playerId,totals,rowsFor,summaryFor,tableTotals,balances,chessDetail} from '../core.js';
const seed=JSON.parse(readFileSync(new URL('../data/seed-data.json',import.meta.url)));
const data=structuredClone(seed),types={electronic:'電子遊戲',slots:'老虎機',fishing:'捕魚',chess:'棋牌'};
data.revision='2026-10-20-drilldown-covers-v6';
for(const r of data.records){r.seedId=r.id;r.player_id=playerId(r.player);if(r.kind==='電子遊戲'){r.difficulty=r.id.endsWith('001')?'一般':'困難';r.endReason=r.id.endsWith('001')?'玩家主動收取':'闖關失敗';r.maxMultiplier=r.id.endsWith('001')?1.2:1.6;}}
const sourceRows=new Map();
for(const d of seed.reports){if(['player','stats'].includes(d.key))continue;d.rows.forEach(row=>sourceRows.set(d.key+':'+(d.key==='slots'?'DEMO-S'+row[3].slice(1):row[1]),row));}
const clones=[];
function cloneRecord(template,key,index,player){
  const r=structuredClone(data.records.find(r=>r.id===template));
  r.seedId=template;r.id='DEMO-'+({electronic:'E',slots:'S',fishing:'F',chess:'C'}[key])+(key==='slots'?String(index):String(index).padStart(3,'0'));
  r.player=player;r.player_id=playerId(player);
  r.time=String(8+Math.floor(clones.length/60)).padStart(2,'0')+':'+String(clones.length%60).padStart(2,'0')+':12';
  r.scale=[0.5,1,2,3][key==='slots'?Math.floor((index-1601)/1000)%4:(index-101)%4];
  for(const field of ['bet','payout','net','bonus'])r[field]*=r.scale;
  r.settled=r.time.slice(0,-2)+'13';
  r.round=({electronic:'EG-',slots:'SP-',fishing:'FB-',chess:r.game==='經典 21 點'?'BJ-':r.game==='搶莊牛牛'?'NN-':'DDZ-'}[key])+String(4000+index);
  if(key==='fishing'){r.rewardMultiplier=[0.5,1,2,5][(index-101)%4];r.payout*=r.rewardMultiplier;r.bonus*=r.rewardMultiplier;r.net=r.payout-r.bet;r.fishBase=20001+index*20;r.event=r.event.replace('F9006','F'+(r.fishBase+5));}
  if(key==='chess'){r.cardVariant=Math.floor((index-101)/3);const c=chessDetail(r);r.bet=c.bet;r.payout=c.payout;r.net=c.net;r.event=c.action;r.result=c.result;}
  clones.push(r);return r;
}
// Exactly 100 records per category; retain every original reference record.
for(let i=0;i<98;i++)cloneRecord(i%3===0?'DEMO-E002':'DEMO-E001','electronic',101+i,'demo_'+(2001+i%32));
for(let i=0;i<86;i++){
 const group=Math.floor(i/14),spin=1601+group*1000+i%14;
 const r=cloneRecord('DEMO-S'+(601+i%14),'slots',spin,'demo_'+(2001+group));
 r.session='SL-'+String(group+2).padStart(3,'0');r.spin='#'+spin;r.parentOffset=1000+group*1000;
}
for(let i=0;i<98;i++)cloneRecord(i%3===0?'DEMO-F002':'DEMO-F001','fishing',101+i,'demo_'+(2001+i%32));
for(let i=0;i<97;i++)cloneRecord(['DEMO-C001','DEMO-C002','DEMO-C003'][i%3],'chess',101+i,'demo_'+(2001+i%32));
data.records.push(...clones);
// Optional game-specific pools. Contributions are included in wager, never an extra debit.
data.jackpotPools=Object.entries({'星際闖關':'JP-EG-001','翡翠金礦':'JP-SL-001','深海獵場':'JP-FI-001','經典 21 點':'JP-BJ-001','搶莊牛牛':'JP-NN-001'}).map(([game,id])=>({id,game,name:game+'共用獎池',opening:100000,contributionRate:0.02,ruleVersion:'DEMO-JP-1.0'}));
for(const r of data.records){
 const pool=data.jackpotPools.find(p=>p.game===r.game);r.basePayout=r.payout;r.jackpotAward=0;if(!pool){r.jackpot=null;continue;}
 const cloned=r.id!==r.seedId,index=Number(r.id.match(/\d+$/)[0]);
 const slot=r.kind==='老虎機'&&r.event==='累積獎池中獎';
 const triggered=slot||cloned&&(r.kind==='電子遊戲'&&r.seedId==='DEMO-E001'&&index%7===0||r.kind==='捕魚'&&r.seedId==='DEMO-F001'&&index%5===0||r.game==='經典 21 點'&&r.cardVariant%7===3||r.game==='搶莊牛牛'&&r.cardVariant%4===0&&index%5===0);
 const award=slot?r.payout:triggered?({電子遊戲:60,捕魚:250}[r.kind]||(r.game==='經典 21 點'?300:150))*(r.scale||1):0;
 if(slot)r.basePayout=0;else if(triggered){r.payout+=award;r.net+=award;r.bonus+=award;r.event+='；獎池觸發';r.event_count++;}
 r.jackpotAward=award;
 r.jackpot={poolId:pool.id,poolName:pool.name,level:slot?'大型':'小型',eligible:true,contribution:Math.round(r.bet*pool.contributionRate*100)/100,award,
  trigger:slot?'獎池符號':r.kind==='捕魚'?'金龍首領擊殺':r.kind==='電子遊戲'?'連闖 3 關':r.game==='經典 21 點'?'自然 21 點':'牛牛牌型',
  parentEventId:triggered?(r.kind==='捕魚'?'EV-'+r.id.replace('DEMO-','')+'-02':r.kind==='電子遊戲'?'EV-'+r.id.replace('DEMO-','')+'-04':r.round):'尚未觸發',sourceId:triggered?(r.kind==='捕魚'?'SH-'+r.round.replace('FB-','')+'-090':r.kind==='老虎機'?(r.spin||'#613'):r.round):'尚未觸發',targetId:triggered&&r.kind==='捕魚'?'F'+((r.fishBase||9001)+5):'不適用',
  triggerId:triggered?'JP-EV-'+r.id:'尚未觸發',transactionId:triggered?'JP-CREDIT-'+r.id:'未產生派彩',status:triggered?'已入帳':'未觸發',ruleVersion:pool.ruleVersion};
}
for(const pool of data.jackpotPools){let balance=pool.opening;for(const r of [...data.records].filter(r=>r.jackpot?.poolId===pool.id).sort((a,b)=>a.time.localeCompare(b.time))){r.jackpot.before=balance;balance=Math.round((balance+r.jackpot.contribution-r.jackpot.award)*100)/100;r.jackpot.after=balance;}pool.closing=balance;}
const wrappers=[{id:'PKG-A',name:'星河包網',parent:'PROV-RR',level:'包網商'},{id:'PKG-B',name:'遠航包網',parent:'PROV-RR',level:'包網商'}];
const sites=[{id:'SITE-A1',name:'示範商戶／主站',parent:'PKG-A',level:'現金網'},{id:'SITE-A2',name:'星河娛樂／越南站',parent:'PKG-A',level:'現金網'},{id:'SITE-B1',name:'遠航娛樂／泰國站',parent:'PKG-B',level:'現金網'},{id:'SITE-B2',name:'遠航娛樂／國際站',parent:'PKG-B',level:'現金網'}];
data.organizations=[{id:'PROV-RR',name:'R&R 模擬遊戲商',parent:null,level:'遊戲商'},...wrappers,...sites];
for(const r of data.records){const site=sites[r.player.startsWith('demo_2')?(Number(r.player.slice(5))-2001)%4:0];r.cashId=site.id;r.wrapperId=site.parent;r.providerId='PROV-RR';r.site=site.name;}
const moneyHeaders=new Set(['實扣投注','結算派彩','退款','費用／抽水','初始下注','追加下注合計','最後可領金額（未入帳）','基本派彩','獎勵派彩','累積獎池派彩','結算後餘額','子彈成本','道具實扣成本','一般捕獲獎金','道具／技能獎金','獎勵回合獎金','底注／底分','抽水／服務費','投注額','派彩','有效投注','退款／沖正','退款金額','獎勵／獎池派彩','獎池派彩']);
const counts=new Set(['通過關數','消除／重轉次數','道具使用次數','擊殺數','首領擊殺數','記錄筆數','觸發事件數','異常筆數','玩家數','遊戲數','已結算筆數','未結算筆數']);
const nonAdd=new Set(['最後可領金額（未入帳）','結算後餘額','底注／底分','通過關數']);
for(const d of data.reports){
  if(['all','electronic','chess','player'].includes(d.key)){d.headers.splice(d.headers.length-1,0,'獎池派彩');d.widths.splice(d.widths.length-1,0,170);}
  const at=d.key==='slots'?2:d.key==='stats'?2:3;
  if(d.key!=='player'){d.headers.splice(at,0,'玩家 ID');d.widths.splice(at,0,d.key==='stats'?220:140);if(d.pnlColumn>=at)d.pnlColumn++;}
  if(!['player','stats'].includes(d.key)){
    const rs=data.records.filter(r=>d.key==='all'||r.kind===types[d.key]);
    if(d.key==='all')rs.sort((a,b)=>b.time.localeCompare(a.time));
    d.recordIds=rs.map(r=>r.id);
    d.rows=rs.map(r=>{
      let row;
      if(d.key==='all')row=[r.time,r.id,r.player,r.kind,r.game,money(r.bet),signed(r.net),money(r.payout),r.status,'R&R 模擬供應商',r.site,r.round,r.event,r.settled,money(r.refund),money(r.fee),r.recon,'查看'];
      else{
        row=structuredClone(sourceRows.get(d.key+':'+r.seedId));
        row[0]=r.time;
        if(d.key==='slots'){
          row[1]=r.player;row[3]=r.spin||row[3];row[10]=r.session||row[10];
          if(row[11].startsWith('#'))row[11]='#'+(Number(row[11].slice(1))+(r.parentOffset||0));
          const session=data.records.filter(x=>x.kind==='老虎機'&&(x.session||'SL-001')===(r.session||'SL-001'));
          const upto=session.slice(0,session.indexOf(r)+1).reduce((s,x)=>s+x.net,0);
          row[17]=signed(upto);row[18]=money(balances(data.records,r).after);
        }else{row[1]=r.id;row[2]=r.player;row[4]=d.key==='chess'?row[4]:r.round;if(d.key==='chess')row[10]=r.round;if(d.key==='fishing')row[16]=r.event;}
      }
      if(d.key!=='all'){
        const hs=seed.reports.find(x=>x.key===d.key).headers;
        hs.forEach((h,i)=>{if((moneyHeaders.has(h)||h.includes('盈虧')) && h!=='場次累積盈虧'&&h!=='結算後餘額'){const m=String(row[i]).match(/^([+−-]?\d[\d,]*(?:\.\d+)?)(.*)$/);if(m)row[i]=(h.includes('盈虧')?signed:money)(Number(m[1].replaceAll(',','').replace('−','-'))*(r.scale||1))+m[2];}});
        for(const [h,v]of [['對帳狀態',r.recon],['觸發事件摘要',r.event]])if(hs.includes(h))row[hs.indexOf(h)]=v;
      }
      if(d.key==='chess'){const hs=seed.reports.find(x=>x.key==='chess').headers,c=chessDetail(r);for(const [h,v]of [['結果摘要',c.result],['底注／底分',money(c.base)],['結算倍數',c.multiplier||money(c.payout/c.bet)+'×']])row[hs.indexOf(h)]=v;}
      if(d.key==='fishing'){const hs=seed.reports.find(x=>x.key==='fishing').headers;hs.forEach((h,i)=>{if(/派彩|獎金/.test(h))row[i]=money(Number(String(row[i]).replaceAll(',',''))*(r.rewardMultiplier||1));});row[hs.indexOf('玩家淨盈虧')]=signed(r.net);}
      if(d.key!=='all'){const hs=seed.reports.find(x=>x.key===d.key).headers;for(const [h,v]of [['實扣投注',money(r.bet)],['結算派彩',money(r.payout)],['玩家淨盈虧',signed(r.net)],['本次淨盈虧',signed(r.net)]])if(hs.includes(h))row[hs.indexOf(h)]=v;}
      if(['all','electronic','chess'].includes(d.key))row.splice(row.length-1,0,money(r.jackpotAward));
      if(d.key==='fishing'){const hs=seed.reports.find(x=>x.key==='fishing').headers;row[hs.indexOf('累積獎池派彩')]=money(r.jackpotAward);}
      row.splice(at,0,r.player_id);return row;
    });
  }
  d.columnTypes=d.headers.map(h=>h.includes('盈虧')||h==='投注派彩差額'?'signed':moneyHeaders.has(h)?'money':counts.has(h)?'number':h==='射擊數（付費／免費）'?'shots':'text');
  d.aggregates=d.headers.map((h,i)=>h==='射擊數（付費／免費）'?'shots':(['money','signed','number'].includes(d.columnTypes[i])&&!nonAdd.has(h)&&h!=='場次累積盈虧'?'sum':null));
  d.rows=rowsFor(d,data.records.filter(r=>!types[d.key]||r.kind===types[d.key]));
  const rs=data.records.filter(r=>!types[d.key]||r.kind===types[d.key]);
  d.summaryValues=summaryFor(d,rs);d.totalValues=tableTotals(d,rs,d.rows);
  d.note=d.rows.length+' 筆模擬資料 · 合計涵蓋全部篩選結果，非僅本頁 · 倍率、餘額、排行不相加 · USDT';
}
const t=totals(data.records);
data.totals={records:t.count,players:t.players,games:t.games,bet:t.bet,payout:t.payout,playerNet:t.net};
data.assumptions.push('v6：四類各 100 筆，共 400 筆同日模擬記錄。36 位玩家、2 個包網商、4 個現金網；原始 21 筆金額保留。新增投注級距為示範值。','遊戲統計依類型彙總，玩家 ID 為去重清單；玩家與遊戲總數跨類型去重，不能直接相加。','每表合計以所有篩選結果計算；倍率、結算餘額、累積盈虧與排行不可相加。');
writeFileSync(new URL('../data/demo-data.json',import.meta.url),JSON.stringify(data)+'\n');
console.log(JSON.stringify({totals:data.totals,reports:data.reports.map(d=>({key:d.key,rows:d.rows.length,columns:d.headers.length}))}));
