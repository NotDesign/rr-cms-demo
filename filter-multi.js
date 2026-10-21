import {escape as e,selectionValues} from './core.js?v=12.5';

export const multiNames=new Set(['wrapper','merchant','type','game']);
export const choicePairs=choices=>choices.map(x=>Array.isArray(x)?x:[x,x]);
export function multiFieldHtml(label,name,choices,value,expanded=false){
 const pairs=choicePairs(choices),selected=selectionValues(value),labels=selected.map(v=>pairs.find(([key])=>key===v)?.[1]||v);
 const summary=labels.length?labels[0]:pairs.find(([v])=>!v)?.[1]||'全部值';
 return '<div class="field multi-field"><label for="f-'+name+'">'+e(label)+'</label><button id="f-'+name+'" type="button" class="multi-trigger" data-filter-multi="'+name+'" aria-haspopup="dialog" aria-expanded="'+expanded+'" aria-controls="filter-popover" aria-label="'+e(label+'：'+summary+(labels.length>1?'，已選 '+labels.length+' 項':''))+'" title="'+e(labels.join('、')||summary)+'"><span class="multi-summary">'+e(summary)+'</span>'+(labels.length>1?'<span class="multi-count">+'+(labels.length-1)+'</span>':'')+'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
}
export function matchingChoices(choices,query,display=x=>x){
 const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase(),q=norm(query);
 return choicePairs(choices).filter(([v,label])=>v&&(!q||norm(label).includes(q)||norm(display(label)).includes(q)||norm(v).includes(q)));
}
export function multiOptionsHtml(choices,query,value,display=x=>x){
 const selected=selectionValues(value),options=matchingChoices(choices,query,display);
 return options.length?options.map(([v,label])=>'<label class="multi-choice"><input type="checkbox" data-multi-value="'+e(v)+'" '+(selected.includes(v)?'checked':'')+'><span title="'+e(display(label))+'">'+e(display(label))+'</span></label>').join(''):'<p class="notice">'+e(display('沒有符合的選項'))+'</p>';
}
