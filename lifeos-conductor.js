/* Life Conductor: a pure, deterministic day and week proposal service. No DOM, storage, clock, network or model access. */
(function(global){
  'use strict';
  const VERSION='conductor/1';
  // Every assumption is explicit, shown in the proposal and overridable from the planning profile or the caller's policy.
  // shortTrainingMinutes remains an accepted compatibility field only; a duration and home equipment never authorize a replacement workout.
  const DEFAULTS={trainingMinutes:60,trainingTravelMinutes:0,changingMinutes:15,shortTrainingMinutes:30,mealMinutes:30,spareMinutes:60,windDownMinutes:45,prepMinutes:20,goalActionMinutes:30,mealWindowMinutes:90,birthdayLeadDays:{choose:21,buy:10,prepare:2},planLeadDays:3,horizonMaxDays:14,queueDays:60};
  const INTEGER_KEYS=['trainingMinutes','trainingTravelMinutes','changingMinutes','shortTrainingMinutes','mealMinutes','spareMinutes','windDownMinutes','prepMinutes','goalActionMinutes','mealWindowMinutes','planLeadDays','horizonMaxDays','queueDays'];
  const SLOT_KEYS=['trainingMinutes','shortTrainingMinutes','mealMinutes','prepMinutes','goalActionMinutes'];
  const SCENARIOS=['usual','intended','future'],DAY_TYPES=['normal','travel','leave','sick','rest'];
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const isTime=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const daysBetween=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
  const duration=m=>{const h=Math.floor(m/60),r=m%60;return h?(h+' h'+(r?' '+r+' min':'')):r+' min';};
  function fail(path,message){const e=new Error(message);e.path=path;throw e;}
  function check(ok,path,message){if(!ok)fail(path,message);}
  function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';}
  function fnv(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
  const P=()=>global.PlannerOperations;
  const latestBy=(rows,key)=>{const m=new Map();for(const r of rows||[])if(object(r))m.set(r[key],r);return [...m.values()];};
  const sortedSlots=value=>({...value,slots:value.slots.slice().sort((a,b)=>a.id.localeCompare(b.id))});
  function labelOf(key){return {trainingMinutes:'Training session length',trainingTravelMinutes:'Travel to training each way',changingMinutes:'Changing and showering',mealMinutes:'Time to eat a planned meal',spareMinutes:'Deliberate free space per day',windDownMinutes:'Wind-down before sleep'}[key]||key;}
  function policyFrom(profile,overrides,assumptions){
    const policy=clone(DEFAULTS);
    for(const key of ['trainingMinutes','trainingTravelMinutes','changingMinutes','mealMinutes','spareMinutes','windDownMinutes']){const v=profile[key];const usable=Number.isInteger(v)&&v>=0&&!(SLOT_KEYS.includes(key)&&v===0);if(usable)policy[key]=v;else assumptions.push(labelOf(key)+' assumed '+DEFAULTS[key]+' minutes. Set it in your planning profile.');}
    if(overrides!==undefined){check(object(overrides),'/options/policy','Policy overrides must be an object.');for(const [k,v] of Object.entries(overrides)){check(INTEGER_KEYS.includes(k),'/options/policy/'+k,'This policy setting cannot be overridden.');check(Number.isInteger(v)&&v>=0&&v<=100000,'/options/policy/'+k,'Use a whole number of minutes or days.');policy[k]=SLOT_KEYS.includes(k)&&v===0?DEFAULTS[k]:v;}}
    return policy;
  }
  function birthdayDate(person,year){const [mm,dd]=person.birthday.split('-');if(mm==='02'&&dd==='29'&&!isDate(year+'-02-29'))return person.leapDay==='mar1'?year+'-03-01':year+'-02-28';return year+'-'+mm+'-'+dd;}
  function nextBirthday(person,from){let year=Number(from.slice(0,4)),date=birthdayDate(person,year);if(date<from)date=birthdayDate(person,++year);return date;}
  // Free-interval search over sorted occupied [start,end] minute pairs.
  function gaps(occupied,from,to){const out=[];let cursor=from;for(const [a,b] of occupied){if(b<=cursor)continue;if(a>=to)break;if(a>cursor)out.push([cursor,Math.min(a,to)]);cursor=Math.max(cursor,b);if(cursor>=to)break;}if(cursor<to)out.push([cursor,to]);return out;}
  function occupy(occupied,a,b){if(b<=a)return;occupied.push([a,b]);occupied.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);}
  function propose(input){
    try{
      check(object(input),'/input','Supply the planning inputs.');const {now,horizon,workspace,revision}=input,options=object(input.options)?input.options:{};
      check(typeof now==='string'&&Number.isFinite(Date.parse(now)),'/now','Supply the current instant.');check(object(horizon)&&isDate(horizon.from)&&isDate(horizon.to)&&horizon.to>=horizon.from,'/horizon','Choose a valid planning horizon.');
      check(Number.isSafeInteger(revision)&&revision>=0,'/revision','Supply the reviewed workspace revision.');check(object(workspace)&&object(workspace.domains)&&object(workspace.domains.planner),'/workspace','Load the workspace before planning.');
      const domains=workspace.domains,domain=domains.planner,Ops=P();check(Ops,'/engine','The planner engine is unavailable.');
      const profileRow=Ops.currentProfile(domain);check(profileRow,'/profile','Save your planning profile first.');const profile=profileRow.value,zone=profile.timeZone;
      const nowMs=Date.parse(now),nowPoint=Ops.endpointAt(nowMs,zone);check(nowPoint.ok,'/now',nowPoint.error);const today=nowPoint.endpoint.date;
      if(options.scenario!==undefined)check(SCENARIOS.includes(options.scenario),'/options/scenario','Choose a supported planning scenario.');
      const assumptions=[],policy=policyFrom(profile,options.policy,assumptions);
      check(horizon.from>=today,'/horizon','Plans start today. Earlier days are history and are not replanned.');check(daysBetween(horizon.from,horizon.to)<policy.horizonMaxDays,'/horizon','Plan at most '+policy.horizonMaxDays+' days at a time.');
      const dayTypeOverrides=object(options.dayTypes)?options.dayTypes:{};for(const [d,t] of Object.entries(dayTypeOverrides))check(isDate(d)&&DAY_TYPES.includes(t),'/options/dayTypes','Choose supported day types.');
      const calendar=global.LifeOSWorkCalendar;check(calendar,'/calendar','The Work calendar reader is unavailable.');
      const training=object(domains.training)?domains.training:{routines:[],schedule:{},history:[],state:{}};
      const food=object(domains.food)?domains.food:{plans:[],revisions:[],recipes:[]};const loggedPlans=new Set((food.revisions||[]).filter(object).map(r=>r.planId));
      const goals=object(domains.goals)?domains.goals:{actions:[],completionEvents:[]};
      const actionDone=id=>{let done=false;for(const e of goals.completionEvents||[])if(object(e)&&e.actionId===id)done=e.type==='complete';return done;};
      const people=object(domains.people)?domains.people:{people:[],gifts:[],plans:[]};
      const heads=new Map();for(const row of domain.days)heads.set(row.rootId,row);
      const activeIds=new Set();for(const row of heads.values())for(const s of row.value.slots)if(!s.cancelled)activeIds.add(s.id);
      const dates=[];for(let d=horizon.from;d<=horizon.to;d=addDays(d,1))dates.push(d);
      const queue=buildQueue(people,today,horizon,policy,activeIds);
      const days=[],dayByDate=new Map(),proposedValues=new Map();let carried=[];
      const running=object(domains.work)&&object(domains.work.running)?domains.work.running:null;
      for(const date of dates){
        const head=heads.get(date)||null;
        const calendarDay=calendar.describe(domains.work,date),sameCalendarZone=zone===calendar.timeZone,chosenType=dayTypeOverrides[date]||head?.value.dayType||null,inferredType=sameCalendarZone?calendarDay.dayType:null;
        let dayType=chosenType||inferredType||'normal',typeReason=null;
        const recoveryGuard=calendarDay.recovery;
        if(!chosenType&&inferredType){const kind=calendarDay.recovery?'sickness':calendarDay.rows.some(r=>r.type==='annual')?'annual leave':'a bank holiday';typeReason='Work calendar shows '+kind+' covering the full scheduled day ('+duration(calendarDay.creditMinutes)+').';}
        const scenario=options.scenario||head?.value.scenario||'usual';
        const generated=Ops.generateDay({id:profileRow.id,value:profile},{date,dayType,scenario,note:head?.value.note||''},head,domain);
        const day={date,dayType,scenario,previousVersionId:head?.id||null,changes:[],unscheduled:[],notices:[],assumptions:[],value:null,unchanged:false,spareMinutes:null,unresolved:[],analysis:null};
        days.push(day);dayByDate.set(date,day);
        if(typeReason)day.notices.push(typeReason+' Change the day type if that is wrong.');
        day.notices.push(...calendarDay.notices);
        if(!sameCalendarZone)day.notices.push('Work calendar dates use '+calendar.timeZone+' while this plan uses '+zone+'. Time off is not applied automatically across time zones. Review the day timing; recorded sickness still limits new activities until reviewed.');
        if(chosenType&&inferredType&&chosenType!==inferredType)day.notices.push('Work calendar suggests '+(inferredType==='leave'?'a full day of time off':'sickness')+', but your '+(dayTypeOverrides[date]?'explicit choice':'saved day type')+' is retained. Review this day if its work timing should change.');
        if(calendarDay.scheduledMinutes!==null&&((calendarDay.scheduledMinutes>0)!==profile.workDays.includes(new Date(date+'T12:00:00Z').getUTCDay()||7)))day.notices.push('Work contract days and planning attendance days differ here. The selected planning profile is retained; review both settings instead of assuming extra free time.');
        if(!generated.ok){day.notices.push(generated.error);day.value=head?clone(head.value):null;day.unchanged=true;continue;}
        const value=generated.value;for(const n of generated.notices)if(!/routine occurrence|no longer matches|not paused automatically/.test(n))day.notices.push(n);
        const bounds=Ops.dayBounds(date,zone);check(bounds.ok,'/horizon',bounds.error);const dayStart=bounds.start,dayEnd=bounds.end,dayMinutes=Math.round((dayEnd-dayStart)/60000);
        const toMin=at=>Math.round((Date.parse(at)-dayStart)/60000);
        const civil=(time,onDate=date)=>{for(let extra=0;extra<=180;extra++){const m=(Number(time.slice(0,2))*60+Number(time.slice(3))+extra)%1440,t=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');const r=Ops.resolve(onDate,t,zone);if(r.ok)return toMin(r.endpoint.at);if(r.choices?.length)return toMin(r.choices[0].at);}return null;};
        const label=m=>{const e=Ops.endpointAt(dayStart+Math.max(0,Math.min(dayMinutes,m))*60000,zone);return e.ok?e.endpoint.time:'?';};
        const endpoints=(a,b)=>({start:Ops.endpointAt(dayStart+a*60000,zone).endpoint,end:Ops.endpointAt(dayStart+b*60000,zone).endpoint});
        const events=new Map();for(const e of domain.events)if(e.dayRootId===date)events.set(e.slotId,e);
        const isToday=date===today,nowMinute=isToday?Math.ceil((nowMs-dayStart)/60000):0,occupied=[];
        // Waking ranges come from the generated sleep anchors, minus the wind-down before each sleep start.
        const sleeps=value.slots.filter(s=>!s.cancelled&&s.origin==='baseline'&&s.category==='sleep').map(s=>[Math.max(0,toMin(s.start.at)),Math.min(dayMinutes,toMin(s.end.at))]).filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0]);
        let waking=gaps(sleeps,0,dayMinutes).map(([a,b])=>[a,sleeps.some(([sa])=>sa===b)?Math.max(a,b-policy.windDownMinutes):b]).filter(([a,b])=>b>a);
        if(!sleeps.length){waking=[[0,dayMinutes]];day.assumptions.push('Sleep window unknown; the whole day is treated as available. Set bedtime and wake time to protect sleep.');}
        const neighbour=proposedValues.get(addDays(date,-1))||heads.get(addDays(date,-1))?.value||null;
        if(neighbour)for(const s of neighbour.slots)if(!s.cancelled){const a=toMin(s.start.at),b=toMin(s.end.at);if(b>0&&a<dayMinutes)occupy(occupied,Math.max(0,a),Math.min(b,dayMinutes));}
        if(isToday&&running&&Number.isFinite(running.startAt)&&running.startAt<=nowMs){const from=Math.max(0,toMin(new Date(running.startAt).toISOString()));occupy(occupied,from,Math.max(nowMinute,from));const startedText=typeof running.start==='string'?(running.start.slice(0,10)===date?running.start.slice(11,16):running.start.replace('T',' ')):label(from);day.notices.push('Your work clock has been running since '+startedText+'. The rest of today is planned from now, and the finish time is not guessed.');}
        const headIds=new Set(head?head.value.slots.map(s=>s.id):[]),movable=[],bufferOf=new Map();
        for(const s of value.slots){if(!s.cancelled&&s.category==='buffer'&&/_(before|after)$/.test(s.id)){const main=s.id.replace(/_(before|after)$/,'');if(value.slots.some(x=>x.id===main&&!x.cancelled))bufferOf.set(s.id,main);}}
        for(const s of value.slots){
          if(s.cancelled)continue;const a=toMin(s.start.at),b=toMin(s.end.at),event=events.get(s.id),state=Ops.checkoffState(s,event);
          const fresh=!headIds.has(s.id)&&s.origin!=='baseline',past=isToday&&Date.parse(s.start.at)<=nowMs&&!fresh,pinned=s.origin==='baseline'||s.fixed||!!state;
          if(fresh&&s.fixed&&isToday&&Date.parse(s.start.at)<nowMs){day.unscheduled.push({id:s.id,title:s.title,reason:'Its fixed time has already passed. No earlier activity is invented.',alternatives:['Review this occurrence manually','Keep the next occurrence']});continue;}
          if(bufferOf.has(s.id))continue;
          if(pinned||past){occupy(occupied,Math.max(0,a),Math.min(dayMinutes,b));if(past&&s.origin!=='baseline'&&!state)day.unresolved.push({slotId:s.id,title:s.title,time:s.start.time,reason:'Planned at '+s.start.time+' with no check-off yet. Mark it done, skipped, or link a record.'});if(s.origin!=='baseline')day.changes.push({kind:'keep',slotId:s.id,title:s.title,reason:state?'Already '+(state==='skipped'?'skipped':'checked off')+'.':s.fixed?'Pinned timing.':'Already started or passed.'});}
          else movable.push(s);
        }
        const missedFixed=new Set(day.unscheduled.filter(x=>!headIds.has(x.id)).map(x=>x.id));value.slots=value.slots.filter(s=>!missedFixed.has(s.id));
        for(const [id,main] of bufferOf){const s=value.slots.find(x=>x.id===id),m=value.slots.find(x=>x.id===main);if(s&&m&&!movable.includes(m))occupy(occupied,Math.max(0,toMin(s.start.at)),Math.min(dayMinutes,toMin(s.end.at)));}
        const held=new Map();for(const s of movable){const a=Math.max(0,toMin(s.start.at)),b=Math.min(dayMinutes,toMin(s.end.at));if(b>a){held.set(s.id,[a,b]);occupy(occupied,a,b);}for(const [bid,mid] of bufferOf)if(mid===s.id){const bs=value.slots.find(x=>x.id===bid);const ba=Math.max(0,toMin(bs.start.at)),bb=Math.min(dayMinutes,toMin(bs.end.at));if(bb>ba){held.set(bid,[ba,bb]);occupy(occupied,ba,bb);}}}
        const release=c=>{for(const id of [c.id,c.id+'_before',c.id+'_after']){const h=held.get(id);if(!h)continue;const i=occupied.findIndex(([a,b])=>a===h[0]&&b===h[1]);if(i>=0)occupied.splice(i,1);held.delete(id);}};
        const processed=new Set();
        const candidates=[];
        for(const s of movable){
          const version=s.anchor?.routineVersionId?domain.routines.find(r=>r.id===s.anchor.routineVersionId):null;const mealPlan=s.id.startsWith('plan_meal_')?(food.plans||[]).find(p=>object(p)&&'plan_meal_'+p.id===s.id):null;
          const trainingBlock=s.category==='training'&&value.slots.some(x=>bufferOf.get(x.id)===s.id);
          const before=trainingBlock?value.slots.filter(x=>x.id===s.id+'_before'&&!x.cancelled).reduce((n,x)=>n+toMin(x.end.at)-toMin(x.start.at),0):0,after=trainingBlock?value.slots.filter(x=>x.id===s.id+'_after'&&!x.cancelled).reduce((n,x)=>n+toMin(x.end.at)-toMin(x.start.at),0):0;
          candidates.push({slot:s,id:s.id,title:s.title,category:s.category,minutes:toMin(s.end.at)-toMin(s.start.at),before,after,window:s.window?[civil(s.window.start),civil(s.window.end)]:null,preferred:mealPlan&&isTime(mealPlan.time)?civil(mealPlan.time):null,current:[toMin(s.start.at),toMin(s.end.at)],alternatives:version?version.value.alternatives:[],priority:s.category==='meal'?1:s.category==='training'?2:s.origin==='routine'?3:5,existing:true,fresh:!headIds.has(s.id),deferrable:s.origin==='manual'&&!s.anchor?.routineRootId&&!['training','buffer','meal','sleep','work','commute'].includes(s.category)&&!s.id.startsWith('plan_training_')&&!s.id.startsWith('plan_meal_'),link:s.link,originDate:date,anchorDate:s.anchor?.date||date});
        }
        const hasTraining=value.slots.some(s=>!s.cancelled&&s.category==='training'),trainedToday=(training.history||[]).some(x=>object(x)&&x.date===date);
        const scheduled=object(training.schedule)?training.schedule[date]:null,routine=scheduled&&(training.routines||[]).find(r=>object(r)&&r.id===scheduled);
        if(routine&&!activeIds.has('plan_training_'+date)&&!value.slots.some(s=>s.id==='plan_training_'+date)){
          if(trainedToday)day.notices.push('A workout is already recorded on this date; the scheduled '+routine.name+' is not added again.');
          else if(hasTraining){const other=value.slots.find(s=>!s.cancelled&&s.category==='training');day.unscheduled.push({id:'plan_training_'+date,title:routine.name,reason:'Training is already planned today ('+other.title+'). A second session is not stacked automatically; keep recovery.',alternatives:['Keep '+other.title+' only','Move '+routine.name+' to a rest day in the Training programme']});}
          else if(['travel','sick'].includes(dayType)||recoveryGuard)day.unscheduled.push({id:'plan_training_'+date,title:routine.name,reason:dayType==='travel'?'Work-travel day: ordinary training is not scheduled. The missed session is not stacked onto another day.':'Sickness is recorded: training is not scheduled automatically. Recovery comes first.',alternatives:['Rest','Review the Training programme when you are back']});
          else candidates.push({slot:null,id:'plan_training_'+date,title:routine.name,category:'training',minutes:policy.trainingMinutes,before:policy.trainingTravelMinutes+policy.changingMinutes,after:policy.changingMinutes+policy.trainingTravelMinutes,window:null,preferred:null,current:null,alternatives:[],priority:2,existing:false,deferrable:false,link:{route:'train',label:'Train'},source:'Training schedule'});
        }
        for(const plan of (food.plans||[]).filter(p=>object(p)&&p.date===date&&!loggedPlans.has(p.id))){const id='plan_meal_'+plan.id;if(activeIds.has(id)||value.slots.some(s=>s.id===id))continue;const recipe=(food.recipes||[]).find(r=>object(r)&&r.id===plan.mealId);const t=isTime(plan.time)?civil(plan.time):null;candidates.push({slot:null,id,title:'Meal: '+(recipe?recipe.name:'planned meal'),category:'meal',minutes:policy.mealMinutes,before:0,after:0,window:null,preferred:t,current:null,alternatives:[],priority:1,existing:false,deferrable:false,link:{route:'food',label:'Food'},source:'Planned meal'});}
        for(const action of (goals.actions||[]).filter(a=>object(a)&&(a.date===date||(isToday&&a.date<today))&&!actionDone(a.id))){const id='plan_action_'+action.id;if(activeIds.has(id)||value.slots.some(s=>s.id===id))continue;candidates.push({slot:null,id,title:action.title,category:'goal',minutes:Number.isInteger(action.minutes)&&action.minutes>0?action.minutes:policy.goalActionMinutes,before:0,after:0,window:null,preferred:null,current:null,alternatives:[],priority:4,existing:false,deferrable:true,optional:true,link:{route:'goals',label:'Goals'},source:action.date<date?'Open action since '+action.date:'Planned action'});}
        for(const item of queue.filter(q=>!q.spending&&((q.status==='due'&&(q.leadDate===date||(q.leadDate<dates[0]&&date===dates[0])))||(q.status==='overdue'&&date===dates[0]))))candidates.push({slot:null,id:item.id,title:item.title,category:'admin',minutes:policy.prepMinutes,before:0,after:0,window:null,preferred:null,current:null,alternatives:[],priority:4,existing:false,deferrable:true,optional:true,link:{route:'people',label:'People'},source:item.reason});
        for(const item of carried.splice(0))candidates.push({...item,current:null,source:item.source||'Deferred'});
        candidates.sort((a,b)=>a.priority-b.priority||(a.preferred??a.window?.[0]??a.current?.[0]??waking[0]?.[0]??0)-(b.preferred??b.window?.[0]??b.current?.[0]??waking[0]?.[0]??0)||a.id.localeCompare(b.id));
        const low=isToday?nowMinute:0,freeMinutes=()=>waking.reduce((n,[a,b])=>n+gaps(occupied,Math.max(a,low),b).reduce((m,[c,d])=>m+(d-c),0),0);
        const defer=(c,why)=>{const nextDate=addDays(date,1);if(nextDate>horizon.to)return false;carried.push({...c,slot:c.slot,source:'Deferred from '+date+': '+why,deferredFrom:c.slot?(c.deferredFrom||date):undefined});day.changes.push({kind:'defer',slotId:c.id,title:c.title,reason:why+' Proposed for '+nextDate+'.'});return true;};
        const leave=(c,why,alternatives)=>{day.unscheduled.push({id:c.id,title:c.title,reason:why,alternatives});if(c.fresh&&c.originDate===date){value.slots=value.slots.filter(s=>s.id!==c.id&&s.id!==c.id+'_before'&&s.id!==c.id+'_after');}else if(c.slot&&c.originDate===date){occupy(occupied,c.current[0],c.current[1]);day.changes.push({kind:'unplaced',slotId:c.id,title:c.title,reason:why+' It stays where it was so you can decide.'});}else if(c.slot){const origin=dayByDate.get(c.originDate);const ch=origin?.changes.find(x=>x.slotId===c.id&&x.kind==='defer');if(ch){ch.kind='unplaced';ch.reason=why+' It stays where it was so you can decide.';}}};
        const rangesFor=c=>(c.window?waking.map(([a,b])=>[Math.max(a,c.window[0]),Math.min(b,c.window[1])]):waking.map(([a,b])=>[a,c.category==='meal'?Math.max(b,Math.min(dayMinutes,b+policy.windDownMinutes)):b])).map(([a,b])=>[Math.max(a,low),b]).filter(([a,b])=>b>a);
        const fitsIn=(c,occ)=>{const total=(c.before||0)+c.minutes+(c.after||0);return rangesFor(c).some(([ra,rb])=>gaps(occ,ra,rb).some(([a,b])=>b-a>=total));};
        for(const c of candidates){
          processed.add(c.id);if(c.slot&&c.originDate===date)release(c);
          const rested=dayType==='sick'||dayType==='travel'||recoveryGuard,routineRule=c.slot?.anchor?.routineVersionId?domain.routines.find(r=>r.id===c.slot.anchor.routineVersionId)?.value:null;
          const allowedRest=c.category==='meal'||(c.existing&&c.slot?.origin==='routine'&&c.originDate===date&&(!recoveryGuard||(c.category!=='training'&&routineRule?.dayTypes.includes('sick'))));
          if(rested&&!allowedRest){const why=dayType==='sick'?'Sick day: only meals, pinned commitments and routines you allow on sick days are planned.':recoveryGuard?'Sickness is recorded: optional activities and training wait for review; meals and explicitly allowed recovery routines are retained.':'Work-travel day: itinerary and essentials only. Train time is not treated as free time for goals.';if(c.deferrable&&defer(c,why))continue;leave(c,why,dayType==='sick'||recoveryGuard?['Rest today','Replan when you feel better']:['Add it to a day after the trip']);continue;}
          const before=c.before||0,after=c.after||0,need=before+c.minutes+after;
          const ranges=(c.window?waking.map(([a,b])=>[Math.max(a,c.window[0]),Math.min(b,c.window[1])]):waking.map(([a,b])=>[a,c.category==='meal'?Math.max(b,Math.min(dayMinutes,b+policy.windDownMinutes)):b])).map(([a,b])=>[Math.max(a,low),b]).filter(([a,b])=>b>a);
          const tryPlace=mins=>{const total=before+mins+after;
            if(c.current&&c.originDate===date){const blockStart=c.current[0]-before;if(blockStart>=low&&ranges.some(([a,b])=>blockStart>=a&&blockStart+total<=b)&&gaps(occupied,blockStart,blockStart+total).some(([a,b])=>a===blockStart&&b===blockStart+total))return {start:blockStart,kept:true};}
            const search=occ=>{let best=null;for(const [ra,rb] of ranges)for(const [a,b] of gaps(occ,ra,rb)){if(b-a<total)continue;const start=c.preferred!==null&&c.preferred!==undefined?Math.max(a,Math.min(c.preferred,b-total)):a;const score=c.preferred!==null&&c.preferred!==undefined?Math.abs(start-c.preferred):start;if(!best||score<best.score)best={start,kept:false,score};if(c.preferred===null||c.preferred===undefined)break;}return best;};
            // The earliest feasible option wins. A higher-priority item may displace a lower-priority existing activity only when that activity can still be re-placed.
            let best=search(occupied),displace=null;
            for(const e of candidates){if(e===c||processed.has(e.id)||!e.slot||e.originDate!==date||e.priority<=c.priority||!held.has(e.id))continue;const hs=[held.get(e.id),held.get(e.id+'_before'),held.get(e.id+'_after')].filter(Boolean);const occ2=occupied.filter(x=>!hs.some(y=>y[0]===x[0]&&y[1]===x[1]));const hit2=search(occ2);if(!hit2||(best&&hit2.score>=best.score))continue;const occ3=[...occ2,[hit2.start,hit2.start+total]].sort((x,y)=>x[0]-y[0]||x[1]-y[1]);if(!fitsIn(e,occ3))continue;best=hit2;displace=e;}
            if(displace)release(displace);return best;};
          const guard=()=>c.optional&&(freeMinutes()-need)<policy.spareMinutes;
          let hit=guard()?null:tryPlace(c.minutes),minutes=c.minutes,title=c.title,shortened=null;
          if(!hit&&!guard())for(const alt of [...c.alternatives].sort((x,y)=>x.durationMinutes-y.durationMinutes)){const h=tryPlace(alt.durationMinutes);if(h){hit=h;minutes=alt.durationMinutes;title=alt.title;shortened=alt;break;}}
          if(!hit){
            const span=ranges.length?label(ranges[0][0])+' and '+label(ranges[ranges.length-1][1]):'the waking day';
            const why=guard()?'Kept '+policy.spareMinutes+' minutes of deliberate free space today.':'No free '+duration(need)+' between '+span+(isToday&&nowMinute>0?' after now':'')+'.';
            const alternatives=[];if(c.alternatives.length)alternatives.push('Shorter versions also do not fit today');if(c.category==='training'&&!c.existing)alternatives.push('Review and choose a suitable shorter routine in Training; home equipment alone does not define a workout','Rest today and keep the next scheduled session');if(c.slot?.origin==='routine')alternatives.push('Skip this occurrence; the next one follows its routine');
            if(c.deferrable&&defer(c,why)){continue;}
            if(c.deferrable)alternatives.push('Next week, or drop it deliberately');
            leave(c,why,alternatives);continue;
          }
          const start=hit.start,mainStart=start+before,mainEnd=mainStart+minutes,endAll=mainEnd+after;
          occupy(occupied,start,endAll);
          const here=c.slot&&c.originDate===date?value.slots.find(x=>x.id===c.id):null;
          if(c.slot&&!here){
            const e=endpoints(mainStart,mainEnd),arrived={...clone(c.slot),start:e.start,end:e.end,cancelled:false,anchor:{date:c.anchorDate,routineRootId:null,routineVersionId:null}};if(shortened)arrived.title=title;delete arrived.window;value.slots.push(arrived);
            day.changes.push({kind:'add',slotId:arrived.id,title:arrived.title,reason:(c.source||'Deferred')+' Placed at '+label(mainStart)+'.'});
            const originValue=proposedValues.get(c.originDate),originDay=dayByDate.get(c.originDate),originSlot=originValue?.slots.find(x=>x.id===c.id);
            if(originSlot){originSlot.cancelled=true;if(!originSlot.anchor)originSlot.anchor={date:c.anchorDate,routineRootId:null,routineVersionId:null};}
            const ch=originDay?.changes.find(x=>x.slotId===c.id&&x.kind==='defer');if(ch)ch.reason=ch.reason.replace(/Proposed for \S+\.$/,'Moved to '+date+'.');
          }else if(c.slot){
            const s=here,e=endpoints(mainStart,mainEnd);if(shortened)s.title=title;s.start=e.start;s.end=e.end;
            if(c.before||c.after){for(const [bid,mid] of bufferOf)if(mid===s.id){const bs=value.slots.find(x=>x.id===bid);const isBefore=/_before$/.test(bid);const bp=isBefore?endpoints(start,mainStart):endpoints(mainEnd,endAll);bs.start=bp.start;bs.end=bp.end;}}
            if(shortened)day.changes.push({kind:'shorten',slotId:s.id,title:s.title,reason:'Only '+duration(minutes)+' fits; using the approved alternative "'+shortened.title+'".'});
            else if(!hit.kept)day.changes.push({kind:'move',slotId:s.id,title:s.title,from:label(c.current[0])+' to '+label(c.current[1]),to:label(mainStart)+' to '+label(mainEnd),reason:(isToday&&c.current[0]<low?'Its planned time has passed; the next free space is '+label(mainStart)+'.':'Its planned time overlaps another commitment or lies outside its window; the next free space is '+label(mainStart)+'.')});
            else if(c.fresh)day.changes.push({kind:'add',slotId:s.id,title:s.title,reason:(s.origin==='routine'?'Routine occurrence':'New activity')+(s.window?' inside its window '+s.window.start+' to '+s.window.end:'')+', placed at '+label(mainStart)+'.'});
            else day.changes.push({kind:'keep',slotId:s.id,title:s.title,reason:'Fits as planned.'});
          }else{
            const e=endpoints(mainStart,mainEnd),slot={id:c.id,title,category:c.category,start:e.start,end:e.end,fixed:false,origin:'manual',cancelled:false,link:c.link||null};
            if(c.deferredFrom)slot.anchor={date:c.deferredFrom,routineRootId:null,routineVersionId:null};
            value.slots.push(slot);day.changes.push({kind:'add',slotId:slot.id,title,reason:(c.source||'Proposed')+'. Placed at '+label(mainStart)+(c.preferred!==null&&c.preferred!==undefined?', the free space nearest your planned time':', the first free space')+'.'});
            if(before){const b=endpoints(start,mainStart);value.slots.push({id:c.id+'_before',title:'Travel and changing',category:'buffer',start:b.start,end:b.end,fixed:false,origin:'manual',cancelled:false,link:null});}
            if(after){const a=endpoints(mainEnd,endAll);value.slots.push({id:c.id+'_after',title:'Changing and travel back',category:'buffer',start:a.start,end:a.end,fixed:false,origin:'manual',cancelled:false,link:null});}
          }
        }
        const free=freeMinutes();day.spareMinutes=free;
        if(free<policy.spareMinutes)day.notices.push('Only '+duration(Math.max(0,free))+' of free space remains today. The plan does not shorten sleep to make room.');
        day.value=value;proposedValues.set(date,value);
      }
      for(const item of carried)days[days.length-1]?.unscheduled.push({id:item.id,title:item.title,reason:'No room before the end of this plan. '+(item.source||''),alternatives:['Plan the following week','Drop it deliberately']});
      for(const item of carried)if(item.slot){const origin=dayByDate.get(item.originDate);const ch=origin?.changes.find(x=>x.slotId===item.id&&x.kind==='defer');if(ch){ch.kind='unplaced';ch.reason=ch.reason.replace(/ Proposed for \S+\.$/,'')+' It stays where it was so you can decide.';}}
      for(const day of days){
        if(!day.value)continue;const head=heads.get(day.date);
        const analysis=Ops.analyseDay(day.value,[proposedValues.get(addDays(day.date,-1))||heads.get(addDays(day.date,-1))?.value,proposedValues.get(addDays(day.date,1))||heads.get(addDays(day.date,1))?.value].filter(Boolean));
        day.analysis={occupiedMinutes:analysis.occupiedMinutes,freeMinutes:analysis.freeMinutes,conflicts:analysis.conflicts,dayMinutes:analysis.dayMinutes};
        if(analysis.error)day.notices.push(analysis.error);
        if(analysis.conflicts.length)day.notices.push(analysis.conflicts.length+' overlap'+(analysis.conflicts.length===1?'':'s')+' remain: '+analysis.conflicts.map(k=>k.message).join(' ')+' They are kept and shown, not hidden.');
        day.unchanged=!!head&&stable(sortedSlots(head.value))===stable(sortedSlots(day.value));
        if(day.unchanged)day.value=clone(head.value);
      }
      const scenarios=compareScenarios(Ops,profileRow,days);
      const summary={days:days.length,changed:days.filter(d=>!d.unchanged).length,added:0,moved:0,shortened:0,deferred:0,unscheduled:0,unresolved:0,conflicts:0};
      for(const d of days){for(const c of d.changes){if(c.kind==='add')summary.added++;if(c.kind==='move')summary.moved++;if(c.kind==='shorten')summary.shortened++;if(c.kind==='defer')summary.deferred++;}summary.unscheduled+=d.unscheduled.length;summary.unresolved+=d.unresolved.length;summary.conflicts+=d.analysis?.conflicts.length||0;}
      const digestInput={policyVersion:VERSION,now,horizon,revision,options,policy,heads:dates.map(d=>heads.get(d)?.id||null),routines:domain.routines.map(r=>r.id),events:domain.events.length};
      const digest=fnv(stable(digestInput));
      return {ok:true,proposal:{policyVersion:VERSION,digest,id:'plan_'+digest,inputsDigest:inputsDigest(workspace),now,today,horizon,revision,policy,assumptions,days,queue,scenarios,summary}};
    }catch(error){return {ok:false,error:error.message||String(error),path:error.path||''};}
  }
  // Everything a proposal reads, as a deterministic digest. Draft saves and other bookkeeping leave it unchanged.
  function inputsDigest(workspace){
    const d=object(workspace)&&object(workspace.domains)?workspace.domains:{},planner=object(d.planner)?d.planner:{},headIds=rows=>{const m=new Map();for(const r of rows||[])if(object(r))m.set(r.rootId,r.id);return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));};
    const n=v=>v===undefined?null:v;
    const parts={profile:headIds(planner.profiles),routines:headIds(planner.routines),days:headIds(planner.days),events:(planner.events||[]).filter(object).map(e=>e.id),
      training:{history:(d.training?.history||[]).filter(object).map(s=>[s.id,n(s.date)]),schedule:object(d.training?.schedule)?Object.entries(d.training.schedule).sort():[],active:n(d.training?.state?.active?.id),routines:(d.training?.routines||[]).filter(object).map(r=>[r.id,n(r.name)])},
      food:{plans:(d.food?.plans||[]).filter(object).map(p=>[p.id,n(p.date),n(p.time),n(p.mealId)]),logs:(d.food?.revisions||[]).filter(object).map(r=>[r.id,n(r.planId)]),recipes:(d.food?.recipes||[]).filter(object).map(r=>[r.id,n(r.name)])},
      goals:{actions:(d.goals?.actions||[]).filter(object).map(a=>[a.id,n(a.date),n(a.minutes),n(a.title)]),events:(d.goals?.completionEvents||[]).filter(object).map(e=>[e.id,n(e.actionId),n(e.type)])},
      people:{people:(d.people?.people||[]).filter(object).map(p=>[p.id,n(p.name),n(p.birthday),n(p.leapDay),!!p.archived]),gifts:(d.people?.gifts||[]).filter(object).map(g=>[g.id,n(g.personId),n(g.status),n(g.date)]),plans:(d.people?.plans||[]).filter(object).map(p=>[p.id,n(p.personId),n(p.date),n(p.status),n(p.title)])},
      work:{calendar:global.LifeOSWorkCalendar?global.LifeOSWorkCalendar.decisionInputs(d.work):{policy:'unavailable'},running:object(d.work?.running)?[n(d.work.running.id),n(d.work.running.startAt)]:null}};
    return fnv(stable(parts));
  }
  function buildQueue(people,today,horizon,policy,activeIds){
    const out=[],limit=addDays(today,policy.queueDays);
    const status=lead=>lead<today?'overdue':lead<=horizon.to?'due':'beyond-horizon';
    for(const person of (people.people||[]).filter(p=>object(p)&&!p.archived&&typeof p.birthday==='string'&&/^\d{2}-\d{2}$/.test(p.birthday))){
      const date=nextBirthday(person,today);if(date>limit)continue;
      const gifts=(people.gifts||[]).filter(g=>object(g)&&g.personId===person.id&&(g.date===null||g.date===undefined||g.date===date));
      const hasIdea=gifts.some(g=>['idea','bought','given'].includes(g.status)),bought=gifts.some(g=>['bought','given'].includes(g.status));
      const steps=[{step:'choose',days:policy.birthdayLeadDays.choose,title:'Choose a gift for '+person.name,skip:hasIdea,spending:false},{step:'buy',days:policy.birthdayLeadDays.buy,title:'Buy the gift for '+person.name,skip:bought,spending:true},{step:'prepare',days:policy.birthdayLeadDays.prepare,title:'Card and wrapping for '+person.name,skip:false,spending:false}];
      for(const s of steps){if(s.skip)continue;const lead=addDays(date,-s.days),id='prep_birthday_'+person.id+'_'+date+'_'+s.step;const st=activeIds.has(id)?'placed':s.spending?'unresolved':status(lead);out.push({id,kind:'birthday',personId:person.id,title:s.title,eventTitle:person.name+"'s birthday",eventDate:date,leadDate:lead,status:st,spending:s.spending,reason:s.spending?'Spending needs a verified budget or reservation, which is not implemented yet. Decide this by hand.':st==='overdue'?'Lead time of '+s.days+' days has passed; do it as soon as there is room.':st==='placed'?'Already in your plan.':'Lead time of '+s.days+' days before '+date+'.'});}
    }
    for(const plan of (people.plans||[]).filter(p=>object(p)&&p.status==='planned'&&isDate(p.date)&&p.date>=today&&p.date<=limit)){const person=(people.people||[]).find(x=>object(x)&&x.id===plan.personId);const lead=addDays(plan.date,-policy.planLeadDays),id='prep_plan_'+plan.id;const st=activeIds.has(id)?'placed':status(lead);out.push({id,kind:'plan',personId:plan.personId,title:'Confirm: '+plan.title+(person?' with '+person.name:''),eventTitle:plan.title,eventDate:plan.date,leadDate:lead,status:st,spending:false,reason:st==='placed'?'Already in your plan.':'Confirm arrangements '+policy.planLeadDays+' days before '+plan.date+'.'});}
    out.sort((a,b)=>a.leadDate.localeCompare(b.leadDate)||a.id.localeCompare(b.id));
    return out;
  }
  function compareScenarios(Ops,profileRow,days){
    const p=profileRow.value,unknown=v=>v===null?'not set':v;
    const labels={usual:'Current reality: usual attendance '+unknown(p.usualStart)+' to '+unknown(p.usualEnd)+', commute '+unknown(p.commuteMinutesEachWay)+' min each way',intended:'Protected finish: intended hours '+unknown(p.intendedStart)+' to '+unknown(p.intendedEnd)+', commute '+unknown(p.commuteMinutesEachWay)+' min each way',future:'After the move: usual attendance with '+unknown(p.futureCommuteMinutesEachWay)+' min commute each way (not a confirmed move date)'};
    return SCENARIOS.map(scenario=>{let free=0,work=0,commute=0,workdays=0;const notes=[];
      for(const day of days){const r=Ops.generateDay({id:profileRow.id,value:p},{date:day.date,dayType:day.dayType,scenario,note:''});if(!r.ok){notes.push(day.date+': '+r.error);continue;}const a=Ops.analyseDay(r.value);free+=a.freeMinutes;for(const s of r.value.slots){const m=(Date.parse(s.end.at)-Date.parse(s.start.at))/60000;if(s.category==='work'){work+=m;workdays++;}if(s.category==='commute')commute+=m;}}
      if(scenario==='intended'&&(p.intendedStart===null||p.intendedEnd===null))notes.push('Intended hours are not set.');if(scenario==='future'&&p.futureCommuteMinutesEachWay===null)notes.push('Future commute is not set.');
      return {scenario,label:labels[scenario],freeMinutes:free,workMinutes:work,commuteMinutes:commute,workdays,notes,contractMinutes:p.contractMinutes,remark:p.contractMinutes!==null&&work>p.contractMinutes*(days.length/7)?'Planned attendance exceeds contract hours for this span; that is a planning fact, not payroll.':''};});
  }
  global.LifeConductor=Object.freeze({VERSION,DEFAULTS:Object.freeze(clone(DEFAULTS)),propose,buildQueue,inputsDigest});
})(window);
