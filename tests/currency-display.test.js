import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RATES,configureCurrency,currencyCode,currencyPreferences,convertCurrency,withOriginalCurrency} from '../currency-display.js?v=14.5.0';
import {money,signed,detailTableTotals} from '../core.js';

test('display conversion uses explicit cross rates without modifying the original amount',()=>{
 const raw={bet:100,payout:120};const snapshot=JSON.stringify(raw);
 configureCurrency({currency:'TWD',rates:{TWD:32}});
 assert.equal(money(raw.bet),'3,200.00');assert.equal(signed(raw.bet-raw.payout),'−640.00');
 assert.equal(convertCurrency(3200,'TWD','USDT'),100);
 assert.equal(convertCurrency(3200,'TWD','USD'),100*DEFAULT_RATES.USD);
 assert.equal(JSON.stringify(raw),snapshot);
 configureCurrency({});
});
test('original-currency contexts protect editing and restore the display after exceptions',()=>{
 configureCurrency({currency:'VND'});assert.equal(money(100),'2,540,000.00');
 assert.equal(withOriginalCurrency(()=>money(100)),'100.00');
 assert.throws(()=>withOriginalCurrency(()=>{throw Error('sample');}));assert.equal(currencyCode(),'VND');
 const rows=[['10.00'],['20.00']];assert.equal(detailTableTotals(['投注 USDT'],rows)[0],'30.00');
 configureCurrency({});
});
test('invalid currencies and rates cannot enter the display configuration',()=>{
 configureCurrency({currency:'missing',rates:{USDT:10,TWD:0,VND:-2,EUR:Infinity}});
 const state=currencyPreferences();assert.equal(state.currency,'USDT');assert.equal(state.rates.USDT,1);
 assert.equal(state.rates.TWD,DEFAULT_RATES.TWD);assert.equal(state.rates.EUR,DEFAULT_RATES.EUR);
 assert.throws(()=>convertCurrency(100,'missing','TWD'));assert.throws(()=>convertCurrency(NaN));
 const copy=currencyPreferences();copy.rates.TWD=99;assert.equal(currencyPreferences().rates.TWD,DEFAULT_RATES.TWD);
 configureCurrency({});
});
