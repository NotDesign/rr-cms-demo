import {readFileSync,writeFileSync} from 'node:fs';
import {money,signed,playerId,totals,rowsFor,summaryFor,tableTotals,balances} from '../core.js';
const seed=JSON.parse(readFileSync(new URL('../data/seed-data.json',import.meta.url)));
const data=structuredClone(seed),types={electronic:'電子遊戲',slots:'老虎機',fishing:'捕魚',chess:'棋牌'};
data.revision='2026-10-20-player-id-totals-v5';
for(const r of data.records){r.seedId=r.id;r.player_id=playerId(r.player);if(r.kind==='電子遊戲'){r.difficulty=r.id.endsWith('001')?'一般':'困難';r.endReason=r.id.endsWith('001')?'玩家主動收取':'闖關失敗';r.maxMultiplier=r.id.endsWith('001')?1.2:1.6;}}
const sourceRows=new Map();
for(const d of seed.reports){if(['player','stats'].includes(d.key))continue;d.rows.forEach(row=>sourceRows.set(d.key+':'+(d.key==='slots'?'DEMO-S'+row[3].slice(1):row[1]),row));}
const clones=[];
function cloneRecord(template,key,index,player){
  const r=structuredClone(data.records.find(r=>r.id===template));
  r.seedId=template;r.id='DEMO-'+({electronic:'E',slots:'S',fishing:'F',chess:'C'}[key])+(key==='slots'?String(index):String(index).padStart(3,'0'));
  r.player=player;r.player_id=playerId(player);
  r.time='0'+(8+Math.floor(clones.length/60))+':'+String(clones.length%60).padStart(2,'0')+':12';
  r.settled=r.time.slice(0,-2)+'13';
  r.round=({electronic:'EG-',slots:'SP-',fishing:'FB-',chess:r.game==='經典 21 點'?'BJ-':r.game==='搶莊牛牛'?'NN-':'DDZ-'}[key])+String(4000+index);
  if(key==='fishing'){r.fishBase=20001+index*20;r.event=r.event.replace('F9006','F'+(r.fishBase+5));}
  clones.push(r);return r;
}
for(let i=0;i<23;i++)cloneRecord(i%3===0?'DEMO-E002':'DEMO-E001','electronic',101+i,'demo_'+(2001+i));
for(let i=0;i<16;i++){
  const offset=i<14?0:1,spin=1601+offset*1000+i%14,r=cloneRecord('DEMO-S'+(601+i%14),'slots',spin,'demo_'+(2101+offset));
  r.session='SL-00'+(offset+2);r.spin='#'+spin;r.parentOffset=1000+offset*1000;
}
for(let i=0;i<18;i++)cloneRecord(i%3===0?'DEMO-F002':'DEMO-F001','fishing',101+i,'demo_'+(2001+i));
for(let i=0;i<18;i++)cloneRecord(['DEMO-C001','DEMO-C002','DEMO-C003'][i%3],'chess',101+i,'demo_'+(2001+i));
data.records.push(...clones);
const moneyHeaders=new Set(['實扣投注','結算派彩','退款','費用／抽水','初始下注','追加下注合計','最後可領金額（未入帳）','基本派彩','獎勵派彩','累積獎池派彩','結算後餘額','子彈成本','道具實扣成本','一般捕獲獎金','道具／技能獎金','獎勵回合獎金','底注／底分','抽水／服務費','投注額','派彩','有效投注','退款／沖正','退款金額','獎勵／獎池派彩']);
const counts=new Set(['通過關數','消除／重轉次數','道具使用次數','擊殺數','首領擊殺數','記錄筆數','觸發事件數','異常筆數','玩家數','遊戲數','已結算筆數','未結算筆數']);
const nonAdd=new Set(['最後可領金額（未入帳）','結算後餘額','底注／底分','通過關數']);
for(const d of data.reports){
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
data.assumptions.push('v5：共 96 筆同日模擬記錄。新增玩家、交易與場次 ID；原始 21 筆金額保留。','遊戲統計依類型彙總，玩家 ID 為去重清單；玩家與遊戲總數跨類型去重，不能直接相加。','每表合計以所有篩選結果計算；倍率、結算餘額、累積盈虧與排行不可相加。');
writeFileSync(new URL('../data/demo-data.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({totals:data.totals,reports:data.reports.map(d=>({key:d.key,rows:d.rows.length,columns:d.headers.length}))}));
