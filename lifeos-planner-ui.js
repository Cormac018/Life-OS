/* The manual planner surface. Durable writes belong to PlannerOperations and the runtime. */
(function(global){
  'use strict';
  let api,selectedDate=null,preview=null,editor=null,review=null,busy=false;
  const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=prefix=>prefix+'_'+crypto.randomUUID(),ops=()=>global.PlannerOperations;
  const categories=[['sleep','Sleep'],['work','Work'],['commute','Commute'],['buffer','Transition'],['training','Training'],['meal','Meal'],['goal','Goal time'],['care','Personal care'],['admin','Life admin'],['rest','Rest'],['other','Something else']];
  const types=[['normal','Normal day'],['travel','Work travel'],['leave','Annual leave'],['sick','Sick day'],['rest','Rest day']];
  const scenarios=[['usual','Usual hours'],['intended','Intended hours'],['future','Future commute']];
  const routes=[['','No shortcut'],['train','Train'],['plan','Training programme'],['food','Food'],['sleep','Sleep'],['work','Work'],['goals','Goals'],['money','Money'],['people','People'],['life','Life planner'],['capture','Capture']];
  const colour={sleep:'#9d94ed',work:'#f0b28e',commute:'#e6cd96',buffer:'#a3acc7',training:'#b5a3ff',meal:'#8ddbc9',goal:'#8bcffa',care:'#f0aac6',admin:'#90b2e9',rest:'#8cc8d8',other:'#a9bad0'};
  const zone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(_){return 'UTC';}};
  const dateAdd=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const dateLabel=(date,options={weekday:'long',day:'numeric',month:'long'})=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{...options,timeZone:'UTC'});
  const duration=n=>{const value=Math.max(0,Math.round(n)),h=Math.floor(value/60),m=value%60;return h?(h+'h'+(m?' '+m+'m':'')):m+'m';};
  const nameOf=(options,value)=>options.find(x=>x[0]===value)?.[1]||value;
  const timeLabel=e=>e.time+(e.date!==selectedDate?' '+dateLabel(e.date,{day:'numeric',month:'short'}):'');
  const button=(action,label,attrs='',className='button ghost')=>'<button type="button" class="'+className+'" data-planner-action="'+action+'" '+attrs+'>'+label+'</button>';
  const field=(name,label,value,attrs='')=>'<label>'+label+'<input data-planner-field="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
  const select=(name,label,value,options)=>'<label>'+label+'<select data-planner-field="'+name+'">'+options.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
  const textArea=(name,label,value,limit=4000)=>'<label>'+label+'<textarea data-planner-field="'+name+'" maxlength="'+limit+'" rows="3">'+esc(value)+'</textarea></label>';
  function configure(value){api=value;}
  function context(){return api.context();}
  function domain(){return context().workspace.domains.planner;}
  function date(){if(!selectedDate)selectedDate=context().today;return selectedDate;}
  function profile(){return ops().currentProfile(domain());}
  function current(){return ops().currentDay(domain(),date());}
  function neighbours(dayDate){return [-2,-1,1,2].map(n=>ops().currentDay(domain(),dateAdd(dayDate,n))).filter(Boolean);}
  function emptyDay(dayDate){return {date:dayDate,timeZone:profile()?.value.timeZone||zone(),profileVersionId:profile()?.id||null,dayType:'normal',scenario:'usual',note:'',slots:[]};}
  function displayed(){
    const saved=current();
    if(preview?.date===date())return {value:preview.value,notices:preview.notices,saved,previousVersionId:preview.previousVersionId,preview:true};
    if(saved)return {value:saved.value,notices:[],saved,previousVersionId:saved.id,preview:false};
    const p=profile(),result=p?ops().generateDay(p,{date:date(),dayType:'normal',scenario:'usual',note:''}):null;
    return {value:result?.ok?result.value:emptyDay(date()),notices:result?.ok?result.notices:[result?.error||'Set your usual week to preview sleep, work and travel time. You can also add activities now.'],saved:null,previousVersionId:null,preview:true};
  }
  function statuses(dayDate){const out=new Map();domain().events.filter(e=>e.dayRootId===dayDate).forEach(e=>out.set(e.slotId,e));return out;}
  function analysis(day){return ops().analyseDay(day,neighbours(day.date));}
  function setDate(value){selectedDate=value;preview=null;api.render();}
  function openDate(value){if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value){selectedDate=value;preview=null;}api.navigate('planner');}
  function hasDraft(){return !!editor||!!review;}
  function slotIntervals(day,includeNeighbours=true){
    const start=ops().resolve(day.date,'00:00',day.timeZone),end=ops().resolve(dateAdd(day.date,1),'00:00',day.timeZone);
    if(!start.ok||!end.ok)return {minutes:1440,rows:[]};
    const a=Date.parse(start.endpoint.at),b=Date.parse(end.endpoint.at),rows=[];
    const sources=[{value:day},...(includeNeighbours?neighbours(day.date):[])];
    sources.forEach(source=>source.value.slots.filter(s=>!s.cancelled).forEach(slot=>{
      const from=Math.max(a,Date.parse(slot.start.at)),to=Math.min(b,Date.parse(slot.end.at));
      if(to>from)rows.push({slot,owner:source.value.date,start:(from-a)/60000,end:(to-a)/60000,spill:source.value.date!==day.date});
    }));
    rows.sort((x,y)=>x.start-y.start||x.end-y.end);return {minutes:(b-a)/60000,rows};
  }
  function ribbon(day,className='planner-ribbon'){
    const map=slotIntervals(day),lanes=[];
    return '<div class="'+className+'" role="img" aria-label="'+esc('Time allocation for '+dateLabel(day.date)+', '+duration(map.minutes)+' civil day')+'">'+map.rows.map(row=>{
      let lane=lanes.findIndex(end=>end<=row.start);if(lane<0)lane=lanes.length;lanes[lane]=row.end;
      return '<i style="left:'+((row.start/map.minutes)*100).toFixed(4)+'%;width:'+(((row.end-row.start)/map.minutes)*100).toFixed(4)+'%;--planner-colour:'+colour[row.slot.category]+';--planner-lane:'+Math.min(lane,3)+'" title="'+esc(row.slot.title+' · '+timeLabel(row.slot.start)+' to '+timeLabel(row.slot.end))+'"></i>';
    }).join('')+'</div>';
  }
  function mapLabels(day){
    const first=ops().resolve(day.date,'00:00',day.timeZone),last=ops().resolve(dateAdd(day.date,1),'00:00',day.timeZone);
    if(!first.ok||!last.ok)return '<div class="planner-map-labels"><span style="left:0">Start of day</span><span style="left:100%">End of day</span></div>';
    const a=Date.parse(first.endpoint.at),b=Date.parse(last.endpoint.at);
    return '<div class="planner-map-labels">'+['00:00','06:00','12:00','18:00','24:00'].map(time=>{const resolved=time==='24:00'?last:ops().resolve(day.date,time,day.timeZone);return resolved.ok?'<span style="left:'+((Date.parse(resolved.endpoint.at)-a)/(b-a)*100).toFixed(4)+'%">'+time+'</span>':'';}).join('')+'</div>';
  }
  function weekStrip(){
    const weekday=(new Date(date()+'T12:00:00Z').getUTCDay()+6)%7,monday=dateAdd(date(),-weekday);
    return '<div class="planner-week-control">'+button('previous-week','<span aria-hidden="true">‹</span><span class="sr">Previous week</span>','','icon-button')+'<span>'+esc(dateLabel(monday,{day:'numeric',month:'short'}))+' to '+esc(dateLabel(dateAdd(monday,6),{day:'numeric',month:'short'}))+'</span>'+button('next-week','<span aria-hidden="true">›</span><span class="sr">Next week</span>','','icon-button')+'</div><div class="planner-week">'+Array.from({length:7},(_,i)=>{
      const dayDate=dateAdd(monday,i),row=ops().currentDay(domain(),dayDate),selected=dayDate===date(),value=selected?displayed().value:row?.value;
      const done=domain().events.filter(e=>e.dayRootId===dayDate).reduce((map,e)=>map.set(e.slotId,e.status),new Map());
      return '<button type="button" data-planner-action="select-day" data-date="'+dayDate+'" aria-pressed="'+selected+'" aria-label="'+esc(dateLabel(dayDate)+(row?', saved plan':', no saved plan'))+'"><span>'+dateLabel(dayDate,{weekday:'short'})+'</span><strong>'+Number(dayDate.slice(8))+'</strong>'+(value?ribbon(value,'planner-week-ribbon'):'<div class="planner-week-ribbon"></div>')+'<small>'+(row?([...done.values()].filter(s=>s==='done').length?'✓ '+[...done.values()].filter(s=>s==='done').length:'Saved'):selected?'Preview':'Open')+'</small>'+(dayDate===context().today?'<i class="planner-today-dot" aria-hidden="true"></i>':'')+'</button>';
    }).join('')+'</div>';
  }
  function render(){
    date();const display=displayed(),day=display.value,a=analysis(day),p=profile(),s=statuses(day.date),map=slotIntervals(day),conflictIds=new Set(a.conflicts.flatMap(c=>c.slotIds)),active=day.slots.filter(x=>!x.cancelled),manual=active.filter(x=>x.origin==='manual'),done=manual.filter(x=>s.get(x.id)?.status==='done').length;
    const notices=[...new Set([...(display.notices||[]),...(a.notices||[])])];
    const supplied=api.actuals?api.actuals(day.date):[],actuals=supplied.filter(x=>x.kind!=='evidence'),evidence=supplied.filter(x=>x.kind==='evidence');
    const ratio=Math.max(0,Math.min(1,a.occupiedMinutes/(a.dayMinutes||map.minutes))),circumference=2*Math.PI*43;
    return '<section id="plannerView"><header class="planner-header"><div><div class="eyebrow">Your time, with intention</div><h1>Day planner<span>.</span></h1><p>Give the important things a place. Keep room for real life.</p></div>'+button('profile',p?'Edit my setup':'Set up my week','','button ghost')+'</header>'+
      (hasDraft()?'<div class="planner-draft"><span>Unfinished edit, kept only in this open app session.</span>'+button('resume','Resume edit','','text-button')+button('discard','Discard edit','','text-button')+'</div>':'')+
      weekStrip()+'<div class="planner-day-heading"><div><span class="planner-state '+(display.preview?'is-preview':'')+'">'+(display.preview?'Preview · not saved':'Saved plan')+'</span><h2>'+esc(dateLabel(day.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</h2></div><div class="planner-day-actions">'+button('jump','Choose date','','text-button')+(day.date!==context().today?button('today','Today','','text-button'):'')+'</div></div>'+
      '<div class="planner-hero"><div class="planner-orbit"><svg viewBox="0 0 112 112" aria-hidden="true"><circle class="planner-orbit-track" cx="56" cy="56" r="43"/><circle class="planner-orbit-value" cx="56" cy="56" r="43" stroke-dasharray="'+(circumference*ratio).toFixed(2)+' '+circumference.toFixed(2)+'"/></svg><div><strong>'+esc(duration(a.freeMinutes))+'</strong><span>unallocated</span></div></div><div class="planner-hero-copy"><div class="planner-day-tags"><span>'+esc(nameOf(types,day.dayType))+'</span><span>'+esc(nameOf(scenarios,day.scenario))+'</span></div><h3>'+(a.conflicts.length?'Some things overlap.':active.length?'Make this day yours.':'Start with the shape of your day.')+'</h3><p>'+esc(duration(a.occupiedMinutes))+' allocated · '+done+' of '+manual.length+' planner check-offs. '+(day.dayType==='travel'?'Add your itinerary. Normal work and commute anchors are paused.':day.dayType==='sick'?'Keep recovery and essential commitments visible.':'Unallocated time also needs to cover anything you have not added yet.')+'</p><div class="planner-hero-actions">'+button('day-options','Day type & hours','','button ghost')+(display.preview?button('save-preview','Review & save day','','button primary'):button('history','Plan history','','text-button'))+'</div></div></div>'+
      (day.note?'<p class="planner-day-note">'+esc(day.note)+'</p>':'')+
      (evidence.length?'<div class="planner-calendar-evidence"><strong>Work calendar context</strong>'+evidence.map(x=>'<p>'+esc(x.title)+' · '+esc(x.detail)+'</p>').join('')+'<small>Choose the appropriate day type above. A partial-day credit may need a manually adjusted work block. Calendar context is separate from time actually worked.</small></div>':'')+
      '<div class="planner-time-map"><div class="planner-map-heading"><span>One full day</span><span>'+esc(day.timeZone)+' · '+duration(map.minutes)+'</span></div>'+ribbon(day)+mapLabels(day)+'<div class="planner-legend"><span><i style="background:'+colour.sleep+'"></i>Sleep</span><span><i style="background:'+colour.work+'"></i>Work</span><span><i style="background:'+colour.training+'"></i>Your activities</span><span><i class="planner-open-key"></i>Unallocated</span></div></div>'+
      (a.conflicts.length?'<div class="planner-conflicts" role="status"><h3>'+a.conflicts.length+' overlap'+(a.conflicts.length===1?'':'s')+' to review</h3>'+a.conflicts.map(c=>'<p>'+esc(c.message)+'</p>').join('')+'<small>Both commitments remain in the plan. Move one, or keep the overlap deliberately. Sleep is never shortened automatically.</small></div>':'')+
      '<div class="planner-layout"><div><div class="planner-section-head"><h3>Your timeline</h3>'+button('add-slot','+ Add activity','','button primary')+'</div><p class="planner-help">Solid rail: fixed timing. Dotted rail: flexible. Tap any activity to adjust it.</p><div class="planner-agenda">'+(map.rows.length?map.rows.map(row=>{
        const slot=row.slot,status=(row.spill?statuses(row.owner):s).get(slot.id)?.status,done=status==='done',skipped=status==='skipped';
        return '<button type="button" class="planner-slot '+(slot.fixed?'is-fixed':'is-flexible')+(done?' is-done':'')+(skipped?' is-skipped':'')+(conflictIds.has(slot.id)?' has-conflict':'')+'" data-planner-action="'+(row.spill?'spill':'slot')+'" data-id="'+esc(slot.id)+'" data-date="'+esc(row.owner)+'" style="--planner-colour:'+colour[slot.category]+'"><span class="planner-slot-time">'+esc(slot.start.date===day.date?slot.start.time:'From '+slot.start.time)+'<small>'+esc(duration((Date.parse(slot.end.at)-Date.parse(slot.start.at))/60000))+'</small></span><span class="planner-slot-node" aria-hidden="true">'+(done?'✓':skipped?'·':'')+'</span><span class="planner-slot-copy"><strong>'+esc(slot.title)+'</strong><small>'+esc(nameOf(categories,slot.category))+' · '+(slot.fixed?'Fixed':'Flexible')+(row.spill?' · from '+esc(dateLabel(row.owner,{day:'numeric',month:'short'})):'')+(conflictIds.has(slot.id)?' · Overlap':'')+'</small>'+(done||skipped?'<em>'+ (done?'Checked off in planner':'Skipped in planner')+'</em>':'')+'</span><span class="planner-slot-arrow" aria-hidden="true">›</span></button>';
      }).join(''):'<div class="planner-empty"><span class="planner-empty-orbit" aria-hidden="true">+</span><h3>Space to build from.</h3><p>'+ (p?'Review the preview, or add the first activity.':'Start with your work and sleep preferences, or add an activity directly.')+'</p>'+button(p?'add-slot':'profile',p?'Add an activity':'Set up my week','','button ghost')+'</div>')+'</div>'+
      (day.slots.some(x=>x.cancelled)?'<details class="planner-cancelled"><summary>'+day.slots.filter(x=>x.cancelled).length+' cancelled activities retained</summary>'+day.slots.filter(x=>x.cancelled).map(x=>'<p>'+esc(x.title)+' · '+esc(x.start.time)+'</p>').join('')+'</details>':'')+'</div><aside class="planner-aside">'+
      '<section><div class="eyebrow">Plan and record</div><h3>What actually happened</h3><p class="planner-help">Existing records are shown separately. A planner check-off does not log a workout, meal, payment or shift.</p>'+ (actuals.length?actuals.map(x=>'<button class="planner-actual" type="button" data-planner-action="navigate" data-route="'+esc(x.route)+'"><span>'+esc(x.title)+'<small>'+esc(x.detail)+'</small></span><span aria-hidden="true">↗</span></button>').join(''):'<p class="planner-empty-copy">No linked-section records reported for this date yet.</p>')+'<div class="planner-quick-links">'+button('navigate','Log training','data-route="train"','text-button')+button('navigate','Log a meal','data-route="food"','text-button')+button('navigate','Log sleep','data-route="sleep"','text-button')+'</div></section>'+
      '<section><div class="eyebrow">Your foundations</div><h3>'+(p?'A week that fits you.':'Start with what you know.')+'</h3><p class="planner-help">'+(p?(p.value.equipment.length+' equipment entries · '+(p.value.unpaidBreakMinutes===null?'unpaid break unknown':p.value.unpaidBreakMinutes+' minute unpaid break')):'Unknown details can stay blank. Work attendance, contract hours and unpaid breaks stay separate.')+'</p>'+(p?.value.limitations?'<p class="planner-reported"><strong>Your reported limitations</strong>'+esc(p.value.limitations)+'</p>':'')+(p?.value.priorities?'<p class="planner-reported"><strong>Your priorities</strong>'+esc(p.value.priorities)+'</p>':'')+(p?'<p class="planner-help">Equipment and limitations are saved context for future coaching. They do not automatically change existing Training routines or progression.</p>':'')+button('profile','Work, sleep & equipment','','text-button')+'</section>'+
      (notices.length?'<section class="planner-notices"><h3>Before you rely on this plan</h3>'+notices.map(n=>'<p>'+esc(typeof n==='string'?n:n.message||JSON.stringify(n))+'</p>').join('')+'</section>':'')+
      '<p class="planner-footnote">Saved plans and revisions stay on this device and are included in encrypted backups. Unfinished planner forms are kept only in the current open app session. This stage is a manual planner. Automatic replanning and closed-app reminders are still to come.</p></aside></div></section>';
  }
  function show(title,html){api.dialog(title,'<div class="planner-dialog">'+html+'</div>');}
  function errorHtml(error){return '<p id="plannerError" class="planner-error" role="alert">'+esc(error||'')+'</p>';}
  function footer(label='Review changes'){return '<div class="dialog-footer">'+button('pause','Close for now','','button ghost')+'<button type="submit" class="button primary" '+(busy?'disabled':'')+'>'+label+'</button></div>';}
  function openProfile(){
    const p=profile();editor={kind:'profile',data:copy(p?.value||ops().emptyProfile(zone())),previousVersionId:p?.id||null};review=null;renderProfile();
  }
  function renderEquipment(row,index){
    return '<div class="planner-equipment-row" data-planner-equipment="'+esc(row.id)+'"><div class="planner-equipment-heading"><strong>Equipment '+(index+1)+'</strong>'+button('remove-equipment','Remove','data-id="'+esc(row.id)+'"','text-button')+'</div><div class="planner-form-grid">'+field('name','Name',row.name,'maxlength="160" required')+select('location','Location',row.location,[['home','Home'],['gym','Gym'],['other','Other']])+select('availability','Available',row.availability,[['current','Now'],['future','In future']])+field('minKg','Minimum load, kg',row.minKg,'type="number" min="0" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+field('maxKg','Maximum load, kg',row.maxKg,'type="number" min="0" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+field('stepKg','Load increment, kg',row.stepKg,'type="number" min="0.001" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+'</div>'+field('note','Details, availability or load convention',row.note,'maxlength="1000" placeholder="Optional"')+'</div>';
  }
  function renderProfile(error=''){
    const p=editor.data;
    show('The shape of your week.','<form id="plannerProfileForm"><p class="planner-intro">Set the constraints first. These are planning preferences, not records of hours worked or sleep already taken. Leave anything unknown blank.</p><details class="planner-form-section" open><summary><span>01</span> Work & time zone</summary>'+field('timeZone','Time zone',p.timeZone,'required maxlength="100" placeholder="Europe/London"')+'<fieldset class="planner-weekdays"><legend>Usual working days</legend>'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>'<label><input type="checkbox" data-planner-weekday="'+(i+1)+'" '+(p.workDays.includes(i+1)?'checked':'')+'><span>'+d+'</span></label>').join('')+'</fieldset><div class="planner-form-grid">'+field('intendedStart','Intended work start',p.intendedStart,'type="time"')+field('intendedEnd','Intended work finish',p.intendedEnd,'type="time"')+field('usualStart','Usual arrival',p.usualStart,'type="time"')+field('usualEnd','Usual departure',p.usualEnd,'type="time"')+field('contractHours','Contract hours per week',p.contractMinutes===null?null:p.contractMinutes/60,'type="number" min="0" max="168" step="any" inputmode="decimal" placeholder="Unknown"')+field('unpaidBreakMinutes','Unpaid break, minutes per day',p.unpaidBreakMinutes,'type="number" min="0" max="1440" step="1" inputmode="numeric" placeholder="Unknown"')+'</div><p class="planner-help">An end time before the start is an overnight shift. Contract hours do not change the time blocked out for attendance. Enter 0 only if there is no unpaid break.</p></details><details class="planner-form-section" open><summary><span>02</span> Protect sleep & transitions</summary><div class="planner-form-grid">'+field('sleepStart','Planned bedtime',p.sleepStart,'type="time"')+field('sleepEnd','Planned wake time',p.sleepEnd,'type="time"')+field('transitionMinutes','Transition buffer, minutes',p.transitionMinutes,'type="number" min="0" max="240" step="1" inputmode="numeric" required')+'</div><p class="planner-help">Choose times that leave enough recovery. Sleep stays visible even on busy or travel days. Buffers leave space either side of work and its commute.</p></details><details class="planner-form-section"><summary><span>03</span> Commute scenarios</summary><div class="planner-form-grid">'+field('commuteMinutesEachWay','Current commute, minutes each way',p.commuteMinutesEachWay,'type="number" min="0" max="720" step="1" inputmode="numeric" placeholder="Unknown"')+field('futureCommuteMinutesEachWay','Future commute, minutes each way',p.futureCommuteMinutesEachWay,'type="number" min="0" max="720" step="1" inputmode="numeric" placeholder="Unknown"')+'</div><p class="planner-help">Future commute is a scenario you select for a day. It does not assume a move date, train availability or usable time on the journey.</p></details><details class="planner-form-section" '+(p.equipment.length?'open':'')+'><summary><span>04</span> Equipment, now & later <small>'+p.equipment.length+'</small></summary><div id="plannerEquipment">'+p.equipment.map(renderEquipment).join('')+'</div>'+button('add-equipment','+ Add equipment','','button ghost')+'<p class="planner-help">Record available loads and increments only when known. Future equipment stays separate from what you can use now.</p></details><details class="planner-form-section"><summary><span>05</span> Priorities & limitations</summary>'+textArea('limitations','Pain, injuries or other limitations to respect',p.limitations)+textArea('priorities','What matters most in this season of life?',p.priorities)+'<p class="planner-help">These are your reports and preferences for future coaching. Saving them does not change your existing Training routines or progression. This planner does not diagnose conditions, prescribe training or approve new spending.</p></details>'+errorHtml(error)+footer('Review setup')+'</form>');
  }
  function readFields(form){const values={};form.querySelectorAll('[data-planner-field]').forEach(el=>{if(!el.closest('[data-planner-equipment]'))values[el.dataset.plannerField]=el.value;});return values;}
  function nullableNumber(value){return value===''||value===null||value===undefined?null:Number(value);}
  function syncProfile(){
    const form=$('plannerProfileForm');if(!form||editor?.kind!=='profile')return;
    const v=readFields(form),p=editor.data;
    ['timeZone','limitations','priorities'].forEach(k=>p[k]=v[k]);
    ['intendedStart','intendedEnd','usualStart','usualEnd','sleepStart','sleepEnd'].forEach(k=>p[k]=v[k]||null);
    ['unpaidBreakMinutes','commuteMinutesEachWay','futureCommuteMinutesEachWay','transitionMinutes'].forEach(k=>p[k]=nullableNumber(v[k]));
    p.contractMinutes=v.contractHours===''?null:Number(v.contractHours)*60;
    p.workDays=[...form.querySelectorAll('[data-planner-weekday]:checked')].map(el=>Number(el.dataset.plannerWeekday));
    form.querySelectorAll('[data-planner-equipment]').forEach(row=>{const item=p.equipment.find(x=>x.id===row.dataset.plannerEquipment);if(item)row.querySelectorAll('[data-planner-field]').forEach(el=>{const k=el.dataset.plannerField;item[k]=['minKg','maxKg','stepKg'].includes(k)?nullableNumber(el.value):el.value;});});
  }
  function openOptions(){const display=displayed();editor={kind:'options',data:{dayType:display.value.dayType,scenario:display.value.scenario,note:display.value.note},base:copy(display.value),previousVersionId:display.previousVersionId};review=null;renderOptions();}
  function renderOptions(error=''){
    const evidence=(api.actuals?api.actuals(editor.base.date):[]).filter(x=>x.kind==='evidence');
    show('What kind of day is this?','<form id="plannerOptionsForm"><p class="planner-intro">'+esc(dateLabel(editor.base.date))+'. Rebuild sleep, work and commute anchors from your current setup. Manual activities stay in place, so you can see what needs moving.</p>'+(evidence.length?'<div class="planner-explanation"><strong>From your Work calendar</strong>'+evidence.map(x=>'<p>'+esc(x.title)+' · '+esc(x.detail)+'</p>').join('')+'<p>Select the relevant day type explicitly. For partial leave, adjust the remaining work block manually. These credits do not represent time already worked.</p></div>':'')+'<div class="planner-form-grid">'+select('dayType','Day type',editor.data.dayType,types)+select('scenario','Planning scenario',editor.data.scenario,scenarios)+'</div>'+textArea('note','What should this day account for?',editor.data.note,2000)+'<div class="planner-explanation"><strong>Travel, leave, sickness and rest</strong><p>These day types pause the normal work and commute anchors. Sleep stays protected. Add travel itineraries or essential appointments manually. Work pay and leave records remain in Work.</p></div>'+errorHtml(error)+footer('Preview this day')+'</form>');
  }
  function openSlot(id){
    const display=displayed(),slot=display.value.slots.find(s=>s.id===id);if(!slot)return;
    const event=statuses(display.value.date).get(id),elapsed=(Date.parse(slot.end.at)-Date.parse(slot.start.at))/60000;
    editor=null;review=null;
    const checkoff=slot.origin==='manual'?'<hr><h4>Planner check-off</h4><p class="planner-help">This tracks whether you followed the plan. It does not add anything to your workout, meal, sleep, money or work history.</p><div class="planner-detail-actions">'+button('status','Done','data-id="'+esc(id)+'" data-status="done"','button primary')+button('status','Skipped','data-id="'+esc(id)+'" data-status="skipped"')+(event&&event.status!=='reset'?button('status','Reset check-off','data-id="'+esc(id)+'" data-status="reset"'):'')+'</div>'+(!display.saved||display.preview?'<p class="planner-help">Save the day before checking off an activity.</p>':''):'<hr><p class="planner-help">This is a planned anchor. Record actual sleep or work in its own section.</p>';
    show(slot.title,'<div class="planner-slot-detail"><span class="planner-state">'+(display.preview?'Preview · not saved':'Saved plan')+'</span><h3>'+esc(timeLabel(slot.start))+' to '+esc(timeLabel(slot.end))+'</h3><p>'+esc(duration(elapsed))+' · '+esc(nameOf(categories,slot.category))+' · '+(slot.fixed?'Fixed timing':'Flexible timing')+'</p>'+(event?'<p class="planner-reported"><strong>'+esc(nameOf([['done','Checked off in planner'],['skipped','Skipped in planner'],['reset','Check-off reset']],event.status))+'</strong>'+esc(event.note||'No note recorded.')+'</p>':'')+(slot.link?button('navigate','Open '+esc(slot.link.label)+' <span aria-hidden="true">↗</span>','data-route="'+esc(slot.link.route)+'"','button primary')+'<p class="planner-help">Section shortcut only. Record what you actually did in that section.</p>':'')+'<div class="planner-detail-actions">'+button('edit-slot','Move or edit','data-id="'+esc(id)+'"')+button('pin-slot',slot.fixed?'Make flexible':'Pin timing','data-id="'+esc(id)+'"')+button('cancel-slot','Cancel activity','data-id="'+esc(id)+'"')+'</div>'+checkoff+'</div>');
  }
  function startSlot(id){
    const display=displayed(),slot=id?display.value.slots.find(x=>x.id===id):null;
    if(slot&&statuses(display.value.date).get(slot.id)?.status==='done'){api.toast('Reset this planner check-off before changing its title or timing. The earlier check-off will stay in history.');return;}
    editor={kind:'slot',previousVersionId:display.previousVersionId,base:copy(display.value),slotId:slot?.id||uid('slot'),origin:slot?.origin||'manual',data:{title:slot?.title||'',category:slot?.category||'other',startDate:slot?.start.date||display.value.date,startTime:slot?.start.time||'',endDate:slot?.end.date||display.value.date,endTime:slot?.end.time||'',startOffset:slot?String(slot.start.offsetMinutes):'',endOffset:slot?String(slot.end.offsetMinutes):'',fixed:slot?.fixed||false,route:slot?.link?.route||''},choices:{}};review=null;renderSlot();
  }
  function offsetSelect(which){const choices=editor.choices[which];return choices?.length?select(which+'Offset','Repeated hour: choose '+which+' occurrence',editor.data[which+'Offset'],[['','Choose explicitly'],...choices.map(c=>[String(c.offsetMinutes),'UTC'+(c.offsetMinutes>=0?'+':'')+(c.offsetMinutes/60)+' · '+c.at.replace('T',' ').slice(0,16)+' UTC'])]):'';}
  function renderSlot(error=''){
    const d=editor.data;
    show(editor.base.slots.some(x=>x.id===editor.slotId)?'Adjust this activity.':'Make room for something.','<form id="plannerSlotForm">'+field('title','Activity',d.title,'required maxlength="200" placeholder="What would you like to make time for?"')+'<div class="planner-form-grid">'+select('category','Area of life',d.category,categories)+select('route','Optional section shortcut',d.route,routes)+field('startDate','Start date',d.startDate,'type="date" required')+field('startTime','Start time',d.startTime,'type="time" required')+field('endDate','End date',d.endDate,'type="date" required')+field('endTime','End time',d.endTime,'type="time" required')+offsetSelect('start')+offsetSelect('end')+'</div><label class="planner-checkbox"><input type="checkbox" data-planner-field="fixed" '+(d.fixed?'checked':'')+'><span>Pin this timing<small>A fixed commitment. Flexible activities can be moved when plans change.</small></span></label><p class="planner-help">'+esc(editor.base.timeZone)+'. For an overnight activity, choose the following date for its end. Overlaps remain visible for you to review. A shortcut opens a section; it does not identify a completed record.</p>'+errorHtml(error)+footer('Review activity')+'</form>');
  }
  function syncSlot(){const form=$('plannerSlotForm');if(!form||editor?.kind!=='slot')return;const v=readFields(form);Object.keys(v).forEach(k=>editor.data[k]=v[k]);editor.data.fixed=form.querySelector('[data-planner-field="fixed"]').checked;}
  function showStatus(id,status){
    const display=displayed();if(display.preview||!display.saved){api.toast('Review and save this day before checking off activities.');return;}
    const slot=display.value.slots.find(x=>x.id===id);if(!slot)return;if(slot.origin!=='manual'){api.toast('Baseline anchors show planned time. Log sleep or work in its own section.');return;}
    editor={kind:'status',data:{dayRootId:display.value.date,slotId:id,status,note:''},previousVersionId:display.saved.id,title:slot.title};review=null;
    show('A planner check-off.','<form id="plannerStatusForm"><p class="planner-intro">'+esc(slot.title)+' · '+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset check-off']],status))+'. Your actual activity records are unchanged.</p>'+textArea('note','How did it go? Any reason to adjust the plan?',editor.data.note,2000)+errorHtml()+footer('Review check-off')+'</form>');
  }
  function makeCommand(operation,entity,previousVersionId){return {contract:'lifeos-planner/1',operation,operationId:uid('plannerop'),versionId:uid(operation==='status'?'plannerevent':'plannerv'),recordedAt:new Date().toISOString(),expected:{workspaceRevision:context().revision,previousVersionId},entity:copy(entity)};}
  async function prepareReview(command,back){
    if(busy)return;busy=true;
    const wasOpen=$('dialog')?.open===true,formId=['plannerProfileForm','plannerSlotForm','plannerStatusForm'].find(id=>$(id)),formNode=formId?$(formId):null;
    try{
      const flushed=await api.flush();if(flushed?.ok===false)throw new Error(flushed.error||'Earlier changes could not be saved. Your planner edit is retained.');
      command.expected.workspaceRevision=context().revision;
      const prepared=ops().prepare(command,context());if(!prepared.ok)throw new Error(prepared.error||'This change could not be prepared.');
      review={prepared,command:copy(prepared.command||command),back,error:''};
      if(!wasOpen||($('dialog')?.open&&(!formId||$(formId)===formNode)))renderReview();
    }catch(error){setError(error.message);}
    finally{busy=false;setBusy(false);}
  }
  function reviewRows(day){return day.slots.filter(s=>!s.cancelled).sort((a,b)=>Date.parse(a.start.at)-Date.parse(b.start.at)||Date.parse(a.end.at)-Date.parse(b.end.at)).map(s=>'<div class="planner-review-row"><span>'+esc(s.title)+'<small>'+esc(nameOf(categories,s.category))+' · '+(s.fixed?'Fixed':'Flexible')+'</small></span><strong>'+esc(timeLabel(s.start))+'<small>to '+esc(timeLabel(s.end))+'</small></strong></div>').join('');}
  function profileReview(p){
    const unknown=x=>x===null?'Unknown':String(x);
    return '<div class="planner-review-row"><span>Time zone</span><strong>'+esc(p.timeZone)+'</strong></div><div class="planner-review-row"><span>Working days</span><strong>'+esc(p.workDays.map(d=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d-1]).join(', ')||'None selected')+'</strong></div><div class="planner-review-row"><span>Usual attendance<small>Intended planning hours: '+esc(unknown(p.intendedStart))+' to '+esc(unknown(p.intendedEnd))+'</small></span><strong>'+esc(unknown(p.usualStart))+' to '+esc(unknown(p.usualEnd))+'</strong></div><div class="planner-review-row"><span>Weekly contract<small>Unpaid break: '+esc(unknown(p.unpaidBreakMinutes))+' min/day</small></span><strong>'+(p.contractMinutes===null?'Unknown':esc(duration(p.contractMinutes)))+'</strong></div><div class="planner-review-row"><span>Sleep preference</span><strong>'+esc(unknown(p.sleepStart))+' to '+esc(unknown(p.sleepEnd))+'</strong></div><div class="planner-review-row"><span>Commute, each way<small>Future: '+esc(unknown(p.futureCommuteMinutesEachWay))+' min</small></span><strong>'+esc(unknown(p.commuteMinutesEachWay))+' min</strong></div><div class="planner-review-row"><span>Transition buffer</span><strong>'+esc(p.transitionMinutes)+' min</strong></div>'+p.equipment.map(e=>'<div class="planner-review-row"><span>'+esc(e.name)+'<small>'+esc(e.location)+' · '+esc(e.availability)+' · '+esc(e.note)+'</small></span><strong>'+esc(unknown(e.minKg))+' to '+esc(unknown(e.maxKg))+' kg<small>Increment: '+esc(unknown(e.stepKg))+' kg</small></strong></div>').join('')+(p.limitations?'<p class="planner-reported"><strong>Reported limitations</strong>'+esc(p.limitations)+'</p>':'')+(p.priorities?'<p class="planner-reported"><strong>Priorities</strong>'+esc(p.priorities)+'</p>':'');
  }
  function renderReview(error=review?.error||''){
    const r=review,p=r.prepared,e=r.command.entity,kind=r.command.operation,a=kind==='day'?analysis(e):null;
    show('Review before saving.','<div id="plannerReview"><span class="planner-state is-preview">Not saved yet</span><p class="planner-intro">'+(kind==='profile'?'This becomes your current setup. Every saved day keeps the setup and timing it already recorded.':kind==='day'?'This saves a new version of '+esc(dateLabel(e.date))+'. Previous versions stay in history.':'This records a planner check-off only. Actual logs in other sections are unchanged.')+'</p>'+(kind==='profile'?profileReview(e):kind==='day'?'<div class="planner-review-metrics"><strong>'+esc(duration(a.occupiedMinutes))+'<small>allocated</small></strong><strong>'+esc(duration(a.freeMinutes))+'<small>unallocated</small></strong></div>'+ribbon(e)+reviewRows(e):'<div class="planner-review-row"><span>'+esc(editor?.title||'Planner activity')+'</span><strong>'+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset']],e.status))+'</strong></div><p>'+esc(e.note||'No note')+'</p>')+(a?.conflicts.length?'<div class="planner-conflicts"><h3>Keep these overlaps deliberately?</h3>'+a.conflicts.map(c=>'<p>'+esc(c.message)+'</p>').join('')+'<small>Saving keeps both commitments. You can return and adjust their times first.</small></div>':'')+((p.summary?.notices||[]).length?'<div class="planner-notices">'+p.summary.notices.map(n=>'<p>'+esc(typeof n==='string'?n:n.message||JSON.stringify(n))+'</p>').join('')+'</div>':'')+errorHtml(error)+'<div class="dialog-footer">'+button('review-back','Back to edit','','button ghost')+button('commit','Save '+(kind==='profile'?'setup':kind==='day'?'day plan':'check-off'),'','button primary')+'</div></div>');
  }
  function setError(message){const el=$('plannerError');if(el&&$('dialog')?.open){el.textContent=message;el.scrollIntoView?.({block:'nearest'});}else api.toast(message);}
  function setBusy(value){document.querySelectorAll('.planner-dialog button[type="submit"],.planner-dialog [data-planner-action="commit"]').forEach(el=>el.disabled=value);}
  async function commit(){
    if(busy||!review)return;busy=true;setBusy(true);const chosen=review,reviewNode=$('plannerReview');
    try{
      const result=await api.commit(copy(chosen.command),chosen.prepared.reviewDigest);
      if(!result?.ok)throw new Error(result?.error||'The change was not saved. Your edit is retained.');
      if(review!==chosen)return;
      preview=null;review=null;editor=null;if($('plannerReview')===reviewNode)api.closeDialog();api.render();api.toast('Planner changes saved on this device.');
    }catch(error){if(review===chosen){review.error=error.message+' Your reviewed edit is still here.';if($('dialog')?.open&&$('plannerReview')===reviewNode)renderReview();}}
    finally{busy=false;setBusy(false);}
  }
  function renderHistory(){
    const rows=domain().days.filter(x=>x.rootId===date()).slice().reverse(),events=domain().events.filter(x=>x.dayRootId===date()).slice().reverse();
    show('Your plan, through its changes.','<p class="planner-intro">'+esc(dateLabel(date()))+'. Earlier versions are retained exactly as saved. Editing your setup never rewrites these plans.</p><div class="planner-history">'+(rows.length?rows.map((row,i)=>'<details '+(!i?'open':'')+'><summary><span>'+(i?'Earlier version':'Current version')+'<small>'+esc(new Date(row.recordedAt).toLocaleString('en-GB'))+'</small></span><strong>'+row.value.slots.filter(s=>!s.cancelled).length+' activities</strong></summary>'+reviewRows(row.value)+(row.value.slots.some(s=>s.cancelled)?'<p class="planner-help">'+row.value.slots.filter(s=>s.cancelled).length+' cancelled activities retained.</p>':'')+'</details>').join(''):'<p>No saved versions for this date yet.</p>')+'</div>'+(events.length?'<h3 class="planner-history-title">Planner check-offs</h3>'+events.map(e=>{const slot=rows.find(r=>r.id===e.dayVersionId)?.value.slots.find(s=>s.id===e.slotId);return '<div class="planner-review-row"><span>'+esc(slot?.title||'Retained activity')+'<small>'+esc(e.note)+'</small></span><strong>'+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset']],e.status))+'<small>'+esc(new Date(e.recordedAt).toLocaleString('en-GB'))+'</small></strong></div>';}).join(''):'') );
  }
  function resume(){if(review)return renderReview();if(!editor)return;if(editor.kind==='profile')renderProfile();else if(editor.kind==='slot')renderSlot();else if(editor.kind==='options')renderOptions();else if(editor.kind==='status'){const saved=editor;showStatus(saved.data.slotId,saved.data.status);editor=saved;const input=$('plannerStatusForm')?.querySelector('textarea');if(input)input.value=saved.data.note;}}
  function handleClick(target){
    const el=target?.closest?.('[data-planner-action]');if(!el||!api)return false;const action=el.dataset.plannerAction;
    if(busy)return true;
    if(action==='select-day')setDate(el.dataset.date);
    else if(action==='today')setDate(context().today);
    else if(action==='previous-week')setDate(dateAdd(date(),-7));
    else if(action==='next-week')setDate(dateAdd(date(),7));
    else if(action==='profile')openProfile();
    else if(action==='day-options')openOptions();
    else if(action==='save-preview'){const d=displayed();prepareReview(makeCommand('day',d.value,d.previousVersionId),null);}
    else if(action==='add-slot')startSlot();
    else if(action==='slot')openSlot(el.dataset.id);
    else if(action==='spill')setDate(el.dataset.date);
    else if(action==='edit-slot')startSlot(el.dataset.id);
    else if(action==='pin-slot'||action==='cancel-slot'){
      const d=displayed(),value=copy(d.value),slot=value.slots.find(x=>x.id===el.dataset.id);if(!slot)return true;
      if(action==='pin-slot')slot.fixed=!slot.fixed;else slot.cancelled=true;
      editor=null;prepareReview(makeCommand('day',value,d.previousVersionId),null);
    }
    else if(action==='status')showStatus(el.dataset.id,el.dataset.status);
    else if(action==='add-equipment'){syncProfile();editor.data.equipment.push({id:uid('equipment'),name:'',location:'home',availability:'current',minKg:null,maxKg:null,stepKg:null,note:''});renderProfile();const details=$('plannerEquipment')?.closest('details');if(details)details.open=true;}
    else if(action==='remove-equipment'){syncProfile();editor.data.equipment=editor.data.equipment.filter(x=>x.id!==el.dataset.id);renderProfile();}
    else if(action==='commit')commit();
    else if(action==='review-back'){const back=review?.back;review=null;if(back)back();else{api.closeDialog();api.render();}}
    else if(action==='resume')resume();
    else if(action==='discard'){editor=null;review=null;api.render();}
    else if(action==='pause'){syncProfile();syncSlot();api.closeDialog();api.render();}
    else if(action==='history')renderHistory();
    else if(action==='navigate'){if(routes.some(x=>x[0]===el.dataset.route)&&el.dataset.route){api.closeDialog();api.navigate(el.dataset.route);}}
    else if(action==='jump')show('Choose any day.','<form id="plannerDateForm">'+field('date','Date',date(),'type="date" required')+errorHtml()+footer('Open day')+'</form>');
    else return false;
    return true;
  }
  document.addEventListener('input',event=>{
    if(event.target.closest?.('#plannerProfileForm'))syncProfile();
    if(event.target.closest?.('#plannerSlotForm')){if(['startDate','startTime','endDate','endTime'].includes(event.target.dataset.plannerField)){const side=event.target.dataset.plannerField.startsWith('start')?'start':'end';editor.data[side+'Offset']='';editor.choices[side]=[];const offset=$('plannerSlotForm').querySelector('[data-planner-field="'+side+'Offset"]');if(offset)offset.value='';}syncSlot();}
    if(event.target.closest?.('#plannerOptionsForm')&&editor?.kind==='options')editor.data=readFields($('plannerOptionsForm'));
    if(event.target.closest?.('#plannerStatusForm')&&editor?.kind==='status')editor.data.note=readFields($('plannerStatusForm')).note;
  });
  document.addEventListener('change',event=>{
    if(event.target.closest?.('#plannerProfileForm'))syncProfile();
    if(event.target.closest?.('#plannerSlotForm'))syncSlot();
    if(event.target.closest?.('#plannerOptionsForm')&&editor?.kind==='options')editor.data=readFields($('plannerOptionsForm'));
  });
  document.addEventListener('close',event=>{if(event.target.id==='dialog'&&api&&(editor||review))api.render();},true);
  document.addEventListener('submit',event=>{
    const form=event.target;if(!['plannerProfileForm','plannerOptionsForm','plannerSlotForm','plannerStatusForm','plannerDateForm'].includes(form.id))return;event.preventDefault();if(busy)return;setBusy(true);
    try{
      if(form.id==='plannerProfileForm'){syncProfile();prepareReview(makeCommand('profile',editor.data,editor.previousVersionId),()=>renderProfile());}
      else if(form.id==='plannerOptionsForm'){
        editor.data=readFields(form);const p=profile(),result=p?ops().generateDay(p,{date:editor.base.date,...editor.data},editor.base):{ok:true,value:{...copy(editor.base),...editor.data},notices:['Set your work and sleep preferences to add baseline anchors.']};
        if(!result.ok)throw new Error(result.error);preview={date:editor.base.date,value:result.value,notices:result.notices,previousVersionId:editor.previousVersionId};editor=null;api.closeDialog();api.render();
      }
      else if(form.id==='plannerSlotForm'){
        syncSlot();const d=editor.data,a=ops().resolve(d.startDate,d.startTime,editor.base.timeZone,d.startOffset===''?undefined:Number(d.startOffset)),b=ops().resolve(d.endDate,d.endTime,editor.base.timeZone,d.endOffset===''?undefined:Number(d.endOffset));
        if(!a.ok||!b.ok){editor.choices.start=a.choices||[];editor.choices.end=b.choices||[];renderSlot([!a.ok?'Start: '+a.error:'',!b.ok?'End: '+b.error:''].filter(Boolean).join(' '));return;}
        const value=copy(editor.base),slot={id:editor.slotId,title:d.title,category:d.category,start:a.endpoint,end:b.endpoint,fixed:d.fixed,origin:editor.origin,cancelled:false,link:d.route?{route:d.route,label:nameOf(routes,d.route)}:null},i=value.slots.findIndex(x=>x.id===slot.id);
        if(i<0)value.slots.push(slot);else value.slots[i]=slot;
        prepareReview(makeCommand('day',value,editor.previousVersionId),()=>renderSlot());
      }
      else if(form.id==='plannerStatusForm'){editor.data.note=readFields(form).note;prepareReview(makeCommand('status',editor.data,editor.previousVersionId),()=>resume());}
      else{const v=readFields(form).date;if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw new Error('Choose a valid date.');setDate(v);api.closeDialog();}
    }catch(error){setError(error.message);}
    finally{if(!busy)setBusy(false);}
  });
  global.PlannerUI=Object.freeze({configure,render,handleClick,openDate,get busy(){return busy;}});
})(window);
