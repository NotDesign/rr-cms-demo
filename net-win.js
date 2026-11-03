// Compare the same settled game activity from each side. Values use integer cents.
// Operator Net Win is game GGR before revenue shares, service fees and operating costs.
export const NET_WIN = {
  player: {label:'玩家淨盈虧',english:'Player Net Win',formula:'結算派彩−（實扣投注−退款）'},
  operator: {label:'營運淨輸贏',english:'Operator Net Win',formula:'實扣投注−退款−結算派彩'}
};
const cents=value=>Math.round((Number(value)||0)*100);
export function netWinCents(charge=0,refund=0,payout=0){
  const operatorNetWin=charge-refund-payout;
  return {playerNetWin:operatorNetWin===0?0:-operatorNetWin,operatorNetWin:operatorNetWin===0?0:operatorNetWin};
}
export function netWinsFromAmounts({bet=0,charge=bet,refund=0,payout=0}={}){
  const wins=netWinCents(cents(charge),cents(refund),cents(payout));
  return {playerNetWin:wins.playerNetWin/100,operatorNetWin:wins.operatorNetWin/100};
}
export function netWinsFor(records){
  const t=records.reduce((sum,r)=>({charge:sum.charge+cents(r.bet),refund:sum.refund+cents(r.refund),payout:sum.payout+cents(r.payout)}),{charge:0,refund:0,payout:0});
  const wins=netWinCents(t.charge,t.refund,t.payout);
  return {playerNetWin:wins.playerNetWin/100,operatorNetWin:wins.operatorNetWin/100,refund:t.refund/100};
}
export function playerResultTotals(records){
  const result=records.reduce((sum,r)=>{const {playerNetWin}=netWinCents(cents(r.bet),cents(r.refund),cents(r.payout));sum.profit+=Math.max(0,playerNetWin);sum.loss+=Math.min(0,playerNetWin);return sum;},{profit:0,loss:0});
  return {profit:result.profit/100,loss:result.loss/100,net:(result.profit+result.loss)/100};
}
