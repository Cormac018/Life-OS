/* Shared workspace validation. No DOM, storage or network access. */
(function(global){
  'use strict';
  const FORMAT='lifeos-state/1', READER_VERSION=70;
  const DOMAINS=Object.freeze(['training','sleep','food','work','goals','money','recurring','reference','moneySetup','people','life','capture','captureReceipts','purchases','planner']);
  const DOMAIN_FIELDS={
    training:['version','routines','schedule','history','state'],sleep:['version','revisions','goal'],
    food:['version','foods','recipes','plans','revisions','movements','purchases','yields','targets','targetDays','receiptKeys','directLogOperations'],
    work:['version','versions','contractVersions','frozenTargets','running','absenceVersions','calendarRegion','calendarRegions'],
    goals:['version','goals','progressVersions','actions','completionEvents','operations'],
    money:['schema','accounts','debts','versions','sequence','monthlyPlan'],recurring:['schema','versions'],
    reference:['schema','reference'],moneySetup:['schema','allowances'],people:['schema','people','eventVersions','gifts','plans'],
    life:['schema','ambitions','versions','notes','connections','connectionVersions','goalLinks','actionLinks'],
    capture:['version','current','batches'],captureReceipts:['version','consumed'],purchases:['schema','products','versions','operations'],
    planner:['schema','profiles','routines','days','events','operations']
  };
  let validators=null;
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const fail=message=>{throw new Error(message);};
  function keys(value,allowed,label){if(!object(value))fail(label+' must be an object.');for(const key of Object.keys(value))if(!allowed.includes(key))fail('This app cannot safely read '+label+' field '+key+'. Open a compatible version. Nothing has been replaced.');}
  function registerValidators(input){if(validators)fail('Workspace validators are already registered.');if(!object(input)||DOMAINS.some(name=>typeof input[name]!=='function'))fail('All workspace validators must be provided.');validators=Object.freeze({...input});}
  function normalize(payload){
    if(!object(payload)||payload.format!==FORMAT||!object(payload.domains))return payload;
    const reader=payload.minimumReaderVersion,knownOlder=reader===undefined||(Number.isSafeInteger(reader)&&reader>=1&&reader<=69);
    if(!knownOlder)return payload;
    const domains={...payload.domains};
    const beforePurchases=reader===undefined||reader<=62,beforePlanner=reader===undefined||reader<=65;
    if(beforePurchases&&!Object.prototype.hasOwnProperty.call(domains,'purchases'))domains.purchases=global.PurchaseOperations.empty();
    if(beforePlanner&&!Object.prototype.hasOwnProperty.call(domains,'planner'))domains.planner=global.PlannerOperations.empty();
    // A v66 planner keeps every record; it only gains the empty routine list and the v2 marker.
    if(Object.prototype.hasOwnProperty.call(domains,'planner'))domains.planner=global.PlannerOperations.normalize(domains.planner);
    const drafts=payload.drafts===undefined?{}:payload.drafts;
    // v70 keeps unfinished planner work in the envelope; earlier payloads simply have none.
    const withPlanner=object(drafts)&&!Object.prototype.hasOwnProperty.call(drafts,'planner')?{...(beforePurchases?{receipt:null}:{}),...drafts,planner:null}:beforePurchases&&object(drafts)?{receipt:null,...drafts}:null;
    return {...payload,domains,...(withPlanner?{drafts:withPlanner}:{})};
  }
  function validateReceiptDraft(draft){
    if(draft===null||draft===undefined)return {ok:true};
    const strings=['operationId','purchaseId','versionId','sourceId','capturedAt','date','store','receiptNumber','paymentMode','accountId','transactionRootId','total','basketDiscount','attachmentName','documentHash'];
    keys(draft,['schema',...strings,'lines','operation','baseVersionId','reason'],'receipt draft');
    if(draft.operation!==undefined&&!['record','correct','refund'].includes(draft.operation))fail('The receipt draft operation is unsupported.');
    for(const key of ['baseVersionId','reason'])if(draft[key]!==undefined&&(typeof draft[key]!=='string'||draft[key].length>1000))fail('The receipt change draft is invalid.');
    if(['correct','refund'].includes(draft.operation)&&!draft.baseVersionId)fail('The receipt change must retain its original version.');
    if(draft.schema!=='lifeos.purchase-draft/1')fail('The receipt draft format is unsupported.');
    for(const key of strings)if(typeof draft[key]!=='string'||draft[key].length>500)fail('The receipt draft '+key+' is invalid.');
    if(!['create','link'].includes(draft.paymentMode)||!Array.isArray(draft.lines)||!draft.lines.length||draft.lines.length>100)fail('The receipt draft is invalid.');
    const fields=['id','kind','foodId','productChoice','productId','productVersionId','description','brand','preparation','packGrams','grams','gross','discount','category'];
    const ids=new Set();for(const line of draft.lines){keys(line,[...fields,'refundAmount','returnedGrams'],'receipt draft line');for(const key of ['refundAmount','returnedGrams'])if(line[key]!==undefined&&(typeof line[key]!=='string'||line[key].length>500))fail('The refund draft amount is invalid.');for(const key of fields)if(typeof line[key]!=='string'||line[key].length>500)fail('The receipt draft line '+key+' is invalid.');if(!line.id||ids.has(line.id)||!['product','non-food','fee','deposit'].includes(line.kind))fail('The receipt draft line identity is invalid.');ids.add(line.id);}
    return {ok:true};
  }
  const DRAFT_KINDS=['profile','options','slot','move','routine','alternative','status','command','proposal'];
  function validatePlannerDraft(draft,options={}){
    if(draft===null||draft===undefined)return {ok:true};
    keys(draft,['schema','id','kind','savedAt','selectedDate','preconditions','intent'],'planner draft');
    if(draft.schema!=='lifeos.planner-draft/1')fail('The planner draft format is unsupported.');
    if(typeof draft.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(draft.id))fail('The planner draft identity is invalid.');
    if(!DRAFT_KINDS.includes(draft.kind))fail('The planner draft kind is unsupported.');
    if(typeof draft.savedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(draft.savedAt)||!Number.isFinite(Date.parse(draft.savedAt)))fail('The planner draft timestamp is invalid.');
    if(typeof draft.selectedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(draft.selectedDate)||!Number.isFinite(Date.parse(draft.selectedDate+'T12:00:00Z'))||new Date(draft.selectedDate+'T12:00:00Z').toISOString().slice(0,10)!==draft.selectedDate)fail('The planner draft date is invalid.');
    keys(draft.preconditions,['previousVersionId','fromVersionId','rootId','dayDate','inputsDigest'],'planner draft preconditions');
    for(const [key,value] of Object.entries(draft.preconditions))if(value!==null&&(typeof value!=='string'||value.length>240))fail('A planner draft precondition is invalid.');
    if(!object(draft.intent))fail('The planner draft intent must be an object.');
    let text;try{text=JSON.stringify(draft.intent);}catch(_){fail('The planner draft intent must be plain data.');}
    if(typeof text!=='string'||text.length>600000)fail('The planner draft is too large to keep.');
    const walk=(value,depth)=>{if(depth>24)fail('The planner draft intent is too deeply nested.');if(value===null||typeof value==='string'||typeof value==='boolean')return;if(typeof value==='number'){if(!Number.isFinite(value))fail('The planner draft intent contains an unsupported number.');return;}if(typeof value!=='object')fail('The planner draft intent contains an unsupported value.');const tag=Object.prototype.toString.call(value);if(tag!=='[object Object]'&&tag!=='[object Array]')fail('The planner draft intent contains an unsupported value.');for(const child of Array.isArray(value)?value:Object.values(value))walk(child,depth+1);};
    walk(draft.intent,0);
    const required={profile:['data'],options:['data','base'],slot:['data','base','slotId','origin'],move:['data','base','slotId'],routine:['data','rootId'],alternative:['slotId','base'],status:['data'],command:['command'],proposal:['proposal','options','selected']}[draft.kind];
    for(const key of required)if(!Object.prototype.hasOwnProperty.call(draft.intent,key))fail('The planner draft is missing its '+key+'.');
    if(draft.kind==='proposal'&&(!Array.isArray(draft.intent.selected)||draft.intent.selected.some(d=>typeof d!=='string')))fail('The planner draft selection is invalid.');
    if(options&&options.strict===true)validateDraftIntent(draft.kind,draft.intent);
    return {ok:true};
  }
  // Strict shape checks run when a kept draft is read back into the planner. They refuse malformed structure and any approval-like field,
  // never legitimately unfinished values: empty strings, nulls and blank lists are how partial input looks.
  const EDITOR_KINDS=['profile','options','slot','move','routine','alternative','status'],OPERATIONS=['profile','routine','day','status','move','plan'],STATUSES=['done','skipped','reset'];
  function validateDraftIntent(kind,intent){
    const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
    const text=(v,label)=>{if(typeof v!=='string')fail('The planner draft '+label+' must be text.');};
    const identity=(v,label)=>{if(typeof v!=='string'||!v||v.length>240)fail('The planner draft '+label+' is invalid.');};
    const plainObject=(v,label)=>{if(!object(v))fail('The planner draft '+label+' must be an object.');};
    const listOf=(v,label,check)=>{if(!Array.isArray(v))fail('The planner draft '+label+' must be a list.');for(const row of v)check(row,label);};
    const textList=(v,label)=>listOf(v,label,text);
    const number=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v))fail('The planner draft '+label+' must be a finite number.');};
    const date=(v,label)=>{if(!isDate(v))fail('The planner draft '+label+' needs its date.');};
    const noApproval=v=>{if(!v||typeof v!=='object')return;for(const [key,child] of Object.entries(v)){if(['reviewDigest','approved','approval','committed'].includes(key))fail('A planner draft never carries an approval.');noApproval(child);}};
    const endpoint=(v,label)=>{plainObject(v,label);date(v.date,label);text(v.time,label+' time');text(v.at,label+' instant');if(!Number.isFinite(Date.parse(v.at)))fail('The planner draft '+label+' instant is invalid.');number(v.offsetMinutes,label+' offset');};
    const dayLike=(v,label)=>{plainObject(v,label);date(v.date,label);if(!Array.isArray(v.slots))fail('The planner draft '+label+' needs its activities.');for(const slot of v.slots){plainObject(slot,label+' activity');identity(slot.id,label+' activity identity');text(slot.title,label+' activity title');text(slot.category,label+' activity category');endpoint(slot.start,label+' activity start');endpoint(slot.end,label+' activity end');if(typeof slot.cancelled!=='boolean'||typeof slot.fixed!=='boolean')fail('The planner draft '+label+' activity flags are invalid.');if(slot.link!==null&&slot.link!==undefined){plainObject(slot.link,'activity link');text(slot.link.route,'activity route');text(slot.link.label,'activity link label');}}text(v.timeZone,label+' time zone');text(v.dayType,label+' type');text(v.scenario,label+' scenario');text(v.note,label+' note');};
    const previewShape=(v,dated=false)=>{if(v===null||v===undefined)return;plainObject(v,'preview');keys(v,['date','value','notices','previousVersionId','sourceDigest'],'planner draft preview');dayLike(v.value,'preview');if(dated||v.date!==undefined){date(v.date,'preview');if(v.date!==v.value.date)fail('The planner draft preview dates disagree.');}textList(v.notices,'preview notices');if(v.previousVersionId!==null&&v.previousVersionId!==undefined)identity(v.previousVersionId,'preview version');if(v.sourceDigest!==null&&v.sourceDigest!==undefined)text(v.sourceDigest,'preview source');};
    const planShape=v=>{if(v===null||v===undefined)return;plainObject(v,'proposal context');keys(v,['proposal','options','selected','preview'],'planner draft proposal context');proposalShape(v.proposal);plainObject(v.options,'proposal options');if(!Array.isArray(v.selected)||v.selected.some(d=>!isDate(d)))fail('The planner draft selection is invalid.');previewShape(v.preview,true);noApproval(v);};
    const proposalShape=v=>{
      plainObject(v,'proposal');noApproval(v);for(const key of ['policyVersion','digest','inputsDigest'])text(v[key],'proposal '+key);date(v.today,'proposal planning day');plainObject(v.horizon,'proposal horizon');date(v.horizon.from,'proposal horizon start');date(v.horizon.to,'proposal horizon end');
      plainObject(v.summary,'proposal summary');for(const key of ['days','changed','added','moved','shortened','deferred','unscheduled','unresolved','conflicts']){number(v.summary[key],'proposal summary '+key);if(!Number.isSafeInteger(v.summary[key])||v.summary[key]<0)fail('The planner draft proposal summary count is invalid.');}
      textList(v.assumptions,'proposal assumptions');
      listOf(v.days,'proposal days',d=>{plainObject(d,'proposal day');date(d.date,'proposal day');text(d.dayType,'proposal day type');text(d.scenario,'proposal day scenario');if(typeof d.unchanged!=='boolean')fail('The planner draft proposal day change marker is invalid.');if(d.previousVersionId!==null)identity(d.previousVersionId,'proposal day predecessor');if(d.spareMinutes!==null)number(d.spareMinutes,'proposal spare minutes');if(d.value!==null){dayLike(d.value,'proposal day value');if(d.date!==d.value.date)fail('The planner draft proposal day dates disagree.');}
        listOf(d.changes,'proposal changes',c=>{plainObject(c,'proposal change');for(const k of ['kind','title','reason'])text(c[k],'proposal change '+k);for(const k of ['from','to'])if(c[k]!==null&&c[k]!==undefined)text(c[k],'proposal change '+k);});
        listOf(d.unscheduled,'proposal unscheduled activities',u=>{plainObject(u,'unscheduled activity');text(u.title,'unscheduled title');text(u.reason,'unscheduled reason');textList(u.alternatives,'unscheduled alternatives');});
        listOf(d.unresolved,'proposal unresolved activities',u=>{plainObject(u,'unresolved activity');text(u.title,'unresolved title');text(u.reason,'unresolved reason');});textList(d.notices,'proposal day notices');
      });
      listOf(v.scenarios,'proposal scenarios',x=>{plainObject(x,'proposal scenario');text(x.scenario,'scenario identity');text(x.label,'scenario label');for(const k of ['freeMinutes','workMinutes','commuteMinutes'])number(x[k],'scenario '+k);if(x.contractMinutes!==null)number(x.contractMinutes,'scenario contract minutes');text(x.remark,'scenario remark');textList(x.notes,'scenario notes');});
      listOf(v.queue,'proposal queue',q=>{plainObject(q,'queue item');for(const k of ['status','title','eventTitle','reason'])text(q[k],'queue '+k);date(q.eventDate,'queue event');});
    };
    const commandShape=v=>{plainObject(v,'command');keys(v,['contract','operation','operationId','versionId','recordedAt','expected','entity'],'planner draft command');if(v.contract!=='lifeos-planner/1')fail('The planner draft command contract is unsupported.');if(!OPERATIONS.includes(v.operation))fail('The planner draft command operation is unsupported.');identity(v.operationId,'command operation');identity(v.versionId,'command version');text(v.recordedAt,'command time');plainObject(v.expected,'command expectation');keys(v.expected,['workspaceRevision','previousVersionId'],'planner draft command expectation');if(v.expected.workspaceRevision!==undefined&&!Number.isSafeInteger(v.expected.workspaceRevision))fail('The planner draft command revision is invalid.');if(v.expected.previousVersionId!==null&&v.expected.previousVersionId!==undefined)identity(v.expected.previousVersionId,'command predecessor');plainObject(v.entity,'command entity');noApproval(v);};
    const editorShape=(k,v,inner)=>{
      const common=inner?['kind','previousVersionId','fromVersionId','sourceDigest','pristine']:['proposal','preview','pristine'];
      const own={profile:['data'],options:['data','base'],slot:['data','base','slotId','origin','window','choices'],move:['data','base','slotId','choices'],routine:['data','rootId'],alternative:['slotId','base','alternatives','title'],status:['data','title','evidenceTitle']}[k];
      keys(v,[...own,...common],'planner draft '+k+' intent');
      if(v.pristine!==null&&v.pristine!==undefined)text(v.pristine,'pristine marker');
      if(k!=='alternative')plainObject(v.data,k+' fields');
      if(['options','slot','move','alternative'].includes(k))dayLike(v.base,k+' day');
      if(['slot','move','alternative'].includes(k))identity(v.slotId,k+' activity');
      if(k==='slot'){if(!['manual','routine'].includes(v.origin))fail('The planner draft activity origin is invalid.');if(v.window!==null&&v.window!==undefined){plainObject(v.window,'activity window');text(v.window.start,'window start');text(v.window.end,'window end');}}
      if((k==='slot'||k==='move')&&v.choices!==undefined)plainObject(v.choices,'time choices');
      if(k==='routine')identity(v.rootId,'routine identity');
      if(k==='alternative'){if(!Array.isArray(v.alternatives))fail('The planner draft alternatives are invalid.');if(v.title!==null&&v.title!==undefined)text(v.title,'alternative title');}
      if(k==='status'){if(!isDate(v.data.dayRootId))fail('The planner draft check-off needs its day.');identity(v.data.slotId,'check-off activity');if(!STATUSES.includes(v.data.status))fail('The planner draft check-off status is invalid.');text(v.data.note??'','check-off note');if(v.data.evidence!==null&&v.data.evidence!==undefined)plainObject(v.data.evidence,'check-off evidence');if(v.title!==undefined&&v.title!==null)text(v.title,'check-off title');if(v.evidenceTitle!==undefined&&v.evidenceTitle!==null)text(v.evidenceTitle,'check-off evidence title');}
      if(!inner){planShape(v.proposal);previewShape(v.preview,k!=='options'||Object.prototype.hasOwnProperty.call(v,'pristine'));}
    };
    if(EDITOR_KINDS.includes(kind))editorShape(kind,intent,false);
    else if(kind==='command'){keys(intent,['command','editor','proposal','preview'],'planner draft command intent');commandShape(intent.command);if(intent.editor!==null&&intent.editor!==undefined){plainObject(intent.editor,'reviewed editor');if(!EDITOR_KINDS.includes(intent.editor.kind))fail('The planner draft reviewed editor kind is unsupported.');editorShape(intent.editor.kind,intent.editor,true);}planShape(intent.proposal);previewShape(intent.preview,true);}
    else if(kind==='proposal'){keys(intent,['proposal','options','selected','preview'],'planner draft proposal intent');planShape(intent);}
  }
  function validate(payload){
    payload=normalize(payload);
    keys(payload,['format','minimumReaderVersion','domains','drafts','legacyArchive'],'workspace');
    if(payload.format!==FORMAT)fail('This workspace format is not supported.');
    if(payload.minimumReaderVersion!==undefined&&(!Number.isSafeInteger(payload.minimumReaderVersion)||payload.minimumReaderVersion<1||payload.minimumReaderVersion>READER_VERSION))fail('This workspace needs a newer Life OS version. Your records have not been replaced.');
    keys(payload.domains,DOMAINS,'workspace sections');
    if(!validators)fail('Workspace validators are not ready. No data was written.');
    for(const name of DOMAINS){if(!object(payload.domains[name]))fail('Missing workspace section: '+name);keys(payload.domains[name],DOMAIN_FIELDS[name],name);const result=validators[name](payload.domains[name]);if(!result||!result.ok)fail('Could not validate '+name+': '+(result?.error||'invalid records'));}
    keys(payload.domains.training.state,['routineId','active','currentExercise','timer','chartExercise','chartMetric','chartRange','chartSessionId'],'training state');
    validateLinks(payload);
    const drafts=payload.drafts===undefined?{}:payload.drafts;keys(drafts,['capture','ambitions','receipt','planner'],'drafts');
    validateReceiptDraft(drafts.receipt);validatePlannerDraft(drafts.planner);
    const capture=drafts.capture===undefined?{}:drafts.capture;keys(capture,['draft','date','source','fileName'],'capture draft');
    if(capture.draft!==undefined&&(typeof capture.draft!=='string'||capture.draft.length>12000))fail('The saved capture draft is invalid.');
    if(capture.date!==undefined&&(typeof capture.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(capture.date)||!Number.isFinite(Date.parse(capture.date+'T12:00:00Z'))||new Date(capture.date+'T12:00:00Z').toISOString().slice(0,10)!==capture.date))fail('The capture date is invalid.');
    if(capture.source!==undefined&&!['typed','file','transcript','plaud','paste','manual'].includes(capture.source))fail('The capture source is unsupported.');
    if(capture.fileName!==undefined&&(typeof capture.fileName!=='string'||capture.fileName.length>250))fail('The capture file name is invalid.');
    const ambitions=drafts.ambitions===undefined?{}:drafts.ambitions;if(!object(ambitions)||Object.entries(ambitions).some(([k,v])=>k.length>250||typeof v!=='string'||v.length>8000))fail('The saved ambition notes are invalid.');
    return {ok:true,domainCount:DOMAINS.length};
  }
function validateLinks(payload) {
  payload=normalize(payload);
  const fail = message => { throw new Error('The workspace links are incomplete: ' + message); };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const list = (value, label) => { if (!Array.isArray(value)) fail(label + ' are missing.'); return value; };
  const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 240;
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  const text = value => typeof value === 'string' && value.trim().length > 0;
  if (!object(payload) || payload.format !== 'lifeos-state/1' || !object(payload.domains)) fail('the format is not supported.');
  const d = payload.domains;
  for (const name of ['money', 'recurring', 'goals', 'people', 'life', 'sleep', 'work', 'food', 'capture', 'captureReceipts']) if (!object(d[name])) fail(name + ' is missing.');
  const ids = (rows, label) => new Set(list(rows, label).map(row => { if (!object(row) || !identifier(row.id)) fail(label + ' contain an invalid record.'); return row.id; }));
  const accountIds = ids(d.money.accounts, 'Money accounts');
  for (const row of list(d.recurring.versions, 'Recurring versions')) {
    if (!object(row)) fail('a recurring entry is invalid.');
    for (const key of ['accountId', 'toAccountId']) if (row[key] !== null && row[key] !== undefined && !accountIds.has(row[key])) fail('a recurring entry refers to a missing Money account.');
    if (row.kind === 'contribution' && row.accountId && row.toAccountId && row.accountId === row.toAccountId) fail('a contribution sends money to the same account.');
  }

  const goalIds = ids(d.goals.goals, 'Goals'), actionIds = ids(d.goals.actions, 'Actions');
  const progress = list(d.goals.progressVersions, 'Goal progress versions'), completions = list(d.goals.completionEvents, 'Action completion events');
  const historicalGoalIds = new Set(goalIds), historicalActionIds = new Set(actionIds);
  for (const row of progress) if (object(row.goalSnapshot) && row.goalSnapshot.id === row.goalId) historicalGoalIds.add(row.goalId);
  for (const row of completions) if (object(row.snapshot) && row.snapshot.id === row.actionId) historicalActionIds.add(row.actionId);
  const ambitions = new Map(list(d.life.ambitions, 'Life Planner ambitions').map(row => [row.id, row]));
  const frozenGoal = (row, id) => object(row) && row.id === id && text(row.title) && text(row.unit) && ['total', 'best'].includes(row.mode) && typeof row.target === 'number' && Number.isFinite(row.target) && row.target > 0 && Number.isInteger(row.weeklySessions) && row.weeklySessions >= 1 && row.weeklySessions <= 7 && date(row.startDate) && date(row.deadline) && row.deadline >= row.startDate && ['active', 'paused'].includes(row.status);
  const frozenAction = (row, id) => object(row) && row.id === id && text(row.title) && date(row.date) && typeof row.done === 'boolean' && (row.minutes === null || Number.isInteger(row.minutes) && row.minutes > 0 && row.minutes <= 1440);
  for (const [name, key, snapshotKey, known, validSnapshot, ambitionKey] of [
    ['goalLinks', 'goalId', 'goalSnapshot', historicalGoalIds, frozenGoal, 'goalIds'],
    ['actionLinks', 'actionId', 'actionSnapshot', historicalActionIds, frozenAction, 'actionIds']
  ]) {
    const rows = list(d.life[name], 'Life Planner ' + name), linked = new Set();
    for (const row of rows) {
      const ambition = object(row) ? ambitions.get(row.ambitionId) : null;
      if (!ambition || !identifier(row[key]) || !Array.isArray(ambition[ambitionKey]) || !ambition[ambitionKey].includes(row[key])) fail('a Life Planner link has no matching ambition entry.');
      if (!object(row[snapshotKey]) || row[snapshotKey].id !== row[key]) fail('a Life Planner linked snapshot belongs to a different record.');
      // A deleted live library item remains a valid historical link when its full snapshot was kept.
      if (!known.has(row[key]) && !validSnapshot(row[snapshotKey], row[key])) fail('a Life Planner link has neither a live record nor a complete historical snapshot.');
      linked.add(row.ambitionId + ':' + row[key]);
    }
    for (const ambition of ambitions.values()) for (const id of list(ambition[ambitionKey], 'Ambition linked IDs')) if (!linked.has(ambition.id + ':' + id)) fail('an ambition has a link without its saved snapshot.');
  }

  const targets = {
    sleep: ids(d.sleep.revisions, 'Sleep versions'),
    work: ids(d.work.versions, 'Work versions'),
    money: ids(d.money.versions, 'Money versions'),
    people: ids(d.people.eventVersions, 'People event versions'),
    action: historicalActionIds,
    progress: ids(progress, 'Goal progress versions'),
    meal: ids(d.food.revisions, 'Food log versions')
  };
  const routes = { sleep: 'sleep', work: 'work', money: 'money', people: 'people', action: 'goals', progress: 'goals', meal: 'food' };
  const routeIds = new Map();
  for (const [target, set] of Object.entries(targets)) { const route = routes[target]; if (!routeIds.has(route)) routeIds.set(route, new Set()); for (const id of set) routeIds.get(route).add(id); }
  const proposalTargets = new Map(), savedProposals = [];
  const batches = list(d.capture.batches, 'Capture batches').slice();
  if (d.capture.current !== null) { if (!object(d.capture.current)) fail('the open Capture is invalid.'); batches.push(d.capture.current); }
  for (const batch of batches) for (const row of list(batch.proposals, 'Capture proposals')) {
    if (!object(row) || !Object.prototype.hasOwnProperty.call(targets, row.target) || !identifier(row.operationId)) fail('a Capture proposal has an invalid target or operation.');
    const known = proposalTargets.get(row.operationId);
    if (known && known !== row.target) fail('one Capture operation refers to different sections.');
    proposalTargets.set(row.operationId, row.target);
    if (row.status === 'saved') { if (!identifier(row.recordId) || !targets[row.target].has(row.recordId)) fail('a saved Capture update refers to a missing ' + row.target + ' record.'); savedProposals.push(row); }
  }
  const receipts = new Map();
  for (const pair of list(d.captureReceipts.consumed, 'Capture receipts')) {
    if (!Array.isArray(pair) || pair.length !== 2 || !identifier(pair[0]) || !object(pair[1]) || !object(pair[1].result)) fail('a Capture receipt is invalid.');
    const operationId = pair[0], result = pair[1].result;
    if (receipts.has(operationId) || result.ok !== true || !identifier(result.id) || (result.recordId !== undefined && result.recordId !== result.id)) fail('a Capture receipt has inconsistent record identifiers.');
    const target = proposalTargets.get(operationId) || operationId.match(/^capture(?:-preview)?:([a-z]+):/)?.[1];
    if (target) { if (!Object.prototype.hasOwnProperty.call(targets, target) || result.route !== routes[target] || !targets[target].has(result.id)) fail('a Capture receipt refers to a missing or different ' + target + ' record.'); }
    else if (!routeIds.has(result.route) || !routeIds.get(result.route).has(result.id)) fail('a Capture receipt refers to a missing record in its section.');
    receipts.set(operationId, result);
  }
  for (const row of savedProposals) { const receipt = receipts.get(row.operationId); if (!receipt || receipt.id !== row.recordId || receipt.route !== routes[row.target]) fail('a saved Capture update is missing its matching operation receipt.'); }
  const purchaseLinks=global.PurchaseOperations.validateLinks(payload);if(!purchaseLinks.ok)fail(purchaseLinks.error||'Purchase links are invalid.');
  const plannerLinks=global.PlannerOperations.validateLinks(payload);if(!plannerLinks.ok)fail(plannerLinks.error||'Planner evidence links are invalid.');
  return { ok: true };
}
  global.LifeOSWorkspace=Object.freeze({validate,validateLinks,registerValidators,normalize,validateReceiptDraft,validatePlannerDraft,FORMAT,READER_VERSION,DOMAINS});
})(window);
