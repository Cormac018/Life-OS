/* Shared workspace validation. No DOM, storage or network access. */
(function(global){
  'use strict';
  const FORMAT='lifeos-state/1', READER_VERSION=69;
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
    const reader=payload.minimumReaderVersion,knownOlder=reader===undefined||(Number.isSafeInteger(reader)&&reader>=1&&reader<=66);
    if(!knownOlder)return payload;
    const domains={...payload.domains};
    const beforePurchases=reader===undefined||reader<=62,beforePlanner=reader===undefined||reader<=65;
    if(beforePurchases&&!Object.prototype.hasOwnProperty.call(domains,'purchases'))domains.purchases=global.PurchaseOperations.empty();
    if(beforePlanner&&!Object.prototype.hasOwnProperty.call(domains,'planner'))domains.planner=global.PlannerOperations.empty();
    // A v66 planner keeps every record; it only gains the empty routine list and the v2 marker.
    if(Object.prototype.hasOwnProperty.call(domains,'planner'))domains.planner=global.PlannerOperations.normalize(domains.planner);
    const drafts=payload.drafts===undefined?{}:payload.drafts;
    return {...payload,domains,...(beforePurchases&&object(drafts)?{drafts:{receipt:null,...drafts}}:{})};
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
    const drafts=payload.drafts===undefined?{}:payload.drafts;keys(drafts,['capture','ambitions','receipt'],'drafts');
    validateReceiptDraft(drafts.receipt);
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
  global.LifeOSWorkspace=Object.freeze({validate,validateLinks,registerValidators,normalize,validateReceiptDraft,FORMAT,READER_VERSION,DOMAINS});
})(window);
