import {escape as e} from './core.js?v=12.3';
import {uiIcon} from './ui-icons.js?v=12.3';
// Keep the full range available while avoiding repeated dates in a narrow control.
export function dateRangeLabel(start,end){
 const first=start.replaceAll('-','/'),last=end.replaceAll('-','/'),sameDay=start===end;
 const startYear=start.slice(0,4),endYear=end.slice(0,4);
 return {
  full:sameDay?first:first+' — '+last,
  compact:sameDay?first:first.slice(5)+' — '+last.slice(5),
  years:sameDay?'':startYear===endYear?startYear:startYear+'–'+endYear
 };
}
export function shiftMonth(month,offset){const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);}
export function monthDays(month){
 const start=new Date(month+'-01T00:00:00Z'),offset=(start.getUTCDay()+6)%7,count=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
 return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'))];
}
export function datePickerHtml({start,end,month,anchor}){
 const calendar=m=>'<div class="calendar-month"><h3>'+m.replace('-',' / ')+'</h3><div class="calendar-grid">'+['週一','週二','週三','週四','週五','週六','週日'].map(d=>'<small>'+d+'</small>').join('')+monthDays(m).map(day=>day?'<button type="button" data-date-day="'+day+'" aria-label="'+day+'" aria-pressed="'+(day===(anchor||start)||!anchor&&day===end)+'" class="'+(!anchor&&day>start&&day<end?'in-range ':'')+((day===(anchor||start)||!anchor&&day===end)?'range-end':'')+'">'+Number(day.slice(-2))+'</button>':'<span></span>').join('')+'</div></div>';
 return '<div class="date-picker-heading"><strong>'+uiIcon('calendar')+'日期區間</strong><button class="icon-button" data-action="date-apply" aria-label="關閉日期選單">×</button></div><div class="dates"><label>開始日期<input type="date" id="date-start" value="'+e(start)+'"></label><label>結束日期<input type="date" id="date-end" value="'+e(end)+'"></label></div><div class="calendar-controls"><button class="icon-button" data-calendar-month="-1" aria-label="上個月">‹</button><span>'+(anchor?'選擇結束日期':'選擇開始與結束日期')+'</span><button class="icon-button" data-calendar-month="1" aria-label="下個月">›</button></div><div class="calendar-months">'+calendar(month)+calendar(shiftMonth(month,1))+'</div><p class="date-error" id="date-error" role="alert"></p><div class="date-picker-footer"><small>UTC+8 · 選擇後自動篩選</small><button class="button small" data-action="date-apply">完成</button></div>';
}
