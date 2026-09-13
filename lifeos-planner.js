/* Pure planning records and proposals. No DOM, storage, clock or transport reads. */
(function(global){
  'use strict';
  const CONTRACT='lifeos-planner/1',SCHEMA='lifeos.planner/1';
  const CATEGORIES=['sleep','work','commute','buffer','training','meal','goal','care','admin','rest','other'];
  const ROUTES=['train','plan','food','sleep','work','goals','money','people','life','capture'];
  const PROFILE_FIELDS=['timeZone','workDays','intendedStart','intendedEnd','usualStart','usualEnd','contractMinutes','unpaidBreakMinutes','commuteMinutesEachWay','futureCommuteMinutesEachWay','sleepStart','sleepEnd','transitionMinutes','equipment','limitations','priorities'];
  const DAY_FIELDS=['date','timeZone','profileVersionId','dayType','scenario','note','slots'];
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
  const clone=x=>JSON.parse(JSON.stringify(x));
  function fail(path,message,status='invalid'){const error=new Error(message);error.path=path;error.status=status;throw error;}
  function check(ok,path,message,status){if(!ok)fail(path,message,status);}
  function fields(value,keys,path){check(object(value),path,'Expected an object.');for(const key of Object.keys(value))check(keys.includes(key),path+'/'+key,'This planner field is not supported.','unsupported');for(const key of keys)check(own(value,key),path+'/'+key,'This required planner field is missing.');}
  function text(value,path,max=200,required=true){check(typeof value==='string'&&value.length<=max&&(!required||value.trim()),path,'Enter '+(required?'non-empty ':'')+'text of at most '+max+' characters.');}
  function id(value,path){check(typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value),path,'Use a stable identifier containing letters, numbers, underscores or hyphens.');}
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
  function empty(){return {schema:SCHEMA,profiles:[],days:[],events:[],operations:[]};}
  function emptyProfile(timeZone){zone(timeZone,'/timeZone');return {timeZone,workDays:[],intendedStart:null,intendedEnd:null,usualStart:null,usualEnd:null,contractMinutes:null,unpaidBreakMinutes:null,commuteMinutesEachWay:null,futureCommuteMinutesEachWay:null,sleepStart:null,sleepEnd:null,transitionMinutes:0,equipment:[],limitations:'',priorities:''};}
  function profile(value,path){
    fields(value,PROFILE_FIELDS,path);zone(value.timeZone,path+'/timeZone');
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
  function dayBounds(date,timeZone){return {start:boundary(date,timeZone),end:boundary(addDays(date,1),timeZone)};}
  function day(value,path){
    fields(value,DAY_FIELDS,path);check(isDate(value.date),path+'/date','Choose a valid day date.');zone(value.timeZone,path+'/timeZone');nullable(value.profileVersionId,v=>id(v,path+'/profileVersionId'));
    check(['normal','travel','leave','sick','rest'].includes(value.dayType),path+'/dayType','Choose a supported day type.');check(['usual','intended','future'].includes(value.scenario),path+'/scenario','Choose a supported planning scenario.');text(value.note,path+'/note',4000,false);
    list(value.slots,path+'/slots',1000);const seen=new Set(),bounds=dayBounds(value.date,value.timeZone);
    for(const [n,row] of value.slots.entries()){
      const p=path+'/slots/'+n;fields(row,['id','title','category','start','end','fixed','origin','cancelled','link'],p);id(row.id,p+'/id');check(!seen.has(row.id),p+'/id','Activity identifiers must be unique within a day.');seen.add(row.id);text(row.title,p+'/title',200);
      check(CATEGORIES.includes(row.category),p+'/category','Choose a supported activity type.');for(const key of ['fixed','cancelled'])check(typeof row[key]==='boolean',p+'/'+key,'Use an explicit yes or no.');check(['baseline','manual'].includes(row.origin),p+'/origin','Keep an activity source.');
      endpoint(row.start,value.timeZone,p+'/start');endpoint(row.end,value.timeZone,p+'/end');const start=Date.parse(row.start.at),end=Date.parse(row.end.at);check(end>start&&end-start<=86400000,p,'An activity must last more than zero and at most 24 elapsed hours.');check(row.origin==='manual'?start<bounds.end&&end>bounds.start:start>=bounds.start-86400000&&start<bounds.end+86400000,p,'Manual activities must overlap their day; generated anchors must remain within the neighbouring dates.');
      nullable(row.link,link=>{fields(link,['route','label'],p+'/link');check(ROUTES.includes(link.route),p+'/link/route','This shortcut route is unsupported.');text(link.label,p+'/link/label',100);});
    }
  }
  function latest(rows,rootId){let found=null;for(const row of rows)if(row.rootId===rootId)found=row;return found?clone(found):null;}
  function currentProfile(domain){return latest(domain.profiles,'profile');}
  function currentDay(domain,date){return latest(domain.days,date);}
  function valueOf(row){return row&&own(row,'value')?row.value:row;}
  function generateDay(profileRow,options,previousDay){
    try{
      check(object(profileRow)&&object(profileRow.value),'/profile','Save your planning profile first.');id(profileRow.id,'/profile/id');profile(profileRow.value,'/profile');const p=profileRow.value;
      fields(options,['date','dayType','scenario','note'],'/options');const value={date:options.date,timeZone:p.timeZone,profileVersionId:profileRow.id,dayType:options.dayType,scenario:options.scenario,note:options.note,slots:[]};day(value,'/day');const notices=[],previous=valueOf(previousDay);
      if(previous){day(previous,'/previousDay');check(previous.date===value.date,'/previousDay/date','Only rebuild the selected day.');check(previous.timeZone===value.timeZone||!previous.slots.some(s=>s.origin==='manual'),'/timeZone','This day has manual activities in another time zone. Retain that day zone or move its activities explicitly.');value.slots=clone(previous.slots.filter(s=>s.origin==='manual'));}
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
      if(value.slots.some(slot=>Date.parse(slot.start.at)<bounds.start||Date.parse(slot.end.at)>bounds.end))notices.push('Some anchors cross into neighbouring dates. They remain attached to this plan and count on the dates they occupy.');
      day(value,'/day');return {ok:true,value,notices};
    }catch(error){return caught(error);}
  }
  function analyseDay(input,neighbours=[]){
    const value=valueOf(input),result={conflicts:[],occupiedMinutes:0,freeMinutes:0,notices:[],dayMinutes:0};
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
    stable(value);const c=clone(value);fields(c,['contract','operation','operationId','versionId','recordedAt','expected','entity'],'');check(c.contract===CONTRACT,'/contract','This planner contract is unsupported.','unsupported');check(['profile','day','status'].includes(c.operation),'/operation','This planner operation is unsupported.','unsupported');id(c.operationId,'/operationId');id(c.versionId,'/versionId');timestamp(c.recordedAt,'/recordedAt');fields(c.expected,['workspaceRevision','previousVersionId'],'/expected');integer(c.expected.workspaceRevision,'/expected/workspaceRevision',0,Number.MAX_SAFE_INTEGER);nullable(c.expected.previousVersionId,v=>id(v,'/expected/previousVersionId'));
    if(c.operation==='profile')profile(c.entity,'/entity');else if(c.operation==='day')day(c.entity,'/entity');else{fields(c.entity,['dayRootId','slotId','status','note'],'/entity');check(isDate(c.entity.dayRootId),'/entity/dayRootId','Choose a valid saved day.');id(c.entity.slotId,'/entity/slotId');check(['done','skipped','reset'].includes(c.entity.status),'/entity/status','Choose a supported check-off state.');text(c.entity.note,'/entity/note',4000,false);}
    return c;
  }
  function intent(c){const v=clone(c);delete v.expected.workspaceRevision;return stable(v);}
  const digest=c=>stable(c);
  function expectedRow(c){if(c.operation==='status')return {id:c.versionId,...clone(c.entity),dayVersionId:c.expected.previousVersionId,recordedAt:c.recordedAt};return {id:c.versionId,rootId:c.operation==='profile'?'profile':c.entity.date,supersedes:c.expected.previousVersionId,recordedAt:c.recordedAt,value:clone(c.entity)};}
  function taskMeaning(slot){return stable({title:slot.title,category:slot.category,start:slot.start,end:slot.end,link:slot.link});}
  function continuity(c,previous,lastEvents,path){
    if(c.operation==='day'&&previous){
      const present=new Map(c.entity.slots.map(slot=>[slot.id,slot]));
      for(const slot of previous.value.slots)if(slot.origin==='manual'){
        const next=present.get(slot.id);check(next&&next.origin==='manual',path+'/slots','Retain manual activities and cancel them explicitly instead of deleting their identities.');
        const last=lastEvents.get(previous.rootId+'|'+slot.id);check(last?.status!=='done'||taskMeaning(slot)===taskMeaning(next),path+'/slots','Reset this completed activity before changing its title, type, timing or shortcut.','needs-review');
      }
    }
    if(c.operation==='status'){
      check(previous,path+'/dayRootId','Save the day before checking off an activity.');const slot=previous.value.slots.find(row=>row.id===c.entity.slotId);
      check(slot&&!slot.cancelled&&slot.origin==='manual',path+'/slotId','Choose an active manual activity. Baseline anchors are plans, not completed logs.');
      if(c.entity.status==='done')check(c.entity.dayRootId<=localParts(Date.parse(c.recordedAt),previous.value.timeZone).date,path+'/status','A future day cannot be marked done.');
      const last=lastEvents.get(c.entity.dayRootId+'|'+c.entity.slotId);if(last)check(c.recordedAt>=last.recordedAt,'/recordedAt','This check-off cannot predate its previous status.');
    }
  }
  function validateDomain(domain){
    try{
      stable(domain);fields(domain,['schema','profiles','days','events','operations'],'/planner');check(domain.schema===SCHEMA,'/planner/schema','This planner domain is unsupported.','unsupported');for(const key of ['profiles','days','events','operations'])list(domain[key],'/planner/'+key);
      const ids=new Set(),rows=new Map(),heads=new Map(),profileIds=new Set(),dayVersions=new Map();
      for(const kind of ['profiles','days'])for(const [n,row] of domain[kind].entries()){
        const p='/planner/'+kind+'/'+n;fields(row,['id','rootId','supersedes','recordedAt','value'],p);id(row.id,p+'/id');check(!ids.has(row.id),p+'/id','Planner record identifiers must be unique.');ids.add(row.id);rows.set(row.id,row);timestamp(row.recordedAt,p+'/recordedAt');nullable(row.supersedes,v=>id(v,p+'/supersedes'));
        const rootKey=kind+'|'+row.rootId,prior=heads.get(rootKey);check(row.supersedes===(prior?.id||null),p+'/supersedes','A version must name its exact current predecessor.');if(prior)check(row.recordedAt>=prior.recordedAt,p+'/recordedAt','A new version cannot predate its predecessor.');
        if(kind==='profiles'){check(row.rootId==='profile',p+'/rootId','The planning profile has one stable root.');profile(row.value,p+'/value');profileIds.add(row.id);}
        else{day(row.value,p+'/value');check(row.rootId===row.value.date,p+'/rootId','A day root must equal its local date.');check(row.value.profileVersionId===null||profileIds.has(row.value.profileVersionId),p+'/value/profileVersionId','This day references a missing profile version.');if(prior){const present=new Map(row.value.slots.map(slot=>[slot.id,slot]));for(const slot of prior.value.slots)if(slot.origin==='manual')check(present.has(slot.id)&&present.get(slot.id).origin==='manual',p+'/value/slots','Retain manual activities and cancel them explicitly instead of deleting their identities.');}dayVersions.set(row.id,row);}
        heads.set(rootKey,row);
      }
      for(const [n,event] of domain.events.entries()){
        const p='/planner/events/'+n;fields(event,['id','dayRootId','dayVersionId','slotId','status','note','recordedAt'],p);id(event.id,p+'/id');check(!ids.has(event.id),p+'/id','Planner record identifiers must be unique.');ids.add(event.id);rows.set(event.id,event);timestamp(event.recordedAt,p+'/recordedAt');check(isDate(event.dayRootId),p+'/dayRootId','Choose a valid day root.');id(event.dayVersionId,p+'/dayVersionId');id(event.slotId,p+'/slotId');check(['done','skipped','reset'].includes(event.status),p+'/status','Unsupported planner check-off state.');text(event.note,p+'/note',4000,false);
      }
      const opIds=new Set(),claimed=new Set(),replayHeads=new Map(),replayProfiles=new Set(),replayEvents=new Map(),eventOrder=[];
      for(const [n,receipt] of domain.operations.entries()){
        const p='/planner/operations/'+n;fields(receipt,['id','command','reviewDigest'],p);id(receipt.id,p+'/id');check(!opIds.has(receipt.id),p+'/id','Operation identifiers must be unique.');opIds.add(receipt.id);const c=command(receipt.command);check(c.operationId===receipt.id,p+'/command/operationId','Operation identity disagrees with its command.');check(receipt.reviewDigest===digest(c),p+'/reviewDigest','The review digest no longer matches its complete command.');check(!claimed.has(c.versionId),p+'/command/versionId','Each record must have one operation receipt.');claimed.add(c.versionId);check(rows.has(c.versionId)&&stable(rows.get(c.versionId))===stable(expectedRow(c)),p+'/command','The recorded operation and immutable record disagree.');
        const rootKey=c.operation==='profile'?'profile':c.operation==='day'?c.entity.date:c.entity.dayRootId,previous=replayHeads.get(rootKey);
        check(c.expected.previousVersionId===(previous?.id||null),p+'/command/expected','Each operation must review the current version at its point in history.');
        if(previous)check(c.recordedAt>=previous.recordedAt,p+'/command/recordedAt','An operation cannot predate its reviewed version.');
        if(c.operation==='day'){check(c.entity.profileVersionId===null||replayProfiles.has(c.entity.profileVersionId),p+'/command/entity/profileVersionId','A day cannot reference a profile saved later.');if(c.entity.profileVersionId!==null)check(c.recordedAt>=rows.get(c.entity.profileVersionId).recordedAt,p+'/command/recordedAt','A saved day cannot predate its source profile.');}
        continuity(c,previous,replayEvents,p+'/command/entity');
        if(c.operation==='status'){replayEvents.set(c.entity.dayRootId+'|'+c.entity.slotId,rows.get(c.versionId));eventOrder.push(c.versionId);}
        else{replayHeads.set(rootKey,rows.get(c.versionId));if(c.operation==='profile')replayProfiles.add(c.versionId);}
      }
      check(claimed.size===rows.size,'/planner/operations','Every immutable planner record needs its original operation receipt.');
      check(eventOrder.every((id,n)=>domain.events[n]?.id===id),'/planner/events','Planner status events must retain their operation receipt order.');
      return {ok:true};
    }catch(error){return caught(error);}
  }
  function prepare(input,context){
    try{
      const c=command(input);check(object(context)&&object(context.workspace)&&object(context.workspace.domains),'/workspace','Load the workspace before planning.');integer(context.revision,'/revision',0,Number.MAX_SAFE_INTEGER);const domain=context.workspace.domains.planner,valid=validateDomain(domain);check(valid.ok,valid.path||'/planner',valid.error||'Invalid planner records.',valid.status);
      const previousOperation=domain.operations.find(row=>row.id===c.operationId);
      if(previousOperation){check(intent(previousOperation.command)===intent(c),'/operationId','This operation identifier already belongs to different planner details.');return {ok:true,status:'already-committed',command:c,reviewDigest:previousOperation.reviewDigest,summary:{title:'This planner change is already saved.',notices:[],conflicts:[]},receipt:clone(previousOperation)};}
      check(c.expected.workspaceRevision===context.revision,'/expected/workspaceRevision','The workspace changed. Review this planner change again.','needs-review');
      check(![...domain.profiles,...domain.days,...domain.events].some(row=>row.id===c.versionId),'/versionId','This record identifier already exists.');
      const previous=c.operation==='profile'?currentProfile(domain):currentDay(domain,c.operation==='day'?c.entity.date:c.entity.dayRootId);
      check(c.expected.previousVersionId===(previous?.id||null),'/expected/previousVersionId','This plan changed. Review its current version before saving.','needs-review');
      if(previous)check(c.recordedAt>=previous.recordedAt,'/recordedAt','The new record cannot predate the version it reviews.');
      if(c.operation==='day'){
        check(c.entity.profileVersionId===null||domain.profiles.some(row=>row.id===c.entity.profileVersionId),'/entity/profileVersionId','Choose an existing planning profile version.');
        if(c.entity.profileVersionId!==null)check(c.recordedAt>=domain.profiles.find(row=>row.id===c.entity.profileVersionId).recordedAt,'/recordedAt','A saved day cannot predate its source profile.');
      }
      const lastEvents=new Map(domain.events.map(event=>[event.dayRootId+'|'+event.slotId,event]));continuity(c,previous,lastEvents,'/entity');
      let summary={title:c.operation==='profile'?'Save planning profile':c.operation==='day'?'Save day plan':'Save planner check-off',notices:[],conflicts:[]};
      if(c.operation==='day'){const neighbours=[currentDay(domain,addDays(c.entity.date,-1)),currentDay(domain,addDays(c.entity.date,1))].filter(Boolean);summary={...summary,...analyseDay(c.entity,neighbours)};}
      if(c.operation==='status')summary.notices.push('This records a planner check-off only. Workout, food, work and money records stay in their own sections.');
      return {ok:true,status:'ready',command:c,reviewDigest:digest(c),summary};
    }catch(error){return caught(error);}
  }
  function buildCandidate(prepared,workspace){
    try{
      check(prepared?.ok&&['ready','already-committed'].includes(prepared.status),'/prepared','Review this planner change before saving.');const c=command(prepared.command);
      const checked=prepare(c,{workspace,revision:c.expected.workspaceRevision});check(checked.ok,checked.path||'',checked.error||'The planner change is no longer valid.',checked.status);check(checked.status===prepared.status&&checked.reviewDigest===prepared.reviewDigest,'/reviewDigest','The reviewed planner change no longer matches.','needs-review');
      if(checked.status==='already-committed')return {ok:true,workspace:clone(workspace),receipt:clone(checked.receipt),unchanged:true};
      const candidate=clone(workspace),domain=candidate.domains.planner,row=expectedRow(c),receipt={id:c.operationId,command:clone(c),reviewDigest:checked.reviewDigest};domain[c.operation==='profile'?'profiles':c.operation==='day'?'days':'events'].push(row);domain.operations.push(receipt);candidate.minimumReaderVersion=Math.max(66,candidate.minimumReaderVersion||0);
      const valid=validateDomain(domain);check(valid.ok,valid.path||'',valid.error||'Invalid candidate.',valid.status);return {ok:true,workspace:candidate,receipt:clone(receipt)};
    }catch(error){return caught(error);}
  }
  global.PlannerOperations=Object.freeze({empty,emptyProfile,validateDomain,currentProfile,currentDay,resolve,generateDay,analyseDay,prepare,buildCandidate});
})(window);
