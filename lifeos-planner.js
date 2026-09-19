/* Pure planning records and proposals. No DOM, storage, clock or transport reads. */
(function(global){
  'use strict';
  const CONTRACT='lifeos-planner/1',SCHEMA='lifeos.planner/2',LEGACY_SCHEMA='lifeos.planner/1',READER=69;
  const CATEGORIES=['sleep','work','commute','buffer','training','meal','goal','care','admin','rest','other'];
  const ROUTINE_CATEGORIES=['training','meal','goal','care','admin','rest','other'];
  const DAY_TYPES=['normal','travel','leave','sick','rest'],ORIGINS=['baseline','manual','routine'];
  const ROUTINE_FIELDS=['rootId','title','category','link','durationMinutes','window','fixed','recurrence','exceptions','dayTypes','alternatives','status','effectiveFrom','note'];
  const SLOT_FIELDS=['id','title','category','start','end','fixed','origin','cancelled','link'],SLOT_OPTIONAL=['anchor','window'];
  const STATUS_FIELDS=['dayRootId','slotId','status','note'],EVENT_FIELDS=['id','dayRootId','dayVersionId','slotId','status','note','recordedAt'];
  const EVIDENCE_KINDS=['training-session','sleep-record','meal-log','work-entry','goal-progress','goal-action-event','people-event','money-transaction'];
  const GENERAL_EVIDENCE=['goal-action-event','people-event','money-transaction'];
  const COMPATIBLE={training:['training-session'],meal:['meal-log'],sleep:['sleep-record'],work:['work-entry'],goal:['goal-progress','goal-action-event'],care:GENERAL_EVIDENCE,admin:GENERAL_EVIDENCE,rest:GENERAL_EVIDENCE,other:EVIDENCE_KINDS};
  const SPECIALIST=['training','meal','sleep','work'];
  const ROUTES=['train','plan','food','sleep','work','goals','money','people','life','capture'];
  const PROFILE_FIELDS=['timeZone','workDays','intendedStart','intendedEnd','usualStart','usualEnd','contractMinutes','unpaidBreakMinutes','commuteMinutesEachWay','futureCommuteMinutesEachWay','sleepStart','sleepEnd','transitionMinutes','equipment','limitations','priorities'],PROFILE_PLANNING=['trainingMinutes','trainingTravelMinutes','changingMinutes','mealMinutes','spareMinutes','windDownMinutes'];
  const DAY_FIELDS=['date','timeZone','profileVersionId','dayType','scenario','note','slots'];
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
  const clone=x=>JSON.parse(JSON.stringify(x));
  function fail(path,message,status='invalid'){const error=new Error(message);error.path=path;error.status=status;throw error;}
  function check(ok,path,message,status){if(!ok)fail(path,message,status);}
  function fields(value,keys,path,optional=[]){check(object(value),path,'Expected an object.');for(const key of Object.keys(value))check(keys.includes(key)||optional.includes(key),path+'/'+key,'This planner field is not supported.','unsupported');for(const key of keys)check(own(value,key),path+'/'+key,'This required planner field is missing.');}
  function text(value,path,max=200,required=true){check(typeof value==='string'&&value.length<=max&&(!required||value.trim()),path,'Enter '+(required?'non-empty ':'')+'text of at most '+max+' characters.');}
  function id(value,path){check(typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value),path,'Use a stable identifier containing letters, numbers, underscores or hyphens.');}
  function refId(value,path){check(typeof value==='string'&&value.length>=1&&value.length<=240&&!/[\u0000-\u001f\u007f]/.test(value)&&!['__proto__','constructor','prototype'].includes(value),path,'Use the record identifier exactly as its section stores it.');}
  function integer(value,path,min,max){check(Number.isSafeInteger(value)&&value>=min&&value<=max,path,'Use a whole number between '+min+' and '+max+'.');}
  function list(value,path,max=1000000){check(Array.isArray(value)&&value.length<=max,path,'Expected a supported list.');return value;}
  function nullable(value,fn){if(value!==null)fn(value);}
  function isDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
  const isTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  function zone(value,path){text(value,path,100);try{new Intl.DateTimeFormat('en-GB',{timeZone:value});}catch(error){fail(path,'Choose a recognised named time zone.');}}
  function timestamp(value,path){check(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,path,'Use an exact ISO timestamp in UTC.');}
  function stable(value){
    const stack=new Set();
    function visit(v){
      if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
      if(typeof v==='number'){check(Number.isFinite(v),'','Only finite JSON numbers are supported.');return JSON.stringify(v);}
      check(typeof v==='object','','Only neutral JSON values are supported.');
      const array=Array.isArray(v),prototype=Object.getPrototypeOf(v),constructor=prototype&&Object.getOwnPropertyDescriptor(prototype,'constructor')?.value;
      const builtIn=typeof constructor==='function'&&constructor.prototype===prototype&&Function.prototype.toString.call(constructor)===Function.prototype.toString.call(array?Array:Object);
      check((array?builtIn&&Object.getPrototypeOf(Object.getPrototypeOf(prototype))===null:prototype===null||builtIn&&Object.getPrototypeOf(prototype)===null)&&!Object.getOwnPropertySymbols(v).length,'','Custom prototypes and symbols are unsupported.');
      for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(v))){if(array&&key==='length')continue;check(own(descriptor,'value')&&descriptor.enumerable,'','Accessors and hidden fields are unsupported.');if(array)check(/^(0|[1-9]\d*)$/.test(key)&&Number(key)<v.length,'','Additional array fields are unsupported.');}
      if(array)check(Object.keys(v).length===v.length,'','Sparse arrays are unsupported.');
      check(!stack.has(v),'','Circular values are unsupported.');stack.add(v);
      const out=array?'['+v.map(visit).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+visit(v[k])).join(',')+'}';stack.delete(v);return out;
    }
    return visit(value);
  }
  function caught(error){return {ok:false,status:error.status||'invalid',error:error.message||String(error),path:error.path||''};}
  function empty(){return {schema:SCHEMA,profiles:[],routines:[],days:[],events:[],operations:[]};}
  function normalize(domain){
    if(!object(domain)||domain.schema!==LEGACY_SCHEMA||own(domain,'routines'))return domain;
    const {schema,profiles,days,events,operations,...rest}=domain;return {schema:SCHEMA,profiles,routines:[],days,events,operations,...rest};
  }
  function evidenceRef(value,path){fields(value,['kind','rootId','versionId','date'],path);check(EVIDENCE_KINDS.includes(value.kind),path+'/kind','This evidence kind is unsupported.','unsupported');refId(value.rootId,path+'/rootId');refId(value.versionId,path+'/versionId');check(isDate(value.date),path+'/date','Evidence needs the record date.');}
  function window(value,path){fields(value,['start','end'],path);check(isTime(value.start)&&isTime(value.end),path,'Choose valid local times for the window.');check(minute(value.end)>minute(value.start),path,'The window must end after it starts on the same day.');}
  function shortcut(link,path){fields(link,['route','label'],path);check(ROUTES.includes(link.route),path+'/route','This shortcut route is unsupported.');text(link.label,path+'/label',100);}
  function routine(value,path){
    fields(value,ROUTINE_FIELDS,path);id(value.rootId,path+'/rootId');text(value.title,path+'/title',200);check(ROUTINE_CATEGORIES.includes(value.category),path+'/category','Choose a routine category. Sleep, work and commute anchors come from your setup.');
    nullable(value.link,link=>shortcut(link,path+'/link'));integer(value.durationMinutes,path+'/durationMinutes',1,1440);window(value.window,path+'/window');check(minute(value.window.end)-minute(value.window.start)>=value.durationMinutes,path+'/durationMinutes','The routine cannot last longer than its window.');
    check(typeof value.fixed==='boolean',path+'/fixed','Use an explicit yes or no.');
    const r=value.recurrence;fields(r,['frequency','interval','weekdays','startDate','endDate'],path+'/recurrence');check(['daily','weekly'].includes(r.frequency),path+'/recurrence/frequency','Choose daily or weekly.');integer(r.interval,path+'/recurrence/interval',1,52);
    list(r.weekdays,path+'/recurrence/weekdays',7);check(new Set(r.weekdays).size===r.weekdays.length,path+'/recurrence/weekdays','Select each weekday once.');for(const n of r.weekdays)integer(n,path+'/recurrence/weekdays',1,7);
    check(r.frequency==='weekly'?r.weekdays.length>0:r.weekdays.length===0,path+'/recurrence/weekdays',r.frequency==='weekly'?'Choose at least one weekday.':'Daily routines do not select weekdays.');
    check(isDate(r.startDate),path+'/recurrence/startDate','Choose a valid start date.');nullable(r.endDate,v=>check(isDate(v)&&v>=r.startDate,path+'/recurrence/endDate','The end date cannot precede the start date.'));
    list(value.exceptions,path+'/exceptions',1000);for(const [n,d] of value.exceptions.entries()){check(isDate(d),path+'/exceptions/'+n,'Choose valid exception dates.');if(n)check(d>value.exceptions[n-1],path+'/exceptions','List exception dates once, in date order.');}
    list(value.dayTypes,path+'/dayTypes',5);check(value.dayTypes.length>0&&new Set(value.dayTypes).size===value.dayTypes.length&&value.dayTypes.every(t=>DAY_TYPES.includes(t)),path+'/dayTypes','Choose the day types this routine applies to.');
    list(value.alternatives,path+'/alternatives',20);const seen=new Set();for(const [n,alt] of value.alternatives.entries()){const p=path+'/alternatives/'+n;fields(alt,['id','title','durationMinutes','note'],p);id(alt.id,p+'/id');check(!seen.has(alt.id),p+'/id','Alternative identifiers must be unique.');seen.add(alt.id);text(alt.title,p+'/title',200);integer(alt.durationMinutes,p+'/durationMinutes',1,1440);check(minute(value.window.end)-minute(value.window.start)>=alt.durationMinutes,p+'/durationMinutes','An alternative cannot last longer than the routine window.');text(alt.note,p+'/note',1000,false);}
    check(['active','paused','ended'].includes(value.status),path+'/status','Choose active, paused or ended.');check(isDate(value.effectiveFrom),path+'/effectiveFrom','Choose the date this version applies from.');text(value.note,path+'/note',4000,false);
  }
  function emptyProfile(timeZone){zone(timeZone,'/timeZone');return {timeZone,workDays:[],intendedStart:null,intendedEnd:null,usualStart:null,usualEnd:null,contractMinutes:null,unpaidBreakMinutes:null,commuteMinutesEachWay:null,futureCommuteMinutesEachWay:null,sleepStart:null,sleepEnd:null,transitionMinutes:0,equipment:[],limitations:'',priorities:'',trainingMinutes:null,trainingTravelMinutes:null,changingMinutes:null,mealMinutes:null,spareMinutes:null,windDownMinutes:null};}
  function profile(value,path){
    fields(value,PROFILE_FIELDS,path,PROFILE_PLANNING);zone(value.timeZone,path+'/timeZone');for(const key of PROFILE_PLANNING)if(own(value,key))nullable(value[key],v=>integer(v,path+'/'+key,0,1440));
    list(value.workDays,path+'/workDays',7);check(new Set(value.workDays).size===value.workDays.length,path+'/workDays','Select each workday once.');for(const n of value.workDays)integer(n,path+'/workDays',1,7);
    for(const key of ['intendedStart','intendedEnd','usualStart','usualEnd','sleepStart','sleepEnd'])nullable(value[key],v=>check(isTime(v),path+'/'+key,'Choose a valid local time.'));
    for(const key of ['contractMinutes','unpaidBreakMinutes','commuteMinutesEachWay','futureCommuteMinutesEachWay'])nullable(value[key],v=>integer(v,path+'/'+key,0,key==='contractMinutes'?10080:1440));
    integer(value.transitionMinutes,path+'/transitionMinutes',0,1440);text(value.limitations,path+'/limitations',4000,false);text(value.priorities,path+'/priorities',4000,false);
    list(value.equipment,path+'/equipment',200);const seen=new Set();
    for(const [n,row] of value.equipment.entries()){
      const p=path+'/equipment/'+n;fields(row,['id','name','location','availability','minKg','maxKg','stepKg','note'],p);id(row.id,p+'/id');check(!seen.has(row.id),p+'/id','Equipment identifiers must be unique.');seen.add(row.id);text(row.name,p+'/name',160);text(row.note,p+'/note',1000,false);
      check(['home','gym','other'].includes(row.location),p+'/location','Choose a supported location.');check(['current','future'].includes(row.availability),p+'/availability','Keep current and future equipment distinct.');
      for(const key of ['minKg','maxKg','stepKg'])nullable(row[key],v=>check(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000&&(key!=='stepKg'||v>0),p+'/'+key,'Use a valid load; a stated increment must be positive.'));
      check(row.minKg===null||row.maxKg===null||row.minKg<=row.maxKg,p,'Minimum load exceeds maximum load.');
    }
  }
  const addDays=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const minute=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
  const formatters=new Map();
  function formatter(timeZone){if(!formatters.has(timeZone))formatters.set(timeZone,new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));return formatters.get(timeZone);}
  function localParts(at,timeZone){const parts={};for(const part of formatter(timeZone).formatToParts(new Date(at)))if(part.type!=='literal')parts[part.type]=part.value;return {date:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute,second:parts.second};}
  function endpointAt(at,timeZone){const parts=localParts(at,timeZone),wall=Date.parse(parts.date+'T'+parts.time+':'+parts.second+'Z');return {date:parts.date,time:parts.time,offsetMinutes:(wall-at)/60000,at:new Date(at).toISOString()};}
  function resolve(date,time,timeZone,offsetMinutes){
    try{
      check(isDate(date),'/date','Choose a valid date.');check(isTime(time),'/time','Choose a valid local time.');zone(timeZone,'/timeZone');
      if(offsetMinutes!==undefined)integer(offsetMinutes,'/offsetMinutes',-1440,1440);
      const wall=Date.parse(date+'T'+time+':00Z'),offsets=new Set();
      for(let hours=-48;hours<=48;hours+=6){const at=wall+hours*3600000,part=localParts(at,timeZone),asWall=Date.parse(part.date+'T'+part.time+':'+part.second+'Z');offsets.add((asWall-at)/60000);}
      const choices=[];let secondOffset=false;for(const offset of offsets){const at=wall-offset*60000,parts=localParts(at,timeZone);if(parts.date===date&&parts.time===time&&parts.second==='00'){if(Number.isInteger(offset))choices.push({offsetMinutes:offset,at:new Date(at).toISOString()});else secondOffset=true;}}choices.sort((a,b)=>a.at.localeCompare(b.at));
      if(!choices.length)return {ok:false,error:secondOffset?'This historical time zone used offsets containing seconds, which this minute-based planner cannot represent.':'This local time does not exist in '+timeZone+'. Choose another time.',choices:[]};
      const choice=offsetMinutes===undefined?(choices.length===1?choices[0]:null):choices.find(x=>x.offsetMinutes===offsetMinutes);
      if(!choice)return {ok:false,error:offsetMinutes===undefined?'This clock time occurs twice. Choose its UTC offset.':'The selected UTC offset does not match this local time.',choices};
      return {ok:true,endpoint:{date,time,offsetMinutes:choice.offsetMinutes,at:choice.at}};
    }catch(error){return {ok:false,error:error.message,choices:[]};}
  }
  function endpoint(value,timeZone,path){
    fields(value,['date','time','offsetMinutes','at'],path);check(isDate(value.date)&&isTime(value.time),path,'Choose a valid local date and time.');timestamp(value.at,path+'/at');check(value.at.endsWith(':00.000Z'),path+'/at','Planner timing is stored at whole-minute precision.');integer(value.offsetMinutes,path+'/offsetMinutes',-1440,1440);
    const actual=endpointAt(Date.parse(value.at),timeZone);check(stable(actual)===stable(value),path,'Saved local time, offset and instant disagree.');
  }
  const boundaries=new Map();
  function boundary(date,timeZone){
    const key=date+'|'+timeZone;if(boundaries.has(key))return boundaries.get(key);
    function keep(at){if(boundaries.size>=4000)boundaries.delete(boundaries.keys().next().value);boundaries.set(key,at);return at;}
    const result=resolve(date,'00:00',timeZone);if(result.ok)return keep(Date.parse(result.endpoint.at));if(result.choices.length)return keep(Date.parse(result.choices[0].at));
    for(let n=1;n<1440;n++){const time=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'),r=resolve(date,time,timeZone);if(r.ok)return keep(Date.parse(r.endpoint.at));if(r.choices.length)return keep(Date.parse(r.choices[0].at));}
    fail('/date','This local date does not exist in the selected time zone.');
  }
  function dayBounds(date,timeZone){const start=boundary(date,timeZone);for(let n=1;n<=3;n++){try{return {start,end:boundary(addDays(date,n),timeZone)};}catch(error){if(n===3)throw error;}}}
  function day(value,path){
    fields(value,DAY_FIELDS,path);check(isDate(value.date),path+'/date','Choose a valid day date.');zone(value.timeZone,path+'/timeZone');nullable(value.profileVersionId,v=>id(v,path+'/profileVersionId'));
    check(['normal','travel','leave','sick','rest'].includes(value.dayType),path+'/dayType','Choose a supported day type.');check(['usual','intended','future'].includes(value.scenario),path+'/scenario','Choose a supported planning scenario.');text(value.note,path+'/note',4000,false);
    list(value.slots,path+'/slots',1000);const seen=new Set(),bounds=dayBounds(value.date,value.timeZone);
    for(const [n,row] of value.slots.entries()){
      const p=path+'/slots/'+n;fields(row,SLOT_FIELDS,p,SLOT_OPTIONAL);id(row.id,p+'/id');check(!seen.has(row.id),p+'/id','Activity identifiers must be unique within a day.');seen.add(row.id);text(row.title,p+'/title',200);
      check(CATEGORIES.includes(row.category),p+'/category','Choose a supported activity type.');for(const key of ['fixed','cancelled'])check(typeof row[key]==='boolean',p+'/'+key,'Use an explicit yes or no.');check(ORIGINS.includes(row.origin),p+'/origin','Keep an activity source.');
      endpoint(row.start,value.timeZone,p+'/start');endpoint(row.end,value.timeZone,p+'/end');const start=Date.parse(row.start.at),end=Date.parse(row.end.at);check(end>start&&end-start<=86400000,p,'An activity must last more than zero and at most 24 elapsed hours.');check(row.origin!=='baseline'?start<bounds.end&&end>bounds.start:start>=bounds.start-86400000&&start<bounds.end+86400000&&end<=bounds.end+86400000,p,'Manual and routine activities must overlap their day; generated anchors must remain within the neighbouring dates.');
      nullable(row.link,link=>shortcut(link,p+'/link'));
      const anchor=own(row,'anchor')?row.anchor:null;nullable(anchor,a=>{fields(a,['date','routineRootId','routineVersionId'],p+'/anchor');check(isDate(a.date),p+'/anchor/date','An anchor needs its original date.');nullable(a.routineRootId,v=>id(v,p+'/anchor/routineRootId'));nullable(a.routineVersionId,v=>id(v,p+'/anchor/routineVersionId'));check((a.routineRootId===null)===(a.routineVersionId===null),p+'/anchor','A routine anchor names both its routine and the exact version.');});
      if(row.origin==='routine')check(anchor&&anchor.routineRootId!==null&&row.id==='occ_'+anchor.routineRootId+'_'+anchor.date,p+'/anchor','A routine occurrence keeps the identity of its routine and original date.');else check(!anchor||anchor.routineRootId===null,p+'/anchor','Only routine occurrences carry a routine anchor.');
      if(row.origin==='baseline')check(!anchor&&(!own(row,'window')||row.window===null),p,'Generated anchors carry no routine anchor or window.');
      if(own(row,'window'))nullable(row.window,w=>{window(w,p+'/window');const s=minute(row.start.time),e=daysBetween(row.start.date,row.end.date)*1440+minute(row.end.time);check(s>=minute(w.start)&&e<=minute(w.end),p+'/window','"'+row.title+'" is planned outside its usual window of '+w.start+' to '+w.end+'. Keep it inside the window, or allow this occurrence outside its window.');});
    }
  }
  function latest(rows,rootId){let found=null;for(const row of rows)if(row.rootId===rootId)found=row;return found?clone(found):null;}
  function currentProfile(domain){return latest(domain.profiles,'profile');}
  function currentDay(domain,date){return latest(domain.days,date);}
  function currentRoutine(domain,rootId){return latest(domain.routines||[],rootId);}
  function routines(domain){const map=new Map();for(const row of domain.routines||[])map.set(row.rootId,row);return [...map.values()].map(clone);}
  function routineVersionFor(domain,rootId,date){let found=null;for(const row of domain.routines||[])if(row.rootId===rootId&&row.value.effectiveFrom<=date)found=row;return found?clone(found):null;}
  function heads(domain){const map=new Map();for(const kind of ['profiles','routines','days'])for(const row of domain[kind]||[])map.set(kind+'|'+row.rootId,row);return map;}
  const mondayOf=date=>addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
  const daysBetween=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
  function due(value,date,dayType){
    const r=value.recurrence;if(value.status!=='active'||date<r.startDate||(r.endDate!==null&&date>r.endDate)||value.exceptions.includes(date))return false;
    if(dayType!==undefined&&!value.dayTypes.includes(dayType))return false;
    if(r.frequency==='daily')return daysBetween(r.startDate,date)%r.interval===0;
    const weekday=new Date(date+'T12:00:00Z').getUTCDay()||7;return r.weekdays.includes(weekday)&&(daysBetween(mondayOf(r.startDate),mondayOf(date))/7)%r.interval===0;
  }
  function occurrences(domain,date,dayType){
    check(isDate(date),'/date','Choose a valid date.');const out=[];
    for(const rootId of [...new Set((domain.routines||[]).map(row=>row.rootId))]){const version=routineVersionFor(domain,rootId,date);if(!version||!due(version.value,date,dayType))continue;out.push({id:'occ_'+rootId+'_'+date,routineRootId:rootId,routineVersionId:version.id,anchorDate:date,value:version.value});}
    return out;
  }
  const anchored=slot=>slot.origin==='routine'||(own(slot,'anchor')&&slot.anchor!==null);
  function activeIn(map,slotId,exceptDate){for(const [key,row] of map)if(key.startsWith('days|')&&row.rootId!==exceptDate&&row.value.slots.some(s=>s.id===slotId&&!s.cancelled&&anchored(s)))return row;return null;}
  function locate(domain,slotId){const row=activeIn(heads(domain),slotId);return row?{date:row.rootId,versionId:row.id,slot:clone(row.value.slots.find(s=>s.id===slotId))}:null;}
  function valueOf(row){return row&&own(row,'value')?row.value:row;}
  function generateDay(profileRow,options,previousDay,domain){
    try{
      check(object(profileRow)&&object(profileRow.value),'/profile','Save your planning profile first.');id(profileRow.id,'/profile/id');profile(profileRow.value,'/profile');const p=profileRow.value;
      fields(options,['date','dayType','scenario','note'],'/options');const value={date:options.date,timeZone:p.timeZone,profileVersionId:profileRow.id,dayType:options.dayType,scenario:options.scenario,note:options.note,slots:[]};day(value,'/day');const notices=[],previous=valueOf(previousDay);
      if(domain!==undefined)check(object(domain)&&Array.isArray(domain.routines)&&Array.isArray(domain.days),'/domain','Supply the planner records to place routine occurrences.');
      if(previous){day(previous,'/previousDay');check(previous.date===value.date,'/previousDay/date','Only rebuild the selected day.');check(previous.timeZone===value.timeZone||!previous.slots.some(s=>s.origin!=='baseline'),'/timeZone','This day has manual activities in another time zone. Retain that day zone or move its activities explicitly.');value.slots=clone(previous.slots.filter(s=>s.origin!=='baseline'));}
      function add(name,title,category,start,end){if(end<=start)return;const slot={id:'baseline_'+value.date+'_'+name,title,category,start:endpointAt(start,p.timeZone),end:endpointAt(end,p.timeZone),fixed:true,origin:'baseline',cancelled:false,link:null};if(value.slots.some(s=>s.id===slot.id))fail('/slots','A manual identifier conflicts with a generated anchor.');value.slots.push(slot);}
      function clock(date,time,label){const r=resolve(date,time,p.timeZone);if(!r.ok){notices.push(label+': '+r.error+' Add this timing manually.');return null;}return Date.parse(r.endpoint.at);}
      const bounds=dayBounds(value.date,p.timeZone);
      if(p.sleepStart===null||p.sleepEnd===null)notices.push('Sleep timing is not fully set. Add a protected sleep window before planning the remaining time.');
      else if(p.sleepStart===p.sleepEnd)notices.push('Sleep start and wake time are equal. Enter a clear sleep window.');
      else{
        const bed=clock(value.date,p.sleepStart,'Sleep start'),wake=clock(value.date,p.sleepEnd,'Wake time');
        if(bed!==null&&wake!==null){if(minute(p.sleepStart)>minute(p.sleepEnd)){add('sleep_early','Protected sleep','sleep',bounds.start,wake);add('sleep_late','Protected sleep','sleep',bed,bounds.end);}else add('sleep','Protected sleep','sleep',bed,wake);}
      }
      const weekday=new Date(value.date+'T12:00:00Z').getUTCDay()||7,working=value.dayType==='normal'&&p.workDays.includes(weekday);
      if(value.dayType==='travel')notices.push('Work-travel day: normal work and commute anchors are paused. Add the itinerary and essentials; travel pay stays in Work.');
      if(['leave','sick','rest'].includes(value.dayType))notices.push('Normal work and commute anchors are paused for this '+value.dayType+' day.');
      if(!p.workDays.length)notices.push('No normal workdays are selected.');
      if(working){
        const intended=value.scenario==='intended',startTime=intended?p.intendedStart:p.usualStart,endTime=intended?p.intendedEnd:p.usualEnd;
        if(startTime===null||endTime===null)notices.push('The selected work scenario has incomplete start or finish times. No work duration has been guessed.');
        else if(startTime===endTime)notices.push('Work start and finish are equal. Add a work block with explicit dates.');
        else{
          const start=clock(value.date,startTime,'Work start'),end=clock(minute(endTime)<minute(startTime)?addDays(value.date,1):value.date,endTime,'Work finish');
          if(start!==null&&end!==null){
            if(end-start>86400000)notices.push('This work span exceeds 24 elapsed hours across the clock change. Add explicit shorter blocks.');
            else{
              add('work',intended?'Work: intended planning hours':'Work: usual attendance','work',start,end);
              const commute=value.scenario==='future'?p.futureCommuteMinutesEachWay:p.commuteMinutesEachWay;
              if(commute===null)notices.push('Commute duration is unknown for this scenario. No travel time has been guessed.');
              const outbound=start-(commute||0)*60000,inbound=end+(commute||0)*60000;
              if(commute>0){add('commute_out','Commute to work','commute',outbound,start);add('commute_back','Commute home','commute',end,inbound);}
              if(p.transitionMinutes){add('transition_out','Prepare and transition','buffer',outbound-p.transitionMinutes*60000,outbound);add('transition_back','Arrive and transition','buffer',inbound,inbound+p.transitionMinutes*60000);}
            }
          }
        }
        if(value.scenario==='future')notices.push('Future commute is a selected planning scenario, not a confirmed move date.');
        if(p.unpaidBreakMinutes===null)notices.push('Unpaid break duration is unknown. Planning attendance does not set paid hours.');
        notices.push('Work attendance and weekly contract hours remain separate. This plan does not change payroll.');
      }
      if(domain){
        const map=heads(domain);let added=0;
        for(const o of occurrences(domain,value.date,value.dayType)){
          if(value.slots.some(s=>s.id===o.id)||activeIn(map,o.id,value.date))continue;
          const r=resolve(value.date,o.value.window.start,p.timeZone);if(!r.ok){notices.push(o.value.title+': '+r.error+' Add this occurrence manually.');continue;}
          const start=Date.parse(r.endpoint.at);value.slots.push({id:o.id,title:o.value.title,category:o.value.category,start:endpointAt(start,p.timeZone),end:endpointAt(start+o.value.durationMinutes*60000,p.timeZone),fixed:o.value.fixed,origin:'routine',cancelled:false,link:clone(o.value.link),anchor:{date:value.date,routineRootId:o.routineRootId,routineVersionId:o.routineVersionId},window:clone(o.value.window)});added++;
        }
        if(added)notices.push(added+' routine occurrence'+(added===1?'':'s')+' placed at the start of '+(added===1?'its':'their')+' usual window. Move them within the window if another time suits.');
        for(const slot of value.slots)if(slot.origin==='routine'&&!slot.cancelled){const version=routineVersionFor(domain,slot.anchor.routineRootId,slot.anchor.date);if(!version||!due(version.value,slot.anchor.date,slot.anchor.date===value.date?value.dayType:undefined))notices.push(slot.title+' no longer matches its routine rule for '+(slot.anchor.date===value.date?'this day':'its original day')+'. It is retained; cancel it if it should not happen.');}
        if(value.dayType!=='normal'&&value.slots.some(s=>s.origin==='routine'&&!s.cancelled))notices.push('Routine occurrences are not paused automatically on a '+value.dayType+' day. Cancel any that cannot happen.');
      }
      if(value.slots.some(slot=>Date.parse(slot.start.at)<bounds.start||Date.parse(slot.end.at)>bounds.end))notices.push('Some anchors cross into neighbouring dates. They remain attached to this plan and count on the dates they occupy.');
      day(value,'/day');return {ok:true,value,notices};
    }catch(error){return caught(error);}
  }
  function analyseDay(input,neighbours=[]){
    const value=valueOf(input),result={conflicts:[],occupiedMinutes:0,freeMinutes:0,notices:[],dayMinutes:0};if(!Array.isArray(neighbours))neighbours=[];
    try{
      day(value,'/day');const bounds=dayBounds(value.date,value.timeZone);result.dayMinutes=(bounds.end-bounds.start)/60000;
      const seen=new Set(),rows=[];
      for(const source of [value,...neighbours.map(valueOf)]){if(!source)continue;day(source,'/neighbour');for(const slot of source.slots){const key=source.date+'|'+slot.id;if(seen.has(key)||slot.cancelled)continue;seen.add(key);const start=Math.max(bounds.start,Date.parse(slot.start.at)),end=Math.min(bounds.end,Date.parse(slot.end.at));if(start<end)rows.push({slot,start,end,date:source.date,key});}}
      rows.sort((a,b)=>a.start-b.start||a.end-b.end||a.key.localeCompare(b.key));
      let start=null,end=null;for(const row of rows){if(start===null){start=row.start;end=row.end;}else if(row.start<=end)end=Math.max(end,row.end);else{result.occupiedMinutes+=(end-start)/60000;start=row.start;end=row.end;}}if(start!==null)result.occupiedMinutes+=(end-start)/60000;
      result.freeMinutes=result.dayMinutes-result.occupiedMinutes;
      for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length&&rows[j].start<rows[i].end;j++){const a=rows[i],b=rows[j];result.conflicts.push({slotIds:[a.slot.id,b.slot.id],message:a.slot.title+' overlaps '+b.slot.title+'.'});}
      if(rows.some(row=>row.date!==value.date||row.slot.start.date!==value.date||row.slot.end.date!==value.date))result.notices.push('This day includes cross-midnight timing. Capacity uses only the part inside this local day.');
      if(result.dayMinutes!==1440)result.notices.push('The local clock change makes this a '+result.dayMinutes/60+'-hour day.');
      if(!rows.some(row=>row.slot.category==='sleep'))result.notices.push('No protected sleep window is saved for this day.');
      return result;
    }catch(error){result.notices.push(error.message);result.error=error.message;return result;}
  }
  function command(value){
    stable(value);const c=clone(value);fields(c,['contract','operation','operationId','versionId','recordedAt','expected','entity'],'');check(c.contract===CONTRACT,'/contract','This planner contract is unsupported.','unsupported');check(['profile','routine','day','status','move','plan'].includes(c.operation),'/operation','This planner operation is unsupported.','unsupported');id(c.operationId,'/operationId');id(c.versionId,'/versionId');timestamp(c.recordedAt,'/recordedAt');fields(c.expected,['workspaceRevision','previousVersionId'],'/expected');integer(c.expected.workspaceRevision,'/expected/workspaceRevision',0,Number.MAX_SAFE_INTEGER);nullable(c.expected.previousVersionId,v=>id(v,'/expected/previousVersionId'));
    if(c.operation==='profile')profile(c.entity,'/entity');else if(c.operation==='routine')routine(c.entity,'/entity');else if(c.operation==='day')day(c.entity,'/entity');
    else if(c.operation==='plan'){
      fields(c.entity,['policyVersion','proposalDigest','horizon','days'],'/entity');text(c.entity.policyVersion,'/entity/policyVersion',40);text(c.entity.proposalDigest,'/entity/proposalDigest',64);fields(c.entity.horizon,['from','to'],'/entity/horizon');check(isDate(c.entity.horizon.from)&&isDate(c.entity.horizon.to)&&c.entity.horizon.to>=c.entity.horizon.from&&daysBetween(c.entity.horizon.from,c.entity.horizon.to)<14,'/entity/horizon','Choose a planning horizon of at most two weeks.');
      list(c.entity.days,'/entity/days',14);check(c.entity.days.length>0,'/entity/days','A plan needs at least one changed day.');const seenDates=new Set(),seenIds=new Set();
      for(const [n,d] of c.entity.days.entries()){const p='/entity/days/'+n;fields(d,['date','previousVersionId','versionId','value'],p);check(isDate(d.date)&&d.date>=c.entity.horizon.from&&d.date<=c.entity.horizon.to,p+'/date','Each planned day must lie inside the horizon.');check(!seenDates.has(d.date)&&(n===0||d.date>c.entity.days[n-1].date),p+'/date','List each day once, in date order.');seenDates.add(d.date);nullable(d.previousVersionId,v=>id(v,p+'/previousVersionId'));id(d.versionId,p+'/versionId');check(!seenIds.has(d.versionId),p+'/versionId','Each planned day needs its own version identifier.');seenIds.add(d.versionId);day(d.value,p+'/value');check(d.value.date===d.date,p+'/value/date','A planned day value must match its date.');}
      check(c.versionId===c.entity.days[0].versionId&&c.expected.previousVersionId===c.entity.days[0].previousVersionId,'/entity/days','The plan review names its first day version and predecessor.');
    }
    else if(c.operation==='move'){fields(c.entity,['slotId','fromDate','fromVersionId','originVersionId','target'],'/entity');id(c.entity.slotId,'/entity/slotId');check(isDate(c.entity.fromDate),'/entity/fromDate','Choose the saved day the activity moves from.');id(c.entity.fromVersionId,'/entity/fromVersionId');id(c.entity.originVersionId,'/entity/originVersionId');check(c.entity.originVersionId!==c.versionId,'/entity/originVersionId','The origin and target day versions need distinct identifiers.');day(c.entity.target,'/entity/target');check(c.entity.target.date!==c.entity.fromDate,'/entity/target/date','Move an activity to a different day, or adjust its time within the same day.');}
    else{fields(c.entity,STATUS_FIELDS,'/entity',['evidence']);check(isDate(c.entity.dayRootId),'/entity/dayRootId','Choose a valid saved day.');id(c.entity.slotId,'/entity/slotId');check(['done','skipped','reset'].includes(c.entity.status),'/entity/status','Choose a supported check-off state.');text(c.entity.note,'/entity/note',4000,false);if(own(c.entity,'evidence'))nullable(c.entity.evidence,e=>{evidenceRef(e,'/entity/evidence');check(c.entity.status==='done','/entity/evidence','Evidence is linked when an activity is done.');});}
    return c;
  }
  function intent(c){const v=clone(c);delete v.expected.workspaceRevision;return stable(v);}
  const digest=c=>stable(c);
  function rootKey(c){return c.operation==='profile'?'profiles|profile':c.operation==='routine'?'routines|'+c.entity.rootId:c.operation==='day'?'days|'+c.entity.date:c.operation==='status'?'days|'+c.entity.dayRootId:c.operation==='plan'?'days|'+c.entity.days[0].date:'days|'+c.entity.target.date;}
  function planDays(c){return c.operation==='day'?[c.entity]:c.operation==='move'?[c.entity.target]:c.operation==='plan'?c.entity.days.map(d=>d.value):[];}
  function movedOrigin(c,origin){const value=clone(origin.value);const slot=value.slots.find(s=>s.id===c.entity.slotId);if(slot){slot.cancelled=true;if(!(own(slot,'anchor')&&slot.anchor))slot.anchor={date:origin.rootId,routineRootId:null,routineVersionId:null};}return value;}
  function expectedRows(c,map){
    if(c.operation==='status')return [{id:c.versionId,...clone(c.entity),dayVersionId:c.expected.previousVersionId,recordedAt:c.recordedAt}];
    if(c.operation==='move'){const origin=map.get('days|'+c.entity.fromDate);check(origin,'/entity/fromDate','Save the day before moving its activity.');return [{id:c.entity.originVersionId,rootId:c.entity.fromDate,supersedes:c.entity.fromVersionId,recordedAt:c.recordedAt,value:movedOrigin(c,origin)},{id:c.versionId,rootId:c.entity.target.date,supersedes:c.expected.previousVersionId,recordedAt:c.recordedAt,value:clone(c.entity.target)}];}
    if(c.operation==='plan')return c.entity.days.map(d=>({id:d.versionId,rootId:d.date,supersedes:d.previousVersionId,recordedAt:c.recordedAt,value:clone(d.value)}));
    return [{id:c.versionId,rootId:c.operation==='profile'?'profile':c.operation==='routine'?c.entity.rootId:c.entity.date,supersedes:c.expected.previousVersionId,recordedAt:c.recordedAt,value:clone(c.entity)}];
  }
  function taskMeaning(slot){return stable({title:slot.title,category:slot.category,start:slot.start,end:slot.end,link:slot.link,anchor:own(slot,'anchor')?slot.anchor:null});}
  function evidenceOf(event){return event&&own(event,'evidence')?event.evidence:null;}
  function supportsOf(domain,evidence,exceptKey){
    const last=new Map();for(const event of domain.events||[])if(object(event))last.set(event.dayRootId+'|'+event.slotId,event);const map=heads(domain),out=[];
    for(const [key,event] of last){const linked=evidenceOf(event);if(key===exceptKey||event.status!=='done'||!linked||linked.kind!==evidence.kind||linked.rootId!==evidence.rootId)continue;const head=map.get('days|'+event.dayRootId),slot=head?.value.slots.find(s=>s.id===event.slotId);out.push({dayRootId:event.dayRootId,slotId:event.slotId,title:slot?slot.title:'Retained activity'});}
    return out;
  }
  function checkoffState(slot,event){if(!object(slot)||!object(event)||!['done','skipped'].includes(event.status))return null;if(event.status==='skipped')return 'skipped';if(evidenceOf(event))return 'verified';return SPECIALIST.includes(slot.category)?'unverified':'done';}
  function retained(previous,slots,lastEvents,path,except){
    const present=new Map(slots.map(slot=>[slot.id,slot]));
    for(const slot of previous.value.slots)if(slot.origin!=='baseline'&&slot.id!==except){
      const next=present.get(slot.id);check(next&&next.origin===slot.origin,path,'Retain manual and routine activities and cancel them explicitly instead of deleting their identities.');
      const last=lastEvents.get(previous.rootId+'|'+slot.id);check(last?.status!=='done'||taskMeaning(slot)===taskMeaning(next),path,'Reset this completed activity before changing its title, type, timing or shortcut.','needs-review');
    }
  }
  function uniqueSlots(slots,date,map,path){for(const slot of slots)if(!slot.cancelled&&anchored(slot)){const elsewhere=activeIn(map,slot.id,date);check(!elsewhere,path,'This activity is already active on '+(elsewhere?.rootId)+'. Move it explicitly instead of repeating it.');}}
  function continuity(c,previous,lastEvents,path,map){
    if(c.operation==='routine'&&previous)check(c.entity.effectiveFrom>=previous.value.effectiveFrom,path+'/effectiveFrom','A routine change applies from its previous version date or later. Earlier dates keep their earlier rule.');
    if(c.operation==='day'){
      if(previous)retained(previous,c.entity.slots,lastEvents,path+'/slots');uniqueSlots(c.entity.slots,c.entity.date,map,path+'/slots');
      for(const slot of c.entity.slots){const a=own(slot,'anchor')?slot.anchor:null;if(a&&a.date!==c.entity.date){const prior=previous?.value.slots.find(s=>s.id===slot.id);check(prior&&stable(own(prior,'anchor')?prior.anchor:null)===stable(a),path+'/slots','An activity from another day arrives only through a move. Use Move to another day instead of adding it here.');}}
    }
    if(c.operation==='status'){
      check(previous,path+'/dayRootId','Save the day before checking off an activity.');const slot=previous.value.slots.find(row=>row.id===c.entity.slotId);
      check(slot&&slot.origin!=='baseline'&&(!slot.cancelled||c.entity.status==='reset'),path+'/slotId',slot?.cancelled?'This activity is cancelled or moved. Only a reset of its earlier check-off is possible here.':'Choose an active manual or routine activity. Baseline anchors are plans, not completed logs.');
      if(c.entity.status==='done')check(c.entity.dayRootId<=localParts(Date.parse(c.recordedAt),previous.value.timeZone).date,path+'/status','A future day cannot be marked done.');
      const key=c.entity.dayRootId+'|'+c.entity.slotId,last=lastEvents.get(key);if(last)check(c.recordedAt>=last.recordedAt,'/recordedAt','This check-off cannot predate its previous status.');
      const evidence=evidenceOf(c.entity);
      if(evidence)check((COMPATIBLE[slot.category]||[]).includes(evidence.kind),path+'/evidence','A '+slot.category+' activity cannot be evidenced by a '+evidence.kind+' record.');
    }
    if(c.operation==='plan'){
      const after=new Map(map);for(const d of c.entity.days)after.set('days|'+d.date,{rootId:d.date,id:d.versionId,value:d.value});
      for(const [n,d] of c.entity.days.entries()){
        const p=path+'/days/'+n,head=map.get('days|'+d.date)||null;check((head?.id||null)===d.previousVersionId,p+'/previousVersionId','This day changed after the plan was proposed. Propose the plan again.','needs-review');
        if(head)retained(head,d.value.slots,lastEvents,p+'/value/slots');uniqueSlots(d.value.slots,d.date,after,p+'/value/slots');
        for(const slot of d.value.slots){const a=own(slot,'anchor')?slot.anchor:null;if(!a||a.date===d.date||slot.cancelled)continue;const prior=head?.value.slots.find(s=>s.id===slot.id);if(prior&&stable(own(prior,'anchor')?prior.anchor:null)===stable(a))continue;
          const liveBefore=[...map].find(([key,row])=>key.startsWith('days|')&&row.rootId!==d.date&&row.value.slots.some(s=>s.id===slot.id&&!s.cancelled&&anchored(s)))?.[1]||null;
          const originDate=liveBefore?liveBefore.rootId:a.date,originAfter=after.get('days|'+originDate),retiredCopy=originAfter?.value.slots.find(s=>s.id===slot.id);
          const retired=!!retiredCopy&&retiredCopy.cancelled&&anchored(retiredCopy)&&(!liveBefore||c.entity.days.some(x=>x.date===originDate));
          check(retired,p+'/value/slots','"'+slot.title+'" arrives from '+originDate+' only when that day retires it, anchored, in the same plan or already did.');
          check(lastEvents.get(originDate+'|'+slot.id)?.status!=='done',p+'/value/slots','Reset the completed check-off of "'+slot.title+'" before a plan moves it.','needs-review');}
      }
    }
    if(c.operation==='move'){
      const origin=map.get('days|'+c.entity.fromDate);check(origin,path+'/fromDate','Save the day before moving its activity.');check(origin.id===c.entity.fromVersionId,path+'/fromVersionId','The origin day changed. Review its current version before moving.','needs-review');
      const slot=origin.value.slots.find(s=>s.id===c.entity.slotId);check(slot&&!slot.cancelled&&slot.origin!=='baseline',path+'/slotId','Choose an active manual or routine activity to move.');
      check(lastEvents.get(c.entity.fromDate+'|'+c.entity.slotId)?.status!=='done',path+'/slotId','Reset this completed activity before moving it.','needs-review');
      const moved=c.entity.target.slots.find(s=>s.id===c.entity.slotId);check(moved&&!moved.cancelled,path+'/target','The target day must contain the moved activity.');
      const anchor=own(slot,'anchor')&&slot.anchor?slot.anchor:{date:c.entity.fromDate,routineRootId:null,routineVersionId:null};
      check(stable({title:moved.title,category:moved.category,origin:moved.origin,link:moved.link,anchor:own(moved,'anchor')?moved.anchor:null})===stable({title:slot.title,category:slot.category,origin:slot.origin,link:slot.link,anchor}),path+'/target','A moved activity keeps its title, category, source, shortcut and original anchor.');
      if(previous){retained(previous,c.entity.target.slots,lastEvents,path+'/target/slots');check(!previous.value.slots.some(s=>s.id===c.entity.slotId&&!s.cancelled),path+'/target','The target day already holds a different activity with this identity. Choose another day or cancel that activity first.');}
      const others=new Map(map);others.set('days|'+c.entity.fromDate,{...origin,value:movedOrigin(c,origin)});uniqueSlots(c.entity.target.slots,c.entity.target.date,others,path+'/target/slots');
    }
  }
  function validateDomain(domain){
    try{
      stable(domain);check(object(domain)&&domain.schema===SCHEMA,'/planner/schema',object(domain)&&domain.schema===LEGACY_SCHEMA?'This planner section is in the earlier v66 shape. Open it through workspace normalization.':'This planner domain is unsupported.','unsupported');fields(domain,['schema','profiles','routines','days','events','operations'],'/planner');for(const key of ['profiles','routines','days','events','operations'])list(domain[key],'/planner/'+key);
      const ids=new Set(),rows=new Map(),current=new Map(),profileIds=new Set(),routineIds=new Map();
      for(const kind of ['profiles','routines','days'])for(const [n,row] of domain[kind].entries()){
        const p='/planner/'+kind+'/'+n;fields(row,['id','rootId','supersedes','recordedAt','value'],p);id(row.id,p+'/id');check(!ids.has(row.id),p+'/id','Planner record identifiers must be unique.');ids.add(row.id);rows.set(row.id,row);timestamp(row.recordedAt,p+'/recordedAt');nullable(row.supersedes,v=>id(v,p+'/supersedes'));
        const key=kind+'|'+row.rootId,prior=current.get(key);check(row.supersedes===(prior?.id||null),p+'/supersedes','A version must name its exact current predecessor.');if(prior)check(row.recordedAt>=prior.recordedAt,p+'/recordedAt','A new version cannot predate its predecessor.');
        if(kind==='profiles'){check(row.rootId==='profile',p+'/rootId','The planning profile has one stable root.');profile(row.value,p+'/value');profileIds.add(row.id);}
        else if(kind==='routines'){routine(row.value,p+'/value');check(row.rootId===row.value.rootId,p+'/rootId','A routine root must equal its stated identity.');if(prior)check(row.value.effectiveFrom>=prior.value.effectiveFrom,p+'/value/effectiveFrom','Routine versions apply in date order.');routineIds.set(row.id,row.rootId);}
        else{day(row.value,p+'/value');check(row.rootId===row.value.date,p+'/rootId','A day root must equal its local date.');check(row.value.profileVersionId===null||profileIds.has(row.value.profileVersionId),p+'/value/profileVersionId','This day references a missing profile version.');for(const slot of row.value.slots)if(slot.origin==='routine')check(routineIds.get(slot.anchor.routineVersionId)===slot.anchor.routineRootId,p+'/value/slots','A routine occurrence must reference a version of its own routine.');if(prior){const present=new Map(row.value.slots.map(slot=>[slot.id,slot]));for(const slot of prior.value.slots)if(slot.origin!=='baseline')check(present.has(slot.id)&&present.get(slot.id).origin===slot.origin,p+'/value/slots','Retain manual and routine activities and cancel them explicitly instead of deleting their identities.');}}
        current.set(key,row);
      }
      for(const [n,event] of domain.events.entries()){
        const p='/planner/events/'+n;fields(event,EVENT_FIELDS,p,['evidence']);id(event.id,p+'/id');check(!ids.has(event.id),p+'/id','Planner record identifiers must be unique.');ids.add(event.id);rows.set(event.id,event);timestamp(event.recordedAt,p+'/recordedAt');check(isDate(event.dayRootId),p+'/dayRootId','Choose a valid day root.');id(event.dayVersionId,p+'/dayVersionId');id(event.slotId,p+'/slotId');check(['done','skipped','reset'].includes(event.status),p+'/status','Unsupported planner check-off state.');text(event.note,p+'/note',4000,false);
        if(own(event,'evidence'))nullable(event.evidence,e=>{evidenceRef(e,p+'/evidence');check(event.status==='done',p+'/evidence','Evidence belongs to a done check-off.');});
      }
      const opIds=new Set(),claimed=new Set(),replayHeads=new Map(),replayProfiles=new Set(),replayRoutines=new Set(),replayEvents=new Map(),eventOrder=[];
      for(const [n,receipt] of domain.operations.entries()){
        const p='/planner/operations/'+n;fields(receipt,['id','command','reviewDigest'],p);id(receipt.id,p+'/id');check(!opIds.has(receipt.id),p+'/id','Operation identifiers must be unique.');opIds.add(receipt.id);const c=command(receipt.command);check(c.operationId===receipt.id,p+'/command/operationId','Operation identity disagrees with its command.');check(receipt.reviewDigest===digest(c),p+'/reviewDigest','The review digest no longer matches its complete command.');
        const key=rootKey(c),previous=replayHeads.get(key);
        check(c.expected.previousVersionId===(previous?.id||null),p+'/command/expected','Each operation must review the current version at its point in history.');
        if(previous)check(c.recordedAt>=previous.recordedAt,p+'/command/recordedAt','An operation cannot predate its reviewed version.');
        for(const expected of expectedRows(c,replayHeads)){check(!claimed.has(expected.id),p+'/command/versionId','Each record must have one operation receipt.');claimed.add(expected.id);check(rows.has(expected.id)&&stable(rows.get(expected.id))===stable(expected),p+'/command','The recorded operation and immutable record disagree.');}
        for(const value of planDays(c)){check(value.profileVersionId===null||replayProfiles.has(value.profileVersionId),p+'/command/entity/profileVersionId','A day cannot reference a profile saved later.');if(value.profileVersionId!==null)check(c.recordedAt>=rows.get(value.profileVersionId).recordedAt,p+'/command/recordedAt','A saved day cannot predate its source profile.');for(const slot of value.slots)if(slot.origin==='routine')check(replayRoutines.has(slot.anchor.routineVersionId)&&rows.get(slot.anchor.routineVersionId).rootId===slot.anchor.routineRootId&&c.recordedAt>=rows.get(slot.anchor.routineVersionId).recordedAt,p+'/command/entity/slots','A routine occurrence cannot reference a routine version saved later or belonging to another routine.');}
        continuity(c,previous,replayEvents,p+'/command/entity',replayHeads);
        if(c.operation==='status'){replayEvents.set(c.entity.dayRootId+'|'+c.entity.slotId,rows.get(c.versionId));eventOrder.push(c.versionId);}
        else if(c.operation==='move'){replayHeads.set('days|'+c.entity.fromDate,rows.get(c.entity.originVersionId));replayHeads.set(key,rows.get(c.versionId));}
        else if(c.operation==='plan')for(const d of c.entity.days)replayHeads.set('days|'+d.date,rows.get(d.versionId));
        else{replayHeads.set(key,rows.get(c.versionId));if(c.operation==='profile')replayProfiles.add(c.versionId);if(c.operation==='routine')replayRoutines.add(c.versionId);}
      }
      check(claimed.size===rows.size,'/planner/operations','Every immutable planner record needs its original operation receipt.');
      check(eventOrder.every((id,n)=>domain.events[n]?.id===id),'/planner/events','Planner status events must retain their operation receipt order.');
      const active=new Map();for(const [key,row] of current)if(key.startsWith('days|'))for(const slot of row.value.slots)if(!slot.cancelled&&anchored(slot)){check(!active.has(slot.id),'/planner/days','An anchored activity is active on two days: '+active.get(slot.id)+' and '+row.rootId+'.');active.set(slot.id,row.rootId);}
      return {ok:true};
    }catch(error){return caught(error);}
  }
  function prepare(input,context){
    try{
      const c=command(input);check(object(context)&&object(context.workspace)&&object(context.workspace.domains),'/workspace','Load the workspace before planning.');integer(context.revision,'/revision',0,Number.MAX_SAFE_INTEGER);const domain=context.workspace.domains.planner,valid=validateDomain(domain);check(valid.ok,valid.path||'/planner',valid.error||'Invalid planner records.',valid.status);
      const previousOperation=domain.operations.find(row=>row.id===c.operationId);
      if(previousOperation){check(intent(previousOperation.command)===intent(c),'/operationId','This operation identifier already belongs to different planner details.');return {ok:true,status:'already-committed',command:c,reviewDigest:previousOperation.reviewDigest,summary:{title:'This planner change is already saved.',notices:[],conflicts:[]},receipt:clone(previousOperation)};}
      check(c.expected.workspaceRevision===context.revision,'/expected/workspaceRevision','The workspace changed. Review this planner change again.','needs-review');
      const minted=c.operation==='move'?[c.versionId,c.entity.originVersionId]:c.operation==='plan'?c.entity.days.map(d=>d.versionId):[c.versionId];for(const versionId of minted)check(![...domain.profiles,...domain.routines,...domain.days,...domain.events].some(row=>row.id===versionId),'/versionId','This record identifier already exists.');
      const map=heads(domain),previous=map.get(rootKey(c))||null;
      check(c.expected.previousVersionId===(previous?.id||null),'/expected/previousVersionId','This plan changed. Review its current version before saving.','needs-review');
      if(previous)check(c.recordedAt>=previous.recordedAt,'/recordedAt','The new record cannot predate the version it reviews.');
      for(const value of planDays(c)){
        check(value.profileVersionId===null||domain.profiles.some(row=>row.id===value.profileVersionId),'/entity/profileVersionId','Choose an existing planning profile version.');
        if(value.profileVersionId!==null)check(c.recordedAt>=domain.profiles.find(row=>row.id===value.profileVersionId).recordedAt,'/recordedAt','A saved day cannot predate its source profile.');
        for(const slot of value.slots)if(slot.origin==='routine'){const version=domain.routines.find(row=>row.id===slot.anchor.routineVersionId);check(version&&version.rootId===slot.anchor.routineRootId&&c.recordedAt>=version.recordedAt,'/entity/slots','A routine occurrence must reference an existing version of its routine.');}
      }
      if(c.operation==='move'){const origin=map.get('days|'+c.entity.fromDate);if(origin)check(c.recordedAt>=origin.recordedAt,'/recordedAt','The new record cannot predate the version it reviews.');}
      if(c.operation==='plan')for(const d of c.entity.days){const head=map.get('days|'+d.date);if(head)check(c.recordedAt>=head.recordedAt,'/recordedAt','The new record cannot predate the version it reviews.');}
      const lastEvents=new Map(domain.events.map(event=>[event.dayRootId+'|'+event.slotId,event]));continuity(c,previous,lastEvents,'/entity',map);
      let summary={title:{profile:'Save planning profile',routine:'Save routine',day:'Save day plan',status:'Save planner check-off',move:'Move activity to another day',plan:'Accept the proposed plan'}[c.operation],notices:[],conflicts:[]};
      if(c.operation==='plan'){summary.days=c.entity.days.map(d=>{const neighbours=[addDays(d.date,-1),addDays(d.date,1)].map(n=>c.entity.days.find(x=>x.date===n)?.value||currentDay(domain,n)).filter(Boolean);return {date:d.date,...analyseDay(d.value,neighbours)};});summary.conflicts=summary.days.flatMap(x=>x.conflicts.map(k=>({date:x.date,...k})));summary.notices.push('This saves a new version of '+c.entity.days.length+' day'+(c.entity.days.length===1?'':'s')+'. Completed and pinned activities are unchanged; earlier versions stay in history. No workout, meal, work, money or goal record is created.');}
      if(c.operation==='day'){const neighbours=[currentDay(domain,addDays(c.entity.date,-1)),currentDay(domain,addDays(c.entity.date,1))].filter(Boolean);summary={...summary,...analyseDay(c.entity,neighbours)};}
      if(c.operation==='move'){const target=c.entity.target,neighbours=[currentDay(domain,addDays(target.date,-1)),currentDay(domain,addDays(target.date,1))].filter(Boolean),origin=expectedRows(c,map)[0].value;summary={...summary,...analyseDay(target,neighbours),origin:analyseDay(origin,[currentDay(domain,addDays(origin.date,-1)),currentDay(domain,addDays(origin.date,1))].filter(Boolean))};summary.notices.push('The activity keeps its identity. Its earlier day retains it as cancelled, and any check-off history stays with that day.');}
      if(c.operation==='routine'){summary.notices.push(previous?'This version applies from '+c.entity.effectiveFrom+'. Days you already saved are unchanged; rebuild a day to add missing occurrences.':'Occurrences appear when you preview or rebuild a day on or after '+c.entity.recurrence.startDate+'.');}
      if(c.operation==='status'){
        const slot=previous.value.slots.find(row=>row.id===c.entity.slotId),evidence=evidenceOf(c.entity);
        if(evidence){const resolved=resolveEvidence(evidence,context.workspace);check(resolved.ok,'/entity/evidence',resolved.error||'This record could not be found.');summary.evidence=resolved;const shared=supportsOf(domain,evidence,c.entity.dayRootId+'|'+c.entity.slotId);summary.alsoSupports=shared;summary.notices.push('This check-off links an existing '+evidence.kind.replace('-',' ')+' record as evidence. That record is unchanged and still counts once in its own section.'+(resolved.superseded?' A newer version of it exists; the linked version stays readable.':''));if(shared.length)summary.notices.push('The same record already supports '+shared.map(s=>'"'+s.title+'" on '+s.dayRootId).join(', ')+'. One workout can fulfil several plans; its minutes and sets are never added up by the planner.');}
        else if(c.entity.status==='done'&&SPECIALIST.includes(slot.category))summary.notices.push('No actual '+slot.category+' record is linked. The check-off records that you followed the plan; the section keeps the real log.');
        else summary.notices.push('This records a planner check-off only. Workout, food, work and money records stay in their own sections.');
      }
      return {ok:true,status:'ready',command:c,reviewDigest:digest(c),summary};
    }catch(error){return caught(error);}
  }
  const EVIDENCE={
    'training-session':{domain:'training',list:'history',root:r=>r.id,version:r=>r.id,date:r=>r.date,chain:'none'},
    'sleep-record':{domain:'sleep',list:'revisions',root:r=>r.sessionId,version:r=>r.id,date:r=>r.wakeDate,chain:'supersedes'},
    'meal-log':{domain:'food',list:'revisions',root:r=>r.planId,version:r=>r.id,date:r=>r.date,chain:'supersedes'},
    'work-entry':{domain:'work',list:'versions',root:r=>r.id,version:r=>r.revisionId,date:r=>r.date,chain:'last'},
    'goal-progress':{domain:'goals',list:'progressVersions',root:r=>r.recordId,version:r=>r.id,date:r=>r.date,chain:'supersedes'},
    'goal-action-event':{domain:'goals',list:'completionEvents',root:r=>r.id,version:r=>r.id,date:r=>r.date,chain:'none'},
    'people-event':{domain:'people',list:'eventVersions',root:r=>r.rootId||r.id,version:r=>r.id,date:r=>r.date,chain:'last'},
    'money-transaction':{domain:'money',list:'versions',root:r=>r.rootId||r.id,version:r=>r.id,date:r=>r.date,chain:'last'}
  };
  function resolveEvidence(reference,workspace){
    try{
      evidenceRef(reference,'/evidence');const spec=EVIDENCE[reference.kind];check(object(workspace)&&object(workspace.domains)&&object(workspace.domains[spec.domain])&&Array.isArray(workspace.domains[spec.domain][spec.list]),'/evidence','The '+spec.domain+' records are unavailable.');
      const rows=workspace.domains[spec.domain][spec.list].filter(object);
      const row=rows.find(r=>spec.version(r)===reference.versionId);check(row,'/evidence/versionId','This '+reference.kind.replace('-',' ')+' record could not be found.');
      const rootId=spec.root(row);check(rootId===reference.rootId,'/evidence/rootId','This record belongs to a different root identity.');check(spec.date(row)===reference.date,'/evidence/date','The linked version is dated differently.');
      let currentRow=row;
      if(spec.chain==='supersedes'){const superseded=new Set(rows.map(r=>r.supersedes).filter(Boolean));currentRow=rows.find(r=>!superseded.has(r.id)&&spec.root(r)===rootId)||row;}
      else if(spec.chain==='last'){for(const r of rows)if(spec.root(r)===rootId)currentRow=r;}
      return {ok:true,reference:clone(reference),current:{versionId:spec.version(currentRow),date:spec.date(currentRow)},superseded:spec.version(currentRow)!==reference.versionId};
    }catch(error){return caught(error);}
  }
  function proposeEvidence(slot,candidates,domain){
    try{
      check(object(slot)&&CATEGORIES.includes(slot.category),'/slot','Choose a planner activity.');list(candidates,'/candidates',10000);const allowed=COMPATIBLE[slot.category]||[];
      if(domain!==undefined)check(object(domain)&&Array.isArray(domain.events),'/domain','Supply the planner records to see what a record already supports.');
      const timed=object(slot.start)&&object(slot.end)&&isDate(slot.start.date)&&isTime(slot.start.time)&&isDate(slot.end.date)&&isTime(slot.end.time);
      const start=timed?minute(slot.start.time):null,end=timed?daysBetween(slot.start.date,slot.end.date)*1440+minute(slot.end.time):null;
      const rows=[];for(const row of candidates){if(!object(row)||!allowed.includes(row.kind))continue;let distance=100000,reason='No time recorded';if(timed&&isTime(row.time)&&isDate(row.date)){const t=daysBetween(slot.start.date,row.date)*1440+minute(row.time);distance=t>=start&&t<=end?0:Math.min(Math.abs(t-start),Math.abs(t-end));reason=distance===0?'Recorded during this activity':'Recorded '+(distance>=1440?Math.round(distance/1440)+' day'+(distance>=2880?'s':''):distance+' minutes')+' from this activity';}const alsoSupports=domain?supportsOf(domain,{kind:row.kind,rootId:row.rootId},null):[];if(alsoSupports.length)reason+=' · already supports '+alsoSupports.map(s=>'"'+s.title+'"').join(', ');rows.push({...clone(row),distance,reason,alsoSupports});}
      rows.sort((a,b)=>(a.alsoSupports.length>0)-(b.alsoSupports.length>0)||a.distance-b.distance||String(a.time||'').localeCompare(String(b.time||''))||String(a.versionId).localeCompare(String(b.versionId)));
      return {ok:true,proposals:rows,ambiguous:rows.filter(r=>r.distance===rows[0]?.distance).length>1};
    }catch(error){return caught(error);}
  }
  function validateLinks(payload){
    try{
      check(object(payload)&&object(payload.domains)&&object(payload.domains.planner),'/planner','The planner section is missing.');const domain=payload.domains.planner;
      if(domain.schema===LEGACY_SCHEMA)return {ok:true};
      const lastEvents=new Map();for(const event of domain.events||[])if(object(event))lastEvents.set(event.dayRootId+'|'+event.slotId,event);
      for(const [key,event] of lastEvents){const evidence=evidenceOf(event);if(!evidence||event.status!=='done')continue;const resolved=resolveEvidence(evidence,payload);check(resolved.ok,'/planner/events',resolved.error);}
      for(const event of domain.events||[]){const evidence=evidenceOf(event);if(evidence)check(resolveEvidence(evidence,payload).ok,'/planner/events','A historical planner check-off references a missing record version.');}
      return {ok:true};
    }catch(error){return caught(error);}
  }
  function buildCandidate(prepared,workspace){
    try{
      check(prepared?.ok&&['ready','already-committed'].includes(prepared.status),'/prepared','Review this planner change before saving.');const c=command(prepared.command);
      const checked=prepare(c,{workspace,revision:c.expected.workspaceRevision});check(checked.ok,checked.path||'',checked.error||'The planner change is no longer valid.',checked.status);check(checked.status===prepared.status&&checked.reviewDigest===prepared.reviewDigest,'/reviewDigest','The reviewed planner change no longer matches.','needs-review');
      if(checked.status==='already-committed')return {ok:true,workspace:clone(workspace),receipt:clone(checked.receipt),unchanged:true};
      const candidate=clone(workspace),domain=candidate.domains.planner,receipt={id:c.operationId,command:clone(c),reviewDigest:checked.reviewDigest};for(const row of expectedRows(c,heads(domain)))domain[c.operation==='profile'?'profiles':c.operation==='routine'?'routines':c.operation==='status'?'events':'days'].push(row);domain.operations.push(receipt);candidate.minimumReaderVersion=Math.max(READER,candidate.minimumReaderVersion||0);
      const valid=validateDomain(domain);check(valid.ok,valid.path||'',valid.error||'Invalid candidate.',valid.status);return {ok:true,workspace:candidate,receipt:clone(receipt)};
    }catch(error){return caught(error);}
  }
  global.PlannerOperations=Object.freeze({empty,normalize,emptyProfile,validateDomain,validateLinks,currentProfile,currentDay,currentRoutine,routines,routineVersionFor,occurrences,locate,resolve,dayBounds:(date,timeZone)=>{try{check(isDate(date),'/date','Choose a valid date.');zone(timeZone,'/timeZone');const b=dayBounds(date,timeZone);return {ok:true,start:b.start,end:b.end};}catch(error){return caught(error);}},endpointAt:(at,timeZone)=>{try{zone(timeZone,'/timeZone');const n=typeof at==='string'?Date.parse(at):at;check(Number.isFinite(n),'/at','Choose a valid instant.');return {ok:true,endpoint:endpointAt(Math.round(n/60000)*60000,timeZone)};}catch(error){return caught(error);}},generateDay,analyseDay,resolveEvidence,proposeEvidence,checkoffState,prepare,buildCandidate,READER,EVIDENCE_KINDS:Object.freeze(EVIDENCE_KINDS.slice()),COMPATIBLE:Object.freeze(Object.fromEntries(Object.entries(COMPATIBLE).map(([k,v])=>[k,Object.freeze(v.slice())])))});
})(window);
