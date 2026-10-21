import {totals,money,signed,playerId,datePresetRange} from './core.js?v=12.4';
import {playerProfitLoss,playerSourceProfile} from './analytics.js?v=12.4';

const summary=records=>{const t=totals(records);return [['記錄筆數',String(t.count)],['不重複玩家數',String(t.players)],['實扣投注',money(t.bet)+' USDT'],['結算派彩',money(t.payout)+' USDT'],['玩家淨盈虧',signed(t.net)+' USDT']];};
export function answerQuestion(question,{records,scope=records,organizations=[],games=[],display=x=>x,now=new Date()}={}){
 const q=String(question).normalize('NFKC').trim(),lower=q.toLocaleLowerCase(),has=text=>lower.includes(String(text).toLocaleLowerCase());
 if(!q)return {title:'資料助理',text:'請輸入玩家 ID、投注單號、遊戲或機構名稱。',actions:[]};
 const record=records.find(r=>has(r.id));
 if(record)return {title:'投注單 · '+record.id,metrics:summary([record]),actions:[{kind:'record',value:record.id,label:'查看投注明細'}]};
 const name=[...new Set(records.map(r=>r.player))].find(n=>has(n)||new RegExp('\\b'+playerId(n)+'\\b','i').test(q));
 if(name){const rs=records.filter(r=>r.player===name),p=playerProfitLoss(rs),actions=[{kind:'player',value:name,label:'查看玩家詳情'}];if(/IP|VPN|ISP|註冊|登入|裝置|安全|thiết bị|đăng nhập|อุปกรณ์|เข้าสู่ระบบ/i.test(q)){const profile=playerSourceProfile(name,rs,organizations);return {title:'玩家 · '+name+' / '+playerId(name),text:'來源與登入資訊為模擬資料；時間皆為 UTC+8。',metrics:[['註冊地區',profile.region],['註冊 IP',profile.registrationIp],['VPN／代理 IP',profile.vpnIp],['ISP',profile.isp],['上次登入時間',profile.lastLogin],['上次登入 IP',profile.lastIp],['上次登入裝置',profile.lastDevice]],actions};}return {title:'玩家 · '+name+' / '+playerId(name),metrics:[...summary(rs),['總盈利',signed(p.profit)+' USDT'],['總虧損',signed(p.loss)+' USDT']],actions};}
 const game=games.find(g=>has(g.name)||has(display(g.name)));
 if(game){const rs=records.filter(r=>r.game===game.name);return {title:'遊戲 · '+game.name,metrics:summary(rs),actions:[{kind:'game',value:game.name,label:'查看遊戲詳情'}]};}
 const org=organizations.find(o=>has(o.id)||has(o.name)||has(display(o.name)));
 if(org){const rs=records.filter(r=>[r.providerId,r.wrapperId,r.cashId].includes(org.id));return {title:org.level+' · '+org.name,metrics:summary(rs),actions:[{kind:'org',value:org.id,label:'查看機構詳情'}]};}
 if(/包網|機構|現金網|platform|đối tác|nhà cung cấp|พันธมิตร/i.test(q)&&/排行|rank|xếp hạng|อันดับ/i.test(q)){
  const rank=organizations.filter(o=>o.level==='包網商').map(o=>({o,t:totals(scope.filter(r=>r.wrapperId===o.id))})).filter(x=>x.t.count).sort((a,b)=>b.t.bet-a.t.bet).slice(0,5);
  return {title:'包網商投注排行',metrics:rank.map(({o,t},i)=>[(i+1)+'. '+o.name,money(t.bet)+' USDT']),actions:rank.map(({o})=>({kind:'org',value:o.id,label:o.name}))};
 }
 if(/玩家|player|người chơi|ผู้เล่น/i.test(q)&&/排行|最高|最多|rank|nhất|อันดับ|สูงสุด/i.test(q)){
  const loss=/虧|輸|loss|thua|ขาดทุน/i.test(q),rank=[...new Set(scope.map(r=>r.player))].map(n=>({n,t:totals(scope.filter(r=>r.player===n))})).sort((a,b)=>loss?a.t.net-b.t.net:b.t.net-a.t.net).slice(0,5);
  return {title:loss?'玩家虧損排行':'玩家盈利排行',metrics:rank.map(({n,t})=>[playerId(n),signed(t.net)+' USDT']),actions:rank.map(({n})=>({kind:'player',value:n,label:playerId(n)}))};
 }
 if(/獎池|jackpot|แจ็กพอต/i.test(q)){const won=scope.filter(r=>r.jackpotAward>0);return {title:'獎池概況',metrics:[['獎池觸發筆數',String(won.length)],['獎池派彩',money(won.reduce((n,r)=>n+r.jackpotAward,0))+' USDT']],actions:won.slice(0,3).map(r=>({kind:'record',value:r.id,label:r.id}))};}
 let selected=scope,period='目前篩選結果';
 if(/今天|today|hôm nay|วันนี้/i.test(q)||/昨天|yesterday|hôm qua|เมื่อวาน/i.test(q)){const r=datePresetRange(/昨天|yesterday|hôm qua|เมื่อวาน/i.test(q)?'yesterday':'today',now);selected=records.filter(x=>x.date>=r.start&&x.date<=r.end);period=r.start;}
 if(/投注|派彩|盈虧|盈利|虧損|玩家|人數|資料|筆數|總額|目前|bet|payout|profit|loss|summary|cược|lãi|lỗ|người chơi|tổng|เดิมพัน|กำไร|ขาดทุน|ผู้เล่น|สรุป/i.test(q))return {title:period,metrics:summary(selected),text:selected.length?'':'此區間沒有模擬記錄。',actions:[{kind:'report',value:'all',label:'開啟所有遊戲投注記錄'}]};
 return {title:'查詢提示',text:'可輸入玩家 ID、投注單號、遊戲或機構名稱，或查詢目前篩選的投注、盈虧與獎池。',actions:[]};
}
