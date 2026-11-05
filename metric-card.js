import {escape as e} from './core.js?v=14.5.0';
import {uiIcon} from './ui-icons.js?v=14.4.8';

// One structure for summary, financial, operational and embedded metric cards.
// Values are escaped by default; valueHtml is reserved for existing formatted values.
export function infoCard({icon='dashboard',label,value='',valueHtml=null,unit='',tone='',caption='',className='',tag='div',attrs='',compact=false,secondary=null}){
 const originalLabel=String(label),currency=originalLabel.match(/\s*(?:[·（(]\s*)?USDT[）)]?$/);
 if(currency){label=originalLabel.slice(0,currency.index).trim();unit=unit||'USDT';}
 const element=['div','article','span'].includes(tag)?tag:'div',part=element==='span'?'span':'div';
 const size=compact?22:26;
 const units=text=>[...String(text).replace(/<[^>]*>/g,'')].reduce((sum,c)=>sum+(/[\u3000-\uffff]/u.test(c)?1.05:/[,.\s]/.test(c)?.35:.65),0)||1;
 const figure=(text,html,color,currency)=>'<'+part+' class="metric-card-value"><strong style="--metric-units:'+units(html??text)+';--metric-max:'+size+'px" class="'+e(color)+'">'+(html??e(text))+'</strong>'+(currency?'<small class="metric-card-unit">'+e(currency)+'</small>':'')+'</'+part+'>';
 return '<'+element+' class="metric-card '+e(className)+(compact?' metric-card--compact':'')+'" data-metric-card data-info-label="'+e(originalLabel)+'" '+attrs+'>'+
  '<'+part+' class="metric-card-head">'+uiIcon(icon)+'<small class="metric-card-label">'+e(label)+'</small></'+part+'>'+
  figure(value,valueHtml,tone,unit)+(caption?'<span class="metric-card-caption">'+e(caption)+'</span>':'')+
  (secondary?'<'+part+' class="metric-card-secondary"><small class="metric-card-label">'+e(secondary.label)+'</small>'+figure(secondary.value,secondary.valueHtml,secondary.tone||'',secondary.unit||'')+'</'+part+'>':'')+'</'+element+'>';
}
