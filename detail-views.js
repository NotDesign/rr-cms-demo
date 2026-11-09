import {infoCard} from './metric-card.js?v=14.5.0';
import {netWinsFor} from './net-win.js?v=14.4.1';
import {money,signed,tone,escape as e,totals,fishingDetail} from './core.js?v=14.5.0';
import {gameCatalog} from './game-catalog.js?v=14.5.3';
import {uiIcon} from './ui-icons.js?v=14.4.8';
import {chartTipAttrs} from './chart-interactions.js?v=14.5.0';
export const games=Object.fromEntries(gameCatalog.map(g=>[g.name,g]));
export function gameIdentity(name,size=64){const g=games[name];if(!g)return '<span>'+e(name)+'</span>';return '<span class="game-identity"><img class="game-cover" width="'+size+'" height="'+size+'" src="assets/games/'+g.cover+'.jpg" alt="'+e(name)+'" loading="lazy"><span><strong>'+e(name)+'</strong><small>'+g.type+'</small></span></span>';}
export function gameCards(records){
 const total=totals(records).bet;
 const groups=Object.keys(games).map(name=>{const entries=records.filter(r=>r.game===name);return {name,t:{...totals(entries),...netWinsFor(entries)},jackpot:entries.reduce((n,r)=>n+r.jackpotAward,0)};});
 return '<div class="game-cards">'+groups.filter(g=>g.t.count).sort((a,b)=>b.t.bet-a.t.bet).map(({name,t,jackpot},i)=>{
  const share=total?t.bet/total*100:0;
  const metrics=[['coins','投注 USDT',money(t.bet),''],['players','玩家淨盈虧',signed(t.playerNetWin),tone(t.playerNetWin)],['profit','營運淨輸贏',signed(t.operatorNetWin),tone(t.operatorNetWin)]];
  return '<button class="game-card" data-game="'+e(name)+'"'+chartTipAttrs(name,[{label:'實扣投注',value:money(t.bet)+' USDT'},{label:'玩家淨盈虧',value:signed(t.playerNetWin)+' USDT',tone:tone(t.playerNetWin)},{label:'營運淨輸贏',value:signed(t.operatorNetWin)+' USDT',tone:tone(t.operatorNetWin)},{label:'遊玩筆數',value:t.count+' 筆記錄'},{label:'投注佔比',value:share.toFixed(1)+'%'}])+'><div class="game-card-top">'+gameIdentity(name,88)+'<span class="rank">'+(i+1)+'</span></div><div class="game-card-metrics">'+metrics.map(([icon,label,value,color])=>infoCard({icon,label,value,tone:color,tag:'span',compact:true})).join('')+'</div><div class="share-track"><span style="width:'+share+'%"></span></div><div class="card-foot"><small>'+t.count+' 筆記錄</small><small>投注佔比 '+share.toFixed(1)+'%</small>'+(jackpot?'<small>獎池 '+money(jackpot)+' USDT</small>':'')+'<span class="game-card-arrow" aria-hidden="true">'+uiIcon('arrow')+'</span></div></button>';
 }).join('')+'</div>';
}
export function trendChart(records,dateLabel="2026/10/15"){
 const buckets=Array.from({length:24},(_,hour)=>({hour,bet:0,net:0,count:0}));
 for(const r of records){const b=buckets[Number(r.time.slice(0,2))];b.bet+=r.bet;b.net+=r.net;b.count++;}
 const first=buckets.findIndex(b=>b.count),last=buckets.findLastIndex(b=>b.count);
 const active=first<0?[]:buckets.slice(first,last+1),max=Math.max(1,...active.map(b=>b.bet));
 return '<div class="trend-chart" data-chart-scope role="group" aria-label="每小時投注額，UTC+8"><div class="chart-caption"><span>每小時投注額 · USDT</span><small>'+e(dateLabel)+' · UTC+8</small></div><div class="hour-bars">'+active.map(b=>'<div class="hour-column"'+chartTipAttrs(String(b.hour).padStart(2,'0')+':00',[{label:'實扣投注',value:money(b.bet)+' USDT'},{label:'玩家淨盈虧',value:signed(b.net)+' USDT',tone:tone(b.net)},{label:'遊玩筆數',value:b.count+' 筆記錄'}],{focusable:true,note:dateLabel+' · UTC+8'})+'><span class="hour-value">'+money(b.bet)+'</span><div class="bar-space"><span style="height:'+Math.max(b.bet/max*100,b.bet?2:0)+'%"></span></div><small>'+String(b.hour).padStart(2,'0')+':00</small></div>').join('')+'</div></div>';
}
export function gameMetrics(records){
 const t=totals(records),kind=records[0]?.kind;
 if(kind==='電子遊戲')return [['主動收取',records.filter(r=>r.endReason==='玩家主動收取').length+' / '+t.count],['闖關失敗',records.filter(r=>r.endReason==='闖關失敗').length],['最高達成倍率',Math.max(...records.map(r=>r.maxMultiplier||1)).toFixed(2)+'×'],['追加下注合計',money(records.filter(r=>r.endReason==='玩家主動收取').reduce((n,r)=>n+20*(r.scale||1),0))+' USDT']];
 if(kind==='老虎機')return [['付費／免費旋轉',records.filter(r=>r.bet>0).length+' / '+records.filter(r=>r.bet===0).length],['免費旋轉觸發',records.filter(r=>r.event==='觸發免費旋轉').length],['累積獎池中獎',records.filter(r=>r.event==='累積獎池中獎').length],['最高單次派彩',money(Math.max(...records.map(r=>r.payout)))+' USDT']];
 if(kind==='捕魚'){
  const fs=records.map(fishingDetail);
  return [['付費／免費射擊',fs.reduce((n,f)=>n+f.paid,0)+' / '+fs.reduce((n,f)=>n+f.free,0)+' 發'],['子彈成本',money(fs.reduce((n,f)=>n+f.bulletCost,0))+' USDT'],['道具成本',money(fs.reduce((n,f)=>n+f.toolCost,0))+' USDT'],['擊殺／首領擊殺',fs.reduce((n,f)=>n+f.shots.filter(s=>s.result==='擊殺').length,0)+' / '+fs.filter(f=>f.free>0).length]];
 }
 return [['勝／負／和',records.filter(r=>r.net>0).length+' / '+records.filter(r=>r.net<0).length+' / '+records.filter(r=>r.net===0).length],['最高單次投注',money(Math.max(...records.map(r=>r.bet)))+' USDT'],['最高單次派彩',money(Math.max(...records.map(r=>r.payout)))+' USDT'],['對帳狀態',records.every(r=>r.recon.includes('已核對'))?'已核對':'待核對']];
}
