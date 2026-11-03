export const DEFAULT_TIME_ZONE='Asia/Taipei';
const labels={UTC:'協調世界時間', 'Asia/Taipei':'台北', 'Asia/Hong_Kong':'香港', 'Asia/Shanghai':'上海', 'Asia/Singapore':'新加坡', 'Asia/Ho_Chi_Minh':'胡志明市', 'Asia/Bangkok':'曼谷', 'Asia/Tokyo':'東京', 'Asia/Seoul':'首爾', 'Asia/Kolkata':'加爾各答', 'Asia/Katmandu':'加德滿都', 'Asia/Kathmandu':'加德滿都', 'Asia/Dubai':'杜拜', 'Europe/London':'倫敦', 'Europe/Paris':'巴黎', 'America/New_York':'紐約', 'America/Los_Angeles':'洛杉磯', 'Australia/Sydney':'雪梨', 'Pacific/Auckland':'奧克蘭'};
labels['Asia/Saigon']=labels['Asia/Ho_Chi_Minh'];labels['Asia/Calcutta']=labels['Asia/Kolkata'];
const formatters=new Map();
export function normalizeTimeZone(zone){
 if(zone==='auto')return zone;
 try{if(typeof zone!=='string'||!zone.trim())return DEFAULT_TIME_ZONE;return new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone;}catch{return DEFAULT_TIME_ZONE;}
}
export function resolvedTimeZone(zone){return zone==='auto'?Intl.DateTimeFormat().resolvedOptions().timeZone:normalizeTimeZone(zone);}
export function clockSnapshot(zone=DEFAULT_TIME_ZONE,now=new Date()){
 const timeZone=resolvedTimeZone(zone);
 if(!formatters.has(timeZone))formatters.set(timeZone,new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}));
 const parts=Object.fromEntries(formatters.get(timeZone).formatToParts(now).map(p=>[p.type,p.value]));
 return {timeZone,city:labels[timeZone]||timeZone.split('/').at(-1).replaceAll('_',' '),date:parts.year+'/'+parts.month+'/'+parts.day,time:parts.hour+':'+parts.minute+':'+parts.second,offset:parts.timeZoneName.replace('GMT','UTC'),iso:now.toISOString()};
}
export function timeZoneChoices(query='',selected=DEFAULT_TIME_ZONE){
 const supported=typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('timeZone'):Object.keys(labels);
 const zones=[...new Set(['auto',normalizeTimeZone(selected),...Object.keys(labels),...supported])].filter(z=>z==='auto'||normalizeTimeZone(z)===z);
 const q=query.trim().toLocaleLowerCase();
 return (q?zones.filter(z=>(z+' '+(labels[z]||'')+(z==='auto'?' 跟隨裝置 system device':'')).toLocaleLowerCase().includes(q)):['auto',normalizeTimeZone(selected),'Asia/Taipei','Asia/Hong_Kong','Asia/Singapore','Asia/Ho_Chi_Minh','Asia/Bangkok','Asia/Tokyo','Europe/London','America/New_York','America/Los_Angeles','UTC'])
  .filter((z,i,all)=>all.indexOf(z)===i).map(value=>({value,label:value==='auto'?'跟隨裝置':(labels[value]||value.split('/').at(-1).replaceAll('_',' ')),detail:value==='auto'?resolvedTimeZone('auto'):value}));
}
