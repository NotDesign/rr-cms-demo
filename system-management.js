export const SYSTEM_SECTIONS=[['accounts','帳號管理'],['keys','API 金鑰'],['roles','角色／權限'],['ips','IP 白名單'],['logs','API 日誌'],['settings','系統設定'],['sync','設定同步'],['audit','操作審計紀錄']];
export const PERMISSIONS=[['reports:read','報表查閱'],['players:read','玩家查閱'],['games:write','遊戲編輯'],['rules:publish','規則發布'],['sites:write','現金網管理'],['system:write','系統管理'],['audit:read','審計查閱']];
export const systemLabels={active:'啟用',disabled:'停用',locked:'鎖定',invited:'待啟用',revoked:'已撤銷',expired:'已到期'};
const clone=v=>JSON.parse(JSON.stringify(v));
export const ROLE_LEVELS=['遊戲商','遊戲集成商','包網商','現金網','第一層代理','第二層代理'];
const roleIds=['ROLE-ADMIN','ROLE-INTEGRATOR','ROLE-WRAPPER','ROLE-CASH','ROLE-AGENT1','ROLE-AGENT2'];
export function rolePermissionKeys(level){return level==='遊戲商'?PERMISSIONS.map(([key])=>key):['遊戲集成商','包網商'].includes(level)?['reports:read','players:read','sites:write','audit:read']:level==='現金網'?['reports:read','players:read','audit:read']:['reports:read','players:read'];}
export function roleOrganizationIds(organizations,organizationId){
 if(!organizations.some(o=>o.id===organizationId))return [];
 const ids=new Set([organizationId]);let changed=true;
 while(changed){changed=false;for(const o of organizations)if(ids.has(o.parent)&&!ids.has(o.id)){ids.add(o.id);changed=true;}}
 return [...ids];
}
function hierarchyRoles(){return ROLE_LEVELS.map((level,i)=>({id:roleIds[i],name:level,level,permissions:rolePermissionKeys(level)}));}
function alignRoleHierarchy(state,organizations){
 const next=clone(state),legacy={'ROLE-OPS':'ROLE-INTEGRATOR','ROLE-FIN':'ROLE-CASH','ROLE-VIEW':'ROLE-AGENT2'},templates=hierarchyRoles();
 next.roles=[...templates.map(template=>{const existing=next.roles.find(r=>r.id===template.id);return {...template,permissions:template.id==='ROLE-ADMIN'?template.permissions:(existing?.permissions||template.permissions).filter(key=>template.permissions.includes(key))};}),...next.roles.filter(r=>!roleIds.includes(r.id)&&!legacy[r.id]).map(r=>{const level=ROLE_LEVELS.includes(r.level)?r.level:'現金網';return {...r,level,permissions:r.permissions.filter(key=>rolePermissionKeys(level).includes(key))};})];
 next.accounts=next.accounts.map(account=>{const roleId=legacy[account.roleId]||account.roleId,role=next.roles.find(r=>r.id===roleId),seed=/^USER-(ADMIN|OPS|FIN|VIEW|OLD|WRAPPER|AGENT1)$/.test(account.id),organizationId=account.organizationId||((seed&&organizations.find(o=>o.level===role?.level)?.id)||null);return {...account,roleId,organizationId};});
 next.schema=2;return next;
}
export function createSystemState(saved=null,now=new Date(),organizations=[]){
 if([1,2].includes(saved?.schema)&&['accounts','roles','keys','ips','audit'].every(k=>Array.isArray(saved[k])))return alignRoleHierarchy(saved,organizations);
 const day=now.toISOString().slice(0,10),later=new Date(+now+90*86400000).toISOString().slice(0,10);
 const accounts=[['ADMIN','遊戲商管理員','admin','ROLE-ADMIN','active'],['OPS','集成商管理員','operations','ROLE-INTEGRATOR','active'],['WRAPPER','包網商管理員','wrapper','ROLE-WRAPPER','active'],['FIN','現金網管理員','cash','ROLE-CASH','active'],['AGENT1','第一層代理管理員','agent1','ROLE-AGENT1','active'],['VIEW','第二層代理管理員','agent2','ROLE-AGENT2','invited'],['OLD','停用示例','disabled','ROLE-AGENT2','disabled']].map(([id,name,email,roleId,status])=>({id:'USER-'+id,name,email:email+'@example.test',roleId,status}));
 return alignRoleHierarchy({schema:2,revision:0,roles:hierarchyRoles(),accounts,keys:[{id:'KEY-001',name:'星河報表介接',siteId:'SITE-A1',permissions:['reports:read'],expires:later,status:'active',masked:'demo_rr_••••0001'},{id:'KEY-002',name:'藍海遊戲介接',siteId:'SITE-E1',permissions:['reports:read','games:write'],expires:later,status:'active',masked:'demo_rr_••••0002'},{id:'KEY-003',name:'已撤銷介接示例',siteId:'SITE-B1',permissions:['reports:read'],expires:later,status:'revoked',masked:'demo_rr_••••0003'}],ips:[{id:'IP-001',label:'辦公室示例網段',address:'192.0.2.0/24',status:'active'},{id:'IP-002',label:'介接服務示例',address:'198.51.100.10',status:'active'},{id:'IP-003',label:'IPv6 測試網段',address:'2001:db8::/32',status:'active'},{id:'IP-004',label:'停用示例網段',address:'203.0.113.0/24',status:'disabled'}],audit:[{id:'SYS-AUDIT-0',at:day+'T00:00:00Z',actor:'平台管理員',module:'system',action:'建立示例工作區',subject:'R&R CMS',reason:'系統管理 Demo 初始化',before:null,after:{demo:true}}]},organizations);
}
export function validNetwork(value){
 if(typeof value!=='string'||!value.trim()||value!==value.trim())return false;
 const parts=value.split('/');if(parts.length>2)return false;const [address,prefix]=parts;let bits;
 if(address.includes(':')){try{if(!/^\[[0-9a-fA-F:.]+\]$/.test('['+address+']'))return false;new URL('http://['+address+']/');bits=128;}catch{return false;}}
 else{const octets=address.split('.');if(octets.length!==4||octets.some(v=>!/^\d{1,3}$/.test(v)||Number(v)>255||String(Number(v))!==v))return false;bits=32;}
 return prefix===undefined||/^\d{1,3}$/.test(prefix)&&Number(prefix)<=bits;
}
export function saveSystemRecord(state,type,id,values,reason,at=new Date(),siteIds=[],organizations=[]){
 if(!['accounts','roles','keys','ips'].includes(type))throw Error('資料類型無效');if(String(reason||'').trim().length<2)throw Error('請填寫至少兩個字的異動原因');
 const next=clone(state),old=id?next[type].find(r=>r.id===id):null;if(id&&!old)throw Error('找不到設定');let record;
 const text=(value,max=80)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
 const permissions=v=>Array.isArray(v)&&v.length>0&&new Set(v).size===v.length&&v.every(p=>PERMISSIONS.some(([key])=>key===p));
 if(type==='accounts'){
  if(!text(values.name)||!text(values.email)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)||!next.roles.some(r=>r.id===values.roleId)||!['active','disabled','locked','invited'].includes(values.status))throw Error('請檢查帳號名稱、信箱、角色與狀態');
  if(next.accounts.some(a=>a.id!==id&&a.email.toLowerCase()===values.email.toLowerCase()))throw Error('此信箱已存在');
  if(id==='USER-ADMIN'&&(values.status!=='active'||values.roleId!=='ROLE-ADMIN'))throw Error('目前管理員須保留啟用狀態與管理角色');
  const role=next.roles.find(r=>r.id===values.roleId),organization=organizations.find(o=>o.id===values.organizationId);if(!organization||organization.level!==role.level)throw Error('所屬機構須與角色層級一致');
  record={name:values.name.trim(),email:values.email.trim(),roleId:values.roleId,organizationId:organization.id,status:values.status};
 }else if(type==='roles'){
  const template=hierarchyRoles().find(r=>r.id===id),level=template?.level||values.level;if(!ROLE_LEVELS.includes(level)||!text(values.name)||!permissions(values.permissions))throw Error('請選擇角色層級、填寫名稱並選擇權限');if(values.permissions.some(key=>!rolePermissionKeys(level).includes(key)))throw Error('權限超出此角色層級可設定的範圍');if(template&&values.name.trim()!==template.name)throw Error('內建角色名稱須與層級一致');if(old&&old.level!==level&&next.accounts.some(a=>a.roleId===id))throw Error('已有使用帳號的角色不能變更層級');if(id==='ROLE-ADMIN'&&PERMISSIONS.some(([key])=>!values.permissions.includes(key)))throw Error('內建管理角色須保留完整權限');
  if(next.roles.some(r=>r.id!==id&&r.name===values.name.trim()))throw Error('角色名稱已存在');record={name:values.name.trim(),level,permissions:values.permissions};
 }else if(type==='keys'){
  if(!text(values.name)||!siteIds.includes(values.siteId)||!permissions(values.permissions)||!['active','revoked'].includes(values.status))throw Error('請檢查金鑰名稱、現金網與權限');
  const date=new Date(values.expires+'T23:59:59+08:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(values.expires)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==values.expires||+date<+at)throw Error('金鑰到期日須為今天或未來日期');
  record={name:values.name.trim(),siteId:values.siteId,permissions:values.permissions,expires:values.expires,status:values.status,masked:old?.masked||'demo_rr_••••'+String(state.revision+4).padStart(4,'0')};
 }else{
  if(!text(values.label)||!validNetwork(values.address)||!['active','disabled'].includes(values.status))throw Error('請填寫有效的 IP 或 CIDR 網段');if(next.ips.some(r=>r.id!==id&&r.address===values.address))throw Error('此 IP 或網段已存在');record={label:values.label.trim(),address:values.address,status:values.status};
 }
 id||='SYS-'+type.toUpperCase()+'-'+(next.revision+1);record={...record,id};next[type]=old?next[type].map(r=>r.id===id?record:r):[record,...next[type]];next.revision++;
 next.audit=[{id:'SYS-AUDIT-'+next.revision,at:at.toISOString(),actor:'平台管理員',module:'system',action:old?'編輯設定':'新增設定',subject:record.name||record.label,reason:reason.trim(),before:old,after:clone(record)},...next.audit].slice(0,300);return next;
}
export function apiLogFixtures(data,now=new Date()){
 const sites=data.organizations.filter(o=>o.level==='現金網'),day=data.date||now.toISOString().slice(0,10),routes=[['GET','/v1/games'],['POST','/v1/rounds/settle'],['GET','/v1/jackpots'],['GET','/v1/reports'],['POST','/v1/rules/sync']];
 return Array.from({length:48},(_,i)=>{const [method,path]=routes[i%routes.length],status=i%17===0?503:i%11===0?403:i%7===0?429:200;return {id:'REQ-DEMO-'+String(i+1).padStart(4,'0'),at:day+'T'+String(8+Math.floor(i/6)).padStart(2,'0')+':'+String(i%6*10).padStart(2,'0')+':00Z',method,path,status,duration:40+i*7%350,siteId:sites[i%sites.length].id,ip:'192.0.2.'+(i%200+1),response:{code:status,message:status===200?'OK':status===503?'Service unavailable':status===403?'Permission denied':'Rate limited',demo:true}};}).reverse();
}
export function systemAuditEvents(system,operations,playerEvents=[]){
 const local=system.audit.map(a=>({...a,source:'system'})),game=operations.audit.map(a=>({...a,source:'game',module:'games',action:({'site-availability':'單站上下架',availability:'全域上下架',maintenance:'遊戲維護',rtp:'現金網 RTP','default-rtp':'預設 RTP'})[a.kind]||a.kind,subject:a.gameId+(a.siteId?' / '+a.siteId:''),actor:a.actor||'平台管理員'})),rules=(operations.configuration?.history||[]).map((a,i)=>({...a,id:'CMS-AUDIT-'+i,source:'cms',module:'rules',actor:'平台管理員',action:({'edit-draft':'編輯草稿','create-rule':'新增規則','publish-rule':'發布規則'})[a.action]||a.action,subject:a.ruleId,before:null,after:{version:a.version,sites:a.sites}}));
 return [...local,...game,...rules,...playerEvents].sort((a,b)=>b.at.localeCompare(a.at));
}
