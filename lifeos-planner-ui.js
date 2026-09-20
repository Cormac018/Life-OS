/* The manual planner surface. Durable writes belong to PlannerOperations and the runtime. */
(function(global){
  'use strict';
  let api,selectedDate=null,preview=null,editor=null,review=null,busy=false,doneProposals=[],historyEvidence=[],planReview=null,restored=null,draftTimer=null,liveEnvelope=null,persisted=null,pendingDraft=undefined,draftIssue=null;
  const conductor=()=>global.LifeConductor,nowIso=()=>api.now?api.now():new Date().toISOString();
  const changeNames={add:'Added',move:'Moved',shorten:'Shortened',defer:'Deferred',unplaced:'Left as is',keep:'Kept'};
  const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=prefix=>prefix+'_'+crypto.randomUUID(),ops=()=>global.PlannerOperations;
  const categories=[['sleep','Sleep'],['work','Work'],['commute','Commute'],['buffer','Transition'],['training','Training'],['meal','Meal'],['goal','Goal time'],['care','Personal care'],['admin','Life admin'],['rest','Rest'],['other','Something else']];
  const types=[['normal','Normal day'],['travel','Work travel'],['leave','Time off'],['sick','Sick day'],['rest','Rest day']];
  const scenarios=[['usual','Usual hours'],['intended','Intended hours'],['future','Future commute']];
  const routes=[['','No shortcut'],['train','Train'],['plan','Training programme'],['food','Food'],['sleep','Sleep'],['work','Work'],['goals','Goals'],['money','Money'],['people','People'],['life','Life planner'],['capture','Capture']];
  const routineCategories=categories.filter(c=>!['sleep','work','commute','buffer'].includes(c[0])),specialist=['training','meal','sleep','work'],sectionNames={training:'Train',meal:'Food',sleep:'Sleep',work:'Work',goal:'Goals'};
  const plannerForms=['plannerProfileForm','plannerSlotForm','plannerOptionsForm','plannerStatusForm','plannerRoutineForm','plannerMoveForm'];
  const weekdayNames=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],evidenceNames={'training-session':'workout session','sleep-record':'sleep record','meal-log':'logged meal','work-entry':'work shift','goal-progress':'goal progress','goal-action-event':'completed action','people-event':'people entry','money-transaction':'money record'};
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
  /* C3a slice 1: within one synchronous interaction (a render, a click, a submit) the planner asks the app for the workspace once and reuses that capture.
     The scope ends with the interaction, so unsaved edits, kept-draft changes, failed saves, restores, transactions and a changed planning day are always seen fresh by the next one. Async continuations run outside any scope and read fresh. */
  let scope=null,scopeDepth=0;
  function context(){if(scope){if(!scope.context)scope.context=api.context();return scope.context;}return api.context();}
  function scoped(fn){if(scopeDepth++===0)scope={context:null,actuals:new Map(),digest:null};try{return fn();}finally{if(--scopeDepth===0)scope=null;}}
  function actualsFor(dayDate){if(!api.actuals)return [];if(!scope)return api.actuals(dayDate);if(!scope.actuals.has(dayDate))scope.actuals.set(dayDate,api.actuals(dayDate));return scope.actuals.get(dayDate);}
  const staleProposalMessage='The records or setup used by this proposal changed. Propose the plan again before saving; your existing plans are unchanged.';
  const kindNames={profile:'setup',options:'day type and hours',slot:'activity',move:'move',routine:'routine',alternative:'alternative',status:'check-off',command:'reviewed change',proposal:'proposed week'};
  const starters=new Set(['profile','day-options','save-preview','add-slot','edit-slot','pin-slot','cancel-slot','status','done-slot','plan-week','move-slot','alternative-slot','routine-new','routine-edit','routine-status']);
  // Staleness follows the decision inputs a proposal read, not the storage revision: keeping a draft must never stale the plan it belongs to.
  function planningDay(ctx=context(),instant=nowIso()){const p=ops().currentProfile(ctx.workspace.domains.planner),point=ops().endpointAt(Date.parse(instant),p?.value.timeZone||zone());return point.ok?point.endpoint.date:null;}
  function currentDigest(){
    if(scope&&scope.digest!==null)return scope.digest;
    const C=conductor();if(!C||typeof C.inputsDigest!=='function')return null;
    const ctx=context(),today=planningDay(ctx);if(!today)return null;
    // A saved revision does not identify unsaved in-memory decision inputs.
    // Reuse a digest only with this interaction's captured workspace.
    const digest=C.inputsDigest(ctx.workspace)+'|'+today;if(scope)scope.digest=digest;return digest;
  }
  // A proposal plans from its own day: the token pairs its decision inputs with that day, so a plan kept overnight is stale the next morning.
  function proposalToken(p){return (p.inputsDigest??'')+'|'+p.today;}
  function proposalChanged(sourceDigest){return typeof sourceDigest==='string'&&sourceDigest!==currentDigest();}
  // Everything except the kept planner draft: a reviewed change may be saved only if nothing else changed since its review.
  function workspaceDigest(){const ws=context().workspace,text=JSON.stringify({...ws,drafts:ws.drafts?{...ws.drafts,planner:null}:ws.drafts});let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0')+':'+text.length;}
  function domain(){return context().workspace.domains.planner;}
  function date(){if(!selectedDate)selectedDate=context().today;return selectedDate;}
  function profile(){return ops().currentProfile(domain());}
  function current(){return ops().currentDay(domain(),date());}
  function neighbours(dayDate){return [-2,-1,1,2].map(n=>ops().currentDay(domain(),dateAdd(dayDate,n))).filter(Boolean);}
  function emptyDay(dayDate){return {date:dayDate,timeZone:profile()?.value.timeZone||zone(),profileVersionId:profile()?.id||null,dayType:'normal',scenario:'usual',note:'',slots:[]};}
  function displayed(){
    const saved=current();
    if(preview?.date===date())return {value:preview.value,notices:[...preview.notices,...(proposalChanged(preview.sourceDigest)?[staleProposalMessage]:[])],saved,previousVersionId:preview.previousVersionId,sourceDigest:preview.sourceDigest,preview:true};
    if(saved)return {value:saved.value,notices:[],saved,previousVersionId:saved.id,preview:false};
    const p=profile(),result=p?ops().generateDay(p,{date:date(),dayType:'normal',scenario:'usual',note:''},undefined,domain()):null;
    return {value:result?.ok?result.value:emptyDay(date()),notices:result?.ok?result.notices:[result?.error||'Set your usual week to preview sleep, work and travel time. You can also add activities now.'],saved:null,previousVersionId:null,preview:true};
  }
  function statuses(dayDate){const out=new Map();domain().events.filter(e=>e.dayRootId===dayDate).forEach(e=>out.set(e.slotId,e));return out;}
  function analysis(day){return ops().analyseDay(day,neighbours(day.date));}
  function routineRows(){return ops().routines(domain());}
  function routineVersion(id){return domain().routines.find(r=>r.id===id)||null;}
  function ruleLabel(v){const r=v.recurrence,every=r.interval===1?'Every':'Every '+r.interval;return (r.frequency==='daily'?(r.interval===1?'Every day':'Every '+r.interval+' days'):every+(r.interval===1?'':' weeks on')+' '+r.weekdays.slice().sort().map(n=>weekdayNames[n-1]).join(', '))+' · '+duration(v.durationMinutes)+' between '+v.window.start+' and '+v.window.end+(r.endDate?' · until '+dateLabel(r.endDate,{day:'numeric',month:'short',year:'numeric'}):'')+(v.status==='active'?'':' · '+v.status);}
  function movedTo(slot,dayDate){if(!slot.cancelled)return null;const found=ops().locate(domain(),slot.id);return found&&found.date!==dayDate?found.date:null;}
  function evidenceLabel(e){return (evidenceNames[e.kind]||e.kind)+' · '+dateLabel(e.date,{day:'numeric',month:'short'});}
  function candidates(dayDate){return actualsFor(dayDate).filter(x=>x.evidence&&x.kind==='record').map(x=>({...x.evidence,time:x.time||null,title:x.title,detail:x.detail,route:x.route}));}
  function weekAgenda(){
    const weekday=(new Date(date()+'T12:00:00Z').getUTCDay()+6)%7,monday=dateAdd(date(),-weekday),today=context().today;
    return '<details class="planner-agenda-week" open><summary><span>This week at a glance</span><small>Plans, check-offs and linked records</small></summary><div class="planner-agenda-grid">'+Array.from({length:7},(_,i)=>{
      const d=dateAdd(monday,i),row=ops().currentDay(domain(),d),st=statuses(d),active=row?row.value.slots.filter(s=>!s.cancelled&&s.origin!=='baseline').sort((a,b)=>Date.parse(a.start.at)-Date.parse(b.start.at)):[];
      const unresolved=d<today?active.filter(s=>!st.get(s.id)||st.get(s.id).status==='reset').length:0,recorded=actualsFor(d).filter(x=>x.kind==='record').length;
      return '<div class="planner-agenda-day'+(d===date()?' is-selected':'')+(d===today?' is-today':'')+'"><button type="button" class="planner-agenda-head" data-planner-action="select-day" data-date="'+d+'"><strong>'+weekdayNames[i]+' '+Number(d.slice(8))+'</strong><small>'+(row?active.length+(active.length===1?' activity':' activities'):'No saved plan')+'</small></button>'+(active.length?'<ul>'+active.map(s=>{const e=st.get(s.id),status=e?.status;const state=ops().checkoffState(s,e);return '<li class="'+(state==='verified'||state==='done'?'is-done':state==='unverified'?'is-done is-unverified':state==='skipped'?'is-skipped':'')+'"><button type="button" data-planner-action="open-slot-on" data-date="'+d+'" data-slot="'+esc(s.id)+'"><i style="background:'+colour[s.category]+'"></i><span>'+esc(s.start.time)+' '+esc(s.title)+'</span>'+(state==='verified'?'<em title="Linked record">↗</em>':state==='unverified'?'<em title="No record linked">✓?</em>':state==='done'?'<em>✓</em>':state==='skipped'?'<em>·</em>':'')+'</button></li>';}).join('')+'</ul>':'')+'<small class="planner-agenda-foot">'+recorded+' recorded'+(unresolved?' · '+unresolved+' to resolve':'')+'</small></div>';
    }).join('')+'</div></details>';
  }
  function setDate(value){selectedDate=value;if(hasDraft())noteDraft();api.render();}
  function openDate(value){if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value){selectedDate=value;if(hasDraft())noteDraft();}api.navigate('planner');}
  function hasDraft(){return !!editor||!!review||!!planReview||!!restored||!!preview;}
  // An editor nobody has typed into is resumable in this session but is neither kept on the device nor allowed to block other work.
  function mark(){if(editor)editor.pristine=editor.kind==='alternative'?null:JSON.stringify(editor.data);}
  function editorDirty(){return !!editor&&editor.kind!=='alternative'&&JSON.stringify(editor.data)!==editor.pristine;}
  function kept(){return restored?kindNames[restored.kind]:review?kindNames.command:editorDirty()?kindNames[editor.kind]:preview&&preview.date!==date()?'day preview':null;}
  // Drafts reach the workspace only through noteDraft: a save started elsewhere carries the last noted draft, never a half-updated one.
  function noteDraft(){if(!api||typeof api.draftChanged!=='function')return;pendingDraft=liveDraft();const delay=Number.isFinite(api.draftDelay)?api.draftDelay:400;if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}if(delay<=0){settleDraft();api.draftChanged();return;}draftTimer=setTimeout(()=>{draftTimer=null;settleDraft();api.draftChanged();},delay);}
  function settleDraft(){if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}if(pendingDraft!==undefined){persisted=pendingDraft;pendingDraft=undefined;}}
  function flushDraft(){if(!api||typeof api.draftChanged!=='function')return;if(pendingDraft===undefined&&!draftTimer)pendingDraft=liveDraft();settleDraft();api.draftChanged();}
  function snapshotDraft(){return persisted?copy(persisted):null;}
  function stripCommand(c){const out=copy(c);delete out.expected.workspaceRevision;return out;}
  function planIntent(){return planReview?{proposal:copy(planReview.proposal),options:copy(planReview.options),selected:[...planReview.selected]}:null;}
  function editorIntent(){const e=copy(editor);delete e.kind;delete e.previousVersionId;delete e.fromVersionId;delete e.sourceDigest;return e;}
  function editorPreconditions(e){return {previousVersionId:e.previousVersionId??null,fromVersionId:e.fromVersionId??null,rootId:e.rootId??null,dayDate:e.base?.date??e.data?.dayRootId??null,inputsDigest:e.sourceDigest??null};}
  function commandPreconditions(c){const e=c.entity,o=c.operation;return {previousVersionId:c.expected.previousVersionId??null,fromVersionId:o==='move'?e.fromVersionId:null,rootId:o==='routine'?e.rootId:null,dayDate:o==='day'?e.date:o==='move'?e.fromDate:o==='status'?e.dayRootId:null};}
  // The durable draft: the newest unfinished intent with the preconditions it was derived from. Never a review digest, never an approval.
  function liveDraft(){
    let kind,pre,intent;
    if(review){kind='command';pre={...commandPreconditions(review.command),inputsDigest:review.sourceDigest??null};intent={command:stripCommand(review.command),editor:editor?copy(editor):null,proposal:planIntent(),preview:preview?copy(preview):null};}
    else if(editorDirty()){kind=editor.kind;pre=editorPreconditions(editor);intent={...editorIntent(),proposal:planIntent(),preview:preview?copy(preview):null};}
    else if(planReview){kind='proposal';pre={inputsDigest:proposalToken(planReview.proposal),dayDate:planReview.proposal.today??null};intent={...planIntent(),preview:preview?copy(preview):null};}
    else if(preview){kind='options';pre={previousVersionId:preview.previousVersionId??null,dayDate:preview.date,inputsDigest:preview.sourceDigest??null};intent={data:{dayType:preview.value.dayType,scenario:preview.value.scenario,note:preview.value.note},base:copy(preview.value),preview:{value:copy(preview.value),notices:copy(preview.notices||[])}};}
    else if(restored)return copy(restored);
    else{liveEnvelope=null;return null;}
    const selected=selectedDate||nowIso().slice(0,10),body=JSON.stringify([kind,pre,intent,selected]);
    if(liveEnvelope&&liveEnvelope.body===body)return copy(liveEnvelope.value);
    liveEnvelope={body,value:{schema:'lifeos.planner-draft/1',id:liveEnvelope?liveEnvelope.value.id:uid('plannerdraft'),kind,savedAt:nowIso(),selectedDate:selected,preconditions:{previousVersionId:null,fromVersionId:null,rootId:null,dayDate:null,inputsDigest:null,...pre},intent}};
    return copy(liveEnvelope.value);
  }
  // Restoring rebuilds nothing and approves nothing: the draft waits behind Resume, where its preconditions are checked first.
  function restoreDraft(value){
    global.LifeOSWorkspace.validatePlannerDraft(value);const incoming=value?JSON.stringify(value):null;
    if((persisted?JSON.stringify(persisted):null)===incoming)return;
    editor=null;review=null;planReview=null;preview=null;doneProposals=[];liveEnvelope=null;draftIssue=null;restored=value?copy(value):null;persisted=value?copy(value):null;if(restored)selectedDate=restored.selectedDate;
    if(value){try{global.LifeOSWorkspace.validatePlannerDraft(value,{strict:true});}catch(error){draftIssue=String(error.message||error);}}
  }
  function draftConflict(d){
    const pre=d.preconditions,i=d.intent,checks=[],dayHead=x=>ops().currentDay(domain(),x);
    if(d.kind==='profile')checks.push(['your setup',profile(),pre.previousVersionId]);
    else if(d.kind==='routine')checks.push(['this routine',pre.rootId?ops().currentRoutine(domain(),pre.rootId):null,pre.previousVersionId]);
    else if(d.kind==='move')checks.push([dateLabel(pre.dayDate),dayHead(pre.dayDate),pre.fromVersionId]);
    else if(['options','slot','alternative','status'].includes(d.kind))checks.push([dateLabel(pre.dayDate),dayHead(pre.dayDate),pre.previousVersionId]);
    else if(d.kind==='command'){const c=i.command,e=c.entity,expected=c.expected.previousVersionId;
      if(c.operation==='profile')checks.push(['your setup',profile(),expected]);
      else if(c.operation==='routine')checks.push(['this routine',ops().currentRoutine(domain(),e.rootId),expected]);
      else if(c.operation==='day')checks.push([dateLabel(e.date),dayHead(e.date),expected]);
      else if(c.operation==='status')checks.push([dateLabel(e.dayRootId),dayHead(e.dayRootId),expected]);
      else if(c.operation==='move'){checks.push([dateLabel(e.fromDate),dayHead(e.fromDate),e.fromVersionId]);checks.push([dateLabel(e.target.date),dayHead(e.target.date),expected]);}
      else if(c.operation==='plan')for(const day of e.days)checks.push([dateLabel(day.date),dayHead(day.date),day.previousVersionId]);}
    for(const [label,head,expected] of checks)if((head?.id||null)!==(expected??null))return {label,expected:expected??null,current:head?{id:head.id,recordedAt:head.recordedAt}:null};
    return null;
  }
  function continuable(d){const kind=d.kind==='command'?d.intent.editor?.kind:d.kind;return ['profile','routine','options','slot','move','status'].includes(kind||'');}
  function showConflict(d,c){
    const kind=d.kind==='command'?d.intent.editor?.kind:d.kind,can=continuable(d);
    show('This draft is behind.','<div class="planner-conflict"><span class="planner-state is-preview">Nothing saved</span><p class="planner-intro">Your unfinished '+esc(kindNames[d.kind]||'edit')+' started from '+(c.expected?'an earlier version of ':'no saved version of ')+esc(c.label)+'. '+(c.current?'A newer version was saved on '+esc(new Date(c.current.recordedAt).toLocaleString('en-GB'))+'.':'That version is no longer current.')+'</p>'+(can?'<p class="planner-help">Continue keeps what you typed and applies it to the current version'+(['profile','routine'].includes(kind)?'. Your typed values replace the newer values when you save.':'. Check the timeline before saving.')+' Discard removes the draft and keeps the current version.</p>':'<p class="planner-help">A reviewed change cannot be moved onto the newer version automatically. Discard it and make the change again from the current version.</p>')+'<div class="dialog-footer">'+button('discard','Discard draft','','button ghost')+(can?button('draft-continue','Continue on current version','','button primary'):'')+'</div></div>');
  }
  function showStale(d){show('This proposal is behind.','<div class="planner-conflict"><span class="planner-state is-preview">Nothing saved</span><p class="planner-intro">'+esc(staleProposalMessage)+'</p><div class="dialog-footer">'+button('discard','Discard draft','','button ghost')+(d.kind==='proposal'?button('plan-again','Propose again','','button primary'):'')+'</div></div>');}
  function rebuildEditor(kind,i){const e={kind,...copy(i)};delete e.proposal;delete e.preview;if(e.pristine===undefined)e.pristine=null;return e;}
  function renderEditor(){if(!editor)return;const renderers={profile:renderProfile,slot:renderSlot,options:renderOptions,routine:renderRoutine,move:renderMove,alternative:renderAlternative,status:renderStatus};if(renderers[editor.kind])renderers[editor.kind]();}
  function restorePlan(plan){planReview=plan?{proposal:copy(plan.proposal),options:copy(plan.options),selected:new Set(plan.selected)}:null;}
  function applyRestored(d){
    const i=d.intent,pre=d.preconditions;restored=null;restorePlan(d.kind==='proposal'?i:(i.proposal||null));
    if(d.kind==='proposal'){if(i.preview){preview=copy(i.preview);selectedDate=preview.date;api.closeDialog();api.render();}else renderPlanReview();}
    else if(d.kind==='command'){restored=d;editor=i.editor?rebuildEditor(i.editor.kind,i.editor):null;preview=i.preview?copy(i.preview):null;const back=editor?()=>renderEditor():(planReview?()=>renderPlanReview():null);
      const cmd=copy(i.command);cmd.expected.workspaceRevision=context().revision;const probe=ops().prepare(copy(cmd),context());if(!(probe.ok&&probe.status==='already-committed'))cmd.recordedAt=new Date().toISOString();
      prepareReview(cmd,back,pre.inputsDigest??null).then(ok=>{if(ok)restored=null;else{editor=null;preview=null;restored=d;noteDraft();api.render();}});return;}
    else if(d.kind==='options'&&i.preview&&!Object.prototype.hasOwnProperty.call(i,'pristine')){preview={date:pre.dayDate,value:copy(i.preview.value),notices:copy(i.preview.notices),previousVersionId:pre.previousVersionId,sourceDigest:pre.inputsDigest??null};selectedDate=pre.dayDate;api.closeDialog();api.render();}
    else{preview=i.preview?copy(i.preview):null;editor=rebuildEditor(d.kind,{...i,previousVersionId:pre.previousVersionId,fromVersionId:pre.fromVersionId,sourceDigest:pre.inputsDigest});renderEditor();}
    noteDraft();
  }
  function continueRestored(d){
    const i=d.kind==='command'?d.intent.editor:d.intent,kind=d.kind==='command'?i.kind:d.kind;restored=null;restorePlan(d.intent.proposal||null);
    if(kind==='profile'){const p=profile();editor={kind:'profile',data:copy(i.data),previousVersionId:p?.id||null,pristine:null};renderProfile();}
    else if(kind==='routine'){const cur=ops().currentRoutine(domain(),i.rootId),data=copy(i.data);if(cur&&data.effectiveFrom<cur.value.effectiveFrom)data.effectiveFrom=cur.value.effectiveFrom;editor={kind:'routine',rootId:i.rootId,previousVersionId:cur?.id||null,data,pristine:null};renderRoutine();}
    else{
      const dayDate=d.preconditions.dayDate||i.base?.date||i.data?.dayRootId;selectedDate=dayDate;preview=null;const display=displayed(),head=display.saved&&!display.preview?display.saved:null;
      if(kind==='options'){editor={kind:'options',data:copy(i.data),base:copy(display.value),previousVersionId:display.previousVersionId,sourceDigest:null,pristine:null};renderOptions();}
      else if(kind==='slot'){const slot=display.value.slots.find(s=>s.id===i.slotId);editor={kind:'slot',previousVersionId:display.previousVersionId,sourceDigest:null,base:copy(display.value),slotId:i.slotId,origin:slot?.origin||i.origin,data:copy(i.data),window:slot?.window??null,choices:{},pristine:null};renderSlot();}
      else{const slotId=kind==='move'?i.slotId:i.data.slotId,slot=head?head.value.slots.find(s=>s.id===slotId&&!s.cancelled):null;
        if(!slot){api.toast('That activity is no longer on '+dateLabel(dayDate)+'. The draft was discarded.');api.closeDialog();api.render();noteDraft();return;}
        if(kind==='move')editor={kind:'move',slotId,sourceDigest:null,base:copy(head.value),fromVersionId:head.id,data:copy(i.data),choices:{},pristine:null};else editor={kind:'status',data:{...copy(i.data),dayRootId:dayDate},previousVersionId:head.id,title:i.title||slot.title,evidenceTitle:i.evidenceTitle||null,pristine:null};
        renderEditor();}
    }
    noteDraft();
  }
  function resumeRestored(){const d=restored,pre=d.preconditions;try{if(typeof pre.inputsDigest==='string'&&proposalChanged(pre.inputsDigest)){showStale(d);return;}const conflict=draftConflict(d);if(conflict){showConflict(d,conflict);return;}applyRestored(d);}catch(error){if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}pendingDraft=undefined;editor=null;review=null;planReview=null;preview=null;liveEnvelope=null;restored=copy(d);persisted=copy(d);draftIssue=String(error.message||error);api.closeDialog();api.toast('This kept draft could not be read: '+draftIssue+' Discard it to continue.');api.render();}}
  function draftBanner(){
    if(!hasDraft())return '';
    const state=api.draftState?api.draftState():null,what=restored?kindNames[restored.kind]:review?kindNames.command:editor?kindNames[editor.kind]:planReview?kindNames.proposal:'day preview',onDevice=!!(restored||review||planReview||editorDirty()||preview);
    const when=restored?', kept '+new Date(restored.savedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    if(draftIssue)return '<div class="planner-draft is-error" role="status"><span>A kept planner draft'+esc(when)+' could not be read: '+esc(draftIssue)+' Nothing from it will be applied.</span>'+button('discard','Discard it','','text-button')+'</div>';
    const kept=!onDevice?'Nothing typed yet, so it lives only in this open session.':state?.error?'It could not be saved on this device: '+state.error+' Keep this app open.':state?.saving||pendingDraft!==undefined||draftTimer?'Saving on this device.':'Kept on this device and in encrypted backups until you save or discard it.';
    return '<div class="planner-draft'+(state?.error?' is-error':'')+'" role="status"><span>Unfinished edit: '+esc(what||'edit')+esc(when)+'. '+esc(kept)+'</span>'+button('resume','Resume edit','','text-button')+button('discard','Discard edit','','text-button')+'</div>';
  }
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
  function render(){return scoped(renderPage);}
  function renderPage(){
    date();const display=displayed(),day=display.value,a=analysis(day),p=profile(),s=statuses(day.date),map=slotIntervals(day),conflictIds=new Set(a.conflicts.flatMap(c=>c.slotIds)),active=day.slots.filter(x=>!x.cancelled),manual=active.filter(x=>x.origin==='manual'),done=manual.filter(x=>s.get(x.id)?.status==='done').length;
    const notices=[...new Set([...(display.notices||[]),...(a.notices||[])])];
    const supplied=actualsFor(day.date),actuals=supplied.filter(x=>x.kind!=='evidence'),evidence=supplied.filter(x=>x.kind==='evidence');
    const ratio=Math.max(0,Math.min(1,a.occupiedMinutes/(a.dayMinutes||map.minutes))),circumference=2*Math.PI*43;
    return '<section id="plannerView"><header class="planner-header"><div><div class="eyebrow">Your time, with intention</div><h1>Day planner<span>.</span></h1><p>Give the important things a place. Keep room for real life.</p></div>'+'<div class="planner-header-actions">'+(p&&conductor()?button('plan-week','Plan my week','','button primary'):'')+button('profile',p?'Edit my setup':'Set up my week','','button ghost')+'</div></header>'+
      draftBanner()+
      weekStrip()+weekAgenda()+'<div class="planner-day-heading"><div><span class="planner-state '+(display.preview?'is-preview':'')+'">'+(display.preview?'Preview · not saved':'Saved plan')+'</span><h2>'+esc(dateLabel(day.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</h2></div><div class="planner-day-actions">'+button('jump','Choose date','','text-button')+(day.date!==context().today?button('today','Today','','text-button'):'')+'</div></div>'+
      '<div class="planner-hero"><div class="planner-orbit"><svg viewBox="0 0 112 112" aria-hidden="true"><circle class="planner-orbit-track" cx="56" cy="56" r="43"/><circle class="planner-orbit-value" cx="56" cy="56" r="43" stroke-dasharray="'+(circumference*ratio).toFixed(2)+' '+circumference.toFixed(2)+'"/></svg><div><strong>'+esc(duration(a.freeMinutes))+'</strong><span>unallocated</span></div></div><div class="planner-hero-copy"><div class="planner-day-tags"><span>'+esc(nameOf(types,day.dayType))+'</span><span>'+esc(nameOf(scenarios,day.scenario))+'</span></div><h3>'+(a.conflicts.length?'Some things overlap.':active.length?'Make this day yours.':'Start with the shape of your day.')+'</h3><p>'+esc(duration(a.occupiedMinutes))+' allocated · '+done+' of '+manual.length+' planner check-offs. '+(day.dayType==='travel'?'Add your itinerary. Normal work and commute anchors are paused.':day.dayType==='sick'?'Keep recovery and essential commitments visible.':'Unallocated time also needs to cover anything you have not added yet.')+'</p><div class="planner-hero-actions">'+button('day-options','Day type & hours','','button ghost')+(display.preview?button('save-preview','Review & save day','','button primary'):button('history','Plan history','','text-button'))+'</div></div></div>'+
      (day.note?'<p class="planner-day-note">'+esc(day.note)+'</p>':'')+
      (evidence.length?'<div class="planner-calendar-evidence"><strong>Work calendar context</strong>'+evidence.map(x=>'<p>'+esc(x.title)+' · '+esc(x.detail)+'</p>').join('')+'<small>Choose the appropriate day type above. A partial-day credit may need a manually adjusted work block. Calendar context is separate from time actually worked.</small></div>':'')+
      '<div class="planner-time-map"><div class="planner-map-heading"><span>One full day</span><span>'+esc(day.timeZone)+' · '+duration(map.minutes)+'</span></div>'+ribbon(day)+mapLabels(day)+'<div class="planner-legend"><span><i style="background:'+colour.sleep+'"></i>Sleep</span><span><i style="background:'+colour.work+'"></i>Work</span><span><i style="background:'+colour.training+'"></i>Your activities</span><span><i class="planner-open-key"></i>Unallocated</span></div></div>'+
      (a.conflicts.length?'<div class="planner-conflicts" role="status"><h3>'+a.conflicts.length+' overlap'+(a.conflicts.length===1?'':'s')+' to review</h3>'+a.conflicts.map(c=>'<p>'+esc(c.message)+'</p>').join('')+'<small>Both commitments remain in the plan. Move one, or keep the overlap deliberately. Sleep is never shortened automatically.</small></div>':'')+
      '<div class="planner-layout"><div><div class="planner-section-head"><h3>Your timeline</h3>'+button('add-slot','+ Add activity','','button primary')+'</div><p class="planner-help">Solid rail: fixed timing. Dotted rail: flexible. Tap any activity to adjust it.</p><div class="planner-agenda">'+(map.rows.length?map.rows.map(row=>{
        const slot=row.slot,event=(row.spill?statuses(row.owner):s).get(slot.id),state=ops().checkoffState(slot,event),status=event?.status,done=status==='done',skipped=status==='skipped',linked=state==='verified';
        return '<button type="button" class="planner-slot '+(slot.fixed?'is-fixed':'is-flexible')+(done?' is-done':'')+(skipped?' is-skipped':'')+(conflictIds.has(slot.id)?' has-conflict':'')+(state==='unverified'?' is-unverified':'')+'" data-planner-action="'+(row.spill?'spill':'slot')+'" data-id="'+esc(slot.id)+'" data-date="'+esc(row.owner)+'" style="--planner-colour:'+colour[slot.category]+'"><span class="planner-slot-time">'+esc(slot.start.date===day.date?slot.start.time:'From '+slot.start.time)+'<small>'+esc(duration((Date.parse(slot.end.at)-Date.parse(slot.start.at))/60000))+'</small></span><span class="planner-slot-node" aria-hidden="true">'+(done?'✓':skipped?'·':'')+'</span><span class="planner-slot-copy"><strong>'+esc(slot.title)+'</strong><small>'+esc(nameOf(categories,slot.category))+(slot.origin==='routine'?' · Routine':'')+' · '+(slot.fixed?'Fixed':'Flexible')+(slot.window?' · usually '+esc(slot.window.start)+' to '+esc(slot.window.end):'')+(row.spill?' · from '+esc(dateLabel(row.owner,{day:'numeric',month:'short'})):'')+(conflictIds.has(slot.id)?' · Overlap':'')+'</small>'+(done||skipped?'<em class="planner-state-'+state+'">'+(state==='verified'?'Done · linked '+esc(evidenceNames[event.evidence.kind]||'record')+' ↗':state==='unverified'?'Checked off · no '+esc(sectionNames[slot.category]||'section')+' record linked':state==='done'?'Checked off in planner':'Skipped in planner')+'</em>':'')+'</span><span class="planner-slot-arrow" aria-hidden="true">›</span></button>';
      }).join(''):'<div class="planner-empty"><span class="planner-empty-orbit" aria-hidden="true">+</span><h3>Space to build from.</h3><p>'+ (p?'Review the preview, or add the first activity.':'Start with your work and sleep preferences, or add an activity directly.')+'</p>'+button(p?'add-slot':'profile',p?'Add an activity':'Set up my week','','button ghost')+'</div>')+'</div>'+
      (day.slots.some(x=>x.cancelled)?'<details class="planner-cancelled"><summary>'+day.slots.filter(x=>x.cancelled).length+' cancelled or moved activities retained</summary>'+day.slots.filter(x=>x.cancelled).map(x=>{const to=movedTo(x,day.date);return '<p>'+esc(x.title)+' · '+esc(x.start.time)+(to?' · moved to '+esc(dateLabel(to,{day:'numeric',month:'short'})):' · cancelled')+'</p>';}).join('')+'</details>':'')+'</div><aside class="planner-aside">'+
      '<section><div class="eyebrow">Plan and record</div><h3>What actually happened</h3><p class="planner-help">Existing records are shown separately. A planner check-off does not log a workout, meal, payment or shift.</p>'+ (actuals.length?actuals.map(x=>'<button class="planner-actual" type="button" data-planner-action="navigate" data-route="'+esc(x.route)+'"><span>'+esc(x.title)+'<small>'+esc(x.detail)+'</small></span><span aria-hidden="true">↗</span></button>').join(''):'<p class="planner-empty-copy">No linked-section records reported for this date yet.</p>')+'<div class="planner-quick-links">'+button('navigate','Log training','data-route="train"','text-button')+button('navigate','Log a meal','data-route="food"','text-button')+button('navigate','Log sleep','data-route="sleep"','text-button')+'</div></section>'+
      '<section><div class="eyebrow">Your foundations</div><h3>'+(p?'A week that fits you.':'Start with what you know.')+'</h3><p class="planner-help">'+(p?(p.value.equipment.length+' equipment entries · '+(p.value.unpaidBreakMinutes===null?'unpaid break unknown':p.value.unpaidBreakMinutes+' minute unpaid break')):'Unknown details can stay blank. Work attendance, contract hours and unpaid breaks stay separate.')+'</p>'+(p?.value.limitations?'<p class="planner-reported"><strong>Your reported limitations</strong>'+esc(p.value.limitations)+'</p>':'')+(p?.value.priorities?'<p class="planner-reported"><strong>Your priorities</strong>'+esc(p.value.priorities)+'</p>':'')+(p?'<p class="planner-help">Equipment and limitations are saved context for future coaching. They do not automatically change existing Training routines or progression.</p>':'')+button('profile','Work, sleep & equipment','','text-button')+'</section>'+
      '<section class="planner-routines"><div class="eyebrow">Routines</div><h3>'+(routineRows().length?'What repeats.':'Give the repeating things a rhythm.')+'</h3><p class="planner-help">A routine is a reusable definition. Each dated occurrence keeps its own identity, so changing a routine never rewrites a day you already saved.</p>'+routineRows().map(r=>'<button type="button" class="planner-routine'+(r.value.status==='active'?'':' is-paused')+'" data-planner-action="routine-edit" data-id="'+esc(r.rootId)+'" style="--planner-colour:'+colour[r.value.category]+'"><span><strong>'+esc(r.value.title)+'</strong><small>'+esc(ruleLabel(r.value))+'</small></span><span aria-hidden="true">›</span></button>').join('')+button('routine-new','+ Add a routine','','button ghost')+'</section>'+
      (notices.length?'<section class="planner-notices"><h3>Before you rely on this plan</h3>'+notices.map(n=>'<p>'+esc(typeof n==='string'?n:n.message||JSON.stringify(n))+'</p>').join('')+'</section>':'')+
      '<p class="planner-footnote">Saved plans, routines, revisions and linked records stay on this device and are included in encrypted backups. Unfinished planner edits are kept on this device and in encrypted backups; they save nothing until you review and confirm them. This stage is a manual planner with routines and exact record links. Automatic replanning and closed-app reminders are still to come.</p></aside></div></section>';
  }
  function show(title,html){api.dialog(title,'<div class="planner-dialog">'+html+'</div>');}
  function errorHtml(error){return '<p id="plannerError" class="planner-error" role="alert">'+esc(error||'')+'</p>';}
  function footer(label='Review changes'){return '<div class="dialog-footer">'+button('pause','Close for now','','button ghost')+'<button type="submit" class="button primary" '+(busy?'disabled':'')+'>'+label+'</button></div>';}
  function weekBounds(of=date()){const weekday=(new Date(of+'T12:00:00Z').getUTCDay()+6)%7,monday=dateAdd(of,-weekday);return {monday,sunday:dateAdd(monday,6)};}
  function openPlan(options={},weekOf=null){
    const C=conductor();if(!C){api.toast('The planning service is not loaded.');return;}const ctx=context(),instant=nowIso(),{monday,sunday}=weekBounds(weekOf||date()),today=planningDay(ctx,instant);
    if(sunday<today){api.toast('This week is history. Choose the current or a coming week to plan.');return;}
    const horizon={from:monday<today?today:monday,to:sunday};const r=C.propose({now:instant,horizon,workspace:ctx.workspace,revision:ctx.revision,options});
    if(!r.ok){api.toast(r.error||'The week could not be proposed.');return;}
    if(weekOf)selectedDate=weekOf;preview=null;restored=null;editor=null;review=null;planReview={proposal:r.proposal,options,selected:new Set(r.proposal.days.filter(d=>!d.unchanged&&d.value).map(d=>d.date))};renderPlanReview();noteDraft();
  }
  function planDayHtml(day){
    const included=planReview.selected.has(day.date),changed=!day.unchanged&&!!day.value;
    const changes=day.changes.filter(c=>c.kind!=='keep');
    return '<section class="planner-plan-day'+(included?' is-included':'')+'"><div class="planner-plan-day-head"><div><strong>'+esc(dateLabel(day.date,{weekday:'long',day:'numeric',month:'short'}))+'</strong><small>'+esc(nameOf(types,day.dayType))+' · '+esc(nameOf(scenarios,day.scenario))+(day.spareMinutes!==null?' · '+esc(duration(Math.max(0,day.spareMinutes)))+' free':'')+'</small></div>'+(changed?button('plan-toggle-day',included?'Included':'Excluded','data-date="'+day.date+'" aria-pressed="'+included+'"','button ghost planner-plan-toggle'):'<span class="planner-plan-nochange">No change</span>')+'</div>'+(day.value?ribbon(day.value):'')+
      (changes.length?'<ul class="planner-plan-changes">'+changes.map(c=>'<li><span class="planner-plan-kind is-'+esc(c.kind)+'">'+esc(changeNames[c.kind]||c.kind)+'</span><span><strong>'+esc(c.title)+'</strong>'+(c.from?'<small>'+esc(c.from)+' → '+esc(c.to)+'</small>':'')+'<small>'+esc(c.reason)+'</small></span></li>').join('')+'</ul>':(changed?'<p class="planner-help">Only anchors and unchanged activities.</p>':''))+
      (day.unscheduled.length?'<div class="planner-plan-unscheduled"><strong>Does not fit</strong>'+day.unscheduled.map(u=>'<p><b>'+esc(u.title)+'</b> '+esc(u.reason)+(u.alternatives.length?'<br><em>Alternatives: '+esc(u.alternatives.join(' · '))+'</em>':'')+'</p>').join('')+'</div>':'')+
      (day.unresolved.length?'<div class="planner-plan-unresolved"><strong>Still unresolved</strong>'+day.unresolved.map(u=>'<p>'+esc(u.title)+' · '+esc(u.reason)+'</p>').join('')+'</div>':'')+
      (day.notices.length?'<div class="planner-notices">'+day.notices.map(n=>'<p>'+esc(n)+'</p>').join('')+'</div>':'')+
      (day.value?'<div class="planner-detail-actions">'+button('plan-preview-day','Preview on the timeline','data-date="'+day.date+'"','text-button')+'</div>':'')+'</section>';
  }
  function renderPlanReview(error=''){
    const p=planReview.proposal,s=p.summary,changedDays=p.days.filter(d=>!d.unchanged&&d.value),unchanged=p.days.filter(d=>d.unchanged||!d.value);
    if(!error&&proposalChanged(proposalToken(p)))error=staleProposalMessage;
    show('A proposed week.','<div id="plannerPlanReview" class="planner-plan"><span class="planner-state is-preview">Proposal · nothing saved</span><p class="planner-intro">'+esc(dateLabel(p.horizon.from,{day:'numeric',month:'short'}))+' to '+esc(dateLabel(p.horizon.to,{day:'numeric',month:'short'}))+'. Sleep, pinned commitments and completed activities are protected. Every change has a reason; nothing here logs a workout, meal, work, money or goal record.</p>'+
      '<div class="planner-review-metrics"><strong>'+s.changed+'<small>days changed</small></strong><strong>'+s.added+'<small>added</small></strong><strong>'+s.moved+'<small>moved</small></strong><strong>'+(s.shortened+s.deferred)+'<small>shortened or deferred</small></strong><strong>'+s.unscheduled+'<small>do not fit</small></strong></div>'+
      '<div class="planner-plan-controls">'+select('planScenario','Plan around',planReview.options.scenario||'',[['','Each day as saved (usual hours by default)'],['usual','Usual attendance'],['intended','Protected finish (intended hours)'],['future','Future commute']])+button('plan-again','Propose again','','button ghost')+'</div>'+
      (p.assumptions.length?'<div class="planner-explanation"><strong>Assumptions to confirm</strong>'+p.assumptions.map(a=>'<p>'+esc(a)+'</p>').join('')+button('profile','Set planning assumptions','','text-button')+'</div>':'')+
      '<h4 class="planner-history-title">Three ways to see the week</h4><div class="planner-scenarios">'+p.scenarios.map(x=>'<div class="planner-scenario'+(x.scenario===(planReview.options.scenario||'usual')?' is-active':'')+'"><strong>'+esc(duration(x.freeMinutes))+'<small>free after sleep, work and travel</small></strong><span>'+esc(x.label)+'</span><small>'+esc(duration(x.workMinutes))+' attendance · '+esc(duration(x.commuteMinutes))+' commuting'+(x.contractMinutes!==null?' · contract '+esc(duration(x.contractMinutes))+' per week':'')+'</small>'+(x.remark?'<em>'+esc(x.remark)+'</em>':'')+(x.notes.length?'<em>'+esc(x.notes.join(' '))+'</em>':'')+'</div>').join('')+'</div>'+
      '<h4 class="planner-history-title">Day by day</h4>'+changedDays.map(planDayHtml).join('')+(unchanged.length?'<p class="planner-help">'+unchanged.map(d=>dateLabel(d.date,{weekday:'short',day:'numeric'})).join(', ')+': no change proposed.</p>':'')+
      (p.queue.length?'<h4 class="planner-history-title">Coming up, with lead times</h4><div class="planner-queue">'+p.queue.map(q=>'<div class="planner-queue-item is-'+esc(q.status)+'"><span class="planner-plan-kind is-'+esc(q.status)+'">'+esc({due:'Due this week',overdue:'Overdue',placed:'In plan','beyond-horizon':'Later',unresolved:'Needs a decision'}[q.status]||q.status)+'</span><span><strong>'+esc(q.title)+'</strong><small>'+esc(q.eventTitle)+' on '+esc(dateLabel(q.eventDate,{day:'numeric',month:'short'}))+' · '+esc(q.reason)+'</small></span></div>').join('')+'</div>':'')+
      errorHtml(error)+'<div class="dialog-footer">'+button('pause','Close for now','','button ghost')+(planReview.selected.size?button('plan-apply','Review '+planReview.selected.size+' day'+(planReview.selected.size===1?'':'s'),'','button primary'):'<span class="planner-help">Include at least one changed day to apply.</span>')+'</div></div>');
  }
  function applyPlan(){
    if(!planReview)return;const p=planReview.proposal,days=p.days.filter(d=>planReview.selected.has(d.date)&&!d.unchanged&&d.value).map(d=>({date:d.date,previousVersionId:d.previousVersionId,versionId:uid('plannerv'),value:copy(d.value)}));
    if(!days.length){api.toast('Include at least one changed day.');return;}
    const entity={policyVersion:p.policyVersion,proposalDigest:p.digest,horizon:copy(p.horizon),days};const c=makeCommand('plan',entity,days[0].previousVersionId);c.versionId=days[0].versionId;
    prepareReview(c,()=>renderPlanReview(),proposalToken(p));
  }
  function openProfile(){
    const p=profile();editor={kind:'profile',data:copy(p?.value||ops().emptyProfile(zone())),previousVersionId:p?.id||null};mark();review=null;renderProfile();noteDraft();
  }
  function renderEquipment(row,index){
    return '<div class="planner-equipment-row" data-planner-equipment="'+esc(row.id)+'"><div class="planner-equipment-heading"><strong>Equipment '+(index+1)+'</strong>'+button('remove-equipment','Remove','data-id="'+esc(row.id)+'"','text-button')+'</div><div class="planner-form-grid">'+field('name','Name',row.name,'maxlength="160" required')+select('location','Location',row.location,[['home','Home'],['gym','Gym'],['other','Other']])+select('availability','Available',row.availability,[['current','Now'],['future','In future']])+field('minKg','Minimum load, kg',row.minKg,'type="number" min="0" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+field('maxKg','Maximum load, kg',row.maxKg,'type="number" min="0" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+field('stepKg','Load increment, kg',row.stepKg,'type="number" min="0.001" max="1000000" step="any" placeholder="Unknown" inputmode="decimal"')+'</div>'+field('note','Details, availability or load convention',row.note,'maxlength="1000" placeholder="Optional"')+'</div>';
  }
  function renderProfile(error=''){
    const p=editor.data;
    show('The shape of your week.','<form id="plannerProfileForm"><p class="planner-intro">Set the constraints first. These are planning preferences, not records of hours worked or sleep already taken. Leave anything unknown blank.</p><details class="planner-form-section" open><summary><span>01</span> Work & time zone</summary>'+field('timeZone','Time zone',p.timeZone,'required maxlength="100" placeholder="Europe/London"')+'<fieldset class="planner-weekdays"><legend>Usual working days</legend>'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>'<label><input type="checkbox" data-planner-weekday="'+(i+1)+'" '+(p.workDays.includes(i+1)?'checked':'')+'><span>'+d+'</span></label>').join('')+'</fieldset><div class="planner-form-grid">'+field('intendedStart','Intended work start',p.intendedStart,'type="time"')+field('intendedEnd','Intended work finish',p.intendedEnd,'type="time"')+field('usualStart','Usual arrival',p.usualStart,'type="time"')+field('usualEnd','Usual departure',p.usualEnd,'type="time"')+field('contractHours','Contract hours per week',p.contractMinutes===null?null:p.contractMinutes/60,'type="number" min="0" max="168" step="any" inputmode="decimal" placeholder="Unknown"')+field('unpaidBreakMinutes','Unpaid break, minutes per day',p.unpaidBreakMinutes,'type="number" min="0" max="1440" step="1" inputmode="numeric" placeholder="Unknown"')+'</div><p class="planner-help">An end time before the start is an overnight shift. Contract hours do not change the time blocked out for attendance. Enter 0 only if there is no unpaid break.</p></details><details class="planner-form-section" open><summary><span>02</span> Protect sleep & transitions</summary><div class="planner-form-grid">'+field('sleepStart','Planned bedtime',p.sleepStart,'type="time"')+field('sleepEnd','Planned wake time',p.sleepEnd,'type="time"')+field('transitionMinutes','Transition buffer, minutes',p.transitionMinutes,'type="number" min="0" max="240" step="1" inputmode="numeric" required')+'</div><p class="planner-help">Choose times that leave enough recovery. Sleep stays visible even on busy or travel days. Buffers leave space either side of work and its commute.</p></details><details class="planner-form-section"><summary><span>03</span> Commute scenarios</summary><div class="planner-form-grid">'+field('commuteMinutesEachWay','Current commute, minutes each way',p.commuteMinutesEachWay,'type="number" min="0" max="720" step="1" inputmode="numeric" placeholder="Unknown"')+field('futureCommuteMinutesEachWay','Future commute, minutes each way',p.futureCommuteMinutesEachWay,'type="number" min="0" max="720" step="1" inputmode="numeric" placeholder="Unknown"')+'</div><p class="planner-help">Future commute is a scenario you select for a day. It does not assume a move date, train availability or usable time on the journey.</p></details><details class="planner-form-section" '+(p.equipment.length?'open':'')+'><summary><span>04</span> Equipment, now & later <small>'+p.equipment.length+'</small></summary><div id="plannerEquipment">'+p.equipment.map(renderEquipment).join('')+'</div>'+button('add-equipment','+ Add equipment','','button ghost')+'<p class="planner-help">Record available loads and increments only when known. Future equipment stays separate from what you can use now.</p></details><details class="planner-form-section"><summary><span>05</span> Priorities & limitations</summary>'+textArea('limitations','Pain, injuries or other limitations to respect',p.limitations)+textArea('priorities','What matters most in this season of life?',p.priorities)+'<p class="planner-help">These are your reports and preferences for future coaching. Saving them does not change your existing Training routines or progression. This planner does not diagnose conditions, prescribe training or approve new spending.</p></details>'+errorHtml(error)+footer('Review setup')+'</form>');
  }
  function readFields(form){const values={};form.querySelectorAll('[data-planner-field]').forEach(el=>{if(!el.closest('[data-planner-equipment]')&&!el.closest('[data-planner-alternative]'))values[el.dataset.plannerField]=el.value;});return values;}
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
  function openOptions(){const display=displayed();editor={kind:'options',data:{dayType:display.value.dayType,scenario:display.value.scenario,note:display.value.note},base:copy(display.value),previousVersionId:display.previousVersionId,sourceDigest:display.sourceDigest??null};mark();review=null;renderOptions();noteDraft();}
  function renderOptions(error=''){
    const evidence=actualsFor(editor.base.date).filter(x=>x.kind==='evidence');
    show('What kind of day is this?','<form id="plannerOptionsForm"><p class="planner-intro">'+esc(dateLabel(editor.base.date))+'. Rebuild sleep, work and commute anchors from your current setup. Manual activities stay in place, so you can see what needs moving.</p>'+(evidence.length?'<div class="planner-explanation"><strong>From your Work calendar</strong>'+evidence.map(x=>'<p>'+esc(x.title)+' · '+esc(x.detail)+'</p>').join('')+'<p>Select the relevant day type explicitly. For partial leave, adjust the remaining work block manually. These credits do not represent time already worked.</p></div>':'')+'<div class="planner-form-grid">'+select('dayType','Day type',editor.data.dayType,types)+select('scenario','Planning scenario',editor.data.scenario,scenarios)+'</div>'+textArea('note','What should this day account for?',editor.data.note,2000)+'<div class="planner-explanation"><strong>Travel, leave, sickness and rest</strong><p>These day types pause the normal work and commute anchors. Sleep stays protected. Add travel itineraries or essential appointments manually. Work pay and leave records remain in Work.</p></div>'+errorHtml(error)+footer('Preview this day')+'</form>');
  }
  function openSlot(id){
    const display=displayed(),slot=display.value.slots.find(s=>s.id===id);if(!slot)return;
    const event=statuses(display.value.date).get(id),elapsed=(Date.parse(slot.end.at)-Date.parse(slot.start.at))/60000,saved=display.saved&&!display.preview,version=slot.anchor?.routineVersionId?routineVersion(slot.anchor.routineVersionId):null,to=movedTo(slot,display.value.date);
    historyEvidence=event?.evidence?[event.evidence]:[];
    const occurrence=slot.origin==='routine'?'<p class="planner-reported"><strong>Routine occurrence</strong>'+esc(version?version.value.title+' · '+ruleLabel(version.value):'Routine version retained in history')+(slot.anchor.date!==display.value.date?' · moved from '+esc(dateLabel(slot.anchor.date,{day:'numeric',month:'short'})):'')+'</p>':slot.anchor?'<p class="planner-reported"><strong>Moved activity</strong>Originally planned for '+esc(dateLabel(slot.anchor.date,{day:'numeric',month:'short'}))+'.</p>':'';
    const checkoff=slot.origin!=='baseline'?'<hr><h4>Plan to action</h4><p class="planner-help">'+(slot.category==='training'?'Open Training to choose and review a suitable workout before starting.':'Start opens the real '+esc(sectionNames[slot.category]||'section')+' flow.')+' Done links the record you actually logged, or records a planner check-off. Neither invents a workout, meal, sleep, work or money record.</p><div class="planner-detail-actions">'+(slot.cancelled?'':button('start-slot',slot.category==='training'?'Open Training':'Start','data-id="'+esc(id)+'"','button primary'))+(slot.cancelled?'':button('done-slot','Done','data-id="'+esc(id)+'"','button primary'))+button('status','Skipped','data-id="'+esc(id)+'" data-status="skipped"')+(event&&event.status!=='reset'?button('status','Reset check-off','data-id="'+esc(id)+'" data-status="reset"'):'')+'</div>'+(event?.evidence?'<p class="planner-reported"><strong>Linked record</strong>'+esc(evidenceLabel(event.evidence))+' '+button('open-evidence','Open record ↗','data-index="0"','text-button')+'</p>':'')+(!saved?'<p class="planner-help">Save the day before checking off or moving an activity.</p>':''):'<hr><p class="planner-help">This is a planned anchor. Record actual sleep or work in its own section.</p>';
    const planning=slot.origin!=='baseline'?'<div class="planner-detail-actions">'+button('edit-slot','Adjust time or title','data-id="'+esc(id)+'"')+button('pin-slot',slot.fixed?'Make flexible':'Pin timing','data-id="'+esc(id)+'"')+(slot.cancelled?'':button('move-slot','Move to another day','data-id="'+esc(id)+'"'))+(version&&version.value.alternatives.length&&!slot.cancelled?button('alternative-slot','Shorter alternative','data-id="'+esc(id)+'"'):'')+(slot.cancelled?'':button('cancel-slot',slot.origin==='routine'?'Cancel this occurrence':'Cancel activity','data-id="'+esc(id)+'"'))+(version?button('routine-edit','Open routine','data-id="'+esc(slot.anchor.routineRootId)+'"','text-button'):'')+'</div>':'';
    show(slot.title,'<div class="planner-slot-detail"><span class="planner-state">'+(display.preview?'Preview · not saved':'Saved plan')+'</span><h3>'+esc(timeLabel(slot.start))+' to '+esc(timeLabel(slot.end))+'</h3><p>'+esc(duration(elapsed))+' · '+esc(nameOf(categories,slot.category))+' · '+(slot.fixed?'Fixed timing':'Flexible timing')+(slot.window?' · usually '+esc(slot.window.start)+' to '+esc(slot.window.end):'')+(slot.cancelled?(to?' · moved to '+esc(dateLabel(to,{day:'numeric',month:'short'})):' · cancelled'):'')+'</p>'+occurrence+(event?'<p class="planner-reported'+(ops().checkoffState(slot,event)==='unverified'?' is-unverified':'')+'"><strong>'+esc(ops().checkoffState(slot,event)==='verified'?'Done · linked record':ops().checkoffState(slot,event)==='unverified'?'Checked off · no '+(sectionNames[slot.category]||'section')+' record linked':nameOf([['done','Checked off in planner'],['skipped','Skipped in planner'],['reset','Check-off reset']],event.status))+'</strong>'+esc(event.note||'No note recorded.')+(ops().checkoffState(slot,event)==='unverified'?' Link the real record from Done, or open '+esc(sectionNames[slot.category]||'the section')+' to log it.':'')+'</p>':'')+(slot.link?button('navigate','Open '+esc(slot.link.label)+' <span aria-hidden="true">↗</span>','data-route="'+esc(slot.link.route)+'"','button ghost')+'<p class="planner-help">Section shortcut only. It does not identify a completed record.</p>':'')+planning+checkoff+'</div>');
  }
  function showDone(id){
    const display=displayed();if(display.preview||!display.saved){api.toast('Review and save this day before checking off activities.');return;}
    const slot=display.value.slots.find(x=>x.id===id);if(!slot)return;if(slot.origin==='baseline'){api.toast('Baseline anchors show planned time. Log sleep or work in its own section.');return;}
    if(statuses(display.value.date).get(id)?.status==='done'){api.toast('This activity is already checked off. Reset it first to change the check-off.');return;}
    const proposed=ops().proposeEvidence(slot,candidates(display.value.date),domain());doneProposals=proposed.ok?proposed.proposals:[];const spec=specialist.includes(slot.category);
    show('Done: '+slot.title,'<div class="planner-done"><p class="planner-intro">'+(slot.category==='training'?'Link the workout record you actually logged. Open Train to log it after choosing and reviewing a suitable workout. A check-off on its own never creates a training record.':spec?'Link the '+esc(sectionNames[slot.category])+' record you actually logged, or open '+esc(sectionNames[slot.category])+' to log it now. A check-off on its own never creates a '+esc(slot.category)+' record.':'Link a matching record if one exists, or check this off as done.')+'</p>'+(doneProposals.length?'<h4>Records on this date</h4>'+doneProposals.map((p,i)=>'<div class="planner-proposal"><span>'+esc(p.title)+'<small>'+esc(p.detail)+' · '+esc(p.reason)+'</small></span>'+button('status','Link & done','data-id="'+esc(id)+'" data-status="done" data-evidence="'+i+'"','button primary')+'</div>').join('')+(proposed.ambiguous?'<p class="planner-help">More than one record fits equally well. Choose deliberately; each record can support one check-off.</p>':''):'<p class="planner-empty-copy">No matching record on this date yet.</p>')+'<div class="planner-detail-actions">'+(spec?button('start-slot',slot.category==='training'?'Open Training':'Open '+esc(sectionNames[slot.category])+' to log it','data-id="'+esc(id)+'"','button ghost'):'')+button('status',spec?'Check off without a record':'Done','data-id="'+esc(id)+'" data-status="done"','button '+(spec?'ghost':'primary'))+'</div></div>');
  }
  function startSlot(id){
    const display=displayed(),slot=id?display.value.slots.find(x=>x.id===id):null;
    if(slot&&statuses(display.value.date).get(slot.id)?.status==='done'){api.toast('Reset this planner check-off before changing its title or timing. The earlier check-off will stay in history.');return;}
    editor={kind:'slot',previousVersionId:display.previousVersionId,sourceDigest:display.sourceDigest??null,base:copy(display.value),slotId:slot?.id||uid('slot'),origin:slot?.origin||'manual',data:{title:slot?.title||'',category:slot?.category||'other',startDate:slot?.start.date||display.value.date,startTime:slot?.start.time||'',endDate:slot?.end.date||display.value.date,endTime:slot?.end.time||'',startOffset:slot?String(slot.start.offsetMinutes):'',endOffset:slot?String(slot.end.offsetMinutes):'',fixed:slot?.fixed||false,route:slot?.link?.route||'',releaseWindow:false},window:slot?.window||null,choices:{}};mark();review=null;renderSlot();noteDraft();
  }
  function offsetSelect(which){const choices=editor.choices[which];return choices?.length?select(which+'Offset','Repeated hour: choose '+which+' occurrence',editor.data[which+'Offset'],[['','Choose explicitly'],...choices.map(c=>[String(c.offsetMinutes),'UTC'+(c.offsetMinutes>=0?'+':'')+(c.offsetMinutes/60)+' · '+c.at.replace('T',' ').slice(0,16)+' UTC'])]):'';}
  function renderSlot(error=''){
    const d=editor.data;
    show(editor.base.slots.some(x=>x.id===editor.slotId)?'Adjust this activity.':'Make room for something.','<form id="plannerSlotForm">'+field('title','Activity',d.title,'required maxlength="200" placeholder="What would you like to make time for?"')+'<div class="planner-form-grid">'+select('category','Area of life',d.category,categories)+select('route','Optional section shortcut',d.route,routes)+field('startDate','Start date',d.startDate,'type="date" required')+field('startTime','Start time',d.startTime,'type="time" required')+field('endDate','End date',d.endDate,'type="date" required')+field('endTime','End time',d.endTime,'type="time" required')+offsetSelect('start')+offsetSelect('end')+'</div><label class="planner-checkbox"><input type="checkbox" data-planner-field="fixed" '+(d.fixed?'checked':'')+'><span>Pin this timing<small>A fixed commitment. Flexible activities can be moved when plans change.</small></span></label>'+(editor.window?'<label class="planner-checkbox"><input type="checkbox" data-planner-field="releaseWindow" '+(d.releaseWindow?'checked':'')+'><span>Allow this occurrence outside its usual window<small>Usually '+esc(editor.window.start)+' to '+esc(editor.window.end)+'. The routine keeps its window; only this occurrence is released.</small></span></label>':'')+'<p class="planner-help">'+esc(editor.base.timeZone)+'. For an overnight activity, choose the following date for its end. Overlaps remain visible for you to review. A shortcut opens a section; it does not identify a completed record.</p>'+errorHtml(error)+footer('Review activity')+'</form>');
  }
  function syncSlot(){const form=$('plannerSlotForm');if(!form||editor?.kind!=='slot')return;const v=readFields(form);Object.keys(v).forEach(k=>editor.data[k]=v[k]);editor.data.fixed=form.querySelector('[data-planner-field="fixed"]').checked;const release=form.querySelector('[data-planner-field="releaseWindow"]');editor.data.releaseWindow=!!release?.checked;}
  function showStatus(id,status,evidence=null){
    const display=displayed();if(display.preview||!display.saved){api.toast('Review and save this day before checking off activities.');return;}
    const slot=display.value.slots.find(x=>x.id===id);if(!slot)return;if(slot.origin==='baseline'){api.toast('Baseline anchors show planned time. Log sleep or work in its own section.');return;}
    editor={kind:'status',data:{dayRootId:display.value.date,slotId:id,status,note:'',evidence:evidence?{kind:evidence.kind,rootId:evidence.rootId,versionId:evidence.versionId,date:evidence.date}:null},previousVersionId:display.saved.id,title:slot.title,evidenceTitle:evidence?.title||null};mark();review=null;renderStatus();noteDraft();
  }
  function renderStatus(){const d=editor.data;show('A planner check-off.','<form id="plannerStatusForm"><p class="planner-intro">'+esc(editor.title)+' · '+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset check-off']],d.status))+'. '+(d.evidence?'Linked to '+esc(editor.evidenceTitle||evidenceNames[d.evidence.kind]||'a record')+'. That record stays exactly as logged in its own section.':'Your actual activity records are unchanged.')+'</p>'+textArea('note','How did it go? Any reason to adjust the plan?',d.note,2000)+errorHtml()+footer('Review check-off')+'</form>');}
  function showMove(id){
    const display=displayed();if(display.preview||!display.saved){api.toast('Review and save this day before moving an activity.');return;}
    const slot=display.value.slots.find(x=>x.id===id);if(!slot||slot.origin==='baseline'||slot.cancelled)return;
    if(statuses(display.value.date).get(id)?.status==='done'){api.toast('Reset this planner check-off before moving the activity.');return;}
    editor={kind:'move',slotId:id,sourceDigest:display.sourceDigest??null,base:copy(display.value),fromVersionId:display.saved.id,data:{date:dateAdd(display.value.date,1),startTime:slot.start.time,endTime:slot.end.time,startOffset:'',endOffset:''},choices:{}};mark();review=null;renderMove();noteDraft();
  }
  function renderMove(error=''){
    const slot=editor.base.slots.find(x=>x.id===editor.slotId),d=editor.data;
    show('Move '+slot.title+' to another day.','<form id="plannerMoveForm"><p class="planner-intro">The activity keeps its identity. '+esc(dateLabel(editor.base.date))+' will retain it as moved, with any check-off history, and the chosen day receives it.</p><div class="planner-form-grid">'+field('date','Move to',d.date,'type="date" required')+field('startTime','Start time',d.startTime,'type="time" required')+field('endTime','End time',d.endTime,'type="time" required')+offsetSelect('start')+offsetSelect('end')+'</div><p class="planner-help">'+esc(editor.base.timeZone)+'. An end time before the start finishes on the following day.</p>'+errorHtml(error)+footer('Review move')+'</form>');
  }
  function syncMove(){const form=$('plannerMoveForm');if(!form||editor?.kind!=='move')return;const v=readFields(form);Object.keys(v).forEach(k=>editor.data[k]=v[k]);}
  function showAlternative(id){
    const display=displayed(),slot=display.value.slots.find(x=>x.id===id),version=slot?.anchor?.routineVersionId?routineVersion(slot.anchor.routineVersionId):null;if(!slot||!version||!version.value.alternatives.length)return;
    if(statuses(display.value.date).get(id)?.status==='done'){api.toast('Reset this planner check-off before choosing an alternative.');return;}
    editor={kind:'alternative',slotId:id,sourceDigest:display.sourceDigest??null,base:copy(display.value),previousVersionId:display.previousVersionId,alternatives:copy(version.value.alternatives),title:version.value.title};mark();review=null;renderAlternative();noteDraft();
  }
  function renderAlternative(){show('A shorter or different version.','<div class="planner-alternatives"><p class="planner-intro">Approved alternatives for '+esc(editor.title||'this routine')+'. Choosing one changes this occurrence only; the routine and other days are untouched.</p>'+editor.alternatives.map(a=>'<div class="planner-proposal"><span>'+esc(a.title)+'<small>'+esc(duration(a.durationMinutes))+(a.note?' · '+esc(a.note):'')+'</small></span>'+button('apply-alternative','Use this','data-alt="'+esc(a.id)+'"','button primary')+'</div>').join('')+'<div class="dialog-footer">'+button('pause','Keep as planned','','button ghost')+'</div></div>');}
  function applyAlternative(altId){
    if(editor?.kind!=='alternative')return;const alt=editor.alternatives.find(a=>a.id===altId);if(!alt)return;const value=copy(editor.base),slot=value.slots.find(x=>x.id===editor.slotId);
    let startAt=Date.parse(slot.start.at);if(slot.window){const minutesIn=(Number(slot.start.time.slice(0,2))*60+Number(slot.start.time.slice(3)))-(Number(slot.window.start.slice(0,2))*60+Number(slot.window.start.slice(3))),room=(Number(slot.window.end.slice(0,2))*60+Number(slot.window.end.slice(3)))-(Number(slot.start.time.slice(0,2))*60+Number(slot.start.time.slice(3)));if(room<alt.durationMinutes)startAt-=Math.min(minutesIn,alt.durationMinutes-room)*60000;}
    const start=ops().endpointAt(startAt,value.timeZone),end=ops().endpointAt(startAt+alt.durationMinutes*60000,value.timeZone);if(!start.ok||!end.ok){setError(start.error||end.error);return;}
    slot.title=alt.title;slot.start=start.endpoint;slot.end=end.endpoint;const previous=editor.previousVersionId,sourceDigest=editor.sourceDigest;editor=null;prepareReview(makeCommand('day',value,previous),null,sourceDigest);
  }
  function emptyRoutine(){return {rootId:uid('routine'),title:'',category:'goal',link:null,durationMinutes:30,window:{start:'18:00',end:'21:00'},fixed:false,recurrence:{frequency:'weekly',interval:1,weekdays:[],startDate:context().today,endDate:null},exceptions:[],dayTypes:['normal','travel','leave','sick','rest'],alternatives:[],status:'active',effectiveFrom:context().today,note:''};}
  function openRoutine(rootId){
    const current=rootId?ops().currentRoutine(domain(),rootId):null,value=current?copy(current.value):emptyRoutine();
    if(current)value.effectiveFrom=current.value.effectiveFrom>context().today?current.value.effectiveFrom:context().today;
    editor={kind:'routine',rootId:value.rootId,previousVersionId:current?.id||null,data:value};mark();review=null;renderRoutine();noteDraft();
  }
  function renderAlternativeRow(row,index){return '<div class="planner-equipment-row" data-planner-alternative="'+esc(row.id)+'"><div class="planner-equipment-heading"><strong>Alternative '+(index+1)+'</strong>'+button('remove-alternative','Remove','data-id="'+esc(row.id)+'"','text-button')+'</div><div class="planner-form-grid">'+field('title','Title',row.title,'maxlength="200" required')+field('durationMinutes','Minutes',row.durationMinutes,'type="number" min="1" max="1440" step="1" inputmode="numeric" required')+'</div>'+field('note','When to use it',row.note,'maxlength="1000" placeholder="Optional"')+'</div>';}
  function renderRoutine(error=''){
    const v=editor.data,r=v.recurrence,change=!!editor.previousVersionId;
    show(change?'Change this routine.':'A new routine.','<form id="plannerRoutineForm"><p class="planner-intro">'+(change?'This saves a new version that applies from the date you choose. Days you already saved keep their occurrences; rebuild a day to add missing ones.':'Occurrences appear when you preview or rebuild a day on or after the start date. Nothing is scheduled automatically.')+'</p>'+field('title','What repeats?',v.title,'required maxlength="200" placeholder="Read, stretch, tidy the kitchen"')+'<div class="planner-form-grid">'+select('category','Area of life',v.category,routineCategories)+select('route','Optional section shortcut',v.link?.route||'',routes)+field('durationMinutes','Usual length, minutes',v.durationMinutes,'type="number" min="1" max="1440" step="1" inputmode="numeric" required')+select('fixed','Timing',v.fixed?'fixed':'flexible',[['flexible','Flexible within its window'],['fixed','Pinned at the window start']])+field('windowStart','Window opens',v.window.start,'type="time" required')+field('windowEnd','Window closes',v.window.end,'type="time" required')+'</div><p class="planner-help">A window is the acceptable range, not an exact minute. Each occurrence is placed at the window start and can be moved within the day.</p><details class="planner-form-section" open><summary><span>01</span> How often</summary><div class="planner-form-grid">'+select('frequency','Repeat',r.frequency,[['weekly','Weekly'],['daily','Daily']])+field('interval','Every',r.interval,'type="number" min="1" max="52" step="1" inputmode="numeric" required')+field('startDate','Start date',r.startDate,'type="date" required')+field('endDate','End date, optional',r.endDate,'type="date"')+'</div><fieldset class="planner-weekdays"><legend>Weekdays (weekly routines)</legend>'+weekdayNames.map((d,i)=>'<label><input type="checkbox" data-planner-weekday="'+(i+1)+'" '+(r.weekdays.includes(i+1)?'checked':'')+'><span>'+d+'</span></label>').join('')+'</fieldset><fieldset class="planner-weekdays"><legend>On which day types</legend>'+types.map(([id,label])=>'<label><input type="checkbox" data-planner-daytype="'+id+'" '+(v.dayTypes.includes(id)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</fieldset>'+textArea('exceptions','Skip these dates, one per line',v.exceptions.join('\n'),12000)+'</details><details class="planner-form-section" '+(v.alternatives.length?'open':'')+'><summary><span>02</span> Approved alternatives <small>'+v.alternatives.length+'</small></summary><div id="plannerAlternatives">'+v.alternatives.map(renderAlternativeRow).join('')+'</div>'+button('add-alternative','+ Add a shorter version','','button ghost')+'<p class="planner-help">A shorter version keeps the intention on a squeezed day. It is chosen per occurrence, never applied automatically.</p></details><details class="planner-form-section" open><summary><span>03</span> Status and start</summary><div class="planner-form-grid">'+select('status','Status',v.status,[['active','Active'],['paused','Paused'],['ended','Ended']])+field('effectiveFrom',change?'Apply changes from':'Rules apply from',v.effectiveFrom,'type="date" required')+'</div><p class="planner-help">'+(change?'Earlier dates keep the earlier rule. This cannot be before the previous version applied.':'Pausing later keeps every occurrence you already saved.')+'</p>'+textArea('note','Notes',v.note)+'</details>'+errorHtml(error)+footer(change?'Review change':'Review routine')+'</form>');
  }
  function syncRoutine(){
    const form=$('plannerRoutineForm');if(!form||editor?.kind!=='routine')return;const f=readFields(form),v=editor.data;
    v.title=f.title;v.category=f.category;v.link=f.route?{route:f.route,label:nameOf(routes,f.route)}:null;v.durationMinutes=nullableNumber(f.durationMinutes);v.fixed=f.fixed==='fixed';v.window={start:f.windowStart||'',end:f.windowEnd||''};
    v.recurrence={frequency:f.frequency,interval:nullableNumber(f.interval),weekdays:f.frequency==='daily'?[]:[...form.querySelectorAll('[data-planner-weekday]:checked')].map(el=>Number(el.dataset.plannerWeekday)).sort((a,b)=>a-b),startDate:f.startDate||'',endDate:f.endDate||null};
    v.exceptions=[...new Set(String(f.exceptions||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean))].sort();v.dayTypes=[...form.querySelectorAll('[data-planner-daytype]:checked')].map(el=>el.dataset.plannerDaytype);
    v.status=f.status;v.effectiveFrom=f.effectiveFrom||'';v.note=f.note;
    form.querySelectorAll('[data-planner-alternative]').forEach(row=>{const item=v.alternatives.find(x=>x.id===row.dataset.plannerAlternative);if(item)row.querySelectorAll('[data-planner-field]').forEach(el=>{const k=el.dataset.plannerField;item[k]=k==='durationMinutes'?nullableNumber(el.value):el.value;});});
  }
  function quickRoutineStatus(rootId,status){
    const current=ops().currentRoutine(domain(),rootId);if(!current)return;const value=copy(current.value);value.status=status;value.effectiveFrom=current.value.effectiveFrom>context().today?current.value.effectiveFrom:context().today;
    editor=null;prepareReview(makeCommand('routine',value,current.id),()=>openRoutine(rootId));
  }
  function makeCommand(operation,entity,previousVersionId){return {contract:'lifeos-planner/1',operation,operationId:uid('plannerop'),versionId:uid(operation==='status'?'plannerevent':'plannerv'),recordedAt:new Date().toISOString(),expected:{workspaceRevision:context().revision,previousVersionId},entity:copy(entity)};}
  async function prepareReview(command,back,sourceDigest){
    if(busy)return false;busy=true;let ok=false;
    const wasOpen=$('dialog')?.open===true,formId=['plannerProfileForm','plannerSlotForm','plannerStatusForm'].find(id=>$(id)),formNode=formId?$(formId):null;
    try{
      flushDraft();const flushed=await api.flush();if(flushed?.ok===false)throw new Error(flushed.error||'Earlier changes could not be saved. Your planner edit is retained.');
      // A conductor proposal and every day edited from it are checked against the decision inputs they read.
      // Rebasing over changed sleep, work, meals or actual records would silently apply a stale plan.
      if(proposalChanged(sourceDigest))throw new Error(staleProposalMessage);
      command.expected.workspaceRevision=context().revision;
      const prepared=ops().prepare(command,context());if(!prepared.ok)throw new Error(prepared.error||'This change could not be prepared.');
      review={prepared,command:copy(prepared.command||command),sourceDigest:sourceDigest??null,digestAtReview:workspaceDigest(),back,error:''};ok=true;
      if(!wasOpen||($('dialog')?.open&&(!formId||$(formId)===formNode)))renderReview();
      noteDraft();
    }catch(error){setError(error.message);}
    finally{busy=false;setBusy(false);}
    return ok;
  }
  function reviewRows(day){return day.slots.filter(s=>!s.cancelled).sort((a,b)=>Date.parse(a.start.at)-Date.parse(b.start.at)||Date.parse(a.end.at)-Date.parse(b.end.at)).map(s=>'<div class="planner-review-row"><span>'+esc(s.title)+'<small>'+esc(nameOf(categories,s.category))+' · '+(s.fixed?'Fixed':'Flexible')+'</small></span><strong>'+esc(timeLabel(s.start))+'<small>to '+esc(timeLabel(s.end))+'</small></strong></div>').join('');}
  function profileReview(p){
    const unknown=x=>x===null?'Unknown':String(x);
    return '<div class="planner-review-row"><span>Time zone</span><strong>'+esc(p.timeZone)+'</strong></div><div class="planner-review-row"><span>Working days</span><strong>'+esc(p.workDays.map(d=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d-1]).join(', ')||'None selected')+'</strong></div><div class="planner-review-row"><span>Usual attendance<small>Intended planning hours: '+esc(unknown(p.intendedStart))+' to '+esc(unknown(p.intendedEnd))+'</small></span><strong>'+esc(unknown(p.usualStart))+' to '+esc(unknown(p.usualEnd))+'</strong></div><div class="planner-review-row"><span>Weekly contract<small>Unpaid break: '+esc(unknown(p.unpaidBreakMinutes))+' min/day</small></span><strong>'+(p.contractMinutes===null?'Unknown':esc(duration(p.contractMinutes)))+'</strong></div><div class="planner-review-row"><span>Sleep preference</span><strong>'+esc(unknown(p.sleepStart))+' to '+esc(unknown(p.sleepEnd))+'</strong></div><div class="planner-review-row"><span>Commute, each way<small>Future: '+esc(unknown(p.futureCommuteMinutesEachWay))+' min</small></span><strong>'+esc(unknown(p.commuteMinutesEachWay))+' min</strong></div><div class="planner-review-row"><span>Transition buffer</span><strong>'+esc(p.transitionMinutes)+' min</strong></div>'+p.equipment.map(e=>'<div class="planner-review-row"><span>'+esc(e.name)+'<small>'+esc(e.location)+' · '+esc(e.availability)+' · '+esc(e.note)+'</small></span><strong>'+esc(unknown(e.minKg))+' to '+esc(unknown(e.maxKg))+' kg<small>Increment: '+esc(unknown(e.stepKg))+' kg</small></strong></div>').join('')+(p.limitations?'<p class="planner-reported"><strong>Reported limitations</strong>'+esc(p.limitations)+'</p>':'')+(p.priorities?'<p class="planner-reported"><strong>Priorities</strong>'+esc(p.priorities)+'</p>':'');
  }
  function routineReview(v){return '<div class="planner-review-row"><span>Routine</span><strong>'+esc(v.title)+'<small>'+esc(nameOf(categories,v.category))+(v.link?' · opens '+esc(v.link.label):'')+'</small></strong></div><div class="planner-review-row"><span>Rhythm</span><strong>'+esc(ruleLabel(v))+'</strong></div><div class="planner-review-row"><span>Applies from<small>'+esc(v.status)+(v.exceptions.length?' · '+v.exceptions.length+' skipped dates':'')+'</small></span><strong>'+esc(dateLabel(v.effectiveFrom,{day:'numeric',month:'short',year:'numeric'}))+'</strong></div><div class="planner-review-row"><span>Day types</span><strong>'+esc(v.dayTypes.map(t=>nameOf(types,t)).join(', '))+'</strong></div>'+v.alternatives.map(a=>'<div class="planner-review-row"><span>Alternative</span><strong>'+esc(a.title)+'<small>'+esc(duration(a.durationMinutes))+'</small></strong></div>').join('');}
  function renderReview(error=review?.error||''){
    const r=review,p=r.prepared,e=r.command.entity,kind=r.command.operation,a=kind==='day'?analysis(e):kind==='move'?analysis(e.target):null;
    if(!error&&proposalChanged(r.sourceDigest))error=staleProposalMessage;
    const intro=kind==='plan'?'This saves a new version of '+e.days.length+' day'+(e.days.length===1?'':'s')+' from the proposal. Completed and pinned activities are unchanged and earlier versions stay in history.':kind==='profile'?'This becomes your current setup. Every saved day keeps the setup and timing it already recorded.':kind==='routine'?'This saves a routine version. Days you already saved are not rewritten.':kind==='day'?'This saves a new version of '+esc(dateLabel(e.date))+'. Previous versions stay in history.':kind==='move'?'This moves the activity to '+esc(dateLabel(e.target.date))+'. '+esc(dateLabel(e.fromDate))+' keeps it as moved.':e.evidence?'This records a check-off linked to an existing record. That record is unchanged and counts once.':'This records a planner check-off only. Actual logs in other sections are unchanged.';
    const body=kind==='plan'?e.days.map(d=>'<div class="planner-review-row"><span>'+esc(dateLabel(d.date,{weekday:'long',day:'numeric',month:'short'}))+'<small>'+d.value.slots.filter(s=>!s.cancelled&&s.origin!=='baseline').length+' activities · '+esc(nameOf(types,d.value.dayType))+'</small></span><strong>'+(p.summary?.days?.find(x=>x.date===d.date)?esc(duration(p.summary.days.find(x=>x.date===d.date).freeMinutes))+'<small>unallocated</small>':'')+'</strong></div>'+ribbon(d.value)).join(''):kind==='profile'?profileReview(e):kind==='routine'?routineReview(e):kind==='day'?'<div class="planner-review-metrics"><strong>'+esc(duration(a.occupiedMinutes))+'<small>allocated</small></strong><strong>'+esc(duration(a.freeMinutes))+'<small>unallocated</small></strong></div>'+ribbon(e)+reviewRows(e):kind==='move'?'<h4 class="planner-history-title">'+esc(dateLabel(e.target.date,{weekday:'long',day:'numeric',month:'long'}))+'</h4>'+ribbon(e.target)+reviewRows(e.target):'<div class="planner-review-row"><span>'+esc(editor?.title||'Planner activity')+'</span><strong>'+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset']],e.status))+'</strong></div>'+(e.evidence?'<div class="planner-review-row"><span>Linked record</span><strong>'+esc(editor?.evidenceTitle||evidenceNames[e.evidence.kind]||e.evidence.kind)+'<small>'+esc(evidenceLabel(e.evidence))+'</small></strong></div>':'')+'<p>'+esc(e.note||'No note')+'</p>';
    show('Review before saving.','<div id="plannerReview"><span class="planner-state is-preview">Not saved yet</span><p class="planner-intro">'+intro+'</p>'+body+(a?.conflicts.length?'<div class="planner-conflicts"><h3>Keep these overlaps deliberately?</h3>'+a.conflicts.map(c=>'<p>'+esc(c.message)+'</p>').join('')+'<small>Saving keeps both commitments. You can return and adjust their times first.</small></div>':'')+((p.summary?.notices||[]).length?'<div class="planner-notices">'+p.summary.notices.map(n=>'<p>'+esc(typeof n==='string'?n:n.message||JSON.stringify(n))+'</p>').join('')+'</div>':'')+errorHtml(error)+'<div class="dialog-footer">'+button('review-back','Back to edit','','button ghost')+button('commit','Save '+(kind==='profile'?'setup':kind==='routine'?'routine':kind==='day'?'day plan':kind==='move'?'move':kind==='plan'?'plan':'check-off'),'','button primary')+'</div></div>');
  }
  function setError(message){const el=$('plannerError');if(el&&$('dialog')?.open){el.textContent=message;el.scrollIntoView?.({block:'nearest'});}else api.toast(message);}
  function setBusy(value){document.querySelectorAll('.planner-dialog button[type="submit"],.planner-dialog [data-planner-action="commit"]').forEach(el=>el.disabled=value);}
  async function commit(){
    if(busy||!review)return;busy=true;setBusy(true);const chosen=review,reviewNode=$('plannerReview'),keepPlan=chosen.command.operation==='plan'?null:planReview;
    try{
      settleDraft();const flushed=await api.flush();if(flushed?.ok===false)throw new Error(flushed.error||'Earlier changes could not be saved. Your reviewed edit is retained.');
      if(proposalChanged(chosen.sourceDigest))throw new Error(staleProposalMessage);
      // Only the kept draft may have changed since review: then the reviewed change moves to the current revision and the engine re-checks every predecessor.
      // Any other change keeps the reviewed revision, so the runtime refuses the save and asks for a fresh review, exactly as before drafts were kept.
      const command=copy(chosen.command);let reviewDigest=chosen.prepared.reviewDigest;
      if(workspaceDigest()===chosen.digestAtReview&&command.expected.workspaceRevision!==context().revision){
        command.expected.workspaceRevision=context().revision;const prepared=ops().prepare(command,context());
        if(!prepared.ok)throw new Error(prepared.error||'Review this change again before saving.');
        if(prepared.status!=='already-committed'&&JSON.stringify(prepared.command.entity)!==JSON.stringify(chosen.command.entity))throw new Error('This change differs from the one reviewed. Review it again before saving.');
        reviewDigest=prepared.reviewDigest;
      }
      const result=await api.commit(command,reviewDigest,{clearDraft:true});
      if(!result?.ok)throw new Error(result?.error||'The change was not saved. Your edit is retained.');
      preview=null;review=null;editor=null;restored=null;liveEnvelope=null;persisted=null;planReview=keepPlan;if(keepPlan)noteDraft();if($('plannerReview')===reviewNode)api.closeDialog();api.render();api.toast('Planner changes saved on this device.');
    }catch(error){if(review===chosen){review.error=error.message+' Your reviewed edit is still here.';if($('dialog')?.open&&$('plannerReview')===reviewNode)renderReview();}else setError(error.message);}
    finally{busy=false;setBusy(false);}
  }
  function renderHistory(){
    const rows=domain().days.filter(x=>x.rootId===date()).slice().reverse(),events=domain().events.filter(x=>x.dayRootId===date()).slice().reverse();historyEvidence=events.map(e=>e.evidence||null);
    show('Your plan, through its changes.','<p class="planner-intro">'+esc(dateLabel(date()))+'. Earlier versions are retained exactly as saved. Editing your setup or a routine never rewrites these plans.</p><div class="planner-history">'+(rows.length?rows.map((row,i)=>'<details '+(!i?'open':'')+'><summary><span>'+(i?'Earlier version':'Current version')+'<small>'+esc(new Date(row.recordedAt).toLocaleString('en-GB'))+'</small></span><strong>'+row.value.slots.filter(s=>!s.cancelled).length+' activities</strong></summary>'+reviewRows(row.value)+(row.value.slots.some(s=>s.cancelled)?'<p class="planner-help">'+row.value.slots.filter(s=>s.cancelled).map(s=>{const to=i?null:movedTo(s,row.value.date);return esc(s.title)+(to?' moved to '+esc(dateLabel(to,{day:'numeric',month:'short'})):' cancelled');}).join(' · ')+'.</p>':'')+'</details>').join(''):'<p>No saved versions for this date yet.</p>')+'</div>'+(events.length?'<h3 class="planner-history-title">Planner check-offs</h3>'+events.map((e,n)=>{const slot=rows.find(r=>r.id===e.dayVersionId)?.value.slots.find(s=>s.id===e.slotId);return '<div class="planner-review-row"><span>'+esc(slot?.title||'Retained activity')+'<small>'+esc(e.note)+(e.evidence?' · linked '+esc(evidenceLabel(e.evidence))+' ':'')+'</small>'+(e.evidence?button('open-evidence','Open record ↗','data-index="'+n+'"','text-button'):'')+'</span><strong>'+esc(nameOf([['done','Done'],['skipped','Skipped'],['reset','Reset']],e.status))+'<small>'+esc(new Date(e.recordedAt).toLocaleString('en-GB'))+'</small></strong></div>';}).join(''):''));
  }
  function resume(){if(draftIssue){api.toast('This kept draft cannot be read, so nothing from it will be applied. Discard it to continue.');return;}if(restored)return resumeRestored();if(review)return renderReview();if(editor)return renderEditor();if(preview&&(!planReview||preview.date!==date())){selectedDate=preview.date;noteDraft();api.closeDialog();api.render();return;}if(planReview)renderPlanReview();}
  function handleClick(target){return scoped(()=>handleAction(target));}
  function handleAction(target){
    const el=target?.closest?.('[data-planner-action]');if(!el||!api)return false;const action=el.dataset.plannerAction;
    if(busy)return true;
    if(starters.has(action)&&kept()){api.toast('Resume or discard your unfinished '+kept()+' first.');return true;}
    if(action==='select-day')setDate(el.dataset.date);
    else if(action==='today')setDate(context().today);
    else if(action==='previous-week')setDate(dateAdd(date(),-7));
    else if(action==='next-week')setDate(dateAdd(date(),7));
    else if(action==='profile')openProfile();
    else if(action==='day-options')openOptions();
    else if(action==='save-preview'){const d=displayed();prepareReview(makeCommand('day',d.value,d.previousVersionId),null,d.sourceDigest);}
    else if(action==='add-slot')startSlot();
    else if(action==='slot')openSlot(el.dataset.id);
    else if(action==='spill')setDate(el.dataset.date);
    else if(action==='edit-slot')startSlot(el.dataset.id);
    else if(action==='pin-slot'||action==='cancel-slot'){
      const d=displayed(),value=copy(d.value),slot=value.slots.find(x=>x.id===el.dataset.id);if(!slot)return true;
      if(action==='pin-slot')slot.fixed=!slot.fixed;else slot.cancelled=true;
      editor=null;prepareReview(makeCommand('day',value,d.previousVersionId),null,d.sourceDigest);
    }
    else if(action==='status')showStatus(el.dataset.id,el.dataset.status,el.dataset.evidence!==undefined?doneProposals[Number(el.dataset.evidence)]||null:null);
    else if(action==='done-slot')showDone(el.dataset.id);
    else if(action==='plan-week')openPlan({});
    else if(action==='plan-again'){const scenario=$('dialog')?.querySelector?.('[data-planner-field="planScenario"]')?.value??(planReview?.options.scenario||restored?.intent?.options?.scenario||'');
      // A stale proposal is re-proposed for the week that can still be planned: if its week has become history, plan the current week instead of refusing. The selection moves only when the fresh proposal succeeds.
      const today=planningDay(context(),nowIso());openPlan(scenario?{scenario}:{},today&&weekBounds().sunday<today?today:null);}
    else if(action==='plan-toggle-day'){if(planReview){if(planReview.selected.has(el.dataset.date))planReview.selected.delete(el.dataset.date);else planReview.selected.add(el.dataset.date);renderPlanReview();noteDraft();}}
    else if(action==='plan-apply')applyPlan();
    else if(action==='plan-preview-day'){if(preview){if(preview.date!==el.dataset.date){api.toast('Resume or discard your unfinished day preview before replacing it with another day.');return true;}selectedDate=preview.date;noteDraft();api.closeDialog();api.render();return true;}const d=planReview?.proposal.days.find(x=>x.date===el.dataset.date);if(d&&d.value){preview={date:d.date,value:copy(d.value),notices:['Proposed by the planner. Review & save keeps this day only; a day that receives an activity from another day must be applied with that day.'],previousVersionId:d.previousVersionId,sourceDigest:proposalToken(planReview.proposal)};selectedDate=d.date;noteDraft();api.closeDialog();api.render();}}
    else if(action==='start-slot'){const d=displayed(),slot=d.value.slots.find(x=>x.id===el.dataset.id);if(proposalChanged(d.sourceDigest)){api.toast(staleProposalMessage);return true;}if(slot&&api.start){api.closeDialog();editor=null;review=null;api.start(copy(slot),d.value.date);}}
    else if(action==='open-evidence'){const ref=historyEvidence[Number(el.dataset.index)];if(ref&&api.openEvidence)api.openEvidence(copy(ref));}
    else if(action==='open-slot-on'){setDate(el.dataset.date);openSlot(el.dataset.slot);}
    else if(action==='move-slot')showMove(el.dataset.id);
    else if(action==='alternative-slot')showAlternative(el.dataset.id);
    else if(action==='apply-alternative')applyAlternative(el.dataset.alt);
    else if(action==='routine-new')openRoutine(null);
    else if(action==='routine-edit')openRoutine(el.dataset.id);
    else if(action==='routine-status')quickRoutineStatus(el.dataset.id,el.dataset.status);
    else if(action==='add-alternative'){syncRoutine();editor.data.alternatives.push({id:uid('alt'),title:'',durationMinutes:10,note:''});renderRoutine();const details=$('plannerAlternatives')?.closest('details');if(details)details.open=true;noteDraft();}
    else if(action==='remove-alternative'){syncRoutine();editor.data.alternatives=editor.data.alternatives.filter(x=>x.id!==el.dataset.id);renderRoutine();noteDraft();}
    else if(action==='add-equipment'){syncProfile();editor.data.equipment.push({id:uid('equipment'),name:'',location:'home',availability:'current',minKg:null,maxKg:null,stepKg:null,note:''});renderProfile();const details=$('plannerEquipment')?.closest('details');if(details)details.open=true;noteDraft();}
    else if(action==='remove-equipment'){syncProfile();editor.data.equipment=editor.data.equipment.filter(x=>x.id!==el.dataset.id);renderProfile();noteDraft();}
    else if(action==='commit')commit();
    else if(action==='review-back'){const back=review?.back;review=null;noteDraft();if(back)back();else{api.closeDialog();api.render();}}
    else if(action==='resume')resume();
    else if(action==='draft-continue'){if(restored)continueRestored(restored);}
    else if(action==='discard'){editor=null;review=null;planReview=null;restored=null;preview=null;draftIssue=null;doneProposals=[];liveEnvelope=null;persisted=null;pendingDraft=null;flushDraft();if($('dialog')?.open)api.closeDialog();api.render();}
    else if(action==='pause'){syncProfile();syncSlot();syncRoutine();syncMove();flushDraft();api.closeDialog();api.render();}
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
    if(event.target.closest?.('#plannerRoutineForm'))syncRoutine();
    if(event.target.closest?.('#plannerMoveForm')){if(['date','startTime','endTime'].includes(event.target.dataset.plannerField)){editor.data.startOffset='';editor.data.endOffset='';editor.choices={};}syncMove();}
    if(editor&&plannerForms.some(id=>event.target.closest?.('#'+id)))noteDraft();
  });
  document.addEventListener('change',event=>{
    if(event.target.closest?.('#plannerProfileForm'))syncProfile();
    if(event.target.closest?.('#plannerSlotForm'))syncSlot();
    if(event.target.closest?.('#plannerOptionsForm')&&editor?.kind==='options')editor.data=readFields($('plannerOptionsForm'));
    if(event.target.closest?.('#plannerRoutineForm'))syncRoutine();
    if(event.target.closest?.('#plannerMoveForm'))syncMove();
    if(editor&&plannerForms.some(id=>event.target.closest?.('#'+id)))noteDraft();
  });
  document.addEventListener('close',event=>{if(event.target.id==='dialog'&&api&&hasDraft()){syncProfile();syncSlot();syncRoutine();syncMove();flushDraft();api.render();}},true);
  document.addEventListener('submit',event=>{const form=event.target;if(!['plannerProfileForm','plannerOptionsForm','plannerSlotForm','plannerStatusForm','plannerDateForm','plannerRoutineForm','plannerMoveForm'].includes(form?.id))return;scoped(()=>submitForm(event));});
  function submitForm(event){
    const form=event.target;if(!['plannerProfileForm','plannerOptionsForm','plannerSlotForm','plannerStatusForm','plannerDateForm','plannerRoutineForm','plannerMoveForm'].includes(form.id))return;event.preventDefault();if(busy)return;setBusy(true);
    try{
      if(form.id==='plannerProfileForm'){syncProfile();prepareReview(makeCommand('profile',editor.data,editor.previousVersionId),()=>renderProfile());}
      else if(form.id==='plannerOptionsForm'){
        editor.data=readFields(form);const p=profile(),result=p?ops().generateDay(p,{date:editor.base.date,...editor.data},editor.base,domain()):{ok:true,value:{...copy(editor.base),...editor.data},notices:['Set your work and sleep preferences to add baseline anchors.']};
        if(!result.ok)throw new Error(result.error);preview={date:editor.base.date,value:result.value,notices:result.notices||[],previousVersionId:editor.previousVersionId,sourceDigest:editor.sourceDigest??null};editor=null;api.closeDialog();api.render();noteDraft();
      }
      else if(form.id==='plannerSlotForm'){
        syncSlot();const d=editor.data,a=ops().resolve(d.startDate,d.startTime,editor.base.timeZone,d.startOffset===''?undefined:Number(d.startOffset)),b=ops().resolve(d.endDate,d.endTime,editor.base.timeZone,d.endOffset===''?undefined:Number(d.endOffset));
        if(!a.ok||!b.ok){editor.choices.start=a.choices||[];editor.choices.end=b.choices||[];renderSlot([!a.ok?'Start: '+a.error:'',!b.ok?'End: '+b.error:''].filter(Boolean).join(' '));return;}
        const value=copy(editor.base),existing=value.slots.find(x=>x.id===editor.slotId),slot={id:editor.slotId,title:d.title,category:d.category,start:a.endpoint,end:b.endpoint,fixed:d.fixed,origin:editor.origin,cancelled:false,link:d.route?{route:d.route,label:nameOf(routes,d.route)}:null,...(existing&&existing.anchor!==undefined?{anchor:copy(existing.anchor)}:{}),...(existing&&existing.window!==undefined?{window:d.releaseWindow?null:copy(existing.window)}:{})},i=value.slots.findIndex(x=>x.id===slot.id);
        if(i<0)value.slots.push(slot);else value.slots[i]=slot;
        prepareReview(makeCommand('day',value,editor.previousVersionId),()=>renderSlot(),editor.sourceDigest);
      }
      else if(form.id==='plannerStatusForm'){editor.data.note=readFields(form).note;prepareReview(makeCommand('status',editor.data,editor.previousVersionId),()=>renderStatus());}
      else if(form.id==='plannerRoutineForm'){syncRoutine();const value=copy(editor.data);value.rootId=editor.rootId;prepareReview(makeCommand('routine',value,editor.previousVersionId),()=>renderRoutine());}
      else if(form.id==='plannerMoveForm'){
        syncMove();const d=editor.data,zoneName=editor.base.timeZone,endDate=d.endTime<d.startTime?dateAdd(d.date,1):d.date;
        const a=ops().resolve(d.date,d.startTime,zoneName,d.startOffset===''?undefined:Number(d.startOffset)),b=ops().resolve(endDate,d.endTime,zoneName,d.endOffset===''?undefined:Number(d.endOffset));
        if(!a.ok||!b.ok){editor.choices.start=a.choices||[];editor.choices.end=b.choices||[];renderMove([!a.ok?'Start: '+a.error:'',!b.ok?'End: '+b.error:''].filter(Boolean).join(' '));return;}
        const slot=copy(editor.base.slots.find(x=>x.id===editor.slotId)),targetSaved=ops().currentDay(domain(),d.date),p=profile();
        let target;if(targetSaved)target=copy(targetSaved.value);else{const generated=p?ops().generateDay(p,{date:d.date,dayType:'normal',scenario:'usual',note:''},undefined,domain()):null;target=generated?.ok?generated.value:emptyDay(d.date);}
        target.slots=target.slots.filter(x=>x.id!==slot.id);target.slots.push({...slot,start:a.endpoint,end:b.endpoint,cancelled:false,anchor:slot.anchor||{date:editor.base.date,routineRootId:null,routineVersionId:null}});
        prepareReview(makeCommand('move',{slotId:slot.id,fromDate:editor.base.date,fromVersionId:editor.fromVersionId,originVersionId:uid('plannerv'),target},targetSaved?.id||null),()=>renderMove(),editor.sourceDigest);
      }
      else{const v=readFields(form).date;if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw new Error('Choose a valid date.');setDate(v);api.closeDialog();}
    }catch(error){setError(error.message);}
    finally{if(!busy)setBusy(false);}
  }
  /* The runtime finishes saves after the page rendered: refresh only the banner in place so it never keeps saying Saving once the draft is kept. */
  function refreshBanner(){const view=$('plannerView');if(!view||!api)return false;const current=view.querySelector('.planner-draft'),next=draftBanner();if(!current){if(next){const anchor=view.querySelector('.planner-header');if(anchor)anchor.insertAdjacentHTML('afterend',next);}return !!next;}if(!next){current.remove();return true;}const holder=document.createElement('div');holder.innerHTML=next;current.replaceWith(holder.firstElementChild);return true;}
  global.PlannerUI=Object.freeze({configure,render,handleClick,openDate,snapshotDraft,restoreDraft,refreshBanner,get busy(){return busy;}});
})(window);
