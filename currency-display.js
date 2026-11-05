// Discussion-only quotes: target currency per 1 USDT. These are not live rates.
export const CURRENCY_KEY='rr-cms-display-currency-v1';
export const CURRENCIES=[['USDT','泰達幣',1],['USD','美元',0.9998],['TWD','新台幣',32.5],['HKD','港幣',7.8],['CNY','人民幣',7.2],['EUR','歐元',0.92],['JPY','日圓',150],['VND','越南盾',25400],['THB','泰銖',35.5],['MYR','馬來西亞令吉',4.5],['PHP','菲律賓披索',56.5],['IDR','印尼盾',16000]];
export const DEFAULT_RATES=Object.fromEntries(CURRENCIES.map(([code,,rate])=>[code,rate]));
let preferences={currency:'USDT',rates:{...DEFAULT_RATES}},originalDepth=0;
export function normalizeCurrencyPreferences(raw={}){
 const currency=Object.hasOwn(DEFAULT_RATES,raw?.currency)?raw.currency:'USDT',rates={...DEFAULT_RATES};
 for(const code of Object.keys(rates))if(code!=='USDT'&&Number.isFinite(raw?.rates?.[code])&&raw.rates[code]>0&&raw.rates[code]<=1e9)rates[code]=raw.rates[code];
 return {currency,rates};
}
export function configureCurrency(raw){preferences=normalizeCurrencyPreferences(raw);return currencyPreferences();}
export function currencyPreferences(){return {currency:preferences.currency,rates:{...preferences.rates}};}
export function currencyCode(){return originalDepth?'USDT':preferences.currency;}
export function convertCurrency(amount,source='USDT',target=currencyCode(),rates=preferences.rates){
 if(!Number.isFinite(Number(amount))||!Object.hasOwn(rates,source)||!Object.hasOwn(rates,target)||!(rates[source]>0&&rates[target]>0))throw Error('無法換算此幣別或匯率');
 return Number(amount)/rates[source]*rates[target];
}
export function displayAmount(amount){return convertCurrency(amount);}
export function formatCurrencyAmount(amount){return displayAmount(amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
export function withOriginalCurrency(callback){originalDepth++;try{return callback();}finally{originalDepth--;}}
