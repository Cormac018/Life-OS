/* Pure, bounded placement of reviewed athletic blueprints. No clock, DOM, storage or network. */
(function(global){
  'use strict';
  const VERSION='coaching-schedule/1',copy=x=>JSON.parse(JSON.stringify(x));
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const dayMs=86400000,dateValue=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*dayMs).toISOString().slice(0,10);
  const distance=(a,b)=>Math.abs(Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/dayMs));
  const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay()||7;
  const monday=d=>add(d,1-weekday(d));
  function check(ok,message){if(!ok)throw new Error(message);}
  function trainingDates(workspace){
    const d=workspace.domains,out=new Map(),put=(date,why)=>{if(dateValue(date)){if(!out.has(date))out.set(date,new Set());out.get(date).add(why);}};
    for(const s of d.training?.history||[])put(s.date,'Recorded strength');
    if(d.training?.state?.active)put(d.training.state.active.date,'Active strength');
    for(const [date,routine] of Object.entries(d.training?.schedule||{}))if(routine)put(date,'Scheduled strength');
    for(const p of d.athletics?.prescriptions||[])put(p.value.date,'Existing strength approval');
    for(const p of d.conditioning?.prescriptions||[])put(p.value.date,'Existing activity approval');
    const actuals=global.ConditioningOperations.currentActuals(workspace),observations=global.ConditioningOperations.currentObservations(workspace),active=global.ConditioningOperations.currentSession(workspace);
    check(actuals.ok&&observations.ok&&active.ok,'Existing activity records need review before arranging training.');
    for(const row of actuals.actuals)put(row.date,'Recorded activity');
    for(const row of observations.observations)put(row.date,'Recorded sport or skill');
    if(active.session)put(active.session.date,'Active activity');
    const heads=new Map();for(const row of d.planner.days)heads.set(row.rootId,row);
    for(const row of heads.values())for(const slot of row.value.slots)if(!slot.cancelled&&slot.category==='training'){
      put(row.rootId,'Saved training commitment');
      if(slot.start.date!==row.rootId)put(slot.start.date,'Training crossing midnight');
      if(slot.end.date!==row.rootId&&slot.end.time!=='00:00')put(slot.end.date,'Training crossing midnight');
    }
    return out;
  }
  function propose(input){try{
    check(object(input),'Supply the training placement inputs.');
    const {workspace,revision,now,horizon,scenario,preferences,candidates,idPrefix}=input;
    check(workspace?.domains?.planner&&Number.isSafeInteger(revision)&&revision>=0,'Load a reviewed workspace revision.');
    check(typeof now==='string'&&Number.isFinite(Date.parse(now))&&new Date(now).toISOString()===now,'Supply an exact current ISO instant.');
    check(object(horizon)&&dateValue(horizon.from)&&dateValue(horizon.to)&&horizon.to>=horizon.from&&distance(horizon.from,horizon.to)<14,'Choose a horizon of at most fourteen days.');
    check(['usual','intended','future'].includes(scenario),'Choose the usual, protected-finish or future-commute scenario.');
    check(typeof idPrefix==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(idPrefix),'Use a stable proposal identity of at most forty characters.');
    check(object(preferences)&&Array.isArray(preferences.availableDays)&&preferences.availableDays.length>0&&preferences.availableDays.every(d=>Number.isInteger(d)&&d>=1&&d<=7)&&new Set(preferences.availableDays).size===preferences.availableDays.length,'Choose available weekdays once each.');
    check(Number.isInteger(preferences.minRestDays)&&preferences.minRestDays>=0&&preferences.minRestDays<=6,'Choose zero to six full days between sessions.');
    check(Number.isInteger(preferences.maxSessions)&&preferences.maxSessions>=1&&preferences.maxSessions<=7,'Choose one to seven training days per calendar week.');
    check(Array.isArray(candidates)&&candidates.length<=28,'Propose at most twenty-eight candidate sessions.');
    const P=global.PlannerOperations,A=global.AthleticsOperations,C=global.ConditioningOperations,L=global.LifeConductor;
    check(P&&A&&C&&L,'The training and shared planner engines are unavailable.');
    const profile=P.currentProfile(workspace.domains.planner);check(profile,'Save a Day planner profile first.');
    const point=P.endpointAt(Date.parse(now),profile.value.timeZone);check(point.ok,point.error);const today=point.endpoint.date;
    check(horizon.from>=today,'A new training week cannot start in the past.');
    const dates=[];for(let date=horizon.from;date<=horizon.to;date=add(date,1))dates.push(date);
    const occupied=trainingDates(workspace),commands=[],placements=[],deferrals=[],days=[],keys=new Set();let staged=copy(workspace);
    const ordered=candidates.map((candidate,index)=>({candidate,index})).sort((a,b)=>(a.candidate.priority||0)-(b.candidate.priority||0)||a.index-b.index);
    for(const {candidate,index} of ordered){
      check(object(candidate)&&typeof candidate.key==='string'&&candidate.key.length>0&&!keys.has(candidate.key),'Each candidate needs its own stable identity.');keys.add(candidate.key);
      if(candidate.allowedDates!==undefined)check(Array.isArray(candidate.allowedDates)&&candidate.allowedDates.length<=14&&candidate.allowedDates.every(dateValue)&&new Set(candidate.allowedDates).size===candidate.allowedDates.length,'Candidate date limits must be distinct local dates.');
      check(object(candidate.value),'Choose an exact blueprint.');
      const reasons=[],primaryFailures=[],title=candidate.title||candidate.value.title;let placed=false;
      const choices=[candidate,...(candidate.alternative?[candidate.alternative]:[])];
      for(const [choiceIndex,choice] of choices.entries()){
      check(object(choice)&&['strength','conditioning'].includes(choice.kind)&&object(choice.value),'Choose an exact strength or activity blueprint.');
      check(Number.isInteger(choice.durationMinutes)&&choice.durationMinutes>0&&choice.durationMinutes<=1440,'Every candidate needs an explicit duration of one to 1440 minutes.');
      if(!choiceIndex&&candidate.primaryUnavailable){check(typeof candidate.primaryUnavailable==='string','A held primary needs its reason.');const row={date:horizon.from,reason:candidate.primaryUnavailable,alternative:false};reasons.push(row);primaryFailures.push(copy(row));continue;}
      for(const date of dates){
        const no=reason=>{const row={date,reason,alternative:choiceIndex>0};reasons.push(row);if(!choiceIndex)primaryFailures.push(copy(row));};
        if(candidate.allowedDates&&!candidate.allowedDates.includes(date)){no('This occurrence belongs to a different chosen calendar week.');continue;}
        if(!preferences.availableDays.includes(weekday(date))){no('Not one of your available weekdays.');continue;}
        if(occupied.has(date)){no('Other training is already approved, planned or recorded on this date.');continue;}
        const nearby=[...occupied.keys()].find(d=>distance(d,date)<=preferences.minRestDays);
        if(nearby){no('Keep '+preferences.minRestDays+' full non-training day'+(preferences.minRestDays===1?'':'s')+' from activity on '+nearby+'.');continue;}
        if([...occupied.keys()].filter(d=>monday(d)===monday(date)).length>=preferences.maxSessions){no('Your maximum training days for this calendar week are already used.');continue;}
        const existing=P.currentDay(workspace.domains.planner,date);
        if(existing&&existing.value.timeZone!==profile.value.timeZone){no('The saved day has another time zone; review its timing first.');continue;}
        if(existing&&['sick','travel','rest'].includes(existing.value.dayType)){no('This saved '+existing.value.dayType+' day is protected from new training.');continue;}
        const value=copy(choice.value);value.date=date;
        if(value.timeZone!==profile.value.timeZone){no('The blueprint and Day planner use different time zones.');continue;}
        const operation=choice.kind==='strength'?'prescribe':value.type==='sequence'?'prescribe-sequence':'prescribe';
        const command={contract:choice.kind==='strength'?'lifeos-athletics/1':'lifeos-conditioning/1',operation,operationId:idPrefix+'_approve_'+index,versionId:idPrefix+'_session_'+index,recordedAt:now,expected:{workspaceRevision:revision,previousVersionId:null},entity:value};
        const engine=choice.kind==='strength'?A:C,prepared=engine.prepare(command,{workspace:staged,revision,today});
        if(!prepared.ok||prepared.status!=='ready'){no(prepared.error||'The approval identity is already used.');continue;}
        const built=engine.buildCandidate(prepared,staged);if(!built.ok){no(built.error);continue;}
        if(choice.kind==='conditioning'){
          const duration=C.plannedDuration(built.workspace.domains.conditioning.prescriptions.find(p=>p.id===command.versionId));
          if(!duration.ok||!Number.isSafeInteger(duration.durationMs)||duration.durationMs<=0||Math.ceil(duration.durationMs/60000)!==choice.durationMinutes){no('The complete activity needs explicit duration targets matching its time budget.');continue;}
        }
        const result=L.propose({workspace:built.workspace,revision,now,horizon:{from:date,to:date},options:{scenario,preserveExisting:true,athleticsDurations:choice.kind==='strength'?{[command.versionId]:choice.durationMinutes}:{}}});
        if(!result.ok){no(result.error);continue;}
        const day=result.proposal.days[0],occurrenceId=(choice.kind==='strength'?'athlete_':'conditioning_')+command.versionId,slot=day?.value?.slots.find(s=>s.id===occurrenceId&&!s.cancelled);
        if(!day?.value?.slots.some(s=>!s.cancelled&&s.category==='sleep')){no('Set a protected sleep window for this day before automatic training placement.');continue;}
        if(!slot){no(day?.unscheduled.find(s=>s.id===occurrenceId)?.reason||'No usable training space remains after existing commitments.');continue;}
        if(Date.parse(slot.start.at)<Date.parse(now)){no('That session would start before the current time.');continue;}
        if(day.analysis?.conflicts?.length){no('The resulting day has a timing conflict that needs a manual review.');continue;}
        if(existing&&existing.value.slots.some(old=>JSON.stringify(day.value.slots.find(s=>s.id===old.id))!==JSON.stringify(old))){no('This placement would change an existing commitment.');continue;}
        const otherNewTraining=day.value.slots.some(s=>!s.cancelled&&s.category==='training'&&s.id!==occurrenceId);
        if(otherNewTraining){no('Another training commitment already uses this day.');continue;}
        commands.push({kind:choice.kind,command});staged=built.workspace;occupied.set(date,new Set(['Proposed training']));days.push(day);
        placements.push({key:candidate.key,kind:choice.kind,date,prescriptionId:command.versionId,occurrenceId,slotId:occurrenceId,durationMinutes:choice.durationMinutes,start:copy(slot.start),end:copy(slot.end),scenario:day.value.scenario,alternative:choiceIndex>0,primaryKind:candidate.kind,primarySourcePrescriptionId:candidate.sourcePrescriptionId||null,sourcePrescriptionId:choice.sourcePrescriptionId||null,templateId:choice.templateId||null,title:choice.title||value.title,focus:copy(choice.focus||value.focus||[]),value:copy(value),decision:choice.decision||null,reasons:copy(choice.reasons||[]),evidence:copy(choice.evidence||[]),primaryFailures:choiceIndex?copy(primaryFailures):[]});placed=true;break;
      }
      if(placed)break;
      }
      if(!placed)deferrals.push({key:candidate.key,title,reason:reasons.length?reasons.map(r=>r.date+': '+r.reason).join(' '):'No dates are available.',attempts:reasons});
    }
    days.sort((a,b)=>a.date.localeCompare(b.date));
    let planCommand=null;
    if(days.length){
      const planned=days.map((day,n)=>({date:day.date,previousVersionId:day.previousVersionId,versionId:idPrefix+'_day_'+n,value:copy(day.value)}));
      planCommand={contract:'lifeos-planner/1',operation:'plan',operationId:idPrefix+'_plan',versionId:planned[0].versionId,recordedAt:now,expected:{workspaceRevision:revision,previousVersionId:planned[0].previousVersionId},entity:{policyVersion:VERSION,proposalDigest:idPrefix,horizon:copy(horizon),days:planned}};
      const reviewed=P.prepare(planCommand,{workspace:staged,revision});check(reviewed.ok,reviewed.error);
      check(!reviewed.summary.conflicts.length,'The combined week has a timing conflict. No training approvals have been saved.');
      const built=P.buildCandidate(reviewed,staged);check(built.ok,built.error);const links=P.validateLinks(built.workspace);check(links.ok,links.error);
    }
    return {ok:true,commands,planCommand,days,placements,deferrals,context:{policyVersion:VERSION,today,timeZone:profile.value.timeZone,scenario,minRestDays:preferences.minRestDays,maxSessions:preferences.maxSessions,notes:['Spacing is your chosen calendar rule, not a measured recovery score.','Existing approvals and sport or skill dates are treated conservatively as training days.','Saved days retain their existing scenario and timing; new days use the selected scenario.']}};
  }catch(error){return {ok:false,error:error.message||String(error)};}}
  global.CoachingSchedule=Object.freeze({VERSION,propose});
})(window);
