export const languageNames={'zh-Hant':'繁體中文',vi:'Tiếng Việt',th:'ไทย'};
export function parseDictionary(terms){
  return Object.fromEntries(terms.split('\n').filter(Boolean).map(line=>{const [zh,vi,th]=line.split('|');return [zh,{vi,th}];}));
}
const terms=typeof document==='undefined'?'':await fetch('./data/locales.tsv?v=7').then(r=>{if(!r.ok)throw Error('語系資料載入失敗');return r.text();});
export const dictionary=parseDictionary(terms);
const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
const escapeRegex=s=>s.replace(/[.*+?^{}()|[\]\\$]/g,'\\$&');
const matcher=keys.length?new RegExp(keys.map(escapeRegex).join('|'),'g'):null;
export function translate(value,locale='zh-Hant'){
  const text=String(value??'');if(locale==='zh-Hant'||!languageNames[locale]||!matcher)return text;
  return dictionary[text]?.[locale]||text.replace(matcher,key=>dictionary[key][locale]||key);
}
export function localize(root,locale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement?.closest('script,style'))node.nodeValue=translate(node.nodeValue,locale);}
  for(const element of [root,...root.querySelectorAll('[title],[placeholder],[aria-label]')]){
    for(const attr of ['title','placeholder','aria-label'])if(element.hasAttribute?.(attr))element.setAttribute(attr,translate(element.getAttribute(attr),locale));
  }
  for(const select of root.querySelectorAll('.field select'))select.title=select.selectedOptions[0]?.textContent||'';
  for(const input of root.querySelectorAll('.field input'))input.title=input.value||input.placeholder;
  for(const button of root.querySelectorAll('.date-button'))button.title=button.textContent;
  for(const button of root.querySelectorAll('.category'))button.title=button.getAttribute('aria-label')||'';
}
