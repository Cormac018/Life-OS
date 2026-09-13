/* Pure purchase proposals. UI and persistence are separate consumers of this contract. */
(function(global){
  'use strict';
  const CONTRACT='lifeos-purchase/1', SCHEMA='lifeos.purchases/1';
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
  const copy=x=>JSON.parse(JSON.stringify(x));
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
  function problem(path,reason,status='invalid'){const e=new Error(reason);e.path=path;e.status=status;throw e;}
  function check(value,path,reason,status){if(!value)problem(path,reason,status);}
  function fields(value,allowed,path){check(object(value),path,'Expected an object.');for(const k of Object.keys(value))check(allowed.includes(k),path+'/'+k,'This field is not supported in this purchase version.','unsupported');}
  function text(value,path,max=200,required=true){check(typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0),path,'Enter valid text'+(required?' with a value':'')+'.');}
  function id(value,path,max=160){check(typeof value==='string'&&value.length<=max&&/^[A-Za-z0-9_-]+$/.test(value)&&!['__proto__','constructor','prototype'].includes(value),path,'Use a stable identifier of up to '+max+' letters, numbers, underscores or hyphens.');}
  function integer(value,path,min=0){check(Number.isSafeInteger(value)&&value>=min,path,'Use a safe whole number of '+min+' or more.');}
  function list(value,path,max=1000){check(Array.isArray(value)&&value.length<=max,path,'Expected a supported list.');return value;}
  function nullable(value,test){if(value!==null)test(value);}
  function unique(rows,key,path){const seen=new Set();for(const row of rows){check(object(row),path,'Invalid record.');id(row[key],path+'/'+key);check(!seen.has(row[key]),path,'Repeated '+key+'.');seen.add(row[key]);}return seen;}
  function stable(value){
    const stack=new Set();
    function visit(v){
      if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
      if(typeof v==='number'){check(Number.isFinite(v),'','Non-finite numbers are not supported.');return JSON.stringify(v);}
      check(typeof v==='object','','Only neutral JSON values are supported.');
      const array=Array.isArray(v),prototype=Object.getPrototypeOf(v),constructor=prototype&&Object.getOwnPropertyDescriptor(prototype,'constructor')?.value;
      const builtIn=typeof constructor==='function'&&constructor.prototype===prototype&&Function.prototype.toString.call(constructor)===Function.prototype.toString.call(array?Array:Object);
      const plain=array?builtIn&&Object.getPrototypeOf(Object.getPrototypeOf(prototype))===null:prototype===null||builtIn&&Object.getPrototypeOf(prototype)===null;
      check(plain&&!Object.getOwnPropertySymbols(v).length,'','Custom prototypes and symbol fields cannot be represented faithfully as neutral JSON.');
      const descriptors=Object.getOwnPropertyDescriptors(v);
      for(const [key,descriptor] of Object.entries(descriptors)){
        if(array&&key==='length')continue;
        check(own(descriptor,'value')&&descriptor.enumerable,'','Accessors and hidden fields cannot be represented faithfully as neutral JSON.');
        if(array)check(/^(0|[1-9]\d*)$/.test(key)&&Number(key)<v.length,'','Additional array fields cannot be represented faithfully as neutral JSON.');
      }
      if(array)check(Object.keys(v).length===v.length,'','Sparse arrays cannot be represented faithfully as neutral JSON.');
      check(!stack.has(v),'','Circular values are not supported.');stack.add(v);
      const out=Array.isArray(v)?'['+v.map(visit).join(',')+']':'{'+Object.keys(v).sort(compare).map(k=>JSON.stringify(k)+':'+visit(v[k])).join(',')+'}';stack.delete(v);return out;
    }
    return visit(value);
  }
  function sum(values,path){const total=values.reduce((n,x)=>n+BigInt(x),0n);check(total<=BigInt(Number.MAX_SAFE_INTEGER),path,'The combined amount is too large to record accurately.');return Number(total);}
  function empty(){return {schema:SCHEMA,products:[],versions:[],operations:[]};}
  function product(row,path){
    fields(row,['productId','versionId','supersedes','name','brand','identifiers','pack','preparation','ingredientMapping'],path);
    id(row.productId,path+'/productId');id(row.versionId,path+'/versionId');nullable(row.supersedes,v=>id(v,path+'/supersedes'));text(row.name,path+'/name',200);
    nullable(row.brand,v=>text(v,path+'/brand',120));nullable(row.preparation,v=>text(v,path+'/preparation',160));
    const identifiers=list(row.identifiers,path+'/identifiers',30),seen=new Set();
    for(const pair of identifiers){fields(pair,['system','value'],path+'/identifiers');text(pair.system,path+'/identifiers/system',80);text(pair.value,path+'/identifiers/value',160);const key=stable(pair);check(!seen.has(key),path+'/identifiers','Repeated product identifier.');seen.add(key);}
    nullable(row.pack,p=>{fields(p,['count','amount','unit'],path+'/pack');integer(p.count,path+'/pack/count',1);integer(p.amount,path+'/pack/amount',1);check(['mg','ml','each'].includes(p.unit),path+'/pack/unit','This package unit is unsupported.','unsupported');});
    nullable(row.ingredientMapping,m=>{fields(m,['foodId','gramsPerBaseUnit','basis'],path+'/ingredientMapping');id(m.foodId,path+'/ingredientMapping/foodId');check(m.gramsPerBaseUnit===0.001,path+'/ingredientMapping/gramsPerBaseUnit','Only an explicit milligram-to-gram food mapping is available.','unsupported');check(['entered','matched','stated'].includes(m.basis),path+'/ingredientMapping/basis','Confirm this food mapping.','needs-review');});
  }
  function allocate(lines,adjustments){
    const remaining=new Map(lines.map(l=>[l.id,l.grossPence]));
    for(const [index,a] of adjustments.entries()){
      const path='/entity/adjustments/'+index;fields(a,['id','kind','amountPence','eligibleLineIds','allocations'],path);id(a.id,path+'/id');
      check(['item-discount','basket-discount','multibuy'].includes(a.kind),path+'/kind','This discount type is not supported.','unsupported');integer(a.amountPence,path+'/amountPence');
      list(a.eligibleLineIds,path+'/eligibleLineIds',1000);check(a.eligibleLineIds.length>0&&new Set(a.eligibleLineIds).size===a.eligibleLineIds.length,path+'/eligibleLineIds','Choose each eligible receipt line once.');
      if(a.kind==='item-discount')check(a.eligibleLineIds.length===1,path+'/eligibleLineIds','An item discount must identify exactly one line.');
      for(const key of a.eligibleLineIds)check(remaining.has(key)&&['product','non-food'].includes(lines.find(l=>l.id===key).kind),path+'/eligibleLineIds','Discounts must reference merchandise lines.');
      const total=sum(a.eligibleLineIds.map(k=>remaining.get(k)),path);check(a.amountPence<=total,path+'/amountPence','This discount exceeds the eligible amount remaining.');
      const amount=BigInt(a.amountPence),denominator=BigInt(total||1),parts=a.eligibleLineIds.map(lineId=>{const n=BigInt(remaining.get(lineId))*amount;return {lineId,amountPence:Number(n/denominator),remainder:n%denominator};});
      let left=a.amountPence-parts.reduce((n,p)=>n+p.amountPence,0);parts.sort((a,b)=>a.remainder===b.remainder?compare(a.lineId,b.lineId):(a.remainder>b.remainder?-1:1));
      for(let n=0;n<left;n++)parts[n].amountPence++;
      const allocations=parts.map(({lineId,amountPence})=>({lineId,amountPence})).sort((a,b)=>compare(a.lineId,b.lineId));
      if(a.allocations!==undefined)check(stable(a.allocations.slice().sort((a,b)=>compare(a.lineId,b.lineId)))===stable(allocations),path+'/allocations','Discount allocations disagree with the exact penny calculation.');
      a.allocations=allocations;for(const p of allocations)remaining.set(p.lineId,remaining.get(p.lineId)-p.amountPence);
    }
    for(const [index,line] of lines.entries()){const net=remaining.get(line.id);if(line.netPence!==undefined)check(line.netPence===net,'/entity/lines/'+index+'/netPence','The line total does not match its gross amount and explicit discounts.');line.netPence=net;}
  }
  function normalize(command){
    stable(command);const c=copy(command);
    fields(c,['contract','operation','operationId','purchaseId','versionId','expected','source','entity','resolution'],'');
    check(c.contract===CONTRACT,'/contract','This purchase contract is not supported.','unsupported');check(c.operation==='record','/operation','Corrections, refunds and voids need a later purchase contract implementation.','unsupported');
    for(const k of ['operationId','purchaseId','versionId'])id(c[k],'/'+k,k==='purchaseId'?160:80);
    fields(c.expected,['workspaceRevision','purchaseVersionId'],'/expected');integer(c.expected.workspaceRevision,'/expected/workspaceRevision');check(c.expected.purchaseVersionId===null,'/expected/purchaseVersionId','A new purchase must not replace an earlier version.');
    fields(c.source,['id','kind','capturedAt','documentHash','attachmentRef','retention','text','fileName'],'/source');id(c.source.id,'/source/id');
    check(['manual','manual-photo','text'].includes(c.source.kind),'/source/kind','Receipt recognition is not connected. Review a manually entered purchase.','unsupported');
    check(typeof c.source.capturedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(c.source.capturedAt)&&Number.isFinite(Date.parse(c.source.capturedAt)),'/source/capturedAt','Keep a valid source capture timestamp.');
    nullable(c.source.documentHash,v=>check(typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v),'/source/documentHash','Use a full SHA-256 document hash.'));
    check(c.source.attachmentRef===null&&c.source.retention==='discard-after-review','/source/retention','Image retention is not available. The reviewed image must remain transient.','unsupported');
    text(c.source.text,'/source/text',12000,false);if(c.source.fileName!==undefined)text(c.source.fileName,'/source/fileName',250,false);
    fields(c.entity,['date','time','timeZone','currency','merchant','products','lines','adjustments','totalPence','settlements'],'/entity');const e=c.entity;
    check(date(e.date),'/entity/date','Choose a valid purchase date.');nullable(e.time,t=>check(typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t),'/entity/time','Use a valid local purchase time.'));
    text(e.timeZone,'/entity/timeZone',100);try{new Intl.DateTimeFormat('en',{timeZone:e.timeZone});}catch(error){problem('/entity/timeZone','Use a supported time zone.');}
    check(e.currency==='GBP','/entity/currency','Only GBP receipts are available in this stage.','unsupported');
    fields(e.merchant,['name','storeId','receiptNumber'],'/entity/merchant');text(e.merchant.name,'/entity/merchant/name',100);e.merchant.name=e.merchant.name.trim().replace(/\s+/g,' ');nullable(e.merchant.storeId,v=>text(v,'/entity/merchant/storeId',120));nullable(e.merchant.receiptNumber,v=>text(v,'/entity/merchant/receiptNumber',120));
    list(e.products,'/entity/products');unique(e.products,'versionId','/entity/products');e.products.forEach((p,i)=>product(p,'/entity/products/'+i));
    list(e.lines,'/entity/lines');check(e.lines.length>0,'/entity/lines','Add at least one purchase line.');unique(e.lines,'id','/entity/lines');
    for(const [i,l] of e.lines.entries()){
      const path='/entity/lines/'+i;fields(l,['id','kind','description','productVersionId','quantity','grossPence','netPence','inventory','category','sourceSpan'],path);
      id(l.id,path+'/id',80);
      check(['product','non-food','fee','deposit'].includes(l.kind),path+'/kind','This line kind is unsupported.','unsupported');text(l.description,path+'/description',200);nullable(l.productVersionId,v=>id(v,path+'/productVersionId'));if(l.kind==='product')check(l.productVersionId!==null,path+'/productVersionId','Choose or enter the purchased product.','needs-review');
      nullable(l.quantity,q=>{fields(q,['amount','unit'],path+'/quantity');integer(q.amount,path+'/quantity/amount',1);check(['mg','ml','each'].includes(q.unit),path+'/quantity/unit','This quantity unit is unsupported.','unsupported');});
      if(l.kind==='product')check(l.quantity!==null,path+'/quantity','Enter the quantity actually purchased.','needs-review');
      if(['fee','deposit'].includes(l.kind))check(l.productVersionId===null&&l.quantity===null,path,'Fees and deposits stay separate from merchandise price comparisons.');
      integer(l.grossPence,path+'/grossPence');if(l.netPence!==undefined)integer(l.netPence,path+'/netPence');text(l.category,path+'/category',80);
      fields(l.inventory,['mode','foodId','grams','reason','order','stockObservationId'],path+'/inventory');
      check(['receive','none'].includes(l.inventory.mode),path+'/inventory/mode','Ordering a purchase before a same-day stock count is not available yet.','unsupported');
      if(l.inventory.mode==='receive'){
        check(l.kind==='product'&&l.quantity&&l.quantity.unit==='mg',path+'/inventory','Pantry receipt quantities must be a food product measured in milligrams.','unsupported');id(l.inventory.foodId,path+'/inventory/foodId');
        check(l.inventory.grams===l.quantity.amount/1000,path+'/inventory/grams','Pantry grams must exactly match the purchased milligrams.');
        if(l.inventory.order!==undefined)check(l.inventory.order==='after-count',path+'/inventory/order','Before-count ordering is not supported.','unsupported');if(l.inventory.stockObservationId!==undefined)id(l.inventory.stockObservationId,path+'/inventory/stockObservationId');
        check(!own(l.inventory,'reason'),path+'/inventory/reason','Receiving stock cannot also state a non-inventory reason.');
      }else{check(!['foodId','grams','order','stockObservationId'].some(k=>own(l.inventory,k)),path+'/inventory','A line excluded from pantry stock must not carry stock effects.');text(l.inventory.reason,path+'/inventory/reason',200);}
      nullable(l.sourceSpan,s=>{fields(s,['start','end'],path+'/sourceSpan');integer(s.start,path+'/sourceSpan/start');integer(s.end,path+'/sourceSpan/end');check(s.end>=s.start&&s.end<=c.source.text.length,path+'/sourceSpan','The text reference is outside the source.');});
    }
    list(e.adjustments,'/entity/adjustments');unique(e.adjustments,'id','/entity/adjustments');allocate(e.lines,e.adjustments);
    integer(e.totalPence,'/entity/totalPence');check(e.totalPence===sum(e.lines.map(l=>l.netPence),'/entity/totalPence'),'/entity/totalPence','Receipt total must equal the item amounts after explicit discounts.');check(e.totalPence>0,'/entity/totalPence','A zero-payment receipt needs a later settlement capability.','unsupported');
    list(e.settlements,'/entity/settlements',30);check(e.settlements.length===1,'/entity/settlements','Only one full cash-account payment is available. Split and gift-card payments are not enabled.','unsupported');const s=e.settlements[0];
    fields(s,['id','amountPence','date','mode','accountId','transactionRootId','expectedTransactionVersionId'],'/entity/settlements/0');id(s.id,'/entity/settlements/0/id');integer(s.amountPence,'/entity/settlements/0/amountPence',1);check(s.amountPence===e.totalPence,'/entity/settlements/0/amountPence','The selected payment must cover this whole receipt.','unsupported');check(date(s.date),'/entity/settlements/0/date','Choose a valid payment date.');id(s.accountId,'/entity/settlements/0/accountId');check(['create','link'].includes(s.mode),'/entity/settlements/0/mode','This payment type is not available.','unsupported');
    if(s.mode==='create')check(s.transactionRootId===null&&s.expectedTransactionVersionId===null,'/entity/settlements/0','A new expense cannot also link an existing payment.');else{ id(s.transactionRootId,'/entity/settlements/0/transactionRootId');id(s.expectedTransactionVersionId,'/entity/settlements/0/expectedTransactionVersionId');}
    list(c.resolution,'/resolution',1000);const paths=new Set();for(const r of c.resolution){fields(r,['path','basis'],'/resolution');text(r.path,'/resolution/path',300);check(!paths.has(r.path),'/resolution','Repeated review resolution.');paths.add(r.path);check(['entered','matched','stated','inferred'].includes(r.basis),'/resolution/basis','Unsupported review evidence.');check(r.basis!=='inferred',r.path,'An inferred value needs your confirmation.','needs-review');}
    return c;
  }
  const acknowledged=(c,path)=>c.resolution.some(r=>r.path===path&&r.basis==='entered');
  function latestMoney(rows){const map=new Map();rows.forEach(row=>map.set(row.rootId,row));return [...map.values()];}
  function makeRecordIds(c){const stem=c.versionId;const inventory=c.entity.lines.filter(l=>l.inventory.mode==='receive'),s=c.entity.settlements[0],moneyId=s.mode==='create'?'purchase-money_'+stem:s.expectedTransactionVersionId;return {purchaseVersionId:c.versionId,productVersionIds:c.entity.products.map(p=>p.versionId),foodPurchaseIds:inventory.map(l=>'purchase-price_'+stem+'_'+l.id),movementIds:inventory.map(l=>'purchase-stock_'+stem+'_'+l.id),transactionId:moneyId,transactionRootId:s.mode==='create'?moneyId:s.transactionRootId,settlementId:s.id};}
  function fingerprint(c){return stable({date:c.entity.date,merchant:c.entity.merchant.name.toLowerCase(),receiptNumber:c.entity.merchant.receiptNumber,totalPence:c.entity.totalPence,lines:c.entity.lines.map(l=>({description:l.description.toLowerCase(),quantity:l.quantity,netPence:l.netPence,foodId:l.inventory.foodId||null})).sort((a,b)=>compare(stable(a),stable(b)))});}
  function legacyDuplicates(c,workspace){
    const lines=c.entity.lines.filter(l=>l.inventory.mode==='receive');if(!lines.length)return [];
    const shape=rows=>stable(rows.slice().sort((a,b)=>compare(stable(a),stable(b))));
    const target=shape(lines.map(l=>[l.inventory.foodId,l.inventory.grams,l.netPence/100])),groups=new Map();
    for(const row of workspace.domains.food.purchases){
      if(row.purchaseVersionId!==undefined||row.date!==c.entity.date||typeof row.store!=='string'||row.store.trim().replace(/\s+/g,' ').toLowerCase()!==c.entity.merchant.name.toLowerCase())continue;
      const key=row.receiptId||row.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
    }
    return [...groups].filter(([,rows])=>shape(rows.map(l=>[l.foodId,l.grams,l.totalPrice]))===target).map(([purchaseId,rows])=>({purchaseId,versionId:null,date:c.entity.date,merchant:rows[0].store,totalPence:null,legacy:true}));
  }
  function makeExpense(c,workspace,recordIds){const s=c.entity.settlements[0],a=workspace.domains.money.accounts.find(a=>a.id===s.accountId);const categories=[...new Set(c.entity.lines.map(l=>l.category))];return {id:recordIds.transactionId,rootId:recordIds.transactionRootId,supersedes:null,sequence:workspace.domains.money.sequence+1,date:s.date,type:'expense',amount:s.amountPence/100,amountPence:s.amountPence,accountId:a.id,toAccountId:null,debtId:null,accountName:a.name,toAccountName:'',debtName:'',category:categories.length===1?categories[0]:'Shopping',note:c.entity.merchant.name,operationId:'purchase-payment_'+c.operationId,legs:[{kind:'accounts',id:a.id,pence:-s.amountPence}],purchaseVersionId:c.versionId};}
  function ledgerCheck(workspace,event){
    const money=workspace.domains.money,balances={accounts:new Map(money.accounts.map(a=>[a.id,a.openingPence])),debts:new Map(money.debts.map(d=>[d.id,d.openingPence]))};
    for(const row of latestMoney(money.versions.concat(event)).sort((a,b)=>compare(a.date,b.date)||a.sequence-b.sequence))for(const leg of row.legs){const before=balances[leg.kind]?.get(leg.id);check(Number.isSafeInteger(before),'/entity/settlements/0','The payment ledger cannot be resolved.');const n=before+leg.pence;check(Number.isSafeInteger(n)&&n>=0,'/entity/settlements/0','This payment would leave a balance below zero or too large on '+row.date+'. Check the account and earlier transactions.');balances[leg.kind].set(leg.id,n);}
  }
  function prepare(command,context){
    try{
      check(object(context)&&object(context.workspace)&&object(context.workspace.domains),'','A detached workspace context is required.');integer(context.revision,'/expected/workspaceRevision');check(date(context.today),'','A valid current date is required.');
      const c=normalize(command),workspace=context.workspace,domain=workspace.domains.purchases||empty();const valid=validateDomain(domain);check(valid.ok,'/purchases',valid.error||'The purchase history is invalid.');
      const payloadDigest=stable(c),previous=domain.operations.find(row=>row.id===c.operationId);
      if(previous){check(previous.payloadDigest===payloadDigest,'/operationId','This operation identifier already belongs to different receipt details.');return {status:'ready',problems:[],changes:null,reviewDigest:stable({payloadDigest,operation:previous}),payloadDigest,command:c,recordIds:copy(previous.recordIds),duplicateCandidates:[],alreadyCommitted:true,result:copy(previous)};}
      check(c.expected.workspaceRevision===context.revision,'/expected/workspaceRevision','Your workspace changed. Review this receipt again.','needs-review');
      check(c.entity.date<=context.today&&c.entity.settlements[0].date<=context.today,'/entity/date','Choose purchase and payment dates on or before today.');
      check(!domain.versions.some(v=>v.rootId===c.purchaseId||v.id===c.versionId),'/purchaseId','This purchase or version identifier already exists.');
      const productMap=new Map(domain.products.map(p=>[p.versionId,p])),latestProducts=new Map();domain.products.forEach(p=>latestProducts.set(p.productId,p));
      for(const [i,p] of c.entity.products.entries()){
        const path='/entity/products/'+i;check(!productMap.has(p.versionId),path+'/versionId','This product version is already recorded. Select the existing version instead.');const prior=latestProducts.get(p.productId);check(prior?p.supersedes===prior.versionId:p.supersedes===null,path+'/supersedes','This product version has changed. Review its current version.','needs-review');productMap.set(p.versionId,p);latestProducts.set(p.productId,p);
      }
      const foods=new Map(workspace.domains.food.foods.map(f=>[f.id,f]));for(const p of c.entity.products)if(p.ingredientMapping)check(foods.has(p.ingredientMapping.foodId),'/entity/products','Choose a known nutritional food for this mapping.','needs-review');
      const problems=[],stock=[];
      for(const [i,line] of c.entity.lines.entries()){
        const path='/entity/lines/'+i,p=line.productVersionId===null?null:productMap.get(line.productVersionId);check(line.productVersionId===null||!!p,path+'/productVersionId','This product version was not found.','needs-review');
        if(line.inventory.mode==='receive'){
          check(foods.has(line.inventory.foodId)&&p?.ingredientMapping?.foodId===line.inventory.foodId&&p.ingredientMapping.gramsPerBaseUnit===0.001,path+'/inventory','Confirm an explicit mapping to this pantry food.','needs-review');
          const counts=workspace.domains.food.movements.filter(m=>m.foodId===line.inventory.foodId&&m.date===c.entity.date&&['count','count-import'].includes(m.kind));const count=counts[counts.length-1];
          if(count&&!(line.inventory.order==='after-count'&&line.inventory.stockObservationId===count.id&&acknowledged(c,path+'/inventory/order')))problems.push({path:path+'/inventory/order',reason:'A stock count already exists on this date. Confirm this purchase happened after that count, or choose the actual earlier date.',status:'needs-review',stockObservationId:count.id});
          if(!count)check(line.inventory.order===undefined&&line.inventory.stockObservationId===undefined,path+'/inventory/order','This stock-count reference no longer matches the selected date.','needs-review');
          stock.push({lineId:line.id,foodId:line.inventory.foodId,name:foods.get(line.inventory.foodId).name,grams:line.inventory.grams,laterCount:workspace.domains.food.movements.some(m=>m.foodId===line.inventory.foodId&&m.date>c.entity.date&&own(m,'observedGrams'))});
        }
      }
      for(const p of c.entity.products)check(c.entity.lines.some(l=>l.productVersionId===p.versionId),'/entity/products','Every new product version must be used by a receipt line.');
      const s=c.entity.settlements[0],account=workspace.domains.money.accounts.find(a=>a.id===s.accountId);check(account&&['current','savings'].includes(account.type),'/entity/settlements/0/accountId','Choose a current or savings cash account. Credit and investment purchases are not enabled.','unsupported');check(account.openedOn<=s.date,'/entity/settlements/0/date','The payment date predates this account.');
      const recordIds=makeRecordIds(c);let matched=null;
      if(s.mode==='link'){
        matched=latestMoney(workspace.domains.money.versions).find(t=>t.rootId===s.transactionRootId);check(matched&&matched.id===s.expectedTransactionVersionId,'/entity/settlements/0/expectedTransactionVersionId','The selected payment changed. Review the current expense.','needs-review');
        check(matched.type==='expense'&&matched.accountId===s.accountId&&matched.amountPence===s.amountPence&&matched.date===s.date,'/entity/settlements/0','Select an expense with exactly this account, date and full payment amount.','needs-review');
        check(!domain.versions.some(v=>v.recordIds.transactionRootId===s.transactionRootId),'/entity/settlements/0/transactionRootId','This expense is already linked to a recorded purchase.');
      }else{
        integer(workspace.domains.money.sequence,'/money/sequence');check(workspace.domains.money.sequence<Number.MAX_SAFE_INTEGER,'/money/sequence','The payment journal sequence is too large.');
        check(!workspace.domains.money.versions.some(v=>v.id===recordIds.transactionId||v.operationId==='purchase-payment_'+c.operationId),'/operationId','A generated payment identifier already exists.');ledgerCheck(workspace,makeExpense(c,workspace,recordIds));
      }
      for(const [key,array] of [['foodPurchaseIds',workspace.domains.food.purchases],['movementIds',workspace.domains.food.movements]])check(!recordIds[key].some(id=>array.some(row=>row.id===id)),'/versionId','A generated food record identifier already exists.');
      const mark=fingerprint(c),duplicates=domain.versions.filter(v=>fingerprint(v.command)===mark||(c.source.documentHash&&v.command.source.documentHash===c.source.documentHash)).map(v=>({purchaseId:v.rootId,versionId:v.id,date:v.command.entity.date,merchant:v.command.entity.merchant.name,totalPence:v.command.entity.totalPence})).concat(legacyDuplicates(c,workspace));
      for(const d of duplicates)if(!acknowledged(c,'/duplicates/'+d.purchaseId))problems.push({path:'/duplicates/'+d.purchaseId,purchaseId:d.purchaseId,legacy:!!d.legacy,reason:d.legacy?'Matching food quantities and prices were recorded by the earlier receipt tool. Confirm this is a separate trip. Upgrading that earlier receipt is not supported.':'A similar purchase is already recorded. Confirm this is a separate shopping trip.',status:'needs-review'});
      const changes={purchaseId:c.purchaseId,versionId:c.versionId,date:c.entity.date,merchant:c.entity.merchant.name,totalPence:c.entity.totalPence,lines:copy(c.entity.lines),adjustments:copy(c.entity.adjustments),stock,priceObservations:c.entity.lines.filter(l=>l.productVersionId!==null).length,payment:{mode:s.mode,accountId:account.id,accountName:account.name,date:s.date,amountPence:s.amountPence,transactionId:recordIds.transactionId,matched:matched?copy(matched):null},categoryAllocations:[...new Set(c.entity.lines.map(l=>l.category))].map(category=>({category,amountPence:sum(c.entity.lines.filter(l=>l.category===category).map(l=>l.netPence),'/entity/lines')}))};
      return {status:problems.length?'needs-review':'ready',problems,changes,reviewDigest:stable({payloadDigest,revision:context.revision,products:[...productMap.values()].filter(p=>c.entity.lines.some(l=>l.productVersionId===p.versionId)),changes}),payloadDigest,command:c,recordIds,duplicateCandidates:duplicates,alreadyCommitted:false};
    }catch(error){return {status:error.status||'invalid',problems:[{path:error.path||'',reason:error.message||String(error),status:error.status||'invalid'}],changes:null,reviewDigest:null};}
  }
  function buildCandidate(command,context){
    const review=prepare(command,context);if(review.status!=='ready')return {error:review.problems[0]?.reason||'Receipt needs review.',review};
    if(review.alreadyCommitted)return {unchanged:true,result:{status:'already-committed',operationId:review.result.id,purchaseId:review.result.purchaseId,versionId:review.result.versionId,workspaceRevision:review.result.workspaceRevision,recordIds:copy(review.result.recordIds)},review};
    const workspace=copy(context.workspace),c=review.command,ids=review.recordIds;workspace.minimumReaderVersion=63;const domain=workspace.domains.purchases||(workspace.domains.purchases=empty());
    domain.products.push(...copy(c.entity.products));let n=0;
    for(const l of c.entity.lines){if(l.inventory.mode!=='receive')continue;const grams=l.inventory.grams;
      workspace.domains.food.purchases.push({id:ids.foodPurchaseIds[n],receiptId:c.purchaseId,foodId:l.inventory.foodId,date:c.entity.date,store:c.entity.merchant.name,grams,totalPrice:l.netPence/100,totalPricePence:l.netPence,perKg:(l.netPence/100)/grams*1000,attachmentName:c.source.fileName||'',purchaseVersionId:c.versionId,lineId:l.id,productVersionId:l.productVersionId});
      workspace.domains.food.movements.push({id:ids.movementIds[n],foodId:l.inventory.foodId,delta:grams,kind:'purchase',referenceId:c.purchaseId,note:'Receipt added',date:c.entity.date,purchaseVersionId:c.versionId,lineId:l.id});n++;
    }
    if(c.entity.settlements[0].mode==='create'){const event=makeExpense(c,workspace,ids);workspace.domains.money.versions.push(event);workspace.domains.money.sequence=event.sequence;}
    const row={id:c.versionId,rootId:c.purchaseId,supersedes:null,operationId:c.operationId,recordedAt:c.source.capturedAt,command:copy(c),recordIds:copy(ids)};domain.versions.push(row);
    const receipt={id:c.operationId,payloadDigest:review.payloadDigest,purchaseId:c.purchaseId,versionId:c.versionId,workspaceRevision:context.revision+1,recordIds:copy(ids)};domain.operations.push(receipt);
    const validation=validateLinks(workspace);if(!validation.ok)return {error:validation.error,review};
    return {workspace,result:{status:'committed',operationId:c.operationId,purchaseId:c.purchaseId,versionId:c.versionId,workspaceRevision:context.revision+1,recordIds:copy(ids)},review};
  }
  function validateDomain(data){try{
    fields(data,['schema','products','versions','operations'],'/purchases');check(data.schema===SCHEMA,'/purchases/schema','Unsupported purchase history format.','unsupported');for(const k of ['products','versions','operations'])list(data[k],'/purchases/'+k,1000000);
    unique(data.products,'versionId','/purchases/products');unique(data.versions,'id','/purchases/versions');unique(data.operations,'id','/purchases/operations');const latest=new Map();
    for(const [i,p] of data.products.entries()){product(p,'/purchases/products/'+i);const prior=latest.get(p.productId);check(prior?p.supersedes===prior.versionId:p.supersedes===null,'/purchases/products','Broken product version history.');latest.set(p.productId,p);}
    const roots=new Set(),operations=new Set(),productVersions=new Map(data.products.map(p=>[p.versionId,p]));
    for(const v of data.versions){
      fields(v,['id','rootId','supersedes','operationId','recordedAt','command','recordIds'],'/purchases/versions');id(v.rootId,'/purchases/versions/rootId');id(v.operationId,'/purchases/versions/operationId');check(v.supersedes===null&&!roots.has(v.rootId)&&!operations.has(v.operationId),'/purchases/versions','Unsupported or repeated purchase revision.');roots.add(v.rootId);operations.add(v.operationId);
      const c=normalize(v.command);check(stable(c)===stable(v.command),'/purchases/versions','Purchase details are not stored in their reviewed canonical shape.');check(c.operationId===v.operationId&&c.purchaseId===v.rootId&&c.versionId===v.id&&v.recordedAt===c.source.capturedAt,'/purchases/versions','Purchase identity or source changed.');check(stable(v.recordIds)===stable(makeRecordIds(c)),'/purchases/versions/recordIds','Purchase record references are inconsistent.');
      for(const p of c.entity.products)check(productVersions.has(p.versionId)&&stable(productVersions.get(p.versionId))===stable(p),'/purchases/products','The saved product snapshot changed or is missing.');
      for(const l of c.entity.lines)if(l.productVersionId!==null)check(productVersions.has(l.productVersionId),'/purchases/versions','A recorded line references an absent product version.');
    }
    check(data.operations.length===data.versions.length,'/purchases/operations','Every purchase needs one durable operation receipt.');
    for(const op of data.operations){fields(op,['id','payloadDigest','purchaseId','versionId','workspaceRevision','recordIds'],'/purchases/operations');integer(op.workspaceRevision,'/purchases/operations/workspaceRevision',1);const v=data.versions.find(v=>v.operationId===op.id);check(v&&op.purchaseId===v.rootId&&op.versionId===v.id&&op.payloadDigest===stable(v.command)&&stable(op.recordIds)===stable(v.recordIds)&&op.workspaceRevision===v.command.expected.workspaceRevision+1,'/purchases/operations','A durable purchase receipt is inconsistent.');}
    return {ok:true};
  }catch(error){return {ok:false,error:error.message||String(error)};}}
  function validateLinks(workspace){try{
    const d=workspace.domains,domain=d.purchases||empty(),valid=validateDomain(domain);check(valid.ok,'/purchases',valid.error);const foods=new Set(d.food.foods.map(f=>f.id)),productMap=new Map(domain.products.map(p=>[p.versionId,p])),usedPayments=new Set(),usedProducts=new Set();
    for(const p of domain.products)if(p.ingredientMapping)check(foods.has(p.ingredientMapping.foodId),'/purchases/products','A product mapping references an absent food.');
    for(const v of domain.versions){
      const c=v.command,s=c.entity.settlements[0],ids=v.recordIds,tx=d.money.versions.find(t=>t.id===ids.transactionId);check(tx&&tx.rootId===ids.transactionRootId&&tx.accountId===s.accountId&&tx.date===s.date&&tx.type==='expense'&&tx.amountPence===s.amountPence,'/purchases/versions','The recorded payment snapshot is missing or inconsistent.');
      check(!usedPayments.has(tx.rootId),'/purchases/versions','One payment has been linked to more than one receipt.');usedPayments.add(tx.rootId);
      if(s.mode==='create')check(tx.purchaseVersionId===v.id&&tx.operationId==='purchase-payment_'+c.operationId,'/purchases/versions','The generated receipt payment lost its provenance.');
      let n=0;for(const l of c.entity.lines){if(l.productVersionId!==null)usedProducts.add(l.productVersionId);if(l.inventory.mode!=='receive')continue;const p=productMap.get(l.productVersionId);check(p?.ingredientMapping?.foodId===l.inventory.foodId&&p.ingredientMapping.gramsPerBaseUnit===0.001,'/purchases/versions','A receipt stock mapping disagrees with its saved product version.');
        const price=d.food.purchases.find(p=>p.id===ids.foodPurchaseIds[n]),movement=d.food.movements.find(m=>m.id===ids.movementIds[n]);
        check(price&&price.receiptId===v.rootId&&price.purchaseVersionId===v.id&&price.lineId===l.id&&price.productVersionId===l.productVersionId&&price.foodId===l.inventory.foodId&&price.grams===l.inventory.grams&&price.date===c.entity.date&&price.store===c.entity.merchant.name&&price.totalPricePence===l.netPence&&price.totalPrice===l.netPence/100&&price.perKg===(l.netPence/100)/l.inventory.grams*1000,'/purchases/versions','A receipt price observation is missing or changed.');
        check(movement&&movement.referenceId===v.rootId&&movement.purchaseVersionId===v.id&&movement.lineId===l.id&&movement.foodId===l.inventory.foodId&&movement.delta===l.inventory.grams&&movement.date===c.entity.date&&movement.kind==='purchase'&&!own(movement,'observedGrams'),'/purchases/versions','A receipt pantry movement is missing or changed.');
        if(l.inventory.order==='after-count'){const observed=d.food.movements.findIndex(m=>m.id===l.inventory.stockObservationId);check(observed>=0&&observed<d.food.movements.indexOf(movement),'/purchases/versions','Receipt stock count ordering was changed.');const row=d.food.movements[observed];check(row.foodId===l.inventory.foodId&&row.date===c.entity.date&&['count','count-import'].includes(row.kind),'/purchases/versions','Receipt stock count evidence is missing.');}n++;
      }
    }
    for(const p of domain.products)check(usedProducts.has(p.versionId),'/purchases/products','An unused purchase product version has no recorded provenance.');
    for(const [rows,key] of [[d.food.purchases,'foodPurchaseIds'],[d.food.movements,'movementIds']])for(const row of rows)if(row.purchaseVersionId!==undefined)check(domain.versions.some(v=>v.id===row.purchaseVersionId&&v.recordIds[key].includes(row.id)),'/purchases/versions','A food receipt effect has no purchase record.');
    for(const tx of d.money.versions)if(tx.purchaseVersionId!==undefined)check(domain.versions.some(v=>v.id===tx.purchaseVersionId&&v.recordIds.transactionId===tx.id),'/purchases/versions','A receipt payment has no purchase record.');
    return {ok:true};
  }catch(error){return {ok:false,error:error.message||String(error)};}}
  global.PurchaseOperations=Object.freeze({CONTRACT,SCHEMA,empty,prepare,buildCandidate,validateDomain,validateLinks,stableSerialize:stable});
})(window);
