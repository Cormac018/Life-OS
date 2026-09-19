
  (() => {
    'use strict';
    // Offline client over validated domain snapshots and the canonical workspace writer.
    const $ = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const paths = {
      life:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
      journey:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
      venture:'<path d="M5 21V7l7-4 7 4v14H5Zm4 0v-6h6v6M9 8h.01M15 8h.01M9 11h.01M15 11h.01"/>',
      place:'<path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
      capture:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8m-8 4h5"/>',
      mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
      people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v1"/>',
      gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C4 8 5 1 9 3c2 1 3 5 3 5Zm0 0c8 0 7-7 3-5-2 1-3 5-3 5Z"/>',
      search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
      back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
      money:'<path d="M4 5h16v14H4zM4 9h16M8 15h3"/><circle cx="17" cy="15" r="1"/>',
      wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 13h5v4h-5z"/>',
      debt:'<path d="M5 4h14v17l-3-2-4 2-4-2-3 2V4Zm3 5h8m-8 4h5"/>',
      transfer:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 4h3"/>',
      planner:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2M3 12h2m14 0h2M12 3v2m0 14v2"/>',
      goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 21 3m-4 0h4v4"/>',
      home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
      circle:'<circle cx="12" cy="12" r="6"/>',
      work:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12c6 4 12 4 18 0M10 14h4"/>',
      more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      pause:'<path d="M8 4v16M16 4v16"/>',
      food:'<path d="M4 3v7m3-7v7m-6-7v7h6m-3 0v11M17 3c-4 4-4 8 0 9V3Zm0 9v9"/>',
      pantry:'<path d="M4 4h16v17H4zM4 12h16M8 7v2m0 7v2M6 1h12"/>',
      shop:'<path d="M3 4h2l3 12h11l3-8H6M10 20h.01M18 20h.01"/>',
      receipt:'<path d="M5 2v20l3-2 4 2 4-2 3 2V2l-3 2-4-2-4 2-3-2Zm3 6h8m-8 4h8m-8 4h5"/>',
      upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
      sleep:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
      today:'<path d="M4 7h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M8 12h3v3H8z"/>',
      train:'<path d="m5 9 10 6M4 6l-3 5m7-3-4 7m12-6-4 7m8-5-3 5M7 9l10 6"/>',
      plan:'<path d="M4 5h16M4 12h16M4 19h16M8 3v4m7 3v4m-5 3v4"/>',
      progress:'<path d="M3 3v18h18M6 16l4-5 4 2 6-8"/>',
      arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
      chevron:'<path d="m9 5 7 7-7 7"/>',
      plus:'<path d="M12 5v14M5 12h14"/>',
      close:'<path d="m6 6 12 12M6 18 18 6"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      shield:'<path d="M12 3 4 6v5c0 5 8 10 8 10s8-5 8-10V6Z"/><path d="m8 11 3 3 5-5"/>',
      edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
      up:'<path d="m6 14 6-6 6 6"/>',
      down:'<path d="m6 10 6 6 6-6"/>',
      trash:'<path d="M4 6h16M9 3h6M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
      pause:'<path d="M8 5v14M16 5v14"/>',
      play:'<path d="m7 4 13 8-13 8Z"/>',
      undo:'<path d="M4 10h9a6 6 0 0 1 0 12M4 10l5-5m-5 5 5 5"/>',
      spark:'<path d="m12 3 2 6 6 3-6 2-2 7-3-7-6-2 6-3Z"/>',
      book:'<path d="M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
      moon:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>'
    };
    const icon = (name, cls = '') => '<svg class="icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name] || paths.arrow)+'</svg>';
    const lifeLocalDate = (value=Date.now()) => {const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
    const lifeWeekDates = date => {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return Array.from({length:7},(_,i)=>new Date(d.getTime()+i*86400000).toISOString().slice(0,10));};
    let TODAY = lifeLocalDate();
    let WEEK = lifeWeekDates(TODAY);
    const dateObj = date => new Date(date+'T12:00:00Z');
    const dateLabel = (date, options = {day:'numeric',month:'short'}) => dateObj(date).toLocaleDateString('en-GB',{...options,timeZone:'UTC'});
    const addDays = (date, count) => {const d=dateObj(date);d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);};
    const EXERCISES = [
      {id:'db-incline',name:'Incline dumbbell press',short:'Incline press',pattern:'Chest',equipment:'Dumbbells',unit:'kg per hand',step:2,base:24,reps:10},
      {id:'cable-row',name:'Seated cable row',short:'Cable row',pattern:'Back',equipment:'Cable stack',unit:'kg on stack',step:2.5,base:50,reps:12},
      {id:'cable-lateral',name:'Cable lateral raise',short:'Lateral raise',pattern:'Delts',equipment:'Cable stack',unit:'kg on stack',step:1.25,base:7.5,reps:15},
      {id:'db-shoulder',name:'Dumbbell shoulder press',short:'Shoulder press',pattern:'Delts',equipment:'Dumbbells',unit:'kg per hand',step:2,base:18,reps:10},
      {id:'rope-pushdown',name:'Rope triceps pushdown',short:'Triceps',pattern:'Arms',equipment:'Cable stack',unit:'kg on stack',step:2.5,base:20,reps:12},
      {id:'db-curl',name:'Incline dumbbell curl',short:'Biceps',pattern:'Arms',equipment:'Dumbbells',unit:'kg per hand',step:2,base:10,reps:12},
      {id:'hack-squat',name:'Hack squat',short:'Hack squat',pattern:'Quads',equipment:'Hack squat machine',unit:'kg added',step:5,base:70,reps:10},
      {id:'db-rdl',name:'Dumbbell Romanian deadlift',short:'Romanian deadlift',pattern:'Hamstrings',equipment:'Dumbbells',unit:'kg per hand',step:2,base:28,reps:10},
      {id:'leg-curl',name:'Seated leg curl',short:'Leg curl',pattern:'Hamstrings',equipment:'Leg curl machine',unit:'kg on stack',step:2.5,base:35,reps:12},
      {id:'calf-raise',name:'Standing calf raise',short:'Calf raise',pattern:'Calves',equipment:'Calf machine',unit:'kg on stack',step:5,base:50,reps:15},
      {id:'lat-pulldown',name:'Neutral-grip lat pulldown',short:'Lat pulldown',pattern:'Back',equipment:'Cable stack',unit:'kg on stack',step:2.5,base:45,reps:12}
    ];
    const exercise = id => EXERCISES.find(e => e.id===id);
    const setText = (set, ex) => esc(set.weight)+' '+esc(ex.unit)+' · '+esc(set.reps)+' reps';
    const setResult = (set, ex) => '<span class="set-result"><span class="set-weight">'+esc(set.weight)+' '+esc(ex.unit)+'</span><span class="set-reps">'+esc(set.reps)+' reps</span></span>';
    const item = (id,sets,min,max,rest=90) => ({slotId:'slot-'+id,exerciseId:id,targetSets:sets,minReps:min,maxReps:max,restSeconds:rest});
    let routines = [
      {id:'upper-a',name:'Upper A',subtitle:'Chest & delts',items:[item('db-incline',4,6,10,120),item('cable-row',3,8,12,90),item('cable-lateral',4,12,20,75),item('db-shoulder',3,8,12,90),item('rope-pushdown',3,10,15,75),item('db-curl',3,10,15,75)]},
      {id:'lower-a',name:'Lower A',subtitle:'Quads & hamstrings',items:[item('hack-squat',4,6,10,150),item('db-rdl',3,8,12,120),item('leg-curl',3,10,15,90),item('calf-raise',4,12,20,75)]},
      {id:'upper-b',name:'Upper B',subtitle:'Back & arms',items:[item('lat-pulldown',4,8,12,120),item('cable-row',3,8,12,90),item('db-shoulder',3,8,12,90),item('db-curl',3,10,15,75),item('rope-pushdown',3,10,15,75)]},
      {id:'lower-b',name:'Lower B',subtitle:'Hinge & lower body',items:[item('db-rdl',4,8,12,120),item('hack-squat',3,8,12,120),item('leg-curl',3,10,15,90),item('calf-raise',4,12,20,75)]}
    ];
    let schedule = {};
    const uid = prefix => String(prefix).replace(/[^a-zA-Z0-9_]/g,'_')+'_'+crypto.randomUUID();
    let history=[];
    const state={route:'today',date:TODAY,todayMode:'day',routineId:'upper-a',active:null,currentExercise:0,editSetId:null,timer:null,chartExercise:'db-incline',chartMetric:'weight',chartRange:84,chartSessionId:null,lastFinished:null};
    let draft=null,dialogOpener=null,toastTimeout=null,chartObserver=null;
    const routine = () => routines.find(r=>r.id===state.routineId) || routines[0];
    const totalSets = r => r.items.reduce((n,e)=>n+e.targetSets,0);
    const performed = session => session.exercises.flatMap(e=>e.sets);
    const nav = [{id:'today',label:'Today',title:'Your day'},{id:'planner',label:'Day planner',title:'Your time, with intention'},{id:'train',label:'Train',title:'Your training'},{id:'plan',label:'Programme',title:'Your programme'},{id:'progress',label:'Progress',title:'Your progress'},{id:'sleep',label:'Sleep',title:'Your sleep'},{id:'food',label:'Food',title:'Your food'},{id:'work',label:'Work',title:'Your work'},{id:'goals',label:'Goals',title:'Your goals'},{id:'life',label:'Life Planner',title:'Your bigger picture'},{id:'money',label:'Money',title:'Your money'},{id:'people',label:'People',title:'Your people'},{id:'capture',label:'Capture',title:'Your check-in'}];
    const chronologicalHistory=()=>history.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.completedAt.localeCompare(b.completedAt));
    function renderNav(){
      const markup = nav.map(n=>'<button class="nav-link" data-action="navigate" data-route="'+n.id+'" aria-label="'+n.label+'" '+(state.route===n.id?'aria-current="page"':'')+'>'+icon(n.id)+'<span>'+n.label+'</span></button>').join('');
      $('desktopNav').innerHTML=markup;const mobileIds=['today','train','food','work'];$('mobileNav').innerHTML=nav.filter(n=>mobileIds.includes(n.id)).map(n=>'<button class="nav-link" data-action="navigate" data-route="'+n.id+'" aria-label="'+n.label+'" '+(state.route===n.id?'aria-current="page"':'')+'>'+icon(n.id)+'<span>'+n.label+'</span></button>').join('')+'<button class="nav-link" data-action="open-sections" aria-label="More sections" '+(!mobileIds.includes(state.route)?'aria-current="page"':'')+'>'+icon('more')+'<span>More</span></button>';$('breadcrumb').textContent=nav.find(n=>n.id===state.route).title;
    }
    function toast(message){queueWorkspaceSave();if(!LifeOSRuntime.ready){showToast(message);return;}LifeOSRuntime.flush().then(()=>showToast(message)).catch(()=>workspaceStatus('error','This change is not saved. Open backups and retry.'));}
    function navigate(route){state.route=route;window.history.replaceState(null,'','#'+route);render();window.scrollTo({top:0,behavior:'instant'});}
    function render(){
      if(LifeOSRuntime.ready&&!restoringWorkspace)queueMicrotask(queueWorkspaceSave);
      if(chartObserver){chartObserver.disconnect();chartObserver=null;}
      renderNav();
      $('main').innerHTML='<div class="view-enter">'+({today:renderToday,planner:()=>PlannerUI.render(),train:renderTrain,plan:renderPlan,progress:renderProgress,sleep:renderSleep,food:renderFood,work:renderWork,goals:renderGoals,money:renderMoney,people:renderPeople,capture:renderCapture,life:renderLifePlanner}[state.route]())+'</div>';
      if(state.route==='progress'){renderChart();chartObserver=new ResizeObserver(()=>renderChart());chartObserver.observe($('chart'));}
      if(state.active&&state.route==='train')updateTimer();
    }
// Read-only overview of the domain models.
const TodayDemo = (() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value + 'T12:00:00Z').getTime()) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  const clock = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
  const duration = value => { const n = Math.max(0, Math.round(Number(value) || 0)); return Math.floor(n / 60) + 'h' + (n % 60 ? ' ' + n % 60 + 'm' : ''); };
  const amount = value => Number.isFinite(value) ? new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(value) : 'Amount not set';
  const count = (n, singular, plural = singular + 's') => n + ' ' + (n === 1 ? singular : plural);
  const plus = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const weekStart = date => { const d = new Date(date + 'T12:00:00Z').getUTCDay(); return plus(date, -(d === 0 ? 6 : d - 1)); };
  const stampTime = (value, date) => {
    if (value === null || value === undefined || value === '') return null;
    const d = new Date(value); if (!Number.isFinite(d.getTime())) return null;
    const localDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return localDate === date ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : null;
  };
  const actionDoneAt = (action, date, events) => {
    const relevant = events.filter(e => e.actionId === action.id && e.date <= date);
    return relevant.length ? relevant[relevant.length - 1].type === 'complete' : false;
  };
  const pendingCapture = () => {
    const batches = new Map(CaptureDemo.history.map(b => [b.id, b]));
    if (CaptureDemo.current) batches.set(CaptureDemo.current.id, CaptureDemo.current);
    return [...batches.values()].map(b => ({...b, pendingCount: b.proposals.filter(p => !['saved', 'duplicate', 'skipped'].includes(p.status)).length + b.unresolved.filter(u => !u.dismissed).length})).filter(b => b.pendingCount > 0);
  };
  function snapshot(date = TODAY) {
    if (!validDate(date)) throw new Error('Choose a valid calendar date.');
    const isToday = date === TODAY, isPast = date < TODAY, isFuture = date > TODAY;
    const entries = [], domains = [], attention = [];
    const ref = (kind, id, extra = {}) => ({kind, ...(id ? {id} : {}), date, ...extra});
    const add = (domain, id, title, detail, status, time, reference, extra = {}) => {
      const row = {id: domain + ':' + id, domain, title, detail, date, time: clock(time), status, route: domain, ref: reference, ...extra};
      entries.push(row); return row;
    };
    const summary = (key, label, value, detail, data = {}) => domains.push({key, label, value, detail, route: key, ref: ref('domain', null, {domain: key}), ...data});
    const notice = (key, title, detail, reason, route, reference, rank) => attention.push({id: key, title, detail, reason, route, ref: reference, rank});
    const allSessions = history.slice(), sessions = allSessions.filter(s => s.date === date);
    const plannedRoutine = routines.find(r => r.id === schedule[date]) || null;
    const activeWorkout = isToday ? state.active : null;
    sessions.forEach(s => {
      const start = stampTime(s.startedAt, date), finish = stampTime(s.completedAt, date);
      const sets = s.exercises.reduce((n, e) => n + e.sets.filter(set => set.completed !== false).length, 0);
      add('train', s.id, s.name, count(sets, 'recorded set') + (Number.isFinite(s.minutes) ? ' · ' + duration(s.minutes) : '') + (!start && finish ? ' · finish time' : ''), 'recorded', start || finish, ref('training-session', s.id), {endTime: start ? finish : null, timeMeaning: start ? 'start' : finish ? 'finish' : null});
    });
    let trainingPlan = null;
    if (plannedRoutine && !sessions.some(s => s.templateId === plannedRoutine.id) && !(activeWorkout && activeWorkout.templateId === plannedRoutine.id)) trainingPlan = add('train', 'plan-' + date, plannedRoutine.name, count(plannedRoutine.items.length, 'exercise') + ' · time not set', 'planned', null, ref('training-plan', null, {routineId: plannedRoutine.id}));
    let trainingLive = null;
    if (activeWorkout) trainingLive = add('train', 'active-' + activeWorkout.id, activeWorkout.name, 'Workout in progress · recorded sets are kept in the session' + (activeWorkout.date !== date ? ' · started ' + activeWorkout.date + (stampTime(activeWorkout.startedAt, activeWorkout.date) ? ' ' + stampTime(activeWorkout.startedAt, activeWorkout.date) : '') : ''), 'active', activeWorkout.date === date ? stampTime(activeWorkout.startedAt, date) : null, ref('training-active', activeWorkout.id));
    summary('train', 'Training', activeWorkout ? 'In progress' : sessions.length ? count(sessions.length, 'session') : plannedRoutine ? 'Planned' : 'No session', sessions.length ? 'Recorded on this date' + (trainingPlan ? ' · another session planned' : '') : trainingPlan ? plannedRoutine.name + ' · time not set' : 'No workout recorded on this date');

    const sleeps = activeSleepRecords().filter(s => s.wakeDate === date), mainSleep = sleeps.filter(s => s.kind === 'main'), naps = sleeps.filter(s => s.kind === 'nap');
    sleeps.forEach(s => add('sleep', s.id, s.kind === 'nap' ? 'Nap recorded' : 'Sleep recorded', duration(s.duration) + (s.bedTime && s.wakeTime ? ' · ' + s.bedTime + ' to ' + s.wakeTime : ' · duration only') + (s.note ? ' · ' + s.note : ''), 'recorded', s.wakeTime, ref('sleep-record', s.id, {wakeDate: s.wakeDate}), {timeMeaning: s.wakeTime ? 'wake' : null}));
    summary('sleep', 'Sleep', mainSleep.length ? duration(mainSleep.reduce((n, s) => n + s.duration, 0)) : naps.length ? duration(naps.reduce((n, s) => n + s.duration, 0)) + ' naps' : 'No entry', mainSleep.length ? 'Main sleep, attributed to the wake date' + (naps.length ? ' · ' + count(naps.length, 'nap') : '') : naps.length ? 'Naps recorded · no main sleep entry' : 'No sleep recorded for this wake date');

    const foodDay = FoodDemo.day(date), loggedPlanIds = new Set(FoodDemo.logs.map(l => l.planId));
    const mealPlans = foodDay.plans.filter(p => !loggedPlanIds.has(p.id));
    foodDay.logs.forEach(l => add('food', l.id, l.name, count(l.servings, 'serving') + ' · ' + Math.round(l.perServing.protein * l.servings) + ' g protein recorded', 'recorded', l.time, ref('meal-log', l.id, {planId: l.planId})));
    mealPlans.forEach(p => { const r = FoodDemo.recipe(p.mealId); add('food', p.id, r ? r.name : 'Planned meal', count(p.servings, 'serving') + ' planned', 'planned', p.time, ref('meal-plan', p.id)); });
    summary('food', 'Food', foodDay.logs.length ? Math.round(foodDay.eaten.protein) + ' g protein' : mealPlans.length ? count(mealPlans.length, 'meal planned', 'meals planned') : 'No entries', foodDay.logs.length ? count(foodDay.logs.length, 'meal recorded', 'meals recorded') + (mealPlans.length ? ' · ' + mealPlans.length + ' still planned' : '') : 'No meals recorded on this date', {recordedProtein: foodDay.logs.length ? foodDay.eaten.protein : null, targetProtein: foodDay.target.protein});

    const workRows = WorkDemo.entries.filter(e => e.date === date), workWeek = WorkDemo.week(date);
    const liveWork = isToday ? WorkDemo.previewActive() : null;
    const currentWork = liveWork;
    const liveDay = currentWork ? WorkDemo.activeRange(date) : {minutes:0};
    workRows.forEach(e => add('work', e.id, 'Work shift', duration(e.minutes) + ' worked · ' + duration(e.breakMinutes) + ' unpaid break' + (e.end.slice(0, 10) !== date ? ' · ends ' + e.end.slice(0, 10) : ''), 'recorded', e.start.slice(11, 16), ref('work-entry', e.id), {endTime: clock(e.end.slice(11, 16)), endDate: e.end.slice(0, 10)}));
    let workLive = null;
    if (currentWork) workLive = add('work', 'active-' + currentWork.id, 'Work clock running', duration(liveDay.minutes) + ' worked today · ' + duration(currentWork.minutes) + ' this shift' + (currentWork.date !== date ? ' · started ' + currentWork.start.replace('T',' ') : ''), 'active', currentWork.date === date ? currentWork.start.slice(11, 16) : null, ref('work-active', currentWork.id));
    const dayOff = WorkDemo.dayAbsences(date), offNames = {annual: 'Annual leave', sick: 'Sick leave', bank: 'Bank holiday'};
    dayOff.rows.forEach(r => add('work', 'absence-' + r.id, offNames[r.type] || 'Time off', duration(Math.max(0, r.day.toMinute - r.day.fromMinute)) + ' time-off credit' + (r.note ? ' · ' + r.note : ''), r.type === 'sick' && date <= TODAY ? 'recorded' : 'planned', null, ref('work-absence', r.id)));
    const dayWorkMinutes = workRows.reduce((n, e) => n + e.minutes, 0), hasDayWork = workRows.length > 0 || !!currentWork;
    summary('work', 'Work', hasDayWork ? duration(dayWorkMinutes + liveDay.minutes) : dayOff.rows.length ? 'Time off' : 'No entry', hasDayWork ? 'Recorded work' + (currentWork ? ' + today’s live work' : '') + ' · breaks excluded' : dayOff.rows.length ? duration(dayOff.creditMinutes) + ' credit · work tracked separately' : 'No work recorded on this date');

    const goalLogs = GoalsDemo.logs.filter(l => l.date === date), actionEvents = GoalsDemo.actionEvents, allActions = GoalsDemo.actions;
    const dayActionEvents = actionEvents.filter(e => e.date === date);
    goalLogs.forEach(l => add('goals', l.id, l.goalName, l.value + ' ' + l.unit + ' recorded' + (l.note ? ' · ' + l.note : ''), 'recorded', null, ref('goal-progress', l.id, {goalId: l.goalId})));
    dayActionEvents.forEach(e => add('goals', e.id, e.snapshot.title, (e.type === 'complete' ? 'Action completed' : 'Completion undone') + (e.snapshot.goalName ? ' · ' + e.snapshot.goalName : ''), 'recorded', null, ref('goal-action-event', e.id, {actionId: e.actionId})));
    const dayActions = allActions.filter(a => a.date === date && !actionDoneAt(a, date, actionEvents));
    dayActions.forEach(a => add('goals', a.id, a.title, (a.minutes !== null ? a.minutes + ' min estimate · ' : '') + 'Open action', date <= TODAY ? 'open' : 'planned', null, ref('goal-action', a.id)));
    const goalsRecorded = goalLogs.length + dayActionEvents.filter(e => e.type === 'complete').length;
    summary('goals', 'Goals & actions', goalsRecorded ? count(goalsRecorded, 'step recorded', 'steps recorded') : dayActions.length ? count(dayActions.length, 'open action') : 'No entries', goalsRecorded ? count(dayActions.length, 'open action') + ' on this date' : dayActions.length ? 'Planned actions stay open until completed' : 'No action or progress recorded on this date');

    const peopleEvents = PeopleDemo.events.filter(e => e.date === date), peopleUpcoming = PeopleDemo.upcoming({from: date, to: date});
    peopleEvents.forEach(e => add('people', e.id, e.type === 'contact' ? (e.kind === 'call' ? 'Called ' : e.kind === 'in-person' ? 'Met ' : 'Contacted ') + e.personName : 'Remember for ' + e.personName, e.title || e.body || (e.type === 'contact' ? 'Contact recorded' : 'Note recorded'), 'recorded', null, ref('people-event', e.id, {personId: e.personId})));
    peopleUpcoming.forEach(p => {
      if (p.type === 'contact' && isPast) return;
      add('people', p.id, p.type === 'birthday' ? p.personName + "'s birthday" : p.type === 'plan' ? p.title : 'Reach out to ' + p.personName, p.type === 'plan' ? p.personName + ' · planned' : p.type === 'birthday' ? 'Birthday reminder' : 'Based on the current contact rhythm', 'planned', p.time, p.type === 'plan' ? ref('people-plan', p.planId, {personId: p.personId}) : ref('person', p.personId));
    });
    const peoplePlannedCount = entries.filter(e => e.domain === 'people' && e.status === 'planned').length;
    summary('people', 'People', peopleEvents.length ? count(peopleEvents.length, 'entry', 'entries') : peoplePlannedCount ? count(peoplePlannedCount, 'reminder') : 'No entries', peopleEvents.length ? count(peopleEvents.filter(e => e.type === 'contact').length, 'contact') + ' recorded' + (peoplePlannedCount ? ' · ' + peoplePlannedCount + ' planned' : '') : peoplePlannedCount ? 'Plans and reminders for this date' : 'No contact or note recorded on this date');

    const transactions = MoneyDemo.transactions.filter(t => t.date === date), recurring = RecurringMoneyDemo.month(date.slice(0, 7)).occurrences.filter(o => o.date === date && !o.recorded);
    const moneyNames = {expense: 'Expense', refund: 'Purchase refund', income: 'Income', transfer: 'Transfer', 'debt-payment': 'Debt payment', 'debt-interest': 'Debt interest', valuation: 'Valuation', 'debt-adjustment': 'Debt adjustment'};
    transactions.forEach(t => add('money', t.id, (moneyNames[t.type] || 'Money entry') + (t.category ? ': ' + t.category : ''), (t.type==='refund'?'+':'') + amount(t.amount) + (t.accountName ? ' · ' + t.accountName : '') + (t.debtName ? ' · ' + t.debtName : ''), 'recorded', null, ref('money-transaction', t.id)));
    recurring.forEach(o => add('money', o.id, o.name, amount(o.amount) + (o.estimated ? ' estimated' : '') + ' · scheduled ' + o.kind, 'planned', null, ref('money-occurrence', o.id, {source: 'recurring'})));
    // Debt due dates are current terms, so never reconstruct historic commitments from them.
    if (!isPast) MoneyDemo.debts.filter(d => d.reviewStatus === 'checked' && d.balance > 0 && d.minPayment > 0 && d.paymentDay && d.openedOn <= date).forEach(d => {
      const last = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0, 12)).getUTCDate();
      if (Number(date.slice(8, 10)) !== Math.min(d.paymentDay, last)) return;
      const operationId = 'scheduled-debt:' + d.id + ':' + date;
      if (MoneyDemo.transactionVersions.some(t => t.operationId === operationId)) return;
      add('money', d.id + '@' + date, d.name + ' payment', amount(d.minPayment) + ' planned minimum · current debt terms', 'planned', null, ref('money-occurrence', d.id + '@' + date, {source: 'debt'}));
    });
    const moneyPlannedCount = entries.filter(e => e.domain === 'money' && e.status === 'planned').length, expenses = transactions.filter(t => t.type === 'expense'), refunds = transactions.filter(t => t.type === 'refund');
    summary('money', 'Money', expenses.length||refunds.length ? amount((expenses.reduce((n,t)=>n+t.amountPence,0)-refunds.reduce((n,t)=>n+t.amountPence,0))/100) : transactions.length ? count(transactions.length, 'entry', 'entries') : moneyPlannedCount ? count(moneyPlannedCount, 'item due', 'items due') : 'No entries', expenses.length||refunds.length ? 'Net spending · '+count(expenses.length, 'expense')+(refunds.length?' · '+count(refunds.length,'refund'):'')+' recorded' + (moneyPlannedCount ? ' · ' + moneyPlannedCount + ' planned' : '') : transactions.length ? 'Money recorded on this date' : moneyPlannedCount ? 'Scheduled amounts are not payments' : 'No money recorded on this date');

    const captureQueue = isToday ? pendingCapture() : [];
    captureQueue.forEach(b => add('capture', b.id, 'Check-in awaiting review', count(b.pendingCount, 'item') + ' to review · source date ' + b.date, 'open', null, ref('capture-batch', b.id)));
    summary('capture', 'Capture', isToday ? captureQueue.length ? count(captureQueue.reduce((n, b) => n + b.pendingCount, 0), 'item to review', 'items to review') : 'Clear' : 'Open Capture', isToday ? captureQueue.length ? count(captureQueue.length, 'check-in') + ' in the current review queue' : 'No unfinished check-ins' : 'The review queue is current, not a historical daily measure');

    if (isToday) {
      if (captureQueue.length) notice('capture-review', 'Review your check-in', count(captureQueue.reduce((n, b) => n + b.pendingCount, 0), 'item') + ' waiting for your decisions', 'Unfinished Capture proposals', 'capture', ref('capture-batch', captureQueue[0].id), 10);
      const pastPlans = PeopleDemo.plans.filter(p => p.status === 'planned' && p.date < TODAY && !PeopleDemo.person(p.personId).archived);
      if (pastPlans.length) notice('people-plans', 'Check an earlier plan', count(pastPlans.length, 'past plan') + ' still open', 'Past dates with no completion or cancellation recorded', 'people', ref('people-plan', pastPlans[0].id, {date: pastPlans[0].date, personId: pastPlans[0].personId}), 20);
      const overdueActions = allActions.filter(a => a.date < TODAY && !a.done);
      if (overdueActions.length) notice('actions-open', 'Choose what to carry forward', count(overdueActions.length, 'earlier action') + ' still open', 'Actions remain open until completed or rescheduled', 'goals', ref('goal-action', overdueActions[0].id, {date: overdueActions[0].date}), 30);
      if (moneyPlannedCount) notice('money-due', 'Check today\'s scheduled money', count(moneyPlannedCount, 'planned item') + ' without a linked record', 'Due dates are plans, not confirmed payments', 'money', entries.find(e => e.domain === 'money' && e.status === 'planned').ref, 25);
      const shoppingNeeds = FoodDemo.shopping(TODAY, plus(TODAY, 2)).filter(item => item.shortage > 0);
      if (shoppingNeeds.length) {
        const earliestNeededBy = shoppingNeeds.map(item => item.neededBy).filter(validDate).sort()[0] || null;
        notice('food-shopping', 'Prepare for your next meals', count(shoppingNeeds.length, 'ingredient') + ' short for the next 3 days' + (earliestNeededBy ? ' · first needed ' + earliestNeededBy : ''), 'Planned meals compared with current pantry quantities', 'food', ref('food-shopping', null, {date: TODAY, days: 3}), 40);
      }
      if (!mainSleep.length) notice('sleep-missing', 'Add your sleep', 'No main sleep recorded for this wake date', 'A missing entry does not describe how you slept', 'sleep', ref('sleep-add', null, {date: TODAY}), 50);
    }

    let focus = null;
    const focusOn = (entry, reason, actionLabel) => ({title: entry.title, detail: entry.detail, reason, route: entry.route, ref: entry.ref, actionLabel, status: entry.status});
    if (trainingLive) focus = focusOn(trainingLive, 'Your workout is already in progress', 'Continue workout');
    else if (workLive) focus = focusOn(workLive, 'Your work clock is already running', 'Open work clock');
    else if (!isPast) {
      const nowTime = isToday ? WorkDemo.civilNow().slice(11, 16) : '00:00';
      const commitments = entries.filter(e => e.status === 'planned' && e.time !== null && e.time >= nowTime).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
      const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5)),near=commitments[0]&&minutes(commitments[0].time)-minutes(nowTime)<=90;
      if(commitments.length&&(!isToday||near||!trainingPlan))focus=focusOn(commitments[0],isToday&&near?'Your next timed commitment is within 90 minutes':'The next saved time on the selected date','Open plan');
      if(!focus&&isToday&&trainingPlan)focus=focusOn(trainingPlan,'A workout is scheduled, with no saved timed commitment in the next 90 minutes','Start workout');
      if (!focus) {
        const action = entries.find(e => e.domain === 'goals' && (e.status === 'open' || e.status === 'planned'));
        if (action) focus = focusOn(action, 'An open action on the selected date', 'Open action');
      }
      if (!focus) {
        const untimed = entries.find(e => e.status === 'planned' && e.time === null);
        if (untimed) focus = focusOn(untimed, 'A plan on the selected date with no time set', 'Open plan');
      }
    }
    if (!focus) focus = {title: isPast ? 'Return to this day' : 'Make room for what matters', detail: isPast ? count(entries.filter(e => e.status === 'recorded').length, 'recorded entry', 'recorded entries') + ' across your life' : 'Choose an action or add a plan to this date.', reason: isPast ? 'A historical date shows the record, not a current instruction' : 'No active session or dated commitment selected', route: isPast ? 'today' : 'goals', ref: ref('domain', null, {domain: isPast ? 'today' : 'goals'}), actionLabel: isPast ? 'Explore the record' : 'Choose an action', status: isPast ? 'recorded' : 'open'};

    const start = weekStart(date), end = plus(start, 6), weekLogs = allSessions.filter(s => s.date >= start && s.date <= end);
    const days = Array.from({length: 7}, (_, i) => { const d = plus(start, i), done = allSessions.filter(s => s.date === d); return {date: d, training: {recorded: done.length, planned: schedule[d] && !done.some(s => s.templateId === schedule[d]) ? 1 : 0}, sleep: {recorded: activeSleepRecords().filter(s => s.wakeDate === d).length}, food: {recorded: FoodDemo.logs.filter(l => l.date === d).length, planned: FoodDemo.plans.filter(p => p.date === d && !loggedPlanIds.has(p.id)).length}, work: {recordedMinutes: WorkDemo.entries.filter(e => e.date === d).reduce((n, e) => n + e.minutes, 0), recorded: WorkDemo.entries.filter(e => e.date === d).length, liveMinutes: isToday && currentWork ? WorkDemo.activeRange(d).minutes : 0, creditMinutes: WorkDemo.dayAbsences(d).creditMinutes}}; });
    const week = {start, end, days, recordedTraining: weekLogs.length, recordedWorkMinutes: workWeek.minutes, targetWorkMinutes: workWeek.targetMinutes, creditedWorkMinutes: workWeek.absenceMinutes, training: {recorded: weekLogs.length, planned: days.reduce((n, d) => n + d.training.planned, 0), scheduled: days.filter(d => schedule[d.date]).length}, work: {recordedMinutes: workWeek.minutes, liveMinutes: isToday && currentWork ? WorkDemo.activeRange(start,end).minutes : 0, targetMinutes: workWeek.targetMinutes, baseTargetMinutes: workWeek.baseTargetMinutes, creditMinutes: workWeek.absenceMinutes, hasRecords: workWeek.entries.length > 0, period: 'Full selected calendar week, not a daily or as-of total'}};
    entries.sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00') || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
    return copy({date, isToday, isPast, isFuture, entries, timeline: entries.filter(e => e.time !== null), unscheduled: entries.filter(e => e.time === null), domains, summaryByDomain: Object.fromEntries(domains.map(d => [d.key, d])), attention: attention.sort((a, b) => a.rank - b.rank).slice(0, 3), focus, week});
  }
  return {snapshot};
})();
function todayPanorama(snapshot) {
  const definitions=[
    {key:'train',label:'Training',colour:todayColors.train},
    {key:'sleep',label:'Sleep',colour:todayColors.sleep},
    {key:'food',label:'Food',colour:todayColors.food},
    {key:'work',label:'Work',colour:todayColors.work},
    {key:'goals',label:'Goals',colour:todayColors.goals},
    {key:'money',label:'Money',colour:todayColors.money},
    {key:'people',label:'People',colour:todayColors.people},
    {key:'capture',label:'Capture',colour:todayColors.capture}
  ];
  const domains=Array.isArray(snapshot?.domains)?snapshot.domains:[];
  const rows=definitions.map((definition,index)=>{
    const source=domains.find(domain=>domain?.key===definition.key)||{};
    return {...definition,label:String(source.label||definition.label),value:source.value===undefined||source.value===null||source.value===''?'Open section':String(source.value),detail:String(source.detail??''),side:index%2?'right':'left',row:Math.floor(index/2)+1};
  });
  const date=typeof snapshot?.date==='string'?snapshot.date:'';
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
  const core=validDate?'<time class="today-panorama-core" datetime="'+esc(date)+'" aria-label="'+esc(dateLabel(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'"><span class="today-panorama-weekday">'+esc(dateLabel(date,{weekday:'long'}))+'</span><strong>'+esc(dateLabel(date,{day:'numeric'}))+'</strong><span class="today-panorama-month">'+esc(dateLabel(date,{month:'long'}))+'</span></time>':'<div class="today-panorama-core"><span class="today-panorama-weekday">Connected</span><strong class="today-panorama-core-word">Your life</strong><span class="today-panorama-month">One place</span></div>';
  return '<section class="today-panorama" aria-label="Your life, connected"><div class="today-panorama-heading"><h2>Your life, connected</h2><p>Open a strand to go deeper.</p></div><div class="today-panorama-field">'+
    '<svg class="today-panorama-orbits" viewBox="0 0 900 336" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="450" cy="168" rx="245" ry="119"/><ellipse cx="450" cy="168" rx="161" ry="146" transform="rotate(-21 450 168)"/><ellipse cx="450" cy="168" rx="100" ry="130" transform="rotate(32 450 168)"/><path d="M67 168H833"/><circle cx="450" cy="168" r="66"/></svg>'+core+
    rows.map(row=>'<button type="button" class="today-panorama-node today-panorama-'+row.side+'" style="--today-panorama-colour:'+row.colour+';--today-panorama-row:'+row.row+'" data-action="today-domain" data-domain="'+row.key+'" aria-label="'+esc(row.label+': '+row.value+(row.detail?'. '+row.detail:'')+'. Open '+row.label.toLowerCase())+'"><span class="today-panorama-wire" aria-hidden="true"></span><span class="today-panorama-copy"><span class="today-panorama-label">'+esc(row.label)+'</span><strong class="today-panorama-value">'+esc(row.value)+'</strong>'+(row.detail?'<span class="today-panorama-detail">'+esc(row.detail)+'</span>':'')+'</span><span class="today-panorama-bead" aria-hidden="true">'+icon(row.key)+'</span></button>').join('')+
    '</div></section>';
}
    const todayView={filter:'all'};
    function todayPlannerRail(date){
      const saved=PlannerOperations.currentDay(plannerRecords,date),count=saved?saved.value.slots.filter(slot=>!slot.cancelled&&slot.origin!=='baseline').length:0;
      return '<button class="today-capture-rail" data-action="planner-open" data-date="'+date+'"><span>'+icon('planner')+'</span><span><strong>Make space for your day</strong><small>'+(saved?count+' activities in your saved plan. Open your timeline and week.':'Arrange sleep, work and what matters in your day planner.')+'</small></span>'+icon('arrow')+'</button>';
    }
    const todayColors={train:'#c0b3ff',sleep:'#94bbff',food:'#a0d4c0',work:'#f1bc7b',goals:'#bca5f7',money:'#91cbbb',people:'#e8b2d1',capture:'#85d6ff'};
    const todayNames={train:'Training',sleep:'Sleep',food:'Food',work:'Work',goals:'Goals',money:'Money',people:'People',capture:'Capture'};
    function todayWeekDates(date){const start=WorkDemo.monday(date);return Array.from({length:7},(_,i)=>addDays(start,i));}
    function todayStatus(entry){return {recorded:'Recorded',planned:'Planned',active:'In progress',open:'To do'}[entry.status]||'To review';}
    function todayDateStrip(){return '<div class="today-strip" aria-label="Choose a day this week">'+todayWeekDates(state.date).map(date=>'<button class="today-date '+(date===TODAY?'today-current':'')+'" data-action="today-date" data-date="'+date+'" aria-pressed="'+(date===state.date)+'" aria-label="'+dateLabel(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(date===TODAY?', today in this app':'')+'"><span class="today-weekday">'+dateLabel(date,{weekday:'short'})+'</span><strong>'+Number(date.slice(-2))+'</strong></button>').join('')+'</div>';}
    function todayFocusPanel(snapshot){const f=snapshot.focus,domain=f.domain||f.route||'today';return '<section class="today-focus" aria-labelledby="todayFocusTitle"><div class="today-focus-copy"><div class="today-focus-label"><i></i>'+(snapshot.isToday?'A little direction, right now':snapshot.isPast?'A day in your story':'Make space for what matters')+'</div><h2 id="todayFocusTitle">'+esc(f.title)+'</h2><p id="todayFocusDetail">'+esc(f.detail)+'</p><div class="today-focus-actions"><button class="button primary" data-action="today-focus">'+esc(f.actionLabel||'Open details')+icon('arrow')+'</button><button class="text-button" data-action="today-why">Why this suggestion?</button></div></div><div class="today-orbit" aria-hidden="true"><svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="107" fill="none" stroke="currentColor" stroke-opacity=".18"/><circle cx="115" cy="115" r="80" fill="none" stroke="currentColor" stroke-opacity=".23" stroke-dasharray="2 9"/><ellipse cx="115" cy="115" rx="111" ry="74" fill="none" stroke="currentColor" stroke-opacity=".42" transform="rotate(-35 115 115)"/><path d="M32 186 Q78 227 156 207" fill="none" stroke="#c0b3ff" stroke-width="2" stroke-linecap="round"/><circle cx="156" cy="207" r="3" fill="#c0b3ff"/></svg><span class="today-orbit-center">'+icon(paths[domain]?domain:'today')+'</span><span class="today-orbit-node">'+icon('sleep')+'</span><span class="today-orbit-node">'+icon('goals')+'</span><span class="today-orbit-node">'+icon('people')+'</span></div></section>';}
    function todayEntryMarkup(e){return '<button class="today-entry '+esc(e.status)+'" style="--strand:'+todayColors[e.domain]+'" data-action="today-entry" data-id="'+esc(e.id)+'"><span class="today-entry-time">'+(e.time?esc(e.time):'<span aria-label="No time set">Anytime</span>')+(e.endTime?'<small>to '+esc(e.endTime)+'</small>':'')+'</span><span class="today-entry-mark" aria-hidden="true"></span><span class="today-entry-copy"><strong>'+esc(e.title)+'</strong><p>'+esc(e.detail)+'</p><span class="today-entry-status">'+icon(e.status==='recorded'?'check':e.status==='active'?'play':e.domain)+'<span>'+esc(todayNames[e.domain])+' · '+todayStatus(e)+'</span></span></span>'+icon('chevron')+'</button>';}
    function todayDayCanvas(snapshot){const filtered=snapshot.entries.filter(e=>todayView.filter==='all'||(todayView.filter==='recorded'?e.status==='recorded':e.status!=='recorded')),timed=filtered.filter(e=>e.time),anytime=filtered.filter(e=>!e.time),recorded=snapshot.entries.filter(e=>e.status==='recorded').length,open=snapshot.entries.length-recorded;return '<div class="today-day-layout"><section aria-labelledby="todayTimelineTitle"><div class="today-section-head"><div><h2 id="todayTimelineTitle">The shape of your day</h2><p>'+dateLabel(snapshot.date,{weekday:'long',day:'numeric',month:'long'})+'</p></div><button class="text-button" data-action="today-add">'+icon('plus')+'<span class="sr">Add to this day</span></button></div><div class="today-filter" aria-label="Filter day entries">'+[['all','Everything',snapshot.entries.length],['open','Plans & actions',open],['recorded','Recorded',recorded]].map(([key,label,count])=>'<button data-action="today-filter" data-filter="'+key+'" aria-pressed="'+(todayView.filter===key)+'">'+label+' <span class="quiet">'+count+'</span></button>').join('')+'</div>'+(filtered.length?(timed.length?'<div class="today-stream">'+timed.map(todayEntryMarkup).join('')+'</div>':'')+(anytime.length?'<div class="today-untimed-label">'+(timed.length?'Also on your day':'No time set')+'</div><div class="today-stream">'+anytime.map(todayEntryMarkup).join('')+'</div>':''):'<div class="today-empty">'+icon('today')+(todayView.filter==='recorded'?'Nothing recorded for this day yet. An empty log is simply an empty log.':todayView.filter==='open'?'No plans or actions in this view. You can give the day some shape below.':'There is space here. Add a plan, or record something that happened.')+'<br><button class="text-button" data-action="today-add">Add to this day '+icon('arrow')+'</button></div>')+'<p class="today-day-note">Times appear only where you have saved them. Filled dots are records or live activity; outlined dots are plans or actions.</p></section><aside class="today-attention"><h2>Worth your attention</h2><p>'+ (snapshot.isToday?'A short list from across your life. Open an item to decide what happens next.':(snapshot.isPast?'Your recorded day. Open the week or life map for more context.':'Plans remain plans until you record what happened.'))+'</p><div class="today-attention-list">'+(snapshot.attention.length?snapshot.attention.map((a,i)=>'<button class="today-nudge" style="--strand:'+todayColors[a.domain||a.route]+'" data-action="today-attention" data-index="'+i+'"><span>'+icon(a.domain||a.route)+' '+esc(todayNames[a.domain||a.route]||'Attention')+'</span><strong>'+esc(a.title)+'</strong><p>'+esc(a.detail||a.reason)+'</p></button>').join(''):'<p class="today-day-note">No extra reminders for this date. Explore the life map whenever you want the wider view.</p>')+'</div>'+todayWeekSummary(snapshot)+'</aside></div>';}
    function todayWeekSummary(snapshot){const week=snapshot.week;return '<section class="today-week-summary"><h3>The week around you</h3><div class="today-week-stat"><span>Training recorded</span><strong>'+week.recordedTraining+' sessions</strong></div><div class="today-week-stat"><span>Work recorded</span><strong>'+sleepDuration(week.recordedWorkMinutes)+'</strong></div><div class="today-week-stat"><span>Adjusted work target</span><strong>'+sleepDuration(week.targetWorkMinutes)+'</strong></div><p>'+dateLabel(week.start,{day:'numeric',month:'short'})+' to '+dateLabel(week.end,{day:'numeric',month:'short'})+'. '+(week.creditedWorkMinutes?sleepDuration(week.creditedWorkMinutes)+' removed for scheduled time off. ':'')+'Planned work is never counted as worked.</p><button class="text-button" data-action="today-mode" data-mode="week">See the whole week '+icon('arrow')+'</button></section><button class="life-today-link" data-action="navigate" data-route="life">'+icon('life')+'<span><strong>Beyond this week</strong><small>Explore your ambitions and the life you want to build.</small></span></button>';}
    function todayWeekCanvas(snapshot){const dates=todayWeekDates(snapshot.date),days=dates.map(date=>TodayDemo.snapshot(date));return '<section><div class="today-section-head"><div><h2>Seven days, every strand</h2><p>'+dateLabel(dates[0],{day:'numeric',month:'long'})+' to '+dateLabel(dates[6],{day:'numeric',month:'long',year:'numeric'})+'</p></div></div><p class="today-day-note">Each dot is an entry in that area. Tap any day to follow its timeline.</p><div class="today-week-grid"><span></span>'+dates.map(date=>'<div class="today-week-axis">'+dateLabel(date,{weekday:'short'})+'<strong>'+Number(date.slice(-2))+'</strong></div>').join('')+Object.keys(todayNames).map(domain=>'<div class="today-week-name" style="--strand:'+todayColors[domain]+'">'+icon(domain)+'<span>'+todayNames[domain]+'</span></div>'+days.map(day=>{const entries=day.entries.filter(e=>e.domain===domain),saved=entries.filter(e=>e.status==='recorded').length,active=entries.filter(e=>e.status==='active').length,remaining=entries.length-saved-active;return '<button class="today-week-cell" style="--strand:'+todayColors[domain]+'" data-action="today-week-day" data-date="'+day.date+'" aria-pressed="'+(day.date===state.date)+'" aria-label="'+esc(todayNames[domain])+', '+dateLabel(day.date,{weekday:'long',day:'numeric',month:'long'})+': '+saved+' recorded, '+active+' in progress, '+remaining+' planned or open"><span class="sr">'+entries.length+' entries</span>'+(entries.length?entries.slice(0,4).map(e=>'<i class="today-week-bead '+e.status+'" aria-hidden="true"></i>').join('')+(entries.length>4?'<span class="today-week-more" aria-hidden="true">+'+(entries.length-4)+'</span>':''):'<i class="today-week-nothing" aria-hidden="true"></i>')+'</button>';}).join('')).join('')+'</div><div class="today-week-legend"><span><i class="today-week-bead recorded"></i>Recorded or in progress</span><span><i class="today-week-bead"></i>Planned or to do</span><span><i class="today-week-nothing"></i>No entries</span></div><p class="today-day-note">An empty day is not a missed target. Work targets account for your bank holidays, annual leave and sick days. The life map shows the detail behind each area.</p></section>';}
    function renderToday(){const snapshot=TodayDemo.snapshot(state.date);return '<div class="today-page"><header class="today-head"><div><div class="kicker"><span class="dot"></span><span class="eyebrow">One day. A whole life.</span></div><h1>Your life, in view.</h1><p>'+(snapshot.isToday?'A little direction for now. The whole picture when you need it.':snapshot.isPast?'Return to a day in your story, and the records you left there.':'See what is planned, and make room for what matters.')+'</p></div><div class="today-date-wrap"><div class="today-date-control"><button class="icon-button" data-action="today-shift" data-days="'+(state.todayMode==='week'?-7:-1)+'" aria-label="Previous '+(state.todayMode==='week'?'week':'day')+'">'+icon('back')+'</button><label class="sr" for="todayDatePicker">Choose any date</label><input id="todayDatePicker" type="date" min="1970-01-05" max="9998-12-31" value="'+state.date+'"><button class="icon-button" data-action="today-shift" data-days="'+(state.todayMode==='week'?7:1)+'" aria-label="Next '+(state.todayMode==='week'?'week':'day')+'">'+icon('chevron')+'</button></div>'+(snapshot.isToday?'<small class="quiet">Today · '+dateLabel(TODAY,{day:'numeric',month:'long',year:'numeric'})+'</small>':'<button class="text-button" data-action="today-date" data-date="'+TODAY+'">Back to today</button>')+'</div></header>'+todayDateStrip()+todayPlannerRail(state.date)+todayFocusPanel(snapshot)+'<button class="today-capture-rail" data-action="today-capture"><span>'+icon('capture')+'</span><span><strong>Tell me about your day</strong><small>Write once. Review the updates across your life.</small></span>'+icon('arrow')+'</button><div class="today-view-tabs" aria-label="Today views">'+[['day','clock','Your day'],['map','circle','Life map'],['week','calendar','Your week']].map(([key,symbol,label])=>'<button data-action="today-mode" data-mode="'+key+'" aria-pressed="'+(state.todayMode===key)+'">'+icon(symbol)+label+'</button>').join('')+'</div><div class="today-canvas" id="todayCanvas">'+(state.todayMode==='map'?todayPanorama(snapshot):state.todayMode==='week'?todayWeekCanvas(snapshot):todayDayCanvas(snapshot))+'</div></div>';}
    let todayLiveAt=0;
    function updateTodayLive(){
      if(state.route!=='today'||state.date!==TODAY||!WorkDemo.active||Date.now()-todayLiveAt<30000)return;
      todayLiveAt=Date.now();const snapshot=TodayDemo.snapshot(TODAY);
      if(snapshot.focus.ref?.kind==='work-active'&&$('todayFocusDetail'))$('todayFocusDetail').textContent=snapshot.focus.detail;
      const current=snapshot.entries.find(e=>e.ref.kind==='work-active');
      if(current)document.querySelectorAll('.today-entry').forEach(node=>{if(node.dataset.id===current.id)node.querySelector('.today-entry-copy p').textContent=current.detail;});
      const work=document.querySelector('.today-panorama-node[data-domain="work"]');
      if(work){const summary=snapshot.summaryByDomain.work;work.querySelector('.today-panorama-value').textContent=summary.value;work.querySelector('.today-panorama-detail').textContent=summary.detail;work.setAttribute('aria-label',summary.label+': '+summary.value+'. '+summary.detail+'. Open work');}
    }
    function todayAddDialog(){showDialog('Add to '+dateLabel(state.date,{day:'numeric',month:'long'}),'<p class="dialog-sub">Start in the right place. Your day updates from the same records as the rest of Life OS.</p><div class="today-quick-grid">'+[['capture','capture','Tell me about it','Review several updates'],['action','goals','An action','Something to get done'],['workout','train','A workout','Choose a routine for this day'],['sleep','sleep','Sleep','Record a night or a nap'],['meal','food','A meal','Plan or record what you ate'],['work','work','Work hours','Record a shift'],['money','money','Money','Income, spending or a transfer'],['people','people','Time together','Make a plan with someone']].map(([key,symbol,title,detail])=>'<button class="today-quick-option" data-action="today-quick" data-kind="'+key+'">'+icon(symbol)+'<span><strong>'+title+'</strong><small>'+detail+'</small></span></button>').join('')+'</div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button></div>');}
    function todayWhyDialog(snapshot){showDialog('Why this is here','<p class="dialog-sub">'+esc(snapshot.focus.reason)+'</p><p class="money-note">Today uses the plans and records in your sections. A suggestion is a prompt, not a judgement or a claim that something happened.</p><h3 class="gap-top">How the next step is chosen</h3><ol class="today-why-list"><li>A workout or work clock already running.</li><li>A workout you planned for today.</li><li>Your next timed commitment.</li><li>An open action, or space to plan.</li></ol><p class="today-day-note">Past days show their records. Future days show their plans. Live activity belongs to today only.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Got it</button></div>');}
    function handleTodayAction(action,data){if(action==='today-action-done'){closeDialog();handleGoalAction('goal-complete-action',{id:data.id});return;}const snapshot=TodayDemo.snapshot(state.date);if(action==='today-mode'){state.todayMode=['day','map','week'].includes(data.mode)?data.mode:'day';render();return;}if(action==='today-date'||action==='today-week-day'){if(!sleepDateValid(data.date))return;state.date=data.date;if(action==='today-week-day')state.todayMode='day';render();return;}if(action==='today-shift'){const next=addDays(state.date,Number(data.days));if(!todayAdapterDate(next)||next<'1970-01-05'){toast('Choose a date between 5 January 1970 and 31 December 9998.');return;}state.date=next;render();return;}if(action==='today-filter'){todayView.filter=data.filter;render();return;}if(action==='today-add'){todayAddDialog();return;}if(action==='today-capture'){todayQuickAdd('capture');return;}if(action==='today-why'){todayWhyDialog(snapshot);return;}if(action==='today-focus'){if(snapshot.isToday&&snapshot.focus.ref?.kind==='training-plan'){startWorkout(snapshot.focus.ref.routineId);return;}if(snapshot.focus.route==='today'){state.todayMode='day';todayView.filter='recorded';render();$('todayCanvas').scrollIntoView({block:'start'});return;}todayOpenRef(snapshot.focus.ref||{},snapshot.focus.route,snapshot.date);return;}if(action==='today-entry'){const e=snapshot.entries.find(e=>e.id===data.id);if(e)todayOpenRef(e.ref||{},e.route||e.domain,snapshot.date);return;}if(action==='today-attention'){const e=snapshot.attention[Number(data.index)];if(e)todayOpenRef(e.ref||{},e.route||e.domain,snapshot.date);return;}if(action==='today-domain'){const d=snapshot.domains.find(d=>d.key===data.domain);if(d)todayOpenRef(d.ref||{},d.route||d.key,snapshot.date);return;}if(action==='today-quick'){todayQuickAdd(data.kind);}}
    // Today opens the owning section. Merely opening a record never logs an event.
    function todayAdapterDate(value) {
      const date = value || state.date || TODAY;
      return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '1970-01-05' && date <= '9998-12-31' && Number.isFinite(Date.parse(date + 'T12:00:00Z')) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date ? date : null;
    }
    function todayAdapterMissing(message) { toast(message || 'This entry has changed or is no longer available. Return to Today to refresh it.'); return false; }
    function todayAdapterDomain(domain, date, route) {
      const destination = route || domain;
      if (!['today', 'train', 'plan', 'progress', 'sleep', 'food', 'work', 'goals', 'money', 'people', 'capture'].includes(destination)) return todayAdapterMissing('This section is not available from Today.');
      if (destination === 'today') state.date = date;
      if (destination === 'train') { state.showFinished = false; if (schedule[date] && routines.some(r => r.id === schedule[date])) state.routineId = schedule[date]; }
      if (destination === 'sleep') { sleepView.selected = date; sleepView.end = date; sleepView.range = 7; sleepView.page = 0; }
      if (destination === 'food') { foodView.tab = 'meals'; foodView.date = date; }
      if (destination === 'work') { if (date < '1970-01-05') return todayAdapterMissing('Work records start from 5 January 1970.'); workView.tab = 'week'; workView.day = date; workView.week = WorkDemo.monday(date); }
      if (destination === 'goals') { goalView.id = null; goalView.tab = 'actions'; goalView.actionFilter = 'open'; }
      if (destination === 'money') { moneyView.tab = date > TODAY ? 'plan' : 'record'; moneyView.month = date.slice(0, 7); moneyView.account = 'all'; moneySetup.calendarMonth = date.slice(0, 7); }
      if (destination === 'people') { peopleView.tab = 'upcoming'; peopleView.range = Math.max(30, Math.min(3650, Math.ceil((Date.parse(date + 'T12:00:00Z') - Date.parse(TODAY + 'T12:00:00Z')) / 86400000) + 1)); }
      if (destination === 'capture') captureView.tab = CaptureDemo.current ? 'capture' : 'history';
      closeDialog(); navigate(destination); return true;
    }
    function todayOpenRef(ref, route, entryDate) {
      if (!ref || typeof ref !== 'object') return todayAdapterMissing();
      const date = todayAdapterDate(ref.date || ref.wakeDate || entryDate);
      if (!date) return todayAdapterMissing('Choose a valid date before opening this entry.');
      let row;
      if (ref.kind === 'food-shopping') { foodView.tab = 'shop'; foodView.shopDays = ref.days === 7 ? 7 : 3; closeDialog(); navigate('food'); return true; }
      if (ref.kind === 'sleep-add') { if (date > TODAY) return todayAdapterMissing('Record sleep after you wake up.'); todayAdapterDomain('sleep', date); sleepLog(date); return true; }
      if (ref.kind === 'domain') return todayAdapterDomain(ref.domain || route, date, route || ref.domain);
      if (ref.kind === 'training-session') {
        if (!history.some(s => s.id === ref.id)) return todayAdapterMissing();
        closeDialog(); navigate('progress'); historyDialog(ref.id); return true;
      }
      if (ref.kind === 'training-plan') {
        if (!routines.some(r => r.id === ref.routineId) || schedule[date] !== ref.routineId) return todayAdapterMissing('This training plan has changed. Open Plan to see the current schedule.');
        closeDialog(); navigate('plan'); scheduleDialog(date); return true;
      }
      if (ref.kind === 'training-active') {
        if (!state.active || (ref.id && state.active.id !== ref.id)) return todayAdapterMissing('That session is no longer in progress. Open Train to see its current state.');
        closeDialog(); navigate('train'); return true;
      }
      if (ref.kind === 'sleep-record') {
        row = activeSleepRecords().find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        todayAdapterDomain('sleep', row.wakeDate); sleepDetail(row.id); return true;
      }
      if (ref.kind === 'meal-plan' || ref.kind === 'meal-log') {
        const log = ref.kind === 'meal-log' ? FoodDemo.logs.find(r => r.id === ref.id) : null;
        if (ref.kind === 'meal-log' && !log) return todayAdapterMissing();
        row = FoodDemo.plans.find(r => r.id === (log ? log.planId : ref.id)); if (!row) return todayAdapterMissing('This meal no longer has an available plan. Open Food to review its record.');
        todayAdapterDomain('food', log ? log.date : row.date); foodMealDialog(row.id); return true;
      }
      if (ref.kind === 'work-entry') {
        row = WorkDemo.entries.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        if (!todayAdapterDomain('work', row.date || row.start.slice(0, 10))) return false; workRevisions(row.id); return true;
      }
      if (ref.kind === 'work-active') {
        row = WorkDemo.previewActive(); if (!row || (ref.id && row.id !== ref.id)) return todayAdapterMissing('That shift is no longer running. Open Work to review the record.');
        return todayAdapterDomain('work', row.start.slice(0, 10));
      }
      if (ref.kind === 'work-absence') {
        row = WorkDemo.allAbsences.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        if (!todayAdapterDomain('work', date)) return false; if (row.source === 'calendar' || row.cancelled) workAbsenceHistory(row.id); else workAbsenceDialog(row.id); return true;
      }
      if (ref.kind === 'work-week') return todayAdapterDomain('work', date);
      if (ref.kind === 'goal-action') {
        row = GoalsDemo.actions.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        const goal = row.goalId ? GoalsDemo.goals.find(g => g.id === row.goalId) : null;
        goalView.id = null; goalView.tab = 'actions'; goalView.actionFilter = row.done ? 'done' : 'open'; closeDialog(); navigate('goals');
        showDialog(row.title, '<div data-today-action-review="'+esc(row.id)+'"><p class="dialog-sub">'+esc(goal ? goal.title : 'Everyday life')+'</p><div class="detail-line"><span>Planned date</span><span>'+dateLabel(row.date,{day:'numeric',month:'long',year:'numeric'})+'</span></div>'+(row.minutes?'<div class="detail-line"><span>Time estimate</span><span>'+esc(row.minutes)+' minutes</span></div>':'')+'<p class="goal-inline-help">'+(row.done?'Completed on '+dateLabel(row.completedAt,{day:'numeric',month:'long',year:'numeric'})+'. The completion record keeps the details from that time.':row.date>TODAY?'This action is planned for a future date. Reschedule it first if you are doing it today.':'Marking this done records the actual completion date as '+dateLabel(TODAY,{day:'numeric',month:'long',year:'numeric'})+'. Log any measured goal result separately.')+'</p><div class="dialog-footer"><button class="button ghost" data-action="goal-edit-action" data-id="'+esc(row.id)+'">Edit action</button><button class="button ghost" data-action="close-dialog">Close</button>'+(!row.done?'<button class="button primary" data-action="today-action-done" data-id="'+esc(row.id)+'" '+(row.date>TODAY?'disabled':'')+'>Mark done today</button>':'')+'</div></div>'); return true;
      }
      if (ref.kind === 'goal-action-event') {
        row = GoalsDemo.actionEvents.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        const snapshot = row.snapshot || {};
        goalView.id = null; goalView.tab = 'history'; goalView.historyGoal = 'all'; goalView.historyDays = 0; closeDialog(); navigate('goals');
        showDialog(row.type === 'undo' ? 'Action completion undone' : 'Action completed', '<span class="eyebrow">'+dateLabel(row.date,{day:'numeric',month:'long',year:'numeric'})+'</span><h3 class="gap-top">'+esc(snapshot.title || 'An everyday action')+'</h3><p class="dialog-sub">'+esc(snapshot.goalName || 'Everyday life')+'</p>'+(snapshot.date?'<div class="detail-line"><span>Planned date at the time</span><span>'+dateLabel(snapshot.date,{day:'numeric',month:'long',year:'numeric'})+'</span></div>':'')+(snapshot.minutes!==null&&snapshot.minutes!==undefined?'<div class="detail-line"><span>Estimate at the time</span><span>'+esc(snapshot.minutes)+' minutes</span></div>':'')+'<p class="goal-inline-help">These details were saved with this event. Later edits to the current action do not change this record.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>'); return true;
      }
      if (ref.kind === 'goal-progress') {
        row = GoalsDemo.logs.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        goalView.id = row.goalId; goalView.tab = 'map'; closeDialog(); navigate('goals'); goalLogDetail(row.id); return true;
      }
      if (ref.kind === 'goal' || ref.kind === 'goal-record') {
        if (!GoalsDemo.goals.some(r => r.id === ref.id)) return todayAdapterMissing();
        goalView.id = ref.id; goalView.tab = 'map'; closeDialog(); navigate('goals'); return true;
      }
      if (ref.kind === 'money-transaction') {
        row = MoneyDemo.transactions.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        todayAdapterDomain('money', row.date); moneyView.tab = 'record'; moneyTransactionDetail(row.id); return true;
      }
      if (ref.kind === 'money-occurrence') {
        if (!['recurring', 'debt'].includes(ref.source)) return todayAdapterMissing();
        moneySetup.calendarMonth = date.slice(0, 7);
        if (!moneyCalendarRows().some(r => r.id === ref.id && r.source === ref.source)) return todayAdapterMissing('This payment schedule has changed. Open Money to review it.');
        moneyView.tab = 'plan'; closeDialog(); navigate('money'); moneyOccurrenceDialog(ref.id, ref.source); return true;
      }
      if (ref.kind === 'money-account') {
        if (!MoneyDemo.accounts.some(r => r.id === ref.id)) return todayAdapterMissing();
        moneyView.tab = 'overview'; closeDialog(); navigate('money'); moneyAccountDialog(ref.id); return true;
      }
      if (ref.kind === 'money-recurring') {
        row = RecurringMoneyDemo.items.find(r => r.id === ref.id); if (!row) return todayAdapterMissing();
        moneyView.tab = 'setup'; moneySetup.pane = row.kind === 'income' ? 'income' : 'bills'; closeDialog(); navigate('money'); moneyRecurringDialog(row.kind, row.id); return true;
      }
      if (['people-event', 'people-plan', 'person'].includes(ref.kind)) {
        row = ref.kind === 'people-event' ? PeopleDemo.events.find(r => r.id === ref.id) : ref.kind === 'people-plan' ? PeopleDemo.plans.find(r => r.id === ref.id) : PeopleDemo.person(ref.id);
        if (!row) return todayAdapterMissing();
        const personId = ref.kind === 'person' ? row.id : row.personId;
        if (!PeopleDemo.person(personId)) return todayAdapterMissing();
        peopleView.tab = 'person'; peopleView.personId = personId; closeDialog(); navigate('people');
        if (ref.kind === 'people-event') peopleEventDetail(row.id);
        if (ref.kind === 'people-plan') peoplePlanDetail(row.id);
        return true;
      }
      if (ref.kind === 'capture-batch') {
        const result = CaptureDemo.open(ref.id); if (!result.ok) return todayAdapterMissing(result.error);
        captureView.tab = 'capture'; captureView.filter = 'all'; closeDialog(); navigate('capture'); return true;
      }
      return todayAdapterMissing('This entry does not yet have a detail view.');
    }
    function todayQuickAdd(kind) {
      const date = todayAdapterDate(state.date); if (!date) return todayAdapterMissing('Choose a valid date before adding an entry.');
      if (['action', 'goal-action'].includes(kind)) { todayAdapterDomain('goals', date); goalActionDialog(); $('goalActionDate').value = date; return true; }
      if (kind === 'goal') { todayAdapterDomain('goals', date); goalEditor(); return true; }
      if (['food', 'meal', 'meal-plan'].includes(kind)) { todayAdapterDomain('food', date); foodPlanDialog(); return true; }
      if (kind === 'sleep') { todayAdapterDomain('sleep', date); if (date > TODAY) { toast('Sleep is recorded after you wake up. The selected future date has no sleep to log yet.'); return true; } sleepLog(date); return true; }
      if (['work', 'shift'].includes(kind)) { if (!todayAdapterDomain('work', date)) return false; if (date > TODAY) { toast('Record work after the shift happens. This is the selected future week; add time off here when needed.'); return true; } workEntryDialog(null, date); return true; }
      if (['time-off', 'leave', 'work-absence'].includes(kind)) { if (!todayAdapterDomain('work', date)) return false; workAbsenceDialog(null, date); return true; }
      if (['money', 'expense', 'income', 'transfer', 'debt-payment', 'debt-interest'].includes(kind)) {
        todayAdapterDomain('money', date);
        if (date > TODAY) { toast('Actual money movements are recorded after they happen. Plan a dated payment in the selected month instead.'); return true; }
        moneyRecordDialog(kind === 'money' ? 'expense' : kind); $('moneyTxDate').value = date; updateMoneyRecordForm(); return true;
      }
      if (['people', 'people-plan'].includes(kind)) { closeDialog(); peopleView.tab = 'upcoming'; navigate('people'); peoplePlanDialog(null, null); if ($('peoplePlanDate')) $('peoplePlanDate').value = date; return true; }
      if (['contact', 'memory'].includes(kind)) { if (date > TODAY) { closeDialog(); peopleView.tab = 'upcoming'; navigate('people'); peoplePlanDialog(null, null); if ($('peoplePlanDate')) $('peoplePlanDate').value = date; toast('A future catch-up is a plan. Add a contact or memory after it happens.'); return true; } closeDialog(); peopleView.tab = 'circle'; navigate('people'); peopleEventDialog(null, kind === 'contact' ? 'contact' : 'note'); if ($('peopleEventDate')) $('peopleEventDate').value = date; return true; }
      if (['training', 'train', 'workout'].includes(kind)) { if (date !== TODAY) { closeDialog(); navigate('plan'); scheduleDialog(date); return true; } return todayAdapterDomain('train', date); }
      if (kind === 'capture') {
        if (date > TODAY && !CaptureDemo.current) { todayAdapterDomain('goals', date); toast('A check-in records what happened. For this future date, add an action or plan instead.'); return true; }
        captureView.tab = 'capture'; captureView.filter = 'all'; if (!CaptureDemo.current) captureView.date = date;
        closeDialog(); navigate('capture'); if (CaptureDemo.current) toast('Your current check-in is still here. Start a new check-in when you want a separate review.'); return true;
      }
      return todayAdapterMissing('Choose a section to add an entry.');
    }
    function previous(exerciseId){return history.filter(s=>s.exercises.some(e=>e.exercise.id===exerciseId&&e.sets.length)).sort((a,b)=>b.date.localeCompare(a.date)||b.completedAt.localeCompare(a.completedAt))[0] || null;}
    function combinedExercise(session,exerciseId){const matches=session.exercises.filter(e=>e.exercise.id===exerciseId);if(!matches.length)return null;return {...matches[0],targetSets:matches.reduce((n,e)=>n+e.targetSets,0),sets:matches.flatMap(e=>e.sets)};}
    function previousExercise(exerciseId){const s=previous(exerciseId);return s?combinedExercise(s,exerciseId):null;}
    function miniTrend(exerciseId){
      const e=exercise(exerciseId);const entries=chronologicalHistory().map(s=>combinedExercise(s,exerciseId)).filter(x=>x&&x.sets.length);if(entries.length<2)return '<p class="quiet gap-top" style="font-size:12px">Log two comparable sessions to see a trend.</p>';
      const values=entries.map(x=>Math.max(...x.sets.map(s=>s.weight)));const min=Math.min(...values),max=Math.max(...values);const pts=values.map((v,i)=>[5+i/(values.length-1)*250,72-(max===min?.5:(v-min)/(max-min))*56]);const path=pts.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');const last=pts[pts.length-1];
      return '<div class="mini-chart"><svg viewBox="0 0 260 90" width="100%" height="100%" role="img" aria-label="'+esc(e.name)+' recorded load trend, '+min+' to '+max+' '+esc(e.unit)+'"><path d="M5 73H255M5 40H255" fill="none" stroke="#303d58"/><path d="'+path+'" fill="none" stroke="#85d6ff" stroke-width="2"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="4" fill="#c0b3ff"/></svg></div>';
    }
    function suggestion(p){
      const e=p.exercise||exercise(p.exerciseId);
      const sessions=chronologicalHistory().slice().reverse().map(session=>({session,slots:session.exercises.filter(slot=>slot.exercise.id===e.id&&slot.exercise.unit===e.unit&&slot.exercise.equipment===e.equipment&&slot.sets.length)})).filter(row=>row.slots.length);
      if(!sessions.length)return {weight:e.base,reps:p.minReps,baseline:'generic',message:'No established load is recorded for this exercise and equipment. '+e.base+' '+e.unit+' is an editable generic starting value. Choose your own starting load.'};
      const latest=sessions[0],sets=latest.slots.flatMap(slot=>slot.sets),weight=sets[0].weight,reps=Math.min(p.maxReps,Math.max(p.minReps,sets[0].reps));
      const slot=latest.slots[0],samePlan=latest.slots.length===1&&slot.targetSets===p.targetSets&&slot.minReps===p.minReps&&slot.maxReps===p.maxReps;
      const complete=samePlan&&sets.length===p.targetSets,consistent=sets.every(set=>set.weight===weight),atCeiling=sets.every(set=>set.reps>=p.maxReps);
      const evidence={baseline:'recorded',sourceSessionId:latest.session.id,sourceDate:latest.session.date};
      if(complete&&consistent&&atCeiling){const next=Number((weight+e.step).toFixed(2));return {...evidence,weight:next,reps:p.minReps,message:'All '+sets.length+' sets on '+dateLabel(latest.session.date)+' reached '+p.maxReps+' reps at '+weight+' '+e.unit+' with this prescription. Try '+next+' '+e.unit+' at '+p.minReps+' reps, or adjust the load.'};}
      const reason=!samePlan?'The prescription or exercise slots differ from last time.':!complete?'The last session has '+sets.length+' recorded sets against '+p.targetSets+' planned.':!consistent?'The last session used different loads.':'The last session has not reached the top of this rep range on every set.';
      return {...evidence,weight,reps,message:reason+' Keep the recorded '+(consistent?'load':'opening load')+' of '+weight+' '+e.unit+' from '+dateLabel(latest.session.date)+'. Review it for today before adding load.'};
    }
    function renderTrain(){
      if(state.active)return renderActive();
      if(state.lastFinished&&state.showFinished)return renderFinished();
      const r=routine();if(!r)return '<div class="page-head"><div><h1>Your training starts here.</h1><p>Create a routine, then record your first session.</p></div><button class="button primary" data-action="new-routine">Create a routine</button></div>';const first=r.items[0];const e=first&&exercise(first.exerciseId);const advice=first?suggestion(first):null;
      return '<div class="page-head"><div><div class="kicker"><span class="dot"></span><span class="eyebrow">Your training</span></div><h1>Strength, over time.</h1><p>A plan to follow. Every session part of the story.</p></div><button class="button small ghost" data-action="navigate" data-route="progress">Your progress '+icon('arrow')+'</button></div><div class="two-col"><section><div class="routine-pills" aria-label="Choose routine">'+routines.map(x=>'<button data-action="routine" data-id="'+esc(x.id)+'" aria-pressed="'+(x.id===r.id)+'">'+esc(x.name)+'</button>').join('')+'</div><div class="routine-banner"><span class="eyebrow">The next chapter</span><h2>'+esc(r.name)+'</h2><p>'+esc(r.subtitle)+'</p><div class="routine-stats"><div><strong>'+r.items.length+'</strong><small>Exercises</small></div><div><strong>'+totalSets(r)+'</strong><small>Work sets</small></div><div><strong>'+Math.round(totalSets(r)*2.5)+'</strong><small>Approx. min</small></div></div><div class="row"><button class="button primary" data-action="start" data-routine="'+esc(r.id)+'">Start '+esc(r.name)+' '+icon('arrow')+'</button><button class="button ghost" data-action="edit-routine" data-id="'+esc(r.id)+'">Edit routine</button></div></div><div class="exercise-list">'+r.items.map((p,i)=>{const ex=exercise(p.exerciseId);return '<button class="exercise-row" data-action="exercise-info" data-id="'+esc(ex.id)+'"><span class="exercise-order">'+String(i+1).padStart(2,'0')+'</span><span><span class="exercise-name">'+esc(ex.name)+'</span><span class="exercise-meta" style="display:block">'+esc(ex.pattern)+' · '+esc(ex.equipment)+'</span></span><span class="exercise-reps">'+p.targetSets+' sets<span class="rep-range">'+p.minReps+' to '+p.maxReps+' reps</span><small>'+p.restSeconds+'s rest</small></span></button>';}).join('')+'</div></section><aside class="side-content routine-side"><section class="coach"><div class="row between"><span class="eyebrow">One step forward</span>'+icon('progress')+'</div><h3 class="coach-title">'+(advice&&advice.weight===e.base?'Earn the next rep.':'Progress with a reason.')+'</h3><p>'+esc(advice?advice.message:'Add an exercise to begin.')+'</p>'+(e?miniTrend(e.id)+'<p><strong>Comparable sessions only.</strong> Loads are '+esc(e.unit)+'. Different machines and variants keep separate histories.</p>':'')+'<button class="text-button" data-action="exercise-progress" data-id="'+esc(e?e.id:'db-incline')+'">Explore the exercise '+icon('arrow')+'</button></section><div class="insight"><p>Your routine is a living plan. A completed workout keeps the exercises and targets you used that day.</p></div></aside></div>';
    }
    function startWorkout(routineId){
      if(state.active){navigate('train');return;}
      if(routineId)state.routineId=routineId;
      const r=routine();
      state.active={id:uid('session'),date:TODAY,name:r.name,subtitle:r.subtitle,startedAt:Date.now(),templateId:r.id,exercises:r.items.map(p=>({...clone(p),exercise:clone(exercise(p.exerciseId)),sets:[]}))};
      state.date=TODAY;state.currentExercise=0;state.editSetId=null;state.showFinished=false;state.timer=null;navigate('train');
    }
    function renderActive(){
      const s=state.active;const p=s.exercises[state.currentExercise];const ex=p.exercise;const last=previous(ex.id);const prev=last&&combinedExercise(last,ex.id);const advice=suggestion(p);const edit=p.sets.find(x=>x.id===state.editSetId);const defaults=edit||p.sets[p.sets.length-1]||advice;const done=performed(s).length;const target=s.exercises.reduce((n,x)=>n+x.targetSets,0);const next=p.sets.length+1;const all=p.sets.length>=p.targetSets;
      return '<div class="session-top"><div><span class="eyebrow">Workout in progress</span><h1>'+esc(s.name)+'</h1><p>'+done+' of '+target+' sets logged · <span id="sessionElapsed">'+Math.floor((Date.now()-s.startedAt)/60000)+'</span> min elapsed</p></div><button class="button ghost" data-action="finish">Finish '+icon('check')+'</button></div><div class="two-col"><section class="active-exercise"><div class="exercise-rail" aria-label="Exercises in this session">'+s.exercises.map((e,i)=>'<button data-action="select-exercise" data-index="'+i+'" class="'+(e.sets.length>=e.targetSets?'complete':'')+'" aria-pressed="'+(i===state.currentExercise)+'" aria-label="'+esc(e.exercise.name)+', '+e.sets.length+' of '+e.targetSets+' sets">'+(e.sets.length>=e.targetSets?'✓':String(i+1).padStart(2,'0'))+'</button>').join('')+'</div><div class="kicker"><span class="eyebrow">Exercise '+(state.currentExercise+1)+' / '+s.exercises.length+' · '+esc(ex.pattern)+'</span></div><h2>'+esc(ex.name)+'</h2><p class="exercise-prescription">'+p.targetSets+' sets · '+p.minReps+' to '+p.maxReps+' reps · '+esc(ex.unit)+' · '+p.restSeconds+'s rest</p><div class="suggestion">'+icon('spark')+'<span>'+esc(advice.message)+'</span></div><table class="set-table"><thead><tr><th scope="col">Set</th><th scope="col">'+(last?'Previous · '+dateLabel(last.date):'Previous')+'</th><th scope="col">This session</th><th scope="col"><span class="sr">Edit set</span></th></tr></thead><tbody>'+Array.from({length:Math.max(p.targetSets,p.sets.length)},(_,i)=>{const current=p.sets[i];const before=prev&&prev.sets[i];return '<tr><td>'+String(i+1).padStart(2,'0')+'</td><td class="prior">'+(before?setResult(before,ex):'No record')+'</td><td class="'+(current?'done-value':'pending')+'">'+(current?setResult(current,ex):'Not logged')+'</td><td>'+(current?'<button class="icon-button" data-action="edit-set" data-id="'+current.id+'" aria-label="Edit set '+(i+1)+'">'+icon('edit')+'</button>':'')+'</td></tr>';}).join('')+'</tbody></table><form id="setForm" class="log-console"><div class="row between"><span class="eyebrow">'+(edit?'Correct set '+(p.sets.indexOf(edit)+1):all?'Target sets complete':'Log set '+next)+'</span>'+(edit?'<button type="button" class="text-button" data-action="cancel-set-edit" style="min-height:24px;padding:0">Cancel edit</button>':'<span class="quiet" style="font-size:11px">'+esc(ex.equipment)+'</span>')+'</div><div class="log-inputs"><label>Weight ('+esc(ex.unit)+')<input id="setWeight" name="weight" type="number" min="0" max="2000" step="any" inputmode="decimal" value="'+defaults.weight+'" required></label><label>Repetitions<input id="setReps" name="reps" type="number" min="1" max="1000" step="1" inputmode="numeric" value="'+defaults.reps+'" required></label></div><button class="button primary full" type="submit">'+(edit?'Save correction':all?'Log an extra set':'Log set '+next)+icon('check')+'</button>'+(edit?'<button type="button" class="text-button" data-action="remove-set" data-id="'+edit.id+'">Remove this set</button>':'')+'<div id="setError" class="error" role="alert"></div></form><div class="timer-box"><div class="timer-top">'+icon('clock')+'<span class="timer-clock" id="timerClock">'+formatSeconds(p.restSeconds)+'</span><span class="eyebrow" id="timerLabel">Rest timer</span><div class="timer-buttons"><button data-action="timer-add" aria-label="Add 30 seconds to rest">+30s</button><button data-action="timer-toggle" id="timerToggle" aria-label="Start rest timer">'+icon('play')+'</button><button data-action="timer-skip">Skip</button></div></div><div class="timer-track"><i id="timerFill"></i></div></div>'+(all?'<button class="button ghost full gap-sm" data-action="next-exercise">'+(state.currentExercise<s.exercises.length-1?'Next exercise':'Review & finish')+icon('arrow')+'</button>':'')+'<p class="quiet gap-sm" style="font-size:11px">Your active session and rest timer resume when you reopen the app.</p></section><aside class="side-content session-side"><div><div class="row between"><h3>Your session</h3><span class="quiet" style="font-size:12px">'+done+' / '+target+'</span></div><div class="session-list">'+s.exercises.map((p,i)=>'<button data-action="select-exercise" data-index="'+i+'" class="'+(i===state.currentExercise?'active':'')+'"><span class="tick">'+(p.sets.length>=p.targetSets?'✓':i+1)+'</span>'+esc(p.exercise.short)+'<span>'+p.sets.length+' / '+p.targetSets+'</span></button>').join('')+'</div></div><div class="insight"><p><strong>A clear comparison.</strong><br>Previous sets come from a completed session with this exact exercise. Your current sets never replace that reference.</p></div><button class="text-button" data-action="edit-routine" data-id="'+esc(s.templateId)+'">Edit the routine for next time '+icon('arrow')+'</button></aside></div>';
    }
    function submitSet(event){
      event.preventDefault();const p=state.active.exercises[state.currentExercise];const weight=Number($('setWeight').value);const reps=Number($('setReps').value);
      if(!Number.isFinite(weight)||weight<0||weight>2000||!Number.isInteger(reps)||reps<1||reps>1000){$('setError').textContent='Enter a valid weight and a whole number of reps.';return;}
      const edit=p.sets.find(s=>s.id===state.editSetId);
      if(edit){edit.weight=weight;edit.reps=reps;state.editSetId=null;toast('Set corrected. Your session totals have updated.');}
      else{p.sets.push({id:uid('set'),weight,reps,completed:true,at:new Date().toISOString()});state.timer={endAt:Date.now()+p.restSeconds*1000,total:p.restSeconds,paused:false,remaining:p.restSeconds};}
      render();
    }
    function formatSeconds(seconds){const s=Math.max(0,Math.ceil(seconds));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
    function timerRemaining(){if(!state.timer)return 0;return state.timer.paused?state.timer.remaining:Math.max(0,(state.timer.endAt-Date.now())/1000);}
    function updateTimer(){
      if(!$('timerClock')||!state.active)return;
      const p=state.active.exercises[state.currentExercise];const t=state.timer;const remaining=t?timerRemaining():p.restSeconds;
      $('timerClock').textContent=formatSeconds(remaining);$('timerLabel').textContent=!t?'Rest timer':t.paused?'Paused':remaining<=0?'Ready':'Recover';
      $('timerToggle').innerHTML=icon(t&&!t.paused&&remaining>0?'pause':'play');$('timerToggle').setAttribute('aria-label',t&&!t.paused&&remaining>0?'Pause rest timer':'Start rest timer');
      $('timerFill').style.width=(t?Math.min(100,Math.max(0,(1-remaining/t.total)*100)):0)+'%';
      if($('sessionElapsed'))$('sessionElapsed').textContent=String(Math.floor((Date.now()-state.active.startedAt)/60000));
    }
    function finishPrompt(){
      const s=state.active;const count=performed(s).length;const planned=s.exercises.reduce((n,e)=>n+e.targetSets,0);const complete=s.exercises.every(e=>e.sets.length>=e.targetSets);
      showDialog('Finish this session?','<p class="dialog-sub">'+(count===0?'No sets have been logged yet. You can return to training or discard this empty app session.':!complete?'You logged '+count+' '+(count===1?'set':'sets')+' against '+planned+' planned sets. Some exercises are unfinished. Finishing will record exactly what you did.':'All planned sets are logged. Your session is ready to join your history.')+'</p><div class="dialog-stats"><div><strong>'+count+'</strong><small>Logged sets</small></div><div><strong>'+s.exercises.filter(e=>e.sets.length).length+'</strong><small>Exercises trained</small></div></div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Keep training</button><button class="button primary" data-action="'+(count?'confirm-finish':'discard-session')+'">'+(count?'Finish session':'Discard empty session')+'</button></div>');
    }
    function completeSession(){
      const s=clone(state.active);s.minutes=Math.max(1,Math.round((Date.now()-s.startedAt)/60000));s.completedAt=new Date().toISOString();history.push(s);state.lastFinished=s;state.showFinished=true;state.active=null;state.timer=null;state.chartSessionId=s.id;closeDialog();render();window.scrollTo({top:0,behavior:'instant'});
    }
    function renderFinished(){
      const s=state.lastFinished;const sets=performed(s);return '<div class="two-col"><section class="finish-summary"><div class="finish-orbit">'+icon('check')+'</div><div class="kicker"><span class="eyebrow">'+dateLabel(s.date,{day:'numeric',month:'long'})+' · '+esc(s.name)+'</span></div><h1>Another session.<br>A stronger story.</h1><p>Your completed sets now appear in this app\'s history. Your routine and previous sessions are unchanged.</p><div class="routine-stats"><div><strong>'+sets.length+'</strong><small>Sets logged</small></div><div><strong>'+sets.reduce((n,x)=>n+x.reps,0)+'</strong><small>Repetitions</small></div><div><strong>'+s.minutes+'</strong><small>Minutes</small></div></div><div class="exercise-list">'+s.exercises.map(e=>'<div class="exercise-row"><span class="exercise-order">'+(e.sets.length?'✓':'·')+'</span><span><span class="exercise-name">'+esc(e.exercise.name)+'</span><span class="exercise-meta" style="display:block">'+(e.sets.length?e.sets.map((x,i)=>'<span class="summary-set">Set '+(i+1)+': '+setText(x,e.exercise)+'</span>').join(''):'No sets logged')+'</span></span><span class="exercise-reps">'+e.sets.length+' / '+e.targetSets+'<small>sets</small></span></div>').join('')+'</div><div class="row wrap gap-top"><button class="button primary" data-action="exercise-progress" data-id="'+s.exercises.find(e=>e.sets.length).exercise.id+'">See your progression '+icon('arrow')+'</button><button class="button ghost" data-action="navigate" data-route="today">Back to Today</button></div><button class="text-button" data-action="new-session">Choose another workout</button></section><aside class="side-content routine-side"><div class="insight"><p><strong>Faithful history.</strong><br>This session keeps its exercise names, loads, and targets. Changing a routine later cannot change what you did today.</p></div></aside></div>';
    }
    function renderPlan(){return '<div class="page-head"><div><div class="kicker"><span class="dot"></span><span class="eyebrow">'+dateLabel(WEEK[0])+' to '+dateLabel(WEEK[6])+'</span></div><h1>Give the week shape.</h1><p>Place your sessions. Leave room for everything else.</p></div></div><div class="plan-week" aria-label="Weekly workout schedule">'+WEEK.map(d=>{const r=routines.find(x=>x.id===schedule[d]);return '<div class="plan-day '+(d===TODAY?'current':'')+'"><span class="eyebrow">'+dateLabel(d,{weekday:'short'})+'</span><strong>'+Number(d.slice(-2))+'</strong><button class="'+(!r?'rest-day':'')+'" data-action="schedule" data-date="'+d+'" aria-label="Schedule for '+dateLabel(d,{weekday:'long'})+': '+(r?esc(r.name):'Rest day')+'">'+(r?esc(r.name):'+<br>Rest')+'</button><small>'+(d<TODAY?'Past':d===TODAY?'Today':'Planned')+'</small></div>';}).join('')+'</div><div class="two-col"><section><div class="row between"><h2>Your routines</h2><button class="button ghost small" data-action="new-routine">'+icon('plus')+' New routine</button></div><div class="routine-library">'+routines.map(r=>'<div class="library-row"><div><h3>'+esc(r.name)+'</h3><p>'+esc(r.subtitle)+' · '+r.items.length+' exercises · '+totalSets(r)+' sets</p></div><button class="button ghost small" data-action="edit-routine" data-id="'+esc(r.id)+'">Edit '+icon('edit')+'</button></div>').join('')+'</div></section><aside class="side-content routine-side"><section><span class="eyebrow">Build a repeatable practice</span><h3 class="coach-title">Structure you can change.</h3><p class="muted" style="font-size:13px;line-height:1.8">Pick exercises, reorder the session, and set your rep ranges. Schedule a routine by tapping a day above.</p><div class="insight"><p>Editing a routine changes future workouts. An active session keeps the plan it started with.</p></div></section></aside></div>';}
    function editRoutine(id){
      const existing=routines.find(r=>r.id===id);draft=existing?clone(existing):{id:uid('routine'),name:'New routine',subtitle:'Your training focus',items:[item('db-incline',3,8,12,90)]};
      showDialog(existing?'Edit '+existing.name:'Create a routine','<p class="dialog-sub">Changes apply to future sessions. Your current workout and recorded history keep their own copies.</p><div class="row" style="align-items:flex-start"><label style="flex:1">Routine name<input id="routineName" maxlength="60" value="'+esc(draft.name)+'"></label><label style="flex:1">Focus<input id="routineFocus" maxlength="80" value="'+esc(draft.subtitle)+'"></label></div><div id="builderRows"></div><button class="add-exercise" data-action="builder-add">+ Add an exercise</button><div id="builderError" class="error" role="alert"></div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Cancel</button>'+(existing?'<button class="button ghost" data-action="duplicate-routine">Duplicate</button>':'')+'<button class="button primary" data-action="save-routine">Save routine</button></div>');renderBuilderRows();
    }
    function renderBuilderRows(){
      $('builderRows').innerHTML=draft.items.map((p,i)=>'<div class="builder-row" data-builder-index="'+i+'"><div class="row"><span class="builder-number">'+String(i+1).padStart(2,'0')+'</span><label class="exercise-choice"><span class="sr">Exercise '+(i+1)+'</span><select data-field="exerciseId">'+EXERCISES.map(e=>'<option value="'+e.id+'" '+(e.id===p.exerciseId?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label><div class="builder-actions"><button class="icon-button" data-action="builder-up" data-index="'+i+'" '+(!i?'disabled':'')+' aria-label="Move exercise '+(i+1)+' up">'+icon('up')+'</button><button class="icon-button" data-action="builder-down" data-index="'+i+'" '+(i===draft.items.length-1?'disabled':'')+' aria-label="Move exercise '+(i+1)+' down">'+icon('down')+'</button><button class="icon-button" data-action="builder-remove" data-index="'+i+'" aria-label="Remove exercise '+(i+1)+'">'+icon('trash')+'</button></div></div><div class="builder-grid"><label>Sets<input data-field="targetSets" type="number" min="1" max="10" value="'+p.targetSets+'" inputmode="numeric"></label><label>Min reps<input data-field="minReps" type="number" min="1" max="100" value="'+p.minReps+'" inputmode="numeric"></label><label>Max reps<input data-field="maxReps" type="number" min="1" max="100" value="'+p.maxReps+'" inputmode="numeric"></label><label>Rest (sec)<input data-field="restSeconds" type="number" min="15" max="600" value="'+p.restSeconds+'" inputmode="numeric"></label></div><p class="builder-unit">Loads: '+esc(exercise(p.exerciseId).unit)+' · Equipment increment: '+exercise(p.exerciseId).step+' kg</p></div>').join('');
    }
    function syncBuilder(){
      draft.name=$('routineName').value;draft.subtitle=$('routineFocus').value;
      document.querySelectorAll('[data-builder-index]').forEach(row=>{const p=draft.items[Number(row.dataset.builderIndex)];row.querySelectorAll('[data-field]').forEach(input=>p[input.dataset.field]=input.dataset.field==='exerciseId'?input.value:Number(input.value));});
    }
    function saveRoutine(duplicate=false){
      syncBuilder();
      if(!draft.name.trim()||!draft.items.length){$('builderError').textContent='Give the routine a name and add at least one exercise.';return;}
      if(draft.items.some(p=>!Number.isInteger(p.targetSets)||p.targetSets<1||p.targetSets>10||!Number.isInteger(p.minReps)||p.minReps<1||!Number.isInteger(p.maxReps)||p.maxReps<p.minReps||p.maxReps>100||!Number.isInteger(p.restSeconds)||p.restSeconds<15||p.restSeconds>600)){$('builderError').textContent='Use 1 to 10 sets, a rep range between 1 and 100, and 15 to 600 seconds of rest.';return;}
      if(duplicate){draft.id=uid('routine');draft.name=draft.name.trim()+' copy';}
      const index=routines.findIndex(r=>r.id===draft.id);const saved=clone(draft);saved.name=saved.name.trim();if(index<0)routines.push(saved);else routines[index]=saved;state.routineId=saved.id;closeDialog();render();toast(duplicate?'Routine duplicated.':'Routine saved for future sessions.');
    }
    function scheduleDialog(date){showDialog('Shape '+dateLabel(date,{weekday:'long'}),'<p class="dialog-sub">Choose a workout for '+dateLabel(date,{day:'numeric',month:'long'})+'. This changes the plan, not your recorded history.</p><label>Workout<select id="scheduleRoutine"><option value="">Rest day</option>'+routines.map(r=>'<option value="'+esc(r.id)+'" '+(schedule[date]===r.id?'selected':'')+'>'+esc(r.name)+' · '+esc(r.subtitle)+'</option>').join('')+'</select></label><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Cancel</button><button class="button primary" data-action="save-schedule" data-date="'+date+'">Save plan</button></div>');}
    function progressData(){const all=history.map(s=>{const e=combinedExercise(s,state.chartExercise);if(!e||!e.sets.length)return null;const best=e.sets.reduce((a,b)=>b.weight>a.weight||(b.weight===a.weight&&b.reps>a.reps)?b:a);return {session:s,exercise:e,best,value:state.chartMetric==='weight'?best.weight:e.sets.reduce((n,x)=>n+x.reps,0)};}).filter(Boolean).sort((a,b)=>a.session.date.localeCompare(b.session.date)||a.session.completedAt.localeCompare(b.session.completedAt));let record=null;all.forEach(d=>{d.isLoadPR=record!==null&&d.best.weight>record;record=Math.max(record===null?0:record,d.best.weight);});return all.filter(x=>state.chartRange===0||x.session.date>=addDays(TODAY,-state.chartRange));}
    function renderProgress(){
      const e=exercise(state.chartExercise);const data=progressData();const latest=data[data.length-1];const best=data.length?Math.max(...data.map(d=>d.value)):null;
      return '<div class="page-head"><div><div class="kicker"><span class="dot"></span><span class="eyebrow">Your training history</span></div><h1>See how far<br>you have come.</h1><p>Every point is a session. Every session is yours.</p></div></div><div class="two-col"><section><div class="progress-controls"><label>Exercise<select id="chartExercise">'+EXERCISES.map(e=>'<option value="'+e.id+'" '+(e.id===state.chartExercise?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label><div class="period-switch" aria-label="History range">'+[[28,'4 weeks'],[84,'12 weeks'],[0,'All']].map(([n,label])=>'<button data-action="chart-range" data-range="'+n+'" aria-pressed="'+(state.chartRange===n)+'">'+label+'</button>').join('')+'</div></div><div class="chart-heading"><div><span class="eyebrow">'+(state.chartMetric==='weight'?'Heaviest recorded set':'Most reps in a session')+'</span><div class="chart-big">'+(best===null?'No data':best)+' <span>'+(state.chartMetric==='weight'?esc(e.unit):'reps')+'</span></div></div><div class="tabset"><button data-action="chart-metric" data-metric="weight" aria-pressed="'+(state.chartMetric==='weight')+'">Load</button><button data-action="chart-metric" data-metric="reps" aria-pressed="'+(state.chartMetric==='reps')+'">Reps</button></div></div><p class="chart-caption">'+esc(e.equipment)+' · '+data.length+' comparable sessions'+(latest?' · Latest '+dateLabel(latest.session.date):'')+'</p>'+(state.chartMetric==='weight'?'<div class="legend"><span><i style="background:var(--mint)"></i>Session</span><span><span style="color:var(--amber)">◆</span> New load PR</span></div>':'')+'<div id="chart" class="chart-container"></div><div id="chartDetail" class="chart-detail" aria-live="polite"></div><div class="row between gap-top"><h2 style="font-size:26px">The sessions behind it</h2><span class="quiet" style="font-size:11px">Newest first</span></div><div class="history-list">'+(data.length?data.slice().reverse().map(d=>'<button class="history-row" data-action="history" data-id="'+esc(d.session.id)+'"><span><span>'+esc(d.session.name)+'</span><span class="date" style="display:block">'+dateLabel(d.session.date,{weekday:'short',day:'numeric',month:'short'})+' · '+d.exercise.sets.length+' sets</span></span><span class="load">'+setResult(d.best,d.exercise.exercise)+'</span>'+icon('chevron')+'</button>').join(''):'<p class="empty">No recorded sessions for this exercise in this range. Try another range or log it in a workout.</p>')+'</div></section><aside class="side-content"><section><div class="row between"><h3>Showing up adds up.</h3>'+icon('train')+'</div><div class="week-total"><strong>'+history.length+'</strong><span>recorded sessions</span></div>'+renderHeatmap()+'<div class="stat-line"><span>Most recent session</span><strong>'+(history.length?dateLabel(chronologicalHistory().slice(-1)[0].date):'No sessions yet')+'</strong></div><div class="stat-line"><span>Recorded working sets</span><strong>'+history.reduce((n,s)=>n+performed(s).length,0)+'</strong></div><div class="stat-line"><span>History starts</span><strong>'+(history.length?dateLabel(chronologicalHistory()[0].date):'Your first session')+'</strong></div></section><div class="insight"><p><strong>Compare the same thing.</strong><br>Load records stay separate for each exercise and measurement convention. A machine press never becomes a dumbbell PR.</p></div></aside></div>';
    }
    function renderHeatmap(){const dates=Array.from({length:56},(_,i)=>addDays(WEEK[0],i-49));return '<div class="heatmap" aria-label="Training calendar from '+dateLabel(dates[0])+' to '+dateLabel(dates[55])+'">'+dates.map(d=>{const s=history.find(x=>x.date===d);return '<button class="'+(s?'has-session ':'')+(d===TODAY?'today':'')+'" data-action="calendar-day" data-date="'+d+'" aria-label="'+dateLabel(d,{weekday:'long',day:'numeric',month:'long'})+': '+(s?'workout recorded':'no recorded workout')+'" title="'+dateLabel(d)+': '+(s?'Workout':'No workout')+'"></button>';}).join('')+'</div><div class="heatmap-labels"><span>'+dateLabel(dates[0])+'</span><span>'+dateLabel(dates[55])+'</span></div><p class="quiet gap-sm" style="font-size:11px">Each column is a week, Monday to Sunday.</p>';}
    function renderChart(){
      if(!$('chart'))return;const data=progressData();const e=exercise(state.chartExercise);const width=Math.max(270,Math.floor($('chart').getBoundingClientRect().width));const height=255;const left=39,right=18,top=23,bottom=43;
      if(!data.length){$('chart').innerHTML='<p class="empty">Your first session will start this line.</p>';$('chartDetail').innerHTML='<span class="muted">No recorded sessions to inspect.</span>';return;}
      let selected=data.find(d=>d.session.id===state.chartSessionId)||data[data.length-1];state.chartSessionId=selected.session.id;
      let min=Math.min(...data.map(d=>d.value));let max=Math.max(...data.map(d=>d.value));const pad=Math.max(1,(max-min)*.3);min=Math.max(0,Math.floor((min-pad)*2)/2);max=Math.ceil((max+pad)*2)/2;
      const start=dateObj(data[0].session.date).getTime();const end=dateObj(data[data.length-1].session.date).getTime();const x=d=>left+(end===start?.5:(dateObj(d.session.date).getTime()-start)/(end-start))*(width-left-right);const y=v=>top+(1-(v-min)/(max-min))*(height-top-bottom);
      const points=data.map(d=>[x(d),y(d.value)]);const line=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');const ticks=[min,(min+max)/2,max];
      let svg='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(e.name)+': '+data.length+' recorded sessions. '+(state.chartMetric==='weight'?'Best set weight in '+esc(e.unit):'Total repetitions per session')+'. Select a point or a session below for details."><defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#85d6ff" stop-opacity=".17"/><stop offset="100%" stop-color="#85d6ff" stop-opacity="0"/></linearGradient></defs>';
      ticks.forEach(t=>{svg+='<line class="chart-grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(left-10)+'" y="'+(y(t)+4)+'" text-anchor="end">'+Number(t.toFixed(1))+'</text>';});
      svg+='<path d="'+line+' L'+points[points.length-1][0]+' '+(height-bottom)+' L'+points[0][0]+' '+(height-bottom)+'Z" fill="url(#chartArea)"/><path d="'+line+'" fill="none" stroke="#85d6ff" stroke-width="2.3" stroke-linejoin="round"/>';
      svg+='<line x1="'+x(selected)+'" x2="'+x(selected)+'" y1="'+top+'" y2="'+(height-bottom)+'" stroke="#7286a9" stroke-dasharray="3 5"/>';
      data.forEach(d=>{const active=d.session.id===selected.session.id;const record=state.chartMetric==='weight'&&d.isLoadPR;svg+='<g class="chart-point" data-action="chart-point" data-id="'+esc(d.session.id)+'"><circle cx="'+x(d)+'" cy="'+y(d.value)+'" r="18" fill="transparent"/>'+(record?'<path d="M'+x(d)+' '+(y(d.value)-6)+' l6 6 -6 6 -6-6Z" fill="#f1bc7b" stroke="#0c1020" stroke-width="1.5"/>':'<circle cx="'+x(d)+'" cy="'+y(d.value)+'" r="'+(active?5:3.5)+'" fill="'+(active?'#c0b3ff':'#85d6ff')+'" stroke="#0c1020" stroke-width="2"/>')+'</g>';});
      const labels=data.length===1?[0]:data.length<3?[0,data.length-1]:[0,Math.floor((data.length-1)/2),data.length-1];
      labels.forEach((i,k)=>{svg+='<text x="'+x(data[i])+'" y="'+(height-18)+'" text-anchor="'+(k===0?'start':k===labels.length-1?'end':'middle')+'">'+dateLabel(data[i].session.date)+'</text>';});
      svg+='</svg>';$('chart').innerHTML=svg;
      $('chartDetail').innerHTML='<div><strong>'+dateLabel(selected.session.date,{weekday:'short',day:'numeric',month:'short'})+' · '+esc(selected.session.name)+(state.chartMetric==='weight'&&selected.isLoadPR?' · Load PR':'')+'</strong><p>'+(state.chartMetric==='reps'?selected.value+' total reps':setText(selected.best,e))+' · '+selected.exercise.sets.length+' '+(selected.exercise.sets.length===1?'set':'sets')+'</p></div><button class="button small ghost" data-action="history" data-id="'+esc(selected.session.id)+'">View session '+icon('arrow')+'</button>';
    }
    function historyDialog(id){
      const s=history.find(s=>s.id===id);if(!s)return;
      const sets=performed(s);showDialog(s.name+' · '+dateLabel(s.date),'<p class="dialog-sub">Recorded session · '+s.minutes+' minutes. Exercise names and targets below belong to this session.</p><div class="dialog-stats"><div><strong>'+sets.length+'</strong><small>Recorded sets</small></div><div><strong>'+sets.reduce((n,x)=>n+x.reps,0)+'</strong><small>Repetitions</small></div></div>'+s.exercises.map(e=>'<section class="gap-top"><h3>'+esc(e.exercise.name)+'</h3><p class="muted" style="font-size:11px;margin-top:4px">'+e.targetSets+' planned sets · '+e.minReps+' to '+e.maxReps+' reps · '+esc(e.exercise.unit)+'</p>'+(e.sets.length?e.sets.map((x,i)=>'<div class="detail-line"><span>Set '+(i+1)+'</span><span>'+setText(x,e.exercise)+'</span></div>').join(''):'<p class="empty">No sets logged for this exercise.</p>')+'</section>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');
    }
    function showDialog(title,html){delete $('dialog').dataset.workspaceUi;dialogOpener=document.activeElement;$('dialogContent').innerHTML='<div class="dialog-header"><h2 id="dialogTitle">'+esc(title)+'</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">'+icon('close')+'</button></div>'+html;if(!$('dialog').open)$('dialog').showModal();}
    function closeDialog(){if($('dialog').open)$('dialog').close();if(dialogOpener&&dialogOpener.isConnected)dialogOpener.focus();}
    function showToast(message){clearTimeout(toastTimeout);$('toast').textContent=message;$('toast').classList.add('show');toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4000);}
    function exerciseInfo(id){const e=exercise(id);const prev=previousExercise(id);showDialog(e.name,'<p class="dialog-sub">'+esc(e.pattern)+' · '+esc(e.equipment)+'</p><div class="detail-line"><span>Load convention</span><span>'+esc(e.unit)+'</span></div><div class="detail-line"><span>Equipment increment</span><span>'+e.step+' kg</span></div>'+(prev?'<section class="gap-top"><h3>Previous completed session</h3>'+prev.sets.map((s,i)=>'<div class="detail-line"><span>Set '+(i+1)+'</span><span>'+setText(s,e)+'</span></div>').join('')+'</section>':'<p class="empty">No previous session for this exercise in your record.</p>')+'<div class="dialog-footer"><button class="button primary" data-action="exercise-progress" data-id="'+id+'">Explore progress '+icon('arrow')+'</button></div>');}
    // Sleep sample data and pure calculations can be driven without the renderer.
    const sleepView={range:7,end:TODAY,customStart:null,mode:'timing',selected:TODAY,page:0,goal:480};
    const sleepFeelings=['Not recorded','Exhausted','Tired','Okay','Rested','Refreshed'];
    const sleepZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const clockMinutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
    const clockText=n=>String(Math.floor(((n%1440)+1440)%1440/60)).padStart(2,'0')+':'+String(((n%60)+60)%60).padStart(2,'0');
    const sleepDuration=n=>n===null||n===undefined?'Not recorded':Math.floor(n/60)+'h '+String(Math.round(n%60)).padStart(2,'0')+'m';
    const sleepDateValid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(dateObj(d))&&dateObj(d).toISOString().slice(0,10)===d;
    const sleepDayCount=(start,end)=>Math.round((dateObj(end)-dateObj(start))/86400000)+1;
    const sleepDeviceZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
    function sleepClockCandidates(date,time,zone){
      if(!sleepDateValid(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return [];
      try{
        const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
        const parts=at=>Object.fromEntries(fmt.formatToParts(new Date(at)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
        const local=at=>{const p=parts(at);return Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));};
        const wall=Date.parse(date+'T'+time+':00Z'),offsets=new Set();
        // Sample both sides of transitions, including half-hour changes and skipped dates.
        for(let hours=-36;hours<=36;hours+=6){const at=wall+hours*3600000;offsets.add(local(at)-at);}
        return Array.from(offsets).map(offset=>({at:wall-offset,offsetMinutes:offset/60000})).filter(row=>{const p=parts(row.at);return p.year+'-'+p.month+'-'+p.day===date&&p.hour+':'+p.minute===time&&p.second==='00';}).sort((a,b)=>a.at-b.at).map(row=>({...row,at:new Date(row.at).toISOString()}));
      }catch(_){return [];}
    }
    function sleepTimestamp(date,time,zone=sleepDeviceZone(),choice=null){const rows=sleepClockCandidates(date,time,zone),picked=choice?rows.find(row=>row.at===choice):rows.length===1?rows[0]:null;return picked?Date.parse(picked.at):null;}
    function sleepTimingDetails(value,prior=null){
      const zone=value.zone===undefined?(prior?.zone||sleepDeviceZone()):value.zone;
      const choice=value.timingChoice||{};
      const unchanged=prior&&['bedDate','bedTime','wakeDate','wakeTime'].every(key=>value[key]===prior[key])&&zone===prior.zone&&!['bedAt','wakeAt'].some(key=>choice[key]&&choice[key]!==prior.timing?.[key]);
      if(unchanged)return {timeInBed:prior.timeInBed,zone:prior.zone,timing:prior.timing?clone(prior.timing):null,preserved:true,legacy:Boolean(prior.bedDate&&!prior.timing)};
      if(value.bedDate===null)return {timeInBed:null,zone,timing:null};
      try{new Intl.DateTimeFormat('en-GB',{timeZone:zone}).format(0);}catch(_){return {error:'Use a recognised timezone, such as Europe/London.'};}
      const ends=[{key:'bedAt',label:'Into bed',date:value.bedDate,time:value.bedTime},{key:'wakeAt',label:'Got up',date:value.wakeDate,time:value.wakeTime}];
      const ambiguities=[],picked={};
      for(const end of ends){
        const rows=sleepClockCandidates(end.date,end.time||'',zone);
        if(!rows.length)return {error:end.label+' needs a valid clock time in '+zone+'. Times skipped by a clock change cannot be used.'};
        const previous=prior?.timing?.zone===zone?rows.find(row=>row.at===prior.timing[end.key]):null;
        const explicit=choice[end.key]?rows.find(row=>row.at===choice[end.key]):null;
        if(choice[end.key]&&!explicit)return {error:'The selected clock occurrence no longer matches. Review the time again.',choiceStale:true};
        const selected=explicit||previous||(rows.length===1?rows[0]:null);
        if(rows.length>1)ambiguities.push({...end,options:rows,selected:selected?.at||''});
        if(selected)picked[end.key]=selected;
      }
      if(!picked.bedAt||!picked.wakeAt)return {error:'A clock time occurs twice in '+zone+'. Choose which occurrence you mean before saving.',ambiguities,zone};
      const timeInBed=Math.round((Date.parse(picked.wakeAt.at)-Date.parse(picked.bedAt.at))/60000);
      if(timeInBed<=0||timeInBed>1440)return {error:'Got-up time must be after bedtime, within 24 hours. Check both dates and clock occurrences.',ambiguities,zone};
      return {timeInBed,zone,ambiguities,timing:{version:1,zone,bedAt:picked.bedAt.at,wakeAt:picked.wakeAt.at,bedOffsetMinutes:picked.bedAt.offsetMinutes,wakeOffsetMinutes:picked.wakeAt.offsetMinutes}};
    }
    function sleepTimingRecordValid(record){
      const timing=record.timing;if(timing===undefined||timing===null)return true;
      if(!timing||timing.version!==1||typeof timing.zone!=='string'||!timing.zone||timing.zone!==record.zone||!record.bedDate||!record.bedTime||!record.wakeTime)return false;
      for(const [key,date,time,offset]of [['bedAt',record.bedDate,record.bedTime,timing.bedOffsetMinutes],['wakeAt',record.wakeDate,record.wakeTime,timing.wakeOffsetMinutes]]){
        const stamp=Date.parse(timing[key]);if(typeof timing[key]!=='string'||!Number.isFinite(stamp)||new Date(stamp).toISOString()!==timing[key]||!Number.isFinite(offset)||Math.abs(offset)>1440)return false;
        // Validate against the frozen offset, without reinterpreting old events through today's timezone rules.
        if(new Date(stamp+offset*60000).toISOString()!==date+'T'+time+':00.000Z')return false;
      }
      return record.timeInBed===Math.round((Date.parse(timing.wakeAt)-Date.parse(timing.bedAt))/60000);
    }
    function sleepOffsetLabel(minutes){return 'UTC'+(minutes<0?'-':'+')+String(Math.floor(Math.abs(minutes)/60)).padStart(2,'0')+':'+String(Math.round(Math.abs(minutes)%60)).padStart(2,'0');}
    const sleepRevisions=[];
    function activeSleepRecords(){const superseded=new Set(sleepRevisions.map(r=>r.supersedes).filter(Boolean));return sleepRevisions.filter(r=>!superseded.has(r.id));}
    function sleepBounds(){const all=activeSleepRecords();const first=all.length?all.reduce((a,r)=>r.wakeDate<a?r.wakeDate:a,all[0].wakeDate):TODAY;return {start:sleepView.range===0?first:sleepView.range==='custom'?sleepView.customStart:addDays(sleepView.end,-sleepView.range+1),end:sleepView.range===0?TODAY:sleepView.end};}
    function sleepPeriodRecords(){const b=sleepBounds();return activeSleepRecords().filter(r=>r.wakeDate>=b.start&&r.wakeDate<=b.end).sort((a,b)=>a.wakeDate.localeCompare(b.wakeDate)||a.createdAt.localeCompare(b.createdAt));}
    function sleepSummary(records){const main=records.filter(r=>r.kind==='main');return {main,naps:records.filter(r=>r.kind==='nap'),mean:main.length?Math.round(main.reduce((n,r)=>n+r.duration,0)/main.length):null,atGoal:main.filter(r=>r.duration>=r.targetSnapshot).length};}
    function sleepNightName(r){if(r.kind==='nap')return 'Nap · '+dateLabel(r.wakeDate);if(r.bedDate&&r.bedDate!==r.wakeDate)return 'Night of '+dateLabel(r.bedDate)+' to '+dateLabel(r.wakeDate);return 'Sleep ending '+dateLabel(r.wakeDate);}
    function sleepIntervals(r){
      if(!r.bedTime||!r.wakeTime)return [];
      const start=(clockMinutes(r.bedTime)-1080+1440)%1440;
      const wall=sleepDayCount(r.bedDate,r.wakeDate)*1440-1440+clockMinutes(r.wakeTime)-clockMinutes(r.bedTime);
      if(wall<=0)return [];
      if(wall>=1440)return [{start:0,width:100}];
      const first=Math.min(wall,1440-start);const out=[{start:start/14.4,width:first/14.4}];if(first<wall)out.push({start:0,width:(wall-first)/14.4});return out;
    }
    function sleepBins(records,bounds){
      const count=sleepDayCount(bounds.start,bounds.end);const type=count<=7?'day':count<=31?'week':'month';const bins=[];
      let start=bounds.start;
      while(start<=bounds.end){let end=type==='day'?start:type==='week'?addDays(start,6):new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7)),0,12)).toISOString().slice(0,10);if(end>bounds.end)end=bounds.end;
        const group=records.filter(r=>r.kind==='main'&&r.wakeDate>=start&&r.wakeDate<=end);bins.push({start,end,records:group,mean:group.length?Math.round(group.reduce((n,r)=>n+r.duration,0)/group.length):null,label:type==='month'?dateLabel(start,{month:'short',year:'2-digit'}):dateLabel(start,{day:'numeric',month:'short'}),type});start=addDays(end,1);
      }
      return bins;
    }
    function renderSleep(){
      const b=sleepBounds(),records=sleepPeriodRecords(),s=sleepSummary(records),days=sleepDayCount(b.start,b.end);
      if(sleepView.selected<b.start||sleepView.selected>b.end)sleepView.selected=s.main.length?s.main[s.main.length-1].wakeDate:b.end;
      const latest=activeSleepRecords().filter(r=>r.kind==='main').sort((a,b)=>b.wakeDate.localeCompare(a.wakeDate))[0];
      const coverage=new Set(s.main.map(r=>r.wakeDate)).size;
      const period=dateLabel(b.start,{day:'numeric',month:'short',year:'numeric'})+' to '+dateLabel(b.end,{day:'numeric',month:'short',year:'numeric'});
      const timing=days<=31&&sleepView.mode==='timing';
      return '<div class="page-head sleep-head"><div><div class="kicker">'+icon('moon')+'<span class="eyebrow">Sleep & rest</span></div><h1>Find your rhythm.</h1><p>See when you slept, how long, and how you felt.</p></div><button class="button primary" data-action="sleep-log">'+icon('plus')+' Log sleep</button></div><div class="sleep-layout"><section class="sleep-main"><div class="sleep-overview"><div class="sleep-orbit"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="orbit-track" cx="80" cy="80" r="70"/><circle class="orbit-value" cx="80" cy="80" r="70" stroke-dasharray="'+(latest?Math.min(1,latest.duration/latest.targetSnapshot)*439.82:0)+' 439.82"/></svg><div><strong>'+sleepDuration(latest?latest.duration:null)+'</strong><small>'+sleepDuration(latest?latest.targetSnapshot:sleepView.goal)+' goal</small></div></div><div><span class="eyebrow">Latest main sleep'+(latest?' · '+dateLabel(latest.wakeDate):'')+'</span><h2>'+(latest?sleepFeelings[latest.feeling||0]:'Your first night starts here')+'</h2><p>'+(latest&&latest.bedTime?esc(latest.bedTime)+' into bed · '+esc(latest.wakeTime)+' got up':(latest?'Duration entry · timings not recorded':'No sleep recorded yet. Start with the date you woke up.'))+'</p><button class="text-button" data-action="'+(latest?'sleep-select':'sleep-log')+'" data-date="'+(latest?latest.wakeDate:TODAY)+'">'+(latest?'Explore this night':'Log your first night')+' '+icon('arrow')+'</button></div></div><div class="sleep-range"><div class="period-switch" aria-label="Sleep history range">'+[[7,'Week'],[30,'Month'],[365,'Year'],[0,'All']].map(([n,label])=>'<button data-action="sleep-range" data-range="'+n+'" aria-pressed="'+(sleepView.range===n)+'">'+label+'</button>').join('')+'</div><button class="button small ghost" data-action="sleep-custom">Choose dates</button></div><div class="sleep-period-title"><div><div class="sleep-calendar-label">Wake dates</div><h2>'+dateLabel(b.start,{day:'numeric',month:'short'})+' to '+dateLabel(b.end,{day:'numeric',month:'short'})+'</h2><p class="sleep-note" style="margin-top:4px">'+dateLabel(b.start,{year:'numeric'})+(b.start.slice(0,4)!==b.end.slice(0,4)?' to '+b.end.slice(0,4):'')+'</p></div><div class="row"><button class="icon-button" data-action="sleep-shift" data-step="-1" aria-label="Previous period" '+(sleepView.range===0?'disabled':'')+'>'+icon('chevron','flip-arrow')+'</button><button class="icon-button" data-action="sleep-shift" data-step="1" aria-label="Next period" '+(sleepView.range===0||b.end>=TODAY?'disabled':'')+'>'+icon('chevron')+'</button></div></div><div class="sleep-metrics"><div><span class="eyebrow">Average asleep</span><strong>'+sleepDuration(s.mean)+'</strong><small>Main sleep only</small></div><div><span class="eyebrow">Nights recorded</span><strong>'+coverage+'<span style="font:400 14px var(--sans);color:var(--muted)"> / '+days+'</span></strong><small>Missing nights excluded</small></div><div><span class="eyebrow">Naps logged</span><strong>'+s.naps.length+'</strong><small>'+sleepDuration(s.naps.reduce((n,r)=>n+r.duration,0))+' total</small></div></div><div class="sleep-chart-head"><h3>'+(timing?'The shape of your nights':sleepView.mode==='feeling'?'How rested you felt':'Sleep across '+(days>31?'the months':days>7?'the weeks':'the week'))+'</h3><div class="tabset"><button data-action="sleep-mode" data-mode="timing" aria-pressed="'+timing+'" '+(days>31?'disabled title="Choose a month or week to view individual timings"':'')+'>Timing</button><button data-action="sleep-mode" data-mode="duration" aria-pressed="'+(!timing&&sleepView.mode!=='feeling')+'">Duration</button><button data-action="sleep-mode" data-mode="feeling" aria-pressed="'+(sleepView.mode==='feeling')+'">Rested</button></div></div>'+(timing?renderSleepTiming(records,b):renderSleepBars(records,b))+'<p class="sleep-note">'+(s.main.length?s.atGoal+' of '+s.main.length+' logged main sleeps met the goal saved with that entry.':'No main sleep is recorded in this period.')+' Naps are counted separately.</p>'+renderSleepList(records,period)+'</section><aside class="sleep-aside"><div id="sleepSelected">'+renderSleepSelected()+'</div><section class="sleep-source"><h3>Your rhythm, your target.</h3><p>A personal planning target helps you compare your nights over time.</p><div class="stat-line"><span>Goal for new entries</span><strong>'+sleepDuration(sleepView.goal)+'</strong></div><button class="text-button" data-action="sleep-goal">Adjust your sleep goal '+icon('edit')+'</button><div class="insight"><p><strong>A clear record.</strong><br>Manual duration and how rested you feel are your observations. No sleep stages or recovery score are inferred.</p></div><button class="text-button" data-action="sleep-sources">Watch data & privacy '+icon('arrow')+'</button></section></aside></div>';
    }
    function renderSleepTiming(records,b){
      const days=sleepDayCount(b.start,b.end);return '<div class="sleep-rhythm-axis"><span>Woke on</span><span><span>18:00</span><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span></span><span style="text-align:right">Asleep</span></div><div aria-label="Sleep timings by wake date">'+Array.from({length:days},(_,i)=>{const d=addDays(b.start,i),all=records.filter(r=>r.wakeDate===d),main=all.find(r=>r.kind==='main');return '<button class="sleep-night-row" data-action="sleep-select" data-date="'+d+'" aria-pressed="'+(sleepView.selected===d)+'" aria-label="'+dateLabel(d,{weekday:'long',day:'numeric',month:'long'})+': '+(main?sleepDuration(main.duration)+' asleep'+(main.bedTime?', into bed '+main.bedTime+', got up '+main.wakeTime:', timings not recorded'):'No main sleep recorded')+(all.some(r=>r.kind==='nap')?', nap recorded':'')+'"><span>'+dateLabel(d,{weekday:'short'})+'<small>'+dateLabel(d)+'</small></span><span class="night-track">'+all.flatMap(r=>sleepIntervals(r).map(p=>'<i class="night-interval '+(r.kind==='nap'?'nap':'')+'" style="left:'+p.start+'%;width:'+p.width+'%"></i>')).join('')+(main&&!main.bedTime?'<span class="duration-only">Duration only</span>':!main?'<span class="missing">No main log</span>':'')+'</span><span class="night-total">'+(main?sleepDuration(main.duration):'Add +')+'</span></button>';}).join('')+'</div><div class="sleep-legend"><span><i></i>Time in bed</span><span><i class="nap-key"></i>Nap time in bed</span></div><p class="sleep-note">Bands show bed and wake times on a repeating 24-hour clock. The number at the right is your recorded time asleep. Tap a date for details.</p>';
    }
    function renderSleepBars(records,b){
      const rating=sleepView.mode==='feeling';const bins=sleepBins(records,b).map(bin=>{if(!rating)return bin;const rated=bin.records.filter(r=>r.feeling!==null);return {...bin,records:rated,mean:rated.length?rated.reduce((n,r)=>n+r.feeling,0)/rated.length:null};}),max=rating?5:Math.max(600,...bins.map(x=>x.mean||0));const valueLabel=value=>rating?value.toFixed(1)+' / 5':sleepDuration(value);
      // Large histories remain readable by showing at most 12 calendar bins per page.
      const pageSize=window.matchMedia('(max-width:600px)').matches?6:12;const pages=Math.ceil(bins.length/pageSize),page=Math.min(sleepView.page,pages-1),end=bins.length-page*pageSize,shown=bins.slice(Math.max(0,end-pageSize),end);
      return '<div class="sleep-bars" role="group" aria-label="'+(rating?'Average rested rating by ':'Average recorded main sleep by ')+(bins[0]?bins[0].type:'day')+'">'+shown.map(x=>'<button class="sleep-bar" data-action="sleep-bin" data-start="'+x.start+'" data-end="'+x.end+'" aria-label="'+dateLabel(x.start,{day:'numeric',month:'long',year:'numeric'})+' to '+dateLabel(x.end,{day:'numeric',month:'long',year:'numeric'})+': '+(x.mean===null?(rating?'No rested rating recorded':'No main sleep recorded'):valueLabel(x.mean)+' average, '+x.records.length+(rating?(x.records.length===1?' rating':' ratings'):(x.records.length===1?' night':' nights')))+'"><span class="bar-value">'+(x.mean===null?'':valueLabel(x.mean))+'</span><span class="'+(x.mean===null?'bar-missing':'bar-fill')+'" '+(x.mean===null?'':'style="height:'+Math.round(x.mean/max*162)+'px"')+'></span><span class="bar-label">'+esc(x.label)+'</span></button>').join('')+'</div><p class="sleep-note">'+(rating?'Your own rested rating: 1 = exhausted, 5 = refreshed. Only rated main sleeps are included. Tap a bar to explore.':bins[0]&&bins[0].type!=='day'?'Average per '+bins[0].type+', calculated from recorded main sleep only. Tap a bar to open its dates.':'Recorded main sleep, in hours and minutes. A dashed mark means no entry. Tap a day to explore.')+'</p>'+(pages>1?'<div class="sleep-pagination"><button class="button ghost small" data-action="sleep-chart-page" data-page="'+(page+1)+'" '+(page===pages-1?'disabled':'')+'>Earlier</button><span>'+dateLabel(shown[0].start,{month:'short',year:'numeric'})+' to '+dateLabel(shown[shown.length-1].end,{month:'short',year:'numeric'})+'</span><button class="button ghost small" data-action="sleep-chart-page" data-page="'+(page-1)+'" '+(page===0?'disabled':'')+'>Later</button></div>':'');
    }
    function renderSleepSelected(){
      const records=activeSleepRecords().filter(r=>r.wakeDate===sleepView.selected),main=records.find(r=>r.kind==='main');
      return '<section class="sleep-selected"><span class="eyebrow">Selected wake date</span><h2>'+dateLabel(sleepView.selected,{weekday:'long',day:'numeric',month:'short'})+'</h2>'+(main?'<p>'+esc(sleepNightName(main))+'</p><div class="night-number">'+sleepDuration(main.duration)+'</div><p>Recorded time asleep</p><div class="detail-line"><span>Into bed</span><span>'+(main.bedTime?main.bedTime+' · '+dateLabel(main.bedDate):'Not recorded')+'</span></div><div class="detail-line"><span>Got up</span><span>'+(main.wakeTime?main.wakeTime+' · '+dateLabel(main.wakeDate):'Not recorded')+'</span></div><div class="detail-line"><span>Time in bed</span><span>'+sleepDuration(main.timeInBed)+'</span></div><div class="sleep-feeling" aria-label="Rested feeling: '+sleepFeelings[main.feeling||0]+'">'+Array.from({length:5},(_,i)=>'<i class="'+(i<(main.feeling||0)?'filled':'')+'"></i>').join('')+'</div><p>How you felt: '+sleepFeelings[main.feeling||0]+'</p>'+(main.note?'<p class="gap-sm">'+esc(main.note)+'</p>':'')+'<button class="button ghost small" data-action="sleep-detail" data-id="'+main.id+'">Full entry & corrections '+icon('arrow')+'</button>':'<div class="sleep-empty"><h3>No main sleep recorded</h3><p>This is a gap in the record, not zero sleep.</p><button class="button primary small" data-action="sleep-log" data-date="'+sleepView.selected+'">Log this sleep</button></div>')+records.filter(r=>r.kind==='nap').map(r=>'<button class="sleep-data-row" data-action="sleep-detail" data-id="'+r.id+'"><span>Nap<small>'+(r.bedTime?r.bedTime+' to '+r.wakeTime:'Duration only')+'</small></span><strong>'+sleepDuration(r.duration)+'</strong>'+icon('chevron')+'</button>').join('')+'</section>';
    }
    function renderSleepList(records,period){
      const rows=records.slice().reverse();return '<section class="sleep-data-list"><div class="row between"><h2>The entries behind it</h2><span class="quiet" style="font-size:11px">'+rows.length+' entries</span></div><details><summary class="text-button">Browse entries for '+esc(period)+'</summary>'+(rows.length?rows.map(r=>'<button class="sleep-data-row" data-action="sleep-detail" data-id="'+r.id+'"><span>'+dateLabel(r.wakeDate,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+'<small>'+(r.kind==='nap'?'Nap':'Main sleep')+' · '+(r.bedTime?r.bedTime+' to '+r.wakeTime:'Duration only')+'</small></span><strong>'+sleepDuration(r.duration)+'</strong>'+icon('chevron')+'</button>').join(''):'<p class="empty">No sleep entries in this date range.</p>')+'</details></section>';
    }
    function sleepDetail(id){const r=activeSleepRecords().find(r=>r.id===id);if(!r)return;
      const revisions=sleepRevisions.filter(x=>x.sessionId===r.sessionId);
      showDialog(sleepNightName(r),'<p class="dialog-sub">'+esc(r.source)+' · Dates are filed by when you woke up.</p><div class="dialog-stats"><div><strong>'+sleepDuration(r.duration)+'</strong><small>Recorded time asleep</small></div></div><div class="detail-line"><span>Into bed</span><span>'+(r.bedTime?dateLabel(r.bedDate)+' · '+r.bedTime:'Not recorded')+'</span></div><div class="detail-line"><span>Got up</span><span>'+(r.wakeTime?dateLabel(r.wakeDate)+' · '+r.wakeTime:dateLabel(r.wakeDate)+' · time not recorded')+'</span></div><div class="detail-line"><span>Time in bed</span><span>'+sleepDuration(r.timeInBed)+'</span></div><div class="detail-line"><span>How rested you felt</span><span>'+sleepFeelings[r.feeling||0]+'</span></div>'+(r.targetSnapshot?'<div class="detail-line"><span>Goal saved with entry</span><span>'+sleepDuration(r.targetSnapshot)+'</span></div>':'')+'<p class="sleep-note">Timezone for timings: '+esc(r.zone)+'.</p>'+(r.note?'<p class="gap-sm">'+esc(r.note)+'</p>':'')+(revisions.length>1?'<details class="gap-top"><summary class="text-button">'+revisions.length+' saved versions</summary>'+revisions.map((x,i)=>'<div class="sleep-revision">Version '+(i+1)+' · '+sleepDuration(x.duration)+' · '+sleepFeelings[x.feeling||0]+(x.id===r.id?' · Current':' · Earlier entry')+'</div>').join('')+'</details>':'')+'<div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button><button class="button primary" data-action="sleep-edit" data-id="'+r.id+'">Correct entry '+icon('edit')+'</button></div>');
    }
    let sleepEditingId=null;
    function sleepLog(date=TODAY,id=null){
      const r=id?activeSleepRecords().find(r=>r.id===id):null;sleepEditingId=r?r.id:null;const wake=r?r.wakeDate:date;
      showDialog(r?'Correct this sleep':'Log your sleep','<form id="sleepForm"><p class="dialog-sub">Quick duration is enough. Add timing details if you know them.</p><div class="sleep-form-type"><label><input type="radio" name="sleepKind" value="main" '+(!r||r.kind==='main'?'checked':'')+'> Main sleep</label><label><input type="radio" name="sleepKind" value="nap" '+(r&&r.kind==='nap'?'checked':'')+'> Nap</label></div><label>Date you woke up<input id="sleepWakeDate" type="date" value="'+wake+'" max="'+TODAY+'" required></label><p class="sleep-form-hint">Use the date you woke up. Older dates are welcome.</p><div class="sleep-form-grid"><label>Time asleep: hours<input id="sleepHours" type="number" min="0" max="24" step="1" inputmode="numeric" value="'+(r?Math.floor(r.duration/60):7)+'" required></label><label>Additional minutes<input id="sleepMinutes" type="number" min="0" max="59" step="1" inputmode="numeric" value="'+(r?r.duration%60:30)+'" required></label></div><label class="gap-top">How rested did you feel?<select id="sleepFeeling">'+sleepFeelings.map((text,i)=>'<option value="'+(i||'')+'" '+(i===(r?r.feeling||0:0)?'selected':'')+'>'+text+'</option>').join('')+'</select></label><details id="sleepTimes" class="sleep-form-section" '+(r&&r.bedTime?'open':'')+'><summary>Bed and wake times, optional</summary><p class="sleep-form-hint">These give time in bed. Your time asleep above stays separate. Close this section to save duration only.</p><div class="sleep-form-grid"><label>Into bed: date<input id="sleepBedDate" type="date" value="'+(r&&r.bedDate?r.bedDate:addDays(wake,-1))+'" max="'+TODAY+'"></label><label>Into bed: time<input id="sleepBedTime" type="time" value="'+(r&&r.bedTime?r.bedTime:'23:00')+'"></label><label>Got up: time<input id="sleepWakeTime" type="time" value="'+(r&&r.wakeTime?r.wakeTime:'07:00')+'"></label><div class="sleep-form-hint">Got up on the wake date above.</div><label>Timezone for these times<input id="sleepTimingZone" value="'+esc(r?.zone||sleepDeviceZone())+'" maxlength="100" placeholder="Europe/London"></label></div><div id="sleepTimeChoices"></div><div id="sleepTimeOutcome" class="sleep-form-outcome" aria-live="polite"></div></details><label class="gap-top">Anything worth remembering?<textarea id="sleepNote" rows="2" maxlength="1000" placeholder="A late coffee, a quiet evening, an early start...">'+esc(r?r.note:'')+'</textarea></label><div id="sleepError" class="error" role="alert"></div><div id="sleepDuplicate"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(r?'Save correction':'Save sleep')+'</button></div></form>');updateSleepTimePreview();
    }
    function sleepFormValues(){const kind=document.querySelector('input[name="sleepKind"]:checked').value;return {kind,wakeDate:$('sleepWakeDate').value,duration:Number($('sleepHours').value)*60+Number($('sleepMinutes').value),feeling:$('sleepFeeling').value?Number($('sleepFeeling').value):null,bedDate:$('sleepTimes').open?$('sleepBedDate').value:null,bedTime:$('sleepTimes').open?$('sleepBedTime').value:null,wakeTime:$('sleepTimes').open?$('sleepWakeTime').value:null,note:$('sleepNote').value.trim(),zone:$('sleepTimingZone').value.trim(),timingChoice:{bedAt:$('sleepOccurrence-bedAt')?.value||null,wakeAt:$('sleepOccurrence-wakeAt')?.value||null}};}
    function validateSleep(value,records,editingId){
      if(!sleepDateValid(value.wakeDate)||value.wakeDate>TODAY)return {error:'Choose a valid wake date on or before today.'};
      if(!['main','nap'].includes(value.kind)||!Number.isInteger(value.duration)||value.duration<=0||value.duration>1440)return {error:'Enter time asleep between 1 minute and 24 hours.'};
      const prior=editingId?records.find(record=>record.id===editingId):null,result=sleepTimingDetails(value,prior);
      if(result.error)return result;
      if(result.timeInBed!==null&&value.duration>result.timeInBed)return {error:'Time asleep cannot be longer than time in bed ('+sleepDuration(result.timeInBed)+').'};
      if(value.kind==='main'){const duplicate=records.find(record=>record.kind==='main'&&record.wakeDate===value.wakeDate&&record.id!==editingId);if(duplicate)return {error:'Main sleep is already recorded for this wake date. Correct that entry or choose another date.',duplicate:duplicate.id};}
      return result;
    }
    function updateSleepTimePreview(){
      if(!$('sleepForm'))return;
      const prior=sleepEditingId?activeSleepRecords().find(record=>record.id===sleepEditingId):null,choices=$('sleepTimeChoices');
      let result=sleepTimingDetails(sleepFormValues(),prior);
      if(result.choiceStale){for(const key of ['bedAt','wakeAt']){const input=$('sleepOccurrence-'+key);if(input)input.value='';}result=sleepTimingDetails(sleepFormValues(),prior);}
      const rows=result.ambiguities||[],signature=JSON.stringify(rows.map(row=>[row.key,row.options]));
      if(choices&&choices.dataset.signature!==signature){choices.dataset.signature=signature;choices.innerHTML=rows.map(row=>'<label class="gap-top">'+esc(row.label)+' '+esc(row.time)+' occurs twice<select id="sleepOccurrence-'+row.key+'"><option value="">Choose the clock occurrence</option>'+row.options.map((option,index)=>'<option value="'+esc(option.at)+'" '+(option.at===row.selected?'selected':'')+'>'+(index===0?'First':'Second')+' occurrence · '+sleepOffsetLabel(option.offsetMinutes)+'</option>').join('')+'</select></label>').join('');}
      $('sleepTimeOutcome').textContent=result.error|| (result.timeInBed===null?'Timings are optional. Your duration is kept separately.':'Time in bed: '+sleepDuration(result.timeInBed)+' · '+result.zone+(result.legacy?' · Original elapsed time preserved; absolute times were not recorded.':result.preserved?' · Original timings preserved.':''));
    }
    function saveSleep(event){event.preventDefault();const v=sleepFormValues(),result=validateSleep(v,activeSleepRecords(),sleepEditingId);$('sleepError').textContent=result.error||'';$('sleepDuplicate').innerHTML=result.duplicate?'<button type="button" class="text-button" data-action="sleep-edit" data-id="'+result.duplicate+'">Open the existing entry '+icon('arrow')+'</button>':'';if(result.error)return;
      const prior=sleepEditingId?activeSleepRecords().find(r=>r.id===sleepEditingId):null;
      const historicalMain=prior?sleepRevisions.filter(r=>r.sessionId===prior.sessionId&&r.kind==='main'&&r.targetSnapshot!==null).slice(-1)[0]:null;
      const {timingChoice,...savedValue}=v;const record={...savedValue,id:uid('sleep-version'),sessionId:prior?prior.sessionId:uid('sleep-session'),timeInBed:result.timeInBed,source:'Manual entry',zone:result.zone,timing:result.timing,targetSnapshot:v.kind==='main'?(historicalMain?historicalMain.targetSnapshot:sleepView.goal):null,createdAt:new Date().toISOString(),supersedes:prior?prior.id:null};sleepRevisions.push(record);sleepView.selected=v.wakeDate;sleepView.end=v.wakeDate;sleepView.range=7;sleepView.page=0;closeDialog();navigate('sleep');toast(prior?'Correction saved. The earlier version is retained in this app.':'Sleep added to your record.');
    }
    function sleepCustomDialog(){const b=sleepBounds();showDialog('Explore a period','<form id="sleepRangeForm"><p class="dialog-sub">Choose any past dates. Days without a record stay visible.</p><div class="sleep-form-grid"><label>From wake date<input id="sleepFrom" type="date" value="'+b.start+'" max="'+TODAY+'" required></label><label>To wake date<input id="sleepTo" type="date" value="'+b.end+'" max="'+TODAY+'" required></label></div><div id="sleepRangeError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">Explore dates</button></div></form>');}
    function handleSleepAction(a,d){
      if(a==='sleep-log'){sleepLog(d.date||TODAY);return;}
      if(a==='sleep-edit'){sleepLog(TODAY,d.id);return;}
      if(a==='sleep-detail'){sleepDetail(d.id);return;}
      if(a==='sleep-select'){sleepView.selected=d.date;const b=sleepBounds();if(d.date<b.start||d.date>b.end){sleepView.range=7;sleepView.end=d.date;sleepView.page=0;}render();const el=$('sleepSelected');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
      if(a==='sleep-range'){sleepView.range=Number(d.range);sleepView.end=TODAY;sleepView.page=0;render();return;}
      if(a==='sleep-mode'){sleepView.mode=d.mode;sleepView.page=0;render();return;}
      if(a==='sleep-custom'){sleepCustomDialog();return;}
      if(a==='sleep-shift'){const b=sleepBounds(),days=sleepDayCount(b.start,b.end),step=Number(d.step);if(sleepView.range===0)return;sleepView.end=addDays(b.end,step*days);if(sleepView.end>TODAY)sleepView.end=TODAY;if(sleepView.range==='custom')sleepView.customStart=addDays(sleepView.end,-days+1);sleepView.page=0;render();return;}
      if(a==='sleep-bin'){if(d.start===d.end){sleepView.selected=d.start;render();$('sleepSelected').scrollIntoView({behavior:'smooth',block:'nearest'});}else{sleepView.range='custom';sleepView.customStart=d.start;sleepView.end=d.end;sleepView.mode='timing';sleepView.page=0;render();}return;}
      if(a==='sleep-chart-page'){sleepView.page=Number(d.page);render();return;}
      if(a==='sleep-goal'){showDialog('Your sleep goal','<form id="sleepGoalForm"><p class="dialog-sub">Set your personal planning target. This applies to new entries; past entries keep their original goal.</p><label>Goal in hours<input id="sleepGoalHours" type="number" min="1" max="24" step="0.25" value="'+sleepView.goal/60+'" inputmode="decimal" required></label><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save goal</button></div></form>');return;}
      if(a==='sleep-sources'){showDialog('Watch data & privacy','<p class="dialog-sub">Manual logging works entirely on this device.</p><div class="detail-line"><span>Garmin 6X</span><span>Not connected</span></div><p class="sleep-note">A future watch import needs a verified path that fits your privacy settings. No Garmin account or cloud service is connected here.</p><div class="detail-line"><span>When imports are added</span><span>Review before saving</span></div><p class="sleep-note">Imported nights will keep their source and be checked against manual entries. A watch score will stay separate from your own rested rating.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');return;}
    }
    document.addEventListener('input',event=>{if(event.target.closest('#sleepForm'))updateSleepTimePreview();});
    document.addEventListener('submit',event=>{
      if(event.target.id==='sleepForm')saveSleep(event);
      if(event.target.id==='sleepRangeForm'){event.preventDefault();const start=$('sleepFrom').value,end=$('sleepTo').value;if(!sleepDateValid(start)||!sleepDateValid(end)||end<start||end>TODAY){$('sleepRangeError').textContent='Choose a valid range ending on or before today.';return;}sleepView.range='custom';sleepView.customStart=start;sleepView.end=end;sleepView.page=0;closeDialog();render();}
      if(event.target.id==='sleepGoalForm'){event.preventDefault();const hours=Number($('sleepGoalHours').value);if(!Number.isFinite(hours)||hours<1||hours>24)return;sleepView.goal=Math.round(hours*60);closeDialog();render();toast('Goal updated for future entries.');}
    });

/* Source nutrition from food-library.js. All plans, stock, yields and prices are fictional demo data. Grams only. */
    function snapshotTraining(){return clone({version:1,routines,schedule,history,state:{routineId:state.routineId,active:state.active,currentExercise:state.currentExercise,timer:state.timer,chartExercise:state.chartExercise,chartMetric:state.chartMetric,chartRange:state.chartRange,chartSessionId:state.chartSessionId}});}
    function restoreTraining(data,options={}){
      if(data==null)return {ok:true};
      try {
        const next=clone(data),dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&dateObj(d).toISOString().slice(0,10)===d;
        const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
        const prescription=p=>p&&idOK(p.slotId)&&idOK(p.exerciseId)&&Number.isInteger(p.targetSets)&&p.targetSets>0&&Number.isInteger(p.minReps)&&p.minReps>0&&Number.isInteger(p.maxReps)&&p.maxReps>=p.minReps&&Number.isFinite(p.restSeconds)&&p.restSeconds>=0;
        const session=s=>s&&idOK(s.id)&&dateOK(s.date)&&typeof s.name==='string'&&Array.isArray(s.exercises)&&s.exercises.every(p=>prescription(p)&&p.exercise&&idOK(p.exercise.id)&&typeof p.exercise.name==='string'&&Array.isArray(p.sets)&&p.sets.every(x=>idOK(x.id)&&Number.isFinite(x.weight)&&x.weight>=0&&Number.isInteger(x.reps)&&x.reps>0));
        if(!next||next.version!==1||!Array.isArray(next.routines)||!Array.isArray(next.history)||!next.schedule||typeof next.schedule!=='object'||Array.isArray(next.schedule)||!next.state)throw Error();
        if(next.routines.some(r=>!r||!idOK(r.id)||typeof r.name!=='string'||!Array.isArray(r.items)||!r.items.every(p=>prescription(p)&&exercise(p.exerciseId))))throw Error();
        if(new Set(next.routines.map(r=>r.id)).size!==next.routines.length||new Set(next.history.map(s=>s.id)).size!==next.history.length)throw Error();
        if(Object.entries(next.schedule).some(([d,id])=>!dateOK(d)||!next.routines.some(r=>r.id===id)))throw Error();
        if(next.history.some(s=>!session(s)||typeof s.completedAt!=='string'||!Number.isFinite(Date.parse(s.completedAt))))throw Error();
        const active=next.state.active,timer=next.state.timer;
        if(active!==null&&(!session(active)||!active.exercises.length||!Number.isFinite(active.startedAt)||active.startedAt<0))throw Error();
        if(timer!==null&&(!active||typeof timer.paused!=='boolean'||!Number.isFinite(timer.endAt)||!Number.isFinite(timer.total)||timer.total<=0||!Number.isFinite(timer.remaining)||timer.remaining<0))throw Error();
        if(options.validateOnly)return {ok:true};
        routines=next.routines;schedule=next.schedule;history=next.history;
        state.routineId=routines.some(r=>r.id===next.state.routineId)?next.state.routineId:(routines[0]?.id||null);
        state.active=active;state.timer=timer;state.currentExercise=active?Math.min(Math.max(0,Number.isInteger(next.state.currentExercise)?next.state.currentExercise:0),active.exercises.length-1):0;
        state.chartExercise=exercise(next.state.chartExercise)?next.state.chartExercise:EXERCISES[0]?.id;
        state.chartMetric=['weight','reps'].includes(next.state.chartMetric)?next.state.chartMetric:'weight';state.chartRange=[0,28,84].includes(next.state.chartRange)?next.state.chartRange:84;
        state.chartSessionId=history.some(s=>s.id===next.state.chartSessionId)?next.state.chartSessionId:null;
        state.lastFinished=null;state.showFinished=false;state.editSetId=null;
        return {ok:true};
      }catch(error){return {ok:false,error:'The saved training data is invalid. No training state was replaced.'};}
    }
    function snapshotSleep(){return clone({version:1,revisions:sleepRevisions,goal:sleepView.goal});}
    function restoreSleep(data,options={}){
      if(data==null)return {ok:true};
      try{
        const next=clone(data),idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200,timeOK=t=>t===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
        if(!next||next.version!==1||!Array.isArray(next.revisions)||!Number.isFinite(next.goal)||next.goal<60||next.goal>1440)throw Error();
        const seen=new Map();
        for(const r of next.revisions){
          if(!r||!idOK(r.id)||seen.has(r.id)||!idOK(r.sessionId)||!['main','nap'].includes(r.kind)||!sleepDateValid(r.wakeDate)||!Number.isFinite(r.duration)||r.duration<=0||r.duration>1440||!timeOK(r.bedTime)||!timeOK(r.wakeTime)||!(r.bedDate===null||sleepDateValid(r.bedDate))||!(r.timeInBed===null||Number.isFinite(r.timeInBed)&&r.timeInBed>=r.duration&&r.timeInBed<=1440)||!(r.feeling===null||Number.isInteger(r.feeling)&&r.feeling>=1&&r.feeling<=5)||!(r.targetSnapshot===null||Number.isFinite(r.targetSnapshot)&&r.targetSnapshot>0&&r.targetSnapshot<=1440)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))throw Error();
          if(!sleepTimingRecordValid(r))throw Error();
          if(r.supersedes!==null&&(!seen.has(r.supersedes)||seen.get(r.supersedes).sessionId!==r.sessionId))throw Error();
          seen.set(r.id,r);
        }
        const superseded=new Set(next.revisions.map(r=>r.supersedes).filter(Boolean)),dates=new Set();
        for(const r of next.revisions.filter(r=>!superseded.has(r.id)&&r.kind==='main')){if(dates.has(r.wakeDate))throw Error();dates.add(r.wakeDate);}
        if(options.validateOnly)return {ok:true};
        sleepRevisions.length=0;for(const row of next.revisions)sleepRevisions.push(row);sleepView.goal=next.goal;sleepEditingId=null;
        return {ok:true};
      }catch(error){return {ok:false,error:'The saved sleep data is invalid. No sleep state was replaced.'};}
    }
// v62 dated stock observations and statement evidence
const FoodDemo = (() => {
  const fixture = {"foods":[{"sheetRow":9,"id":"food_rice_white_uncooked","name":"Rice, white, uncooked","kcal":355,"protein":7.3,"carbs":78,"fat":0.8,"sugar":0.1,"satFat":0.2,"fibre":1.2,"salt":0.01,"unitName":"portion","unitGrams":100},{"sheetRow":10,"id":"food_veg_mixed_frozen","name":"Mixed vegetables, frozen","kcal":64,"protein":2.7,"carbs":9.8,"fat":0.7,"sugar":4.7,"satFat":0.2,"fibre":3.7,"salt":0.05,"unitName":"packet","unitGrams":136},{"sheetRow":11,"id":"food_chicken_breast_uncooked","name":"Chicken breasts, uncooked","kcal":106,"protein":23.5,"carbs":0,"fat":1.4,"sugar":0,"satFat":0.4,"fibre":0,"salt":0.15,"unitName":"breast","unitGrams":250},{"sheetRow":12,"id":"food_passata_italian_uncooked","name":"Italian passata, sauce","kcal":31,"protein":1.5,"carbs":4.2,"fat":0.8,"sugar":3.7,"satFat":0.4,"fibre":0.5,"salt":0.03,"unitName":"portion","unitGrams":100},{"sheetRow":13,"id":"food_fruit_mixed_dried","name":"Mixed fruit, dried","kcal":313,"protein":2.6,"carbs":73.3,"fat":0.6,"sugar":59,"satFat":0.1,"fibre":2.1,"salt":0.13,"unitName":"portion","unitGrams":30},{"sheetRow":14,"id":"food_flour_plain","name":"Plain Flour","kcal":340,"protein":10.4,"carbs":76.3,"fat":1.3,"sugar":1.4,"satFat":0.2,"fibre":3.2,"salt":0,"unitName":"portion","unitGrams":100},{"sheetRow":15,"id":"food_pasta_fusilli_uncooked","name":"Fusilli pasta, uncooked","kcal":352,"protein":12,"carbs":71,"fat":1.5,"sugar":2.8,"satFat":0.3,"fibre":2.9,"salt":0.01,"unitName":"portion","unitGrams":100},{"sheetRow":16,"id":"food_nuts_mixed","name":"Mixed nuts","kcal":696,"protein":14.3,"carbs":3.1,"fat":68.2,"sugar":2.4,"satFat":17.4,"fibre":6.3,"salt":0.1,"unitName":"portion","unitGrams":25},{"sheetRow":17,"id":"food_seeds_mixed","name":"Mixed seeds","kcal":614,"protein":26.7,"carbs":2.3,"fat":53,"sugar":2.2,"satFat":7.5,"fibre":10.3,"salt":0.12,"unitName":"portion","unitGrams":10},{"sheetRow":18,"id":"food_beans_kidney_red","name":"Red kidney beans, canned, drained","kcal":105,"protein":8.1,"carbs":12.8,"fat":0.6,"sugar":0.5,"satFat":0.1,"fibre":7.8,"salt":0.03,"unitName":"can","unitGrams":240},{"sheetRow":19,"id":"food_yeast_dried_fast_action","name":"Fast action dried yeast","kcal":322,"protein":44.8,"carbs":17.6,"fat":3.4,"sugar":13.9,"satFat":1.2,"fibre":21.1,"salt":0.3,"unitName":"portion","unitGrams":4},{"sheetRow":20,"id":"food_oil_olive_extra_virgin","name":"Extra virgin olive oil","kcal":900,"protein":0,"carbs":0,"fat":100,"sugar":0,"satFat":15.2,"fibre":0,"salt":0,"unitName":"portion","unitGrams":14},{"sheetRow":21,"id":"food_milk_whole","name":"Whole milk","kcal":66,"protein":3.5,"carbs":4.7,"fat":3.7,"sugar":4.7,"satFat":2.4,"fibre":0,"salt":0.11,"unitName":"ml","unitGrams":100},{"sheetRow":22,"id":"food_cream_double","name":"Double cream,Elmlea","kcal":295,"protein":1.8,"carbs":3.2,"fat":31,"sugar":3,"satFat":22,"salt":0.1,"unitName":"portion","unitGrams":100},{"sheetRow":23,"id":"food_cheese_mozzarella_grated","name":"Mozzarella cheese, grated","kcal":317,"protein":21.4,"carbs":7.1,"fat":22.5,"sugar":1.9,"satFat":14.5,"fibre":0.5,"salt":1.46,"unitName":"portion","unitGrams":30},{"sheetRow":24,"id":"food_cheese_cheddar_grated","name":"Cheddar cheese, grated","kcal":415,"protein":24.9,"carbs":2,"fat":34.2,"sugar":0.5,"satFat":21.3,"fibre":0.5,"salt":1.77,"unitName":"portion","unitGrams":30},{"sheetRow":25,"id":"food_cheese_parmigiano_grated","name":"Parmigiano cheese, grated","kcal":402,"protein":32.4,"carbs":0.5,"fat":29.7,"sugar":0.5,"satFat":19.6,"fibre":0.5,"salt":1.4,"unitName":"serving","unitGrams":10},{"sheetRow":26,"id":"food_mushrooms_chesnut_uncooked","name":"Chesnut mushrooms, uncooked","kcal":8,"protein":1,"carbs":0.3,"fat":0.2,"sugar":0.3,"satFat":0.1,"fibre":0.7,"salt":0.01,"unitName":"portion","unitGrams":100},{"sheetRow":27,"id":"food_pepper_bell_uncooked","name":"Bell Pepper, uncooked","kcal":23,"protein":0.8,"carbs":4.1,"fat":0.5,"sugar":4,"satFat":0.1,"fibre":1,"salt":0.01,"unitName":"pepper","unitGrams":160},{"sheetRow":28,"id":"food_garlic_chopped_uncooked","name":"Chopped garlic, uncooked","kcal":76,"protein":4.7,"carbs":11.3,"fat":0.1,"sugar":0.7,"satFat":0.1,"salt":0.1,"unitName":"portion","unitGrams":15},{"sheetRow":29,"id":"food_puree_tomato_uncooked","name":"Tomato puree, uncooked","kcal":89,"protein":4.5,"carbs":15.6,"fat":0.4,"sugar":15.6,"satFat":0,"fibre":2.3,"salt":0.06,"unitName":"tablespoon","unitGrams":15},{"sheetRow":30,"id":"food_puree_garlic_uncooked","name":"Garlic puree, uncooked","kcal":101,"protein":4.5,"carbs":15.5,"fat":1.8,"sugar":1,"satFat":0.3,"fibre":3,"salt":0.4,"unitName":"teaspoon","unitGrams":6},{"sheetRow":31,"id":"food_coffee_decaf_organic","name":"Organic decaf coffee, finely ground","kcal":2,"protein":0.2,"carbs":0.3,"fat":0,"sugar":0,"satFat":0,"fibre":0,"salt":0,"unitName":"cup","unitGrams":17},{"sheetRow":32,"id":"food_protein_whey_powder","name":"Whey protein, powder","kcal":372,"protein":69,"carbs":7.9,"fat":6.5,"sugar":4.7,"satFat":4,"salt":0.61,"unitName":"scoop","unitGrams":30},{"sheetRow":33,"id":"food_protein_collagen_powder","name":"Collagen protein, powder","kcal":355,"protein":87,"carbs":1,"fat":0.5,"sugar":0,"satFat":0.2,"salt":0.48,"unitName":"scoop","unitGrams":30},{"sheetRow":34,"id":"food_oats_instant","name":"Instant oats, powder","kcal":388,"protein":11,"carbs":69,"fat":6.9,"sugar":0.8,"satFat":1.6,"fibre":4,"salt":0.01,"unitName":"serving","unitGrams":100},{"sheetRow":35,"id":"food_protein_mass_gainer","name":"Mass gainer protein, powder","kcal":361,"protein":27,"carbs":47,"fat":6.3,"sugar":9.9,"satFat":4.4,"salt":0.14,"unitName":"serving","unitGrams":125},{"sheetRow":36,"id":"food_banana_raw","name":"Banana, raw, peeled","kcal":89,"protein":1.1,"carbs":22.8,"fat":0.3,"sugar":12.2,"satFat":0.1,"fibre":2.6,"salt":0,"unitName":"banana","unitGrams":118},{"sheetRow":37,"id":"food_orange_raw","name":"Orange, raw, peeled","kcal":47,"protein":0.9,"carbs":11.8,"fat":0.1,"sugar":9.4,"satFat":0,"fibre":2.4,"salt":0,"unitName":"orange","unitGrams":130},{"sheetRow":38,"id":"food_onion_brown_raw","name":"Brown onion, raw, peeled","kcal":40,"protein":1.1,"carbs":9.3,"fat":0.1,"sugar":4.2,"satFat":0,"fibre":1.7,"salt":0,"unitName":"onion","unitGrams":150},{"sheetRow":39,"id":"food_onion_red_raw","name":"Red onion, raw, peeled","kcal":40,"protein":1.1,"carbs":9.3,"fat":0.1,"sugar":4.2,"satFat":0,"fibre":1.7,"salt":0,"unitName":"onion","unitGrams":150},{"sheetRow":40,"id":"food_spinach_raw","name":"Spinach, raw","kcal":23,"protein":2.9,"carbs":3.6,"fat":0.4,"sugar":0.4,"satFat":0.1,"fibre":2.2,"salt":0.2,"unitName":"handful","unitGrams":30},{"sheetRow":41,"id":"food_sweetcorn_canned","name":"Sweetcorn, canned, drained","kcal":81,"protein":2.6,"carbs":14.4,"fat":1.2,"sugar":4,"satFat":0.2,"fibre":2.5,"salt":0.2,"unitName":"can drained","unitGrams":165},{"sheetRow":42,"id":"food_yoghurt_natural","name":"Natural yoghurt (Yeo Valley)","kcal":82,"protein":4.6,"carbs":5.5,"fat":4.2,"sugar":5.5,"satFat":2.7,"fibre":0,"salt":0.18},{"sheetRow":43,"id":"food_eggs","name":"Eggs, whole, raw","kcal":131,"protein":12.6,"carbs":0.3,"fat":9,"sugar":0.3,"satFat":2.5,"fibre":0,"salt":0.35,"unitName":"egg","unitGrams":58},{"sheetRow":45,"id":"food_berries_frozen","name":"Mixed berries, frozen","kcal":42,"protein":0.9,"carbs":8,"fat":0.3,"sugar":7.5,"satFat":0,"fibre":3,"salt":0,"unitName":"handful","unitGrams":80},{"sheetRow":46,"id":"food_salmon_red_thai","name":"Salmon fillet, Red Thai (SS)","kcal":214,"protein":20.4,"carbs":2,"fat":13.8,"sugar":1.1,"satFat":2.2,"fibre":0.5,"salt":0.85,"unitName":"fillet","unitGrams":110},{"sheetRow":47,"id":"food_chicken_breast_cooked","name":"Chicken breasts, cooked","kcal":145,"protein":32.2,"carbs":0,"fat":1.9,"sugar":0,"satFat":0.5,"fibre":0,"salt":0.21,"unitName":"breast","unitGrams":183},{"sheetRow":48,"id":"food_rice_white_cooked","name":"Rice, white, cooked","kcal":129,"protein":2.7,"carbs":28.4,"fat":0.3,"sugar":0,"satFat":0.1,"fibre":0.4,"salt":0,"unitName":"portion","unitGrams":275},{"sheetRow":49,"id":"food_pasta_fusilli_cooked","name":"Fusilli pasta, cooked","kcal":147,"protein":5,"carbs":29.6,"fat":0.6,"sugar":1.2,"satFat":0.1,"fibre":1.2,"salt":0,"unitName":"portion","unitGrams":240}],"recipes":[{"id":"meal_1","name":"Veg omelette","components":[{"foodId":"food_eggs","grams":174},{"foodId":"food_cheese_cheddar_grated","grams":30},{"foodId":"food_mushrooms_chesnut_uncooked","grams":60},{"foodId":"food_pepper_bell_uncooked","grams":40},{"foodId":"food_spinach_raw","grams":40},{"foodId":"food_onion_red_raw","grams":30},{"foodId":"food_oil_olive_extra_virgin","grams":7}],"nutrition":{"calories":451,"protein":31.8,"carbs":7.2,"fat":33.4,"sugar":3.9,"satFat":11.9,"fibre":2.4,"salt":1.2}},{"id":"meal_2","name":"Yoghurt berry bowl","components":[{"foodId":"food_yoghurt_natural","grams":250},{"foodId":"food_protein_whey_powder","grams":20},{"foodId":"food_berries_frozen","grams":100},{"foodId":"food_nuts_mixed","grams":20},{"foodId":"food_seeds_mixed","grams":10},{"foodId":"food_fruit_mixed_dried","grams":10}],"nutrition":{"calories":553,"protein":32,"carbs":31.5,"fat":31.1,"sugar":28.8,"satFat":11.8,"salt":0.6}},{"id":"meal_3","name":"Chicken & rice bowl","components":[{"foodId":"food_chicken_breast_cooked","grams":146},{"foodId":"food_rice_white_cooked","grams":220},{"foodId":"food_veg_mixed_frozen","grams":136},{"foodId":"food_eggs","grams":58},{"foodId":"food_oil_olive_extra_virgin","grams":5}],"nutrition":{"calories":704,"protein":63.9,"carbs":76,"fat":14.6,"sugar":6.6,"satFat":3.4,"fibre":5.9,"salt":0.6}},{"id":"meal_4","name":"Salmon egg fried rice","components":[{"foodId":"food_salmon_red_thai","grams":130},{"foodId":"food_rice_white_cooked","grams":220},{"foodId":"food_veg_mixed_frozen","grams":136},{"foodId":"food_eggs","grams":58},{"foodId":"food_oil_olive_extra_virgin","grams":5}],"nutrition":{"calories":770,"protein":43.4,"carbs":78.6,"fat":29.8,"sugar":8,"satFat":5.6,"fibre":6.6,"salt":1.4}},{"id":"meal_5","name":"Chicken pasta, passata & parmigiano","components":[{"foodId":"food_pasta_fusilli_cooked","grams":240},{"foodId":"food_chicken_breast_cooked","grams":131},{"foodId":"food_passata_italian_uncooked","grams":150},{"foodId":"food_mushrooms_chesnut_uncooked","grams":80},{"foodId":"food_pepper_bell_uncooked","grams":60},{"foodId":"food_onion_brown_raw","grams":60},{"foodId":"food_puree_tomato_uncooked","grams":15},{"foodId":"food_garlic_chopped_uncooked","grams":10},{"foodId":"food_oil_olive_extra_virgin","grams":8},{"foodId":"food_cheese_parmigiano_grated","grams":15}],"nutrition":{"calories":787,"protein":64.4,"carbs":89.2,"fat":18.2,"sugar":16.1,"satFat":5.8,"salt":0.6}},{"id":"meal_6","name":"Post-training shake","components":[{"foodId":"food_protein_whey_powder","grams":30},{"foodId":"food_oats_instant","grams":50},{"foodId":"food_milk_whole","grams":300},{"foodId":"food_banana_raw","grams":118}],"nutrition":{"calories":609,"protein":38,"carbs":77.9,"fat":16.9,"sugar":30.3,"satFat":9.3,"salt":0.5}},{"id":"meal_7","name":"Homemade pizza","components":[{"foodId":"food_flour_plain","grams":150},{"foodId":"food_yeast_dried_fast_action","grams":4},{"foodId":"food_oil_olive_extra_virgin","grams":10},{"foodId":"food_passata_italian_uncooked","grams":100},{"foodId":"food_puree_tomato_uncooked","grams":15},{"foodId":"food_puree_garlic_uncooked","grams":10},{"foodId":"food_cheese_mozzarella_grated","grams":75},{"foodId":"food_chicken_breast_cooked","grams":58},{"foodId":"food_mushrooms_chesnut_uncooked","grams":50},{"foodId":"food_pepper_bell_uncooked","grams":50},{"foodId":"food_onion_red_raw","grams":40},{"foodId":"food_sweetcorn_canned","grams":30},{"foodId":"food_spinach_raw","grams":25}],"nutrition":{"calories":1051,"protein":57.6,"carbs":139.7,"fat":32,"sugar":15.4,"satFat":13.6,"fibre":10,"salt":1.4}}]};
  const foods = fixture.foods;
  const recipes = fixture.recipes.map(r => ({...r, perServing: clone(r.nutrition)}));
  const plans = [], revisions = [], movements = [], purchases = [];
  const receiptKeys = new Set(), targetDays = new Map();
  const targets = {calories:2800,protein:160,carbs:330,fat:90};
  const fields = ['calories','protein','carbs','fat'];
  const yields = {
    food_rice_white_cooked:{sourceId:'food_rice_white_uncooked',ratio:2.75},
    food_chicken_breast_cooked:{sourceId:'food_chicken_breast_uncooked',ratio:0.73},
    food_pasta_fusilli_cooked:{sourceId:'food_pasta_fusilli_uncooked',ratio:2.4}
  };
  const food = id => foods.find(f => f.id === id);
  const recipe = id => recipes.find(r => r.id === id);
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const positive = n => finite(n) && n > 0;
  const mass = n => finite(n) && n >= 0;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const fail = error => ({ok:false,error});
  const rounded = n => Math.round(n*1000000)/1000000;
  const latestLogs = () => {
    const superseded = new Set(revisions.map(r=>r.supersedes).filter(Boolean));
    return revisions.filter(r=>!superseded.has(r.id));
  };
  function stock(id,date=TODAY) {
    // Legacy entries remain deltas. New physical counts are absolute observations.
    // Corrections replay immediately after the original purchase, before any later count.
    // Other entries on the same effective date retain their recording order.
    const positions=new Map(movements.map((entry,index)=>[entry.id,index]));
    const ordered=movements.map((entry,index)=>({entry,index,anchor:entry.kind==='receipt-correction'?positions.get(entry.effectiveAfterMovementId):index})).filter(row=>row.entry.foodId===id&&row.entry.date<=date).sort((a,b)=>a.entry.date.localeCompare(b.entry.date)||a.anchor-b.anchor||a.index-b.index);
    return rounded(ordered.reduce((total,{entry})=>Object.prototype.hasOwnProperty.call(entry,'observedGrams')?entry.observedGrams:total+entry.delta,0));
  }
  function receiptPence(value) {
    const cents=Math.round(value*100);
    return typeof value==='number'&&Number.isFinite(value)&&Number.isSafeInteger(cents)&&cents>=0&&Math.abs(value*100-cents)<0.000001?cents:null;
  }
  function priceConsistent(row) {
    const expected=row.totalPrice/row.grams*1000;
    if(!Number.isFinite(expected)||!mass(row.perKg)||Math.abs(row.perKg-expected)>0.00000001*Math.max(1,Math.abs(expected)))return false;
    return !Object.prototype.hasOwnProperty.call(row,'totalPricePence')||(Number.isSafeInteger(row.totalPricePence)&&row.totalPricePence>=0&&row.totalPrice===row.totalPricePence/100);
  }
  function groupRequirements(list) {
    const amounts = new Map();
    list.forEach(row=>amounts.set(row.foodId,rounded((amounts.get(row.foodId)||0)+row.grams)));
    return [...amounts].map(([foodId,grams])=>({foodId,grams}));
  }
  function requirements(planOrRecipe, servings) {
    const r = planOrRecipe && planOrRecipe.mealId ? recipe(planOrRecipe.mealId) : planOrRecipe;
    const count = servings===undefined ? (planOrRecipe && planOrRecipe.servings!==undefined ? planOrRecipe.servings : 1) : servings;
    if (!r || !Array.isArray(r.components) || !positive(count)) return [];
    return groupRequirements(r.components.map(c=>{
      const conversion = yields[c.foodId];
      return conversion ? {foodId:conversion.sourceId,grams:c.grams*count/conversion.ratio} : {foodId:c.foodId,grams:c.grams*count};
    }));
  }
  function totals(items, getNutrition) {
    const out = Object.fromEntries(fields.map(k=>[k,0]));
    items.forEach(item=>fields.forEach(k=>out[k]+=(getNutrition(item)[k]||0)*item.servings));
    fields.forEach(k=>out[k]=Math.round(out[k]*(k==='calories'?1:10))/(k==='calories'?1:10));
    return out;
  }
  function day(date) {
    const dayPlans=plans.filter(p=>p.date===date).sort((a,b)=>a.time.localeCompare(b.time));
    const dayLogs=latestLogs().filter(l=>l.date===date).sort((a,b)=>a.time.localeCompare(b.time));
    const logged = new Set(dayLogs.map(l=>l.planId));
    const pending=dayPlans.filter(p=>!logged.has(p.id));
    const eaten=totals(dayLogs,l=>l.perServing);
    const pendingTotals=totals(pending,p=>recipe(p.mealId).nutrition);
    const planned=Object.fromEntries(fields.map(k=>[k,rounded(eaten[k]+pendingTotals[k])]));
    return {plans:dayPlans,logs:dayLogs,eaten,planned,target:clone(targetDays.get(date)||targets)};
  }
  function prices(id) {
    const superseded=new Set(purchases.map(p=>p.supersedes).filter(Boolean));
    return purchases.filter(p=>p.foodId===id&&!superseded.has(p.id)).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  }
  function shopping(start,end) {
    if(!validDate(start)||!validDate(end)||start>end) return [];
    const logged = new Set(latestLogs().map(l=>l.planId));
    const pending=plans.filter(p=>p.date>=start&&p.date<=end&&!logged.has(p.id)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    const demand = new Map();
    pending.forEach(p=>requirements(p).forEach(r=>{
      const previous=demand.get(r.foodId)||{foodId:r.foodId,required:0,available:Math.max(0,stock(r.foodId)),neededBy:null};
      previous.required=rounded(previous.required+r.grams);
      if(previous.neededBy===null&&previous.required>previous.available+0.000001) previous.neededBy=p.date;
      demand.set(r.foodId,previous);
    }));
    return [...demand.values()].map(row=>{
      const history=prices(row.foodId).filter(p=>p.date<=TODAY);
      const last=history[history.length-1];
      const shortage=rounded(Math.max(0,row.required-row.available));
      const pricePerKg=last?last.perKg:null;
      return {...row,shortage,pricePerKg,estimatedCost:pricePerKg===null?null:Math.round(shortage/1000*pricePerKg*100)/100};
    }).sort((a,b)=>(a.neededBy||'9999').localeCompare(b.neededBy||'9999')||food(a.foodId).name.localeCompare(food(b.foodId).name));
  }
  function validatePlan(p) {
    if(!validDate(p.date)) return 'Choose a valid date.';
    if(!validTime(p.time)) return 'Choose a valid time.';
    if(!recipe(p.mealId)) return 'Choose a meal from your recipes.';
    if(!positive(p.servings)||p.servings>100) return 'Servings must be greater than zero and no more than 100.';
    return null;
  }
  function addPlan(p) {
    const error=validatePlan(p||{});
    if(error) return fail(error);
    const plan={id:uid('food-plan'),date:p.date,time:p.time,mealId:p.mealId,servings:p.servings};
    plans.push(plan);
    return {ok:true,plan};
  }
  function updatePlan(id,patch) {
    const p=plans.find(p=>p.id===id);
    if(!p) return fail('This planned meal no longer exists.');
    if(latestLogs().some(l=>l.planId===id)) return fail('This meal is already logged. Correct the log to change the portion eaten.');
    const next={...p,...patch,id:p.id};
    const error=validatePlan(next);
    if(error) return fail(error);
    Object.assign(p,next);
    return {ok:true,plan:p};
  }
  function removePlan(id) {
    const index=plans.findIndex(p=>p.id===id);
    if(index<0) return fail('This planned meal no longer exists.');
    if(latestLogs().some(l=>l.planId===id)) return fail('A logged meal stays in your record.');
    plans.splice(index,1);
    return {ok:true};
  }
  function movement(foodId,delta,kind,referenceId,note,date) {
    const entry={id:uid('food-move'),foodId,delta:rounded(delta),kind,referenceId:referenceId||null,note:note||'',date:date||TODAY};
    movements.push(entry);
    return entry;
  }
  function insufficient(required) {
    return required.find(r=>r.grams>0&&stock(r.foodId)+0.000001<r.grams);
  }
  function logMeal(planId,options) {
    const p=plans.find(p=>p.id===planId);
    if(!p) return fail('This planned meal no longer exists.');
    if(latestLogs().some(l=>l.planId===planId)) return fail('This planned meal is already logged.');
    if(p.date>TODAY) return fail('A future meal can be planned now and logged on its date.');
    const opts=options||{};
    const eatenTime=opts.time===undefined?p.time:opts.time===null?'':opts.time;
    if(eatenTime!==''&&!validTime(eatenTime))return fail('Enter a valid time eaten, or leave it blank.');
    const servings=opts.servings===undefined?p.servings:opts.servings;
    if(!positive(servings)||servings>100) return fail('Servings must be greater than zero and no more than 100.');
    if(typeof opts.useStock!=='boolean') return fail('Choose whether this meal used your pantry.');
    const r=recipe(p.mealId), frozenRequirements=requirements(p,servings);
    if(opts.useStock) {
      const missing=insufficient(frozenRequirements);
      if(missing) return fail('Not enough '+food(missing.foodId).name+'. Update your stock or log without using the pantry.');
    }
    const target=clone(targetDays.get(p.date)||targets);
    const log={id:uid('food-log'),planId:p.id,date:p.date,time:eatenTime,name:r.name,mealId:r.id,servings,perServing:clone(r.nutrition),components:clone(r.components),stockUsed:opts.useStock,stockRequirements:clone(frozenRequirements),stockPerServing:frozenRequirements.map(x=>({foodId:x.foodId,grams:x.grams/servings})),targetSnapshot:target};
    if(opts.useStock) frozenRequirements.forEach(x=>movement(x.foodId,-x.grams,'meal',log.id,'Meal logged',p.date));
    if(!targetDays.has(p.date)) targetDays.set(p.date,clone(target));
    revisions.push(log);
    return {ok:true,log};
  }
  const directLogOperations = new Map();
  function logFood(input) {
    if (!input || typeof input !== 'object') return fail('Enter the food you ate.');
    const {date,mealId,servings,useStock} = input;
    const time = input.time === undefined || input.time === null ? '' : input.time;
    if (!validDate(date) || date > TODAY) return fail('Choose today or an earlier date for food already eaten.');
    if (time !== '' && !validTime(time)) return fail('Enter a valid time eaten, or leave it blank.');
    if (!recipe(mealId)) return fail('Choose a meal from your library.');
    if (!positive(servings) || servings > 100) return fail('Servings must be greater than zero and no more than 100.');
    if (typeof useStock !== 'boolean') return fail('Choose whether this meal used your pantry.');
    const operationId = input.operationId || null;
    if (operationId !== null && (typeof operationId !== 'string' || operationId.length > 200)) return fail('This logging request is invalid. Reopen Log food.');
    const payload = JSON.stringify({date,time,mealId,servings,useStock});
    const consumed = operationId && directLogOperations.get(operationId);
    if (consumed) {
      if (consumed.payload !== payload) return fail('This request was already saved with different details. Open its record to correct it.');
      return {ok:true,log:latestLogs().find(log=>log.planId===consumed.planId),unchanged:true};
    }
    // Internal backing plan keeps existing readers and the planId duplicate guard intact.
    // Blank time is an explicitly unknown time, never a fabricated meal time.
    const plan = {id:uid('food-plan'),date,time,mealId,servings,source:'direct-log'};
    const required = requirements(plan,servings);
    if (useStock) {
      const missing = insufficient(required);
      if (missing) return fail('Not enough '+food(missing.foodId).name+'. Update your stock or log without using the pantry.');
    }
    const before = {plans:plans.length,revisions:revisions.length,movements:movements.length,hadTarget:targetDays.has(date)};
    const rollback = () => { plans.length=before.plans;revisions.length=before.revisions;movements.length=before.movements;if(!before.hadTarget)targetDays.delete(date); };
    try {
      plans.push(plan);
      const result = logMeal(plan.id,{servings,useStock,time});
      if (!result.ok) { rollback(); return result; }
      if (operationId) directLogOperations.set(operationId,{payload,planId:plan.id});
      return {...result,plan};
    } catch (error) {
      rollback();
      return fail('The meal could not be logged. No meal or pantry change was kept.');
    }
  }
  function correctLog(id,servings) {
    const old=latestLogs().find(l=>l.id===id);
    if(!old) return fail('This log has already been corrected. Open its latest version.');
    if(!positive(servings)||servings>100) return fail('Servings must be greater than zero and no more than 100.');
    if(servings===old.servings) return {ok:true,log:old,unchanged:true};
    const required=old.stockPerServing.map(x=>({foodId:x.foodId,grams:rounded(x.grams*servings)}));
    const delta=old.stockPerServing.map(x=>({foodId:x.foodId,grams:rounded(x.grams*(servings-old.servings))}));
    if(old.stockUsed) {
      const missing=insufficient(delta);
      if(missing) return fail('Not enough '+food(missing.foodId).name+' for that corrected portion. Count your stock first.');
    }
    const log={...clone(old),id:uid('food-log'),servings,stockRequirements:required,supersedes:old.id};
    if(old.stockUsed) delta.forEach(x=>movement(x.foodId,-x.grams,'meal-correction',log.id,'Portion corrected',old.date));
    revisions.push(log);
    return {ok:true,log};
  }
  function setStock(foodId,grams,note,date=TODAY) {
    if(!food(foodId)) return fail('Choose a food from the library.');
    if(!mass(grams)||!Number.isFinite(rounded(grams))) return fail('Stock must be a finite amount of zero grams or more.');
    if(!validDate(date)||date>TODAY)return fail('Choose a stock count date on or before today.');
    const entry=movement(foodId,grams-stock(foodId,date),'count',null,note||'Stock counted',date);
    entry.observedGrams=rounded(grams);
    return {ok:true,grams:entry.observedGrams,observation:clone(entry)};
  }
  function importStock(rows,date=TODAY) {
    if(!Array.isArray(rows)||rows.length===0) return fail('Add at least one stock row.');
    if(!validDate(date)||date>TODAY)return fail('Choose a stock count date on or before today.');
    const seen=new Set();
    for(const row of rows) {
      if(!row||!food(row.foodId)||!mass(row.grams)||!Number.isFinite(rounded(row.grams))) return fail('Every row needs a known food and a non-negative quantity in grams.');
      if(seen.has(row.foodId)) return fail('Each food can appear only once in a stock count.');
      seen.add(row.foodId);
    }
    rows.forEach(row=>{const entry=movement(row.foodId,row.grams-stock(row.foodId,date),'count-import',null,'Stock count imported',date);entry.observedGrams=rounded(row.grams);});
    return {ok:true,count:rows.length};
  }
  function addReceipt(receipt) {
    if(!receipt||!validDate(receipt.date)||receipt.date>TODAY) return fail('Choose a purchase date on or before today.');
    if(typeof receipt.store!=='string'||!receipt.store.trim()) return fail('Enter the shop name.');
    if(!Array.isArray(receipt.lines)||receipt.lines.length===0) return fail('Add at least one receipt line.');
    for(const line of receipt.lines) {
      if(!line||!food(line.foodId)||!positive(line.grams)||!Number.isFinite(rounded(line.grams))||receiptPence(line.totalPrice)===null||!Number.isFinite(line.totalPrice/line.grams*1000)) return fail('Every receipt line needs a known food, positive grams and a total price in pounds and pence.');
    }
    const storeName=receipt.store.trim().replace(/\s+/g,' ');
    const key=JSON.stringify([receipt.date,storeName.toLowerCase(),receipt.lines.map(l=>[l.foodId,l.grams,l.totalPrice]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
    if(receiptKeys.has(key)) return fail('This receipt has already been added. Your stock and prices are unchanged.');
    const receiptId=uid('receipt');
    const entries=receipt.lines.map(line=>({id:uid('purchase'),receiptId,foodId:line.foodId,date:receipt.date,store:storeName,grams:line.grams,totalPrice:receiptPence(line.totalPrice)/100,totalPricePence:receiptPence(line.totalPrice),perKg:(receiptPence(line.totalPrice)/100)/line.grams*1000,attachmentName:typeof receipt.attachmentName==='string'?receipt.attachmentName:''}));
    entries.forEach(entry=>{purchases.push(entry);movement(entry.foodId,entry.grams,'purchase',receiptId,'Receipt added',entry.date);});
    receiptKeys.add(key);
    return {ok:true,receiptId,count:entries.length,purchases:entries};
  }
  function setTargets(patch) {
    if(!patch||typeof patch!=='object') return fail('Enter your targets.');
    const next={...targets};
    for(const key of fields) {
      if(Object.prototype.hasOwnProperty.call(patch,key)) {
        if(!positive(patch[key])) return fail('Each target must be a finite number greater than zero.');
        next[key]=patch[key];
      }
    }
    Object.assign(targets,next);
    return {ok:true,targets:clone(targets)};
  }
  function setYield(cookedId,sourceId,ratio) {
    if(!food(cookedId)||!food(sourceId)) return fail('Choose known foods for the prepared and pantry ingredients.');
    if(!positive(ratio)) return fail('Yield must be a finite number greater than zero.');
    if(cookedId===sourceId&&ratio!==1) return fail('Using prepared stock directly needs a yield of 1.');
    if(sourceId!==cookedId&&yields[sourceId]&&yields[sourceId].sourceId!==sourceId) return fail('Choose the pantry food directly. Chained conversions are not supported.');
    yields[cookedId]={sourceId,ratio};
    return {ok:true,yield:clone(yields[cookedId])};
  }
  function saveRecipe(patch) {
    if(!patch||typeof patch.name!=='string'||!patch.name.trim()) return fail('Give the recipe a name.');
    if(!Array.isArray(patch.components)||patch.components.length===0) return fail('Add at least one ingredient.');
    for(const c of patch.components) {
      if(!c||!food(c.foodId)||!positive(c.grams)) return fail('Every ingredient needs a food and positive grams per serving.');
    }
    if(patch.id&&!recipe(patch.id)) return fail('This recipe no longer exists.');
    const components=groupRequirements(patch.components);
    const nutrition={};
    [['calories','kcal'],['protein','protein'],['carbs','carbs'],['fat','fat'],['sugar','sugar']].forEach(([output,input])=>{
      const n=components.reduce((sum,c)=>sum+food(c.foodId)[input]*c.grams/100,0);
      nutrition[output]=output==='calories'?Math.round(n):Math.round(n*10)/10;
    });
    ['satFat','fibre','salt'].forEach(key=>{
      if(components.every(c=>Object.prototype.hasOwnProperty.call(food(c.foodId),key))) nutrition[key]=Math.round(components.reduce((sum,c)=>sum+food(c.foodId)[key]*c.grams/100,0)*10)/10;
    });
    const next={id:patch.id||uid('meal'),name:patch.name.trim(),components,nutrition,perServing:clone(nutrition)};
    const old=recipe(patch.id);
    if(old) Object.assign(old,next); else recipes.push(next);
    return {ok:true,recipe:old||next};
  }
  function snapshot(){return clone({version:1,foods,recipes,plans,revisions,movements,purchases,yields,targets,targetDays:[...targetDays],receiptKeys:[...receiptKeys],directLogOperations:[...directLogOperations]});}
  function restore(data,options={}){
    if(data==null)return {ok:true};
    try{
      const next=clone(data),idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
      if(!next||next.version!==1||['foods','recipes','plans','revisions','movements','purchases','targetDays','receiptKeys','directLogOperations'].some(k=>!Array.isArray(next[k])))throw Error();
      const unique=(rows,key='id')=>rows.every(r=>r&&idOK(r[key]))&&new Set(rows.map(r=>r[key])).size===rows.length;
      if(!['foods','recipes','plans','revisions','movements','purchases'].every(k=>unique(next[k])))throw Error();
      const foodIds=new Set(next.foods.map(f=>f.id)),recipeIds=new Set(next.recipes.map(r=>r.id)),planIds=new Set(next.plans.map(p=>p.id));
      const components=rows=>Array.isArray(rows)&&rows.every(r=>r&&foodIds.has(r.foodId)&&Number.isFinite(r.grams)&&r.grams>=0);
      const nutrition=n=>n&&typeof n==='object'&&fields.every(k=>Number.isFinite(n[k])&&n[k]>=0);
      const target=t=>t&&typeof t==='object'&&fields.every(k=>Number.isFinite(t[k])&&t[k]>0);
      if(next.foods.some(f=>typeof f.name!=='string'||!Number.isFinite(f.kcal)||f.kcal<0||['protein','carbs','fat'].some(k=>!Number.isFinite(f[k])||f[k]<0)))throw Error();
      if(next.recipes.some(r=>typeof r.name!=='string'||!components(r.components)||!nutrition(r.nutrition)))throw Error();
      if(next.plans.some(p=>!validDate(p.date)||!(p.time===''||validTime(p.time))||!recipeIds.has(p.mealId)||!positive(p.servings)||p.servings>100))throw Error();
      const seen=new Map(),superseded=new Set();
      for(const r of next.revisions){
        if(!planIds.has(r.planId)||!validDate(r.date)||!(r.time===''||validTime(r.time))||typeof r.name!=='string'||!positive(r.servings)||r.servings>100||!nutrition(r.perServing)||!components(r.components)||!components(r.stockRequirements)||!components(r.stockPerServing)||typeof r.stockUsed!=='boolean'||!target(r.targetSnapshot))throw Error();
        if(r.supersedes!==undefined&&r.supersedes!==null){if(!seen.has(r.supersedes)||seen.get(r.supersedes).planId!==r.planId||superseded.has(r.supersedes))throw Error();superseded.add(r.supersedes);}
        seen.set(r.id,r);
      }
      const current=next.revisions.filter(r=>!superseded.has(r.id));if(new Set(current.map(r=>r.planId)).size!==current.length)throw Error();
      if(next.movements.some(m=>!foodIds.has(m.foodId)||!Number.isFinite(m.delta)||!validDate(m.date)||typeof m.kind!=='string'||(Object.prototype.hasOwnProperty.call(m,'observedGrams')&&(!['count','count-import'].includes(m.kind)||!mass(m.observedGrams)))))throw Error();
      const movementById=new Map();
      for(const m of next.movements){
        if(m.kind==='receipt-correction'){
          const anchor=movementById.get(m.effectiveAfterMovementId);
          if(!anchor||anchor.kind!=='purchase'||anchor.foodId!==m.foodId||anchor.date!==m.date||anchor.referenceId!==m.referenceId||anchor.lineId!==m.lineId||m.delta===0||!idOK(m.purchaseVersionId)||!idOK(m.lineId)||!idOK(m.referenceId))throw Error();
        }else if(Object.prototype.hasOwnProperty.call(m,'effectiveAfterMovementId'))throw Error();
        if(m.kind==='purchase-return'&&(m.delta>=0||!idOK(m.purchaseVersionId)||!idOK(m.lineId)||!idOK(m.referenceId)))throw Error();
        movementById.set(m.id,m);
      }
      if(next.purchases.some(p=>!foodIds.has(p.foodId)||!validDate(p.date)||!positive(p.grams)||!mass(p.totalPrice)||!priceConsistent(p)||typeof p.store!=='string'))throw Error();
      const priceById=new Map(),replacedPrices=new Set();
      for(const p of next.purchases){
        if(p.supersedes!==undefined&&p.supersedes!==null){
          const prior=priceById.get(p.supersedes);
          if(!prior||replacedPrices.has(prior.id)||prior.foodId!==p.foodId||prior.date!==p.date||prior.receiptId!==p.receiptId||prior.lineId!==p.lineId||!idOK(p.purchaseVersionId)||!idOK(p.lineId)||!idOK(p.receiptId))throw Error();
          replacedPrices.add(prior.id);
        }
        priceById.set(p.id,p);
      }
      if(!target(next.targets)||!next.yields||typeof next.yields!=='object'||Array.isArray(next.yields)||Object.entries(next.yields).some(([id,y])=>!foodIds.has(id)||!y||!foodIds.has(y.sourceId)||!positive(y.ratio)))throw Error();
      if(next.targetDays.some(e=>!Array.isArray(e)||e.length!==2||!validDate(e[0])||!target(e[1]))||new Set(next.targetDays.map(e=>e[0])).size!==next.targetDays.length)throw Error();
      if(next.receiptKeys.some(k=>typeof k!=='string')||new Set(next.receiptKeys).size!==next.receiptKeys.length)throw Error();
      if(next.directLogOperations.some(e=>!Array.isArray(e)||e.length!==2||!idOK(e[0])||!e[1]||typeof e[1].payload!=='string'||!current.some(r=>r.planId===e[1].planId))||new Set(next.directLogOperations.map(e=>e[0])).size!==next.directLogOperations.length)throw Error();
      if(options.validateOnly)return {ok:true};
      const replace=(to,from)=>{Object.keys(to).forEach(k=>delete to[k]);Object.entries(from).forEach(([k,v])=>Object.defineProperty(to,k,{value:v,writable:true,enumerable:true,configurable:true}));};
      foods.length=0;for(const row of next.foods)foods.push(row);recipes.length=0;for(const row of next.recipes)recipes.push(row);plans.length=0;for(const row of next.plans)plans.push(row);revisions.length=0;for(const row of next.revisions)revisions.push(row);movements.length=0;for(const row of next.movements)movements.push(row);purchases.length=0;for(const row of next.purchases)purchases.push(row);replace(yields,next.yields);replace(targets,next.targets);
      targetDays.clear();next.targetDays.forEach(([k,v])=>targetDays.set(k,v));receiptKeys.clear();next.receiptKeys.forEach(k=>receiptKeys.add(k));directLogOperations.clear();next.directLogOperations.forEach(([k,v])=>directLogOperations.set(k,v));
      return {ok:true};
    }catch(error){return {ok:false,error:'The saved food data is invalid. No food state was replaced.'};}
  }
  return {foods,recipes,plans,get logs(){return latestLogs();},get logVersions(){return revisions.slice();},yields,targets,movements,purchases,food,recipe,stock,requirements,day,shopping,prices,addPlan,updatePlan,removePlan,logMeal,logFood,correctLog,snapshot,restore,setStock,importStock,addReceipt,setTargets,setYield,saveRecipe};
})();

const WorkDemo = (() => {
      const ZONE = 'Europe/London';
      const minuteMs = 60000;
      const stampFormat = new Intl.DateTimeFormat('en-GB', {timeZone:ZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
      const versions = [];
      const contractVersions = [{effectiveWeek:'1970-01-05', minutes:2250, days:[1,2,3,4,5], recordedAt:null}];
      const frozenTargets = new Map();
      let running = null;


      function civil(timestamp) {
        const p = Object.fromEntries(stampFormat.formatToParts(timestamp).filter(x => x.type !== 'literal').map(x => [x.type,x.value]));
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
      }
      function validDate(date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
        const year = Number(date.slice(0,4));
        if (year < 1970 || year > 9998) return false;
        const timestamp = Date.parse(date+'T12:00:00Z');
        return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === date;
      }
      function parseCivil(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !validDate(value.slice(0,10))) return {ok:false,error:'Enter a valid date and time.'};
        const h = Number(value.slice(11,13)), m = Number(value.slice(14,16));
        if (h > 23 || m > 59) return {ok:false,error:'Enter a valid time.'};
        const assumed = Date.parse(value+':00Z');
        const candidates = [assumed, assumed-60*minuteMs].filter(t => civil(t) === value);
        if (!candidates.length) return {ok:false,error:'That local time does not exist when the clocks move forward in London. Choose a valid time.'};
        if (candidates.length > 1) return {ok:false,error:'That local time occurs twice when the clocks move back in London. Choose an unambiguous time outside the repeated hour.'};
        return {ok:true,timestamp:candidates[0]};
      }
      function now() { return Date.now(); }
      function civilNow() { return civil(now()); }
      function monday(date) {
        if (!validDate(date)) return null;
        const weekday = new Date(date+'T12:00:00Z').getUTCDay();
        return addDays(date,-((weekday+6)%7));
      }
      function latest() {
        const byRoot = new Map();
        versions.forEach(entry => byRoot.set(entry.id,entry));
        return [...byRoot.values()].sort((a,b) => a.startAt-b.startAt);
      }
      function currentTarget(weekStart) {
        if (frozenTargets.has(weekStart)) return frozenTargets.get(weekStart);
        let target = 2250;
        contractVersions.forEach(v => {if (v.effectiveWeek <= weekStart) target = v.minutes;});
        return target;
      }
      // Credited time off is separate from time worked. Records retain their original daily schedule.
      const absenceVersions = [];
      let calendarRegion = 'england-and-wales';
      // Official GOV.UK bank holidays, embedded from its public calendar. No runtime request.
      const bankHolidayCalendars = {"england-and-wales":{"name":"England and Wales","dates":[["2019-01-01","New Year’s Day"],["2019-04-19","Good Friday"],["2019-04-22","Easter Monday"],["2019-05-06","Early May bank holiday"],["2019-05-27","Spring bank holiday"],["2019-08-26","Summer bank holiday"],["2019-12-25","Christmas Day"],["2019-12-26","Boxing Day"],["2020-01-01","New Year’s Day"],["2020-04-10","Good Friday"],["2020-04-13","Easter Monday"],["2020-05-08","Early May bank holiday (VE day)"],["2020-05-25","Spring bank holiday"],["2020-08-31","Summer bank holiday"],["2020-12-25","Christmas Day"],["2020-12-28","Boxing Day"],["2021-01-01","New Year’s Day"],["2021-04-02","Good Friday"],["2021-04-05","Easter Monday"],["2021-05-03","Early May bank holiday"],["2021-05-31","Spring bank holiday"],["2021-08-30","Summer bank holiday"],["2021-12-27","Christmas Day"],["2021-12-28","Boxing Day"],["2022-01-03","New Year’s Day"],["2022-04-15","Good Friday"],["2022-04-18","Easter Monday"],["2022-05-02","Early May bank holiday"],["2022-06-02","Spring bank holiday"],["2022-06-03","Platinum Jubilee bank holiday"],["2022-08-29","Summer bank holiday"],["2022-09-19","Bank Holiday for the State Funeral of Queen Elizabeth II"],["2022-12-26","Boxing Day"],["2022-12-27","Christmas Day"],["2023-01-02","New Year’s Day"],["2023-04-07","Good Friday"],["2023-04-10","Easter Monday"],["2023-05-01","Early May bank holiday"],["2023-05-08","Bank holiday for the coronation of King Charles III"],["2023-05-29","Spring bank holiday"],["2023-08-28","Summer bank holiday"],["2023-12-25","Christmas Day"],["2023-12-26","Boxing Day"],["2024-01-01","New Year’s Day"],["2024-03-29","Good Friday"],["2024-04-01","Easter Monday"],["2024-05-06","Early May bank holiday"],["2024-05-27","Spring bank holiday"],["2024-08-26","Summer bank holiday"],["2024-12-25","Christmas Day"],["2024-12-26","Boxing Day"],["2025-01-01","New Year’s Day"],["2025-04-18","Good Friday"],["2025-04-21","Easter Monday"],["2025-05-05","Early May bank holiday"],["2025-05-26","Spring bank holiday"],["2025-08-25","Summer bank holiday"],["2025-12-25","Christmas Day"],["2025-12-26","Boxing Day"],["2026-01-01","New Year’s Day"],["2026-04-03","Good Friday"],["2026-04-06","Easter Monday"],["2026-05-04","Early May bank holiday"],["2026-05-25","Spring bank holiday"],["2026-08-31","Summer bank holiday"],["2026-12-25","Christmas Day"],["2026-12-28","Boxing Day"],["2027-01-01","New Year’s Day"],["2027-03-26","Good Friday"],["2027-03-29","Easter Monday"],["2027-05-03","Early May bank holiday"],["2027-05-31","Spring bank holiday"],["2027-08-30","Summer bank holiday"],["2027-12-27","Christmas Day"],["2027-12-28","Boxing Day"],["2028-01-03","New Year’s Day"],["2028-04-14","Good Friday"],["2028-04-17","Easter Monday"],["2028-05-01","Early May bank holiday"],["2028-05-29","Spring bank holiday"],["2028-08-28","Summer bank holiday"],["2028-12-25","Christmas Day"],["2028-12-26","Boxing Day"]]},"scotland":{"name":"Scotland","dates":[["2019-01-01","New Year’s Day"],["2019-01-02","2nd January"],["2019-04-19","Good Friday"],["2019-05-06","Early May bank holiday"],["2019-05-27","Spring bank holiday"],["2019-08-05","Summer bank holiday"],["2019-12-02","St Andrew’s Day"],["2019-12-25","Christmas Day"],["2019-12-26","Boxing Day"],["2020-01-01","New Year’s Day"],["2020-01-02","2nd January"],["2020-04-10","Good Friday"],["2020-05-08","Early May bank holiday (VE day)"],["2020-05-25","Spring bank holiday"],["2020-08-03","Summer bank holiday"],["2020-11-30","St Andrew’s Day"],["2020-12-25","Christmas Day"],["2020-12-28","Boxing Day"],["2021-01-01","New Year’s Day"],["2021-01-04","2nd January"],["2021-04-02","Good Friday"],["2021-05-03","Early May bank holiday"],["2021-05-31","Spring bank holiday"],["2021-08-02","Summer bank holiday"],["2021-11-30","St Andrew’s Day"],["2021-12-27","Christmas Day"],["2021-12-28","Boxing Day"],["2022-01-03","New Year’s Day"],["2022-01-04","2nd January"],["2022-04-15","Good Friday"],["2022-05-02","Early May bank holiday"],["2022-06-02","Spring bank holiday"],["2022-06-03","Platinum Jubilee bank holiday"],["2022-08-01","Summer bank holiday"],["2022-09-19","Bank Holiday for the State Funeral of Queen Elizabeth II"],["2022-11-30","St Andrew’s Day"],["2022-12-26","Boxing Day"],["2022-12-27","Christmas Day"],["2023-01-02","New Year’s Day"],["2023-01-03","2nd January"],["2023-04-07","Good Friday"],["2023-05-01","Early May bank holiday"],["2023-05-08","Bank holiday for the coronation of King Charles III"],["2023-05-29","Spring bank holiday"],["2023-08-07","Summer bank holiday"],["2023-11-30","St Andrew’s Day"],["2023-12-25","Christmas Day"],["2023-12-26","Boxing Day"],["2024-01-01","New Year’s Day"],["2024-01-02","2nd January"],["2024-03-29","Good Friday"],["2024-05-06","Early May bank holiday"],["2024-05-27","Spring bank holiday"],["2024-08-05","Summer bank holiday"],["2024-12-02","St Andrew’s Day"],["2024-12-25","Christmas Day"],["2024-12-26","Boxing Day"],["2025-01-01","New Year’s Day"],["2025-01-02","2nd January"],["2025-04-18","Good Friday"],["2025-05-05","Early May bank holiday"],["2025-05-26","Spring bank holiday"],["2025-08-04","Summer bank holiday"],["2025-12-01","St Andrew’s Day"],["2025-12-25","Christmas Day"],["2025-12-26","Boxing Day"],["2026-01-01","New Year’s Day"],["2026-01-02","2nd January"],["2026-04-03","Good Friday"],["2026-05-04","Early May bank holiday"],["2026-05-25","Spring bank holiday"],["2026-06-15","World Cup bank holiday"],["2026-08-03","Summer bank holiday"],["2026-11-30","St Andrew’s Day"],["2026-12-25","Christmas Day"],["2026-12-28","Boxing Day"],["2027-01-01","New Year’s Day"],["2027-01-04","2nd January"],["2027-03-26","Good Friday"],["2027-05-03","Early May bank holiday"],["2027-05-31","Spring bank holiday"],["2027-08-02","Summer bank holiday"],["2027-11-30","St Andrew’s Day"],["2027-12-27","Christmas Day"],["2027-12-28","Boxing Day"],["2028-01-03","New Year’s Day"],["2028-01-04","2nd January"],["2028-04-14","Good Friday"],["2028-05-01","Early May bank holiday"],["2028-05-29","Spring bank holiday"],["2028-08-07","Summer bank holiday"],["2028-11-30","St Andrew’s Day"],["2028-12-25","Christmas Day"],["2028-12-26","Boxing Day"]]},"northern-ireland":{"name":"Northern Ireland","dates":[["2019-01-01","New Year’s Day"],["2019-03-18","St Patrick’s Day"],["2019-04-19","Good Friday"],["2019-04-22","Easter Monday"],["2019-05-06","Early May bank holiday"],["2019-05-27","Spring bank holiday"],["2019-07-12","Battle of the Boyne (Orangemen’s Day)"],["2019-08-26","Summer bank holiday"],["2019-12-25","Christmas Day"],["2019-12-26","Boxing Day"],["2020-01-01","New Year’s Day"],["2020-03-17","St Patrick’s Day"],["2020-04-10","Good Friday"],["2020-04-13","Easter Monday"],["2020-05-08","Early May bank holiday (VE day)"],["2020-05-25","Spring bank holiday"],["2020-07-13","Battle of the Boyne (Orangemen’s Day)"],["2020-08-31","Summer bank holiday"],["2020-12-25","Christmas Day"],["2020-12-28","Boxing Day"],["2021-01-01","New Year’s Day"],["2021-03-17","St Patrick’s Day"],["2021-04-02","Good Friday"],["2021-04-05","Easter Monday"],["2021-05-03","Early May bank holiday"],["2021-05-31","Spring bank holiday"],["2021-07-12","Battle of the Boyne (Orangemen’s Day)"],["2021-08-30","Summer bank holiday"],["2021-12-27","Christmas Day"],["2021-12-28","Boxing Day"],["2022-01-03","New Year’s Day"],["2022-03-17","St Patrick’s Day"],["2022-04-15","Good Friday"],["2022-04-18","Easter Monday"],["2022-05-02","Early May bank holiday"],["2022-06-02","Spring bank holiday"],["2022-06-03","Platinum Jubilee bank holiday"],["2022-07-12","Battle of the Boyne (Orangemen’s Day)"],["2022-08-29","Summer bank holiday"],["2022-09-19","Bank Holiday for the State Funeral of Queen Elizabeth II"],["2022-12-26","Boxing Day"],["2022-12-27","Christmas Day"],["2023-01-02","New Year’s Day"],["2023-03-17","St Patrick’s Day"],["2023-04-07","Good Friday"],["2023-04-10","Easter Monday"],["2023-05-01","Early May bank holiday"],["2023-05-08","Bank holiday for the coronation of King Charles III"],["2023-05-29","Spring bank holiday"],["2023-07-12","Battle of the Boyne (Orangemen’s Day)"],["2023-08-28","Summer bank holiday"],["2023-12-25","Christmas Day"],["2023-12-26","Boxing Day"],["2024-01-01","New Year’s Day"],["2024-03-18","St Patrick’s Day"],["2024-03-29","Good Friday"],["2024-04-01","Easter Monday"],["2024-05-06","Early May bank holiday"],["2024-05-27","Spring bank holiday"],["2024-07-12","Battle of the Boyne (Orangemen’s Day)"],["2024-08-26","Summer bank holiday"],["2024-12-25","Christmas Day"],["2024-12-26","Boxing Day"],["2025-01-01","New Year’s Day"],["2025-03-17","St Patrick’s Day"],["2025-04-18","Good Friday"],["2025-04-21","Easter Monday"],["2025-05-05","Early May bank holiday"],["2025-05-26","Spring bank holiday"],["2025-07-14","Battle of the Boyne (Orangemen’s Day)"],["2025-08-25","Summer bank holiday"],["2025-12-25","Christmas Day"],["2025-12-26","Boxing Day"],["2026-01-01","New Year’s Day"],["2026-03-17","St Patrick’s Day"],["2026-04-03","Good Friday"],["2026-04-06","Easter Monday"],["2026-05-04","Early May bank holiday"],["2026-05-25","Spring bank holiday"],["2026-07-13","Battle of the Boyne (Orangemen’s Day)"],["2026-08-31","Summer bank holiday"],["2026-12-25","Christmas Day"],["2026-12-28","Boxing Day"],["2027-01-01","New Year’s Day"],["2027-03-17","St Patrick’s Day"],["2027-03-26","Good Friday"],["2027-03-29","Easter Monday"],["2027-05-03","Early May bank holiday"],["2027-05-31","Spring bank holiday"],["2027-07-12","Battle of the Boyne (Orangemen’s Day)"],["2027-08-30","Summer bank holiday"],["2027-12-27","Christmas Day"],["2027-12-28","Boxing Day"],["2028-01-03","New Year’s Day"],["2028-03-17","St Patrick’s Day"],["2028-04-14","Good Friday"],["2028-04-17","Easter Monday"],["2028-05-01","Early May bank holiday"],["2028-05-29","Spring bank holiday"],["2028-07-12","Battle of the Boyne (Orangemen’s Day)"],["2028-08-28","Summer bank holiday"],["2028-12-25","Christmas Day"],["2028-12-26","Boxing Day"]]}};
      const calendarRegions=[{effectiveDate:'1970-01-05',region:'england-and-wales',recordedAt:null}];
      const regionForDate=date=>{let region=calendarRegions[0].region;calendarRegions.forEach(r=>{if(r.effectiveDate<=date)region=r.region;});return region;};
      function calendarRows(from='2019-01-01',to='2028-12-31'){
        const overrides=new Set(latestAbsences(true).map(r=>r.calendarKey).filter(Boolean)),rows=[];
        Object.entries(bankHolidayCalendars).forEach(([region,calendar])=>calendar.dates.forEach(([date,title])=>{
          const key=region+':'+date;if(date<from||date>to||regionForDate(date)!==region||overrides.has(key))return;
          const minutes=schedule(date).minutes;
          rows.push({id:'calendar:'+key,type:'bank',start:date,end:date,mode:'full',customMinutes:null,offsetMinutes:0,days:[{date,scheduledMinutes:minutes,fromMinute:0,toMinute:minutes}],note:title,source:'calendar',calendarKey:key,cancelled:false,automaticCalendar:true});
        }));return rows.sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
      }
      function combinedAbsences(includeCancelled=false,from='1970-01-05',to='9998-12-31'){return latestAbsences(includeCancelled).filter(r=>r.start<=to&&r.end>=from&&(!r.calendarKey||r.calendarKey.startsWith(regionForDate(r.start)+':'))).concat(calendarRows(from,to));}
      function latestAbsences(includeCancelled=false) {
        const byId = new Map();
        absenceVersions.forEach(row => byId.set(row.id,row));
        return [...byId.values()].filter(row => includeCancelled || !row.cancelled).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
      }
      function schedule(date) {
        const weekStart=monday(date);
        if(!weekStart)return {minutes:0,days:[]};
        let days=[1,2,3,4,5];
        contractVersions.forEach(v=>{if(v.effectiveWeek<=weekStart&&v.days)days=v.days;});
        const weekday=new Date(date+'T12:00:00Z').getUTCDay();
        return {minutes:days.includes(weekday)?currentTarget(weekStart)/days.length:0,days:days.slice()};
      }
      function buildAbsence(patch,existing=null) {
        if(!patch||!['annual','sick','bank'].includes(patch.type))return {ok:false,error:'Choose annual leave, sickness or a bank holiday.'};
        if(!validDate(patch.start)||!validDate(patch.end)||patch.start<'1970-01-05'||patch.end<patch.start)return {ok:false,error:'Choose a valid date range, from 5 January 1970 onward.'};
        const span=Math.round((Date.parse(patch.end+'T12:00Z')-Date.parse(patch.start+'T12:00Z'))/86400000);
        if(span>365)return {ok:false,error:'Record at most 366 calendar days at a time.'};
        if(patch.type==='sick'&&patch.end>civilNow().slice(0,10))return {ok:false,error:'Sick days can be recorded up to today. Future time off can be planned as annual leave.'};
        const mode=patch.mode||'full';
        if(!['full','first-half','second-half','custom'].includes(mode))return {ok:false,error:'Choose a full day, half day or custom hours.'};
        const custom=Number(patch.customMinutes),offset=Number(patch.offsetMinutes||0);
        if(mode==='custom'&&(patch.customMinutes===''||patch.customMinutes===null||!Number.isFinite(custom)||custom<=0||custom>1440||!Number.isFinite(offset)||offset<0||offset+custom>1440))return {ok:false,error:'Enter positive custom hours and a valid starting offset within a 24-hour day.'};
        const days=[];
        for(let date=patch.start;date<=patch.end;date=addDays(date,1)) {
          const unchangedShape=existing&&existing.start===patch.start&&existing.end===patch.end&&existing.mode===mode&&existing.customMinutes===(mode==='custom'?custom:null)&&existing.offsetMinutes===(mode==='custom'?offset:0);
          const oldDay=unchangedShape?existing.days.find(d=>d.date===date):null;
          if(oldDay){days.push(clone(oldDay));continue;}
          const scheduledMinutes=schedule(date).minutes;
          const fromMinute=mode==='second-half'?scheduledMinutes/2:mode==='custom'?Math.min(offset,scheduledMinutes):0;
          const toMinute=mode==='first-half'?scheduledMinutes/2:mode==='custom'?Math.min(offset+custom,scheduledMinutes):scheduledMinutes;
          days.push({date,scheduledMinutes,fromMinute,toMinute});
        }
        const recordedAt=new Date(now()).toISOString();
        return {ok:true,entry:{id:existing?.id||uid('absence'),revision:(existing?.revision||0)+1,revisionId:uid('absence-revision'),type:patch.type,start:patch.start,end:patch.end,mode,customMinutes:mode==='custom'?custom:null,offsetMinutes:mode==='custom'?offset:0,days,note:String(patch.note||'').trim().slice(0,1000),source:existing?.source||patch.source||'manual',calendarKey:existing?.calendarKey||patch.calendarKey||null,cancelled:false,createdAt:existing?.createdAt||recordedAt,recordedAt,supersedes:existing?.revisionId||null}};
      }
      function addAbsence(patch) {
        const result=buildAbsence(patch);
        if(!result.ok)return result;
        const entry=result.entry;
        const duplicate=latestAbsences().find(r=>r.type===entry.type&&r.start===entry.start&&r.end===entry.end&&r.mode===entry.mode&&r.customMinutes===entry.customMinutes&&r.offsetMinutes===entry.offsetMinutes);
        if(duplicate)return {ok:false,error:'That time off is already recorded. Open the existing record to correct it.'};
        absenceVersions.push(clone(entry));
        return {ok:true,entry:clone(entry)};
      }
      function correctAbsence(id,patch) {
        const existing=latestAbsences().find(row=>row.id===id);
        if(!existing)return {ok:false,error:'That time-off record could not be found.'};
        const result=buildAbsence(patch,existing);
        if(!result.ok)return result;
        absenceVersions.push(clone(result.entry));
        return {ok:true,entry:clone(result.entry)};
      }
      function cancelAbsence(id,reason='user') {
        const existing=latestAbsences().find(row=>row.id===id);
        if(!existing)return {ok:false,error:'That time-off record is already cancelled or missing.'};
        const entry={...clone(existing),cancelled:true,cancelReason:reason,revision:existing.revision+1,revisionId:uid('absence-revision'),supersedes:existing.revisionId,recordedAt:new Date(now()).toISOString()};
        absenceVersions.push(entry);
        return {ok:true,entry:clone(entry)};
      }
      function dayAbsences(date) {
        const rows=combinedAbsences(false,date,date).map(row=>({...clone(row),day:clone(row.days.find(d=>d.date===date))}));
        const intervals=rows.map(r=>[r.day.fromMinute,r.day.toMinute]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
        let credit=0,end=0;
        intervals.forEach(([a,b])=>{credit+=Math.max(0,b-Math.max(end,a));end=Math.max(end,b);});
        const scheduledMinutes=schedule(date).minutes;
        return {date,rows,scheduledMinutes,creditMinutes:Math.min(scheduledMinutes,credit),expectedMinutes:Math.max(0,scheduledMinutes-credit)};
      }
      function refreshCalendarSchedule(effectiveWeek) {
        latestAbsences().filter(row=>row.source==='calendar'&&row.end>=effectiveWeek).forEach(row=>{
          const days=row.days.map(day=>{
            if(day.date<effectiveWeek)return clone(day);
            const scheduledMinutes=schedule(day.date).minutes;
            const fromMinute=row.mode==='second-half'?scheduledMinutes/2:row.mode==='custom'?Math.min(row.offsetMinutes,scheduledMinutes):0;
            const toMinute=row.mode==='first-half'?scheduledMinutes/2:row.mode==='custom'?Math.min(row.offsetMinutes+row.customMinutes,scheduledMinutes):scheduledMinutes;
            return {date:day.date,scheduledMinutes,fromMinute,toMinute};
          });
          if(JSON.stringify(days)===JSON.stringify(row.days))return;
          absenceVersions.push({...clone(row),days,revision:row.revision+1,revisionId:uid('absence-revision'),supersedes:row.revisionId,recordedAt:new Date(now()).toISOString(),revisionReason:'Working pattern changed for this week onward'});
        });
      }
      function applyCalendar(region) {
        if(!bankHolidayCalendars[region])return {ok:false,error:'Choose a bank-holiday region.'};
        const effectiveDate=monday(civilNow().slice(0,10));
        if(region!==regionForDate(effectiveDate))calendarRegions.push({effectiveDate,region,recordedAt:new Date(now()).toISOString()});
        calendarRegion=region;return {ok:true,added:0,cancelled:0,effectiveDate};
      }

      function findOverlap(startAt,endAt,excludeId,ignoreActive) {
        if (latest().some(entry => entry.id !== excludeId && startAt < entry.endAt && endAt > entry.startAt)) return 'This shift overlaps another recorded shift. Correct the existing shift instead.';
        if (!ignoreActive && running && startAt < now() && endAt > running.startAt) return 'This shift overlaps the running clock. Clock out first or choose a different time.';
        return null;
      }
      function makeEntry(patch,existing) {
        if (!patch || typeof patch !== 'object') return {ok:false,error:'Enter the shift details.'};
        const start = existing && patch.start === existing.start ? {ok:true,timestamp:existing.startAt} : parseCivil(patch.start);
        const end = existing && patch.end === existing.end ? {ok:true,timestamp:existing.endAt} : parseCivil(patch.end);
        if (!start.ok) return start;
        if (!end.ok) return end;
        const elapsed = (end.timestamp-start.timestamp)/minuteMs;
        const breaks = Number(patch.breakMinutes);
        if (elapsed <= 0) return {ok:false,error:'The end must be after the start. For an overnight shift, choose the next date.'};
        if (elapsed > 1440) return {ok:false,error:'A shift can span at most 24 hours. Split a longer entry into separate shifts.'};
        if (end.timestamp > now()) return {ok:false,error:'A finished shift cannot end in the future. Use the running clock for work in progress.'};
        if (patch.breakMinutes === '' || patch.breakMinutes === null || patch.breakMinutes === undefined || !Number.isFinite(breaks) || breaks < 0 || breaks > elapsed) return {ok:false,error:'Unpaid break minutes must be between zero and the full shift duration.'};
        const overlap = findOverlap(start.timestamp,end.timestamp,existing?.id,false);
        if (overlap) return {ok:false,error:overlap};
        const recordedAt = new Date(now()).toISOString();
        return {ok:true,entry:{id:existing?.id || uid('work'),revision:existing ? existing.revision+1 : 1,revisionId:uid('work-revision'),date:patch.start.slice(0,10),start:patch.start,end:patch.end,startAt:start.timestamp,endAt:end.timestamp,breakMinutes:breaks,minutes:elapsed-breaks,note:String(patch.note || '').trim().slice(0,2000),recordedAt,createdAt:existing?.createdAt || recordedAt,source:existing?.source || 'manual',supersedes:existing?.revisionId || null}};
      }
      function commit(entry) {
        versions.push(clone(entry));
        const weekStart = monday(entry.date);
        if (weekStart < monday(civilNow().slice(0,10)) && !frozenTargets.has(weekStart)) frozenTargets.set(weekStart,currentTarget(weekStart));
        return {ok:true,entry:clone(entry)};
      }
      function addEntry(patch) {
        const result = makeEntry(patch,null);
        return result.ok ? commit(result.entry) : result;
      }
      function correctEntry(id,patch) {
        const existing = latest().find(entry => entry.id === id);
        if (!existing) return {ok:false,error:'That shift could not be found.'};
        const result = makeEntry(patch,existing);
        if (!result.ok) return result;
        if (['start','end','breakMinutes','note'].every(key => result.entry[key] === existing[key])) return {ok:true,entry:clone(existing),unchanged:true};
        return commit(result.entry);
      }
      function previewActive() {
        if (!running) return null;
        const endAt = now();
        const completedBreakMs = running.breaks.reduce((sum,b) => sum+b.endAt-b.startAt,0);
        const breakMs = completedBreakMs+(running.breakStartedAt === null ? 0 : endAt-running.breakStartedAt);
        return {id:running.id,date:running.date,start:running.start,startAt:running.startAt,endAt,elapsedMinutes:(endAt-running.startAt)/minuteMs,breakMinutes:breakMs/minuteMs,minutes:Math.max(0,(endAt-running.startAt-breakMs)/minuteMs),onBreak:running.breakStartedAt !== null};
      }
      // Calendar slices of the running shift. Stored shift attribution is unchanged.
      function activeRange(from,to=from) {
        const empty={minutes:0,elapsedMinutes:0,breakMinutes:0,hasOverlap:false};
        if(!running||!validDate(from)||!validDate(to)||from>to)return empty;
        const first=parseCivil(from+'T00:00'),last=parseCivil(addDays(to,1)+'T00:00');
        if(!first.ok||!last.ok)return empty;
        const endAt=now(),start=Math.max(running.startAt,first.timestamp),end=Math.min(endAt,last.timestamp);
        if(end<=start)return empty;
        const breaks=running.breaks.concat(running.breakStartedAt===null?[]:[{startAt:running.breakStartedAt,endAt}]).map(b=>[Math.max(start,b.startAt),Math.min(end,b.endAt)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
        let breakMs=0,covered=start;
        breaks.forEach(([a,b])=>{breakMs+=Math.max(0,b-Math.max(a,covered));covered=Math.max(covered,b);});
        return {minutes:Math.max(0,(end-start-breakMs)/minuteMs),elapsedMinutes:(end-start)/minuteMs,breakMinutes:breakMs/minuteMs,hasOverlap:true,startAt:start,endAt:end,shiftId:running.id};
      }
      function clockIn() {
        if (running) return {ok:false,error:'The clock is already running.'};
        const timestamp = now();
        const overlapping = latest().some(entry => timestamp >= entry.startAt && timestamp < entry.endAt);
        if (overlapping) return {ok:false,error:'A recorded shift already covers this time.'};
        running = {id:uid('work'),date:civil(timestamp).slice(0,10),start:civil(timestamp),startAt:timestamp,breaks:[],breakStartedAt:null,note:''};
        return {ok:true,active:clone(running)};
      }
      function startBreak() {
        if (!running) return {ok:false,error:'Clock in before starting a break.'};
        if (running.breakStartedAt !== null) return {ok:false,error:'You are already on a break.'};
        if (now()-running.startAt > 1440*minuteMs) return {ok:false,error:'This clock has run for more than 24 hours. Add the actual shift manually after cancelling it.'};
        running.breakStartedAt = now();
        return {ok:true,active:clone(running)};
      }
      function endBreak() {
        if (!running || running.breakStartedAt === null) return {ok:false,error:'There is no active break to end.'};
        running.breaks.push({startAt:running.breakStartedAt,endAt:now()});
        running.breakStartedAt = null;
        return {ok:true,active:clone(running)};
      }
      function clockOut(options={}) {
        if (!running) return {ok:false,error:'There is no running clock to stop.'};
        const preview = previewActive();
        if (preview.elapsedMinutes <= 0) return {ok:false,error:'The clock has only just started.'};
        if (preview.elapsedMinutes > 1440) return {ok:false,error:'This clock has run for more than 24 hours. Cancel it and add the actual shift manually.'};
        const overlap = findOverlap(preview.startAt,preview.endAt,null,true);
        if (overlap) return {ok:false,error:overlap};
        const recordedAt = new Date(now()).toISOString();
        const entry = {id:running.id,revision:1,revisionId:uid('work-revision'),date:running.date,start:running.start,end:civil(preview.endAt),startAt:running.startAt,endAt:preview.endAt,breakMinutes:preview.breakMinutes,minutes:preview.minutes,note:String(options.note || running.note || '').trim().slice(0,2000),recordedAt,createdAt:recordedAt,source:'clock',supersedes:null,breaks:clone(running.breaks)};
        if (running.breakStartedAt !== null) entry.breaks.push({startAt:running.breakStartedAt,endAt:preview.endAt});
        running = null;
        return commit(entry);
      }
      function cancelClock() {
        if (!running) return {ok:false,error:'There is no running clock to cancel.'};
        running = null;
        return {ok:true};
      }
      function week(date) {
        const start = monday(date);
        if (!start) return null;
        const end = addDays(start,6);
        const entries = latest().filter(entry => entry.date >= start && entry.date <= end);
        const active = previewActive();
        const activeMinutes = active && active.date >= start && active.date <= end ? active.minutes : 0;
        const minutes = entries.reduce((sum,entry) => sum+entry.minutes,0);
        const baseTargetMinutes = currentTarget(start);
        const days=Array.from({length:7},(_,i)=>dayAbsences(addDays(start,i)));
        const absenceMinutes=Math.min(baseTargetMinutes,days.reduce((n,d)=>n+d.creditMinutes,0));
        const targetMinutes=Math.max(0,baseTargetMinutes-absenceMinutes);
        const hasWorkData = entries.length > 0 || Boolean(active && active.date >= start && active.date <= end);
        const hasData=hasWorkData||absenceMinutes>0;
        const isComplete = end < civilNow().slice(0,10);
        return {start,end,entries:clone(entries),minutes,activeMinutes,baseTargetMinutes,absenceMinutes,days,hasWorkData,targetMinutes,remainingMinutes:hasData ? Math.max(0,targetMinutes-minutes-activeMinutes) : null,overMinutes:hasData ? Math.max(0,minutes+activeMinutes-targetMinutes) : null,isComplete,hasData};
      }
      function weeks(from,to) {
        const start = monday(from), end = monday(to);
        if (!start || !end || start > end) return [];
        const output = [];
        for (let cursor=start;cursor<=end;cursor=addDays(cursor,7)) output.push(week(cursor));
        return output;
      }
      function setContract(value,workingDays=null) {
        const minutes = Number(value);
        if (value === '' || value === null || value === undefined || !Number.isFinite(minutes) || minutes <= 0 || minutes > 10080) return {ok:false,error:'Enter weekly contracted hours above zero and no more than 168.'};
        const days=workingDays===null?schedule(civilNow().slice(0,10)).days:workingDays;
        if(!Array.isArray(days)||!days.length||new Set(days).size!==days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))return {ok:false,error:'Choose at least one working day, with no duplicate days.'};
        if(minutes/days.length>1440)return {ok:false,error:'The working pattern would exceed 24 hours per scheduled day.'};
        const effectiveWeek = monday(civilNow().slice(0,10));
        contractVersions.push({effectiveWeek,minutes,days:days.slice(),recordedAt:new Date(now()).toISOString()});
        frozenTargets.delete(effectiveWeek);
        refreshCalendarSchedule(effectiveWeek);
        return {ok:true,minutes,effectiveWeek};
      }

      function snapshot(){return clone({version:1,versions,contractVersions,frozenTargets:[...frozenTargets],running,absenceVersions,calendarRegion,calendarRegions});}
      function restore(data,options={}){
        if(data==null)return {ok:true};
        try{
          const next=clone(data),idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
          if(!next||next.version!==1||!Array.isArray(next.versions)||!Array.isArray(next.contractVersions)||!next.contractVersions.length||!Array.isArray(next.frozenTargets)||!Array.isArray(next.absenceVersions)||!Object.prototype.hasOwnProperty.call(bankHolidayCalendars,next.calendarRegion))throw Error();
          const shift=r=>r&&idOK(r.id)&&validDate(r.date)&&typeof r.start==='string'&&r.start.slice(0,10)===r.date&&typeof r.end==='string'&&Number.isFinite(r.startAt)&&Number.isFinite(r.endAt)&&r.endAt>r.startAt&&(r.endAt-r.startAt)<=86400000&&Number.isFinite(r.breakMinutes)&&r.breakMinutes>=0&&Number.isFinite(r.minutes)&&r.minutes>=0&&Math.abs((r.endAt-r.startAt)/minuteMs-r.breakMinutes-r.minutes)<.00001;
          const regions=next.calendarRegions===undefined?[{effectiveDate:'1970-01-05',region:next.calendarRegion,recordedAt:null}]:next.calendarRegions;
          if(!Array.isArray(regions)||!regions.length||regions[0].effectiveDate!=='1970-01-05'||regions.some((r,i)=>!r||!validDate(r.effectiveDate)||monday(r.effectiveDate)!==r.effectiveDate||!Object.prototype.hasOwnProperty.call(bankHolidayCalendars,r.region)||(i&&r.effectiveDate<regions[i-1].effectiveDate))||regions[regions.length-1].region!==next.calendarRegion)throw Error();
          const seen=new Map();
          for(const r of next.versions){if(!shift(r)||!idOK(r.revisionId)||seen.has(r.revisionId)||!Number.isInteger(r.revision)||r.revision<1)throw Error();if(r.supersedes!==null&&(!seen.has(r.supersedes)||seen.get(r.supersedes).id!==r.id))throw Error();seen.set(r.revisionId,r);}
          if(next.contractVersions.some(v=>!validDate(v.effectiveWeek)||monday(v.effectiveWeek)!==v.effectiveWeek||!Number.isFinite(v.minutes)||v.minutes<=0||v.minutes>10080||!Array.isArray(v.days)||!v.days.length||new Set(v.days).size!==v.days.length||v.days.some(d=>!Number.isInteger(d)||d<0||d>6)||v.minutes/v.days.length>1440))throw Error();
          if(next.frozenTargets.some(e=>!Array.isArray(e)||e.length!==2||!validDate(e[0])||monday(e[0])!==e[0]||!Number.isFinite(e[1])||e[1]<=0)||new Set(next.frozenTargets.map(e=>e[0])).size!==next.frozenTargets.length)throw Error();
          const absenceIds=new Map();
          for(const r of next.absenceVersions){if(!r||!idOK(r.id)||!idOK(r.revisionId)||absenceIds.has(r.revisionId)||!validDate(r.start)||!validDate(r.end)||r.start>r.end||!['annual','sick','bank'].includes(r.type)||!Array.isArray(r.days)||r.days.some(d=>!validDate(d.date)||d.date<r.start||d.date>r.end||!Number.isFinite(d.scheduledMinutes)||d.scheduledMinutes<0||!Number.isFinite(d.fromMinute)||!Number.isFinite(d.toMinute)||d.fromMinute<0||d.toMinute<d.fromMinute||d.toMinute>d.scheduledMinutes))throw Error();if(r.supersedes!==null&&(!absenceIds.has(r.supersedes)||absenceIds.get(r.supersedes).id!==r.id))throw Error();absenceIds.set(r.revisionId,r);}
          const active=next.running;
          if(active!==null){if(!active||!idOK(active.id)||!validDate(active.date)||typeof active.start!=='string'||active.start.slice(0,10)!==active.date||!Number.isFinite(active.startAt)||!Array.isArray(active.breaks)||active.breaks.some(b=>!b||!Number.isFinite(b.startAt)||!Number.isFinite(b.endAt)||b.startAt<active.startAt||b.endAt<b.startAt)||!(active.breakStartedAt===null||Number.isFinite(active.breakStartedAt)&&active.breakStartedAt>=active.startAt))throw Error();}
          if(options.validateOnly)return {ok:true};
          versions.length=0;for(const row of next.versions)versions.push(row);contractVersions.length=0;for(const row of next.contractVersions)contractVersions.push(row);absenceVersions.length=0;for(const row of next.absenceVersions)absenceVersions.push(row);frozenTargets.clear();next.frozenTargets.forEach(([k,v])=>frozenTargets.set(k,v));running=active;calendarRegion=next.calendarRegion;calendarRegions.length=0;for(const row of regions)calendarRegions.push(row);
          return {ok:true};
        }catch(error){return {ok:false,error:'The saved work data is invalid. No work state was replaced.'};}
      }
      return {snapshot,restore,schedule,dayAbsences,addAbsence,correctAbsence,cancelAbsence,applyCalendar,get absences(){return clone(combinedAbsences());},get allAbsences(){return clone(combinedAbsences(true));},get absenceVersions(){return clone(absenceVersions);},get calendarRegionHistory(){return clone(calendarRegions);},get calendarCoverage(){return {from:'2019-01-01',through:'2028-12-31',source:'https://www.gov.uk/bank-holidays.json'};},get calendarRegion(){return calendarRegion;},get calendarName(){return bankHolidayCalendars[calendarRegion].name;},get calendars(){return Object.entries(bankHolidayCalendars).map(([id,c])=>({id,...clone(c)}));},zone:ZONE,now,civilNow,monday,week,weeks,activeRange,clockIn,startBreak,endBreak,clockOut,cancelClock,previewActive,addEntry,correctEntry,setContract,get active(){return running ? clone(running) : null;},get entries(){return clone(latest());},get entryVersions(){return clone(versions);},get contractHistory(){return clone(contractVersions);},get contractMinutes(){return currentTarget(monday(civilNow().slice(0,10)));}};
    })();

    const workView={leaveYear:TODAY.slice(0,4),leaveMonth:null,tab:'week',week:WorkDemo.monday(TODAY),day:TODAY,range:12,from:addDays(WorkDemo.monday(TODAY),-84),to:addDays(WorkDemo.monday(TODAY),-1)};
    const workDuration=value=>{const n=Math.max(0,Math.round(value));return Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m';};
    const workSigned=n=>(n<0?'−':n>0?'+':'')+workDuration(Math.abs(n));
    const workPeriodLabel=start=>dateLabel(start,{day:'numeric',month:'short'})+' to '+dateLabel(addDays(start,6),{day:'numeric',month:'short'});
    const workTime=value=>String(value).slice(11,16);
    const workMinute=value=>Number(workTime(value).slice(0,2))*60+Number(workTime(value).slice(3,5));
    function workResult(result,message){if(!result.ok){toast(result.error);return false;}if(message)toast(message);return true;}
    function workSections(){showDialog('Your life, connected','<p class="dialog-sub">Choose a section of your workspace.</p><div class="section-picker">'+nav.map(n=>'<button data-action="section-jump" data-route="'+n.id+'" '+(state.route===n.id?'aria-current="page"':'')+'>'+icon(n.id)+'<span>'+n.label+'</span></button>').join('')+'</div>');}
    function renderWork(){return '<div class="page-head work-head"><div><div class="kicker">'+icon('work')+'<span class="eyebrow">Work & your time</span></div><h1>Make your time count.</h1><p>A clear record of what work takes, and what is yours.</p></div><div class="row"><button class="button ghost" data-action="work-contract">'+icon('edit')+' Contract</button><button class="button ghost" data-action="work-absence-add">'+icon('calendar')+' Add time off</button><button class="button primary" data-action="work-add">'+icon('plus')+' Add a shift</button></div></div><div class="work-tabs" aria-label="Work sections">'+[['week','This week'],['history','Over time'],['leave','Time off']].map(([id,label])=>'<button data-action="work-tab" data-tab="'+id+'" aria-pressed="'+(workView.tab===id)+'">'+label+'</button>').join('')+'</div>'+(workView.tab==='week'?renderWorkWeek():workView.tab==='leave'?renderWorkLeave():renderWorkHistory());}
    function renderWorkLive(){const a=WorkDemo.previewActive();return '<section class="work-live"><div class="work-status '+(a&&a.onBreak?'paused':'')+'"><i></i>'+(a?(a.elapsedMinutes>1440?'Clock needs correcting':a.onBreak?'On an unpaid break':'Clocked in'):'Ready when you are')+'</div><div class="work-live-number" id="workLiveMinutes">'+(a?workDuration(a.minutes):'Off the clock.')+'</div><div class="work-live-label">'+(a?'Net work in this shift':'Your next shift starts with one tap.')+'</div>'+(a?'<div class="work-live-detail"><div><strong>'+workTime(a.start)+'</strong>Clocked in</div><div><strong id="workLiveBreak">'+workDuration(a.breakMinutes)+'</strong>Unpaid break</div><div><strong id="workLiveElapsed">'+workDuration(a.elapsedMinutes)+'</strong>Elapsed</div></div><div class="work-live-actions"><button class="button ghost" data-action="'+(a.onBreak?'work-resume':'work-break')+'">'+icon(a.onBreak?'play':'pause')+' '+(a.onBreak?'End break':'Take a break')+'</button><button class="button primary" data-action="work-out">Clock out '+icon('arrow')+'</button></div>':'<div class="work-live-actions gap-top"><button class="button primary" data-action="work-in">'+icon('play')+' Clock in</button></div>')+''+(a&&a.elapsedMinutes>1440?'<button class="text-button" data-action="work-recover">Correct a missed clock-out</button>':'')+'<p class="work-live-foot">Your clock: '+dateLabel(TODAY,{day:'numeric',month:'short',year:'numeric'})+' · Europe/London. It advances while this app is open. Your shift stays saved when you reopen the app.</p></section>';}
    function workWeekSummary(w){const total=w.minutes+w.activeMinutes;return '<div class="work-expected-equation"><span><small>Contract</small><strong>'+workDuration(w.baseTargetMinutes)+'</strong></span><b>−</b><span class="leave"><small>Time-off credit</small><strong>'+workDuration(w.absenceMinutes)+'</strong></span><b>=</b><span><small>Work expected</small><strong>'+workDuration(w.targetMinutes)+'</strong></span></div><div class="work-summary"><div><span class="eyebrow">'+(w.isComplete?'Actual work recorded':'Actual work so far')+'</span><strong id="workWeekTotal">'+workDuration(total)+'</strong><small id="workWeekClosed">'+workDuration(w.minutes)+' completed'+(w.activeMinutes?' + '+workDuration(w.activeMinutes)+' live':'')+'</small></div><div><span class="eyebrow" id="workWeekBalanceLabel">'+(Math.round(total)===w.targetMinutes?'At expected hours':total>w.targetMinutes?'Above expected hours':w.isComplete&&!w.hasWorkData&&w.targetMinutes>0?'Work expected':w.isComplete?'Below expected hours':'Work still expected')+'</span><strong id="workWeekBalance">'+workDuration(Math.abs(total-w.targetMinutes))+'</strong><small>'+(w.isComplete&&!w.hasWorkData&&w.targetMinutes>0?"No shifts recorded. This week's balance is unconfirmed.":workDuration(w.targetMinutes)+' expected after time off')+'</small></div></div><div class="work-contract-track" aria-label="Actual work compared with adjusted expected hours"><i id="workWeekLiveFill" class="work-live-fill" style="width:'+workCreditWidth(total,w.targetMinutes)+'%"></i><i id="workWeekClosedFill" style="width:'+workCreditWidth(w.minutes,w.targetMinutes)+'%"></i></div><div class="work-track-caption"><span>0 hours</span><span>'+workDuration(w.targetMinutes)+' expected · excess shown above</span></div>';}
    function renderWorkWeek(){const w=WorkDemo.week(workView.week),days=Array.from({length:7},(_,i)=>addDays(w.start,i));return '<div class="work-layout"><section>'+renderWorkLive()+'<div class="work-period"><div><span class="eyebrow">Monday to Sunday</span><h2>'+workPeriodLabel(w.start)+'</h2></div><div class="work-period-controls"><button class="icon-button" data-action="work-week-step" data-step="-1" aria-label="Previous work week" '+(w.start<='1970-01-05'?'disabled':'')+'>'+icon('chevron','flip-arrow')+'</button><button class="icon-button" data-action="work-week-step" data-step="1" aria-label="Next work week" '+(w.start>='9998-12-21'?'disabled':'')+'>'+icon('chevron')+'</button></div></div><div class="row between"><button class="text-button" data-action="work-pick-week">Choose a week '+icon('calendar')+'</button>'+(w.start!==WorkDemo.monday(TODAY)?'<button class="text-button" data-action="work-current">Current week</button>':'')+'</div>'+(w.hasData?workWeekSummary(w):'<div class="work-empty"><h3>No recorded shifts.</h3><p>This is an empty period, not a confirmed shortfall. Add a shift if work is missing.</p></div>')+'<div class="work-week-axis"><span>Day</span><span class="axis-times"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></span><span>Net work</span></div>'+days.map(d=>renderWorkDay(d,w)).join('')+'<div class="work-timeline-legend"><span><i></i>Completed shift</span><span><i class="live"></i>Live shift</span><span><i class="time-off"></i>Time-off credit</span></div><p class="work-note">Durations are shown to the nearest minute. Bands show clock-in to clock-out. Totals deduct only recorded unpaid breaks. An overnight shift belongs to its start date, including when it crosses a week boundary.</p></section><aside class="work-aside">'+renderWorkDayDetail()+'<section class="work-aside-section"><span class="eyebrow">The boundary you set</span><h2>'+workDuration(w.baseTargetMinutes)+'</h2><p class="work-note">Your weekly contract, before '+workDuration(w.absenceMinutes)+' of time-off credit. Expected work this week is '+workDuration(w.targetMinutes)+'.</p><button class="text-button" data-action="work-contract">Review contract '+icon('arrow')+'</button><p class="work-note">A recorded difference is a time comparison. Pay, annual-leave entitlement and time off in lieu are not calculated in this app.</p></section></aside></div>';}
    function renderWorkDay(date,w){const rows=w.entries.filter(e=>e.date===date),a=WorkDemo.previewActive(),live=a&&a.start.slice(0,10)===date?a:null,total=rows.reduce((n,e)=>n+e.minutes,0)+(live?live.minutes:0),off=WorkDemo.dayAbsences(date);const bands=rows.map(e=>({start:e.start,end:e.end,live:false}));if(live)bands.push({start:live.start,end:WorkDemo.civilNow(),live:true});return '<button class="work-day '+(off.rows.length?'has-leave':'')+'" data-work-day="'+date+'" data-action="work-day" data-date="'+date+'" aria-pressed="'+(workView.day===date)+'" aria-label="Work on '+dateLabel(date,{weekday:'long',day:'numeric',month:'long'})+': '+(bands.length?workDuration(total)+' actual work':'no recorded work')+(off.rows.length?', '+workDuration(off.creditMinutes)+' time-off credit':'')+'"><span class="work-day-date">'+dateLabel(date,{weekday:'short'})+'<small>'+dateLabel(date)+'</small></span><span class="work-day-visual"><span class="work-day-track">'+bands.map(e=>{const start=workMinute(e.start),overnight=e.end.slice(0,10)!==date,end=overnight?1440:workMinute(e.end);return '<i class="work-shift-band '+(e.live?'live ':'')+(overnight?'continues':'')+'" style="left:'+(start/1440*100)+'%;width:'+Math.max(.25,(end-start)/1440*100)+'%"></i>';}).join('')+'</span>'+(off.rows.length?'<span class="work-day-leave"><i style="width:'+workCreditWidth(off.creditMinutes,off.scheduledMinutes)+'%"></i><span>'+[...new Set(off.rows.map(r=>workAbsenceName(r.type)))].join(' + ')+' · '+workDuration(off.creditMinutes)+'</span></span>':'')+'</span><span class="work-day-total '+(live?'live':'')+'">'+(bands.length?workDuration(total):'·')+'<small>'+(live?'Live':bands.length?rows.length+' shift'+(rows.length===1?'':'s'):off.rows.length?'Time off':date>TODAY?'Upcoming':'No entry')+'</small></span></button>';}
    function renderWorkDayDetail(){const off=WorkDemo.dayAbsences(workView.day),entries=WorkDemo.entries.filter(e=>e.date===workView.day),a=WorkDemo.previewActive(),active=a&&a.start.slice(0,10)===workView.day;return '<section class="work-detail"><span class="eyebrow">Selected day</span><h2>'+dateLabel(workView.day,{weekday:'long',day:'numeric',month:'short'})+'</h2>'+(active?'<div class="work-entry"><h3>Current shift <span>Live</span></h3><p>Started '+workTime(a.start)+'. Use the live clock to take a break or finish.</p></div>':'')+entries.map(e=>'<article class="work-entry"><h3>'+workTime(e.start)+' to '+workTime(e.end)+(e.end.slice(0,10)!==e.date?' (+1 day)':'')+'<span>'+workDuration(e.minutes)+'</span></h3><p>'+workDuration((e.endAt-e.startAt)/60000)+' elapsed · '+workDuration(e.breakMinutes)+' unpaid break'+(e.note?'<br>'+esc(e.note):'')+'</p><div class="row wrap"><button class="text-button" data-action="work-edit" data-id="'+e.id+'">Correct shift '+icon('edit')+'</button><button class="text-button" data-action="work-revisions" data-id="'+e.id+'">Record history</button></div></article>').join('')+(!entries.length&&!active&&!off.rows.length?'<p class="work-note">No work recorded on this date. An empty day does not tell us whether you were off or have yet to log it.</p>':'')+(off.rows.length?'<div class="work-day-credit"><strong>'+workDuration(off.scheduledMinutes)+' scheduled − '+workDuration(off.creditMinutes)+' time off</strong><p>'+workDuration(off.expectedMinutes)+' work expected. Any logged shifts count separately.</p></div>'+renderWorkAbsenceList(off.rows):'')+'<div class="row wrap"><button class="text-button" data-action="work-add" data-date="'+workView.day+'">+ Add a shift</button><button class="text-button" data-action="work-absence-add" data-date="'+workView.day+'">+ Add time off</button></div></section>';}
    function workHistoryWeeks(){const start=WorkDemo.monday(workView.from),last=WorkDemo.monday(workView.to),result=[];for(let d=start;d<=last;d=addDays(d,7)){const w=WorkDemo.week(d);if(w.isComplete&&(w.hasWorkData||(w.hasData&&w.targetMinutes===0)))result.push(w);}return result;}
    function renderWorkHistory(){const weeks=workHistoryWeeks(),minutes=weeks.reduce((n,w)=>n+w.minutes,0),balance=weeks.reduce((n,w)=>n+w.minutes-w.targetMinutes,0),max=Math.ceil(Math.max(60,...weeks.map(w=>Math.abs(w.minutes-w.targetMinutes)))/60)*60;const chartWeeks=weeks.length>26?weeks.slice(-26):weeks;return '<div class="work-layout"><section><span class="eyebrow">A longer view</span><h2 style="font-size:36px">Where the hours go.</h2><div class="work-history-controls"><div class="period-switch" aria-label="Work history range">'+[[12,'12 weeks'],[26,'26 weeks'],[0,'All']].map(([n,label])=>'<button data-action="work-history-range" data-range="'+n+'" aria-pressed="'+(workView.range===n)+'">'+label+'</button>').join('')+'</div><label>From<input id="workHistoryFrom" type="date" min="1970-01-05" value="'+workView.from+'" max="'+workView.to+'"></label><label>Through<input id="workHistoryTo" type="date" value="'+workView.to+'" min="'+workView.from+'" max="'+TODAY+'"></label></div><p class="work-note">Whole weeks containing these dates are included. Completed weeks with work records or fully covered by time off count. Weeks with only partial time-off records and no shifts are excluded because the work record may be incomplete.</p><div class="work-history-summary"><div><span class="eyebrow">Recorded work</span><strong>'+workDuration(minutes)+'</strong><small>'+weeks.length+' weeks with entries</small></div><div><span class="eyebrow">Net difference to expected work</span><strong style="color:var('+(balance<0?'--amber':'--mint')+')">'+workSigned(balance)+'</strong><small>Surplus weeks minus short weeks</small></div></div>'+(weeks.length?'<div class="work-history-chart"><div class="work-history-y"><span style="top:0">+'+Math.ceil(max/60)+'h</span><span style="top:48%">0</span><span style="bottom:0">−'+Math.ceil(max/60)+'h</span></div><div class="work-history-plot" aria-label="Weekly difference from adjusted expected hours">'+chartWeeks.map(w=>{const delta=w.minutes-w.targetMinutes;return '<button class="work-history-bar '+(delta<0?'negative':'')+'" data-action="work-open-week" data-week="'+w.start+'" aria-label="Week '+workPeriodLabel(w.start)+': '+workSigned(delta)+' versus adjusted expected hours. Open week."><i style="height:'+Math.max(.6,Math.abs(delta)/max*50)+'%;'+(delta>=0?'bottom:50%':'top:50%')+'"></i></button>';}).join('')+'</div></div><div class="work-history-axis"><span>'+dateLabel(chartWeeks[0].start)+'</span><span>'+dateLabel(chartWeeks[chartWeeks.length-1].start)+'</span></div><p class="work-note">Blue is above expected work after time off. Amber is below. Select a week to see its shifts.'+(weeks.length>26?' The chart shows the latest 26 recorded weeks; the totals and list include the full selected range.':'')+'</p>':'<div class="work-empty"><h3>No recorded weeks in this range.</h3><p>Choose other dates or add the missing shifts.</p></div>')+'<h2 class="gap-top" style="font-size:27px">The weeks behind the picture</h2>'+weeks.slice().reverse().map(w=>{const delta=w.minutes-w.targetMinutes;return '<button class="work-week-record" data-action="work-open-week" data-week="'+w.start+'"><span><strong>'+workPeriodLabel(w.start)+'</strong><small>'+workDuration(w.minutes)+' worked · '+workDuration(w.targetMinutes)+' expected · '+workDuration(w.absenceMinutes)+' time off</small></span><span class="delta '+(delta<0?'negative':'')+'">'+workSigned(delta)+'</span></button>';}).join('')+'</section><aside class="work-aside"><section class="work-aside-section"><span class="eyebrow">Time adds up</span><h2>Your record, over years.</h2><p class="work-note">Every shift contributes to its week. Open a bar to move from the overall pattern to the exact clock times and breaks.</p><div class="work-entry"><h3>'+weeks.filter(w=>w.minutes>w.targetMinutes).length+' weeks above expected hours</h3><p>'+weeks.filter(w=>w.minutes<w.targetMinutes).length+' below · '+weeks.filter(w=>w.minutes===w.targetMinutes).length+' at expected hours, in recorded weeks.</p></div><p class="work-note">Each week retains its contract. Time-off records adjust expected hours, never actual work. Future contract changes do not rewrite past targets.</p></section><section class="work-aside-section"><span class="eyebrow">Keep the account honest</span><h2>Breaks belong here too.</h2><p class="work-note">Only unpaid breaks reduce work time. Paid breaks stay included. Correct missed clock times or breaks in the shift record; earlier versions remain available.</p><button class="text-button" data-action="work-add">Add a missing shift '+icon('arrow')+'</button></section></aside></div>';}
    function workEntryDialog(id=null,date=null){const e=id?WorkDemo.entries.find(x=>x.id===id):null,d=(date||workView.day)>TODAY?TODAY:(date||workView.day);showDialog(e?'Correct a shift':'Add a shift','<form id="workEntryForm" data-id="'+(e?e.id:'')+'"><p class="dialog-sub">Record actual clock times and unpaid breaks. Use the following date for an overnight finish. Times are Europe/London.</p><div class="work-form-grid"><label>Clock-in date<input id="workStartDate" type="date" min="1970-01-05" max="'+TODAY+'" value="'+(e?e.start.slice(0,10):d)+'" required></label><label>Clock-in time<input id="workStartTime" type="time" value="'+(e?workTime(e.start):'09:00')+'" required></label><label>Clock-out date<input id="workEndDate" type="date" min="1970-01-05" max="'+TODAY+'" value="'+(e?e.end.slice(0,10):d)+'" required></label><label>Clock-out time<input id="workEndTime" type="time" value="'+(e?workTime(e.end):'17:00')+'" required></label></div><label>Unpaid break, minutes<input id="workBreakInput" type="number" min="0" max="1440" step="any" value="'+(e?Math.round(e.breakMinutes):0)+'" required inputmode="numeric"></label><p class="work-note">Paid breaks stay in your work total. Nothing is deducted automatically.</p><label>Note, optional<input id="workNoteInput" maxlength="300" value="'+esc(e?e.note||'':'')+'" placeholder="Project, location or a reason for the correction"></label>'+(e?'<p class="work-form-result">Saving creates a corrected version. The original clock times and break record remain in the history.</p>':'')+'<div id="workEntryError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(e?'Save correction':'Save shift')+'</button></div></form>');}
    function workContractDialog(){showDialog('Your weekly contract','<form id="workContractForm"><p class="dialog-sub">Your contract is currently '+workDuration(WorkDemo.contractMinutes)+' per week. Breaks are entered separately for each shift.</p><label>Contract hours per week<input id="workContractHours" type="number" min="1" max="168" step="0.25" value="'+(WorkDemo.contractMinutes/60)+'" required inputmode="decimal"></label><fieldset class="work-pattern"><legend>Scheduled working days</legend>'+[[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']].map(([day,label])=>'<label><input type="checkbox" name="workDay" value="'+day+'" '+(WorkDemo.schedule(TODAY).days.includes(day)?'checked':'')+'>'+label+'</label>').join('')+'</fieldset><p class="work-note">Hours are spread equally across these days. Use custom time-off hours for exceptions.</p><p class="work-form-result">Changes apply to this week and future weeks. Completed weeks retain their pattern and target. Calendar holidays update to the new schedule and retain a revision. Manually recorded leave retains its approved hours; correct that leave separately if needed.</p><div id="workContractError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save contract</button></div></form>');}
    function workRevisions(id){const rows=WorkDemo.entryVersions.filter(e=>e.id===id).slice().reverse();showDialog('Shift record history','<p class="dialog-sub">The newest version is used in totals. Earlier versions remain as the record of what changed.</p>'+rows.map((e,i)=>'<div class="work-revision"><strong>'+(i===0?'Current record':'Earlier record')+'</strong><br>'+dateLabel(e.start.slice(0,10),{day:'numeric',month:'short',year:'numeric'})+' · '+workTime(e.start)+' to '+dateLabel(e.end.slice(0,10))+' '+workTime(e.end)+'<br>'+workDuration(e.minutes)+' net · '+workDuration(e.breakMinutes)+' unpaid break'+(e.note?'<br>'+esc(e.note):'')+'</div>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    const workAbsenceName=type=>({annual:'Annual leave',sick:'Sick day',bank:'Bank holiday'}[type]||'Time off');
    const workAbsenceAmount=row=>row.days.reduce((n,d)=>n+d.toMinute-d.fromMinute,0);
    const workCreditWidth=(value,target)=>target>0?Math.min(100,value/target*100):value>0?100:0;
    function renderWorkCancelled(){const rows=WorkDemo.allAbsences.filter(r=>r.cancelled&&r.start.slice(0,4)<=workView.leaveYear&&r.end.slice(0,4)>=workView.leaveYear);return rows.length?'<details class="work-cancelled"><summary>Cancelled records ('+rows.length+')</summary>'+rows.map(r=>'<div class="work-revision">'+workAbsenceName(r.type)+' · '+dateLabel(r.start,{day:'numeric',month:'short',year:'numeric'})+(r.note?' · '+esc(r.note):'')+'<br><button class="text-button" data-action="work-absence-history" data-id="'+r.id+'">View retained record</button></div>').join('')+'</details>':'';}
    function renderWorkLeave(){const all=WorkDemo.absences,rows=all.filter(r=>r.start<=workView.leaveYear+'-12-31'&&r.end>=workView.leaveYear+'-01-01'),yearStart=workView.leaveYear==='1970'?'1970-01-05':workView.leaveYear+'-01-01',yearEnd=workView.leaveYear+'-12-31';const credited=rows.length?WorkDemo.weeks(yearStart,yearEnd).reduce((n,w)=>n+w.days.filter(d=>d.date>=yearStart&&d.date<=yearEnd).reduce((s,d)=>s+d.creditMinutes,0),0):0;return '<div class="work-layout"><section><div class="row between wrap"><div><span class="eyebrow">Room for life</span><h2 style="font-size:36px">Time away counts too.</h2></div><label>Year<input id="workLeaveYear" type="number" min="1970" max="9998" value="'+workView.leaveYear+'" class="work-year-input"></label></div><div class="work-leave-orbit"><div><span class="eyebrow">Expected work reduced by</span><strong>'+workDuration(credited)+'</strong><p>Scheduled time off in '+workView.leaveYear+'.<br>Actual work is always recorded separately.</p></div><div class="work-leave-key"><span><i class="annual"></i>Annual leave</span><span><i class="bank"></i>Bank holidays</span><span><i class="sick"></i>Sick days</span></div></div><div class="work-month-grid" aria-label="Time off through the year">'+Array.from({length:12},(_,i)=>{const month=workView.leaveYear+'-'+String(i+1).padStart(2,'0'),events=rows.filter(r=>r.start.slice(0,7)<=month&&r.end.slice(0,7)>=month);return '<button data-action="work-leave-month" data-month="'+month+'" aria-label="'+dateLabel(month+'-01',{month:'long',year:'numeric'})+', '+events.length+' time-off records"><span>'+dateLabel(month+'-01',{month:'short'})+'</span><div>'+['annual','bank','sick'].map(type=>'<i class="'+type+(events.some(r=>r.type===type)?' visible':'')+'"></i>').join('')+'</div></button>';}).join('')+'</div><div class="row between wrap gap-top"><h2 style="font-size:26px">'+(workView.leaveMonth?dateLabel(workView.leaveMonth+'-01',{month:'long',year:'numeric'}):'Your time-off record')+'</h2>'+(workView.leaveMonth?'<button class="text-button" data-action="work-leave-all">Show whole year</button>':'')+'</div>'+renderWorkAbsenceList(rows.filter(r=>!workView.leaveMonth||(r.start.slice(0,7)<=workView.leaveMonth&&r.end.slice(0,7)>=workView.leaveMonth)))+renderWorkCancelled()+'</section><aside class="work-aside"><section class="work-aside-section"><span class="eyebrow">Your calendar</span><h2>'+esc(WorkDemo.calendarName)+'</h2><p class="work-note">Bank holidays from 2019 to 2028 are included locally. They reduce expected hours only on your scheduled working days.</p><button class="text-button" data-action="work-calendar">Review bank holidays '+icon('calendar')+'</button><p class="work-note">Official GOV.UK dates are included through 31 December 2028. Other years and employer-specific days can be added manually. No calendar data is fetched while you use the app.</p></section><section class="work-aside-section"><span class="eyebrow">Keep the distinction</span><h2>Time off is not time worked.</h2><p class="work-note">Your '+workDuration(WorkDemo.contractMinutes)+' contract remains the baseline. Approved leave and sick days reduce the work expected that week. If you work on a bank holiday, those hours still count as actual work.</p><p class="work-note">Overlapping time off is credited once. First-half and second-half records can together cover a full scheduled day. This is a time record, not a calculation of pay or annual-leave entitlement.</p></section></aside></div>';}
    function renderWorkAbsenceList(rows){return rows.length?rows.slice().sort((a,b)=>b.start.localeCompare(a.start)).map(r=>'<article class="work-leave-record '+r.type+'"><div class="work-leave-marker"></div><div><span class="eyebrow">'+workAbsenceName(r.type)+' · '+(r.automaticCalendar?'Calendar':r.start>TODAY?'Planned':r.end<TODAY?'Recorded':'Current')+'</span><h3>'+dateLabel(r.start,{day:'numeric',month:'short'})+(r.end!==r.start?' to '+dateLabel(r.end,{day:'numeric',month:'short'}):'')+'</h3><p>'+workDuration(workAbsenceAmount(r))+' scheduled time'+(r.note?' · '+esc(r.note):'')+'</p><div class="row wrap"><button class="text-button" data-action="work-absence-edit" data-id="'+r.id+'">Review or correct</button>'+(!r.automaticCalendar?'<button class="text-button" data-action="work-absence-history" data-id="'+r.id+'">Record history</button>':'')+'</div></div></article>').join(''):'<div class="work-empty"><h3>No time off recorded here.</h3><p>Add annual leave, a sick day or a bank holiday to show why less work was expected.</p><button class="text-button" data-action="work-absence-add">+ Add time off</button></div>';}
    function workAbsenceDialog(id=null,date=null){const row=id?WorkDemo.absences.find(r=>r.id===id):null,d=date||workView.day;if(row?.automaticCalendar){showDialog(row.note,'<p class="dialog-sub">'+dateLabel(row.start,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</p><p class="work-note">This official bank holiday reduces expected work by '+workDuration(workAbsenceAmount(row))+' on your scheduled working day. It is a calendar entry, not a recorded absence. Any work you log remains separate.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button><button class="button primary" data-action="work-calendar">Calendar settings</button></div>');return;}showDialog(row?'Review time off':'Add time off','<form id="workAbsenceForm" data-id="'+(row?row.id:'')+'"><p class="dialog-sub">Use approved annual leave, bank holidays or actual sick days. These reduce expected work, without adding hours to your work log.</p><label>Type<select id="workAbsenceType">'+[['annual','Annual leave'],['sick','Sick day'],['bank','Bank holiday']].map(([v,label])=>'<option value="'+v+'" '+(row?.type===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div class="work-form-grid"><label>First date<input id="workAbsenceStart" type="date" min="1970-01-05" max="9998-12-31" required value="'+(row?row.start:d)+'"></label><label>Last date<input id="workAbsenceEnd" type="date" min="1970-01-05" max="9998-12-31" required value="'+(row?row.end:d)+'"></label></div><label>Time off on each scheduled day<select id="workAbsenceMode">'+[['full','Full scheduled day'],['first-half','First half of the scheduled day'],['second-half','Second half of the scheduled day'],['custom','Custom scheduled hours']].map(([v,label])=>'<option value="'+v+'" '+(row?.mode===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div id="workAbsenceCustom" '+(row?.mode==='custom'?'':'hidden')+'><div class="work-form-grid"><label>Hours off per day<input id="workAbsenceHours" type="number" min="0.01" max="24" step="any" value="'+(row?.customMinutes?row.customMinutes/60:2)+'" inputmode="decimal"></label><label>After scheduled hours<input id="workAbsenceOffset" type="number" min="0" max="24" step="any" value="'+((row?.offsetMinutes||0)/60)+'" inputmode="decimal"></label></div><p class="work-note">For 2 hours at the start, use 2 hours off after 0 hours. For 2 hours after working 3 hours, use 2 after 3. Credit is capped at the scheduled day.</p></div><div class="work-form-result" id="workAbsencePreview">Full and half days use your working pattern. Non-working days in a range receive no credit. Overlapping periods count once.</div><label>Note, optional<input id="workAbsenceNote" maxlength="300" value="'+esc(row?.note||'')+'" placeholder="Holiday plans or useful context"></label><div class="error" id="workAbsenceError" role="alert"></div><div class="dialog-footer">'+(row?'<button type="button" class="text-button" data-action="work-absence-cancel-review" data-id="'+row.id+'">Cancel this time off</button>':'')+'<button type="button" class="button ghost" data-action="close-dialog">Close</button><button type="submit" class="button primary">'+(row?'Save correction':'Add time off')+'</button></div></form>');}
    function workAbsenceHistory(id){const rows=WorkDemo.absenceVersions.filter(r=>r.id===id).slice().reverse();showDialog('Time-off record history','<p class="dialog-sub">Corrections and cancellations retain every earlier version. The newest version is used in expected-hours calculations.</p>'+rows.map((r,i)=>'<div class="work-revision"><strong>'+(i===0?'Current version':'Earlier version')+(r.cancelled?' · Cancelled':'')+'</strong><br>'+workAbsenceName(r.type)+' · '+dateLabel(r.start,{day:'numeric',month:'short',year:'numeric'})+(r.start!==r.end?' to '+dateLabel(r.end):'')+'<br>'+workDuration(workAbsenceAmount(r))+' scheduled time · '+esc(r.mode.replaceAll('-',' '))+(r.note?'<br>'+esc(r.note):'')+'</div>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function workCalendarDialog(){showDialog('Bank holidays, on your terms','<form id="workCalendarForm"><p class="dialog-sub">'+esc(WorkDemo.calendarName)+' is enabled. Official dates from 2019 through 2028 are stored on this device, with no connection to an external service.</p><label>Calendar region<select id="workCalendarRegion">'+WorkDemo.calendars.map(c=>'<option value="'+c.id+'" '+(WorkDemo.calendarRegion===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label><div id="workCalendarDates">'+workCalendarDates(WorkDemo.calendarRegion)+'</div><p class="work-form-result">Each bank holiday reduces the work expected on that scheduled day. Overlapping annual leave or sickness is counted once. A region change takes effect from the current week; earlier weeks keep their previous region. Bank holidays are calculated from the calendar and do not create absence records. Saved individual overrides are retained.</p><div class="error" id="workCalendarError" role="alert"></div><div class="dialog-footer"><button class="button ghost" type="button" data-action="close-dialog">Close</button><button class="button primary" type="submit">Save calendar region</button></div></form>');}
    function workCalendarDates(region){const calendar=WorkDemo.calendars.find(c=>c.id===region),year=workView.leaveYear||TODAY.slice(0,4),dates=calendar.dates.filter(([date])=>date.slice(0,4)===year);return '<div class="work-calendar-dates">'+dates.map(([date,name])=>'<div><strong>'+dateLabel(date,{day:'numeric',month:'short',year:'numeric'})+'</strong><span>'+esc(name)+'</span></div>').join('')+'</div><p class="work-note">'+(dates.length?'Showing '+year+'. ':'No bundled bank-holiday dates for '+year+'. ')+'Source: official GOV.UK bank-holidays calendar. Included from 2019 through 31 December 2028. Dates outside that range can be entered manually.</p>';}
    function handleWorkAbsenceAction(a,d){
      if(a==='work-absence-add'){workAbsenceDialog(null,d.date||workView.day);return true;}
      if(a==='work-absence-edit'){workAbsenceDialog(d.id);return true;}
      if(a==='work-absence-history'){workAbsenceHistory(d.id);return true;}
      if(a==='work-absence-cancel-review'){showDialog('Cancel this time off?','<p class="dialog-sub">Its expected-hours credit will be removed. The earlier record stays in the history. Any other time off on those dates continues to count.</p><div class="dialog-footer"><button class="button ghost" data-action="work-absence-edit" data-id="'+d.id+'">Keep time off</button><button class="button primary" data-action="work-absence-cancel" data-id="'+d.id+'">Cancel time off</button></div>');return true;}
      if(a==='work-absence-cancel'){if(workResult(WorkDemo.cancelAbsence(d.id),'Time off cancelled. Expected hours updated.')){closeDialog();render();}return true;}
      if(a==='work-calendar'){workCalendarDialog();return true;}
      if(a==='work-leave-month'){workView.leaveMonth=d.month;render();return true;}
      if(a==='work-leave-all'){workView.leaveMonth=null;render();return true;}
      return false;
    }
    document.addEventListener('submit',event=>{const form=event.target;if(!['workAbsenceForm','workCalendarForm'].includes(form.id))return;event.preventDefault();let result;
      if(form.id==='workCalendarForm'){result=WorkDemo.applyCalendar($('workCalendarRegion').value);if(!result.ok){$('workCalendarError').textContent=result.error;return;}closeDialog();render();toast('Calendar region saved from '+dateLabel(result.effectiveDate)+'. Earlier weeks are retained.');return;}
      const patch={type:$('workAbsenceType').value,start:$('workAbsenceStart').value,end:$('workAbsenceEnd').value,mode:$('workAbsenceMode').value,customMinutes:$('workAbsenceHours').value===''?'':Number($('workAbsenceHours').value)*60,offsetMinutes:Number($('workAbsenceOffset').value)*60,note:$('workAbsenceNote').value};
      result=form.dataset.id?WorkDemo.correctAbsence(form.dataset.id,patch):WorkDemo.addAbsence(patch);if(!result.ok){$('workAbsenceError').textContent=result.error;return;}workView.week=WorkDemo.monday(patch.start);workView.day=patch.start;workView.leaveYear=patch.start.slice(0,4);workView.leaveMonth=null;workView.tab='week';closeDialog();render();toast('Time off saved. Expected hours updated; actual work is unchanged.');
    });
    document.addEventListener('change',event=>{if(event.target.id==='workAbsenceMode')$('workAbsenceCustom').hidden=event.target.value!=='custom';if(event.target.id==='workCalendarRegion')$('workCalendarDates').innerHTML=workCalendarDates(event.target.value);if(event.target.id==='workLeaveYear'){const year=Number(event.target.value);if(!Number.isInteger(year)||year<1970||year>9998){toast('Choose a year from 1970 to 9998.');event.target.value=workView.leaveYear;return;}workView.leaveYear=String(year);workView.leaveMonth=null;render();}});

    function handleWorkAction(a,d){if(handleWorkAbsenceAction(a,d))return;let result;
      if(a==='work-recover'){showDialog('Correct a missed clock-out','<p class="dialog-sub">This running clock has exceeded 24 hours. Discard this uncompleted clock, then enter the actual shift times. Your completed shifts stay in the history.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Keep clock</button><button class="button primary" data-action="work-discard-clock">Discard and enter times</button></div>');return;}
      if(a==='work-discard-clock'){const start=WorkDemo.previewActive()?.start.slice(0,10)||TODAY;if(workResult(WorkDemo.cancelClock())){closeDialog();render();workEntryDialog(null,start);}return;}
      if(a==='work-tab'){workView.tab=d.tab;render();return;}
      if(a==='work-add'){workEntryDialog(null,d.date||workView.day);return;}
      if(a==='work-edit'){workEntryDialog(d.id);return;}
      if(a==='work-revisions'){workRevisions(d.id);return;}
      if(a==='work-contract'){workContractDialog();return;}
      if(a==='work-day'){workView.day=d.date;render();if(window.matchMedia('(max-width:600px)').matches)document.querySelector('.work-detail').scrollIntoView({block:'start',behavior:'auto'});return;}
      if(a==='work-week-step'){workView.week=addDays(workView.week,Number(d.step)*7);if(workView.week<'1970-01-05')workView.week='1970-01-05';workView.day=workView.week;render();return;}
      if(a==='work-current'){workView.week=WorkDemo.monday(TODAY);workView.day=TODAY;render();return;}
      if(a==='work-open-week'){workView.week=d.week;workView.day=d.week;workView.tab='week';render();window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='work-pick-week'){showDialog('Go to a week','<form id="workWeekForm"><label>Choose any date in the week<input id="workWeekDate" type="date" min="1970-01-05" max="9998-12-31" value="'+workView.week+'" required></label><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Open week</button></div></form>');return;}
      if(a==='work-history-range'){workView.range=Number(d.range);workView.to=addDays(WorkDemo.monday(TODAY),-1);workView.from=workView.range?addDays(WorkDemo.monday(TODAY),-7*workView.range):[...WorkDemo.entries.map(e=>e.date),...WorkDemo.absences.map(e=>e.start)].sort()[0]||TODAY;render();return;}
      if(a==='work-in')result=WorkDemo.clockIn();
      if(a==='work-break')result=WorkDemo.startBreak();
      if(a==='work-resume')result=WorkDemo.endBreak();
      if(a==='work-out')result=WorkDemo.clockOut();
      if(result&&workResult(result,a==='work-out'?'Shift saved. Weekly totals updated.':a==='work-in'?'Clocked in.':a==='work-break'?'Unpaid break started.':'Back on the clock.')){workView.week=WorkDemo.monday(TODAY);workView.day=TODAY;render();}
    }
    function updateWorkLive(){if(state.route!=='work'||workView.tab!=='week')return;const a=WorkDemo.previewActive();if(a&&a.elapsedMinutes>1440&&!document.querySelector('[data-action="work-recover"]')&&!$('dialog').open){render();return;}if(a&&$('workLiveMinutes')){$('workLiveMinutes').textContent=workDuration(a.minutes);$('workLiveBreak').textContent=workDuration(a.breakMinutes);$('workLiveElapsed').textContent=workDuration(a.elapsedMinutes);}const w=WorkDemo.week(workView.week),total=w.minutes+w.activeMinutes;if($('workWeekTotal')){$('workWeekTotal').textContent=workDuration(total);$('workWeekClosed').textContent=workDuration(w.minutes)+' completed'+(w.activeMinutes?' + '+workDuration(w.activeMinutes)+' live':'');$('workWeekBalance').textContent=workDuration(Math.abs(total-w.targetMinutes));$('workWeekBalanceLabel').textContent=Math.round(total)===w.targetMinutes?'At expected hours':total>w.targetMinutes?'Above expected hours':w.isComplete&&!w.hasWorkData&&w.targetMinutes>0?'Work expected':w.isComplete?'Below expected hours':'Work still expected';$('workWeekLiveFill').style.width=workCreditWidth(total,w.targetMinutes)+'%';}if(a){const row=document.querySelector('[data-work-day="'+a.start.slice(0,10)+'"]');if(row){const closed=w.entries.filter(e=>e.date===a.start.slice(0,10)).reduce((n,e)=>n+e.minutes,0);row.querySelector('.work-day-total').innerHTML=workDuration(closed+a.minutes)+'<small>Live</small>';row.setAttribute('aria-label','Work on '+dateLabel(a.start.slice(0,10),{weekday:'long',day:'numeric',month:'long'})+': '+workDuration(closed+a.minutes)+', live');const band=row.querySelector('.work-shift-band.live'),start=workMinute(a.start),end=WorkDemo.civilNow().slice(0,10)!==a.start.slice(0,10)?1440:workMinute(WorkDemo.civilNow());if(band)band.style.width=Math.max(.25,(end-start)/1440*100)+'%';}}}
    document.addEventListener('submit',event=>{const form=event.target;if(!['workEntryForm','workContractForm','workWeekForm'].includes(form.id))return;event.preventDefault();let result;
      if(form.id==='workWeekForm'){if(!WorkDemo.monday($('workWeekDate').value)){toast('Choose a valid date from 5 January 1970 onward.');return;}workView.week=WorkDemo.monday($('workWeekDate').value);workView.day=$('workWeekDate').value;closeDialog();render();return;}
      if(form.id==='workContractForm'){result=WorkDemo.setContract(Number($('workContractHours').value)*60,[...form.querySelectorAll('[name=workDay]:checked')].map(el=>Number(el.value)));if(!result.ok){$('workContractError').textContent=result.error;return;}}
      else{const patch={start:$('workStartDate').value+'T'+$('workStartTime').value,end:$('workEndDate').value+'T'+$('workEndTime').value,breakMinutes:form.dataset.id&&$('workBreakInput').value===$('workBreakInput').defaultValue?WorkDemo.entries.find(e=>e.id===form.dataset.id).breakMinutes:Number($('workBreakInput').value),note:$('workNoteInput').value.trim()};result=form.dataset.id?WorkDemo.correctEntry(form.dataset.id,patch):WorkDemo.addEntry(patch);if(!result.ok){$('workEntryError').textContent=result.error;return;}workView.week=WorkDemo.monday(patch.start.slice(0,10));workView.day=patch.start.slice(0,10);workView.tab='week';}
      closeDialog();render();toast(form.id==='workContractForm'?'Contract updated for this week onward.':'Shift saved. The weekly record is up to date.');
    });
    document.addEventListener('change',event=>{if(event.target.id==='workHistoryFrom'||event.target.id==='workHistoryTo'){const from=$('workHistoryFrom').value,to=$('workHistoryTo').value;if(!WorkDemo.monday(from)||!WorkDemo.monday(to)||from<'1970-01-05'||to<'1970-01-05'||from>to||to>TODAY){toast('Choose a valid range from 5 January 1970 to today.');event.target.value=event.target.id==='workHistoryFrom'?workView.from:workView.to;return;}workView.from=from;workView.to=to;workView.range=-1;render();}});

    
    const GoalsDemo = (() => {
  const goalRows = [];
  const progressVersions = [];
  const actionRows = [];
  const completionEvents = [];
  const operations = new Map();
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const fail = error => ({ ok: false, error });
  const good = fields => Object.assign({ ok: true }, clone(fields || {}));
  const number = value => value === '' || value == null || typeof value === 'boolean' ? NaN : Number(value);
  const text = (value, max, required) => {
    const result = String(value == null ? '' : value).trim();
    return (!required || result.length > 0) && result.length <= max ? result : null;
  };
  function validDate(value, pastOnly) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && value >= '1970-01-01' && value <= (pastOnly ? TODAY : '2199-12-31');
  }
  function monday(date) {
    const day = new Date(date + 'T12:00:00Z').getUTCDay();
    return addDays(date, -(day + 6) % 7);
  }
  function latestLogs() {
    const superseded = new Set(progressVersions.map(l => l.supersedes).filter(Boolean));
    return progressVersions.filter(l => !superseded.has(l.id));
  }
  function goalById(id) { return goalRows.find(g => g.id === id); }
  function validateGoal(input, existing) {
    if (!input || typeof input !== 'object') return fail('Enter the goal details.');
    const title = text(input.title, 120, true);
    const why = text(input.why, 500, false);
    const unit = text(input.unit, 24, true);
    const category = text(input.category || 'Personal', 40, true);
    const target = number(input.target);
    const weeklySessions = number(input.weeklySessions);
    const startDate = input.startDate || (existing ? existing.startDate : TODAY);
    if (title === null || why === null || unit === null || category === null) return fail('Use a title up to 120 characters, a unit up to 24, and a reason up to 500.');
    if (!['best', 'total'].includes(input.mode)) return fail('Choose best result or cumulative progress.');
    if (!Number.isFinite(target) || target <= 0 || target > 1000000) return fail('The target must be greater than zero and at most 1,000,000.');
    if (!Number.isInteger(weeklySessions) || weeklySessions < 1 || weeklySessions > 7) return fail('Choose between 1 and 7 practice days per week.');
    if (!validDate(startDate, false) || !validDate(input.deadline, false) || input.deadline < startDate) return fail('Choose valid start and target dates, with the target date on or after the start.');
    if (!['active', 'paused'].includes(input.status || 'active')) return fail('Choose an active or paused goal.');
    const color = input.color || '#c0b3ff';
    if (!/^#[0-9a-f]{6}$/i.test(color)) return fail('Choose a valid goal colour.');
    if (existing && progressVersions.some(l => l.goalId === existing.id) && (input.mode !== existing.mode || unit !== existing.unit || startDate !== existing.startDate)) return fail('This goal already has history. Keep its measurement, unit and start date, or create a separate goal.');
    let milestones = input.milestones;
    if (milestones == null) {
      milestones = [0.25, 0.5, 0.75, 1].map((fraction, i) => ({ id: 'step-' + i, title: fraction === 1 ? 'Goal reached' : Math.round(fraction * 100) + '% of the way', value: +(target * fraction).toFixed(3) }));
    }
    if (!Array.isArray(milestones) || milestones.length > 12) return fail('Add at most 12 milestones.');
    const checked = [];
    for (const milestone of milestones) {
      if (!milestone || typeof milestone !== 'object') return fail('Check the milestone details.');
      const value = number(milestone.value);
      const title = text(milestone.title, 100, true);
      if (title === null || !Number.isFinite(value) || value <= 0 || value > target) return fail('Each milestone needs a name and a positive value within the goal target.');
      checked.push({ id: text(milestone.id, 100, true) || uid('milestone'), title, value });
    }
    if (new Set(checked.map(m => m.id)).size !== checked.length) return fail('Milestone identifiers must be unique.');
    return good({ goal: { id: existing ? existing.id : uid('goal'), title, why, unit, target, mode: input.mode, deadline: input.deadline, startDate, weeklySessions, color, category, status: input.status || 'active', milestones: checked.sort((a, b) => a.value - b.value), createdAt: existing ? existing.createdAt : TODAY, updatedAt: TODAY } });
  }
  function addGoal(input) {
    const result = validateGoal(input, null);
    if (!result.ok) return result;
    goalRows.push(result.goal);
    return good({ id: result.goal.id, goal: result.goal });
  }
  function updateGoal(id, input) {
    const existing = goalById(id);
    if (!existing) return fail('That goal could not be found.');
    const result = validateGoal(input, existing);
    if (!result.ok) return result;
    goalRows[goalRows.indexOf(existing)] = result.goal;
    return good({ id, goal: result.goal });
  }
  function validateProgress(input, goal, baseline) {
    const date = input.date;
    const value = number(input.value);
    const note = text(input.note, 1000, false);
    if (!validDate(date, true)) return fail('Progress must use a real date on or before today.');
    if (date < (baseline ? baseline.goalSnapshot.startDate : goal.startDate)) return fail('Progress cannot be dated before this goal started.');
    if (!Number.isFinite(value) || value < 0 || value > 1000000) return fail('Enter a result from 0 to 1,000,000. Zero records practice without adding achievement.');
    if (note === null) return fail('Keep the note within 1,000 characters.');
    return good({ date, value, note });
  }
  function logProgress(input) {
    if (!input || typeof input !== 'object') return fail('Enter the progress details.');
    const goal = goalById(input.goalId);
    if (!goal) return fail('Choose a goal first.');
    const checked = validateProgress(input, goal, null);
    if (!checked.ok) return checked;
    const operationId = input.operationId == null ? uid('progress-op') : text(input.operationId, 160, true);
    if (!operationId) return fail('The capture identifier is invalid.');
    const fingerprint = JSON.stringify([goal.id, checked.date, checked.value, checked.note]);
    if (operations.has(operationId)) {
      const previous = operations.get(operationId);
      return previous.fingerprint === fingerprint ? good({ id: previous.id, operationId, duplicate: true, log: progressVersions.find(l => l.id === previous.id) }) : fail('That capture identifier has already been used for different progress.');
    }
    if (goal.status === 'paused') return fail('Resume this goal before adding progress.');
    const log = { id: uid('goal-log'), recordId: null, goalId: goal.id, date: checked.date, value: checked.value, note: checked.note, goalName: goal.title, unit: goal.unit, mode: goal.mode, operationId, goalSnapshot: clone(goal), recordedAt: TODAY, supersedes: null };
    log.recordId = log.id;
    progressVersions.push(log);
    operations.set(operationId, { id: log.id, fingerprint });
    return good({ id: log.id, operationId, log });
  }
  function correctProgress(logId, patch) {
    const existing = latestLogs().find(l => l.id === logId);
    if (!existing) return fail('This entry has changed. Open its latest version to correct it.');
    if (!patch || typeof patch !== 'object') return fail('Enter the correction details.');
    const input = { date: has(patch, 'date') ? patch.date : existing.date, value: has(patch, 'value') ? patch.value : existing.value, note: has(patch, 'note') ? patch.note : existing.note };
    const checked = validateProgress(input, goalById(existing.goalId), existing);
    if (!checked.ok) return checked;
    if (existing.date === checked.date && existing.value === checked.value && existing.note === checked.note) return good({ id: existing.id, log: existing, unchanged: true });
    const revised = Object.assign({}, clone(existing), { id: uid('goal-log'), date: checked.date, value: checked.value, note: checked.note, supersedes: existing.id, recordedAt: TODAY });
    progressVersions.push(revised);
    return good({ id: revised.id, log: revised });
  }
  function actionState(row) {
    const events = completionEvents.filter(e => e.actionId === row.id);
    const last = events[events.length - 1];
    const done = Boolean(last && last.type === 'complete');
    return Object.assign({}, clone(row), { done, completedAt: done ? last.date : null, due: !done && row.date <= TODAY, status: done ? 'done' : row.date <= TODAY ? 'due' : 'planned' });
  }
  function validateAction(input, existing) {
    if (!input || typeof input !== 'object') return fail('Enter the action details.');
    const title = text(input.title, 160, true);
    const goalId = input.goalId || null;
    const minutes = input.minutes == null || input.minutes === '' ? null : number(input.minutes);
    if (title === null) return fail('Give the action a name of up to 160 characters.');
    if (goalId && !goalById(goalId)) return fail('Choose an existing goal or leave this action unlinked.');
    if (!validDate(input.date, false)) return fail('Choose a valid planned date.');
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440)) return fail('Estimated time must be 1 to 1,440 minutes, or left blank.');
    return good({ action: { id: existing ? existing.id : uid('action'), title, goalId, date: input.date, minutes, createdAt: existing ? existing.createdAt : TODAY, updatedAt: TODAY } });
  }
  function addAction(input) {
    const result = validateAction(input, null);
    if (!result.ok) return result;
    actionRows.push(result.action);
    return good({ id: result.action.id, action: actionState(result.action) });
  }
  function updateAction(id, patch) {
    const existing = actionRows.find(a => a.id === id);
    if (!existing) return fail('That action could not be found.');
    if (!patch || typeof patch !== 'object') return fail('Enter the action details.');
    const result = validateAction(Object.assign({}, existing, patch), existing);
    if (!result.ok) return result;
    actionRows[actionRows.indexOf(existing)] = result.action;
    return good({ id, action: actionState(result.action) });
  }
  function completeAction(id, date = TODAY) {
    const row = actionRows.find(a => a.id === id);
    if (!row) return fail('That action could not be found.');
    if (!validDate(date, true)) return fail('Completion must use a real date on or before today.');
    const state = actionState(row);
    if (state.done) return good({ id, action: state, duplicate: true });
    const goal = row.goalId ? goalById(row.goalId) : null;
    const event = { id: uid('action-event'), actionId: id, type: 'complete', date, recordedAt: TODAY, snapshot: Object.assign({}, clone(row), { goalName: goal ? goal.title : null }) };
    completionEvents.push(event);
    return good({ id, action: actionState(row), event });
  }
  function undoAction(id) {
    const row = actionRows.find(a => a.id === id);
    if (!row) return fail('That action could not be found.');
    if (!actionState(row).done) return good({ id, action: actionState(row), unchanged: true });
    const prior = completionEvents.filter(e => e.actionId === id).slice(-1)[0];
    const event = { id: uid('action-event'), actionId: id, type: 'undo', date: TODAY, recordedAt: TODAY, undoes: prior.id, snapshot: clone(prior.snapshot) };
    completionEvents.push(event);
    return good({ id, action: actionState(row), event });
  }
  function summary(id) {
    const goal = goalById(id);
    if (!goal) return null;
    const logs = latestLogs().filter(l => l.goalId === id).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const progress = goal.mode === 'best' ? logs.reduce((best, l) => Math.max(best, l.value), 0) : logs.reduce((sum, l) => sum + l.value, 0);
    const weekStart = monday(TODAY);
    const weekSessions = new Set(logs.filter(l => l.date >= weekStart && l.date <= TODAY).map(l => l.date)).size;
    return clone({ goal, progress, percent: Math.min(100, progress / goal.target * 100), complete: progress >= goal.target, remaining: Math.max(0, goal.target - progress), logs, weekSessions, weeklySessions: goal.weeklySessions, milestones: goal.milestones.map(m => Object.assign({}, m, { done: progress >= m.value })), lastLogDate: logs.length ? logs[logs.length - 1].date : null });
  }
  function snapshot() {
    return clone({ version: 1, goals: goalRows, progressVersions, actions: actionRows, completionEvents, operations: Array.from(operations.entries()) });
  }
  function restore(data,options={}) {
    try {
      const state = clone(data);
      const object = value => value && typeof value === 'object' && !Array.isArray(value);
      const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/.test(value);
      const rows = (items, check) => Array.isArray(items) && items.every(item => object(item) && id(item.id) && check(item)) && new Set(items.map(item => item.id)).size === items.length;
      if (!object(state) || state.version !== 1) return fail('This Goals record uses an unsupported format.');
      if (!rows(state.goals, g => typeof g.title === 'string' && typeof g.why === 'string' && typeof g.unit === 'string' && g.unit.length > 0 && ['best', 'total'].includes(g.mode) && Number.isFinite(g.target) && g.target > 0 && Number.isInteger(g.weeklySessions) && g.weeklySessions >= 1 && g.weeklySessions <= 7 && validDate(g.startDate, false) && validDate(g.deadline, false) && g.deadline >= g.startDate && ['active', 'paused'].includes(g.status) && Array.isArray(g.milestones) && g.milestones.every(m => object(m) && id(m.id) && typeof m.title === 'string' && Number.isFinite(m.value) && m.value > 0 && m.value <= g.target))) return fail('The saved Goals library is incomplete.');
      const goalIds = new Set(state.goals.map(g => g.id));
      if (!rows(state.progressVersions, l => goalIds.has(l.goalId) && validDate(l.date, false) && Number.isFinite(l.value) && l.value >= 0 && typeof l.note === 'string' && typeof l.operationId === 'string' && id(l.recordId) && object(l.goalSnapshot) && l.goalSnapshot.id === l.goalId && validDate(l.goalSnapshot.startDate, false) && ['best', 'total'].includes(l.mode) && typeof l.unit === 'string')) return fail('The saved progress history is incomplete.');
      const logIds = new Set(state.progressVersions.map(l => l.id));
      if (state.progressVersions.some(l => !logIds.has(l.recordId) || (l.supersedes !== null && (!logIds.has(l.supersedes) || l.supersedes === l.id)))) return fail('A saved progress correction is missing its original record.');
      if (!rows(state.actions, a => typeof a.title === 'string' && validDate(a.date, false) && (!a.goalId || goalIds.has(a.goalId)) && (a.minutes === null || Number.isFinite(a.minutes) && a.minutes > 0))) return fail('The saved actions are incomplete.');
      const actionIds = new Set(state.actions.map(a => a.id));
      if (!rows(state.completionEvents, e => actionIds.has(e.actionId) && ['complete', 'undo'].includes(e.type) && validDate(e.date, false) && object(e.snapshot) && e.snapshot.id === e.actionId)) return fail('The saved action history is incomplete.');
      const eventIds = new Set(state.completionEvents.map(e => e.id));
      if (state.completionEvents.some(e => e.type === 'undo' && !eventIds.has(e.undoes))) return fail('A saved action undo is missing its completion.');
      if (!Array.isArray(state.operations) || state.operations.some(entry => !Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !entry[0] || !object(entry[1]) || !logIds.has(entry[1].id) || typeof entry[1].fingerprint !== 'string') || new Set(state.operations.map(entry => entry[0])).size !== state.operations.length) return fail('The saved progress receipts are incomplete.');
      if(options.validateOnly)return {ok:true};
      goalRows.length = 0; state.goals.forEach(row => goalRows.push(row));
      progressVersions.length = 0; state.progressVersions.forEach(row => progressVersions.push(row));
      actionRows.length = 0; state.actions.forEach(row => actionRows.push(row));
      completionEvents.length = 0; state.completionEvents.forEach(row => completionEvents.push(row));
      operations.clear(); state.operations.forEach(([key, value]) => operations.set(key, value));
      return good();
    } catch (_) { return fail('The saved Goals record could not be restored.'); }
  }
  return {
    get goals() { return clone(goalRows); },
    get logs() { return clone(latestLogs()); },
    get logVersions() { return clone(progressVersions); },
    get actions() { return actionRows.map(actionState).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)); },
    get actionEvents() { return clone(completionEvents); },
    addGoal, updateGoal, logProgress, correctProgress, addAction, updateAction, completeAction, undoAction, summary, snapshot, restore
  };
})();

    const goalView={tab:'map',id:null,filter:'active',page:0,actionFilter:'open',historyGoal:'all',historyDays:90};
    const goalNum=n=>Number(n).toLocaleString('en-GB',{maximumFractionDigits:2});
    const goalById=id=>GoalsDemo.goals.find(g=>g.id===id);
    const goalColour=g=>/^#[0-9a-f]{6}$/i.test(g.color||'')?g.color:'#85d6ff';
    const goalIcon=g=>g.id==='goal-handstand'?'train':g.id==='goal-reading'?'book':g.id==='goal-home'?'home':'goals';
    const goalMonday=date=>addDays(date,-((dateObj(date).getUTCDay()+6)%7));
    const goalOptions=id=>'<option value="">Standalone action</option>'+GoalsDemo.goals.map(g=>'<option value="'+g.id+'" '+(g.id===id?'selected':'')+'>'+esc(g.title)+'</option>').join('');
    function goalOutcome(result,message){if(!result.ok){toast(result.error);return false;}if(message)toast(message);return true;}
    function renderGoals(){const main=goalView.id?renderGoalDetail():goalView.tab==='actions'?renderGoalActions():goalView.tab==='history'?renderGoalHistory():renderGoalMap();return '<div class="page-head goal-head"><div><div class="kicker">'+icon('goals')+'<span class="eyebrow">Goals & everyday actions</span></div><h1>Give intention a direction.</h1><p>Big ambitions. Small steps. A record of showing up.</p></div><div class="row"><button class="button ghost" data-action="goal-new-action">'+icon('plus')+' Add action</button><button class="button primary" data-action="goal-new">'+icon('goals')+' New goal</button></div></div><div class="goal-tabs" aria-label="Goals sections">'+[['map','Goal map'],['actions','Actions'],['history','The record']].map(([id,label])=>'<button data-action="goal-tab" data-tab="'+id+'" aria-pressed="'+(goalView.tab===id&&!goalView.id)+'">'+label+'</button>').join('')+'</div>'+main;}
    function renderGoalMap(){const all=GoalsDemo.goals.filter(g=>goalView.filter==='all'||goalView.filter==='achieved'&&GoalsDemo.summary(g.id).complete||goalView.filter==='active'&&g.status==='active'&&!GoalsDemo.summary(g.id).complete);const pages=Math.max(1,Math.ceil(all.length/3));goalView.page=Math.min(goalView.page,pages-1);const visible=all.slice(goalView.page*3,goalView.page*3+3),positions=visible.length===1?[[50,20]]:visible.length===2?[[21,26],[79,26]]:[[21,26],[79,26],[50,83]],active=GoalsDemo.goals.filter(g=>g.status==='active'&&!GoalsDemo.summary(g.id).complete).length;const due=GoalsDemo.actions.filter(a=>!a.done&&a.date<=TODAY),overdue=due.filter(a=>a.date<TODAY);return '<div class="goal-layout"><section><div class="goal-toggle-list" aria-label="Goal map filter">'+[['active','In motion'],['achieved','Achieved'],['all','All goals']].map(([id,label])=>'<button data-action="goal-filter" data-filter="'+id+'" aria-pressed="'+(goalView.filter===id)+'">'+label+'</button>').join('')+'</div><div class="goal-map"><svg viewBox="0 0 1000 455" preserveAspectRatio="none" aria-hidden="true">'+positions.slice(0,visible.length).map(([x,y])=>'<path class="map-line" d="M500 218 Q'+(x*10)+' 218 '+(x*10)+' '+(y*4.55)+'"/>').join('')+'</svg><div class="goal-map-centre"><strong>'+active+'</strong><small>active '+(active===1?'goal':'goals')+'<br>one life</small></div>'+visible.map((g,i)=>{const stat=GoalsDemo.summary(g.id);return '<button class="goal-map-node '+(g.status==='paused'?'paused':'')+'" style="left:'+positions[i][0]+'%;top:'+positions[i][1]+'%;--goal-color:'+goalColour(g)+'" data-action="goal-open" data-id="'+g.id+'" aria-label="Open '+esc(g.title)+', '+goalNum(stat.progress)+' of '+goalNum(g.target)+' '+esc(g.unit)+'"><span class="goal-node-orbit"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="none" stroke="#384361" stroke-width="2"/><circle cx="32" cy="32" r="28" fill="none" stroke="'+goalColour(g)+'" stroke-width="3" stroke-linecap="round" stroke-dasharray="'+(Math.min(100,stat.percent)/100*175.93)+' 175.93"/></svg>'+icon(goalIcon(g))+'</span><strong>'+esc(g.title)+'</strong><small>'+goalNum(stat.progress)+' / '+goalNum(g.target)+' '+esc(g.unit)+(g.status==='paused'?' · paused':'')+'</small></button>';}).join('')+'</div><div class="goal-map-control"><span class="goal-map-note">'+(all.length?'Tap a goal to follow its story.':'No goals in this view yet.')+'</span>'+(pages>1?'<div class="row"><button class="icon-button" data-action="goal-page" data-step="-1" '+(goalView.page===0?'disabled':'')+' aria-label="Previous goals">'+icon('chevron','flip-arrow')+'</button><span class="goal-inline-help">'+(goalView.page+1)+' / '+pages+'</span><button class="icon-button" data-action="goal-page" data-step="1" '+(goalView.page===pages-1?'disabled':'')+' aria-label="Next goals">'+icon('chevron')+'</button></div>':'')+'</div><div class="goal-statline"><div><strong>'+GoalsDemo.goals.filter(g=>GoalsDemo.summary(g.id).complete).length+'</strong><small>Goals achieved</small></div><div><strong>'+GoalsDemo.logs.filter(l=>l.date>=goalMonday(TODAY)&&l.date<=TODAY).length+'</strong><small>Progress entries this week</small></div><div><strong>'+GoalsDemo.actions.filter(a=>a.done&&a.completedAt===TODAY).length+'</strong><small>Actions completed today</small></div></div><div class="goal-linked-list"><button class="goal-linked-row" data-action="navigate" data-route="train">'+icon('train')+'<span>Make room for practice<small>Your workout programme stays a tap away.</small></span>'+icon('arrow')+'</button><button class="goal-linked-row" data-action="goal-tab" data-tab="history">'+icon('progress')+'<span>See what is changing<small>Follow dated progress and completed actions.</small></span>'+icon('arrow')+'</button></div></section><aside class="goal-aside"><section class="goal-focus-intro"><span class="eyebrow">Your next move</span><h2>A little action.<br>A different direction.</h2><div class="goal-coach"><span class="eyebrow">Keep the promise small</span><h3>'+(overdue.length?'Choose what happens next.':due.length?'Make a start today.':'A little space to breathe.')+'</h3><p>'+(overdue.length?overdue.length+' '+(overdue.length===1?'action is':'actions are')+' past its planned date. Do it, or give it a realistic new date.':due.length?'You have '+due.length+' actions planned for today. Pick the first step you can finish.':'No actions are waiting for today. Plan your next step when you are ready.')+'</p></div>'+due.slice(0,3).map(renderGoalAction).join('')+'<button class="text-button" data-action="goal-tab" data-tab="actions">See all actions '+icon('arrow')+'</button></section><section class="goal-focus-intro"><span class="eyebrow">How this keeps you on track</span><h2>Practice is progress too.</h2><p>Log a practice day even when you do not beat your best or finish a book. Your consistency and your outcome are shown separately.</p><p class="goal-inline-help">Prompts here follow your dates and records. Capture can turn supported text phrases into reviewed updates. Phone reminders are not connected yet.</p></section></aside></div>';}
    function renderGoalAction(a){const g=a.goalId?goalById(a.goalId):null;return '<div class="goal-action '+(a.done?'done':'')+'"><button class="action-check" data-action="'+(a.done?'goal-undo-action':'goal-complete-action')+'" data-id="'+a.id+'" aria-label="'+(a.done?'Undo completion of ':'Complete ')+esc(a.title)+'" '+(!a.done&&a.date>TODAY?'disabled':'')+'>'+icon(a.done?'check':'circle')+'</button><button class="action-copy" data-action="goal-edit-action" data-id="'+a.id+'"><strong>'+esc(a.title)+'</strong><small class="'+(!a.done&&a.date<TODAY?'late':'')+'">'+(a.done?'Completed '+dateLabel(a.completedAt):a.date<TODAY?'Overdue · '+dateLabel(a.date):a.date===TODAY?'Today':dateLabel(a.date,{weekday:'short',day:'numeric',month:'short'}))+(a.minutes?' · '+a.minutes+' min':'')+'<br>'+esc(g?g.title:'Everyday life')+'</small></button><button class="icon-button" data-action="goal-edit-action" data-id="'+a.id+'" aria-label="Edit '+esc(a.title)+'">'+icon('edit')+'</button></div>';}
    function renderGoalActions(){const rows=GoalsDemo.actions.filter(a=>goalView.actionFilter==='done'?a.done:!a.done),groups=goalView.actionFilter==='done'?[['Completed',rows]]:[['Needs a new decision',rows.filter(a=>a.date<TODAY)],['Today',rows.filter(a=>a.date===TODAY)],['Coming up',rows.filter(a=>a.date>TODAY)]];return '<div class="goal-layout"><section><div class="goal-toggle-list">'+[['open','To do'],['done','Completed']].map(([id,label])=>'<button data-action="goal-action-filter" data-filter="'+id+'" aria-pressed="'+(goalView.actionFilter===id)+'">'+label+'</button>').join('')+'</div>'+groups.filter(([,items])=>items.length).map(([title,items])=>'<section class="goal-action-group"><h3>'+title+' · '+items.length+'</h3>'+items.map(renderGoalAction).join('')+'</section>').join('')+(!rows.length?'<div class="goal-history-empty">'+(goalView.actionFilter==='done'?'Completed actions will appear here.':'Your list is clear. Add a next step for one of your goals, or capture something you need to remember.')+'</div>':'')+'<button class="button ghost full gap-top" data-action="goal-new-action">'+icon('plus')+' Capture an action</button></section><aside class="goal-aside"><section class="goal-focus-intro"><span class="eyebrow">A plan you can actually do</span><h2>Make the next step concrete.</h2><p>Give each action a date and an optional time estimate. Link it to a goal, or keep everyday jobs like washing on their own.</p><div class="goal-coach"><h3>Plans can move.</h3><p>If an action no longer fits today, change its date. It stays visible until you complete it.</p></div><p class="goal-inline-help">Completing an action records that you did it. Log the result in its goal separately, so a checkbox never invents an extra book read or a new personal best.</p></section></aside></div>';}
    function renderGoalDetail(){const s=GoalsDemo.summary(goalView.id);if(!s){goalView.id=null;return renderGoalMap();}const g=s.goal,week=goalMonday(TODAY),days=Array.from({length:7},(_,i)=>addDays(week,i)),actions=GoalsDemo.actions.filter(a=>a.goalId===g.id&&(!a.done||a.completedAt===TODAY));return '<button class="goal-back" data-action="goal-tab" data-tab="map">'+icon('chevron','flip-arrow')+' Back to your map</button><div class="goal-layout"><section><div class="goal-detail-hero" style="--goal-color:'+goalColour(g)+'"><span class="eyebrow">'+esc(g.category)+(g.status==='paused'?' · Paused':s.complete?' · Achieved':' · In motion')+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(g.why)+'</p><div class="goal-detail-number">'+goalNum(s.progress)+' <small>/ '+goalNum(g.target)+' '+esc(g.unit)+'</small></div><p>'+(g.mode==='best'?'Your best recorded result':'Total recorded toward this goal')+'. '+(s.complete?'You have reached your target.':goalNum(s.remaining)+' '+esc(g.unit)+' to go.')+'</p><div class="row"><button class="button primary" data-action="goal-log" data-id="'+g.id+'">'+icon('plus')+' Record progress</button><button class="button ghost" data-action="goal-edit" data-id="'+g.id+'">'+icon('edit')+' Edit goal</button></div></div><div class="goal-section-heading"><h2>The path ahead</h2><span class="goal-inline-help">Milestones</span></div><div class="goal-milestones">'+s.milestones.map(m=>'<div class="goal-milestone '+(m.done?'done':'')+'"><i>'+(m.done?'✓':'·')+'</i><strong>'+esc(m.title)+'</strong><small>'+goalNum(m.value)+' '+esc(g.unit)+'</small></div>').join('')+'</div><div class="goal-section-heading"><h2>Keep showing up</h2><span class="goal-inline-help">'+s.weekSessions+' / '+s.weeklySessions+' days this week</span></div><div class="goal-cadence">'+days.map(d=>'<div class="'+(s.logs.some(l=>l.date===d)?'logged ':'')+(d>TODAY?'future':'')+'"><i>'+ (s.logs.some(l=>l.date===d)?'✓':'·')+'</i>'+dateLabel(d,{weekday:'short'})+'</div>').join('')+'</div><p class="goal-inline-help">One or more progress entries on a date count as one practice day. Recording zero '+esc(g.unit)+' still counts as showing up.</p><div class="goal-section-heading"><h2>Progress over time</h2><button class="text-button" data-action="goal-history-for" data-id="'+g.id+'">Every entry '+icon('arrow')+'</button></div>'+renderGoalChart(s)+'<p class="goal-inline-help">'+(g.mode==='best'?'The line follows your best result so far.':'The line follows the total you have recorded.')+' Tap a point to inspect its entry.</p></section><aside class="goal-aside"><section class="goal-focus-intro"><span class="eyebrow">Next steps</span><h2>'+(s.complete?'You made it.':g.status==='paused'?'On your terms.':s.weekSessions>=s.weeklySessions?'This week is on track.':'A place in your week.')+'</h2><p>'+(g.status==='paused'?'This goal is paused. Your record is here whenever you are ready to return.':s.complete?'Your completed goal stays part of your record. You can keep logging or set a new goal.':Math.max(0,s.weeklySessions-s.weekSessions)+' more practice '+(s.weeklySessions-s.weekSessions===1?'day':'days')+' to meet your weekly plan.')+'</p>'+actions.map(renderGoalAction).join('')+'<button class="text-button" data-action="goal-new-action" data-id="'+g.id+'">+ Plan the next action</button><div class="goal-coach gap-top"><span class="eyebrow">Target date</span><h3>'+dateLabel(g.deadline,{day:'numeric',month:'long',year:'numeric'})+'</h3><p>'+(g.deadline<TODAY&&!s.complete?'Your target date has passed. Review the next step and set a date that fits your current plan.':'A date to plan toward. Adjust it when your circumstances change.')+'</p></div><button class="text-button" data-action="goal-pause" data-id="'+g.id+'">'+(g.status==='paused'?'Resume this goal':'Pause this goal')+'</button></section><section class="goal-focus-intro"><span class="eyebrow">Most recent entry</span>'+(s.logs.length?renderGoalRecord(s.logs.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]):'<p>No progress recorded yet. Your first entry starts the story.</p>')+'</section></aside></div>';}
    function renderGoalChart(s){const logs=s.logs.slice().sort((a,b)=>a.date.localeCompare(b.date));if(!logs.length)return '<div class="goal-history-empty">Your first entry starts this timeline.</div>';let running=0;const points=logs.map(l=>{running=s.goal.mode==='best'?Math.max(running,l.value):running+l.value;return {log:l,value:running};});const W=540,H=225,L=43,R=16,T=23,B=37,max=Math.max(s.goal.target,...points.map(p=>p.value),1),minDate=dateObj(s.goal.startDate).getTime(),maxDate=Math.max(dateObj(TODAY).getTime(),minDate+86400000),x=p=>L+(dateObj(p.log.date).getTime()-minDate)/(maxDate-minDate)*(W-L-R),y=n=>H-B-n/max*(H-T-B);let out='<svg class="goal-progress-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(s.goal.title)+' recorded progress by date">';[0,max/2,max].forEach(n=>out+='<line class="goal-chart-axis" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(n)+'" y2="'+y(n)+'"/><text x="'+(L-7)+'" y="'+(y(n)+4)+'" text-anchor="end">'+goalNum(n)+'</text>');out+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(s.goal.target)+'" y2="'+y(s.goal.target)+'" stroke="#c0b3ff88" stroke-dasharray="4 5"/><text x="'+(W-R)+'" y="'+(y(s.goal.target)-8)+'" text-anchor="end">Target '+goalNum(s.goal.target)+' '+esc(s.goal.unit)+'</text><polyline class="goal-chart-line" points="'+points.map(p=>x(p)+','+y(p.value)).join(' ')+'"/>';out+=points.map(p=>'<g class="goal-chart-hit" role="button" tabindex="0" data-action="goal-log-detail" data-id="'+p.log.id+'" aria-label="Progress on '+dateLabel(p.log.date)+': '+goalNum(p.log.value)+' '+esc(p.log.unit)+'"><circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="15" fill="transparent"/><circle class="goal-chart-point" cx="'+x(p)+'" cy="'+y(p.value)+'" r="4"/></g>').join('');return out+'<text x="'+L+'" y="'+(H-9)+'">'+dateLabel(s.goal.startDate)+'</text><text x="'+(W-R)+'" y="'+(H-9)+'" text-anchor="end">'+dateLabel(TODAY)+'</text></svg>';}
    function renderGoalRecord(l){return '<article class="goal-record"><div class="row"><strong>'+esc(l.goalName)+'</strong><button class="text-button" data-action="goal-log-detail" data-id="'+l.id+'">Details '+icon('arrow')+'</button></div><small>'+dateLabel(l.date,{day:'numeric',month:'short',year:'numeric'})+' · '+(l.value===0?'Practice recorded':goalNum(l.value)+' '+esc(l.unit)+' recorded')+'</small>'+(l.note?'<p>'+esc(l.note)+'</p>':'')+'</article>';}
    function renderGoalHistory(){const min=goalView.historyDays?addDays(TODAY,-goalView.historyDays+1):'1970-01-01';const logs=GoalsDemo.logs.filter(l=>(goalView.historyGoal==='all'||l.goalId===goalView.historyGoal)&&l.date>=min).map(l=>({date:l.date,kind:'progress',item:l}));const events=GoalsDemo.actionEvents.filter(e=>(goalView.historyGoal==='all'||e.snapshot.goalId===goalView.historyGoal)&&e.date>=min).map(e=>({date:e.date,kind:'action',item:e}));const all=logs.concat(events).sort((a,b)=>b.date.localeCompare(a.date));return '<div class="goal-layout"><section><h2 style="font-size:34px">The story is in the doing.</h2><div class="goal-filter"><label>Follow a goal<select id="goalHistorySelect"><option value="all">All goals and everyday actions</option>'+GoalsDemo.goals.map(g=>'<option value="'+g.id+'" '+(goalView.historyGoal===g.id?'selected':'')+'>'+esc(g.title)+'</option>').join('')+'</select></label><div class="period-switch" aria-label="Goal history range">'+[[30,'30 days'],[90,'90 days'],[0,'All']].map(([n,label])=>'<button data-action="goal-history-range" data-days="'+n+'" aria-pressed="'+(goalView.historyDays===n)+'">'+label+'</button>').join('')+'</div></div>'+all.map(r=>r.kind==='progress'?renderGoalRecord(r.item):'<article class="goal-record"><strong>'+esc(r.item.snapshot.title)+'</strong><small>'+dateLabel(r.date,{day:'numeric',month:'short',year:'numeric'})+' · '+(r.item.type==='complete'?'Action completed':'Completion undone')+'</small><p>'+esc(r.item.snapshot.goalName||'Everyday life')+'</p></article>').join('')+(!all.length?'<div class="goal-history-empty">No entries in this view yet. Your progress and completed actions will appear here.</div>':'')+'</section><aside class="goal-aside"><section class="goal-focus-intro"><span class="eyebrow">A record that grows with you</span><h2>Remember the steps.</h2><p>Progress entries keep the goal name and unit used at the time. Corrections retain the earlier version, and undone actions remain visible in the record.</p><p class="goal-inline-help">Current totals use the latest correction for each entry. Earlier versions are available inside its details.</p></section></aside></div>';}
let goalEditorState=null;
function goalSuggestedMilestones(target,mode) {
  if(!Number.isFinite(target)||target<=0)return [];
  const wholeSteps=mode==='total'&&Number.isInteger(target);
  const values=[0.25,0.5,0.75,1].map(f=>f===1?target:wholeSteps?Math.max(1,Math.round(target*f)):Number((target*f).toFixed(4)));
  return [...new Set(values)].filter(n=>n>0&&n<=target).map((value,i)=>({id:'suggested-step-'+i,title:value===target?'Goal reached':value/target===0.5?'Halfway there':value/target<0.5?'A first step':'Nearly there',value}));
}
function goalEditorMilestoneIssue(milestones,target) {
  if(!Number.isFinite(target)||target<=0)return '';
  if(milestones.some(m=>!Number.isFinite(Number(m.value))||Number(m.value)<=0))return 'Give each milestone a positive amount, or use the suggestions below.';
  const beyond=milestones.find(m=>Number(m.value)>target);
  if(beyond)return 'Your target is now '+goalNum(target)+' '+$('goalUnit').value.trim()+', but "'+beyond.title+'" is reached at '+goalNum(beyond.value)+'. Update the suggestions or change that milestone before saving.';
  if(milestones.some(m=>!String(m.title).trim()))return 'Give each milestone a name, or use the suggestions below.';
  return '';
}
function goalReadMilestoneFields() {
  const form=$('goalEditorForm');if(!form||!goalEditorState)return;
  const names=Array.from(form.querySelectorAll('.goal-milestone-name')),values=Array.from(form.querySelectorAll('.goal-milestone-value'));
  goalEditorState.milestones=names.map((input,i)=>({id:goalEditorState.milestones[i]?goalEditorState.milestones[i].id:uid('milestone'),title:input.value,value:values[i].value.trim()===''?NaN:Number(values[i].value)}));
}
function renderGoalMilestoneFields() {
  $('goalMilestoneFields').innerHTML=goalEditorState.milestones.map((m,i)=>'<div class="goal-milestone-edit"><label>Milestone '+(i+1)+' name<input class="goal-milestone-name" maxlength="100" value="'+esc(m.title)+'"></label><label>Reached at<input class="goal-milestone-value" type="text" inputmode="decimal" value="'+(Number.isFinite(Number(m.value))?m.value:'')+'" aria-label="Milestone '+(i+1)+' reached at"><small class="goal-milestone-unit">'+esc($('goalUnit').value.trim())+'</small></label><button type="button" class="text-button goal-remove-milestone" data-action="goal-remove-milestone" data-index="'+i+'">Remove milestone '+(i+1)+'</button></div>').join('');
}
function renderGoalEditorPreview(refreshFields=false) {
  const target=Number($('goalTarget').value),mode=$('goalMode').value,unit=$('goalUnit').value.trim()||'units';
  if(goalEditorState.auto)goalEditorState.milestones=goalSuggestedMilestones(target,mode);
  const steps=goalEditorState.milestones;
  $('goalMeasureHelp').textContent=mode==='best'?'Example: record each handstand attempt. Your longest hold counts towards a 20-second target.':'Example: record 1 when you finish a book. Each entry adds towards a total of 12 books.';
  $('goalTargetSentence').textContent=Number.isFinite(target)&&target>0?'I want to '+(mode==='best'?'reach ':'complete a total of ')+goalNum(target)+' '+unit+'.':'Set the amount you want to reach.';
  $('goalCheckpointPreview').innerHTML=steps.length?'<div class="goal-milestones">'+steps.map((m,i)=>'<div class="goal-milestone"><i>'+(i+1)+'</i><strong>'+(Number.isFinite(Number(m.value))?goalNum(m.value):'?')+' '+esc(unit)+'</strong><small>'+esc(m.title)+'</small></div>').join('')+'</div>':'<p class="goal-inline-help">'+(goalEditorState.auto?'Your milestones will appear when you add a target.':'No milestones selected. Your overall progress will still be tracked.')+'</p>';
  $('goalCheckpointMode').textContent=goalEditorState.auto?'These milestones are set up for you and follow your target. No extra setup needed.':'Your milestone names and amounts are kept as shown. You can edit them or choose new suggestions.';
  $('goalCheckpointNotice').textContent=goalEditorMilestoneIssue(steps,target);
  $('goalUseSuggestions').hidden=goalEditorState.auto;
  if(refreshFields)renderGoalMilestoneFields();
  else Array.from(document.querySelectorAll('.goal-milestone-unit')).forEach(el=>el.textContent=unit);
}
function goalEditor(id=null) {
  const g=id?goalById(id):null,locked=Boolean(g&&GoalsDemo.summary(id).logs.length);
  goalEditorState={auto:!g,milestones:g?clone(g.milestones):[]};
  showDialog(g?'Edit your goal':'Create a goal','<form id="goalEditorForm" data-id="'+(id||'')+'"><p class="dialog-sub">Name the outcome. Decide what progress looks like. We will add the milestones for you.</p><label>What do you want to achieve?<input id="goalTitle" maxlength="120" value="'+esc(g?g.title:'')+'" placeholder="Hold a freestanding handstand" required></label><label class="gap-top">How should progress count?<select id="goalMode" '+(locked?'disabled':'')+'><option value="best" '+(g&&g.mode==='best'?'selected':'')+'>My best result, like a 20-second hold</option><option value="total" '+(g&&g.mode==='total'?'selected':'')+'>A total, like finishing 12 books</option></select></label><p id="goalMeasureHelp" class="goal-inline-help"></p><div class="goal-target-builder"><div class="goal-form-grid"><label>I want to reach<input id="goalTarget" type="number" min="0.01" max="1000000" step="any" value="'+(g?g.target:20)+'" required inputmode="decimal"></label><label>Measured in<input id="goalUnit" maxlength="24" value="'+esc(g?g.unit:'seconds')+'" placeholder="seconds, books, kilometres" '+(locked?'readonly':'')+' required></label></div><label>By this date<input id="goalDeadline" type="date" min="'+(g?g.startDate:TODAY)+'" max="2199-12-31" value="'+(g?g.deadline:addDays(TODAY,90))+'" required></label><p id="goalTargetSentence" class="goal-inline-help"></p></div>'+(locked?'<p class="goal-inline-help">You already have progress recorded in '+esc(g.unit)+'. The measurement and unit stay fixed so that those entries keep their meaning.</p>':'')+'<section class="goal-checkpoint-section" aria-label="Milestone preview"><span class="eyebrow">Your milestones</span><div id="goalCheckpointPreview"></div><p id="goalCheckpointMode" class="goal-inline-help"></p><p id="goalCheckpointNotice" class="goal-checkpoint-notice" role="status"></p><button id="goalUseSuggestions" type="button" class="text-button" data-action="goal-suggest-milestones">Use suggested milestones for this target</button></section><details id="goalMilestoneCustom" class="goal-editor-details"><summary>Customise milestones, optional</summary><p class="goal-inline-help">Milestones are little celebrations along the way. "Reached at" means the amount of progress needed to complete that milestone, in the same unit as your goal. You can leave all of this as it is.</p><div id="goalMilestoneFields"></div><button type="button" class="text-button" data-action="goal-add-milestone">+ Add a milestone</button></details><details class="goal-editor-details"><summary>Practice plan and personal details</summary><div class="goal-form-grid"><label>Make time on<select id="goalWeekly">'+[1,2,3,4,5,6,7].map(n=>'<option value="'+n+'" '+(n===(g?g.weeklySessions:3)?'selected':'')+'>'+n+' '+(n===1?'day':'days')+' each week</option>').join('')+'</select></label><label>Life area<select id="goalCategory">'+Array.from(new Set([g?g.category:'Skills','Movement','Skills','Learning','Home','Health','Personal'])).map(c=>'<option '+(g&&g.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label></div><p class="goal-inline-help">This is a practice rhythm, separate from the goal amount. A practice entry can count as showing up even before you improve or finish something.</p><label>Why does this matter to you?<input id="goalWhy" maxlength="500" value="'+esc(g?g.why:'')+'" placeholder="A reason to keep going, optional"></label></details><p class="goal-inline-help" id="goalPracticeSummary">'+(g?g.weeklySessions:3)+' practice '+((g?g.weeklySessions:3)===1?'day':'days')+' per week. Adjust this in the practice plan above.</p><div id="goalEditorError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save goal</button></div></form>');
  renderGoalEditorPreview(true);
}


    function goalProgressDialog(id,logId=null){const g=goalById(id),l=logId?GoalsDemo.logs.find(l=>l.id===logId):null;showDialog(l?'Correct progress':'Record progress','<form id="goalProgressForm" data-goal="'+g.id+'" data-log="'+(logId||'')+'" data-operation="'+uid('progress-op')+'"><p class="dialog-sub">'+esc(g.title)+'. '+(g.mode==='best'?'Enter the result you managed on this date. Your best result is calculated for you.':'Enter only the amount to add for this date, not your running total.')+'</p><div class="goal-form-grid"><label>Date<input id="goalLogDate" type="date" min="'+g.startDate+'" max="'+TODAY+'" value="'+(l?l.date:TODAY)+'" required></label><label>'+esc(g.unit)+' recorded<input id="goalLogValue" type="number" min="0" max="1000000" step="any" value="'+(l?l.value:0)+'" required inputmode="decimal"></label></div><label>What happened?<input id="goalLogNote" maxlength="500" value="'+esc(l?l.note:'')+'" placeholder="What helped, what you learned, or which book you finished"></label><p class="goal-form-result">Zero records a practice day without adding to your result. '+(l?'A correction keeps the previous version.':'Completing an action does not fill this in automatically.')+'</p><div id="goalProgressError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(l?'Save correction':'Save progress')+'</button></div></form>');}
    function goalLogDetail(id){const l=GoalsDemo.logs.find(l=>l.id===id);if(!l)return;const versions=GoalsDemo.logVersions.filter(v=>v.recordId===l.recordId).slice().reverse();showDialog('Progress record','<p class="dialog-sub">'+esc(l.goalName)+' · '+dateLabel(l.date,{day:'numeric',month:'long',year:'numeric'})+'</p><div class="goal-detail-number">'+goalNum(l.value)+' <small>'+esc(l.unit)+'</small></div><p class="goal-inline-help">'+esc(l.note||'No note added.')+'</p><button class="text-button" data-action="goal-correct-log" data-id="'+l.id+'" data-goal="'+l.goalId+'">Correct this entry '+icon('edit')+'</button><h3 class="gap-top" style="font-size:14px">Record history</h3>'+versions.map((v,i)=>'<div class="work-revision"><strong>'+(i===0?'Current':'Earlier version')+'</strong><br>'+dateLabel(v.date)+' · '+goalNum(v.value)+' '+esc(v.unit)+'<br>'+esc(v.note||'No note')+'</div>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function goalActionDialog(id=null,goalId=null){const a=id?GoalsDemo.actions.find(a=>a.id===id):null;showDialog(a?'Edit an action':'Capture an action','<form id="goalActionForm" data-id="'+(id||'')+'"><label>What needs doing?<input id="goalActionTitle" maxlength="120" value="'+esc(a?a.title:'')+'" placeholder="Put the washing on" required></label><label class="gap-top">Connect to a goal, optional<select id="goalActionLink">'+goalOptions(a?a.goalId:goalId)+'</select></label><div class="goal-form-grid"><label>Planned date<input id="goalActionDate" type="date" min="1970-01-05" value="'+(a?a.date:TODAY)+'" required></label><label>Minutes, optional<input id="goalActionMinutes" type="number" min="1" max="1440" step="1" value="'+(a&&a.minutes?a.minutes:'')+'" inputmode="numeric"></label></div><p class="goal-inline-help">Keep it small enough to start. '+(a&&a.done?'This action is complete. Its completion record keeps the details from when it was done.':'Changing the planned date reschedules the action.')+'</p><div id="goalActionError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save action</button></div></form>');}
    function handleGoalAction(a,d){
      if(a==='goal-suggest-milestones'){goalEditorState.auto=true;renderGoalEditorPreview(true);$('goalEditorError').textContent='';return;}
      if(a==='goal-remove-milestone'){goalReadMilestoneFields();goalEditorState.auto=false;goalEditorState.milestones.splice(Number(d.index),1);renderGoalEditorPreview(true);return;}
      if(a==='goal-add-milestone'){goalReadMilestoneFields();if(goalEditorState.milestones.length>=12){$('goalEditorError').textContent='Keep up to 12 milestones, so the path stays easy to follow.';return;}goalEditorState.auto=false;goalEditorState.milestones.push({id:uid('milestone'),title:'A step forward',value:Number($('goalTarget').value)});renderGoalEditorPreview(true);return;}
      if(a==='goal-tab'){goalView.id=null;goalView.tab=d.tab;render();return;}
      if(a==='goal-filter'){goalView.filter=d.filter;goalView.page=0;render();return;}
      if(a==='goal-page'){goalView.page+=Number(d.step);render();return;}
      if(a==='goal-open'){goalView.id=d.id;render();window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='goal-new'||a==='goal-edit'){goalEditor(d.id||null);return;}
      if(a==='goal-new-action'){goalActionDialog(null,d.id||goalView.id);return;}
      if(a==='goal-edit-action'){goalActionDialog(d.id);return;}
      if(a==='goal-log'){goalProgressDialog(d.id);return;}
      if(a==='goal-correct-log'){goalProgressDialog(d.goal,d.id);return;}
      if(a==='goal-log-detail'){goalLogDetail(d.id);return;}
      if(a==='goal-action-filter'){goalView.actionFilter=d.filter;render();return;}
      if(a==='goal-complete-action'||a==='goal-undo-action'){const result=a==='goal-complete-action'?GoalsDemo.completeAction(d.id):GoalsDemo.undoAction(d.id);if(goalOutcome(result,a==='goal-complete-action'?'Action completed. Record any goal result separately.':'Completion undone. The action is back on your list.'))render();return;}
      if(a==='goal-pause'){const g=goalById(d.id);if(goalOutcome(GoalsDemo.updateGoal(g.id,{...g,status:g.status==='paused'?'active':'paused'}),g.status==='paused'?'Goal resumed.':'Goal paused. Your record is kept.'))render();return;}
      if(a==='goal-history-for'){goalView.id=null;goalView.tab='history';goalView.historyGoal=d.id;render();return;}
      if(a==='goal-history-range'){goalView.historyDays=Number(d.days);render();return;}
    }
    document.addEventListener('submit',event=>{const form=event.target;if(!['goalEditorForm','goalProgressForm','goalActionForm'].includes(form.id))return;event.preventDefault();let result,errorId;
      if(form.id==='goalEditorForm'){
        const existing=form.dataset.id?goalById(form.dataset.id):null,target=Number($('goalTarget').value);
        if(goalEditorState.auto)goalEditorState.milestones=goalSuggestedMilestones(target,$('goalMode').value);else goalReadMilestoneFields();
        const issue=goalEditorMilestoneIssue(goalEditorState.milestones,target);
        if(issue){$('goalEditorError').textContent=issue;$('goalMilestoneCustom').open=true;return;}
        const value={...(existing||{}),title:$('goalTitle').value.trim(),why:$('goalWhy').value.trim(),unit:$('goalUnit').value.trim(),mode:$('goalMode').value,target,weeklySessions:Number($('goalWeekly').value),deadline:$('goalDeadline').value,startDate:existing?existing.startDate:TODAY,color:existing?existing.color:'#c0b3ff',category:$('goalCategory').value,status:existing?existing.status:'active',milestones:goalEditorState.milestones.map(m=>({...m,title:String(m.title).trim(),value:Number(m.value)}))};
        result=existing?GoalsDemo.updateGoal(existing.id,value):GoalsDemo.addGoal(value);errorId='goalEditorError';if(result.ok){goalView.id=result.goal.id;goalView.tab='map';}
      }
      if(form.id==='goalProgressForm'){const patch={goalId:form.dataset.goal,date:$('goalLogDate').value,value:Number($('goalLogValue').value),note:$('goalLogNote').value.trim(),operationId:form.dataset.operation};result=form.dataset.log?GoalsDemo.correctProgress(form.dataset.log,patch):GoalsDemo.logProgress(patch);errorId='goalProgressError';}
      if(form.id==='goalActionForm'){const value={title:$('goalActionTitle').value.trim(),goalId:$('goalActionLink').value||null,date:$('goalActionDate').value,minutes:$('goalActionMinutes').value?Number($('goalActionMinutes').value):null};result=form.dataset.id?GoalsDemo.updateAction(form.dataset.id,value):GoalsDemo.addAction(value);errorId='goalActionError';}
      if(!result.ok){$(errorId).textContent=result.error;return;}if(form.dataset.lifeAmbition&&form.id==='goalEditorForm')lifeLinkedGoalSaved(form.dataset.lifeAmbition,result.goal);if(form.dataset.lifeAmbition&&form.id==='goalActionForm')lifeLinkedActionSaved(form.dataset.lifeAmbition,result.action);closeDialog();render();toast(form.id==='goalProgressForm'?'Progress recorded. Your goal and timeline are updated.':form.id==='goalEditorForm'?'Your goal is ready. Give it a next step.':'Action saved in your plan.');
    });
    document.addEventListener('input',event=>{
      if(!$('goalEditorForm'))return;
      if(event.target.id==='goalTarget'||event.target.id==='goalUnit'){renderGoalEditorPreview(goalEditorState.auto);return;}
      if(event.target.classList.contains('goal-milestone-name')||event.target.classList.contains('goal-milestone-value')){goalReadMilestoneFields();goalEditorState.auto=false;renderGoalEditorPreview(false);}
    });
    document.addEventListener('change',event=>{
      if(event.target.id==='goalHistorySelect'){goalView.historyGoal=event.target.value;render();}
      if(event.target.id==='goalMode'&&$('goalEditorForm'))renderGoalEditorPreview(goalEditorState.auto);
      if(event.target.id==='goalWeekly'&&$('goalEditorForm'))$('goalPracticeSummary').textContent=event.target.value+' practice '+(Number(event.target.value)===1?'day':'days')+' per week. Adjust this in the practice plan above.';
    });
    document.addEventListener('keydown',event=>{const point=event.target.closest('.goal-chart-hit');if(point&&(event.key==='Enter'||event.key===' ')){event.preventDefault();goalLogDetail(point.dataset.id);}});


  // Fictional money workspace. All ledger amounts are integer pence.
  // Latest revisions determine balances; the original events remain available.
  const LifeSnapshotCheck = (function snapshotChecks(){
  const check=(value,message)=>{if(!value)throw new Error(message||'The saved domain data is invalid.');};
  const object=value=>check(value&&typeof value==='object'&&!Array.isArray(value),'Expected a saved record.');
  function copy(value){return JSON.parse(JSON.stringify(value,(key,item)=>{check(!['__proto__','prototype','constructor'].includes(key),'Unsafe saved field.');check(!(typeof item==='number'&&!Number.isFinite(item)),'Saved numbers must be finite.');return item;}));}
  const list=(value,label)=>{check(Array.isArray(value)&&value.length<=1000000,'Invalid '+label+' list.');return value;};
  const id=value=>check(typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value)&&!['__proto__','prototype','constructor'].includes(value),'Invalid saved identifier.');
  const text=(value,max=8000,required=false)=>check(typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0),'Invalid saved text.');
  const number=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>check(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'Invalid saved number.');
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>{number(value,min,max);check(Number.isSafeInteger(value),'Invalid saved whole number.');};
  const money=value=>{number(value);check(Number.isSafeInteger(Math.round(value*100))&&Math.abs(value*100-Math.round(value*100))<.000001,'Invalid saved money amount.');};
  const date=(value,past=false)=>check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value&&(!past||value<=TODAY),'Invalid saved date.');
  const one=(value,allowed)=>check(allowed.includes(value),'Invalid saved choice.');
  const bool=value=>check(typeof value==='boolean','Invalid saved flag.');
  const optional=(value,fn)=>{if(value!==null&&value!==undefined)fn(value);};
  const position=p=>{object(p);number(p.x,0,1);number(p.y,0,1);};
  function indexed(rows,label){const result=new Map();for(const row of list(rows,label)){object(row);id(row.id);check(!result.has(row.id),'Duplicate '+label+' identifier.');result.set(row.id,row);}return result;}
  function chain(rows,validate){const current=new Map(),ids=new Set(),operations=new Set();for(const row of rows){object(row);id(row.id);id(row.rootId);check(!ids.has(row.id),'Repeated event version.');const previous=current.get(row.rootId);check(previous?row.supersedes===previous.id:row.rootId===row.id&&row.supersedes===null,'Broken event revision chain.');integer(row.sequence,1);if(previous)check(previous.sequence===row.sequence,'Changed event sequence.');if(row.operationId){text(row.operationId,240,true);check(!operations.has(row.operationId),'Repeated operation identifier.');operations.add(row.operationId);}validate(row,previous);current.set(row.rootId,row);ids.add(row.id);}return [...current.values()];}
  function payload(data,schema){object(data);check(data.schema===schema,'Unsupported saved domain schema.');return copy(data);}
  const replace=(target,source)=>{target.length=0;for(const row of source)target.push(row);};
  const protect=fn=>{try{return fn();}catch(error){return {ok:false,error:error.message||String(error)};}};
  return {check,object,copy,list,id,text,number,integer,money,date,one,bool,optional,position,indexed,chain,payload,replace,protect};
})();
  const MoneyDemo = (() => {
    const copy = value => JSON.parse(JSON.stringify(value));
    const accounts = [];
    const debts = [];
    const versions = [];
    let sequence = 0;
    let monthlyPlan = { income: 0, essentials: 0, flexible: 0, extraDebt: 0, savings: 0, investment: 0 };
    const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
    const checkDate = date => { if (!dateOK(date) || date > TODAY) throw new Error('Choose a valid date on or before today.'); return date; };
    const pounds = amount => amount / 100;
    function pence(value, label, allowNegative = false) {
      if (value === '' || value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !/^-?\d+(?:\.\d{1,2})?$/.test(value.trim()))) throw new Error(label + ' needs a number with no more than two decimal places.');
      const number = Number(value);
      const result = Math.round(number * 100);
      if (!Number.isFinite(number) || !Number.isSafeInteger(result) || Math.abs(number * 100 - result) > 0.000001 || (!allowNegative && result < 0)) throw new Error(label + ' needs a valid amount with no more than two decimal places.');
      return result;
    }
    function aprValue(value) {
      if (value === '' || value === null || value === undefined || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1000) throw new Error('APR must be between 0 and 1000%.');
      return Number(value);
    }
    const fail = error => ({ ok: false, error: error.message || String(error) });
    const protect = fn => { try { return fn(); } catch (error) { return fail(error); } };
    function latest(list = versions) {
      const map = new Map();
      list.forEach(event => map.set(event.rootId, event));
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);
    }
    function balances(date = TODAY, list = versions) {
      const result = { accounts: {}, debts: {} };
      accounts.forEach(account => { result.accounts[account.id] = account.openedOn <= date ? account.openingPence : 0; });
      debts.forEach(debt => { result.debts[debt.id] = debt.openedOn <= date ? debt.openingPence : 0; });
      latest(list).filter(event => event.date <= date).forEach(event => event.legs.forEach(leg => { result[leg.kind][leg.id] += leg.pence; }));
      return result;
    }
    function validateLedger(list) {
      const state = { accounts: {}, debts: {} };
      accounts.forEach(account => { state.accounts[account.id] = account.openingPence; });
      debts.forEach(debt => { state.debts[debt.id] = debt.openingPence; });
      latest(list).forEach(event => {
        event.legs.forEach(leg => {
          const library = leg.kind === 'accounts' ? accounts : debts;
          const target = library.find(item => item.id === leg.id);
          if (!target || target.openedOn > event.date) throw new Error('This date is before the selected account or debt was added.');
          state[leg.kind][leg.id] += leg.pence;
          if (!Number.isSafeInteger(state[leg.kind][leg.id])) throw new Error('This amount is too large to record accurately.');
          if (state[leg.kind][leg.id] < 0) throw new Error(leg.kind === 'debts' ? 'This payment would exceed the debt balance on ' + event.date + '.' : 'This would leave ' + target.name + ' below zero on ' + event.date + '. Check its balance and earlier entries.');
        });
      });
    }
    function makeEvent(input, previous) {
      const allowed = ['income', 'expense', 'transfer', 'debt-payment', 'debt-interest'];
      if (!allowed.includes(input.type)) throw new Error('Choose an income, expense, transfer, debt payment or interest entry.');
      const date = checkDate(input.date);
      const amountPence = pence(input.amount, 'Amount');
      if (amountPence <= 0) throw new Error('Amount must be more than zero.');
      const account = accounts.find(item => item.id === input.accountId);
      const destination = accounts.find(item => item.id === input.toAccountId);
      const debt = debts.find(item => item.id === input.debtId);
      if (input.type !== 'debt-interest' && !account) throw new Error('Choose an account.');
      if (input.type === 'transfer' && (!destination || destination.id === account.id)) throw new Error('Choose a different destination account.');
      if (['debt-payment', 'debt-interest'].includes(input.type) && !debt) throw new Error('Choose a debt.');
      const legs = [];
      if (input.type === 'income') legs.push({ kind: 'accounts', id: account.id, pence: amountPence });
      if (input.type === 'expense') legs.push({ kind: 'accounts', id: account.id, pence: -amountPence });
      if (input.type === 'transfer') legs.push({ kind: 'accounts', id: account.id, pence: -amountPence }, { kind: 'accounts', id: destination.id, pence: amountPence });
      if (input.type === 'debt-payment') legs.push({ kind: 'accounts', id: account.id, pence: -amountPence }, { kind: 'debts', id: debt.id, pence: -amountPence });
      if (input.type === 'debt-interest') legs.push({ kind: 'debts', id: debt.id, pence: amountPence });
      const id = uid('money');
      return { id, rootId: previous ? previous.rootId : id, supersedes: previous ? previous.id : null, sequence: previous ? previous.sequence : ++sequence, date, type: input.type, amount: pounds(amountPence), amountPence, accountId: account ? account.id : null, toAccountId: input.type === 'transfer' ? destination.id : null, debtId: debt ? debt.id : null, accountName: account ? account.name : '', toAccountName: input.type === 'transfer' ? destination.name : '', debtName: debt ? debt.name : '', category: String(input.category || (input.type === 'expense' ? 'Other' : input.type)).trim().slice(0, 80), note: String(input.note || '').trim().slice(0, 1000), operationId: input.operationId ? String(input.operationId) : null, legs };
    }
    function appendEvent(event) {
      if (event.operationId && versions.some(item => item.operationId === event.operationId)) throw new Error('This entry has already been recorded. Balances are unchanged.');
      validateLedger(versions.concat(event));
      versions.push(event);
      return { ok: true, entity: copy(event) };
    }
    const detailField = (input,key,existing,fallback) => Object.prototype.hasOwnProperty.call(input,key)&&input[key]!==undefined ? input[key] : existing&&existing[key]!==undefined ? existing[key] : fallback;
    function detailText(value,label,max=120) {
      if(value===null||value===undefined)return '';
      if(typeof value!=='string'||value.trim().length>max)throw new Error(label+' must be text of up to '+max+' characters.');
      return value.trim();
    }
    function detailNumber(value,label,max,integer=false) {
      if(value===null||value===undefined||value===''||(typeof value==='string'&&value.trim()===''))return null;
      if(!['string','number'].includes(typeof value)||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>max||(integer&&!Number.isInteger(Number(value))))throw new Error(label+' must be '+(integer?'a whole number':'a number')+' between 0 and '+max+'.');
      return Number(value);
    }
    function detailDate(value,label) {
      if(value===null||value===undefined||value==='')return null;
      if(!dateOK(value)||value<'1970-01-01'||value>'2199-12-31')throw new Error('Choose a valid '+label+'.');
      return value;
    }
    function reviewValue(value) {
      if(!['checked','needs-checking'].includes(value))throw new Error('Choose whether these details have been checked.');
      return value;
    }
    function accountDetails(input,existing={}) {
      const target=detailField(input,'savingsTarget',existing,existing.savingsTargetPence==null?null:pounds(existing.savingsTargetPence));
      return {provider:detailText(detailField(input,'provider',existing,''),'Provider'),subtype:detailText(detailField(input,'subtype',existing,''),'Account detail'),aer:detailNumber(detailField(input,'aer',existing,null),'Savings AER',1000),savingsTargetPence:target===null||target===''?null:pence(target,'Savings target'),investmentNote:detailText(detailField(input,'investmentNote',existing,''),'Holdings or investment note',2000),reviewStatus:reviewValue(detailField(input,'reviewStatus',existing,'checked'))};
    }
    function debtDetails(input,existing={}) {
      const kind=detailField(input,'kind',existing,'other');
      if(!['loan','card','overdraft','other'].includes(kind))throw new Error('Choose loan, card, overdraft or other debt.');
      const paymentDay=detailNumber(detailField(input,'paymentDay',existing,null),'Payment day',31,true);
      if(paymentDay===0)throw new Error('Payment day must be from 1 to 31, or left blank.');
      const promoEndDate=detailDate(detailField(input,'promoEndDate',existing,null),'promotional rate end date');
      const futureApr=detailNumber(detailField(input,'futureApr',existing,null),'APR after the promotion',1000);
      if(futureApr!==null&&!promoEndDate)throw new Error('Add the promotional rate end date to show when the later APR applies.');
      return {kind,paymentsRemaining:detailNumber(detailField(input,'paymentsRemaining',existing,null),'Payments remaining',1200,true),finalPaymentDate:detailDate(detailField(input,'finalPaymentDate',existing,null),'final payment date'),paymentDay,promoEndDate,futureApr,overpaymentFeeNote:detailText(detailField(input,'overpaymentFeeNote',existing,''),'Overpayment fee note',2000),reviewStatus:reviewValue(detailField(input,'reviewStatus',existing,'checked'))};
    }
    function recordedBalanceDate(kind,item) {
      return latest().filter(event=>event.legs.some(leg=>leg.kind===kind&&leg.id===item.id)).reduce((date,event)=>event.date>date?event.date:date,item.openedOn);
    }
    function accountView(account) { return { id:account.id,name:account.name,type:account.type,openedOn:account.openedOn,balanceDate:recordedBalanceDate('accounts',account),openingBalance:pounds(account.openingPence),balance:pounds(balances().accounts[account.id]),provider:account.provider||'',subtype:account.subtype||'',aer:account.aer??null,savingsTarget:account.savingsTargetPence==null?null:pounds(account.savingsTargetPence),investmentNote:account.investmentNote||'',reviewStatus:account.reviewStatus||'checked' }; }
    function debtView(debt) { return { id:debt.id,name:debt.name,kind:debt.kind||'other',openedOn:debt.openedOn,balanceDate:recordedBalanceDate('debts',debt),openingBalance:pounds(debt.openingPence),balance:pounds(balances().debts[debt.id]),apr:debt.apr,minPayment:pounds(debt.minimumPence),paymentsRemaining:debt.paymentsRemaining??null,finalPaymentDate:debt.finalPaymentDate||null,paymentDay:debt.paymentDay??null,promoEndDate:debt.promoEndDate||null,futureApr:debt.futureApr??null,overpaymentFeeNote:debt.overpaymentFeeNote||'',reviewStatus:debt.reviewStatus||'checked' }; }
    function planView() {
      const debtBalances = balances().debts;
      const minimumPence = debts.reduce((sum, debt) => sum + (debtBalances[debt.id] > 0 ? debt.minimumPence : 0), 0);
      const allocatedPence = ['essentials', 'flexible', 'extraDebt', 'savings', 'investment'].reduce((sum, key) => sum + pence(monthlyPlan[key], key), minimumPence);
      return { ...copy(monthlyPlan), minimumDebt: pounds(minimumPence), totalAllocated: pounds(allocatedPence), leftover: pounds(pence(monthlyPlan.income, 'Income') - allocatedPence) };
    }
    function netWorth(date = TODAY) {
      const value = balances(date);
      const sumType = type => accounts.filter(account => account.type === type).reduce((sum, account) => sum + value.accounts[account.id], 0);
      const cash = sumType('current');
      const savings = sumType('savings');
      const investments = sumType('investment');
      const assets = cash + savings + investments;
      const debt = Object.values(value.debts).reduce((sum, amount) => sum + amount, 0);
      return { date, cash: pounds(cash), savings: pounds(savings), investments: pounds(investments), assets: pounds(assets), debt: pounds(debt), net: pounds(assets - debt) };
    }
    function month(key) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return { income: 0, spending: 0, grossSpending: 0, refunds: 0, transfers: 0, savingsAdded: 0, investmentAdded: 0, debtPaid: 0, byCategory: [], transactions: [] };
      const events = latest().filter(event => event.date.slice(0, 7) === key);
      const sumPence = type => events.filter(event => event.type === type).reduce((sum, event) => sum + event.amountPence, 0);
      const sumType = type => pounds(sumPence(type));
      const netTransfers = type => pounds(events.filter(event => event.type === 'transfer').reduce((sum, event) => sum + event.legs.filter(leg => accounts.find(account => account.id === leg.id)?.type === type).reduce((value, leg) => value + leg.pence, 0), 0));
      const categories = {};
      events.filter(event => ['expense','refund'].includes(event.type)).forEach(event => { categories[event.category] = (categories[event.category] || 0) + (event.type==='refund'?-event.amountPence:event.amountPence); });
      return { income: sumType('income'), spending: pounds(sumPence('expense')-sumPence('refund')), grossSpending: sumType('expense'), refunds: sumType('refund'), transfers: sumType('transfer'), savingsAdded: netTransfers('savings'), investmentAdded: netTransfers('investment'), debtPaid: sumType('debt-payment'), byCategory: Object.entries(categories).map(([category, amount]) => ({ category, amount: pounds(amount) })).sort((a, b) => b.amount - a.amount), transactions: copy(events.slice().reverse()) };
    }
    function monthDate(offset) {
      const parts = TODAY.split('-').map(Number);
      return new Date(Date.UTC(parts[0], parts[1] - 1 + offset, 1)).toISOString().slice(0, 10);
    }
    function history(options = {}) {
      const openings=accounts.concat(debts).map(item=>item.openedOn).sort();if(!openings.length)return [];const firstRecorded= openings[0];
      const count = Math.max(1, Math.min(1200, Number.isInteger(options.months) ? options.months : 12));
      return Array.from({ length: count }, (_, index) => {
        const start = monthDate(index - count + 1);
        const parts = start.split('-').map(Number);
        const end = new Date(Date.UTC(parts[0], parts[1], 0)).toISOString().slice(0, 10);
        return netWorth(end > TODAY ? TODAY : end);
      }).filter(row=>row.date>=firstRecorded);
    }
    function forecastApr(debt, date) {
      const hasFutureRate = debt.futureApr !== null && debt.futureApr !== undefined;
      return debt.promoEndDate && hasFutureRate && date > debt.promoEndDate ? debt.futureApr : debt.apr;
    }
    function projectDebt(method = 'avalanche', extra = monthlyPlan.extraDebt) {
      return protect(() => {
        if (!['avalanche', 'snowball'].includes(method)) throw new Error('Choose highest interest first or smallest balance first.');
        const extraPence = pence(extra, 'Extra monthly payment');
        const current = balances().debts;
        const active = debts.filter(debt => current[debt.id] > 0).map(debt => ({ ...debt, remaining: current[debt.id] }));
        const rank = date => (a, b) => method === 'avalanche' ? forecastApr(b, date) - forecastApr(a, date) || a.remaining - b.remaining : a.remaining - b.remaining || forecastApr(b, date) - forecastApr(a, date);
        active.sort(rank(TODAY));
        const order = active.map(debt => debt.id);
        const ratesAtStart = Object.fromEntries(active.map(debt => [debt.id, forecastApr(debt, TODAY)]));
        const rateWarnings = active.flatMap(debt => {
          const hasFutureRate = debt.futureApr !== null && debt.futureApr !== undefined;
          if (debt.promoEndDate && !hasFutureRate) return [debt.name + ': the rate after ' + debt.promoEndDate + ' is unknown. This estimate keeps the entered APR; the outcome could change.'];
          if (!debt.promoEndDate && hasFutureRate) return [debt.name + ': an APR after promotion is entered without an end date. This estimate keeps the current APR until that date is supplied.'];
          return [];
        });
        const monthlyBudget = active.reduce((sum, debt) => sum + debt.minimumPence, extraPence);
        const schedule = [{ month: 0, date: TODAY, remaining: pounds(active.reduce((sum, debt) => sum + debt.remaining, 0)), payment: 0, interest: 0, allocations: [], priority: order.slice() }];
        let totalInterest = 0;
        let totalPaid = 0;
        const result = (status, months, debtFreeDate) => ({ ok: true, status, months, debtFreeDate, totalInterest: pounds(totalInterest), totalPaid: pounds(totalPaid), monthlyPayment: active.length ? pounds(monthlyBudget) : 0, order, ratesAtStart, rateWarnings, schedule });
        if (!active.length) return result('paid-off', 0, TODAY);
        for (let monthNumber = 1; monthNumber <= 600; monthNumber++) {
          const forecastDate = monthDate(monthNumber);
          let monthlyInterest = 0;
          let payment = 0;
          let budget = monthlyBudget;
          const allocation = new Map();
          active.forEach(debt => {
            const apr = forecastApr(debt, forecastDate);
            const interest = Math.round(debt.remaining * apr / 1200);
            debt.remaining += interest;
            monthlyInterest += interest;
            allocation.set(debt.id, { debtId: debt.id, apr, interest: pounds(interest), paymentPence: 0 });
          });
          if (active.some(debt => !Number.isSafeInteger(debt.remaining))) return result('not-clearing', null, null);
          // Rates switch for the first forecast month after the entered promotion end.
          // Re-rank the copied balances so a rate change can change the extra-payment priority.
          active.sort(rank(forecastDate));
          const priority = active.filter(debt => debt.remaining > 0).map(debt => debt.id);
          active.forEach(debt => {
            const amount = Math.min(debt.remaining, debt.minimumPence, budget);
            debt.remaining -= amount;
            budget -= amount;
            payment += amount;
            allocation.get(debt.id).paymentPence += amount;
          });
          active.forEach(debt => {
            const amount = Math.min(debt.remaining, budget);
            debt.remaining -= amount;
            budget -= amount;
            payment += amount;
            allocation.get(debt.id).paymentPence += amount;
          });
          const remaining = active.reduce((sum, debt) => sum + debt.remaining, 0);
          totalInterest += monthlyInterest;
          totalPaid += payment;
          const allocations = active.map(debt => { const row = allocation.get(debt.id); return { debtId: debt.id, apr: row.apr, interest: row.interest, payment: pounds(row.paymentPence), remaining: pounds(debt.remaining) }; });
          schedule.push({ month: monthNumber, date: forecastDate, remaining: pounds(remaining), payment: pounds(payment), interest: pounds(monthlyInterest), allocations, priority });
          if (remaining === 0) return result('paid-off', monthNumber, forecastDate);
          if (payment === 0) break;
        }
        return result('not-clearing', null, null);
      });
    }
    function projectContributions(options = {}) {
      return protect(() => {
        const count = options.months === undefined ? 12 : Number(options.months);
        if (!Number.isInteger(count) || count < 1 || count > 1200) throw new Error('Choose between 1 and 1200 months.');
        const monthlySavings = pence(options.savings === undefined ? monthlyPlan.savings : options.savings, 'Savings contribution');
        const monthlyInvestment = pence(options.investment === undefined ? monthlyPlan.investment : options.investment, 'Investment contribution');
        const current = netWorth();
        const saved = pence(current.savings, 'Savings');
        const invested = pence(current.investments, 'Investments');
        const schedule = Array.from({ length: count + 1 }, (_, index) => ({ month: index, date: index ? monthDate(index) : TODAY, savings: pounds(saved + monthlySavings * index), investments: pounds(invested + monthlyInvestment * index), total: pounds(saved + invested + (monthlySavings + monthlyInvestment) * index), contributions: pounds((monthlySavings + monthlyInvestment) * index) }));
        return { ok: true, months: count, savingsAdded: pounds(monthlySavings * count), investmentAdded: pounds(monthlyInvestment * count), totalAdded: pounds((monthlySavings + monthlyInvestment) * count), schedule };
      });
    }
    function reconciliations(kind=null,id=null) {
      const events=latest();
      return events.filter(event=>Object.prototype.hasOwnProperty.call(event,'observedBalancePence')).filter(event=>!kind||event.legs[0].kind===kind).filter(event=>!id||event.legs[0].id===id).map(check=>{
        const leg=check.legs[0],library=leg.kind==='accounts'?accounts:debts,item=library.find(row=>row.id===leg.id);
        // Later same-day entries are after this observation. Earlier dated inserts
        // and corrected versions are re-evaluated without rewriting the evidence.
        const recordedPence=events.filter(event=>event.date<check.date||(event.date===check.date&&event.sequence<=check.sequence)).reduce((total,event)=>total+event.legs.filter(row=>row.kind===leg.kind&&row.id===leg.id).reduce((sum,row)=>sum+row.pence,0),item.openingPence);
        const differencePence=recordedPence-check.observedBalancePence;
        return {id:check.id,kind:leg.kind,itemId:leg.id,name:check.accountName||check.debtName,date:check.date,observedBalance:pounds(check.observedBalancePence),recordedBalance:pounds(recordedPence),difference:pounds(differencePence),status:differencePence===0?'matched':'discrepancy'};
      });
    }
    function adjustment(kind, id, input) {
      const list = kind === 'accounts' ? accounts : debts;
      const item = list.find(entry => entry.id === id);
      if (!item) throw new Error('This account or debt could not be found.');
      const date = checkDate(input.date || TODAY);
      const desired = pence(input.balance, 'New balance');
      if (date < item.openedOn) throw new Error('This date is before the opening balance.');
      const delta = desired - balances(date)[kind][id];
      // Even an exact match is evidence worth retaining. Zero is not a missing check.
      const eventId = uid('money');
      const event = { id: eventId, rootId: eventId, supersedes: null, sequence: ++sequence, date, type: kind === 'accounts' ? 'valuation' : 'debt-adjustment', amount: pounds(Math.abs(delta)), amountPence: Math.abs(delta), adjustment: pounds(delta), observedBalancePence: desired, accountId: kind === 'accounts' ? id : null, toAccountId: null, debtId: kind === 'debts' ? id : null, accountName: kind === 'accounts' ? item.name : '', toAccountName: '', debtName: kind === 'debts' ? item.name : '', category: 'Balance adjustment', note: String(input.note || '').trim().slice(0, 1000), operationId: input.operationId ? String(input.operationId) : null, legs: [{ kind, id, pence: delta }] };
      return appendEvent(event);
    }

    function snapshot(){return copy({schema:'lifeos.money.v1',accounts,debts,versions,sequence,monthlyPlan});}
    function restore(data,options={}){return LifeSnapshotCheck.protect(()=>{
      const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.money.v1'),a=C.indexed(s.accounts,'accounts'),d=C.indexed(s.debts,'debts');
      C.integer(s.sequence);C.object(s.monthlyPlan);for(const key of ['income','essentials','flexible','extraDebt','savings','investment'])C.money(s.monthlyPlan[key]);
      for(const account of a.values()){C.text(account.name,80,true);C.one(account.type,['current','savings','investment']);C.integer(account.openingPence);C.date(account.openedOn,true);for(const key of ['provider','subtype'])C.optional(account[key],v=>C.text(v,120));C.optional(account.aer,v=>C.number(v,0,1000));C.optional(account.savingsTargetPence,C.integer);C.optional(account.investmentNote,v=>C.text(v,2000));C.optional(account.reviewStatus,v=>C.one(v,['checked','needs-checking']));}
      for(const debt of d.values()){C.text(debt.name,80,true);C.integer(debt.openingPence);C.date(debt.openedOn,true);C.number(debt.apr,0,1000);C.integer(debt.minimumPence);C.optional(debt.kind,v=>C.one(v,['loan','card','overdraft','other']));C.optional(debt.paymentsRemaining,v=>C.integer(v,0,1200));C.optional(debt.paymentDay,v=>C.integer(v,1,31));C.optional(debt.finalPaymentDate,C.date);C.optional(debt.promoEndDate,C.date);C.optional(debt.futureApr,v=>{C.number(v,0,1000);C.check(!!debt.promoEndDate,'Future APR needs a date.');});C.optional(debt.overpaymentFeeNote,v=>C.text(v,2000));C.optional(debt.reviewStatus,v=>C.one(v,['checked','needs-checking']));}
      const refundReferences=[];
      const current=C.chain(C.list(s.versions,'money versions'),(event,previous)=>{
        C.date(event.date,true);C.check(event.sequence<=s.sequence,'Journal sequence is behind its events.');C.one(event.type,['income','expense','refund','transfer','debt-payment','debt-interest','valuation','debt-adjustment']);const observation=Object.prototype.hasOwnProperty.call(event,'observedBalancePence');C.integer(event.amountPence,observation?0:1);if(observation){C.check(['valuation','debt-adjustment'].includes(event.type),'Only a balance check can retain a statement total.');C.integer(event.observedBalancePence);}C.money(event.amount);C.check(event.amount===event.amountPence/100,'Money display and integer amount disagree.');C.text(event.category,80);C.text(event.note,1000);for(const key of ['accountName','toAccountName','debtName'])C.text(event[key],80);
        for(const [key,map] of [['accountId',a],['toAccountId',a],['debtId',d]])if(event[key]!==null){C.id(event[key]);C.check(map.has(event[key]),'Money record references a missing account or debt.');}
        const n=event.amountPence;let expected;
        if(event.type==='income')expected=[{kind:'accounts',id:event.accountId,pence:n}];
        if(event.type==='refund'){
          C.check(!previous&&event.supersedes===null,'A receipt refund cannot be rewritten.');C.id(event.purchaseVersionId);C.id(event.refundOfTransactionRootId);C.check(event.toAccountId===null&&event.debtId===null&&['current','savings'].includes(a.get(event.accountId)?.type),'Refunds need a current or savings account.');
          expected=[{kind:'accounts',id:event.accountId,pence:n}];refundReferences.push(event);
        }else C.check(!Object.prototype.hasOwnProperty.call(event,'refundOfTransactionRootId'),'Only a refund may reference an expense reversal.');
        C.check(!previous||previous.type!=='refund','A receipt refund cannot be rewritten.');
        if(event.type==='expense')expected=[{kind:'accounts',id:event.accountId,pence:-n}];
        if(event.type==='transfer'){C.check(event.accountId!==event.toAccountId,'Transfer accounts must differ.');expected=[{kind:'accounts',id:event.accountId,pence:-n},{kind:'accounts',id:event.toAccountId,pence:n}];}
        if(event.type==='debt-payment')expected=[{kind:'accounts',id:event.accountId,pence:-n},{kind:'debts',id:event.debtId,pence:-n}];
        if(event.type==='debt-interest')expected=[{kind:'debts',id:event.debtId,pence:n}];
        if(['valuation','debt-adjustment'].includes(event.type)){C.number(event.adjustment,-Number.MAX_SAFE_INTEGER/100,Number.MAX_SAFE_INTEGER/100);C.check(Math.round(Math.abs(event.adjustment)*100)===n&&Math.abs(Math.abs(event.adjustment)*100-n)<.000001,'Invalid balance adjustment.');expected=[{kind:event.type==='valuation'?'accounts':'debts',id:event.type==='valuation'?event.accountId:event.debtId,pence:Math.round(event.adjustment*100)}];}
        C.check(JSON.stringify(event.legs)===JSON.stringify(expected),'Invalid signed money legs.');for(const leg of expected){const item=(leg.kind==='accounts'?a:d).get(leg.id);C.check(item&&item.openedOn<=event.date,'Money entry predates its account or debt.');}
      });
      const currentByRoot=new Map(current.map(event=>[event.rootId,event])),refundedPence=new Map();
      for(const refund of refundReferences){
        const original=currentByRoot.get(refund.refundOfTransactionRootId);
        C.check(original&&original.type==='expense'&&original.date<=refund.date,'Refunds must refer to an earlier expense.');
        const total=(refundedPence.get(original.rootId)||0)+refund.amountPence;C.integer(total,0,original.amountPence);refundedPence.set(original.rootId,total);
      }
      const balances={accounts:new Map([...a].map(([id,row])=>[id,row.openingPence])),debts:new Map([...d].map(([id,row])=>[id,row.openingPence]))};
      current.sort((x,y)=>x.date.localeCompare(y.date)||x.sequence-y.sequence).forEach(event=>event.legs.forEach(leg=>{const value=balances[leg.kind].get(leg.id)+leg.pence;C.integer(value);balances[leg.kind].set(leg.id,value);}));
      if(options.validateOnly)return {ok:true};
      C.replace(accounts,s.accounts);C.replace(debts,s.debts);C.replace(versions,s.versions);sequence=s.sequence;monthlyPlan=s.monthlyPlan;return {ok:true};
    });}

    const api = {
      snapshot, restore,
      get accounts() { return accounts.map(accountView); },
      get debts() { return debts.map(debtView); },
      get transactions() { return copy(latest().reverse()); },
      get transactionVersions() { return copy(versions); },
      get plan() { return planView(); },
      addAccount(input) { return protect(() => {
        const name=String(input.name||'').trim().slice(0,80);
        if(!name)throw new Error('Give this account a name.');
        if(!['current','savings','investment'].includes(input.type))throw new Error('Choose a current, savings or investment account.');
        const details=accountDetails(input);
        const entity={id:uid('account'),name,type:input.type,openingPence:pence(input.balance,'Opening balance'),openedOn:checkDate(input.date||TODAY),...details};
        accounts.push(entity);
        return {ok:true,entity:accountView(entity)};
      }); },
      editAccount(id,patch) { return protect(() => {
        const account=accounts.find(item=>item.id===id);
        if(!account)throw new Error('This account could not be found.');
        if(['balance','date','openedOn','openingBalance','openingPence'].some(key=>Object.prototype.hasOwnProperty.call(patch,key)))throw new Error('Use Check balance to record a dated balance change. Account details do not rewrite the opening record.');
        if(patch.type!==undefined&&patch.type!==account.type)throw new Error('Keep the account group used by this account. Earlier money records use that group.');
        const name=patch.name===undefined?account.name:String(patch.name).trim().slice(0,80);
        if(!name)throw new Error('Give this account a name.');
        const details=accountDetails(patch,account);
        Object.assign(account,{name,...details});
        return {ok:true,entity:accountView(account)};
      }); },
      adjustAccountBalance(id, input) { return protect(() => adjustment('accounts', id, input)); },
      addDebt(input) { return protect(() => {
        const name=String(input.name||'').trim().slice(0,80);
        if(!name)throw new Error('Give this debt a name.');
        const details=debtDetails(input);
        const entity={id:uid('debt'),name,openingPence:pence(input.balance,'Debt balance'),apr:aprValue(input.apr),minimumPence:pence(input.minPayment,'Required monthly payment'),openedOn:checkDate(input.date||TODAY),...details};
        debts.push(entity);
        return {ok:true,entity:debtView(entity)};
      }); },
      updateDebt(id,patch) { return protect(() => {
        const debt=debts.find(item=>item.id===id);
        if(!debt)throw new Error('This debt could not be found.');
        if(['openedOn','openingBalance','openingPence'].some(key=>Object.prototype.hasOwnProperty.call(patch,key)&&patch[key]!==debtView(debt)[key]&&patch[key]!==debt[key]))throw new Error('The opening record stays unchanged. Use a dated balance check for a new statement.');
        const name=patch.name===undefined?debt.name:String(patch.name).trim().slice(0,80);
        if(!name)throw new Error('Give this debt a name.');
        const apr=patch.apr===undefined?debt.apr:aprValue(patch.apr);
        const minimumPence=patch.minPayment===undefined?debt.minimumPence:pence(patch.minPayment,'Required monthly payment');
        const details=debtDetails(patch,debt);
        if(patch.balance!==undefined){const result=adjustment('debts',id,patch);if(!result.ok)return result;}
        Object.assign(debt,{name,apr,minimumPence,...details});
        return {ok:true,entity:debtView(debt)};
      }); },
      addTransaction(input) { return protect(() => appendEvent(makeEvent(input))); },
      correctTransaction(id, input) { return protect(() => {
        const previous = latest().find(event => event.id === id);
        if (!previous) throw new Error('This entry has already changed. Open its latest version.');
        if (['valuation', 'debt-adjustment'].includes(previous.type)) throw new Error('Adjust the current balance to correct a balance adjustment.');
        if(previous.type==='refund'||versions.some(event=>event.type==='refund'&&event.refundOfTransactionRootId===previous.rootId))throw new Error('This entry has receipt refund history. Review it from the connected receipt; ordinary money corrections cannot rewrite it.');
        return appendEvent(makeEvent(input, previous));
      }); },
      setPlan(input) { return protect(() => {
        const next = {};
        Object.keys(monthlyPlan).forEach(key => { next[key] = pounds(pence(input[key], key)); });
        monthlyPlan = next;
        return { ok: true, entity: planView() };
      }); },
      month, netWorth, history, projectDebt, projectContributions, reconciliations
    };
    return api;
  })();

    // Planned commitments are a live library, separate from the actual money journal.
    // Dates are calendar dates. Monthly averages never create transactions.
    const RecurringMoneyDemo = (() => {
      const history = [];
      const frequencies = { weekly: 52, fortnightly: 26, 'four-weekly': 13, monthly: 12, quarterly: 4, yearly: 1 };
      const buckets = ['income', 'essentials', 'flexible', 'savings', 'investment'];
      const copy = value => JSON.parse(JSON.stringify(value));
      const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
      const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1970 && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
      const stamp = date => Date.parse(date + 'T12:00:00Z');
      const toDate = milliseconds => new Date(milliseconds).toISOString().slice(0, 10);
      const success = entity => ({ ok: true, entity: copy(entity) });
      const protect = fn => { try { return fn(); } catch (error) { return { ok: false, error: error.message || String(error) }; } };
      function pence(value, label, zero = false) {
        if (value === '' || value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value.trim()))) throw new Error(label + ' needs an amount with no more than two decimal places.');
        const number = Number(value), integer = Math.round(number * 100);
        if (!Number.isFinite(number) || !Number.isSafeInteger(integer) || Math.abs(number * 100 - integer) > 0.000001 || integer < (zero ? 0 : 1)) throw new Error(label + (zero ? ' cannot be negative.' : ' must be more than zero, with no more than two decimal places.'));
        return integer;
      }
      function latest() {
        const map = new Map();
        history.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      }
      const active = item => item.status === 'active' && item.reviewStatus === 'checked';
      function bucketTotals() { return { income: 0, essentials: 0, flexible: 0, savings: 0, investment: 0 }; }
      function upsert(input) {
        return protect(() => {
          if (!input || typeof input !== 'object') throw new Error('Enter the recurring item details.');
          const id = input.id || uid('recurring');
          if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('This recurring item has an invalid identifier.');
          const previous = latest().find(item => item.id === id);
          const name = String(input.name || '').trim().slice(0, 100);
          if (!name) throw new Error('Give this recurring item a name.');
          if (!['income', 'bill', 'subscription', 'contribution'].includes(input.kind)) throw new Error('Choose income, a bill, a subscription or a contribution.');
          if (!buckets.includes(input.bucket)) throw new Error('Choose where this belongs in the monthly plan.');
          if ((input.kind === 'income' && input.bucket !== 'income') || (['bill', 'subscription'].includes(input.kind) && !['essentials', 'flexible'].includes(input.bucket)) || (input.kind === 'contribution' && !['savings', 'investment'].includes(input.bucket))) throw new Error('This plan category does not match the recurring item type.');
          if (!own(frequencies, input.frequency)) throw new Error('Choose how often this happens.');
          if (!dateOK(input.startDate)) throw new Error('Choose a valid first due date.');
          const endDate = input.endDate || null;
          if (endDate && (!dateOK(endDate) || endDate < input.startDate)) throw new Error('The last due date must be on or after the first due date.');
          const status = input.status || 'active', reviewStatus = input.reviewStatus || 'needs-checking';
          if (!['active', 'paused'].includes(status)) throw new Error('Choose active or paused.');
          if (!['checked', 'needs-checking'].includes(reviewStatus)) throw new Error('Choose whether these figures have been checked.');
          const entity = { id, versionId: uid('recurring-version'), revision: previous ? previous.revision + 1 : 1, supersedes: previous ? previous.versionId : null, name, kind: input.kind, bucket: input.bucket, amount: pence(input.amount, 'Amount') / 100, frequency: input.frequency, startDate: input.startDate, endDate, accountId: input.accountId ? String(input.accountId) : null, toAccountId: input.kind === 'contribution' && input.toAccountId ? String(input.toAccountId) : null, estimated: Boolean(input.estimated), note: String(input.note || '').trim().slice(0, 1000), status, reviewStatus, createdOn: previous ? previous.createdOn : TODAY, updatedOn: TODAY };
          history.push(entity);
          return success(entity);
        });
      }
      function monthlyAverage() {
        const annualPence = bucketTotals();
        latest().filter(item => active(item) && (!item.endDate || item.endDate >= TODAY)).forEach(item => { annualPence[item.bucket] += pence(item.amount, 'Amount') * frequencies[item.frequency]; });
        return Object.fromEntries(buckets.map(bucket => [bucket, Math.round(annualPence[bucket] / 12) / 100]));
      }
      function dueAt(item, index) {
        const dayStep = { weekly: 7, fortnightly: 14, 'four-weekly': 28 }[item.frequency];
        if (dayStep) return toDate(stamp(item.startDate) + index * dayStep * 86400000);
        const monthStep = { monthly: 1, quarterly: 3, yearly: 12 }[item.frequency];
        const anchor = new Date(stamp(item.startDate));
        const month = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index * monthStep, 1, 12));
        const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 12)).getUTCDate();
        month.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
        return month.toISOString().slice(0, 10);
      }
      function firstIndex(item, from) {
        const dayStep = { weekly: 7, fortnightly: 14, 'four-weekly': 28 }[item.frequency];
        if (dayStep) return Math.max(0, Math.floor((stamp(from) - stamp(item.startDate)) / (dayStep * 86400000)));
        const monthStep = { monthly: 1, quarterly: 3, yearly: 12 }[item.frequency];
        const monthDifference = (Number(from.slice(0, 4)) - Number(item.startDate.slice(0, 4))) * 12 + Number(from.slice(5, 7)) - Number(item.startDate.slice(5, 7));
        return Math.max(0, Math.floor(monthDifference / monthStep));
      }
      function recordedMap() {
        const current = new Map(MoneyDemo.transactions.map(event => [event.rootId || event.id, event]));
        const result = new Map();
        MoneyDemo.transactionVersions.forEach(event => {
          if (!event.operationId) return;
          const latestEvent = current.get(event.rootId || event.id);
          result.set(event.operationId, latestEvent ? latestEvent.id : event.id);
        });
        return result;
      }
      function occurrences(from, to) {
        if (!dateOK(from) || !dateOK(to) || from > to) return [];
        const recorded = recordedMap(), result = [];
        latest().filter(active).forEach(item => {
          const until = item.endDate && item.endDate < to ? item.endDate : to;
          if (item.startDate > until) return;
          let index = firstIndex(item, from);
          while (true) {
            const date = dueAt(item, index++);
            if (date > until || !dateOK(date)) break;
            if (date < from) continue;
            const operationId = 'recurring:' + item.id + ':' + date;
            result.push({ id: item.id + '@' + date, itemId: item.id, name: item.name, date, kind: item.kind, bucket: item.bucket, amount: item.amount, accountId: item.accountId, toAccountId: item.toAccountId, estimated: item.estimated, note: item.note, recorded: recorded.has(operationId), recordedTransactionId: recorded.get(operationId) || null, operationId });
          }
        });
        return result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
      }
      function transactionForOccurrence(id) {
        return protect(() => {
          const split = String(id).lastIndexOf('@'), date = String(id).slice(split + 1);
          const occurrence = occurrences(date, date).find(item => item.id === id);
          if (!occurrence) throw new Error('This occurrence is no longer scheduled. Check its current recurring details.');
          if (date > TODAY) throw new Error('This is a future plan. Record it on or after its due date.');
          if (occurrence.recorded) throw new Error('This occurrence has already been recorded. Open the money record to review or correct it.');
          const account = MoneyDemo.accounts.find(item => item.id === occurrence.accountId);
          if (!account) throw new Error('Choose the account for this recurring item before recording it.');
          if (date < account.openedOn) throw new Error('This due date is before the account opening balance.');
          let toAccountId = null;
          if (occurrence.kind === 'contribution') {
            const destination = MoneyDemo.accounts.find(item => item.id === occurrence.toAccountId);
            if (!destination || destination.id === account.id) throw new Error('Choose a different destination account for this contribution.');
            if (destination.type !== occurrence.bucket) throw new Error('Choose a ' + (occurrence.bucket === 'investment' ? 'investment' : 'savings') + ' destination account.');
            if (date < destination.openedOn) throw new Error('This due date is before the destination opening balance.');
            toAccountId = destination.id;
          }
          return { ok: true, transaction: { type: occurrence.kind === 'income' ? 'income' : occurrence.kind === 'contribution' ? 'transfer' : 'expense', date, amount: occurrence.amount, accountId: account.id, toAccountId, category: occurrence.name, note: occurrence.note || occurrence.name, operationId: occurrence.operationId } };
        });
      }
      function month(key) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return { ...bucketTotals(), spending: 0, contributions: 0, outgoings: 0, occurrences: [] };
        const first = key + '-01';
        const last = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0, 12)).toISOString().slice(0, 10);
        const rows = occurrences(first, last), totals = bucketTotals();
        rows.forEach(item => { totals[item.bucket] += pence(item.amount, 'Amount'); });
        const values = Object.fromEntries(buckets.map(bucket => [bucket, totals[bucket] / 100]));
        return { ...values, spending: (totals.essentials + totals.flexible) / 100, contributions: (totals.savings + totals.investment) / 100, outgoings: (totals.essentials + totals.flexible + totals.savings + totals.investment) / 100, occurrences: rows };
      }
      function applyToPlan(allowances) {
        return protect(() => {
          if (!allowances || typeof allowances !== 'object') throw new Error('Enter the additional monthly allowances.');
          const average = monthlyAverage(), next = { income: average.income };
          ['essentials', 'flexible', 'savings', 'investment'].forEach(bucket => { next[bucket] = (pence(average[bucket], bucket, true) + pence(allowances[bucket], 'Additional ' + bucket, true)) / 100; });
          next.extraDebt = pence(allowances.extraDebt, 'Extra debt payment', true) / 100;
          return MoneyDemo.setPlan(next);
        });
      }

      function snapshot(){return copy({schema:'lifeos.recurring-money.v1',versions:history});}
      function restore(data,options={}){return LifeSnapshotCheck.protect(()=>{
        const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.recurring-money.v1'),latest=new Map(),ids=new Set();
        for(const row of C.list(s.versions,'recurring versions')){C.object(row);C.id(row.id);C.id(row.versionId);C.check(!ids.has(row.versionId),'Repeated recurring version.');const prior=latest.get(row.id);C.integer(row.revision,1);C.check(prior?row.revision===prior.revision+1&&row.supersedes===prior.versionId:row.revision===1&&row.supersedes===null,'Broken recurring revision chain.');C.text(row.name,100,true);C.one(row.kind,['income','bill','subscription','contribution']);C.one(row.bucket,buckets);C.one(row.frequency,Object.keys(frequencies));C.check(row.kind==='income'?row.bucket==='income':row.kind==='contribution'?['savings','investment'].includes(row.bucket):['essentials','flexible'].includes(row.bucket),'Recurring kind and bucket differ.');C.money(row.amount);C.check(row.amount>0,'Recurring amount must be positive.');C.date(row.startDate);C.optional(row.endDate,v=>{C.date(v);C.check(v>=row.startDate,'Recurring date range is reversed.');});C.optional(row.accountId,C.id);C.optional(row.toAccountId,C.id);C.bool(row.estimated);C.one(row.status,['active','paused']);C.one(row.reviewStatus,['checked','needs-checking']);C.text(row.note,1000);C.date(row.createdOn,true);C.date(row.updatedOn,true);C.check(row.updatedOn>=row.createdOn,'Recurring update predates creation.');latest.set(row.id,row);ids.add(row.versionId);}
        if(options.validateOnly)return {ok:true};
        C.replace(history,s.versions);return {ok:true};
      });}

      return { snapshot, restore, get items() { return copy(latest()); }, get versions() { return copy(history); }, upsert, monthlyAverage, occurrences, transactionForOccurrence, month, applyToPlan };
    })();

// Reference-only import. This module has no storage, network, or finance writer access.
// HTML is read as text. It is never inserted into a document or executed.
const MoneyReferenceDemo = (() => {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_LITERAL = 65536;
  const MAX_ITEMS = 512;
  const SCHEMA = 'lifeos.money-reference.v1';
  const KINDS = new Set(['debt', 'income', 'budget', 'proposal', 'unknown']);
  let currentReference = null;

  function fail(message) { throw new Error(message); }
  function utf8Size(value) {
    let bytes = 0;
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      if (c < 128) bytes++;
      else if (c < 2048) bytes += 2;
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < value.length &&
               value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
      if (bytes > MAX_BYTES) return bytes;
    }
    return bytes;
  }
  function textValue(value, limit = 300) {
    if (typeof value !== 'string') fail('A reference text field is invalid.');
    return value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, limit);
  }
  function plainText(value) {
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', pound: '\u00a3' };
    return value.replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, token) => {
      if (token[0] !== '#') return entities[token.toLowerCase()] || all;
      const n = token[1].toLowerCase() === 'x' ? parseInt(token.slice(2), 16) : parseInt(token.slice(1), 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n) : '';
    }).replace(/\s+/g, ' ').trim();
  }
  function numberValue(value, field, max = 1e12) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
      fail('An amount or rate in the reference is invalid (' + field + ').');
    }
    return value;
  }
  function dateValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('The reference date is invalid.');
    const date = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('The reference date is invalid.');
    return value;
  }
  function idValue(value) {
    return textValue(value, 100).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  }
  function item(id, kind, name, fields, note) {
    const record = { id: idValue(id), kind, name: textValue(name), note: textValue(note, 1400), reviewStatus: 'needs-checking' };
    if (!record.name || !KINDS.has(kind)) fail('A reference item has an invalid name or kind.');
    ['amount', 'apr', 'minPayment'].forEach(key => {
      if (fields[key] !== undefined) record[key] = numberValue(fields[key], key, key === 'apr' ? 1000 : 1e12);
    });
    return record;
  }

  // A deliberately small literal reader, not a JavaScript interpreter.
  // Only arrays, plain objects, quoted strings, finite numbers, booleans and null are accepted.
  // Calls, member access, operators, template strings and expressions are rejected.
  function readLiteral(source, start) {
    const input = source.slice(start, start + MAX_LITERAL);
    let pos = 0;
    function skip() {
      while (pos < input.length) {
        if (/\s/.test(input[pos])) { pos++; continue; }
        if (input.slice(pos, pos + 2) === '//') {
          const end = input.indexOf('\n', pos + 2);
          pos = end < 0 ? input.length : end + 1;
        } else if (input.slice(pos, pos + 2) === '/*') {
          const end = input.indexOf('*/', pos + 2);
          if (end < 0) fail('A reference literal has an unfinished comment.');
          pos = end + 2;
        } else break;
      }
    }
    function quoted() {
      const quote = input[pos++];
      let out = '';
      while (pos < input.length) {
        const c = input[pos++];
        if (c === quote) return out;
        if (c === '\n' || c === '\r') fail('A reference string is not a supported literal.');
        if (c !== '\\') out += c;
        else {
          const escaped = input[pos++];
          const simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"', '/': '/' };
          if (Object.prototype.hasOwnProperty.call(simple, escaped)) out += simple[escaped];
          else if (escaped === 'u' || escaped === 'x') {
            const length = escaped === 'u' ? 4 : 2;
            const hex = input.slice(pos, pos + length);
            if (hex.length !== length || !/^[0-9a-f]+$/i.test(hex)) fail('A reference string escape is invalid.');
            out += String.fromCharCode(parseInt(hex, 16));
            pos += length;
          } else fail('A reference string escape is unsupported.');
        }
        if (out.length > 4000) fail('A reference string is too long.');
      }
      fail('A reference literal is incomplete or too large.');
    }
    function value(depth) {
      if (depth > 5) fail('A reference literal is nested too deeply.');
      skip();
      const c = input[pos];
      if (c === "'" || c === '"') return quoted();
      if (c === '[' || c === '{') {
        const array = c === '[';
        const end = array ? ']' : '}';
        const result = array ? [] : Object.create(null);
        pos++;
        skip();
        let count = 0;
        while (input[pos] !== end) {
          if (++count > 256) fail('A reference literal has too many entries.');
          if (array) result.push(value(depth + 1));
          else {
            skip();
            let key;
            if (input[pos] === "'" || input[pos] === '"') key = quoted();
            else {
              const keyMatch = /^[A-Za-z_$][\w$]*/.exec(input.slice(pos));
              if (!keyMatch) fail('A reference object key is unsupported.');
              key = keyMatch[0];
              pos += key.length;
            }
            if (['__proto__', 'prototype', 'constructor'].includes(key) || Object.prototype.hasOwnProperty.call(result, key)) {
              fail('A reference object contains an unsafe or duplicate key.');
            }
            skip();
            if (input[pos++] !== ':') fail('A reference object is not a plain literal.');
            result[key] = value(depth + 1);
          }
          skip();
          if (input[pos] === end) break;
          if (input[pos++] !== ',') fail('Only plain data literals can be imported.');
          skip();
        }
        pos++;
        return result;
      }
      const primitive = /^(true|false|null)(?![\w$])/.exec(input.slice(pos));
      if (primitive) { pos += primitive[0].length; return primitive[0] === 'null' ? null : primitive[0] === 'true'; }
      const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(pos));
      if (number) {
        pos += number[0].length;
        const n = Number(number[0]);
        if (!Number.isFinite(n)) fail('A reference literal contains a non-finite number.');
        return n;
      }
      fail('Only plain data literals can be imported.');
    }
    const result = value(0);
    skip();
    if (input[pos] !== ';') fail('A reference declaration must end after its data literal.');
    return result;
  }
  function declaration(source, name, required = false) {
    const pattern = new RegExp('^\\s*const\\s+' + name + '\\s*=\\s*', 'gm');
    const match = pattern.exec(source);
    if (!match) {
      if (required) fail('This HTML does not contain a supported reference data block.');
      return undefined;
    }
    if (pattern.exec(source)) fail('The reference contains duplicate data declarations.');
    return readLiteral(source, match.index + match[0].length);
  }
  function moneyText(value) { return Number(value.replace(/,/g, '')); }
  function moneyLabel(value) { return '\u00a3' + (Math.round(value * 100) / 100).toFixed(2); }

  function parseHTML(source) {
    const debts = declaration(source, 'DEBTS', true);
    const cuts = declaration(source, 'CUTS', true);
    if (!Array.isArray(debts) || !Array.isArray(cuts) || debts.length === 0) fail('The reference debt or proposal list is invalid.');
    const items = [];
    const notes = [
      'These are old planning references, not current balances, transactions, bills, or completed changes. Every item needs checking.',
      'Proposed cuts are possible monthly savings. A selected checkbox in the old plan does not prove a cancellation or a lower bill.',
      'Aggregate budgets do not establish individual bill amounts. Check statements before creating bills, and avoid counting aggregates alongside their individual bills.',
      'Current savings, investment holdings, and spendable account balances are not confirmed by this plan. Simulation pots starting at zero are assumptions, not actual zero holdings.',
      'Remaining loan terms, settlement amounts, payment dates, and early-repayment conditions are missing. Check them before relying on a payoff projection.',
      'Old assumptions about interest, fixed minimum payments, overpayments, and promotional rates need checking. No old projection is imported as a result.'
    ];
    debts.forEach((debt, index) => {
      if (!debt || typeof debt !== 'object' || Array.isArray(debt)) fail('A reference debt row is invalid.');
      ['bal', 'apr', 'min'].forEach(key => numberValue(debt[key], key, key === 'apr' ? 1000 : 1e12));
      items.push(item('ref-debt-' + (typeof debt.id === 'string' ? debt.id : index + 1), 'debt', debt.name,
        { amount: debt.bal, apr: debt.apr, minPayment: debt.min },
        'Old stated balance, APR and monthly minimum. Confirm each against a current statement. Remaining term and payment date are not supplied.' +
        (debt.apr === 0 ? ' A stated zero APR may be conditional or time-limited; confirm its end date.' : '') +
        (debt.min === 0 ? ' A stated zero minimum is not proof that no payment is required.' : '')));
    });
    const constants = {};
    const constantSpecs = [
      ['ESSENTIAL_BILLS', 'budget', 'Essential bills (aggregate)', 'Old monthly aggregate. No individual rent, utility, tax, or insurance bill amounts are established by this total.'],
      ['ALL_SUBS', 'budget', 'Subscriptions (aggregate)', 'Old monthly aggregate, before proposed cuts. Do not treat proposed savings as current subscription charges.'],
      ['BASE_FOOD', 'budget', 'Food budget', 'Old planned monthly food allowance. This is a budget, not actual spending.'],
      ['BASE_SURPLUS', 'unknown', 'Baseline surplus estimate', 'Old calculated monthly remainder. This is not income, an account balance, or an extra bill.'],
      ['TOTAL_MINS', 'unknown', 'Debt minimums total', 'Old monthly debt-payment aggregate for cross-checking only. Do not add it again if individual debt payments are included.']
    ];
    constantSpecs.forEach(([key, kind, name, note]) => {
      const value = declaration(source, key);
      if (value === undefined) { notes.push('The source does not state ' + name.toLowerCase() + '.'); return; }
      constants[key] = numberValue(value, key);
      items.push(item('ref-' + key.toLowerCase(), kind, name, { amount: value }, note));
    });
    const header = /<header\b[^>]*>([\s\S]*?)<\/header\s*>/i.exec(source);
    const heading = header ? plainText(header[1]).slice(0, 12000) : '';
    const dateMatch = /\bdrawn\s+up\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/i.exec(heading);
    let asOf = null;
    if (dateMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(dateMatch[2].slice(0, 3).toLowerCase()) + 1;
      if (!month) fail('The reference heading date is invalid.');
      asOf = dateValue(dateMatch[3] + '-' + String(month).padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0'));
    } else notes.push('The reference date is missing. Establish when these figures applied.');
    const incomeMatch = /\bIncome\s*\u00a3\s*([\d,]+(?:\.\d{1,2})?)\s*\/\s*month\b/i.exec(heading);
    const income = incomeMatch ? numberValue(moneyText(incomeMatch[1]), 'income') : undefined;
    if (income !== undefined) items.push(item('ref-income', 'income', 'Monthly income', { amount: income },
      'Old stated monthly income. Confirm net amount, pay frequency and payday before using it in a current plan.'));
    else notes.push('No supported monthly income figure was found in the heading.');

    const extraBudgets = [];
    const seenBudgetNames = new Set();
    cuts.forEach((cut, index) => {
      if (!cut || typeof cut !== 'object' || Array.isArray(cut)) fail('A reference proposal row is invalid.');
      numberValue(cut.save, 'proposed saving');
      const label = textValue(cut.label);
      const cutId = typeof cut.id === 'string' ? cut.id : String(index + 1);
      items.push(item('ref-proposal-' + cutId, 'proposal', label, { amount: cut.save },
        'Proposed monthly saving only. This is not a confirmed bill, cancellation, transaction, or account balance. ' +
        (cut.on === true ? 'The old plan selected this proposal; it still needs checking.' : 'The old plan did not establish that this proposal happened.')));
      const beforeAfter = /^(.+?)\s*\u00a3([\d,]+(?:\.\d{1,2})?)\s*(?:\u2192|->|to)\s*\u00a3([\d,]+(?:\.\d{1,2})?)/i.exec(label);
      if (beforeAfter) {
        const name = textValue(beforeAfter[1]);
        const before = numberValue(moneyText(beforeAfter[2]), 'pre-cut budget');
        const after = numberValue(moneyText(beforeAfter[3]), 'proposed budget');
        const isFood = /\bfood\b/i.test(name) && before === constants.BASE_FOOD;
        if (!isFood && !seenBudgetNames.has(name.toLowerCase())) {
          seenBudgetNames.add(name.toLowerCase());
          extraBudgets.push(before);
          items.push(item('ref-budget-' + cutId, 'budget', name, { amount: before },
            'Old pre-cut planning allowance stated in a proposal label, not verified spending. The lower proposed amount ' + moneyLabel(after) + ' is unconfirmed.'));
        }
        if (Math.abs(Math.round((before - after - cut.save) * 100)) > 0) {
          notes.push('A proposed saving does not match its stated before-and-after amounts: ' + name + '. Check the source.');
        }
      }
    });
    if (constants.TOTAL_MINS !== undefined) {
      const statedSum = debts.reduce((total, debt) => total + debt.min, 0);
      if (Math.round(statedSum * 100) !== Math.round(constants.TOTAL_MINS * 100)) {
        notes.push('The individual debt minimums do not match the old minimum-payment total. Check both before planning.');
      }
    }
    const keys = ['ESSENTIAL_BILLS', 'ALL_SUBS', 'BASE_FOOD', 'TOTAL_MINS', 'BASE_SURPLUS'];
    if (income !== undefined && keys.every(key => constants[key] !== undefined)) {
      const remainder = income - constants.ESSENTIAL_BILLS - constants.ALL_SUBS - constants.BASE_FOOD - constants.TOTAL_MINS - extraBudgets.reduce((sum, value) => sum + value, 0);
      const differencePence = Math.round((remainder - constants.BASE_SURPLUS) * 100);
      if (differencePence !== 0) {
        const difference = Math.abs(differencePence) < 100 ? Math.abs(differencePence) + 'p' : moneyLabel(Math.abs(differencePence) / 100);
        notes.push('Old arithmetic needs checking: heading income less the stated monthly aggregates and explicit pre-cut allowances leaves ' + moneyLabel(remainder) + ', while baseline surplus says ' + moneyLabel(constants.BASE_SURPLUS) + ', a ' + difference + ' mismatch. This is a cross-check, not confirmed spare cash.');
      }
    }
    return { asOf, items, notes };
  }
  function parseJSON(source) {
    let value;
    try { value = JSON.parse(source); } catch (_) { fail('This is not valid reference JSON.'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== SCHEMA || !Array.isArray(value.items)) {
      fail('Unsupported JSON format. Expected schema ' + SCHEMA + ' with an items array.');
    }
    if (value.items.length === 0 || value.items.length > MAX_ITEMS) fail('The JSON reference item count is invalid.');
    if (value.notes !== undefined && (!Array.isArray(value.notes) || value.notes.length > 100)) fail('The JSON reference notes are invalid.');
    const items = value.items.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('A JSON reference item is invalid.');
      return item(typeof entry.id === 'string' ? entry.id : 'ref-item-' + (index + 1), entry.kind, entry.name, entry,
        (typeof entry.note === 'string' ? entry.note + ' ' : '') + 'Imported reference only. Confirm it before filling any current Money form.');
    });
    const notes = (value.notes || []).map(note => textValue(note, 1400));
    notes.unshift('All imported items remain Needs checking, regardless of status fields in the source. No current Money records are written.');
    notes.push('Proposals are not actual spending or completed changes. Current holdings, payment dates, and loan terms must be checked separately.');
    return { asOf: dateValue(value.asOf), items, notes };
  }
  function freezeReference(reference) {
    reference.items.forEach(Object.freeze);
    Object.freeze(reference.items);
    Object.freeze(reference.notes);
    return Object.freeze(reference);
  }
  function parse(source, fileName = 'Imported reference') {
    try {
      if (typeof source !== 'string' || !source.trim()) fail('Choose or paste a supported reference file first.');
      if (source.length > MAX_BYTES || utf8Size(source) > MAX_BYTES) fail('Reference files must be 2 MB or smaller.');
      const input = source.replace(/^\ufeff/, '').trim();
      const parsed = input[0] === '{' ? parseJSON(input) : /^(?:<!doctype\s+html|<html\b)/i.test(input) ? parseHTML(input) : null;
      if (!parsed) fail('Unsupported reference format. Use the supported finance-plan HTML or ' + SCHEMA + ' JSON.');
      if (!parsed.items.length || parsed.items.length > MAX_ITEMS) fail('The reference item count is invalid.');
      const ids = new Set();
      parsed.items.forEach(entry => { if (ids.has(entry.id)) fail('The reference has duplicate item identifiers.'); ids.add(entry.id); });
      const safeName = textValue(typeof fileName === 'string' ? fileName.split(/[\\/]/).pop() : 'Imported reference', 180) || 'Imported reference';
      return { ok: true, reference: freezeReference({ schema: SCHEMA, fileName: safeName, asOf: parsed.asOf, items: parsed.items, notes: parsed.notes.map(note => textValue(note, 1400)) }) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'The reference could not be read.' };
    }
  }
  return Object.freeze({
    schema: SCHEMA,

    snapshot(){return {schema:'lifeos.money-reference-state.v1',reference:currentReference?JSON.parse(JSON.stringify(currentReference)):null};},
    restore(data,options={}){return LifeSnapshotCheck.protect(()=>{const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.money-reference-state.v1');if(s.reference===null){if(options.validateOnly)return {ok:true};currentReference=null;return {ok:true};}const r=s.reference;C.object(r);C.check(r.schema===SCHEMA,'Unsupported reference schema.');C.text(r.fileName,180,true);C.optional(r.asOf,C.date);C.check(Array.isArray(r.items)&&r.items.length>0&&r.items.length<=MAX_ITEMS,'Invalid reference items.');C.indexed(r.items,'reference items');for(const row of r.items){C.one(row.kind,[...KINDS]);C.text(row.name,300,true);C.text(row.note,1400);C.check(row.reviewStatus==='needs-checking','Imported reference must remain unverified.');for(const key of ['amount','apr','minPayment'])C.optional(row[key],v=>C.number(v,0,key==='apr'?1000:1e12));}C.check(Array.isArray(r.notes)&&r.notes.length<=105,'Invalid reference notes.');r.notes.forEach(v=>C.text(v,1400));if(options.validateOnly)return {ok:true};currentReference=freezeReference(r);return {ok:true};});},

    maxBytes: MAX_BYTES,
    parse,
    importText(source, fileName) {
      const result = parse(source, fileName);
      if (result.ok) currentReference = result.reference;
      return result;
    },
    get reference() { return currentReference; },
    entry(id) { return currentReference ? currentReference.items.find(entry => entry.id === id) || null : null; }
  });
})();

    const moneyView={tab:'overview',month:TODAY.slice(0,7),account:'all',selectedDate:null,method:'avalanche',extra:MoneyDemo.plan.extraDebt};
    const moneyFormat=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(n)?0:2}).format(n);
    const moneyMovementAmount=t=>['valuation','debt-adjustment'].includes(t.type)?(t.adjustment>0?'+':'')+moneyFormat(t.adjustment):(['income','refund'].includes(t.type)?'+':t.type==='expense'||t.type==='debt-payment'?'−':'')+moneyFormat(t.amount);
    const moneyAccount=id=>MoneyDemo.accounts.find(a=>a.id===id);
    const moneyDebt=id=>MoneyDemo.debts.find(d=>d.id===id);
    const moneyType=t=>({current:'Everyday money',savings:'Cash savings',investment:'Investments'}[t]||t);
    const moneyAccountOptions=id=>MoneyDemo.accounts.map(a=>'<option value="'+a.id+'" '+(a.id===id?'selected':'')+'>'+esc(a.name)+'</option>').join('');
    const moneyDebtOptions=id=>MoneyDemo.debts.map(a=>'<option value="'+a.id+'" '+(a.id===id?'selected':'')+'>'+esc(a.name)+'</option>').join('');
    const moneyTxType=t=>({'income':'Income','expense':'Spending','refund':'Purchase refund','transfer':'Account transfer','debt-payment':'Debt payment','debt-interest':'Interest added','valuation':'Balance adjustment','debt-adjustment':'Debt adjustment'}[t]||t);
    function moneyResult(result,message){if(!result.ok){toast(result.error||'Please check the details.');return false;}if(message)toast(message);return true;}
    function moneyReconciliationWarnings(){
      const rows=MoneyDemo.reconciliations().filter(row=>row.status==='discrepancy');
      if(!rows.length)return '';
      return '<div class="money-warning" role="status"><strong>'+rows.length+' statement '+(rows.length===1?'check needs':'checks need')+' review</strong><p>Earlier or corrected entries changed the ledger at a saved statement date. The observed totals are preserved. No automatic balancing entry was added.</p>'+rows.map(row=>'<button class="text-button" data-action="money-transaction" data-id="'+esc(row.id)+'">'+esc(row.name)+' · '+dateLabel(row.date)+' · '+moneyFormat(Math.abs(row.difference))+' difference '+icon('arrow')+'</button>').join('')+'</div>';
    }
    function moneyStatementEvidence(id){
      const row=MoneyDemo.reconciliations().find(item=>item.id===id);if(!row)return '';
      return '<div class="'+(row.status==='discrepancy'?'money-warning':'work-revision')+'"><strong>Saved statement evidence</strong><p>Observed '+moneyFormat(row.observedBalance)+' on '+dateLabel(row.date,{day:'numeric',month:'long',year:'numeric'})+'.<br>Ledger at that check: '+moneyFormat(row.recordedBalance)+'. '+(row.status==='discrepancy'?moneyFormat(Math.abs(row.difference))+' '+(row.difference>0?'higher':'lower')+' than the observed total. Review earlier entries or record a new check; this observation remains unchanged.':'The recorded ledger still matches.')+'</p><p class="money-note">Entries on the same date use their recording order. Later entries on that date are after this check.</p></div>';
    }
    function renderMoney(){return '<div class="page-head money-head"><div><div class="kicker">'+icon('money')+'<span class="eyebrow">Money & your future</span></div><h1>'+(moneyView.tab==='setup'?'Give your plan real numbers.':'A clearer way forward.')+'</h1><p>'+(moneyView.tab==='setup'?'Build the details once. Your monthly plan follows them.':'Know where you stand. Decide where the next pound goes.')+'</p></div><div class="row"><button class="button ghost" data-action="money-setup-pane" data-pane="accounts">'+icon('plus')+' Set up money</button><button class="button primary" data-action="money-record-new">'+icon('plus')+' Record money</button></div></div><div class="money-tabs" aria-label="Money sections">'+[['overview','Position'],['setup','Set up'],['plan','Monthly plan'],['debt','Debt path'],['record','The record']].map(([id,label])=>'<button data-action="money-tab" data-tab="'+id+'" aria-pressed="'+(moneyView.tab===id)+'">'+label+'</button>').join('')+'</div>'+moneyReferenceNotice()+moneyReconciliationWarnings()+({overview:renderMoneyOverview,setup:renderMoneySetup,plan:renderMoneyPlan,debt:renderMoneyDebt,record:renderMoneyRecord}[moneyView.tab]())+(moneyView.tab==='plan'?renderMoneyCalendar():'');}
    function renderMoneyOverview(){const n=MoneyDemo.netWorth(),h=MoneyDemo.history({months:12}),first=h[0],delta=first?n.net-first.net:0,p=MoneyDemo.plan,m=MoneyDemo.month(TODAY.slice(0,7)),selected=h.find(x=>x.date===moneyView.selectedDate)||h[h.length-1];return '<div class="money-layout"><section><div class="money-position"><span class="eyebrow">What you have, minus what you owe</span><div class="money-number">'+(MoneyDemo.accounts.length||MoneyDemo.debts.length?moneyFormat(n.net):'Not set up yet')+'</div><p class="money-copy">'+(!MoneyDemo.accounts.length&&!MoneyDemo.debts.length?'Add your accounts and debts to build a recorded position.':'Net worth as recorded on '+dateLabel(TODAY,{day:'numeric',month:'short',year:'numeric'})+'. ')+ ''+(delta?moneyFormat(Math.abs(delta))+' '+(delta>0?'higher':'lower')+' than '+dateLabel(first.date,{month:'short',year:'numeric'})+'.':'Your record starts here.')+'</p><div class="money-position-balance"><div><small>Accounts & investments</small><strong>'+moneyFormat(n.assets)+'</strong><div class="money-balance-track"><i style="width:'+Math.min(100,n.assets/Math.max(n.assets,n.debt,1)*100)+'%"></i></div></div><div class="debt"><small>Debt outstanding</small><strong>'+moneyFormat(n.debt)+'</strong><div class="money-balance-track"><i style="width:'+Math.min(100,n.debt/Math.max(n.assets,n.debt,1)*100)+'%"></i></div></div></div></div><div class="money-section-title"><h2>The bigger picture</h2><span class="money-note">Net worth · 12 months</span></div>'+moneyLineChart(h,'net','Your recorded net worth over time',true)+(selected?'<div class="money-chart-readout" aria-live="polite"><strong>'+dateLabel(selected.date,{day:'numeric',month:'long',year:'numeric'})+' · '+moneyFormat(selected.net)+'</strong><br>'+moneyFormat(selected.assets)+' in accounts and investments · '+moneyFormat(selected.debt)+' owed</div>':'')+'<div class="money-section-title"><h2>Your accounts</h2><button class="text-button" data-action="money-account-new">Add account '+icon('plus')+'</button></div>'+MoneyDemo.accounts.map(a=>'<button class="money-account-row '+a.type+'" data-action="money-account" data-id="'+a.id+'"><span class="money-account-symbol">'+icon(a.type==='investment'?'progress':a.type==='savings'?'shield':'wallet')+'</span><span><strong>'+esc(a.name)+'</strong>'+(a.reviewStatus==='needs-checking'?moneyReviewBadge(false):'')+'<small>'+moneyType(a.type)+'</small></span><span class="balance">'+moneyFormat(a.balance)+'</span></button>').join('')+'<p class="money-note">Balances come from opening amounts and recorded movements. Investment values are last entered values, not live market prices.</p></section><aside class="money-aside"><section class="money-aside-section"><span class="eyebrow">Your monthly room to move</span><h2>'+moneyFormat(Math.abs(p.leftover))+'</h2><p>'+(p.leftover>=0?'Still unassigned in your monthly plan. You can leave a cushion or give it a purpose.':'More planned than your monthly income. Revisit the allocations before committing to them.')+'</p><button class="text-button" data-action="money-tab" data-tab="plan">Shape the plan '+icon('arrow')+'</button><div class="money-metrics"><div><span class="eyebrow">Income recorded</span><strong>'+moneyFormat(m.income)+'</strong><small>This calendar month</small></div><div><span class="eyebrow">Spending recorded</span><strong>'+moneyFormat(m.spending)+'</strong><small>After refunds; excludes transfers and debt payments</small></div></div><p class="money-note">Account balances and an unassigned budget are different things. The plan is not a promise that cash is available today.</p></section><section class="money-aside-section"><span class="eyebrow">One debt at a time</span><h2>'+moneyFormat(n.debt)+'</h2><p>Keep required payments covered, then explore what an extra monthly payment could change.</p><button class="text-button" data-action="money-tab" data-tab="debt">Explore your debt path '+icon('arrow')+'</button></section><section class="money-aside-section"><span class="eyebrow">A private financial record</span><p>Your financial record stays on this device. No bank is connected and recording an entry does not move money.</p></section></aside></div>';}
    function moneyLineChart(rows,key,label,clickable=false){if(!rows.length)return '<p class="money-empty">Your first record starts this chart.</p>';const W=540,H=225,L=63,R=15,T=24,B=34,minValue=Math.min(0,...rows.map(r=>r[key])),maxValue=Math.max(0,...rows.map(r=>r[key])),spread=Math.max(1,maxValue-minValue),lo=minValue-spread*.08,hi=maxValue+spread*.08,first=dateObj(rows[0].date).getTime(),last=Math.max(first+86400000,dateObj(rows[rows.length-1].date).getTime()),x=r=>L+(dateObj(r.date).getTime()-first)/(last-first)*(W-L-R),y=n=>H-B-(n-lo)/(hi-lo)*(H-T-B);let html='<svg class="money-history-svg" viewBox="0 0 '+W+' '+H+'" role="'+(clickable?'group':'img')+'" aria-label="'+esc(label)+'">';[minValue,(minValue+maxValue)/2,maxValue].forEach(n=>{html+='<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(n)+'" y2="'+y(n)+'"/><text x="'+(L-7)+'" y="'+(y(n)+4)+'" text-anchor="end">'+moneyFormat(Math.round(n))+'</text>';});html+='<polyline class="'+(key==='remaining'?'debt-line':'net-line')+'" points="'+rows.map(r=>x(r)+','+y(r[key])).join(' ')+'"/>';if(clickable)html+=rows.map(r=>'<g class="money-chart-point" role="button" tabindex="0" data-action="money-history-point" data-date="'+r.date+'" aria-label="Net worth on '+dateLabel(r.date,{day:'numeric',month:'long',year:'numeric'})+': '+esc(moneyFormat(r.net))+'"><circle cx="'+x(r)+'" cy="'+y(r.net)+'" r="16" fill="transparent"/><circle class="point" cx="'+x(r)+'" cy="'+y(r.net)+'" r="'+(moneyView.selectedDate===r.date?5:3.5)+'"/></g>').join('');return html+'<text x="'+L+'" y="'+(H-7)+'">'+dateLabel(rows[0].date,{month:'short',year:'2-digit'})+'</text><text x="'+(W-R)+'" y="'+(H-7)+'" text-anchor="end">'+dateLabel(rows[rows.length-1].date,{month:'short',year:'2-digit'})+'</text></svg>';}
    function renderMoneyPlan(){const p=MoneyDemo.plan,parts=[['essentials','Essentials',p.essentials,'#85d6ff'],['flexible','Everyday choice',p.flexible,'#c0b3ff'],['debt','Debt payments',p.minimumDebt+p.extraDebt,'#f1bc7b'],['savings','Cash savings',p.savings,'#93d6b4'],['investment','Investing',p.investment,'#f4afc1'],['leftover',p.leftover<0?'Funding gap':'Unassigned',Math.abs(p.leftover),'#a9b6cf']],denominator=Math.max(p.income,p.totalAllocated,1),n=MoneyDemo.netWorth();let offset=0;const ribbons=parts.map((r,i)=>{const width=r[0]==='leftover'&&p.leftover<0?0:r[2]/denominator*230,start=206-115+offset+width/2;offset+=width;return '<path d="M155 '+start+' C290 '+start+' 250 '+(42+i*58)+' 350 '+(42+i*58)+'" fill="none" stroke="'+r[3]+'" stroke-width="'+Math.max(0,width)+'" opacity=".32"/>';});return '<div class="money-layout"><section><div class="money-section-title" style="margin-top:0"><h2>Give every pound a place.</h2><button class="text-button" data-action="money-plan-edit">Edit plan '+icon('edit')+'</button></div><p class="money-copy">A repeatable monthly plan, separate from the transactions you have recorded.</p><div class="money-flow"><svg viewBox="0 0 620 412" preserveAspectRatio="none" aria-hidden="true">'+ribbons.join('')+'</svg><div class="money-flow-source"><small>Monthly income</small><strong>'+moneyFormat(p.income)+'</strong></div><div class="money-flow-targets">'+parts.map(([id,label,value,color])=>'<button class="money-flow-row" style="--flow-color:'+color+'" data-action="'+(id==='debt'?'money-tab':'money-plan-edit')+'" '+(id==='debt'?'data-tab="debt"':'')+'><span>'+label+'</span><strong>'+moneyFormat(value)+'</strong></button>').join('')+'</div></div><p class="money-note">Ribbon widths follow planned amounts. Debt includes '+moneyFormat(p.minimumDebt)+' required payments and '+moneyFormat(p.extraDebt)+' extra. Nothing is transferred when you edit this plan.</p>'+(p.leftover<0?'<div class="money-warning"><strong>'+moneyFormat(-p.leftover)+' funding gap each month</strong>The plan allocates more than its income. Reduce an allocation or update the income figure before relying on it.</div>':'<div class="money-projection-summary"><span class="eyebrow">Room for the unexpected</span><strong>'+moneyFormat(p.leftover)+'</strong><p>Unassigned each month. Leaving a buffer can make the plan easier to live with.</p></div>')+'<button class="button primary full" data-action="money-plan-edit">Adjust the monthly plan '+icon('arrow')+'</button></section><aside class="money-aside"><section class="money-aside-section"><span class="eyebrow">Build some breathing room</span><h2>'+moneyFormat(n.savings)+'</h2><p>Cash savings currently recorded. At '+moneyFormat(p.savings)+' per month, you would add '+moneyFormat(p.savings*12)+' over a year before interest or withdrawals.</p><div class="money-saving-breakdown"><div><strong>'+moneyFormat(n.savings+p.savings*12)+'</strong><small>Cash savings after 12 months<br>Contributions only</small></div></div><p class="money-note">This does not account for unexpected costs. Your emergency-cash target should reflect your essential outgoings and circumstances.</p></section><section class="money-aside-section"><span class="eyebrow">A longer horizon</span><h2>Invest deliberately.</h2><p>Your plan sets aside '+moneyFormat(p.investment)+' a month for investing. That is '+moneyFormat(p.investment*12)+' in new contributions over a year.</p><div class="money-contribution-track"><span style="width:'+((p.savings+p.investment)?p.savings/(p.savings+p.investment)*100:0)+'%"></span><span style="width:'+(p.savings+p.investment>0?p.investment/(p.savings+p.investment)*100:0)+'%"></span></div><div class="money-saving-breakdown"><div><strong>'+moneyFormat(p.savings)+'</strong><small>Monthly cash savings</small></div><div><strong>'+moneyFormat(p.investment)+'</strong><small>Monthly investment</small></div></div><p class="money-note">This plan records contributions, not products or market returns. Review expensive debt, accessible emergency cash and when you need the money before deciding what to invest.</p><button class="text-button" data-action="money-assumptions">Planning notes & sources '+icon('arrow')+'</button></section></aside></div>';}
    function moneyRateWarnings(projection){return (projection.rateWarnings||[]).map(note=>'<div class="money-warning"><strong>Check the future rate</strong>'+esc(note)+'</div>').join('');}
    function renderMoneyDebt(){const p=MoneyDemo.plan,n=MoneyDemo.netWorth(),projection=MoneyDemo.projectDebt(moneyView.method,moneyView.extra),available=p.leftover+p.extraDebt-moneyView.extra,order=projection.order||[],debts=order.map(id=>moneyDebt(id)).filter(Boolean),rows=projection.schedule||[],chart=[{date:TODAY,remaining:n.debt},...rows.filter((r,i)=>i%Math.max(1,Math.ceil(rows.length/40))===0||i===rows.length-1)],paid=projection.status==='paid-off';return '<div class="money-layout"><section><span class="eyebrow">An estimate you can explore</span><h2 style="font-size:35px">A path out of debt.</h2><div class="money-debt-choice" aria-label="Debt repayment order"><button data-action="money-method" data-method="avalanche" aria-pressed="'+(moneyView.method==='avalanche')+'">Highest interest first</button><button data-action="money-method" data-method="snowball" aria-pressed="'+(moneyView.method==='snowball')+'">Smallest balance first</button></div><p class="money-note">Required payments are covered first. Extra money goes to the selected priority, then rolls to the next debt. Highest-interest priority is checked again each forecast month, including entered rate changes.</p><div class="money-scenario"><label for="moneyExtra">Try an extra monthly debt payment</label><output id="moneyExtraOutput" for="moneyExtra">'+moneyFormat(moneyView.extra)+'</output><input id="moneyExtra" type="range" min="0" max="'+Math.max(1000,p.extraDebt*2,moneyView.extra)+'" step="25" value="'+moneyView.extra+'"><div class="range-labels"><span>£0 extra</span><span>'+moneyFormat(Math.max(1000,p.extraDebt*2,moneyView.extra))+' extra</span></div><p class="money-note">'+moneyFormat(p.minimumDebt)+' required + '+moneyFormat(moneyView.extra)+' extra = '+moneyFormat(p.minimumDebt+moneyView.extra)+' total per month.</p></div><div class="money-projection-summary"><span class="eyebrow">'+(n.debt===0?'No debt entered':paid?'Estimated time to clear':'This plan does not clear the balance')+'</span><strong>'+(n.debt===0?(MoneyDemo.debts.length?'Balances cleared.':'Add details to begin.'):paid?projection.months+' '+(projection.months===1?'month':'months'):'Review the payment')+'</strong><p>'+(!MoneyDemo.debts.length?'Your debt position is not known until you enter it.':paid?'Estimated interest '+moneyFormat(projection.totalInterest)+'. Total repaid '+moneyFormat(projection.totalPaid)+'.':'The monthly payment may not cover enough principal. Review the balances, rates and payment amount.')+'</p></div>'+moneyLineChart(chart,'remaining','Estimated remaining debt with entered rate changes')+'<p class="money-note">Illustration only: each month uses its APR divided by 12. An entered later APR starts in the first forecast month after the promotion ends, without daily proration. The monthly budget stays fixed. Fees, missed payments, new borrowing and contractual end dates are not applied. Your statements and actual terms may differ.</p>'+moneyRateWarnings(projection)+(available<0?'<div class="money-warning"><strong>'+moneyFormat(-available)+' more than your monthly plan can fund</strong>This scenario needs another allocation to change. It has not changed your saved plan.</div>':'<p class="money-note">This would leave '+moneyFormat(available)+' unassigned in the monthly plan.</p>')+'<div class="row wrap"><button class="button primary" data-action="money-apply-extra" '+(available<0?'disabled':'')+'>Use this monthly payment</button><button class="button ghost" data-action="money-schedule">View payment estimate</button></div></section><aside class="money-aside"><section class="money-aside-section"><span class="eyebrow">Repayment order today</span><h2>'+moneyFormat(n.debt)+'</h2>'+debts.map((d,i)=>'<button class="money-debt-row" data-action="money-debt-edit" data-id="'+d.id+'"><span class="order">'+(i+1)+'</span><span><strong>'+esc(d.name)+'</strong><small>'+(projection.ratesAtStart[d.id]??d.apr)+'% forecast APR today · '+moneyFormat(d.minPayment)+' required monthly</small></span><span class="amount">'+moneyFormat(d.balance)+'</span></button>').join('')+(!debts.length?'<p class="money-note">Add your borrowing to compare a repayment plan.</p>':'')+'<button class="text-button" data-action="money-debt-new">+ Add debt</button></section><section class="money-aside-section"><span class="eyebrow">Keep the forecast grounded</span><p>Check balances and rates against statements. The priority options compare these entered debts; they do not assess arrears, early-repayment charges or priority bills.</p><button class="text-button" data-action="money-record-new" data-type="debt-payment">Record a payment '+icon('arrow')+'</button><button class="text-button" data-action="money-assumptions">Planning notes & sources '+icon('arrow')+'</button></section></aside></div>';}
    function renderMoneyRecord(){const m=MoneyDemo.month(moneyView.month),rows=m.transactions.filter(t=>moneyView.account==='all'||t.accountId===moneyView.account||t.toAccountId===moneyView.account).slice().sort((a,b)=>b.date.localeCompare(a.date));return '<div class="money-layout"><section><h2 style="font-size:34px">Every movement, in context.</h2><div class="money-record-filter"><label>Month<input id="moneyRecordMonth" type="month" value="'+moneyView.month+'" max="'+TODAY.slice(0,7)+'" min="1970-01"></label><label>Account<select id="moneyRecordAccount"><option value="all">All accounts</option>'+moneyAccountOptions(moneyView.account)+'</select></label></div><div class="money-metrics"><div><span class="eyebrow">Income this month</span><strong>'+moneyFormat(m.income)+'</strong></div><div><span class="eyebrow">Spending this month</span><strong>'+moneyFormat(m.spending)+'</strong></div></div><p class="money-note">Monthly totals cover all accounts. Refunds reduce spending in the month received; they are not income. Transfers, debt payments and balance adjustments stay separate.</p>'+rows.map(renderMoneyTransaction).join('')+(!rows.length?'<p class="money-empty">No movements in this view. Choose another month or record an entry.</p>':'')+'</section><aside class="money-aside"><section class="money-aside-section"><span class="eyebrow">Spending, broken down</span>'+m.byCategory.map(c=>'<div class="stat-line"><span>'+esc(c.category)+'</span><strong>'+moneyFormat(c.amount)+'</strong></div>').join('')+'<div class="stat-line"><span>Debt payments</span><strong>'+moneyFormat(m.debtPaid)+'</strong></div><div class="stat-line"><span>Between your accounts</span><strong>'+moneyFormat(m.transfers)+'</strong></div><p class="money-note">Internal transfers change where money sits, not how much you own. Paying debt reduces both cash and the amount owed. Interest is recorded separately when added to a debt.</p></section><section class="money-aside-section"><span class="eyebrow">A faithful record</span><h2>Correct without erasing.</h2><p>Open an entry to see its details. Corrections keep the earlier version, while totals use the latest version.</p></section></aside></div>';}
    function renderMoneyTransaction(t){return '<button class="money-record '+t.type+'" data-action="money-transaction" data-id="'+t.id+'">'+icon(t.type==='transfer'?'transfer':t.type==='debt-payment'?'debt':t.type==='income'?'plus':'receipt')+'<span><strong>'+esc(t.note||(['income','expense'].includes(t.type)?t.category:null)||moneyTxType(t.type))+'</strong><small>'+dateLabel(t.date)+' · '+moneyTxType(t.type)+'<br>'+esc(t.accountName||t.debtName||'Balance record')+(t.toAccountName?' → '+esc(t.toAccountName):'')+(t.type==='debt-payment'&&t.debtName?' → '+esc(t.debtName):'')+'</small></span><span class="amount">'+moneyMovementAmount(t)+'</span></button>';}
    function moneyAccountDialog(id){const a=moneyAccount(id),rows=MoneyDemo.transactions.filter(t=>t.accountId===id||t.toAccountId===id).slice().sort((x,y)=>y.date.localeCompare(x.date)).slice(0,8);showDialog(a.name,'<span class="eyebrow">'+moneyType(a.type)+(a.reviewStatus==='needs-checking'?' · Needs checking':'')+'</span><div class="money-number">'+moneyFormat(a.balance)+'</div><p class="money-note">'+esc([a.provider,a.subtype].filter(Boolean).join(' · '))+(a.provider||a.subtype?'<br>':'')+'Recorded balance, including opening money and later movements. Last recorded change '+dateLabel(a.balanceDate)+'.</p>'+((a.aer!==null||a.savingsTarget!==null)?'<p class="money-note">'+(a.aer!==null?'Saved savings AER: '+a.aer+'%. ':'')+(a.savingsTarget!==null?'Savings target: '+moneyFormat(a.savingsTarget)+'.':'')+'</p>':'')+(a.investmentNote?'<p class="money-note">'+esc(a.investmentNote)+'</p>':'')+'<div class="row wrap"><button class="button primary" data-action="money-record-new" data-account="'+id+'">Record movement</button><button class="button ghost" data-action="money-balance" data-id="'+id+'">Check balance</button><button class="button ghost" data-action="money-account-edit" data-id="'+id+'">Edit details</button></div><h3 class="gap-top" style="font-size:14px">Recent movements</h3>'+rows.map(renderMoneyTransaction).join('')+(!rows.length?'<p class="money-note">No later movements recorded.</p>':'')+'<div class="dialog-footer"><button class="button ghost" data-action="money-account-record" data-id="'+id+'">Open full record</button><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function moneyNewAccount(id=null){const a=id?moneyAccount(id):null;showDialog(a?'Edit account details':'Add an account','<form id="moneyAccountForm" data-id="'+(id||'')+'"><p class="dialog-sub">'+(a?'Change the account details here. A new statement balance belongs in Check balance, so earlier records stay intact.':'Enter the total already in this account on the date below. Monthly contributions are planned separately.')+'</p><label>Account name<input id="moneyAccountName" maxlength="80" value="'+esc(a?a.name:'')+'" placeholder="Everyday account" required></label><div class="money-form-grid"><label>Account group<select id="moneyAccountType" '+(a?'disabled':'')+'>'+[['current','Everyday money'],['savings','Cash savings'],['investment','Investments']].map(([value,label])=>'<option value="'+value+'" '+(a&&a.type===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Bank or provider, optional<input id="moneyAccountProvider" maxlength="120" value="'+esc(a?a.provider:'')+'" placeholder="Bank, building society or platform"></label></div>'+(!a?'<div class="money-form-grid"><label>Current balance, £<input id="moneyAccountBalance" type="number" min="0" max="100000000" step="0.01" value="0" required inputmode="decimal"></label><label>This balance is from<input id="moneyAccountDate" type="date" min="1970-01-01" max="'+TODAY+'" value="'+TODAY+'" required></label></div><p class="money-form-hint">This becomes the opening record in Life-OS. It is money already held, not income or a new contribution.</p>':'<p class="money-form-result">Current recorded balance: '+moneyFormat(a.balance)+'. Opening record: '+moneyFormat(a.openingBalance)+' on '+dateLabel(a.openedOn)+'.</p><p class="money-form-hint">The account group stays fixed so earlier spending and savings charts keep their meaning.</p>')+'<details id="moneyAccountDetails" class="goal-editor-details"><summary>Account details, optional</summary><label>What kind of account is it?<input id="moneyAccountSubtype" maxlength="120" value="'+esc(a?a.subtype:'')+'" placeholder="Easy access, Cash ISA, Stocks and Shares ISA, pension"></label><div class="money-form-grid"><label>Savings AER, %<input id="moneyAccountAer" type="text" inputmode="decimal" value="'+(a&&a.aer!==null?a.aer:'')+'" placeholder="Leave blank if unknown"></label><label>Savings target, £<input id="moneyAccountTarget" type="text" inputmode="decimal" value="'+(a&&a.savingsTarget!==null?a.savingsTarget:'')+'" placeholder="Total you want to build"></label></div><label>Holdings or investment notes<textarea id="moneyAccountInvestmentNote" rows="3" maxlength="2000" placeholder="What you hold, account purpose or details to check">'+esc(a?a.investmentNote:'')+'</textarea></label><p class="money-form-hint">The target is the total you want to build, not a monthly contribution. AER and holdings are saved details; projected contributions do not assume interest or investment returns.</p></details><label class="money-review-check"><input id="moneyAccountChecked" type="checkbox" '+(!a||a.reviewStatus==='checked'?'checked':'')+'> I have checked these account details</label><p class="money-form-hint">Leave unticked to keep a visible Needs checking label. These account balances still appear in your position.</p><div id="moneyAccountError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(a?'Save details':'Add account')+'</button></div></form>');}
    function moneyBalanceDialog(id,debt=false){const a=debt?moneyDebt(id):moneyAccount(id);showDialog('Check '+a.name,'<form id="moneyBalanceForm" data-id="'+id+'" data-debt="'+debt+'"><p class="dialog-sub">Enter the total shown on your statement and its date. The observed total is retained with a dated balance correction. Later recorded movements remain in place. If earlier entries change, a discrepancy is flagged without silently adjusting the ledger.</p><div class="money-form-grid"><label>Statement date<input id="moneyBalanceDate" type="date" min="'+a.openedOn+'" max="'+TODAY+'" value="'+TODAY+'" required></label><label>Statement balance, £<input id="moneyCheckedBalance" type="number" min="0" max="100000000" step="0.01" value="'+a.balance+'" required inputmode="decimal"></label></div><label class="gap-top">Reason<input id="moneyBalanceNote" maxlength="200" placeholder="Statement check or investment valuation" required></label><p class="money-form-hint">A balance correction is not income, spending, a contribution or a debt payment. Same-day entries use recording order, so later entries on this date come after this check.</p><div id="moneyBalanceError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Record balance correction</button></div></form>');}
    function moneyDebtDialog(id=null){const d=id?moneyDebt(id):null;showDialog(d?'Edit debt details':'Add a debt','<form id="moneyDebtForm" data-id="'+(id||'')+'"><p class="dialog-sub">Use the amount currently owed and the required payment on your agreement or statement. Extra payments belong in your monthly plan.</p><label>Debt name<input id="moneyDebtName" maxlength="80" value="'+esc(d?d.name:'')+'" placeholder="Credit card or personal loan" required></label><label class="gap-top">Debt type<select id="moneyDebtKind">'+[['loan','Loan'],['card','Credit card'],['overdraft','Overdraft'],['other','Other']].map(([value,label])=>'<option value="'+value+'" '+((d?d.kind:'loan')===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+(!d?'<div class="money-form-grid"><label>Balance still owed, £<input id="moneyDebtBalance" type="number" min="0" max="100000000" step="0.01" value="0" required inputmode="decimal"></label><label>This balance is from<input id="moneyDebtDate" type="date" min="1970-01-01" max="'+TODAY+'" value="'+TODAY+'" required></label></div>':'<div class="money-number">'+moneyFormat(d.balance)+'</div><p class="money-form-hint">Last recorded balance change '+dateLabel(d.balanceDate)+'.</p><button type="button" class="text-button" data-action="money-debt-balance" data-id="'+d.id+'">Check against a statement '+icon('edit')+'</button>')+'<div class="money-form-grid"><label>Current APR, %<input id="moneyDebtApr" type="number" min="0" max="1000" step="0.01" value="'+(d?d.apr:0)+'" required inputmode="decimal"></label><label>Required monthly payment, £<input id="moneyDebtMinimum" type="number" min="0" max="1000000" step="0.01" value="'+(d?d.minPayment:0)+'" required inputmode="decimal"></label></div><details id="moneyDebtDetails" class="goal-editor-details"><summary>Loan length, payment dates & fees, optional</summary><div class="money-form-grid"><label>Monthly payments left, if known<input id="moneyDebtRemaining" type="text" inputmode="numeric" value="'+(d&&d.paymentsRemaining!==null?d.paymentsRemaining:'')+'" placeholder="Number of monthly payments"></label><label>Final payment date<input id="moneyDebtEnd" type="date" min="1970-01-01" max="2199-12-31" value="'+(d&&d.finalPaymentDate?d.finalPaymentDate:'')+'"></label><label>Payment day each month<input id="moneyDebtDay" type="text" inputmode="numeric" value="'+(d&&d.paymentDay!==null?d.paymentDay:'')+'" placeholder="1 to 31"></label></div><p class="money-form-hint">Copy these from your agreement if known. They are entered reference details, not a term guessed from the balance or APR.</p><div class="money-form-grid"><label>Promotional rate ends<input id="moneyDebtPromoEnd" type="date" min="1970-01-01" max="2199-12-31" value="'+(d&&d.promoEndDate?d.promoEndDate:'')+'"></label><label>APR after promotion, %<input id="moneyDebtFutureApr" type="text" inputmode="decimal" value="'+(d&&d.futureApr!==null?d.futureApr:'')+'" placeholder="Leave blank if unknown"></label></div><label>Overpayment fees or conditions<textarea id="moneyDebtFeeNote" rows="3" maxlength="2000" placeholder="Any limits, fees or details to check in the agreement">'+esc(d?d.overpaymentFeeNote:'')+'</textarea></label></details><p class="money-form-hint">A saved later APR starts in the first forecast month after the promotion ends, without daily proration. If its rate or date is missing, the forecast keeps the entered APR and flags the gap. Required payment budgets stay fixed. Contract end dates, payment counts and fee notes are reference details, not applied to the estimate. Changes never rewrite recorded interest or payments.</p><label class="money-review-check"><input id="moneyDebtChecked" type="checkbox" '+(!d||d.reviewStatus==='checked'?'checked':'')+'> I have checked these debt details</label><p class="money-form-hint">Leave unticked to keep a visible Needs checking label. This debt still appears in your position.</p><div id="moneyDebtError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save debt details</button></div></form>');}
    document.addEventListener('change',event=>{if(event.target.id==='moneyBalanceDate'&&$('moneyBalanceForm'))$('moneyCheckedBalance').value='';});
    function moneyRecordDialog(type='expense',id=null,accountId=null){if(!id&&type!=='debt-interest'&&!MoneyDemo.accounts.length){moneyNewAccount();toast('Add the account balance first, then record the movement.');return false;}if(!id&&['debt-payment','debt-interest'].includes(type)&&!MoneyDemo.debts.length){moneyDebtDialog();toast('Add the debt and its current balance first.');return false;}if(!id&&type==='transfer'&&MoneyDemo.accounts.length<2){moneyNewAccount();toast('Add the destination account before recording a transfer.');return false;}const t=id?MoneyDemo.transactions.find(t=>t.id===id):null;if(t)type=t.type;if(t&&(t.type==='refund'||MoneyDemo.transactions.some(event=>event.type==='refund'&&event.refundOfTransactionRootId===t.rootId))){toast('Review this entry from its connected receipt. Refund history cannot be changed in the ordinary money editor.');return false;}showDialog(t?'Correct a money record':'Record a money movement','<form id="moneyTransactionForm" data-id="'+(id||'')+'" data-operation="'+uid('money-operation')+'"><label>What happened?<select id="moneyTxType">'+[['expense','I spent money'],['income','I received income'],['transfer','I moved money between my accounts'],['debt-payment','I paid a debt'],['debt-interest','Interest was added to a debt']].map(([v,label])=>'<option value="'+v+'" '+(type===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div class="money-form-grid"><label>Date<input id="moneyTxDate" type="date" min="1970-01-01" max="'+TODAY+'" value="'+(t?t.date:TODAY)+'" required></label><label>Amount, £<input id="moneyTxAmount" type="number" min="0.01" max="100000000" step="0.01" value="'+(t?t.amount:'')+'" required inputmode="decimal"></label></div><label id="moneyTxAccountWrap"><span id="moneyTxAccountLabel">Account</span><select id="moneyTxAccount">'+moneyAccountOptions(t?t.accountId:accountId)+'</select></label><label class="gap-top" id="moneyTxToWrap">To account<select id="moneyTxTo">'+moneyAccountOptions(t?t.toAccountId:MoneyDemo.accounts[1]?.id)+'</select></label><label class="gap-top" id="moneyTxDebtWrap">Debt<select id="moneyTxDebt">'+moneyDebtOptions(t?t.debtId:null)+'</select></label><label class="gap-top" id="moneyTxCategoryWrap">Category<input id="moneyTxCategory" maxlength="60" value="'+esc(t?t.category||'':'Everyday')+'" placeholder="Groceries, bills, salary"></label><label class="gap-top">Note, optional<input id="moneyTxNote" maxlength="200" value="'+esc(t?t.note||'':'')+'" placeholder="Where it went, or what it was for"></label><div class="money-form-result" id="moneyTxExplanation"></div><div id="moneyTransactionError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(t?'Save correction':'Record movement')+'</button></div></form>');updateMoneyRecordForm();}
    function updateMoneyRecordForm(){if(!$('moneyTransactionForm'))return;const t=$('moneyTxType').value;$('moneyTxAccountWrap').hidden=t==='debt-interest';$('moneyTxToWrap').hidden=t!=='transfer';$('moneyTxDebtWrap').hidden=!['debt-payment','debt-interest'].includes(t);$('moneyTxCategoryWrap').hidden=!['income','expense'].includes(t);$('moneyTxExplanation').textContent=({expense:'This reduces the selected account and appears as spending.',income:'This increases the selected account and appears as income.',transfer:'This reduces one account and increases the other. It is not income or spending.','debt-payment':'This reduces your cash and the debt balance together. It is shown separately from everyday spending.','debt-interest':'This increases the amount owed. Cash changes only when a payment is recorded.'}[t]);}
    function moneyTransactionDetail(id){const t=MoneyDemo.transactions.find(t=>t.id===id);if(!t)return;const versions=MoneyDemo.transactionVersions.filter(v=>(v.rootId||v.id)===(t.rootId||t.id)).slice().reverse();showDialog(moneyTxType(t.type),'<p class="dialog-sub">'+dateLabel(t.date,{day:'numeric',month:'long',year:'numeric'})+' · '+esc(t.accountName||t.debtName||'Balance record')+'</p><div class="money-number">'+moneyMovementAmount(t)+'</div><p class="money-note">'+esc(t.note||(['income','expense'].includes(t.type)?t.category:null)||'No note')+(t.toAccountName?'<br>To '+esc(t.toAccountName):'')+(t.debtName&&t.accountName?'<br>Debt: '+esc(t.debtName):'')+'</p>'+moneyStatementEvidence(t.id)+PurchaseUI.paymentLink(t.rootId||t.id)+(PurchaseUI.moneyCorrectionButton(t)||(['income','expense','transfer','debt-payment','debt-interest'].includes(t.type)&&!MoneyDemo.transactions.some(event=>event.type==='refund'&&event.refundOfTransactionRootId===t.rootId)?'<button class="text-button" data-action="money-transaction-edit" data-id="'+t.id+'">Correct entry '+icon('edit')+'</button>':t.type==='refund'||MoneyDemo.transactions.some(event=>event.type==='refund'&&event.refundOfTransactionRootId===t.rootId)?'<p class="money-note">This entry retains connected refund evidence. Review the receipt for its original purchase, corrections and returns.</p>':'<p class="money-note">To revise a balance check, record a new current balance from the account or debt.</p>'))+'<h3 class="gap-top" style="font-size:14px">Record history</h3>'+versions.map((v,i)=>'<div class="work-revision"><strong>'+(i===0?'Current record':'Earlier version')+'</strong><br>'+dateLabel(v.date)+' · '+moneyTxType(v.type)+' · '+moneyMovementAmount(v)+'<br>'+esc(v.note||'')+'</div>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function moneyScheduleDialog(){const p=MoneyDemo.projectDebt(moneyView.method,moneyView.extra);showDialog('Estimated monthly payments','<p class="dialog-sub">An illustration from today\'s entered balances and rate changes. A later APR starts in the first forecast month after promotion ends, without daily proration. It does not add payments to your record.</p>'+moneyRateWarnings(p)+p.schedule.map(r=>'<div class="stat-line"><span>'+dateLabel(r.date,{month:'short',year:'numeric'})+'<small style="display:block;font-size:10px;margin-top:5px">Payment '+moneyFormat(r.payment)+' · interest '+moneyFormat(r.interest)+'</small></span><strong>'+moneyFormat(r.remaining)+' left</strong></div>').join('')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function moneyAssumptions(){showDialog('Planning notes','<p class="dialog-sub">These tools make your own figures easier to compare. They do not choose investments or change any real account.</p><div class="work-revision"><strong>Monthly plan</strong><br>Keep essential outgoings and required debt payments visible. An unassigned amount is a budget figure, not a live spending limit.</div><div class="work-revision"><strong>Debt estimate</strong><br>Monthly interest uses APR / 12. An entered later APR starts in the first forecast month after its promotion ends, with no daily proration. Highest-interest priority is checked each month. Missing future rates are flagged and the entered APR is retained. Payment budgets stay fixed and freed payments roll into the next debt. Contract end dates, payment counts, fees and new borrowing are not applied. Priority bills, arrears and penalties need separate consideration.</div><div class="work-revision"><strong>Saving and investing</strong><br>Consider costly debt, accessible emergency cash and when you need the money. Contributions are shown without promised investment returns. Investments can fall in value.</div><p class="money-source-links">General planning references: MoneyHelper, Managing your money; FCA InvestSmart, Should you invest? These are reference notes, not live connections.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function handleMoneyAction(a,d){
      if(handleMoneySetupAction(a,d))return;
      if(a==='money-tab'){moneyView.tab=d.tab;if(d.tab==='debt')moneyView.extra=MoneyDemo.plan.extraDebt;render();return;}
      if(a==='money-account-new'){moneyNewAccount();return;}
      if(a==='money-account-edit'){moneyNewAccount(d.id);return;}
      if(a==='money-account'){moneyAccountDialog(d.id);return;}
      if(a==='money-balance'){moneyBalanceDialog(d.id);return;}
      if(a==='money-debt-balance'){moneyBalanceDialog(d.id,true);return;}
      if(a==='money-debt-new'||a==='money-debt-edit'){moneyDebtDialog(d.id||null);return;}
      if(a==='money-record-new'){moneyRecordDialog(d.type||'expense',null,d.account||null);return;}
      if(a==='money-transaction'){moneyTransactionDetail(d.id);return;}
      if(a==='money-transaction-edit'){moneyRecordDialog('expense',d.id);return;}
      if(a==='money-plan-edit'){moneyPlanDialog();return;}
      if(a==='money-method'){moneyView.method=d.method;render();return;}
      if(a==='money-apply-extra'){const p=MoneyDemo.plan;if(p.leftover+p.extraDebt-moneyView.extra<0){toast('This payment needs more room in the monthly plan.');return;}if(moneyResult(moneySyncPlan({...moneySetup.allowances,extraDebt:moneyView.extra}),'Monthly plan updated. No payment has been recorded.'))render();return;}
      if(a==='money-history-point'){moneyView.selectedDate=d.date;render();return;}
      if(a==='money-schedule'){moneyScheduleDialog();return;}
      if(a==='money-assumptions'){moneyAssumptions();return;}
      if(a==='money-account-record'){moneyView.tab='record';moneyView.account=d.id;moneyView.month=TODAY.slice(0,7);closeDialog();render();return;}
    }
    document.addEventListener('input',event=>{if(event.target.id==='moneyExtra')$('moneyExtraOutput').textContent=moneyFormat(Number(event.target.value));if(event.target.closest('#moneyPlanForm'))updateMoneyPlanPreview();});
    document.addEventListener('change',event=>{if(event.target.id==='moneyExtra'){moneyView.extra=Number(event.target.value);render();}if(event.target.id==='moneyTxType')updateMoneyRecordForm();if(event.target.id==='moneyRecordAccount'){moneyView.account=event.target.value;render();}if(event.target.id==='moneyRecordMonth'){const m=event.target.value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||m<'1970-01'||m>TODAY.slice(0,7)){toast('Choose a recorded month up to today.');event.target.value=moneyView.month;return;}moneyView.month=m;render();}});
    document.addEventListener('keydown',event=>{const p=event.target.closest('.money-chart-point');if(p&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleMoneyAction('money-history-point',p.dataset);}});
    document.addEventListener('submit',event=>{const form=event.target;if(!['moneyPlanForm','moneyAccountForm','moneyDebtForm','moneyBalanceForm','moneyTransactionForm'].includes(form.id))return;event.preventDefault();let result,errorId;
      if(form.id==='moneyPlanForm'){result=moneySyncPlan(readMoneyPlan());errorId='moneyPlanError';if(result.ok)moneyView.extra=MoneyDemo.plan.extraDebt;}
      if(form.id==='moneyAccountForm'){const value={name:$('moneyAccountName').value.trim(),type:$('moneyAccountType').value,provider:$('moneyAccountProvider').value.trim(),subtype:$('moneyAccountSubtype').value.trim(),aer:$('moneyAccountAer').value.trim()||null,savingsTarget:$('moneyAccountTarget').value.trim()||null,investmentNote:$('moneyAccountInvestmentNote').value.trim(),reviewStatus:$('moneyAccountChecked').checked?'checked':'needs-checking'};result=form.dataset.id?MoneyDemo.editAccount(form.dataset.id,value):MoneyDemo.addAccount({...value,balance:$('moneyAccountBalance').value,date:$('moneyAccountDate').value});errorId='moneyAccountError';if(!result.ok)$('moneyAccountDetails').open=true;}
      if(form.id==='moneyDebtForm'){const value={name:$('moneyDebtName').value.trim(),kind:$('moneyDebtKind').value,apr:$('moneyDebtApr').value,minPayment:$('moneyDebtMinimum').value,paymentsRemaining:$('moneyDebtRemaining').value.trim()||null,finalPaymentDate:$('moneyDebtEnd').value||null,paymentDay:$('moneyDebtDay').value.trim()||null,promoEndDate:$('moneyDebtPromoEnd').value||null,futureApr:$('moneyDebtFutureApr').value.trim()||null,overpaymentFeeNote:$('moneyDebtFeeNote').value.trim(),reviewStatus:$('moneyDebtChecked').checked?'checked':'needs-checking'};if(form.dataset.id)result=MoneyDemo.updateDebt(form.dataset.id,value);else result=MoneyDemo.addDebt({...value,balance:$('moneyDebtBalance').value,date:$('moneyDebtDate').value});errorId='moneyDebtError';if(!result.ok)$('moneyDebtDetails').open=true;}
      if(form.id==='moneyBalanceForm'){const value={balance:$('moneyCheckedBalance').value,date:$('moneyBalanceDate').value,note:$('moneyBalanceNote').value.trim()};result=form.dataset.debt==='true'?MoneyDemo.updateDebt(form.dataset.id,value):MoneyDemo.adjustAccountBalance(form.dataset.id,value);errorId='moneyBalanceError';}
      if(form.id==='moneyTransactionForm'){const type=$('moneyTxType').value,value={type,date:$('moneyTxDate').value,amount:Number($('moneyTxAmount').value),accountId:type==='debt-interest'?null:$('moneyTxAccount').value,toAccountId:type==='transfer'?$('moneyTxTo').value:null,debtId:['debt-payment','debt-interest'].includes(type)?$('moneyTxDebt').value:null,category:['income','expense'].includes(type)?$('moneyTxCategory').value.trim():'',note:$('moneyTxNote').value.trim(),operationId:form.dataset.operation};result=form.dataset.id?MoneyDemo.correctTransaction(form.dataset.id,value):MoneyDemo.addTransaction(value);errorId='moneyTransactionError';}
      if(!result.ok){$(errorId).textContent=result.error;return;}closeDialog();render();toast(form.id==='moneyPlanForm'?'Monthly plan saved. Account balances are unchanged.':'Financial record updated in this app.');
    });

    const moneySetup={pane:'accounts',calendarMonth:TODAY.slice(0,7),allowances:{essentials:0,flexible:0,extraDebt:0,savings:0,investment:0}};

    function snapshotMoneySetup(){return LifeSnapshotCheck.copy({schema:'lifeos.money-setup.v1',allowances:moneySetup.allowances});}
    function restoreMoneySetup(data,options={}){return LifeSnapshotCheck.protect(()=>{const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.money-setup.v1');C.object(s.allowances);for(const key of ['essentials','flexible','extraDebt','savings','investment'])C.money(s.allowances[key]);if(options.validateOnly)return {ok:true};moneySetup.allowances=s.allowances;moneyView.extra=MoneyDemo.plan.extraDebt;return {ok:true};});}

    const moneyFrequency=f=>({'weekly':'Every week','fortnightly':'Every 2 weeks','four-weekly':'Every 4 weeks','monthly':'Every month','quarterly':'Every 3 months','yearly':'Every year'}[f]||f);
    const moneyReviewBadge=checked=>'<span class="money-review-badge '+(checked?'checked':'')+'">'+(checked?'Checked':'Needs checking')+'</span>';
    function moneySyncPlan(allowances=moneySetup.allowances){const result=RecurringMoneyDemo.applyToPlan(allowances);if(result.ok){moneySetup.allowances={...allowances};moneyView.extra=MoneyDemo.plan.extraDebt;}return result;}
    function moneyReferenceNotice(){const r=MoneyReferenceDemo.reference;return r?'<div class="money-reference-notice"><span>'+icon('calendar')+'</span><p><strong>Previous plan: '+esc(r.asOf||'date not stated')+'</strong><br>All '+r.items.length+' references need checking. Imported references do not change the working figures below.</p><button class="text-button" data-action="money-setup-pane" data-pane="reference">Review figures '+icon('arrow')+'</button></div>':'';}
    function renderMoneySetup(){
      const pane=moneySetup.pane,items=RecurringMoneyDemo.items,r=MoneyReferenceDemo.reference,p=MoneyDemo.plan;
      const tabs=[['accounts','What you own',MoneyDemo.accounts.length],['debts','What you owe',MoneyDemo.debts.length],['income','Money coming in',items.filter(x=>x.kind==='income').length],['bills','Money going out',items.filter(x=>x.kind!=='income').length],['reference','Previous plan',r?r.items.length:0]];
      let content='';
      if(pane==='accounts')content='<div class="money-section-title"><div><span class="eyebrow">Balances, not monthly payments</span><h2>Accounts, savings & investments.</h2></div></div><p class="money-copy">Add each place you keep money. Enter its current value and the date you checked it. Regular saving and investing go under Money going out.</p><div class="row wrap"><button class="button primary" data-action="money-account-new">'+icon('plus')+' Add account</button><button class="text-button" data-action="money-recurring-new" data-kind="contribution">Add a regular contribution '+icon('arrow')+'</button></div>'+MoneyDemo.accounts.map(a=>'<button class="money-setup-row" data-action="money-account" data-id="'+esc(a.id)+'"><span class="money-setup-icon">'+icon(a.type==='investment'?'progress':'wallet')+'</span><span><strong>'+esc(a.name)+'</strong>'+(a.reviewStatus==='needs-checking'?moneyReviewBadge(false):'')+'<small>'+esc([a.provider,a.subtype||moneyType(a.type)].filter(Boolean).join(' · '))+'<br>Balance dated '+dateLabel(a.balanceDate||a.openedOn)+'</small></span><span class="money-setup-value">'+moneyFormat(a.balance)+'<small>Open details</small></span></button>').join('');
      if(pane==='debts')content='<div class="money-section-title"><div><span class="eyebrow">One place for every agreement</span><h2>Know the terms.</h2></div></div><p class="money-copy">Add the amount owed, APR and required payment. For loans, keep the remaining payments or agreed end date alongside the payoff estimate.</p><button class="button primary" data-action="money-debt-new">'+icon('plus')+' Add debt</button>'+MoneyDemo.debts.map(d=>'<button class="money-setup-row" data-action="money-debt-edit" data-id="'+esc(d.id)+'"><span class="money-setup-icon debt">'+icon('debt')+'</span><span><strong>'+esc(d.name)+'</strong>'+(d.reviewStatus==='needs-checking'?moneyReviewBadge(false):'')+'<small>'+d.apr+'% APR · '+moneyFormat(d.minPayment)+' / month<br>'+(d.paymentsRemaining!==null&&d.paymentsRemaining!==undefined?d.paymentsRemaining+' payments remaining':d.finalPaymentDate?'Agreement ends '+dateLabel(d.finalPaymentDate,{month:'short',year:'numeric'}):'Remaining term not entered')+(d.paymentDay?' · Due day '+d.paymentDay:' · Payment day not entered')+'</small></span><span class="money-setup-value">'+moneyFormat(d.balance)+'<small>Edit details</small></span></button>').join('')+'<p class="money-note">For an overdraft, enter the amount owed as a debt and avoid adding it again as a negative account balance. Contract dates are reference details; the payoff curve remains an estimate.</p>';
      if(pane==='income'||pane==='bills'){
        const income=pane==='income',rows=items.filter(x=>income?x.kind==='income':x.kind!=='income');
        content='<div class="money-section-title"><div><span class="eyebrow">A plan that repeats</span><h2>'+(income?'When you get paid.':'What leaves, and when.')+'</h2></div></div><p class="money-copy">'+(income?'Enter your take-home salary after deductions, how often you receive it and the next payday. Add separate entries for other regular income.':'Name each bill, subscription or regular contribution. Annual and weekly amounts get a monthly planning average, with the actual due amount on the calendar.')+'</p><div class="row wrap"><button class="button primary" data-action="money-recurring-new" data-kind="'+(income?'income':'bill')+'">'+icon('plus')+' '+(income?'Add salary or income':'Add bill')+'</button>'+(!income?'<button class="button ghost" data-action="money-recurring-new" data-kind="subscription">Add subscription</button><button class="text-button" data-action="money-recurring-new" data-kind="contribution">Add savings or investing</button>':'')+'</div>'+rows.map(x=>'<button class="money-setup-row" data-action="money-recurring-edit" data-id="'+esc(x.id)+'"><span class="money-setup-icon">'+icon(x.kind==='income'?'plus':x.kind==='contribution'?'transfer':'calendar')+'</span><span><strong>'+esc(x.name)+'</strong><small>'+moneyFrequency(x.frequency)+' · From '+dateLabel(x.startDate)+(x.endDate?' to '+dateLabel(x.endDate):'')+'<br>'+(x.status==='paused'?'Paused · ':'')+(x.estimated?'Estimated amount · ':'')+(x.status==='active'&&x.reviewStatus==='checked'&&(!x.endDate||x.endDate>=TODAY)?'Included in plan':'Excluded from the active plan')+'</small></span><span class="money-setup-value">'+moneyFormat(x.amount)+'<small>Edit schedule</small></span></button>').join('')+(!rows.length?'<p class="money-empty">Add your first recurring entry. It will feed the monthly plan once checked.</p>':'')+'<p class="money-note">Debt minimum payments come from What you owe. Add them there once, rather than repeating them as bills. Saving and investing are transfers between your accounts.</p>';
      }
      if(pane==='reference')content=renderMoneyReference();
      return '<div class="money-setup-rail" aria-label="Money setup sections">'+tabs.map(([id,label,count],i)=>'<button data-action="money-setup-pane" data-pane="'+id+'" aria-pressed="'+(pane===id)+'"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+label+'</strong><small>'+count+' '+(id==='reference'?(count===1?'reference':'references'):(count===1?'entry':'entries'))+'</small></button>').join('')+'</div><div class="money-layout"><section>'+content+'</section><aside class="money-aside"><section class="money-aside-section"><span class="eyebrow">Connected to your monthly plan</span><h2>'+moneyFormat(p.income)+'</h2><p>Average monthly take-home income from checked schedules.</p><div class="stat-line"><span>Planned spending</span><strong>'+moneyFormat(p.essentials+p.flexible)+'</strong></div><div class="stat-line"><span>Required debt payments</span><strong>'+moneyFormat(p.minimumDebt)+'</strong></div><div class="stat-line"><span>Extra debt, saving & investing</span><strong>'+moneyFormat(p.extraDebt+p.savings+p.investment)+'</strong></div><div class="stat-line"><span>'+(p.leftover<0?'Funding gap':'Unassigned')+'</span><strong>'+moneyFormat(Math.abs(p.leftover))+'</strong></div><button class="text-button gap-top" data-action="money-tab" data-tab="plan">Follow the money '+icon('arrow')+'</button></section><section class="money-aside-section"><span class="eyebrow">Keep the record honest</span><p>Scheduling a salary or bill does not say it happened. Due entries can be reviewed and recorded once the money actually moves.</p><p>Previous plans stay in their own review area. Needs-checking figures are not silently mixed with current balances.</p><button class="text-button" data-action="money-reference-import">Bring in a previous plan '+icon('arrow')+'</button></section></aside></div>';
    }
    function renderMoneyReference(){const r=MoneyReferenceDemo.reference;return '<div class="money-section-title"><div><span class="eyebrow">A reference, awaiting review</span><h2>Pick up where you left off.</h2></div></div><p class="money-copy">Read a previous plan locally. Its figures remain marked Needs checking, separate from current account balances, active schedules and recorded transactions.</p><button class="button '+(r?'ghost':'primary')+'" data-action="money-reference-import">'+icon('plus')+' '+(r?'Read another plan':'Read a previous plan')+'</button>'+(r?'<p class="money-note">'+esc(r.fileName)+' · '+esc(r.asOf||'Date unknown')+'</p>'+'<details class="goal-editor-details"><summary>What needs checking and why</summary>'+r.notes.map(n=>'<p class="money-reference-note">'+esc(n)+'</p>').join('')+'</details><div class="money-reference-list">'+r.items.map(x=>'<button class="money-reference-row" data-action="money-reference-detail" data-id="'+esc(x.id)+'"><span><strong>'+esc(x.name)+'</strong><small>'+({debt:'Recorded debt',income:'Recorded income',budget:'Budget reference',proposal:'Proposed change',unknown:'Reference cross-check'}[x.kind]||'Reference')+'</small></span><span>'+(x.amount!==undefined?moneyFormat(x.amount):'Not stated')+moneyReviewBadge(false)+'</span></button>').join('')+'</div>':'<div class="money-reference-empty">'+icon('calendar')+'<h3>Old numbers keep their date.</h3><p>Debts, budgets and proposed changes can be reviewed together. Missing account holdings stay unknown.</p></div>');}
    function moneyRecurringDialog(kind='bill',id=null){const item=RecurringMoneyDemo.items.find(x=>x.id===id),x=item||{kind,name:'',amount:'',frequency:'monthly',startDate:TODAY,endDate:'',bucket:kind==='income'?'income':kind==='contribution'?'savings':kind==='bill'?'essentials':'flexible',accountId:'',toAccountId:'',estimated:false,note:'',status:'active',reviewStatus:'needs-checking'};showDialog(item?'Edit '+x.name:kind==='income'?'Add salary or income':kind==='subscription'?'Add a subscription':kind==='contribution'?'Plan a regular contribution':'Add a regular bill','<form id="moneyRecurringForm" data-id="'+esc(id||'')+'" data-kind="'+esc(x.kind)+'"><p class="dialog-sub">'+(x.kind==='income'?'Use the amount that reaches your bank after tax, pension and other deductions.':'Enter the amount each time it is due. The calendar keeps the payment date; the monthly plan works out the average.')+'</p><label>'+(x.kind==='income'?'Income name':'Name')+'<input id="moneyRecurringName" maxlength="80" required value="'+esc(x.name)+'" placeholder="'+(x.kind==='income'?'Monthly salary':x.kind==='subscription'?'Music subscription':x.kind==='contribution'?'Emergency fund contribution':'Rent or electricity')+'"></label><div class="money-form-grid"><label>'+(x.kind==='income'?'Take-home amount, £':'Amount each time, £')+'<input id="moneyRecurringAmount" type="number" min="0.01" max="100000000" step="0.01" inputmode="decimal" required value="'+x.amount+'"></label><label>How often?<select id="moneyRecurringFrequency">'+['weekly','fortnightly','four-weekly','monthly','quarterly','yearly'].map(f=>'<option value="'+f+'" '+(x.frequency===f?'selected':'')+'>'+moneyFrequency(f)+'</option>').join('')+'</select></label><label>First or next due date<input id="moneyRecurringStart" type="date" required value="'+esc(x.startDate)+'"></label><label>Last due date, optional<input id="moneyRecurringEnd" type="date" value="'+esc(x.endDate||'')+'"></label></div><p class="money-form-hint">A schedule anchored on the 31st uses the last day in shorter months. It returns to the 31st afterwards.</p>'+ (x.kind!=='income'?'<label>Where does this fit?<select id="moneyRecurringBucket">'+(x.kind==='contribution'?[['savings','Cash savings'],['investment','Investing']]:[['essentials','Essentials'],['flexible','Everyday choices']]).map(([v,label])=>'<option value="'+v+'" '+(x.bucket===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>':'')+'<div class="money-form-grid"><label>'+(x.kind==='income'?'Paid into':'Paid from')+'<select id="moneyRecurringAccount"><option value="">Choose later</option>'+moneyAccountOptions(x.accountId)+'</select></label>'+(x.kind==='contribution'?'<label>To account<select id="moneyRecurringTo"><option value="">Choose later</option>'+moneyAccountOptions(x.toAccountId)+'</select></label>':'')+'</div><div class="money-form-grid"><label>Schedule status<select id="moneyRecurringStatus"><option value="active" '+(x.status==='active'?'selected':'')+'>Active</option><option value="paused" '+(x.status==='paused'?'selected':'')+'>Paused</option></select></label><label>Figure status<select id="moneyRecurringReview"><option value="needs-checking" '+(x.reviewStatus!=='checked'?'selected':'')+'>Needs checking</option><option value="checked" '+(x.reviewStatus==='checked'?'selected':'')+'>Checked, include in plan</option></select></label></div><label class="money-checkbox"><input id="moneyRecurringEstimate" type="checkbox" '+(x.estimated?'checked':'')+'>This is an estimate, for example a variable bill</label><label class="gap-top">Notes, optional<input id="moneyRecurringNote" maxlength="300" value="'+esc(x.note||'')+'"></label><div class="money-form-result" id="moneyRecurringPreview"></div><div id="moneyRecurringError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save schedule</button></div></form>');updateMoneyRecurringPreview();}
    function updateMoneyRecurringPreview(){if(!$('moneyRecurringForm'))return;const amount=Number($('moneyRecurringAmount').value),annual={weekly:52,fortnightly:26,'four-weekly':13,monthly:12,quarterly:4,yearly:1}[$('moneyRecurringFrequency').value],checked=$('moneyRecurringReview').value==='checked'&&$('moneyRecurringStatus').value==='active'&&(!$('moneyRecurringEnd').value||$('moneyRecurringEnd').value>=TODAY);$('moneyRecurringPreview').textContent=(Number.isFinite(amount)?moneyFormat(Math.round(amount*annual/12*100)/100)+' average per month. ':'')+(checked?'Included in your plan when saved. No transaction is created.':'Kept for review and excluded from the active plan.');}
    function moneyPlanDialog(){const r=RecurringMoneyDemo.monthlyAverage(),a=moneySetup.allowances,p=MoneyDemo.plan;showDialog('Allowances around your regular payments','<form id="moneyPlanForm"><p class="dialog-sub">Your named schedules already provide '+moneyFormat(r.income)+' average income, '+moneyFormat(r.essentials+r.flexible)+' spending and '+moneyFormat(r.savings+r.investment)+' contributions. Add only the money you want to set aside on top.</p><button type="button" class="text-button" data-action="money-setup-pane" data-pane="income">Edit salary and recurring payments '+icon('arrow')+'</button><div class="money-form-grid">'+[['Other essentials','essentials'],['Other everyday spending','flexible'],['Extra debt payment','extraDebt'],['Additional cash savings','savings'],['Additional investment','investment']].map(([label,key])=>'<label>'+label+', £<input data-money-plan="'+key+'" type="number" min="0" max="1000000" step="0.01" value="'+a[key]+'" required></label>').join('')+'</div><p class="money-form-hint">'+moneyFormat(p.minimumDebt)+' required debt payments are included from your debt details. These allowances do not create a dated payment.</p><div id="moneyPlanPreview" class="money-form-result"></div><div id="moneyPlanError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save monthly plan</button></div></form>');updateMoneyPlanPreview();}
    function readMoneyPlan(){const patch={};document.querySelectorAll('[data-money-plan]').forEach(input=>patch[input.dataset.moneyPlan]=Number(input.value));return patch;}
    function updateMoneyPlanPreview(){if(!$('moneyPlanForm'))return;const r=RecurringMoneyDemo.monthlyAverage(),a=readMoneyPlan(),left=r.income-r.essentials-r.flexible-r.savings-r.investment-MoneyDemo.plan.minimumDebt-Object.values(a).reduce((sum,n)=>sum+n,0);$('moneyPlanPreview').textContent=moneyFormat(Math.abs(left))+(left<0?' more allocated than income. This plan has a funding gap.':' left unassigned each average month.');}
    function moneyMonthBounds(key){const [year,month]=key.split('-').map(Number);return {from:key+'-01',to:new Date(Date.UTC(year,month,0)).toISOString().slice(0,10)};}
    function moneyCalendarRows(){const b=moneyMonthBounds(moneySetup.calendarMonth),rows=RecurringMoneyDemo.occurrences(b.from,b.to).map(x=>({...x,source:'recurring'}));MoneyDemo.debts.filter(d=>d.balance>0&&d.minPayment>0&&d.paymentDay).forEach(d=>{const day=Math.min(d.paymentDay,Number(b.to.slice(-2))),date=moneySetup.calendarMonth+'-'+String(day).padStart(2,'0');if(date<d.openedOn)return;const operationId='scheduled-debt:'+d.id+':'+date;rows.push({id:d.id+'@'+date,debtId:d.id,name:d.name,date,kind:'debt-payment',bucket:'debt',amount:d.minPayment,operationId,source:'debt',recorded:MoneyDemo.transactionVersions.some(t=>t.operationId===operationId)});});return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));}
    function renderMoneyCalendar(){const rows=moneyCalendarRows(),m=RecurringMoneyDemo.month(moneySetup.calendarMonth),debt=rows.filter(x=>x.source==='debt').reduce((sum,x)=>sum+x.amount,0),missing=MoneyDemo.debts.filter(d=>d.balance>0&&d.minPayment>0&&!d.paymentDay).length;return '<section class="money-calendar-section"><div class="money-section-title"><div><span class="eyebrow">The plan, on actual dates</span><h2>Money has a rhythm.</h2></div><label>Calendar month<input type="month" id="moneyCalendarMonth" value="'+moneySetup.calendarMonth+'" min="1970-01" max="2126-12"></label></div><p class="money-copy">The flow above uses a monthly average. Here, an annual bill appears in full when due. Checked schedules start on their entered date.</p><div class="money-calendar-totals"><span>Scheduled in<strong>'+moneyFormat(m.income)+'</strong></span><span>Scheduled bills<strong>'+moneyFormat(m.essentials+m.flexible)+'</strong></span><span>Contributions & debt<strong>'+moneyFormat(m.savings+m.investment+debt)+'</strong></span></div><div class="money-calendar-stream">'+rows.map(x=>'<button class="money-calendar-event '+(x.kind==='income'?'income':'')+'" data-action="money-occurrence" data-id="'+esc(x.id)+'" data-source="'+x.source+'"><span class="money-calendar-date">'+Number(x.date.slice(-2))+'<small>'+dateLabel(x.date,{weekday:'short'})+'</small></span><span class="money-calendar-dot"></span><span><strong>'+esc(x.name)+'</strong><small>'+(x.recorded?'Recorded':x.date>TODAY?'Upcoming':x.date===TODAY?'Due today, review before recording':'Past due date, check whether paid')+(x.estimated?' · Estimated':'')+'</small></span><span class="money-calendar-amount">'+(x.kind==='income'?'+':'')+moneyFormat(x.amount)+'</span></button>').join('')+(!rows.length?'<p class="money-empty">No checked schedules in this month. Add a salary, bill or contribution, or move forward to its first due date.</p>':'')+'</div>'+(missing?'<p class="money-note">'+missing+' debt'+(missing===1?' needs':'s need')+' a payment day before appearing here. Required payments are already included in the monthly plan. <button class="text-button" data-action="money-setup-pane" data-pane="debts">Add payment dates</button></p>':'')+'<p class="money-note">Only dated commitments appear here. Extra debt payments and other allowances remain in the monthly plan. Entries are never marked paid automatically.</p></section>';}
    function moneyOccurrenceDialog(id,source){const x=moneyCalendarRows().find(x=>x.id===id&&x.source===source);if(!x)return;showDialog(x.name,'<span class="eyebrow">'+(x.kind==='income'?'Scheduled income':x.kind==='contribution'?'Scheduled contribution':x.kind==='debt-payment'?'Scheduled debt payment':'Scheduled bill')+'</span><div class="money-number">'+moneyFormat(x.amount)+'</div><p class="dialog-sub">Due '+dateLabel(x.date,{day:'numeric',month:'long',year:'numeric'})+(x.estimated?' · Estimated amount':'')+'</p><p class="money-note">'+(x.recorded?'This scheduled occurrence already has a linked financial record.':x.date>TODAY?'Upcoming in this app. It will be ready to review on its due date.':'Check your statement first. Review the account and amount before recording this occurrence, especially if you already entered the payment elsewhere.')+'</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Done</button>'+(!x.recorded&&x.date<=TODAY?'<button class="button primary" data-action="money-occurrence-review" data-source="'+source+'" data-id="'+esc(id)+'">Review & record</button>':'')+'</div>');}
    function moneyReviewOccurrence(id,source){let tx;if(source==='debt'){const x=moneyCalendarRows().find(x=>x.id===id&&x.source===source);if(!x||x.recorded||x.date>TODAY)return;tx={type:'debt-payment',date:x.date,amount:x.amount,debtId:x.debtId,accountId:MoneyDemo.accounts.find(x=>x.type==='current')?.id,operationId:x.operationId,note:'Scheduled payment: '+x.name};}else{const result=RecurringMoneyDemo.transactionForOccurrence(id);if(!result.ok){toast(result.error);return;}tx=result.transaction;}if(moneyRecordDialog(tx.type,null,tx.accountId)===false)return;$('moneyTxDate').value=tx.date;$('moneyTxAmount').value=tx.amount;$('moneyTxAccount').value=tx.accountId||'';if(tx.toAccountId)$('moneyTxTo').value=tx.toAccountId;if(tx.debtId)$('moneyTxDebt').value=tx.debtId;$('moneyTxNote').value=tx.note||'';$('moneyTxCategory').value=tx.category||'';$('moneyTransactionForm').dataset.operation=tx.operationId;updateMoneyRecordForm();}
    function moneyReferenceImport(){showDialog('Read a previous plan','<p class="dialog-sub">Choose your plan file. Its contents are read locally as reference data. Every extracted figure starts as Needs checking.</p><label>Plan file, HTML or JSON<input id="moneyReferenceFile" type="file" accept=".html,.htm,.json,.txt"></label><p class="money-form-hint">Supports the debt-plan HTML format and a structured reference JSON. Reading a file does not run its scripts or change account balances.</p><details class="goal-editor-details"><summary>Or paste plan text</summary><form id="moneyReferencePasteForm"><label>Plan HTML or reference JSON<textarea id="moneyReferenceText" rows="8" spellcheck="false" required></textarea></label><button class="button primary gap-top" type="submit">Read pasted plan</button></form></details><div id="moneyReferenceError" class="error" role="alert"></div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Cancel</button></div>');}
    function moneyReadReference(text,name){const result=MoneyReferenceDemo.importText(text,name);if(!result.ok){$('moneyReferenceError').textContent=result.error;return;}moneySetup.pane='reference';moneyView.tab='setup';closeDialog();render();toast('Previous figures loaded for review. Every item still needs checking.');}
    function moneyReferenceDetail(id){const x=MoneyReferenceDemo.entry(id);if(!x)return;showDialog(x.name,moneyReviewBadge(false)+(x.amount!==undefined?'<div class="money-number">'+moneyFormat(x.amount)+'</div>':'<h3 class="gap-top">No verified amount</h3>')+(x.apr!==undefined?'<div class="stat-line"><span>APR recorded in the old plan</span><strong>'+x.apr+'%</strong></div>':'')+(x.minPayment!==undefined?'<div class="stat-line"><span>Monthly payment recorded</span><strong>'+moneyFormat(x.minPayment)+'</strong></div>':'')+'<p class="money-copy">'+esc(x.note||'Check this against current information before adding it to your active setup.')+'</p><p class="money-note">This reference does not update the active plan. It remains Needs checking until you review current information. Use your latest statement or agreement when entering current details in Money setup.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function handleMoneySetupAction(a,d){if(a==='money-setup-pane'){moneySetup.pane=d.pane;moneyView.tab='setup';closeDialog();render();window.scrollTo({top:0,behavior:'instant'});return true;}if(a==='money-recurring-new'||a==='money-recurring-edit'){moneyRecurringDialog(d.kind||'bill',d.id||null);return true;}if(a==='money-reference-import'){moneyReferenceImport();return true;}if(a==='money-reference-detail'){moneyReferenceDetail(d.id);return true;}if(a==='money-occurrence'){moneyOccurrenceDialog(d.id,d.source);return true;}if(a==='money-occurrence-review'){moneyReviewOccurrence(d.id,d.source);return true;}return false;}
    document.addEventListener('input',event=>{if(event.target.closest('#moneyRecurringForm'))updateMoneyRecurringPreview();});
    document.addEventListener('change',event=>{if(event.target.closest('#moneyRecurringForm'))updateMoneyRecurringPreview();if(event.target.id==='moneyCalendarMonth'){if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)&&event.target.value>='1970-01'&&event.target.value<='2126-12'){moneySetup.calendarMonth=event.target.value;render();}}if(event.target.id==='moneyReferenceFile'){const file=event.target.files[0];if(!file)return;if(file.size>2000000){$('moneyReferenceError').textContent='Choose a plan smaller than 2 MB.';return;}const reader=new FileReader();reader.onload=()=>{if($('moneyReferenceError'))moneyReadReference(String(reader.result),file.name);};reader.onerror=()=>{if($('moneyReferenceError'))$('moneyReferenceError').textContent='The file could not be read. Try choosing it again.';};reader.readAsText(file);}});
    document.addEventListener('submit',event=>{const f=event.target;if(f.id==='moneyReferencePasteForm'){event.preventDefault();moneyReadReference($('moneyReferenceText').value,'Pasted reference');return;}if(f.id!=='moneyRecurringForm')return;event.preventDefault();const kind=f.dataset.kind,value={id:f.dataset.id||undefined,name:$('moneyRecurringName').value.trim(),kind,amount:$('moneyRecurringAmount').value,frequency:$('moneyRecurringFrequency').value,startDate:$('moneyRecurringStart').value,endDate:$('moneyRecurringEnd').value||null,accountId:$('moneyRecurringAccount').value||null,toAccountId:$('moneyRecurringTo')?.value||null,bucket:kind==='income'?'income':$('moneyRecurringBucket').value,estimated:$('moneyRecurringEstimate').checked,note:$('moneyRecurringNote').value.trim(),status:$('moneyRecurringStatus').value,reviewStatus:$('moneyRecurringReview').value};const result=RecurringMoneyDemo.upsert(value);if(!result.ok){$('moneyRecurringError').textContent=result.error;return;}const sync=moneySyncPlan();if(!sync.ok){$('moneyRecurringError').textContent=sync.error;return;}moneySetup.pane=kind==='income'?'income':'bills';moneyView.tab='setup';closeDialog();render();toast(value.reviewStatus==='checked'?'Schedule saved. Your monthly plan has updated.':'Saved as Needs checking and excluded from the active plan.');});

    // Fictional, in-memory people library and append-only contact record.
    const PeopleDemo = (() => {
      const people = [], eventHistory = [], gifts = [], plans = [];
      const copy = value => JSON.parse(JSON.stringify(value));
      const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
      const field = (input, key, previous, fallback) => has(input, key) && input[key] !== undefined ? input[key] : previous && has(previous, key) ? previous[key] : fallback;
      const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
      const shiftDate = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
      const validDate = (value, label, future = true) => { if (!dateOK(value) || (!future && value > TODAY)) throw new Error('Choose a valid ' + label + (future ? '.' : ' on or before today.')); return value; };
      const textValue = (value, label, max = 500, required = false) => { if (value === null || value === undefined) value = ''; if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error(label + ' must be ' + (required ? 'non-empty ' : '') + 'text of up to ' + max + ' characters.'); return value.trim(); };
      const protect = fn => { try { return fn(); } catch (error) { return { ok: false, error: error.message || String(error) }; } };
      const success = entity => ({ ok: true, entity: copy(entity) });
      function identifier(value, prefix) { const id = value || uid(prefix); if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(id)) throw new Error('This record has an invalid identifier.'); return id; }
      function person(id) { const value = people.find(item => item.id === id); return value ? copy(value) : null; }
      function personRequired(id) { const value = people.find(item => item.id === id); if (!value) throw new Error('Choose a person from your people list.'); return value; }
      function stringList(value, label) { if (value === null) return []; if (!Array.isArray(value) || value.length > 40) throw new Error(label + ' must be a list of up to 40 short notes.'); return [...new Set(value.map(item => textValue(item, label, 120)).filter(Boolean))]; }
      function optionalInteger(value, label, min, max) { if (value === null || value === undefined || value === '') return null; if (!['string', 'number'].includes(typeof value) || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) throw new Error(label + ' must be a whole number from ' + min + ' to ' + max + ', or left blank.'); return Number(value); }
      function upsertPerson(input) {
        return protect(() => {
          if (!input || typeof input !== 'object') throw new Error('Enter the person details.');
          const id = identifier(input.id, 'person'), previous = people.find(item => item.id === id);
          const name = textValue(field(input, 'name', previous, ''), 'Name', 80, true);
          const group = field(input, 'group', previous, 'other');
          if (!['family', 'friends', 'work', 'other'].includes(group)) throw new Error('Choose family, friends, work or other.');
          const birthday = field(input, 'birthday', previous, null) || null;
          if (birthday && (!/^\d{2}-\d{2}$/.test(birthday) || !dateOK('2000-' + birthday))) throw new Error('Choose a valid birthday month and day.');
          const birthYear = optionalInteger(field(input, 'birthYear', previous, null), 'Birth year', 1900, Number(TODAY.slice(0, 4)));
          if (birthYear !== null && (!birthday || !dateOK(birthYear + '-' + birthday) || birthYear + '-' + birthday > TODAY)) throw new Error('The birth year and birthday must form a real date on or before today.');
          const leapDay = field(input, 'leapDay', previous, 'feb28');
          if (!['feb28', 'mar1'].includes(leapDay)) throw new Error('Choose February 28 or March 1 for non-leap years.');
          const contactEveryDays = optionalInteger(field(input, 'contactEveryDays', previous, null), 'Days between contact reminders', 1, 3650);
          const contactStartDate = field(input, 'contactStartDate', previous, null) || null;
          if (contactStartDate) validDate(contactStartDate, 'first contact reminder date');
          const position = field(input, 'position', previous, { x: 0.5, y: 0.5 });
          if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) throw new Error('Map positions must be between 0 and 1.');
          const archived = field(input, 'archived', previous, false);
          if (typeof archived !== 'boolean') throw new Error('Choose whether this person is archived.');
          const entity = { id, name, group, relationshipLabel: textValue(field(input, 'relationshipLabel', previous, ''), 'Relationship label', 80), birthday, birthYear, leapDay, contactEveryDays, contactStartDate, likes: stringList(field(input, 'likes', previous, []), 'Likes'), dislikes: stringList(field(input, 'dislikes', previous, []), 'Dislikes'), note: textValue(field(input, 'note', previous, ''), 'Personal note', 4000), position: { x: position.x, y: position.y }, archived, createdOn: previous ? previous.createdOn : TODAY, updatedOn: TODAY };
          if (previous) people[people.indexOf(previous)] = entity; else people.push(entity);
          return success(entity);
        });
      }
      function latestEvents() { const values = new Map(); eventHistory.forEach(event => values.set(event.rootId, event)); return Array.from(values.values()).sort((a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence); }
      function buildEvent(input, previous = null) {
        if (!input || typeof input !== 'object') throw new Error('Enter the contact or note details.');
        const p = personRequired(input.personId);
        if (!['contact', 'note'].includes(input.type)) throw new Error('Choose a contact or a note.');
        const date = validDate(input.date, 'record date', false);
        const kind = input.type === 'contact' ? input.kind || '' : '';
        if (!['message', 'call', 'in-person', ''].includes(kind)) throw new Error('Choose a message, call or in-person contact.');
        const title = textValue(input.title, 'Title', 160), body = textValue(input.body, 'Note', 4000);
        if (input.type === 'note' && !title && !body) throw new Error('Add a title or something you want to remember.');
        const operationId = input.operationId ? textValue(input.operationId, 'Operation identifier', 240) : null;
        if (operationId && eventHistory.some(event => event.operationId === operationId)) throw new Error('This update has already been recorded.');
        const id = uid('people-event');
        return { id, rootId: previous ? previous.rootId : id, supersedes: previous ? previous.id : null, sequence: previous ? previous.sequence : eventHistory.length + 1, personId: p.id, personName: p.name, type: input.type, date, kind, title: title || (input.type === 'contact' ? ({ message: 'Exchanged messages', call: 'A call', 'in-person': 'Met in person', '': 'Caught up' }[kind]) : ''), body, operationId, planId: previous ? previous.planId || null : null, recordedOn: TODAY };
      }
      function addEvent(input) { return protect(() => { const event = buildEvent(input); eventHistory.push(event); return success(event); }); }
      function correctEvent(id, input) { return protect(() => { const previous = latestEvents().find(event => event.id === id); if (!previous) throw new Error('This entry has already changed. Open its current version.'); const event = buildEvent(input, previous); if (previous.planId && (event.type !== 'contact' || event.personId !== previous.personId)) throw new Error('A completed plan must stay linked to its original person and contact record.'); eventHistory.push(event); const plan = previous.planId ? plans.find(item => item.id === previous.planId && item.completedEventRootId === event.rootId) : null; if (plan) plan.completedOn = event.date; return success(event); }); }
      function nextContact(personId) {
        const p = person(personId);
        if (!p || p.archived || !p.contactEveryDays) return null;
        const contact = latestEvents().find(event => event.personId === p.id && event.type === 'contact');
        const date = contact ? shiftDate(contact.date, p.contactEveryDays) : p.contactStartDate;
        if (!date) return null;
        const daysUntil = Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(TODAY + 'T12:00:00Z')) / 86400000);
        return { personId: p.id, personName: p.name, date, overdue: date < TODAY, dueToday: date === TODAY, daysUntil, lastContactDate: contact ? contact.date : null, source: contact ? 'cadence' : 'start' };
      }
      function birthdayDate(p, year) { if (!p.birthday) return null; let date = year + '-' + p.birthday; if (p.birthday === '02-29' && !dateOK(date)) date = year + (p.leapDay === 'mar1' ? '-03-01' : '-02-28'); return date; }
      function nextBirthday(personId, from = TODAY) {
        const p = person(personId);
        if (!p || p.archived || !p.birthday || !dateOK(from)) return null;
        let year = Number(from.slice(0, 4)), date = birthdayDate(p, year);
        if (date < from) date = birthdayDate(p, ++year);
        return { id: 'birthday:' + p.id + ':' + date, type: 'birthday', personId: p.id, personName: p.name, date, age: p.birthYear === null ? null : year - p.birthYear };
      }
      function priceValue(value) { if (value === null || value === undefined || value === '') return null; if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value.trim()))) throw new Error('Gift price needs pounds and pence, or can be left blank.'); const number = Number(value), pence = Math.round(number * 100); if (!Number.isFinite(number) || !Number.isSafeInteger(pence) || number < 0 || Math.abs(number * 100 - pence) > 0.000001) throw new Error('Gift price cannot be negative or include fractions of a penny.'); return pence / 100; }
      function upsertGift(input) {
        return protect(() => {
          if (!input || typeof input !== 'object') throw new Error('Enter the gift details.');
          const id = identifier(input.id, 'gift'), previous = gifts.find(gift => gift.id === id);
          const p = personRequired(field(input, 'personId', previous, null));
          if (previous && previous.personId !== p.id) throw new Error('Keep this gift with its original person, or add another idea.');
          const status = field(input, 'status', previous, 'idea');
          if (!['idea', 'bought', 'given'].includes(status)) throw new Error('Choose idea, bought or given.');
          const date = field(input, 'date', previous, null) || null;
          if (date) validDate(date, 'occasion date');
          const title = textValue(field(input, 'title', previous, ''), 'Gift title', 160, true), note = textValue(field(input, 'note', previous, ''), 'Gift note', 2000), price = priceValue(field(input, 'price', previous, null)), occasion = textValue(field(input, 'occasion', previous, ''), 'Occasion', 120);
          const statusHistory = previous ? copy(previous.statusHistory) : [];
          if (!previous || previous.status !== status) statusHistory.push({ id: uid('gift-status'), status, date: TODAY, personName: p.name, title, price, note, occasion });
          const entity = { id, personId: p.id, title, note, price, status, occasion, date, statusHistory, createdOn: previous ? previous.createdOn : TODAY, updatedOn: TODAY };
          if (previous) gifts[gifts.indexOf(previous)] = entity; else gifts.push(entity);
          return success(entity);
        });
      }
      function completePlan(id, details = {}) {
        return protect(() => {
          const plan = plans.find(item => item.id === id);
          if (!plan) throw new Error('This plan could not be found.');
          if (plan.status === 'done') return { ok: true, unchanged: true, entity: copy(plan), event: copy(latestEvents().find(event => event.rootId === plan.completedEventRootId) || null) };
          if (plan.status === 'cancelled') throw new Error('Restore this plan before recording it as completed.');
          const event = buildEvent({ personId: plan.personId, type: 'contact', date: details.date || TODAY, kind: details.kind || 'in-person', title: plan.title, body: details.body || plan.note, operationId: 'people-plan:' + plan.id });
          event.planId = plan.id;
          eventHistory.push(event);
          plan.status = 'done'; plan.completedEventRootId = event.rootId; plan.completedOn = event.date;
          plan.statusHistory.push({ status: 'done', date: TODAY });
          return { ok: true, entity: copy(plan), event: copy(event) };
        });
      }
      function upsertPlan(input) {
        return protect(() => {
          if (!input || typeof input !== 'object') throw new Error('Enter the plan details.');
          const id = identifier(input.id, 'people-plan'), previous = plans.find(plan => plan.id === id);
          if (previous && previous.status === 'done') throw new Error('This plan is complete. Correct its contact record to change what happened.');
          const p = personRequired(field(input, 'personId', previous, null));
          const status = field(input, 'status', previous, 'planned');
          if (!['planned', 'cancelled'].includes(status)) throw new Error('Save the plan first, then record it as completed.');
          const time = field(input, 'time', previous, '') || '';
          if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid time, or leave it blank.');
          const statusHistory = previous ? copy(previous.statusHistory) : [];
          if (!previous || previous.status !== status) statusHistory.push({ status, date: TODAY });
          const entity = { id, personId: p.id, title: textValue(field(input, 'title', previous, ''), 'Plan title', 160, true), date: validDate(field(input, 'date', previous, null), 'plan date'), time, note: textValue(field(input, 'note', previous, ''), 'Plan note', 2000), status, statusHistory, completedEventRootId: null, completedOn: null };
          if (previous) plans[plans.indexOf(previous)] = entity; else plans.push(entity);
          return success(entity);
        });
      }
      function upcoming(options = {}) {
        const from = options.from || TODAY;
        if (!dateOK(from)) return [];
        const to = options.to || shiftDate(from, 60);
        if (!dateOK(to) || from > to) return [];
        const result = [];
        people.filter(p => !p.archived).forEach(p => {
          if (p.birthday) for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
            const date = birthdayDate(p, year);
            if (date >= from && date <= to && (p.birthYear === null || year >= p.birthYear)) result.push({ id: 'birthday:' + p.id + ':' + date, type: 'birthday', personId: p.id, personName: p.name, date, age: p.birthYear === null ? null : year - p.birthYear });
          }
          const contact = nextContact(p.id);
          if (contact && contact.date <= to && (contact.date >= from || (options.includeOverdue === true && contact.overdue))) result.push({ ...contact, id: 'contact:' + p.id + ':' + contact.date, type: 'contact' });
          plans.filter(plan => plan.personId === p.id && plan.status === 'planned' && plan.date <= to && (plan.date >= from || (options.includeOverdue === true && plan.date < TODAY))).forEach(plan => result.push({ id: plan.id, type: 'plan', personId: p.id, personName: p.name, date: plan.date, time: plan.time, title: plan.title, planId: plan.id, overdue: plan.date < TODAY }));
        });
        return copy(result.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '') || a.personName.localeCompare(b.personName)));
      }
      function profile(id) { const p = person(id); if (!p) return null; return { person: p, events: copy(latestEvents().filter(event => event.personId === id)), gifts: copy(gifts.filter(gift => gift.personId === id)), plans: copy(plans.filter(plan => plan.personId === id)), nextContact: nextContact(id), nextBirthday: nextBirthday(id) }; }

      function snapshot(){return copy({schema:'lifeos.people.v1',people,eventVersions:eventHistory,gifts,plans});}
      function restore(data,options={}){return LifeSnapshotCheck.protect(()=>{
        const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.people.v1'),p=C.indexed(s.people,'people'),g=C.indexed(s.gifts,'gifts'),planned=C.indexed(s.plans,'people plans');
        for(const row of p.values()){C.text(row.name,80,true);C.one(row.group,['family','friends','work','other']);C.text(row.relationshipLabel,80);C.optional(row.birthday,v=>{C.text(v,5,true);C.check(/^\d{2}-\d{2}$/.test(v),'Invalid birthday.');C.date('2000-'+v);});C.optional(row.birthYear,v=>{C.integer(v,1900,Number(TODAY.slice(0,4)));C.check(!!row.birthday,'Birth year needs a birthday.');C.date(v+'-'+row.birthday,true);});C.one(row.leapDay,['feb28','mar1']);C.optional(row.contactEveryDays,v=>C.integer(v,1,3650));C.optional(row.contactStartDate,C.date);for(const key of ['likes','dislikes']){C.check(Array.isArray(row[key])&&row[key].length<=40,'Invalid people interests.');row[key].forEach(v=>C.text(v,120));}C.text(row.note,4000);C.position(row.position);C.bool(row.archived);C.date(row.createdOn,true);C.date(row.updatedOn,true);}
        const current=C.chain(C.list(s.eventVersions,'people event versions'),(row,previous)=>{C.check(p.has(row.personId),'Event references a missing person.');C.text(row.personName,80,true);C.one(row.type,['contact','note']);C.date(row.date,true);C.date(row.recordedOn,true);C.one(row.kind,['message','call','in-person','']);C.text(row.title,160);C.text(row.body,4000);C.check(row.type==='contact'||row.title.trim()||row.body.trim(),'A note cannot be empty.');if(row.planId){C.check(planned.has(row.planId),'Contact references a missing plan.');C.check(row.type==='contact','Plan event must remain a contact.');}if(previous&&previous.planId)C.check(row.planId===previous.planId&&row.personId===previous.personId,'Completed plan contact changed person.');});
        for(const gift of g.values()){C.check(p.has(gift.personId),'Gift references a missing person.');C.text(gift.title,160,true);C.text(gift.note,2000);C.optional(gift.price,C.money);C.one(gift.status,['idea','bought','given']);C.text(gift.occasion,120);C.optional(gift.date,C.date);C.date(gift.createdOn,true);C.date(gift.updatedOn,true);C.indexed(gift.statusHistory,'gift status history');C.check(gift.statusHistory.length>0&&gift.statusHistory[gift.statusHistory.length-1].status===gift.status,'Gift status trail is incomplete.');for(const step of gift.statusHistory){C.one(step.status,['idea','bought','given']);C.date(step.date,true);C.text(step.personName,80,true);C.text(step.title,160,true);C.optional(step.price,C.money);C.text(step.note,2000);C.text(step.occasion,120);}}
        for(const plan of planned.values()){C.check(p.has(plan.personId),'Plan references a missing person.');C.text(plan.title,160,true);C.date(plan.date);C.text(plan.time,5);C.check(plan.time===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time),'Invalid plan time.');C.text(plan.note,2000);C.one(plan.status,['planned','cancelled','done']);C.check(Array.isArray(plan.statusHistory)&&plan.statusHistory.length>0,'Plan status trail is missing.');for(const step of plan.statusHistory){C.object(step);C.one(step.status,['planned','cancelled','done']);C.date(step.date,true);}C.check(plan.statusHistory[plan.statusHistory.length-1].status===plan.status,'Plan status trail is incomplete.');if(plan.status==='done'){const contact=current.find(e=>e.rootId===plan.completedEventRootId);C.check(contact&&contact.planId===plan.id&&contact.personId===plan.personId&&contact.type==='contact'&&contact.date===plan.completedOn,'Completed plan and contact disagree.');}else C.check(plan.completedEventRootId===null&&plan.completedOn===null,'Unfinished plan contains a completion.');}
        if(options.validateOnly)return {ok:true};
        C.replace(people,s.people);C.replace(eventHistory,s.eventVersions);C.replace(gifts,s.gifts);C.replace(plans,s.plans);return {ok:true};
      });}

      return { snapshot, restore, get people() { return copy(people); }, get events() { return copy(latestEvents()); }, get eventVersions() { return copy(eventHistory); }, get gifts() { return copy(gifts); }, get plans() { return copy(plans); }, person, upsertPerson, addEvent, correctEvent, upsertGift, upsertPlan, completePlan, nextContact, nextBirthday, upcoming, profile };
    })();

function renderPeopleConstellation(people) {
  const all=Array.isArray(people)?people:[],shown=all.slice(0,8);
  const groups={family:{label:'Family',colour:'#c0b3ff'},friends:{label:'Friends',colour:'#85d6ff'},work:{label:'Work',colour:'#f1bc7b'},other:{label:'Other connections',colour:'#efaeca'}};
  const slots=[{x:.16,y:.15},{x:.5,y:.15},{x:.84,y:.15},{x:.84,y:.5},{x:.84,y:.85},{x:.5,y:.85},{x:.16,y:.85},{x:.16,y:.5}];
  const collides=(point,placed)=>Math.abs(point.x-.5)<.31&&Math.abs(point.y-.5)<.27||placed.some(other=>Math.abs(point.x-other.x)<.31&&Math.abs(point.y-other.y)<.265);
  const validPosition=position=>position&&typeof position.x==='number'&&typeof position.y==='number'&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&position.x>=0&&position.x<=1&&position.y>=0&&position.y<=1;
  let placed=[];
  for(const person of shown){
    const preferred=validPosition(person.position)?{x:Math.max(.16,Math.min(.84,person.position.x)),y:Math.max(.15,Math.min(.85,person.position.y))}:null;
    const point=preferred&&!collides(preferred,placed)?preferred:slots.find(slot=>!collides(slot,placed));
    if(!point){placed=shown.map((person,index)=>({...slots[index]}));break;}
    placed.push({...point});
  }
  const nameOf=person=>String(person.name||'Unnamed person');
  const groupOf=person=>Object.prototype.hasOwnProperty.call(groups,person.group)?person.group:'other';
  const initials=person=>nameOf(person).trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase('en-GB');
  const pathTo=point=>{const x=point.x*600,y=point.y*440,cx=300+(x-300)*.48+(y<220?22:-22),cy=220+(y-220)*.48+(x<300?24:-24);return 'M300 220 Q'+cx.toFixed(2)+' '+cy.toFixed(2)+' '+x.toFixed(2)+' '+y.toFixed(2);};
  const legend=Object.keys(groups).filter(group=>shown.some(person=>groupOf(person)===group));
  return '<section class="people-constellation" aria-label="Your people"><div class="people-constellation-map">'+
    '<svg class="people-constellation-lines" viewBox="0 0 600 440" preserveAspectRatio="none" aria-hidden="true"><ellipse class="people-orbit people-orbit-inner" cx="300" cy="220" rx="150" ry="142" transform="rotate(-18 300 220)"/><ellipse class="people-orbit people-orbit-outer" cx="300" cy="220" rx="246" ry="188" transform="rotate(12 300 220)"/>'+shown.map((person,index)=>'<path class="people-connection-line" d="'+pathTo(placed[index])+'" style="stroke:'+groups[groupOf(person)].colour+'"/>').join('')+'</svg>'+
    '<span class="people-spark people-spark-one" aria-hidden="true"></span><span class="people-spark people-spark-two" aria-hidden="true"></span><span class="people-spark people-spark-three" aria-hidden="true"></span>'+
    (shown.length?'<div class="people-constellation-centre" aria-hidden="true"><span class="people-centre-mark"><svg viewBox="0 0 24 24"><path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2 2.8-2.8"/><circle cx="12" cy="12" r="3"/></svg></span><strong>You</strong><small>Your people</small></div>':'<div class="people-constellation-empty"><span class="people-empty-orbit" aria-hidden="true"></span><strong>A little space for your people.</strong><p>No connections in this view yet.</p></div>')+
    shown.map((person,index)=>'<button class="people-constellation-node" data-action="people-open" data-id="'+esc(String(person.id))+'" data-group="'+groupOf(person)+'" style="left:'+(placed[index].x*100).toFixed(2)+'%;top:'+(placed[index].y*100).toFixed(2)+'%;--people-node-colour:'+groups[groupOf(person)].colour+'" aria-label="Open '+esc(nameOf(person))+'" title="'+esc(nameOf(person))+'"><span class="people-node-avatar" aria-hidden="true">'+esc(initials(person))+'</span><strong class="people-node-name">'+esc(nameOf(person))+'</strong><small class="people-node-relationship">'+esc(person.relationshipLabel||groups[groupOf(person)].label)+'</small></button>').join('')+
    '</div><div class="people-constellation-footer"><p>Every connection has a story.</p>'+(shown.length?'<div class="people-constellation-legend" aria-label="Connection groups">'+legend.map(group=>'<span><i style="background:'+groups[group].colour+'" aria-hidden="true"></i>'+groups[group].label+'</span>').join('')+'</div>':'')+'</div>'+(all.length>shown.length?'<p class="people-constellation-more">Showing '+shown.length+' of '+all.length+' people here. Browse everyone in the list below.</p>':'')+'</section>';
}


    const peopleView={tab:'circle',personId:null,group:'all',query:'',range:90,giftStatus:'idea',showArchived:false};
    const peopleGroup=g=>({family:'Family',friends:'Friends',work:'Work',other:'Other connections'}[g]||g);
    const peopleTone=g=>({family:'#c0b3ff',friends:'#85d6ff',work:'#f1bc7b',other:'#efaeca'}[g]||'#c0b3ff');
    const peopleInitials=name=>name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const peoplePrice=n=>n===null||n===undefined?'Price not added':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(n)?0:2}).format(n);
    const peoplePersonOptions=id=>PeopleDemo.people.filter(p=>!p.archived||p.id===id).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===id?'selected':'')+'>'+esc(p.name)+'</option>').join('');
    const peopleDayDistance=date=>Math.round((dateObj(date)-dateObj(TODAY))/86400000);
    const peopleWhen=date=>{const n=peopleDayDistance(date);return n===0?'Today':n===1?'Tomorrow':n<0?Math.abs(n)+' days ago':'In '+n+' days';};
    function peopleVisible(){const q=peopleView.query.toLowerCase();return PeopleDemo.people.filter(p=>(peopleView.showArchived||!p.archived)&&(peopleView.group==='all'||p.group===peopleView.group)&&(!q||(p.name+' '+p.relationshipLabel+' '+p.likes.join(' ')).toLowerCase().includes(q)));}
    function peopleBirthday(p){if(!p.birthday)return null;return PeopleDemo.upcoming({from:TODAY,to:addDays(TODAY,366)}).find(x=>x.personId===p.id&&x.type==='birthday')||null;}
    function renderPeople(){const profile=peopleView.tab==='person',p=profile?PeopleDemo.person(peopleView.personId):null;return '<div class="page-head people-head"><div><div class="kicker">'+icon('people')+'<span class="eyebrow">Relationships & shared moments</span></div><h1>The people in your life.</h1><p>Remember the little things. Make space for each other.</p></div><div class="row"><button class="button ghost" data-action="people-event-new" '+(p?'data-id="'+esc(p.id)+'"':'')+'>'+icon('edit')+' Remember something</button><button class="button primary" data-action="people-person-new">'+icon('plus')+' Add a person</button></div></div><div class="people-tabs" aria-label="People sections">'+[['circle','Your circle'],['upcoming','Coming up'],['gifts','Gift shelf']].map(([id,label])=>'<button data-action="people-tab" data-tab="'+id+'" aria-pressed="'+(peopleView.tab===id||(profile&&id==='circle'))+'">'+label+'</button>').join('')+'</div>'+(profile?renderPeopleProfile(p):peopleView.tab==='upcoming'?renderPeopleUpcoming():peopleView.tab==='gifts'?renderPeopleGifts():renderPeopleCircle());}
    function renderPeopleCircle(){const list=peopleVisible(),active=PeopleDemo.people.filter(p=>!p.archived),birthdays=PeopleDemo.upcoming({from:TODAY,to:addDays(TODAY,90)}).filter(x=>x.type==='birthday').slice(0,3),nudges=active.map(p=>({p,next:PeopleDemo.nextContact(p.id)})).filter(x=>x.next&&peopleDayDistance(x.next.date)<=7).sort((a,b)=>a.next.date.localeCompare(b.next.date)).slice(0,3);return '<div class="people-layout"><section><div class="people-map-toolbar"><div class="people-filters" aria-label="Filter your circle">'+[['all','Everyone'],['family','Family'],['friends','Friends'],['work','Work'],['other','Other']].map(([id,label])=>'<button data-action="people-group" data-group="'+id+'" aria-pressed="'+(peopleView.group===id)+'">'+label+'</button>').join('')+'</div><label class="people-search">'+icon('search')+'<input id="peopleSearch" value="'+esc(peopleView.query)+'" placeholder="Find a person or an interest" aria-label="Search people"></label></div>'+renderPeopleConstellation(list.filter(p=>!p.archived))+'<div class="people-section-title"><h2>Your people</h2><span>'+list.length+' '+(list.length===1?'person':'people')+'</span></div><div class="people-directory">'+list.map(p=>'<button class="people-directory-row" data-action="people-open" data-id="'+esc(p.id)+'"><span class="people-avatar" style="--person-tone:'+peopleTone(p.group)+'">'+esc(peopleInitials(p.name))+'</span><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.relationshipLabel||peopleGroup(p.group))+(p.archived?' · Archived':'')+'</small></span>'+icon('arrow')+'</button>').join('')+(!list.length?'<p class="people-empty">No people match this view. Try another search or add someone.</p>':'')+'</div><button class="text-button gap-top" data-action="people-archived-toggle">'+(peopleView.showArchived?'Hide archived people':'Show archived people')+'</button></section><aside class="people-aside"><section class="people-aside-section"><span class="eyebrow">A date worth remembering</span><h2>Coming around again.</h2>'+birthdays.map(x=>peopleOccasionRow(x)).join('')+(!birthdays.length?'<p class="people-copy">No birthdays in the next 90 days. Add a birthday in someone\'s details.</p>':'')+'<button class="text-button gap-top" data-action="people-tab" data-tab="upcoming">See the shared calendar '+icon('arrow')+'</button></section><section class="people-aside-section"><span class="eyebrow">Make a little time</span><h2>Keep the thread going.</h2>'+nudges.map(({p,next})=>'<div class="people-nudge"><button data-action="people-open" data-id="'+esc(p.id)+'"><strong>'+esc(p.name)+'</strong><small>'+(next.lastContactDate?'Last recorded contact '+dateLabel(next.lastContactDate):'Your chosen reminder date: '+dateLabel(next.date))+'</small></button><button class="text-button" data-action="people-plan-new" data-id="'+esc(p.id)+'">Make a plan '+icon('arrow')+'</button></div>').join('')+(!nudges.length?'<p class="people-copy">No keep-in-touch prompts due. Set a rhythm in a person\'s details when it would help.</p>':'')+'<p class="people-note">These prompts follow the dates you choose. A quiet week is not a score.</p></section><section class="people-aside-section"><span class="eyebrow">A private place to remember</span><p class="people-copy">Your people and moments are saved on this device. Notes stay here; this does not send messages or contact anyone.</p></section></aside></div>';}
    function peopleOccasionRow(x){const p=PeopleDemo.person(x.personId),birth=x.type==='birthday';return '<button class="people-occasion" data-action="'+(x.type==='plan'?'people-plan-detail':'people-open')+'" data-id="'+esc(x.type==='plan'?(x.planId||x.id):x.personId)+'"><span class="people-date-tile"><strong>'+Number(x.date.slice(-2))+'</strong><small>'+dateLabel(x.date,{month:'short'})+'</small></span><span><strong>'+esc(x.personName||p?.name||'')+'</strong><small>'+(birth?'Birthday'+(x.age!==null&&x.age!==undefined?' · Turns '+x.age:''):x.type==='contact'?'Your keep-in-touch reminder':esc(x.title||'A plan together'))+' · '+peopleWhen(x.date)+'</small></span>'+icon(birth?'gift':'arrow')+'</button>';}
    function renderPeoplePendingPlans(){const plans=PeopleDemo.plans.filter(p=>p.status==='planned'&&p.date<TODAY&&!PeopleDemo.person(p.personId)?.archived);return plans.length?'<div class="people-pending-plans"><h3>Plans to check back on</h3><p class="people-copy">Record what happened, move the date or cancel when plans changed.</p>'+plans.map(p=>peopleOccasionRow({...p,type:'plan',planId:p.id,personName:PeopleDemo.person(p.personId)?.name})).join('')+'</div>':'';}
    function renderPeopleUpcoming(){const events=PeopleDemo.upcoming({from:TODAY,to:addDays(TODAY,peopleView.range)}),months=[...new Set(events.map(x=>x.date.slice(0,7)))],overdue=PeopleDemo.people.filter(p=>!p.archived).map(p=>({p,next:PeopleDemo.nextContact(p.id)})).filter(x=>x.next?.overdue);return '<div class="people-layout"><section><div class="people-section-title"><div><span class="eyebrow">Birthdays, plans & time together</span><h2>Good things to make room for.</h2></div><button class="text-button" data-action="people-plan-new">'+icon('plus')+' Make a plan</button></div><div class="people-filters people-horizon" aria-label="Upcoming time period">'+[[30,'Next month'],[90,'Next 3 months'],[365,'Next year']].map(([n,label])=>'<button data-action="people-range" data-range="'+n+'" aria-pressed="'+(peopleView.range===n)+'">'+label+'</button>').join('')+'</div><div class="people-shared-timeline">'+months.map(m=>'<section class="people-month"><h3>'+dateLabel(m+'-01',{month:'long',year:'numeric'})+'</h3>'+events.filter(x=>x.date.startsWith(m)).map(x=>peopleOccasionRow(x)).join('')+'</section>').join('')+(!events.length?'<p class="people-empty">Nothing dated in this window yet. Add a birthday or make a plan.</p>':'')+'</div></section><aside class="people-aside"><section class="people-aside-section"><span class="eyebrow">Room to reconnect</span><h2>When you have a moment.</h2>'+renderPeoplePendingPlans()+overdue.map(({p,next})=>'<div class="people-nudge"><button data-action="people-open" data-id="'+esc(p.id)+'"><strong>'+esc(p.name)+'</strong><small>Your reminder was '+dateLabel(next.date)+'</small></button><button class="text-button" data-action="people-plan-new" data-id="'+esc(p.id)+'">Plan some time '+icon('arrow')+'</button></div>').join('')+(!overdue.length?'<p class="people-copy">Your chosen reminder dates are up to date.</p>':'')+'</section><section class="people-aside-section"><span class="eyebrow">Keep ideas close</span><p class="people-copy">Open a person to see their likes and gift ideas before their birthday comes around.</p><button class="text-button" data-action="people-tab" data-tab="gifts">Visit your gift shelf '+icon('arrow')+'</button></section></aside></div>';}
    function renderPeopleGifts(){const all=PeopleDemo.gifts,rows=all.filter(g=>peopleView.giftStatus==='all'||g.status===peopleView.giftStatus),priced=rows.filter(g=>g.price!==null&&g.price!==undefined),total=priced.reduce((sum,g)=>sum+Math.round(g.price*100),0)/100;return '<div class="people-layout"><section><div class="people-section-title"><div><span class="eyebrow">For the moment you need an idea</span><h2>A shelf of thoughtful things.</h2></div><button class="button primary" data-action="people-gift-new">'+icon('plus')+' Save an idea</button></div><div class="people-filters people-horizon" aria-label="Gift status">'+[['idea','Ideas'],['bought','Ready to give'],['given','Given'],['all','Everything']].map(([id,label])=>'<button data-action="people-gift-filter" data-status="'+id+'" aria-pressed="'+(peopleView.giftStatus===id)+'">'+label+'</button>').join('')+'</div><div class="people-gift-shelf">'+rows.map(renderPeopleGiftRow).join('')+(!rows.length?'<p class="people-empty">Nothing on this part of the shelf yet. Save a passing idea when someone mentions it.</p>':'')+'</div></section><aside class="people-aside"><section class="people-aside-section"><span class="eyebrow">Room in the budget</span><h2>'+peoplePrice(total)+'</h2><p class="people-copy">Total of '+priced.length+' entered '+(priced.length===1?'price':'prices')+' in this view. '+(rows.length-priced.length)+' '+(rows.length-priced.length===1?'idea has':'ideas have')+' no price yet.</p><p class="people-note">These are gift notes, not spending transactions. Buying or giving a gift here does not change Money.</p></section><section class="people-aside-section"><span class="eyebrow">The details make it personal</span><h2>Remember the why.</h2><p class="people-copy">The book they mentioned. The colour they always choose. A shared experience they would enjoy.</p><button class="text-button" data-action="people-tab" data-tab="circle">Back to your people '+icon('arrow')+'</button></section></aside></div>';}
    function renderPeopleGiftRow(g){const p=PeopleDemo.person(g.personId);return '<button class="people-gift-row" style="--person-tone:'+peopleTone(p?.group)+'" data-action="people-gift-detail" data-id="'+esc(g.id)+'"><span class="people-gift-spine">'+icon('gift')+'</span><span><strong>'+esc(g.title)+'</strong><small>For '+esc(p?.name||'Archived person')+(g.occasion?' · '+esc(g.occasion):'')+'</small>'+(g.note?'<p>'+esc(g.note)+'</p>':'')+'</span><span class="people-gift-price">'+peoplePrice(g.price)+'<small>'+({idea:'An idea',bought:'Ready to give',given:'Given'}[g.status])+'</small></span></button>';}
    function renderPeopleProfile(p){if(!p)return '<p class="people-empty">This person could not be found.</p>';const events=PeopleDemo.events.filter(x=>x.personId===p.id).sort((a,b)=>b.date.localeCompare(a.date)),gifts=PeopleDemo.gifts.filter(g=>g.personId===p.id&&g.status!=='given'),plans=PeopleDemo.plans.filter(x=>x.personId===p.id).sort((a,b)=>(a.status==='planned'?0:1)-(b.status==='planned'?0:1)||b.date.localeCompare(a.date)),birthday=peopleBirthday(p),next=PeopleDemo.nextContact(p.id),last=events.find(x=>x.type==='contact');return '<button class="text-button" data-action="people-tab" data-tab="circle">'+icon('back')+' Back to your circle</button><div class="people-profile-head" style="--person-tone:'+peopleTone(p.group)+'"><span class="people-profile-avatar">'+esc(peopleInitials(p.name))+'</span><div><span class="eyebrow">'+esc(p.relationshipLabel||peopleGroup(p.group))+(p.archived?' · Archived':'')+'</span><h2>'+esc(p.name)+'</h2><p>'+(p.birthday?'Birthday '+dateLabel('2000-'+p.birthday,{day:'numeric',month:'long'}):'Birthday not added')+(birthday?' · '+peopleWhen(birthday.date):'')+'</p></div><button class="button ghost" data-action="people-person-edit" data-id="'+esc(p.id)+'">'+icon('edit')+' Edit details</button></div><div class="people-layout"><section><div class="people-section-title"><h2>The little things.</h2><button class="text-button" data-action="people-person-edit" data-id="'+esc(p.id)+'">Edit '+icon('edit')+'</button></div><div class="people-memory-garden"><div><span class="eyebrow">Things they like</span><div class="people-tags">'+p.likes.map(t=>'<span>'+esc(t)+'</span>').join('')+(!p.likes.length?'<p class="people-copy">Add an interest when it comes up.</p>':'')+'</div></div>'+(p.dislikes.length?'<div><span class="eyebrow">Keep in mind</span><div class="people-tags muted">'+p.dislikes.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div>':'')+(p.note?'<p class="people-person-note">'+esc(p.note)+'</p>':'')+'</div><div class="people-section-title"><div><span class="eyebrow">Shared moments & things they said</span><h2>A story you can return to.</h2></div><button class="text-button" data-action="people-event-new" data-id="'+esc(p.id)+'">'+icon('plus')+' Add a memory</button></div><div class="people-story">'+events.map(e=>'<button class="people-story-entry '+e.type+'" data-action="people-event-detail" data-id="'+esc(e.id)+'"><span class="people-story-dot"></span><span class="eyebrow">'+dateLabel(e.date,{day:'numeric',month:'short',year:'numeric'})+' · '+(e.type==='contact'?({message:'Message',call:'Call','in-person':'Time together'}[e.kind]||'Contact'):'Remembered')+'</span><h3>'+esc(e.title||'A moment worth keeping')+'</h3><p>'+esc(e.body||'')+'</p></button>').join('')+(!events.length?'<p class="people-empty">Your first note starts this timeline. A quick detail is enough.</p>':'')+'</div></section><aside class="people-aside"><section class="people-aside-section"><span class="eyebrow">Make space for each other</span><h2>'+(p.archived?'Their story stays here.':next?'Keep the thread going.':'Choose your rhythm.')+'</h2><p class="people-copy">'+(last?'Last recorded contact: '+dateLabel(last.date,{day:'numeric',month:'long',year:'numeric'})+'.':'No contact recorded yet.')+'</p><p class="people-copy">'+(p.archived?'Reminders are paused while this person is archived. Restore them to your circle to use their saved rhythm.':next?'Your next reminder: '+dateLabel(next.date)+'. A rhythm of '+p.contactEveryDays+' days.':'Keep-in-touch prompts are off. Add a rhythm in their details if it would help.')+'</p><div class="row wrap"><button class="button primary" data-action="people-event-new" data-id="'+esc(p.id)+'" data-type="contact">Log time together</button><button class="text-button" data-action="people-plan-new" data-id="'+esc(p.id)+'">Make a plan '+icon('arrow')+'</button></div>'+plans.map(x=>'<button class="people-plan-row" data-action="people-plan-detail" data-id="'+esc(x.id)+'"><strong>'+esc(x.title)+'</strong><small>'+dateLabel(x.status==='done'?x.completedOn:x.date,{day:'numeric',month:'short'})+(x.time&&x.status!=='done'?' · '+esc(x.time):'')+' · '+({planned:'Planned',done:'Recorded in your story',cancelled:'Cancelled'}[x.status])+'</small></button>').join('')+'</section><section class="people-aside-section"><span class="eyebrow">Ideas for '+esc(p.name)+'</span><h2>Something they would love.</h2>'+gifts.slice(0,4).map(g=>'<button class="people-mini-gift" data-action="people-gift-detail" data-id="'+esc(g.id)+'">'+icon('gift')+'<span><strong>'+esc(g.title)+'</strong><small>'+peoplePrice(g.price)+' · '+(g.status==='bought'?'Ready to give':'An idea')+'</small></span></button>').join('')+(!gifts.length?'<p class="people-copy">Save a gift idea when they mention something they love.</p>':'')+'<button class="text-button gap-top" data-action="people-gift-new" data-person="'+esc(p.id)+'">'+icon('plus')+' Save a gift idea</button></section><button class="text-button" data-action="people-archive" data-id="'+esc(p.id)+'">'+(p.archived?'Restore to your circle':'Archive this person')+'</button><p class="people-note">Archiving keeps their story and pauses reminders.</p></aside></div>';}
    function peoplePersonDialog(id){const p=id?PeopleDemo.person(id):null,b=(p?.birthday||'').split('-');showDialog(p?'Edit '+p.name:'Add someone to your circle','<form id="peoplePersonForm" data-id="'+esc(id||'')+'"><label>Name<input id="peopleName" value="'+esc(p?.name||'')+'" maxlength="80" required placeholder="Their name"></label><div class="money-form-grid"><label>Part of your life<select id="peopleGroup">'+['family','friends','work','other'].map(g=>'<option value="'+g+'" '+(g===(p?.group||'friends')?'selected':'')+'>'+peopleGroup(g)+'</option>').join('')+'</select></label><label>Relationship, optional<input id="peopleRelationship" value="'+esc(p?.relationshipLabel||'')+'" maxlength="80" placeholder="Friend, sibling, neighbour"></label></div><div class="people-form-section"><span class="eyebrow">Birthday, optional</span><div class="people-birthday-fields"><label>Day<input id="peopleBirthDay" type="number" min="1" max="31" value="'+(b[1]?Number(b[1]):'')+'" placeholder="DD"></label><label>Month<select id="peopleBirthMonth"><option value="">Not added</option>'+Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'" '+(Number(b[0])===i+1?'selected':'')+'>'+dateLabel('2000-'+String(i+1).padStart(2,'0')+'-01',{month:'long'})+'</option>').join('')+'</select></label><label>Year, if known<input id="peopleBirthYear" type="number" min="1900" max="'+TODAY.slice(0,4)+'" value="'+(p?.birthYear??'')+'" placeholder="Optional"></label></div><label id="peopleLeapWrap" hidden>In years without 29 February<select id="peopleLeap"><option value="feb28" '+(p?.leapDay!=='mar1'?'selected':'')+'>Remember on 28 February</option><option value="mar1" '+(p?.leapDay==='mar1'?'selected':'')+'>Remember on 1 March</option></select></label></div><div class="money-form-grid"><label>Things they like<textarea id="peopleLikes" rows="3" maxlength="1600" placeholder="Hiking, dark chocolate, historical novels">'+esc(p?.likes.join(', ')||'')+'</textarea></label><label>Dislikes or things to avoid<textarea id="peopleDislikes" rows="3" maxlength="1600" placeholder="Optional">'+esc(p?.dislikes.join(', ')||'')+'</textarea></label></div><p class="people-note">Separate ideas with commas or new lines. Dated things they say belong in their story.</p><details class="goal-editor-details"><summary>Keep-in-touch rhythm & other details, optional</summary><div class="money-form-grid"><label>Remind me after this many days<input id="peopleCadence" type="number" min="1" max="730" value="'+(p?.contactEveryDays??'')+'" placeholder="Leave blank to keep off"></label><label>First reminder date, if needed<input id="peopleContactStart" type="date" value="'+esc(p?.contactStartDate||'')+'"></label></div><p class="people-note">After recorded contact, the next reminder moves forward by this many days. Use a first reminder date when there is no contact history.</p><label>Personal context<textarea id="peoplePersonNote" rows="3" maxlength="3000">'+esc(p?.note||'')+'</textarea></label></details><div id="peoplePersonError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save person</button></div></form>');peopleUpdateLeap();}
    function peopleUpdateLeap(){if($('peopleLeapWrap'))$('peopleLeapWrap').hidden=!($('peopleBirthMonth').value==='2'&&$('peopleBirthDay').value==='29');}
    function peopleEventDialog(personId,type='note',id=null){const e=id?PeopleDemo.events.find(x=>x.id===id):null;if(e){personId=e.personId;type=e.type;}if(!peoplePersonOptions(personId)){peoplePersonDialog();return;}showDialog(e?'Correct a memory':type==='contact'?'Log time together':'Remember something','<form id="peopleEventForm" data-id="'+esc(id||'')+'" data-operation="'+uid('people-capture')+'"><div class="money-form-grid"><label>Person<select id="peopleEventPerson" '+(e?.planId?'disabled':'')+'>'+peoplePersonOptions(personId)+'</select></label><label>What are you recording?<select id="peopleEventType" '+(e?.planId?'disabled':'')+'><option value="note" '+(type==='note'?'selected':'')+'>Something to remember</option><option value="contact" '+(type==='contact'?'selected':'')+'>We were in touch</option></select></label><label>Date<input id="peopleEventDate" type="date" max="'+TODAY+'" value="'+(e?.date||TODAY)+'" required></label><label id="peopleContactKindWrap">How?<select id="peopleEventKind">'+[['in-person','In person'],['call','A call'],['message','Messages']].map(([k,l])=>'<option value="'+k+'" '+(e?.kind===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><label>A few words to find it later<input id="peopleEventTitle" value="'+esc(e?.title||'')+'" maxlength="160" placeholder="Weekend walk or a book they mentioned" required></label><label class="gap-top">What would you like to remember?<textarea id="peopleEventBody" rows="5" maxlength="4000" placeholder="A detail, a shared moment, something to ask them about next time...">'+esc(e?.body||'')+'</textarea></label><p class="people-note">'+(e?(e.planId?'This record stays a contact for the person in the completed plan. You can correct its date, how you were in touch and the details. Earlier versions stay in the record.':'This correction keeps the earlier version in the record.'):'A note does not count as contact. Choose “We were in touch” when you actually spoke or exchanged messages.')+'</p><div id="peopleEventError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(e?'Save correction':'Save memory')+'</button></div></form>');peopleUpdateContact();}
    function peopleUpdateContact(){if($('peopleContactKindWrap'))$('peopleContactKindWrap').hidden=$('peopleEventType').value!=='contact';}
    function peopleEventDetail(id){const e=PeopleDemo.events.find(x=>x.id===id);if(!e)return;const versions=PeopleDemo.eventVersions.filter(x=>x.rootId===e.rootId).slice().reverse();showDialog(e.title||'A shared moment','<span class="eyebrow">'+esc(e.personName)+' · '+dateLabel(e.date,{day:'numeric',month:'long',year:'numeric'})+'</span><p class="people-detail-text">'+esc(e.body||'No extra note.')+'</p><button class="text-button" data-action="people-event-edit" data-id="'+esc(e.id)+'">Correct this memory '+icon('edit')+'</button>'+(versions.length>1?'<details class="goal-editor-details gap-top"><summary>Earlier versions</summary>'+versions.slice(1).map(v=>'<div class="work-revision"><strong>'+esc(v.title)+'</strong><br>'+dateLabel(v.date)+' · '+esc(v.personName)+'<p>'+esc(v.body||'')+'</p></div>').join('')+'</details>':'')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function peopleGiftDialog(personId,id){const g=id?PeopleDemo.gifts.find(x=>x.id===id):null;if(!peoplePersonOptions(g?.personId||personId)){peoplePersonDialog();return;}showDialog(g?'Edit gift idea':'Save a gift idea','<form id="peopleGiftForm" data-id="'+esc(id||'')+'"><label>For whom?<select id="peopleGiftPerson" '+(g?'disabled':'')+'>'+peoplePersonOptions(g?.personId||personId)+'</select></label>'+(g?'<p class="people-note">This gift stays with its original person so the status history keeps its meaning. Add a separate idea for someone else.</p>':'')+'<label class="gap-top">The idea<input id="peopleGiftTitle" value="'+esc(g?.title||'')+'" maxlength="160" placeholder="A book, a day out, something handmade" required></label><div class="money-form-grid"><label>Price, £, optional<input id="peopleGiftPrice" type="number" min="0" step="0.01" max="1000000" value="'+(g?.price??'')+'" placeholder="Unknown is fine"></label><label>Occasion, optional<input id="peopleGiftOccasion" value="'+esc(g?.occasion||'')+'" maxlength="100" placeholder="Birthday, Christmas, just because"></label></div><label>Why they would like it<textarea id="peopleGiftNote" rows="4" maxlength="2000">'+esc(g?.note||'')+'</textarea></label><label class="gap-top">Where is this idea now?<select id="peopleGiftStatus">'+[['idea','Just an idea'],['bought','Bought, ready to give'],['given','Already given']].map(([v,l])=>'<option value="'+v+'" '+((g?.status||'idea')===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><p class="people-note">The gift record keeps status changes. It does not make purchases or record an expense.</p><div id="peopleGiftError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save gift idea</button></div></form>');}
    function peopleGiftDetail(id){const g=PeopleDemo.gifts.find(x=>x.id===id),p=g?PeopleDemo.person(g.personId):null;if(!g)return;const trail=(g.statusHistory||[]).slice().reverse(),statusName=status=>({idea:'Saved as an idea',bought:'Bought, ready to give',given:'Given'}[status]||status);showDialog(g.title,'<span class="eyebrow">For '+esc(p?.name||'')+(g.occasion?' · '+esc(g.occasion):'')+'</span><p class="people-detail-text">'+esc(g.note||'No note added yet.')+'</p><div class="people-gift-detail-price">'+peoplePrice(g.price)+'</div><div class="people-filters people-horizon" aria-label="Change gift status">'+[['idea','An idea'],['bought','Ready to give'],['given','Given']].map(([status,label])=>'<button data-action="people-gift-status" data-id="'+esc(id)+'" data-status="'+status+'" aria-pressed="'+(g.status===status)+'">'+label+'</button>').join('')+'</div><button class="text-button" data-action="people-gift-edit" data-id="'+esc(id)+'">Edit the idea '+icon('edit')+'</button><details class="goal-editor-details gap-top"><summary>Status history · '+trail.length+' '+(trail.length===1?'record':'records')+'</summary><p class="people-note">Each step keeps the title, price and notes that were recorded then.</p>'+trail.map(step=>'<div class="work-revision"><strong>'+esc(statusName(step.status))+'</strong><br>'+dateLabel(step.date,{day:'numeric',month:'long',year:'numeric'})+' · '+esc(step.personName||'')+'<p>'+esc(step.title||'Gift title not recorded')+'<br>'+peoplePrice(step.price)+(step.occasion?' · '+esc(step.occasion):'')+(step.note?'<br>'+esc(step.note):'')+'</p></div>').join('')+'</details><p class="people-note">Saving a gift status does not change Money.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
    function peoplePlanDialog(personId,id){const p=id?PeopleDemo.plans.find(x=>x.id===id):null;if(!peoplePersonOptions(p?.personId||personId)){peoplePersonDialog();return;}showDialog(p?'Edit your plan':'Make a little time','<form id="peoplePlanForm" data-id="'+esc(id||'')+'"><label>With whom?<select id="peoplePlanPerson">'+peoplePersonOptions(p?.personId||personId)+'</select></label><label class="gap-top">What is the plan?<input id="peoplePlanTitle" value="'+esc(p?.title||'')+'" maxlength="160" required placeholder="A walk, coffee, a call"></label><div class="money-form-grid"><label>Date<input id="peoplePlanDate" type="date" value="'+(p?.date||addDays(TODAY,1))+'" required></label><label>Time, optional<input id="peoplePlanTime" type="time" value="'+esc(p?.time||'')+'"></label></div><p class="people-note">This saves a plan in your own calendar. It does not send an invitation. After it happens, you can add it to your shared story.</p><div id="peoplePlanError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save plan</button></div></form>');}
    function peoplePlanDetail(id){const p=PeopleDemo.plans.find(x=>x.id===id);if(!p)return;const person=PeopleDemo.person(p.personId);showDialog(p.title,'<span class="eyebrow">With '+esc(person?.name||'')+'</span><p class="people-detail-text">'+dateLabel(p.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(p.time?' · '+esc(p.time):'')+'</p><p class="people-note">'+(p.status==='done'?'Recorded in your shared story on '+dateLabel(p.completedOn)+'.':p.status==='cancelled'?'This plan was cancelled. Its details are kept so you can restore it.':'Mark it as happened after you have spent the time together.')+'</p><div class="row wrap">'+(p.status==='planned'?'<button class="button ghost" data-action="people-plan-edit" data-id="'+esc(id)+'">Change the plan</button><button class="text-button" data-action="people-plan-cancel" data-id="'+esc(id)+'">Cancel this plan</button>':p.status==='cancelled'?'<button class="button ghost" data-action="people-plan-restore" data-id="'+esc(id)+'">Restore this plan</button>':'')+'</div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Done</button>'+(p.status==='planned'&&p.date<=TODAY?'<button class="button primary" data-action="people-plan-complete" data-id="'+esc(id)+'">It happened, add to story</button>':'')+'</div>');}
    function peopleCompletePlanDialog(id){const p=PeopleDemo.plans.find(x=>x.id===id);if(!p||p.status!=='planned')return;const person=PeopleDemo.person(p.personId),date=p.date<=TODAY?p.date:TODAY;showDialog('Add the time you spent together','<form id="peoplePlanCompleteForm" data-id="'+esc(id)+'"><p class="dialog-sub">'+esc(p.title)+' · '+esc(person?.name||'')+'. Check when it actually happened and how you were in touch.</p><div class="money-form-grid"><label>Actual date<input id="peopleCompleteDate" type="date" max="'+TODAY+'" value="'+date+'" required></label><label>How were you in touch?<select id="peopleCompleteKind" required><option value="">Choose what happened</option><option value="in-person">In person</option><option value="call">A call</option><option value="message">Messages</option></select></label></div><label>Something to remember, optional<textarea id="peopleCompleteBody" rows="4" maxlength="4000">'+esc(p.note||'')+'</textarea></label><p class="people-note">This adds one dated contact to your story and moves your keep-in-touch reminder forward from that date.</p><div id="peoplePlanCompleteError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Add to your shared story</button></div></form>');}
    function peopleHandleResult(r,message){if(!r.ok){toast(r.error||'Please check the details.');return false;}if(message)toast(message);return true;}
    function handlePeopleAction(a,d){if(a==='people-tab'){peopleView.tab=d.tab;render();window.scrollTo({top:0,behavior:'instant'});return;}if(a==='people-open'){peopleView.personId=d.id;peopleView.tab='person';closeDialog();render();window.scrollTo({top:0,behavior:'instant'});return;}if(a==='people-group'){peopleView.group=d.group;render();return;}if(a==='people-range'){peopleView.range=Number(d.range);render();return;}if(a==='people-gift-filter'){peopleView.giftStatus=d.status;render();return;}if(a==='people-archived-toggle'){peopleView.showArchived=!peopleView.showArchived;render();return;}if(a==='people-person-new'||a==='people-person-edit'){peoplePersonDialog(d.id);return;}if(a==='people-event-new'){peopleEventDialog(d.id,d.type||'note');return;}if(a==='people-event-edit'){peopleEventDialog(null,'note',d.id);return;}if(a==='people-event-detail'){peopleEventDetail(d.id);return;}if(a==='people-gift-new'||a==='people-gift-edit'){peopleGiftDialog(d.person,d.id);return;}if(a==='people-gift-detail'){peopleGiftDetail(d.id);return;}if(a==='people-gift-status'){const g=PeopleDemo.gifts.find(x=>x.id===d.id);if(peopleHandleResult(PeopleDemo.upsertGift({...g,status:d.status}),'Gift status saved.')){render();peopleGiftDetail(d.id);}return;}if(a==='people-plan-new'||a==='people-plan-edit'){peoplePlanDialog(d.id&&a==='people-plan-new'?d.id:null,a==='people-plan-edit'?d.id:null);return;}if(a==='people-plan-detail'){peoplePlanDetail(d.id);return;}if(a==='people-plan-cancel'){const p=PeopleDemo.plans.find(x=>x.id===d.id);if(peopleHandleResult(PeopleDemo.upsertPlan({...p,status:'cancelled'}),'Plan cancelled.')){closeDialog();render();}return;}if(a==='people-plan-restore'){const p=PeopleDemo.plans.find(x=>x.id===d.id);if(peopleHandleResult(PeopleDemo.upsertPlan({...p,status:'planned'}),'Plan restored.')){render();peoplePlanDetail(d.id);}return;}if(a==='people-plan-complete'){peopleCompletePlanDialog(d.id);return;}if(a==='people-archive'){const p=PeopleDemo.person(d.id);if(peopleHandleResult(PeopleDemo.upsertPerson({id:p.id,archived:!p.archived}),p.archived?'Restored to your circle.':'Archived. Their story is kept.'))render();return;}}
    document.addEventListener('input',event=>{if(event.target.id==='peopleSearch'){const input=event.target,start=input.selectionStart;peopleView.query=input.value;render();$('peopleSearch').focus();$('peopleSearch').setSelectionRange(start,start);}if(['peopleBirthDay','peopleBirthMonth'].includes(event.target.id))peopleUpdateLeap();});
    document.addEventListener('change',event=>{if(['peopleBirthDay','peopleBirthMonth'].includes(event.target.id))peopleUpdateLeap();if(event.target.id==='peopleEventType')peopleUpdateContact();});
    document.addEventListener('submit',event=>{const f=event.target;if(!['peoplePersonForm','peopleEventForm','peopleGiftForm','peoplePlanForm','peoplePlanCompleteForm'].includes(f.id))return;event.preventDefault();let r,error;
      if(f.id==='peoplePersonForm'){error='peoplePersonError';const day=$('peopleBirthDay').value,month=$('peopleBirthMonth').value;if(!!day!==!!month){$(error).textContent='Add both the birthday day and month, or leave both empty.';return;}const tags=id=>$(id).value.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);r=PeopleDemo.upsertPerson({id:f.dataset.id||undefined,name:$('peopleName').value.trim(),group:$('peopleGroup').value,relationshipLabel:$('peopleRelationship').value.trim(),birthday:day?String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'):null,birthYear:$('peopleBirthYear').value?Number($('peopleBirthYear').value):null,leapDay:$('peopleLeap').value,likes:tags('peopleLikes'),dislikes:tags('peopleDislikes'),contactEveryDays:$('peopleCadence').value?Number($('peopleCadence').value):null,contactStartDate:$('peopleContactStart').value||null,note:$('peoplePersonNote').value.trim()});if(r.ok){peopleView.personId=r.entity.id;peopleView.tab='person';}}
      if(f.id==='peopleEventForm'){error='peopleEventError';const type=$('peopleEventType').value,value={personId:$('peopleEventPerson').value,type,kind:type==='contact'?$('peopleEventKind').value:'',date:$('peopleEventDate').value,title:$('peopleEventTitle').value.trim(),body:$('peopleEventBody').value.trim(),operationId:f.dataset.operation};r=f.dataset.id?PeopleDemo.correctEvent(f.dataset.id,value):PeopleDemo.addEvent(value);if(r.ok){peopleView.personId=value.personId;peopleView.tab='person';}}
      if(f.id==='peopleGiftForm'){error='peopleGiftError';const value={id:f.dataset.id||undefined,personId:$('peopleGiftPerson').value,title:$('peopleGiftTitle').value.trim(),price:$('peopleGiftPrice').value===''?null:Number($('peopleGiftPrice').value),occasion:$('peopleGiftOccasion').value.trim(),note:$('peopleGiftNote').value.trim(),status:$('peopleGiftStatus').value};r=PeopleDemo.upsertGift(value);if(r.ok&&peopleView.tab!=='person'){peopleView.tab='gifts';peopleView.giftStatus=value.status;}}
      if(f.id==='peoplePlanCompleteForm'){error='peoplePlanCompleteError';const kind=$('peopleCompleteKind').value;if(!['in-person','call','message'].includes(kind)){$(error).textContent='Choose how you were in touch.';return;}r=PeopleDemo.completePlan(f.dataset.id,{date:$('peopleCompleteDate').value,kind,body:$('peopleCompleteBody').value.trim()});if(r.ok){peopleView.personId=r.entity.personId;peopleView.tab='person';}}
      if(f.id==='peoplePlanForm'){error='peoplePlanError';r=PeopleDemo.upsertPlan({id:f.dataset.id||undefined,personId:$('peoplePlanPerson').value,title:$('peoplePlanTitle').value.trim(),date:$('peoplePlanDate').value,time:$('peoplePlanTime').value||null,status:'planned'});}
      if(!r.ok){$(error).textContent=r.error;return;}closeDialog();render();toast(f.id==='peoplePersonForm'?'Person saved.':f.id==='peopleEventForm'?'Saved in your shared story.':f.id==='peopleGiftForm'?'Gift idea saved.':f.id==='peoplePlanCompleteForm'?'Added to your shared story.':'Time together planned.');
    });

// Workspace capture adapters. This target-based contract is separate from lifeos-ops/1.
// Model mutations are persisted together by the workspace snapshot writer.
const CaptureTargetsDemo = (() => {
  'use strict';
  const consumed = new Map();
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const copy = value => JSON.parse(JSON.stringify(value));
  const routes = { sleep: 'sleep', work: 'work', money: 'money', people: 'people', action: 'goals', progress: 'goals', meal: 'food' };
  const norm = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1970-01-01' && value <= '9998-12-31' && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value);
  function hash(value) { const text = stable(value); let a = 2166136261, b = 5381; for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); } return (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16); }
  function problem(message) { throw new Error(message); }
  function textField(value, name, max, required = false) { if (value === undefined || value === null) value = ''; if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) problem(name + ' needs ' + (required ? 'non-empty ' : '') + 'text of up to ' + max + ' characters.'); return value.trim(); }
  function numeric(value, name, min, max, integer = false) { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) problem('Check ' + name + '.'); return value; }
  function dateField(value, past = true) { if (!validDate(value) || (past && value > TODAY)) problem('Choose a real date' + (past ? ' on or before today.' : '.')); return value; }
  function optionalText(input, output, key, max) { if (has(input, key)) output[key] = textField(input[key], key, max); }
  function vocab() {
    return copy({
      accounts: MoneyDemo.accounts.map(a => ({ id: a.id, name: a.name, type: a.type, reviewStatus: a.reviewStatus })),
      people: PeopleDemo.people.filter(p => !p.archived).map(p => ({ id: p.id, name: p.name })),
      goals: GoalsDemo.goals.map(g => ({ id: g.id, name: g.title, title: g.title, unit: g.unit, mode: g.mode, status: g.status, startDate: g.startDate })),
      meals: FoodDemo.recipes.map(r => ({ id: r.id, name: r.name }))
    });
  }
  function records(target) {
    return copy(target === 'sleep' ? activeSleepRecords() : target === 'work' ? WorkDemo.entries : target === 'money' ? MoneyDemo.transactions : target === 'people' ? PeopleDemo.events : target === 'action' ? GoalsDemo.actions : target === 'progress' ? GoalsDemo.logs : target === 'meal' ? FoodDemo.logs : []);
  }
  function snapshot() { const words = vocab(), record = {}; Object.keys(routes).forEach(target => { record[target] = records(target); }); return { today: TODAY, ...words, vocab: words, records: record }; }
  function routeFor(target) { return routes[target] || 'capture'; }
  function civilStamp(value) {
    if (typeof value !== 'string' || !validDate(value.slice(0, 10)) || value[10] !== 'T' || !validTime(value.slice(11))) problem('Choose a complete work start and end date and time.');
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: WorkDemo.zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const format = stamp => { const p = Object.fromEntries(formatter.formatToParts(stamp).filter(x => x.type !== 'literal').map(x => [x.type, x.value])); return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute; };
    const assumed = Date.parse(value + ':00Z');
    const candidates = [assumed, assumed - 3600000].filter(stamp => format(stamp) === value);
    if (candidates.length !== 1) problem('That work time is missing or repeated during a London clock change. Use an unambiguous time.');
    return candidates[0];
  }
  function normalize(proposal) {
    if (!proposal || typeof proposal !== 'object' || !routes[proposal.target]) return null;
    const input = proposal.entity;
    if (!input || typeof input !== 'object' || Array.isArray(input)) problem('Complete the proposed entry first.');
    const target = proposal.target;
    let entity;
    if (target === 'sleep') {
      entity = { wakeDate: dateField(input.wakeDate), durationMinutes: numeric(input.durationMinutes, 'minutes asleep, from 1 to 1,440', 1, 1440, true), kind: input.kind };
      if (!['main', 'nap'].includes(entity.kind)) problem('Choose main sleep or a nap.');
      if (has(input, 'feeling')) entity.feeling = input.feeling === null ? null : numeric(input.feeling, 'sleep feeling, from 1 to 5', 1, 5, true);
      optionalText(input, entity, 'note', 2000);
    } else if (target === 'work') {
      entity = { start: input.start, end: input.end, breakMinutes: numeric(input.breakMinutes, 'unpaid break minutes', 0, 1440) };
      const start = civilStamp(entity.start), end = civilStamp(entity.end), elapsed = (end - start) / 60000;
      if (elapsed <= 0 || elapsed > 1440) problem('A shift must finish after it starts and span no more than 24 hours. Include the next date for overnight work.');
      if (end > WorkDemo.now()) problem('This shift ends in the future. Record finished work only, or use the Work clock.');
      if (entity.breakMinutes > elapsed) problem('Unpaid breaks cannot exceed the shift duration.');
      optionalText(input, entity, 'note', 2000);
    } else if (target === 'money') {
      if (input.type !== 'expense') problem('Capture supports expenses here. Record other money movements inside Money.');
      const account = MoneyDemo.accounts.find(a => a.id === input.accountId);
      if (!account) problem(MoneyDemo.accounts.length ? 'Choose the account this expense came from.' : 'Add an account in Money first, then return to this capture.');
      if (account.reviewStatus === 'needs-checking') problem('Check this account in Money before recording expenses against it.');
      entity = { date: dateField(input.date), type: 'expense', accountId: account.id, amount: numeric(input.amount, 'expense amount', 0.01, 1e9) };
      if (Math.abs(entity.amount * 100 - Math.round(entity.amount * 100)) > 0.000001) problem('Expenses need pounds and pence, with no fractions of a penny.');
      if (entity.date < account.openedOn) problem('This expense is before the selected account was first recorded.');
      optionalText(input, entity, 'category', 80); optionalText(input, entity, 'note', 1000);
    } else if (target === 'people') {
      const person = PeopleDemo.person(input.personId);
      if (!person || person.archived) problem(PeopleDemo.people.some(p => !p.archived) ? 'Choose an active person from your circle.' : 'Add someone in People first, then return to this capture.');
      if (!['contact', 'note'].includes(input.type)) problem('Choose contact or a note.');
      entity = { personId: person.id, type: input.type, date: dateField(input.date) };
      if (input.type === 'contact') { if (!['call', 'message', 'in-person'].includes(input.kind)) problem('Choose how you were in touch.'); entity.kind = input.kind; }
      optionalText(input, entity, 'title', 160); optionalText(input, entity, 'body', 4000);
      if (entity.type === 'note' && !entity.title && !entity.body) problem('Add the detail you want to remember.');
    } else if (target === 'action') {
      const goal = input.goalId ? GoalsDemo.goals.find(g => g.id === input.goalId) : null;
      if (input.goalId && !goal) problem('Choose an existing goal, or leave the action unlinked.');
      entity = { title: textField(input.title, 'Action title', 160, true), date: dateField(input.date, false) };
      if (has(input, 'goalId')) entity.goalId = goal ? goal.id : null;
      if (has(input, 'minutes')) entity.minutes = input.minutes === null || input.minutes === undefined ? null : numeric(input.minutes, 'estimated minutes', 1, 1440, true);
    } else if (target === 'progress') {
      const goal = GoalsDemo.goals.find(g => g.id === input.goalId);
      if (!goal) problem(GoalsDemo.goals.length ? 'Choose the goal this progress belongs to.' : 'Create a goal first, then return to this capture.');
      if (goal.status === 'paused') problem('Resume this goal before adding progress.');
      entity = { goalId: goal.id, date: dateField(input.date), value: numeric(input.value, 'progress result', 0, 1000000) };
      if (entity.date < goal.startDate) problem('Progress cannot be dated before the goal started.');
      optionalText(input, entity, 'note', 1000);
    } else if (target === 'meal') {
      const plan = input.planId ? FoodDemo.plans.find(p => p.id === input.planId) : null;
      if (input.planId && !plan) problem('This planned meal could not be found.');
      const recipe = FoodDemo.recipe(input.mealId || plan?.mealId);
      if (!recipe) problem(FoodDemo.recipes.length ? 'Choose the recipe that you ate.' : 'Add a recipe in Food first, then return to this capture.');
      entity = { date: dateField(input.date || plan?.date), mealId: recipe.id, servings: numeric(input.servings, 'meal servings', 0.001, 100), useStock: input.useStock };
      if (typeof entity.useStock !== 'boolean') problem('Choose whether the meal used your pantry.');
      if (input.time !== undefined && !validTime(input.time)) problem('Choose a valid meal time.');
      if (input.time !== undefined) entity.time = input.time;
      if (plan) { if (plan.date !== entity.date || plan.mealId !== entity.mealId || (entity.time && entity.time !== plan.time)) problem('The recipe, date and time must match the selected planned meal.'); entity.planId = plan.id; entity.time = plan.time; }
    }
    return entity;
  }
  function supportState(target) {
    if (target === 'meal') return { plans: FoodDemo.plans, recipes: FoodDemo.recipes, yields: FoodDemo.yields, targets: FoodDemo.targets, movements: FoodDemo.movements };
    if (target === 'work') return { active: WorkDemo.active };
    if (target === 'money') return { accounts: MoneyDemo.accounts, debts: MoneyDemo.debts };
    if (target === 'people') return { people: PeopleDemo.people };
    if (target === 'action' || target === 'progress') return { goals: GoalsDemo.goals };
    if (target === 'sleep') return { goal: sleepView.goal };
    return null;
  }
  function describe(proposal) {
    const e = proposal?.entity || {}, t = proposal?.target;
    if (t === 'sleep') return (e.kind === 'nap' ? 'Nap' : 'Sleep') + ': ' + (Number.isFinite(e.durationMinutes) ? Math.floor(e.durationMinutes / 60) + 'h ' + (e.durationMinutes % 60) + 'm' : 'duration needed') + ' ending ' + (e.wakeDate || 'date needed');
    if (t === 'work') return 'Work: ' + (e.start || 'start needed') + ' to ' + (e.end || 'end needed') + ', ' + (e.breakMinutes ?? '?') + ' minutes unpaid break';
    if (t === 'money') return 'Expense: ' + (Number.isFinite(e.amount) ? '\u00a3' + e.amount.toFixed(2) : 'amount needed') + ' from ' + (MoneyDemo.accounts.find(a => a.id === e.accountId)?.name || 'account needed') + ' on ' + (e.date || 'date needed');
    if (t === 'people') return (e.type === 'contact' ? 'Contact with ' : 'Remember for ') + (PeopleDemo.person(e.personId)?.name || 'person needed') + ': ' + (e.title || e.body || e.kind || 'details needed') + ' (' + (e.date || 'date needed') + ')';
    if (t === 'action') return 'Action: ' + (e.title || 'title needed') + ' on ' + (e.date || 'date needed');
    if (t === 'progress') return 'Progress: ' + (GoalsDemo.goals.find(g => g.id === e.goalId)?.title || 'goal needed') + ', ' + (e.value ?? '?') + ' on ' + (e.date || 'date needed');
    if (t === 'meal') return 'Meal: ' + (FoodDemo.recipe(e.mealId)?.name || 'recipe needed') + ', ' + (e.servings ?? '?') + ' servings on ' + (e.date || 'date needed');
    return 'This kind of update is not supported in your record.';
  }
  function comparable(target, record, entity) {
    if (target === 'sleep') return record.kind === entity.kind && record.wakeDate === entity.wakeDate && record.duration === entity.durationMinutes && (!has(entity, 'feeling') || record.feeling === entity.feeling) && (!has(entity, 'note') || norm(record.note) === norm(entity.note));
    if (target === 'work') return record.start === entity.start && record.end === entity.end && record.breakMinutes === entity.breakMinutes && (!has(entity, 'note') || norm(record.note) === norm(entity.note));
    if (target === 'money') return record.type === 'expense' && record.date === entity.date && record.accountId === entity.accountId && record.amount === entity.amount && (!has(entity, 'category') || norm(record.category) === norm(entity.category)) && (!has(entity, 'note') || norm(record.note) === norm(entity.note));
    if (target === 'people') return record.personId === entity.personId && record.type === entity.type && record.date === entity.date && (entity.type !== 'contact' || record.kind === entity.kind) && (!has(entity, 'title') || norm(record.title) === norm(entity.title)) && (!has(entity, 'body') || norm(record.body) === norm(entity.body));
    if (target === 'action') return norm(record.title) === norm(entity.title) && record.date === entity.date && (!has(entity, 'goalId') || record.goalId === entity.goalId) && (!has(entity, 'minutes') || record.minutes === entity.minutes);
    if (target === 'progress') return record.goalId === entity.goalId && record.date === entity.date && record.value === entity.value && (!has(entity, 'note') || norm(record.note) === norm(entity.note));
    return record.mealId === entity.mealId && record.date === entity.date && (!entity.time || record.time === entity.time) && (!entity.planId || record.planId === entity.planId) && record.servings === entity.servings && record.stockUsed === entity.useStock;
  }
  function candidateRecords(target, all, entity) {
    if (target === 'sleep') return all.filter(r => r.kind === entity.kind && r.wakeDate === entity.wakeDate);
    if (target === 'work') { const start = civilStamp(entity.start), end = civilStamp(entity.end); return all.filter(r => start < r.endAt && end > r.startAt); }
    if (target === 'money') return all.filter(r => r.type === 'expense' && r.date === entity.date && r.accountId === entity.accountId && (r.amount === entity.amount || (has(entity, 'category') && norm(r.category) === norm(entity.category))));
    if (target === 'people') return all.filter(r => r.personId === entity.personId && r.type === entity.type && r.date === entity.date && (entity.type === 'contact' ? r.kind === entity.kind : (has(entity, 'title') && norm(r.title) === norm(entity.title))));
    if (target === 'action') return all.filter(r => norm(r.title) === norm(entity.title) && (!has(entity, 'goalId') || r.goalId === entity.goalId) && (!r.done || r.date === entity.date));
    if (target === 'progress') return all.filter(r => r.goalId === entity.goalId && r.date === entity.date);
    return all.filter(r => r.mealId === entity.mealId && r.date === entity.date && (!entity.time || r.time === entity.time) && (!entity.planId || r.planId === entity.planId));
  }
  function operation(proposal, entity) { const value = proposal.operationId || proposal.id || 'capture-' + hash([proposal.target, entity]); return textField(value, 'Capture identifier', 150, true); }
  function sleepValue(entity, prior) {
    return { kind: entity.kind, wakeDate: entity.wakeDate, duration: entity.durationMinutes, feeling: has(entity, 'feeling') ? entity.feeling : prior?.feeling ?? null, note: has(entity, 'note') ? entity.note : prior?.note || '', bedDate: prior?.bedDate || null, bedTime: prior?.bedTime || null, wakeTime: prior?.wakeTime || null };
  }
  function inspect(proposal) {
    const target = proposal?.target;
    let entity, fingerprint = 'invalid-' + hash([target || null, proposal?.entity || null]);
    const answer = (state, message, extra = {}) => ({ state, status: state, message, fingerprint, canReplace: false, canSeparate: false, allowedActions: ['skip'], ...extra });
    try {
      if (!routes[target]) return answer('unsupported', 'This update needs its own section. It is not supported by Capture yet.');
      entity = normalize(proposal);
      const all = records(target), op = operation(proposal, entity), semantic = hash([target, entity]);
      fingerprint = hash([target, entity, all, supportState(target)]);
      const priorOperation = consumed.get(op);
      if (priorOperation) {
        if (priorOperation.semantic !== semantic) return answer('conflict', 'This capture identifier was already used for different details. Parse a new entry.', { consumed: true });
        const canSeparate = target !== 'work' && !(target === 'sleep' && entity.kind === 'main');
        const summary = describe({ target, entity });
        return answer('duplicate', canSeparate ? 'This capture has already been applied. If this was another event, choose a separate entry for review. Retrying this same capture will not add it twice.' : 'This capture has already been applied. Retrying it will not add another record.', { consumed: true, existing: { id: priorOperation.result.id, summary }, existingSummary: summary, canSeparate, allowedActions: ['skip'].concat(canSeparate ? ['separate'] : []) });
      }
      const exact = all.filter(r => comparable(target, r, entity));
      const candidates = candidateRecords(target, all, entity);
      const matched = exact.length ? exact : candidates;
      if (matched.length > 1) return answer('needs-input', 'Several existing entries could match. Open ' + routeFor(target) + ' to choose the correct record, or make the proposed details more specific.', { existingRecords: copy(matched) });
      const existing = matched[0];
      if (target === 'work') { const active = WorkDemo.active; if (active && civilStamp(entity.start) < WorkDemo.now() && civilStamp(entity.end) > active.startAt) return answer('conflict', 'This overlaps the running work clock. Clock out in Work before importing the shift.'); }
      if (existing) {
        const canSeparate = target !== 'work' && !(target === 'sleep' && entity.kind === 'main');
        let canReplace = !(target === 'action' && existing.done);
        if (target === 'meal' && existing.stockUsed !== entity.useStock) canReplace = false;
        const summaryEntity = target === 'sleep' ? { ...existing, durationMinutes: existing.duration } : existing;
        const summary = describe({ target, entity: summaryEntity });
        const message = exact.length ? (canSeparate ? 'A matching entry is already recorded. Keep it unless this was genuinely a separate event.' : 'A matching entry is already recorded. Keep it, or review a correction to the existing record.') : canReplace && canSeparate ? 'An existing entry covers this event with different details. Choose a correction or confirm a separate event.' : canReplace ? 'An existing entry covers this event with different details. Review a correction to that record.' : 'A related entry is already recorded. Add this only if it was a separate event.';
        return answer(exact.length ? 'duplicate' : 'conflict', message, { existing: { ...copy(existing), summary }, existingSummary: summary, canReplace, canSeparate, allowedActions: ['skip'].concat(canReplace ? ['replace'] : [], canSeparate ? ['separate'] : []) });
      }
      if (target === 'sleep') { const checked = validateSleep(sleepValue(entity, null), all, null); if (checked.error) return answer('needs-input', checked.error); }
      if (target === 'meal') {
        const plans = entity.planId ? FoodDemo.plans.filter(p => p.id === entity.planId) : FoodDemo.plans.filter(p => p.date === entity.date && p.mealId === entity.mealId && (!entity.time || p.time === entity.time) && !all.some(l => l.planId === p.id));
        if (plans.length > 1) return answer('needs-input', 'More than one planned meal matches. Choose the meal time or a specific planned meal.');
        if (!plans.length && !entity.time) return answer('needs-input', 'Choose a meal time, or select an existing planned meal.');
        const plan = plans[0] || entity;
        if (entity.useStock) { const missing = FoodDemo.requirements(plan, entity.servings).find(r => FoodDemo.stock(r.foodId) + 0.000001 < r.grams); if (missing) return answer('needs-input', 'Not enough ' + (FoodDemo.food(missing.foodId)?.name || 'pantry stock') + '. Update stock or choose not to use the pantry.'); }
      }
      return answer('ready', 'Ready to add to ' + routeFor(target) + '.', { allowedActions: ['apply', 'skip'] });
    } catch (error) { return answer('needs-input', error.message || 'Check this proposed entry.'); }
  }
  function apply(proposal, options = {}) {
    const target = proposal?.target, route = routeFor(target), check = inspect(proposal);
    const failure = (error, extra = {}) => ({ ok: false, status: 'blocked', route, error, ...extra });
    if (check.consumed) return check.state === 'duplicate' ? { ok: true, status: 'duplicate', unchanged: true, route, id: check.existing.id, recordId: check.existing.id } : failure(check.message);
    if (options.fingerprint !== undefined && options.fingerprint !== check.fingerprint) return failure('The underlying record changed after review. Check this proposal again.', { stale: true });
    if (check.state === 'unsupported' || check.state === 'needs-input') return failure(check.message);
    if (options.replaceId && options.allowSeparate) return failure('Choose a correction or a separate entry, not both.');
    if (options.replaceId && (!check.canReplace || check.existing?.id !== options.replaceId)) return failure('The selected record is not an available correction. Review the entry again.');
    if (options.allowSeparate && !check.canSeparate && check.state !== 'ready') return failure('A separate entry is not supported for this event.');
    if ((check.state === 'duplicate' || check.state === 'conflict') && !options.replaceId && !options.allowSeparate) return failure(check.message);
    try {
      const entity = normalize(proposal), op = operation(proposal, entity), semantic = hash([target, entity]);
      const prior = options.replaceId ? records(target).find(r => r.id === options.replaceId) : null;
      let result;
      if (target === 'sleep') {
        const value = sleepValue(entity, prior), checked = validateSleep(value, activeSleepRecords(), prior?.id || null);
        if (checked.error) return failure(checked.error);
        const historicalMain = prior ? sleepRevisions.filter(r => r.sessionId === prior.sessionId && r.kind === 'main' && r.targetSnapshot !== null).slice(-1)[0] : null;
        const record = { ...value, id: uid('sleep-version'), sessionId: prior ? prior.sessionId : uid('sleep-session'), timeInBed: checked.timeInBed, source: 'Capture review', zone: checked.zone, timing: checked.timing, targetSnapshot: value.kind === 'main' ? historicalMain ? historicalMain.targetSnapshot : sleepView.goal : null, createdAt: new Date().toISOString(), supersedes: prior ? prior.id : null, operationId: op };
        sleepRevisions.push(record); result = { ok: true, entity: record };
      } else if (target === 'work') result = prior ? WorkDemo.correctEntry(prior.id, { ...prior, ...entity }) : WorkDemo.addEntry(entity);
      else if (target === 'money') result = prior ? MoneyDemo.correctTransaction(prior.id, { ...prior, ...entity, operationId: op }) : MoneyDemo.addTransaction({ ...entity, operationId: op });
      else if (target === 'people') result = prior ? PeopleDemo.correctEvent(prior.id, { ...prior, ...entity, operationId: op }) : PeopleDemo.addEvent({ ...entity, operationId: op });
      else if (target === 'action') result = prior ? GoalsDemo.updateAction(prior.id, { ...prior, ...entity }) : GoalsDemo.addAction(entity);
      else if (target === 'progress') result = prior ? GoalsDemo.correctProgress(prior.id, { ...prior, ...entity }) : GoalsDemo.logProgress({ ...entity, operationId: op });
      else if (target === 'meal') {
        if (prior) {
          if (prior.mealId !== entity.mealId || prior.date !== entity.date || (entity.time && prior.time !== entity.time) || prior.stockUsed !== entity.useStock) return failure('Capture can correct a meal portion only. Change other meal details in Food.');
          result = FoodDemo.correctLog(prior.id, entity.servings);
        } else {
          const logs = FoodDemo.logs;
          const matches = options.allowSeparate ? [] : entity.planId ? FoodDemo.plans.filter(p => p.id === entity.planId && !logs.some(l => l.planId === p.id)) : FoodDemo.plans.filter(p => p.date === entity.date && p.mealId === entity.mealId && (!entity.time || p.time === entity.time) && !logs.some(l => l.planId === p.id));
          if (matches.length > 1) return failure('Several planned meals match. Choose a specific meal.');
          let plan = matches[0], created = false;
          if (!plan) {
            const time = entity.time || check.existing?.time;
            if (!validTime(time)) return failure('Choose a meal time before logging a separate meal.');
            const candidate = { date: entity.date, time, mealId: entity.mealId, servings: entity.servings };
            if (entity.useStock) { const missing = FoodDemo.requirements(candidate, entity.servings).find(r => FoodDemo.stock(r.foodId) + 0.000001 < r.grams); if (missing) return failure('Pantry stock changed. Review this meal again.'); }
            const added = FoodDemo.addPlan(candidate);
            if (!added.ok) return failure(added.error);
            plan = added.plan; created = true;
          }
          result = FoodDemo.logMeal(plan.id, { servings: entity.servings, useStock: entity.useStock });
          if (!result.ok && created) { const rollback = FoodDemo.removePlan(plan.id); if (!rollback.ok) return failure(result.error + ' The new meal plan remains; inspect Food before retrying.', { partial: true, planId: plan.id }); }
        }
      }
      if (!result?.ok) return failure(result?.error || 'This entry could not be applied.');
      const id = result.id || result.entity?.id || result.entry?.id || result.log?.id || result.action?.id;
      const output = { ok: true, status: result.unchanged || result.duplicate ? 'duplicate' : 'applied', route, id, recordId: id, unchanged: !!(result.unchanged || result.duplicate) };
      consumed.set(op, { semantic, result: copy(output) });
      return output;
    } catch (error) { return failure(error.message || 'This entry could not be applied.'); }
  }
  // Parser context remains snapshot(); persistent operation receipts use persistenceSnapshot().
  function persistenceSnapshot() { return copy({ version: 1, consumed: Array.from(consumed.entries()) }); }
  function restore(data,options={}) {
    try {
      const state = copy(data);
      if (!state || state.version !== 1 || !Array.isArray(state.consumed) || state.consumed.some(entry => !Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !entry[0] || !entry[1] || typeof entry[1].semantic !== 'string' || !entry[1].result || entry[1].result.ok !== true || typeof entry[1].result.id !== 'string') || new Set(state.consumed.map(entry => entry[0])).size !== state.consumed.length) return { ok: false, error: 'The saved Capture receipts are incomplete.' };
      if(options.validateOnly)return {ok:true};
      consumed.clear(); state.consumed.forEach(([key, value]) => consumed.set(key, value));
      return { ok: true };
    } catch (_) { return { ok: false, error: 'The saved Capture receipts could not be restored.' }; }
  }
  return Object.freeze({ snapshot, persistenceSnapshot, restore, vocab, inspect, apply, describe, routeFor });
})();

    // Callable workspace capture format, separate from the unchanged lifeos-ops/1 writer contract.
    // Deterministic statement matching. Unknown text remains visible for manual review.
    const CaptureDemo = (() => {
      let current = null;
      const batches = [];
      const copy = value => JSON.parse(JSON.stringify(value));
      const routes = { sleep: 'sleep', work: 'work', money: 'money', people: 'people', action: 'goals', progress: 'goals', meal: 'food' };
      const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1970 && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
      const shiftDate = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
      const normalized = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
      function stable(value) {
        if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
        if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
        return JSON.stringify(typeof value === 'string' ? normalized(value) : value);
      }
      function hash(value) { let a = 2166136261, b = 3339675911; for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b ^ value.charCodeAt(i), 2246822519); } return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0'); }
      const baseOperation = row => 'capture-preview:' + row.target + ':' + hash(stable(row.entity));
      const result = (ok = true, error) => ({ ok, batch: current ? copy(current) : null, ...(error ? { error } : {}) });
      function keepHistory() { if (!current) return; const index = batches.findIndex(batch => batch.id === current.id); if (index >= 0) batches[index] = copy(current); else batches.push(copy(current)); }
      function vocab() { try { return CaptureTargetsDemo.vocab(); } catch (_) { return { accounts: [], people: [], goals: [], meals: [] }; } }
      function matchName(list, name) { const matches = (list || []).filter(item => normalized(item.name || item.title) === normalized(name)); return matches.length === 1 ? matches[0] : null; }
      function lookup(list, id) { return (list || []).find(item => item.id === id); }
      function summary(row) {
        const e = row.entity, v = vocab(), person = lookup(v.people, e.personId), account = lookup(v.accounts, e.accountId), goal = lookup(v.goals, e.goalId), meal = lookup(v.meals, e.mealId);
        if (row.target === 'sleep') return (e.kind === 'nap' ? 'Nap' : 'Sleep') + ': ' + Math.floor(Number(e.durationMinutes) / 60) + 'h ' + (Number(e.durationMinutes) % 60) + 'm, waking ' + e.wakeDate;
        if (row.target === 'work') return 'Work: ' + String(e.start || '').replace('T', ' ') + ' to ' + String(e.end || '').replace('T', ' ') + ', ' + e.breakMinutes + ' min break';
        if (row.target === 'money') return 'Spent £' + Number(e.amount).toFixed(2) + ' on ' + (e.category || 'uncategorised spending') + ' from ' + (account ? account.name : 'an account to choose');
        if (row.target === 'people') return (e.type === 'note' ? 'Remember for ' : 'Contact with ') + (person ? person.name : 'a person to choose') + (e.type === 'note' && e.body ? ': ' + e.body : '');
        if (row.target === 'action') return 'Action: ' + e.title;
        if (row.target === 'progress') return 'Goal progress: ' + (goal ? goal.name || goal.title : 'choose a goal') + ', ' + e.value + (goal && goal.unit ? ' ' + goal.unit : '');
        if (row.target === 'meal') return 'Meal: ' + e.servings + ' serving' + (Number(e.servings) === 1 ? '' : 's') + ' of ' + (meal ? meal.name : 'a recipe to choose');
        return 'Review this update';
      }
      function inspect(row) {
        try {
          const check = CaptureTargetsDemo.inspect({ id: row.id, operationId: row.operationId, target: row.target, entity: copy(row.entity), sourceText: row.sourceSpan.text });
          const state = check.status || check.state || 'needs-input';
          return { ...copy(check), state, status: state, allowedActions: check.allowedActions || [], canReplace: check.canReplace === true, canSeparate: check.canSeparate === true };
        } catch (error) { return { status: 'unsupported', state: 'unsupported', message: error.message || 'This destination is unavailable.', fingerprint: null, allowedActions: [], canReplace: false, canSeparate: false }; }
      }
      function showCheck(row, check, selectReady = true) {
        row.check = copy(check); row.status = check.status; row.message = check.message || ''; row.existing = check.existing ? copy(check.existing) : null;
        row.summary = summary(row); row.route = check.route || routes[row.target] || null;
        row.selected = selectReady && check.status === 'ready'; row.error = null;
      }
      function updateBatchStatus() {
        if (!current) return;
        const saved = current.proposals.filter(row => row.status === 'saved').length;
        const pending = current.proposals.some(row => !['saved', 'duplicate', 'skipped'].includes(row.status));
        current.status = saved ? (pending || current.unresolved.length ? 'partial' : 'complete') : 'review';
        current.counts = { saved, ready: current.proposals.filter(row => row.status === 'ready' && row.selected).length, needsInput: current.proposals.filter(row => row.status === 'needs-input').length, duplicate: current.proposals.filter(row => row.status === 'duplicate').length, conflict: current.proposals.filter(row => row.status === 'conflict').length, failed: current.proposals.filter(row => row.status === 'failed').length, unresolved: current.unresolved.length };
      }
      function splitStatements(text) {
        const spans = [], separators = /[;\n]+|[.!?](?=\s|$)/g;
        let last = 0, match;
        const add = end => { const raw = text.slice(last, end), leading = raw.match(/^\s*/)[0].length, trailing = raw.match(/\s*$/)[0].length; if (raw.trim()) spans.push({ start: last + leading, end: end - trailing, text: raw.trim() }); };
        while ((match = separators.exec(text))) {
          if (match[0] === '.' && /(?:\b(?:dr|mr|mrs|ms|prof|st|sr|jr)|\b[A-Za-z])\.$/i.test(text.slice(last, match.index + 1))) continue;
          add(/[.!?]/.test(match[0]) ? match.index + 1 : match.index); last = separators.lastIndex;
        }
        add(text.length);
        return spans;
      }
      function parseStatement(span, selectedDate, vocabulary) {
        if (/\?$/.test(span.text)) return null;
        let text = span.text.replace(/[.!]$/, ''), date = selectedDate, match;
        const prefix = text.match(/^(today|yesterday|tomorrow|\d{4}-\d{2}-\d{2})\s*[:,]\s*/i);
        if (prefix) { const value = prefix[1].toLowerCase(); date = value === 'today' ? selectedDate : value === 'yesterday' ? shiftDate(selectedDate, -1) : value === 'tomorrow' ? shiftDate(selectedDate, 1) : value; text = text.slice(prefix[0].length); }
        if (!dateOK(date)) return null;
        if (!/^(?:remember\s+for\s+|(?:add\s+)?action:)/i.test(text) && /\b(?:not|never|didn['\u2019]t|will|might|maybe|perhaps|would|could|today|yesterday|tomorrow)\b|\b\d{4}-\d{2}-\d{2}\b/i.test(text)) return null;
        if ((match = text.match(/^(?:I\s+)?(slept|napped)\s+(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)(?:\s+(\d+)\s*(?:minutes?|mins?|m))?|(\d+)\s*(?:minutes?|mins?|m))$/i))) {
          const durationMinutes = match[4] ? Number(match[4]) : Number(match[2]) * 60 + Number(match[3] || 0);
          return { target: 'sleep', entity: { wakeDate: date, durationMinutes, kind: match[1].toLowerCase() === 'napped' ? 'nap' : 'main' } };
        }
        if ((match = text.match(/^(?:I\s+)?worked\s+(overnight\s+)?(?:from\s+)?([0-2]\d:[0-5]\d)\s+to\s+([0-2]\d:[0-5]\d)\s+with\s+(?:a\s+)?(\d+)\s*(?:minute|min)\s+break$/i))) {
          return { target: 'work', entity: { start: date + 'T' + match[2], end: (match[1] && match[3] <= match[2] ? shiftDate(date, 1) : date) + 'T' + match[3], breakMinutes: Number(match[4]) } };
        }
        if ((match = text.match(/^(?:I\s+)?spent\s+£?(\d+(?:\.\d{1,2})?)\s+on\s+(.+?)(?:\s+from\s+(.+))?$/i))) {
          const account = match[3] ? matchName(vocabulary.accounts, match[3]) : null;
          return { target: 'money', entity: { date, type: 'expense', accountId: account ? account.id : null, amount: Number(match[1]), category: match[2].trim() } };
        }
        if ((match = text.match(/^(?:I\s+)?(called|messaged|met)\s+([^:]+?)(?:\s*:\s*(.+))?$/i))) {
          const person = matchName(vocabulary.people, match[2]);
          return { target: 'people', entity: { personId: person ? person.id : null, type: 'contact', date, kind: { called: 'call', messaged: 'message', met: 'in-person' }[match[1].toLowerCase()], ...(match[3] ? { body: match[3].trim() } : {}) } };
        }
        if ((match = text.match(/^remember\s+for\s+([^:]+):\s*(.+)$/i))) {
          const person = matchName(vocabulary.people, match[1]);
          return { target: 'people', entity: { personId: person ? person.id : null, type: 'note', date, body: match[2].trim() } };
        }
        if ((match = text.match(/^(?:add\s+)?action:\s*(.+)$/i))) return { target: 'action', entity: { title: match[1].trim(), date } };
        if ((match = text.match(/^goal progress for\s+(.+?):\s*(\d+(?:\.\d+)?)$/i))) {
          const goal = matchName(vocabulary.goals, match[1]);
          return { target: 'progress', entity: { goalId: goal ? goal.id : null, date, value: Number(match[2]) } };
        }
        if ((match = text.match(/^(?:I\s+)?ate\s+(\d+(?:\.\d+)?)\s+servings?\s+of\s+(.+?)\s+at\s+([0-2]\d:[0-5]\d)\s+(using|without)\s+pantry$/i))) {
          const meal = matchName(vocabulary.meals, match[2]);
          return { target: 'meal', entity: { date, mealId: meal ? meal.id : null, servings: Number(match[1]), time: match[3], useStock: match[4].toLowerCase() === 'using' } };
        }
        return null;
      }
      function parse(text, options = {}) {
        if (typeof text !== 'string' || !text.trim()) return result(false, 'Add the text you want to review.');
        if (text.length > 12000) return result(false, 'Use up to 12,000 characters in one capture.');
        const date = options.date === undefined ? TODAY : options.date;
        if (!dateOK(date)) return result(false, 'Choose a valid date for this capture.');
        if (current) { updateBatchStatus(); keepHistory(); }
        current = { id: uid('capture-batch'), contract: 'lifeos-capture-preview/1', originalText: text, date, source: String(options.source || 'typed').slice(0, 200), createdOn: TODAY, status: 'review', proposals: [], unresolved: [], commits: 0 };
        const vocabulary = vocab();
        splitStatements(text).forEach(span => {
          const parsed = parseStatement(span, date, vocabulary);
          if (!parsed) { current.unresolved.push({ id: uid('capture-unresolved'), sourceSpan: copy(span), text: span.text, reason: 'This statement does not match a supported pattern. Nothing has been changed from it.' }); return; }
          const row = { id: uid('capture-proposal'), ...parsed, sourceSpan: copy(span), operationId: '', baseOperationId: '', selected: false, resolution: null, status: 'needs-input', message: '', error: null, recordId: null };
          row.baseOperationId = baseOperation(row); row.operationId = row.baseOperationId;
          showCheck(row, inspect(row)); current.proposals.push(row);
        });
        updateBatchStatus(); keepHistory(); return result();
      }
      function proposal(id) { return current && current.proposals.find(row => row.id === id); }
      function edit(id, entityPatch) {
        const row = proposal(id);
        if (!row) return result(false, 'Open the capture containing this proposal.');
        if (row.status === 'saved') return result(false, 'This entry has already been saved. Correct it in its own section.');
        if (!entityPatch || typeof entityPatch !== 'object' || Array.isArray(entityPatch)) return result(false, 'Enter the corrected fields.');
        row.entity = { ...row.entity, ...copy(entityPatch) }; row.baseOperationId = baseOperation(row); row.operationId = row.baseOperationId; row.resolution = null;
        showCheck(row, inspect(row)); updateBatchStatus(); keepHistory(); return result();
      }
      function toggle(id, selected) {
        const row = proposal(id);
        if (!row) return result(false, 'This proposal could not be found.');
        if (row.status === 'saved') return result(false, 'This entry is already saved.');
        if (!selected) { row.selected = false; updateBatchStatus(); keepHistory(); return result(); }
        if (row.status === 'skipped' || row.status === 'failed') { row.resolution = null; showCheck(row, inspect(row)); }
        if (row.status !== 'ready') return result(false, 'Resolve or edit this proposal before selecting it.');
        row.selected = true; updateBatchStatus(); keepHistory(); return result();
      }
      function choose(id, action) {
        const row = proposal(id);
        if (!row || row.status === 'saved') return result(false, 'Choose an unsaved proposal.');
        if (action === 'skip') { row.status = 'skipped'; row.selected = false; row.resolution = null; row.message = 'Skipped by you. Nothing was saved from this proposal.'; updateBatchStatus(); keepHistory(); return result(); }
        if (!['replace', 'separate'].includes(action)) return result(false, 'Choose replace, separate or skip.');
        const now = inspect(row);
        if (row.check && row.check.fingerprint !== now.fingerprint) { row.resolution = null; showCheck(row, now, false); row.message = 'The existing information changed. Review the latest details before choosing again. ' + row.message; updateBatchStatus(); keepHistory(); return result(false, row.message); }
        const candidate = { ...row, operationId: row.baseOperationId + ':' + uid(action) }, check = inspect(candidate);
        const allowed = action === 'replace' ? check.canReplace || check.allowedActions.includes('replace') : check.canSeparate || check.allowedActions.includes('separate') || check.status === 'ready';
        const replaceId = check.existing && (check.existing.id || check.existing.recordId);
        if (!allowed || (action === 'replace' && !replaceId)) return result(false, check.message || 'That choice is not available for this proposal.');
        row.operationId = candidate.operationId; row.check = copy(check); row.existing = check.existing ? copy(check.existing) : null;
        row.resolution = { action, replaceId: action === 'replace' ? replaceId : null, fingerprint: check.fingerprint };
        row.status = 'ready'; row.selected = true; row.error = null; row.message = action === 'replace' ? 'You chose to correct the existing record.' : 'You chose to record a separate occurrence.';
        updateBatchStatus(); keepHistory(); return result();
      }
      function commit() {
        if (!current) return { ok: false, batch: null, results: [], counts: { saved: 0, duplicate: 0, conflict: 0, failed: 0, skipped: 0 }, error: 'Prepare a capture first.' };
        const results = [], counts = { saved: 0, duplicate: 0, conflict: 0, failed: 0, skipped: 0 };
        current.proposals.forEach(row => {
          if (row.status === 'saved') return;
          if (!row.selected) { results.push({ id: row.id, status: 'skipped' }); counts.skipped++; return; }
          const check = inspect(row);
          if (row.resolution && row.resolution.fingerprint !== check.fingerprint) {
            row.resolution = null; showCheck(row, check, false); row.message = 'This changed after your choice. Review the latest information before saving.'; row.status = check.status === 'ready' ? 'needs-input' : check.status;
            results.push({ id: row.id, status: 'conflict', error: row.message }); counts.conflict++; return;
          }
          if (!row.resolution && check.status !== 'ready') {
            showCheck(row, check, false); const status = check.status === 'duplicate' ? 'duplicate' : 'conflict'; results.push({ id: row.id, status, error: row.message }); counts[status]++; return;
          }
          try {
            const options = { fingerprint: check.fingerprint, ...(row.resolution && row.resolution.action === 'replace' ? { replaceId: row.resolution.replaceId } : {}), ...(row.resolution && row.resolution.action === 'separate' ? { allowSeparate: true } : {}) };
            const applied = CaptureTargetsDemo.apply({ id: row.id, operationId: row.operationId, target: row.target, entity: copy(row.entity), sourceText: row.sourceSpan.text }, options);
            const status = applied.status || applied.state;
            if (applied.ok && !['duplicate', 'conflict', 'needs-input', 'unsupported', 'failed'].includes(status)) { row.status = 'saved'; row.selected = false; row.recordId = applied.recordId || applied.id || (applied.entity && applied.entity.id) || null; row.route = applied.route || row.route; row.message = 'Saved in the ' + (row.route || row.target) + ' record.'; row.error = null; counts.saved++; results.push({ id: row.id, status: 'saved', recordId: row.recordId, route: row.route }); }
            else if (status === 'duplicate') { showCheck(row, inspect(row), false); row.status = 'duplicate'; row.message = applied.error || applied.message || 'Already recorded. Nothing was added again.'; counts.duplicate++; results.push({ id: row.id, status: 'duplicate', recordId: applied.recordId || applied.id || null }); }
            else { row.status = status === 'conflict' ? 'conflict' : 'failed'; row.selected = false; row.error = applied.error || applied.message || 'This proposal did not save.'; row.message = row.error; counts[row.status === 'conflict' ? 'conflict' : 'failed']++; results.push({ id: row.id, status: row.status, error: row.error }); }
          } catch (error) { row.status = 'failed'; row.selected = false; row.error = error.message || 'This proposal did not save.'; row.message = row.error; counts.failed++; results.push({ id: row.id, status: 'failed', error: row.error }); }
        });
        current.commits++; current.lastResults = copy(results); updateBatchStatus(); keepHistory();
        return { ok: counts.failed === 0 && counts.conflict === 0, batch: copy(current), results, counts };
      }
      function dismiss() { if (current) { updateBatchStatus(); if (!current.proposals.some(row => row.status === 'saved')) current.status = 'unfinished'; keepHistory(); } current = null; return result(); }
      function open(id) {
        const saved = batches.find(batch => batch.id === id);
        if (!saved) return result(false, 'This capture could not be found in your history.');
        if (current) { updateBatchStatus(); keepHistory(); }
        current = copy(saved);
        current.proposals.forEach(row => { if (['saved', 'skipped'].includes(row.status)) return; const selected = row.selected, check = inspect(row); if (row.resolution && row.resolution.fingerprint === check.fingerprint) { row.check = check; row.status = 'ready'; row.selected = selected; } else { row.resolution = null; showCheck(row, check, selected); } });
        updateBatchStatus(); keepHistory(); return result();
      }
      function snapshot() { return copy({ version: 1, current, batches }); }
      function restore(data,options={}) {
        try {
          const state = copy(data);
          const object = value => value && typeof value === 'object' && !Array.isArray(value);
          const id = value => typeof value === 'string' && value.length > 0;
          const statuses = ['ready', 'needs-input', 'duplicate', 'conflict', 'unsupported', 'saved', 'failed', 'skipped'];
          const validProposal = row => object(row) && id(row.id) && !!routes[row.target] && object(row.entity) && object(row.sourceSpan) && typeof row.sourceSpan.text === 'string' && id(row.operationId) && id(row.baseOperationId) && statuses.includes(row.status) && typeof row.selected === 'boolean' && (row.resolution === null || object(row.resolution));
          const validBatch = batch => object(batch) && id(batch.id) && batch.contract === 'lifeos-capture-preview/1' && typeof batch.originalText === 'string' && dateOK(batch.date) && typeof batch.source === 'string' && Array.isArray(batch.proposals) && batch.proposals.every(validProposal) && new Set(batch.proposals.map(row => row.id)).size === batch.proposals.length && Array.isArray(batch.unresolved) && batch.unresolved.every(row => object(row) && object(row.sourceSpan) && typeof row.sourceSpan.text === 'string') && Number.isInteger(batch.commits) && batch.commits >= 0;
          if (!object(state) || state.version !== 1 || !Array.isArray(state.batches) || !state.batches.every(validBatch) || new Set(state.batches.map(batch => batch.id)).size !== state.batches.length || state.current !== null && !validBatch(state.current)) return result(false, 'The saved Capture history is incomplete.');
          if (state.current && !state.batches.some(batch => batch.id === state.current.id)) return result(false, 'The open Capture is missing from its history.');
          if(options.validateOnly)return {ok:true};
          batches.length = 0; state.batches.forEach(batch => batches.push(batch)); current = state.current;
          // Review decisions are preserved; commit() rechecks current records before every write.
          return result();
        } catch (_) { return result(false, 'The saved Capture record could not be restored.'); }
      }
      return { get current() { return current ? copy(current) : null; }, get history() { return copy(batches).reverse(); }, snapshot, restore, parse, prepare: parse, edit, toggle, choose, commit, dismiss, open };
    })();

function renderCaptureMap(summary,selected='all') {
  const areas=[{id:'sleep',label:'Sleep',colour:'#85d6ff'},{id:'food',label:'Food',colour:'#a4ccf3'},{id:'work',label:'Work',colour:'#f1bc7b'},{id:'goals',label:'Goals',colour:'#c0b3ff'},{id:'money',label:'Money',colour:'#9ccdf0'},{id:'people',label:'People',colour:'#efaeca'}];
  const count=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  const items=areas.map((area,index)=>{const value=summary&&summary[area.id]||{},row=index<3?0:1,column=index%3;return {...area,total:count(value.total),ready:count(value.ready),issue:count(value.issue),saved:count(value.saved),duplicate:count(value.duplicate),skipped:count(value.skipped),x:[44,66,88][column],y:row?73:27,mobileX:[17,50,83][column],mobileY:row?82:47};});
  const target=selected==='all'||areas.some(a=>a.id===selected)?selected:'all';
  const totals=items.reduce((sum,item)=>({total:sum.total+item.total,ready:sum.ready+item.ready,issue:sum.issue+item.issue,saved:sum.saved+item.saved,duplicate:sum.duplicate+item.duplicate,skipped:sum.skipped+item.skipped}),{total:0,ready:0,issue:0,saved:0,duplicate:0,skipped:0});
  const detail=item=>item.total+' '+(item.total===1?'update':'updates')+': '+item.ready+' ready, '+item.issue+' to check, '+item.saved+' saved, '+item.duplicate+' already recorded, '+item.skipped+' left out';
  const complete=item=>item.total>0&&item.saved+item.duplicate+item.skipped===item.total;
  const state=item=>item.issue>0?'issue':item.ready>0?'ready':item.saved>0&&item.saved===item.total?'saved':complete(item)?'reviewed':item.total>0?'review':'empty';
  const status=item=>item.issue>0?item.issue+' to check':item.ready>0?item.ready+' ready':item.saved>0&&item.saved===item.total?'All saved':item.duplicate>0&&item.duplicate===item.total?'Already recorded':item.skipped>0&&item.skipped===item.total?'Left out':complete(item)?'Reviewed':item.total>0?'To review':'Nothing yet';
  const overview=[totals.ready?totals.ready+' ready':'',totals.issue?totals.issue+' to check':'',totals.saved?totals.saved+' saved':'',totals.duplicate?totals.duplicate+' already recorded':'',totals.skipped?totals.skipped+' left out':''].filter(Boolean).join(' · ')||(totals.total+' '+(totals.total===1?'update':'updates'));
  const desktopPath=item=>{const x=item.x*6,y=item.y*2.7-20.5,column=[44,66,88].indexOf(item.x),upper=item.y<50;return column===0?'M72 135 C160 135 190 '+y.toFixed(2)+' '+x.toFixed(2)+' '+y.toFixed(2):column===1?'M72 135 C140 '+(upper?-12:284)+' 318 '+(upper?-15:288)+' '+x.toFixed(2)+' '+y.toFixed(2):'M72 135 C145 '+(upper?-25:300)+' 480 '+(upper?-25:300)+' '+x.toFixed(2)+' '+y.toFixed(2);};
  const mobilePath=item=>{const x=item.mobileX*3,y=item.mobileY*2.38-18.5,bend=item.mobileX===50?150:item.mobileX<50?105:195;if(item.mobileY<60)return 'M150 40.46 C150 72 '+bend+' '+(y-30).toFixed(2)+' '+x.toFixed(2)+' '+y.toFixed(2);const controls=item.mobileX<50?'105 77 101 140':item.mobileX>50?'195 77 204 140':'215 86 194 150';return 'M150 40.46 C'+controls+' '+x.toFixed(2)+' '+y.toFixed(2);};
  const line=(item,path)=>'<path class="capture-map-link" d="'+path+'" style="stroke:'+item.colour+';opacity:'+(item.total===0?.10:target===item.id?.72:target==='all'?.37:.16)+'"/>';
  return '<section class="capture-map" aria-label="Capture destinations"><div class="capture-map-header"><div><span class="eyebrow">Across your life</span><h2>One thought, connected.</h2></div><p>'+(totals.total?overview:'Your words can reach the right places.')+'</p></div><div class="capture-map-canvas">'+
    '<svg class="capture-map-lines capture-map-lines-desktop" viewBox="0 0 600 270" preserveAspectRatio="none" aria-hidden="true">'+items.map(item=>line(item,desktopPath(item))).join('')+'</svg>'+
    '<svg class="capture-map-lines capture-map-lines-mobile" viewBox="0 0 300 238" preserveAspectRatio="none" aria-hidden="true">'+items.map(item=>line(item,mobilePath(item))).join('')+'</svg>'+
    '<span class="capture-map-source-aura" aria-hidden="true"></span><button class="capture-map-source" data-action="capture-filter" data-target="all" aria-pressed="'+(target==='all')+'" aria-label="Show all capture updates. '+esc(detail(totals))+'" title="'+esc(detail(totals))+'"><strong>'+totals.total+'</strong><span>All updates</span><small>Your words</small></button>'+
    items.map(item=>'<button class="capture-map-node" data-action="capture-filter" data-target="'+item.id+'" data-state="'+state(item)+'" style="--capture-map-colour:'+item.colour+';--capture-map-x:'+item.x+'%;--capture-map-y:'+item.y+'%;--capture-map-mobile-x:'+item.mobileX+'%;--capture-map-mobile-y:'+item.mobileY+'%" aria-pressed="'+(target===item.id)+'" aria-label="Show '+item.label+' updates. '+esc(detail(item))+'" title="'+esc(item.label+': '+detail(item))+'"><span class="capture-map-orbit" aria-hidden="true">'+icon(item.id)+'<span class="capture-map-count">'+item.total+'</span></span><strong>'+item.label+'</strong><small>'+status(item)+'</small></button>').join('')+
    '</div><p class="capture-map-help">'+(totals.total?'Choose an area to focus the review. Counts include every update in this capture; each area shows what needs attention first.':'Suggestions will appear here when you review a capture. Each update stays yours to check before saving.')+'</p></section>';
}


    const captureView={tab:'capture',draft:'',date:TODAY,source:'typed',fileName:'',filter:'all',error:''};
    const captureDomain=t=>({meal:'food',action:'goals',progress:'goals'}[t]||t);
    const captureName=t=>({sleep:'Sleep',meal:'Food',food:'Food',work:'Work',action:'Actions',progress:'Goal progress',goals:'Goals',money:'Money',people:'People'}[t]||'A detail to keep');
    const captureStatus=s=>({ready:'Ready to add','needs-input':'Needs your input',duplicate:'Already recorded',conflict:'Different from your record',unsupported:'Needs a manual entry',saved:'Added to your record',failed:'Not saved',skipped:'Left out'}[s]||s);
    const captureSource=s=>({typed:'Typed check-in',transcript:'Imported transcript',plaud:'Pasted transcript',example:'Example check-in'}[s]||'Check-in');
    function captureSummary(batch){const summary={};for(const p of batch?.proposals||[]){const t=captureDomain(p.target);summary[t]??={total:0,ready:0,issue:0,saved:0,duplicate:0,skipped:0};summary[t].total++;summary[t].duplicate+=p.status==='duplicate'?1:0;summary[t].skipped+=p.status==='skipped'?1:0;summary[t].ready+=p.status==='ready'?1:0;summary[t].saved+=p.status==='saved'?1:0;summary[t].issue+=['needs-input','conflict','failed','unsupported'].includes(p.status)?1:0;}return summary;}
    function captureCounts(b){const p=b?.proposals||[];return {total:p.length,selected:p.filter(x=>x.status==='ready'&&x.selected).length,saved:p.filter(x=>x.status==='saved').length,attention:p.filter(x=>['needs-input','conflict','failed','unsupported'].includes(x.status)).length,duplicate:p.filter(x=>x.status==='duplicate').length};}
    function renderCapture(){const b=CaptureDemo.current,c=captureCounts(b);return '<div class="page-head capture-head"><div><div class="kicker">'+icon('capture')+'<span class="eyebrow">Capture & connect</span></div><h1>A thought. A little more order.</h1><p>Tell the story once. Give each detail a place.</p></div><button class="button ghost" data-action="capture-privacy">'+icon('shield')+' Your privacy</button></div><div class="capture-tabs" aria-label="Capture sections">'+[['capture','Capture'],['history','Your record']].map(([t,label])=>'<button data-action="capture-tab" data-tab="'+t+'" aria-pressed="'+(captureView.tab===t)+'">'+label+'</button>').join('')+'</div>'+(captureView.tab==='history'?renderCaptureHistory():b?renderCaptureReview(b,c):renderCaptureComposer());}
    function renderCaptureComposer(){return '<div class="capture-compose-layout"><section class="capture-composer"><span class="eyebrow">A little space to empty your head</span><h2>What happened today?</h2><label class="capture-input-label" for="captureText">Your check-in</label><textarea id="captureText" maxlength="12000" rows="7" placeholder="A meal, a catch-up, a small win, something you need to do...">'+esc(captureView.draft)+'</textarea><div class="capture-composer-meta"><label>Dates refer to<input id="captureDate" type="date" value="'+esc(captureView.date)+'" max="'+TODAY+'" required></label><span>'+esc(captureView.fileName||captureSource(captureView.source))+'</span></div><div class="capture-source-tools"><button class="text-button" data-action="capture-import">'+icon('upload')+' Import transcript</button><button class="text-button" data-action="capture-paste">'+icon('edit')+' Paste from Plaud</button><button class="text-button" data-action="capture-voice">'+icon('mic')+' Voice options</button></div><input id="captureFile" type="file" accept=".txt,text/plain" hidden><div id="captureError" class="error" role="alert">'+esc(captureView.error)+'</div><div class="capture-composer-bottom"><p>Review first. Nothing is added automatically.</p><button class="button primary" data-action="capture-review">Review my check-in '+icon('arrow')+'</button></div></section><aside class="capture-compose-aside">'+renderCaptureMap({},'all')+'</aside></div><details class="capture-guide"><summary>What can Capture understand?</summary><p>This version uses simple text patterns on this device. It has no connected AI or speech engine. Use one event per sentence or line. Anything it cannot recognise stays in your review.</p><p>You can enter details directly in each section, or use clear phrases such as “Add action: Put the washing on.” Free-form conversation and private voice processing are the next implementation layer.</p></details>';}
    function renderCaptureReview(b,c){const visible=b.proposals.filter(p=>captureView.filter==='all'||captureDomain(p.target)===captureView.filter),unresolved=b.unresolved||[];return '<div class="capture-review-top"><div><span class="eyebrow">'+esc(captureSource(b.source))+' · '+dateLabel(b.date,{day:'numeric',month:'long',year:'numeric'})+'</span><h2>'+ (c.saved?'Your words are becoming a record.':'Here is where it all belongs.')+'</h2><p>'+c.total+' proposed '+(c.total===1?'entry':'entries')+' · '+c.saved+' added'+(c.duplicate?' · '+c.duplicate+' already recorded':'')+(c.attention?' · '+c.attention+' need attention':'')+(unresolved.length?' · '+unresolved.length+' unrecognised '+(unresolved.length===1?'part':'parts'):'')+'</p></div><button class="button ghost" data-action="capture-new">'+icon('plus')+' New check-in</button></div>'+renderCaptureMap(captureSummary(b),captureView.filter)+'<div class="capture-review-layout"><section><div class="capture-review-heading"><h3>'+(captureView.filter==='all'?'Your updates, in the order you said them.':captureName(captureView.filter)+' updates')+'</h3>'+(captureView.filter!=='all'?'<button class="text-button" data-action="capture-filter" data-target="all">Show everything</button>':'')+'</div><div class="capture-review-list">'+visible.map(renderCaptureRow).join('')+(!visible.length?'<p class="capture-empty">No proposed entries in this section.</p>':'')+'</div>'+(unresolved.length?'<section class="capture-unresolved"><span class="eyebrow">Still here, nothing lost</span><h3>These parts need a little more help.</h3>'+unresolved.map(u=>'<div><blockquote>'+esc(u.sourceSpan?.text||u.sourceText||u.text||'')+'</blockquote><p>'+esc(u.reason||u.message||'Capture could not turn this part into an entry.')+'</p></div>').join('')+'<p>The original check-in stays in Your record. Add these details manually, or use a new check-in with a clearer phrase.</p></section>':'')+'<div class="capture-commit-bar '+(!c.selected?'no-selection':'')+'"><div><strong>'+c.selected+' '+(c.selected===1?'entry':'entries')+' selected across all sections</strong><small>'+(c.saved?c.saved+' already added. They will not be added again.':'Selections in every section are included, even when filtered.')+'</small></div><button class="button primary" data-action="capture-commit" '+(!c.selected?'disabled':'')+'>'+icon('check')+' Add '+c.selected+' '+(c.selected===1?'entry':'entries')+'</button></div></section><aside class="capture-review-aside"><span class="eyebrow">Your words, kept together</span><h3>The original check-in.</h3><blockquote>'+esc(b.originalText)+'</blockquote><p class="capture-note">Tap a section above to focus. Added entries link back to the relevant part of the app.</p><div class="capture-review-key"><span><i class="ready"></i>Ready for your review</span><span><i class="issue"></i>Needs a detail or a decision</span><span><i class="saved"></i>Already in your record</span></div></aside></div>';}
    function renderCaptureRow(p){const source=p.sourceSpan?.text||p.sourceText||'',status=p.status,waiting=status==='saved'&&(LifeOSRuntime.saving||LifeOSRuntime.error),canEdit=!['saved','skipped','unsupported'].includes(status),ready=status==='ready';return '<article class="capture-entry '+esc(status)+'"><div class="capture-entry-mark">'+icon(captureDomain(p.target))+'</div><div class="capture-entry-content"><div class="capture-entry-top"><span class="eyebrow">'+captureName(p.target)+'</span><span class="capture-state '+esc(status)+'">'+(waiting?'Awaiting device save':captureStatus(status))+'</span></div><h3>'+esc(p.summary||CaptureTargetsDemo.describe(p))+'</h3><blockquote>'+esc(source)+'</blockquote>'+(waiting?'<p class="capture-entry-message">'+esc(LifeOSRuntime.error?'These updates are open but not yet stored. Retry saving or export them from workspace settings.':'Waiting for the device to finish saving these updates.')+'</p>':p.message?'<p class="capture-entry-message">'+esc(p.message)+'</p>':'')+(p.error?'<p class="capture-entry-error" role="alert">'+esc(p.error)+'</p>':'')+'<div class="capture-entry-tools">'+(canEdit?'<button class="text-button" data-action="capture-edit" data-id="'+esc(p.id)+'">'+icon('edit')+' '+(status==='needs-input'?'Fill in the details':'Edit details')+'</button>':'')+(status==='conflict'&&p.check?.canReplace?'<button class="text-button" data-action="capture-conflict" data-id="'+esc(p.id)+'">Review the difference '+icon('arrow')+'</button>':'')+(['duplicate','conflict'].includes(status)&&p.check?.canSeparate?'<button class="text-button" data-action="capture-separate" data-id="'+esc(p.id)+'">This was another event</button>':'')+(status==='saved'?'<button class="text-button" data-action="capture-destination" data-id="'+esc(p.id)+'" data-route="'+esc(p.route||CaptureTargetsDemo.routeFor(p.target))+'">Open '+captureName(p.target)+' '+icon('arrow')+'</button>':'')+(['failed','skipped'].includes(status)?'<button class="text-button" data-action="capture-retry" data-id="'+esc(p.id)+'">'+(status==='skipped'?'Bring back to review':'Check again')+'</button>':'')+(!['saved','skipped'].includes(status)?'<button class="text-button quiet" data-action="capture-skip" data-id="'+esc(p.id)+'">Leave this out</button>':'')+'</div></div>'+(ready?'<label class="capture-select"><input type="checkbox" data-capture-select="'+esc(p.id)+'" '+(p.selected?'checked':'')+' aria-label="Add '+esc(p.summary||captureName(p.target))+'"><span class="sr-only">Select entry</span></label>':'<span class="capture-entry-state-icon">'+icon(status==='saved'||status==='duplicate'?'check':'circle')+'</span>')+'</article>';}
    function renderCaptureHistory(){const rows=CaptureDemo.history.slice();return '<div class="capture-history-head"><div><span class="eyebrow">The thread behind your entries</span><h2>A record of what you shared.</h2><p>Return to an unfinished review or see where a check-in went.</p></div><button class="button primary" data-action="capture-new">'+icon('plus')+' New check-in</button></div><div class="capture-history">'+rows.map(b=>{const c=captureCounts(b);return '<button class="capture-history-row" data-action="capture-history-open" data-id="'+esc(b.id)+'"><span class="capture-history-date">'+Number(b.date.slice(-2))+'<small>'+dateLabel(b.date,{month:'short'})+'</small></span><span><span class="eyebrow">'+esc(captureSource(b.source))+'</span><strong>'+esc(b.originalText.slice(0,110))+(b.originalText.length>110?'…':'')+'</strong><small>'+c.saved+' added · '+c.duplicate+' already recorded'+(b.proposals.some(p=>!['saved','skipped','duplicate'].includes(p.status))?' · Review unfinished':'')+(b.unresolved?.length?' · '+b.unresolved.length+' unrecognised parts':'')+'</small></span>'+icon('arrow')+'</button>';}).join('')+(!rows.length?'<div class="capture-history-empty">'+icon('capture')+'<h3>Your first check-in starts the thread.</h3><p>The original words and the entries you approve will appear here.</p><button class="text-button" data-action="capture-tab" data-tab="capture">Start a check-in '+icon('arrow')+'</button></div>':'')+'</div><p class="capture-note">Your original words, review decisions and saved entries stay together in this device’s record.</p>';}
    function captureRender(){render();if($('captureText'))$('captureText').value=captureView.draft;}
    function captureFind(id){return CaptureDemo.current?.proposals.find(p=>p.id===id);}
    function captureOptions(rows,id,field='name'){return '<option value="">Choose one</option>'+rows.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===id?'selected':'')+'>'+esc(x[field]||x.name||x.title||x.id)+'</option>').join('');}
    function captureInput(label,id,value,type='text',extra=''){return '<label>'+label+'<input id="'+id+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'></label>';}
    function captureEdit(id){const p=captureFind(id);if(!p)return;const e=p.entity,v=CaptureTargetsDemo.snapshot();let fields='';
      const setup = p.target === 'money' && !v.accounts.some(a => a.reviewStatus !== 'needs-checking') ? {route:'money',name:'Money',text:v.accounts.length?'Check an account in Money before adding an expense.':'Add the account this expense came from in Money.'} : p.target === 'people' && !v.people.length ? {route:'people',name:'People',text:'Add this person to your circle first.'} : p.target === 'meal' && !v.meals.length ? {route:'food',name:'Food',text:'Add the recipe you ate in Food first.'} : p.target === 'progress' && !v.goals.length ? {route:'goals',name:'Goals',text:'Create the goal this result belongs to first.'} : null;
      if(setup){showDialog('A little setup first','<p>'+esc(setup.text)+'</p><p>Your check-in stays in Capture. Return here afterwards and choose Edit details to finish this proposal.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Back to review</button><button class="button primary" data-action="capture-setup" data-route="'+setup.route+'">Open '+setup.name+'</button></div>');return;}

      if(p.target==='sleep')fields=captureInput('Wake date','captureEditDate',e.wakeDate,'date','max="'+TODAY+'" required')+captureInput('Hours asleep','captureEditHours',Math.floor(e.durationMinutes/60),'number','min="0" max="24" required')+captureInput('Extra minutes','captureEditMinutes',e.durationMinutes%60,'number','min="0" max="59" required')+'<label>Sleep type<select id="captureEditKind"><option value="main" '+(e.kind!=='nap'?'selected':'')+'>Main sleep</option><option value="nap" '+(e.kind==='nap'?'selected':'')+'>A nap</option></select></label><p class="capture-field-hint">Use the date you woke up. Hours and minutes describe time asleep.</p>';
      if(p.target==='money')fields=captureInput('Date','captureEditDate',e.date,'date','max="'+TODAY+'" required')+captureInput('Money spent, £','captureEditAmount',e.amount,'number','min="0.01" step="0.01" required')+'<label>Paid from<select id="captureEditAccount" required>'+captureOptions(v.accounts,e.accountId)+'</select></label>'+captureInput('Category, optional','captureEditCategory',e.category||'');
      if(p.target==='people')fields='<label>Person<select id="captureEditPerson" required>'+captureOptions(v.people,e.personId)+'</select></label>'+captureInput('Date','captureEditDate',e.date,'date','max="'+TODAY+'" required')+'<label>What happened?<select id="captureEditType"><option value="contact" '+(e.type==='contact'?'selected':'')+'>We were in touch</option><option value="note" '+(e.type==='note'?'selected':'')+'>Something to remember</option></select></label><label>How were you in touch?<select id="captureEditKind"><option value="">Not a contact</option>'+[['call','A call'],['message','Messages'],['in-person','In person']].map(([k,l])=>'<option value="'+k+'" '+(e.kind===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+captureInput('A few words to find it later','captureEditTitle',e.title||'','text','maxlength="160"');
      if(p.target==='work')fields=captureInput('Started','captureEditStart',e.start,'datetime-local','required')+captureInput('Finished','captureEditEnd',e.end,'datetime-local','required')+captureInput('Unpaid break, minutes','captureEditBreak',e.breakMinutes,'number','min="0" required');
      if(p.target==='meal')fields='<label>Meal<select id="captureEditMeal" required>'+captureOptions(v.meals,e.mealId)+'</select></label>'+captureInput('Date','captureEditDate',e.date,'date','max="'+TODAY+'" required')+captureInput('Servings','captureEditServings',e.servings,'number','min="0.01" max="100" step="0.01" required')+captureInput('Time eaten','captureEditTime',e.time||'','time')+'<label>Did this use your pantry?<select id="captureEditStock" required><option value="">Choose one</option><option value="yes" '+(e.useStock===true?'selected':'')+'>Yes, deduct the ingredients</option><option value="no" '+(e.useStock===false?'selected':'')+'>No, leave my stock unchanged</option></select></label>';
      if(p.target==='action')fields=captureInput('What needs doing?','captureEditTitle',e.title,'text','maxlength="160" required')+captureInput('Planned date','captureEditDate',e.date,'date','required')+'<label>Linked goal, optional<select id="captureEditGoal">'+captureOptions(v.goals,e.goalId,'title')+'</select></label>'+captureInput('Estimated minutes, optional','captureEditDuration',e.minutes,'number','min="1"');
      if(p.target==='progress')fields='<label>Goal<select id="captureEditGoal" required>'+captureOptions(v.goals,e.goalId,'title')+'</select></label>'+captureInput('Date','captureEditDate',e.date,'date','max="'+TODAY+'" required')+'<label><span id="captureProgressUnit">Result</span><input id="captureEditValue" type="number" min="0" step="any" value="'+esc(e.value??'')+'" required></label><p id="captureProgressHint" class="capture-field-hint"></p>';
      showDialog('Review '+captureName(p.target).toLowerCase(),'<form id="captureEditForm" data-id="'+esc(id)+'"><blockquote class="capture-edit-source">'+esc(p.sourceSpan?.text||'')+'</blockquote><div class="capture-form-grid">'+fields+'</div>'+(!['meal','action'].includes(p.target)?'<label class="gap-top">'+(p.target==='people'?'What would you like to remember?':'Note, optional')+'<textarea id="captureEditNote" rows="3" maxlength="'+(p.target==='people'?4000:p.target==='progress'?500:p.target==='money'?1000:2000)+'">'+esc(p.target==='people'?e.body||'':e.note||'')+'</textarea></label>':'')+'<div id="captureEditError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Update the proposal</button></div></form>');captureProgressHint();
    }
    function captureProgressHint(){if(!$('captureProgressHint'))return;const g=CaptureTargetsDemo.vocab().goals.find(g=>g.id===$('captureEditGoal').value);$('captureProgressUnit').textContent=g?g.unit+' recorded':'Result';$('captureProgressHint').textContent=!g?'Choose the goal to see its unit.':g.mode==='best'?'Enter the result you managed on this date. Your best result is calculated for you. Zero records a practice day.':'Enter the amount to add for this date, not your running total. Zero records a practice day.';}
    function capturePrivacy(voice=false){showDialog(voice?'Your voice, your choice.':'A clear boundary for your words.','<div class="capture-privacy-steps"><section><span class="eyebrow">Working on this device</span><h3>Text stays here.</h3><p>Typing, pasted text and imported .txt transcripts are processed by simple rules in this page. There are no model calls, microphone access or external connections. Your check-ins are saved on this device.</p></section><section><span class="eyebrow">Planned for your phone</span><h3>Speak directly into your check-in.</h3><p>The intended first option is on-device transcription. A keyboard can already enter text into this box, but its privacy depends on the keyboard and dictation service you choose.</p></section><section><span class="eyebrow">Optional, later</span><h3>Your own home rig.</h3><p>A private home connection could handle more complex language after you explicitly enable it. No endpoint is configured here.</p></section></div><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Back to Capture</button></div>');}
    function captureDecision(id,separate=false){const p=captureFind(id);if(!p)return;showDialog(separate?'Record another event?':'Review the change','<span class="eyebrow">'+captureName(p.target)+'</span><h3 class="capture-decision-title">'+esc(p.summary)+'</h3>'+(p.check?.existingSummary?'<div class="capture-existing-comparison"><span class="eyebrow">Already in your record</span><p>'+esc(p.check.existingSummary)+'</p></div>':'')+'<p class="capture-detail">'+esc(p.message||p.check?.message||'An existing record needs your decision.')+'</p><p class="capture-detail">'+(separate?'Use this only if the words describe another real event, even though similar details are already recorded.':'Accepting this proposal will create a correction. The original record will stay in the history.')+'</p><p class="capture-note">This selects the proposal. You still choose when to add the selected entries.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Keep my record</button><button class="button primary" data-action="capture-resolve" data-id="'+esc(id)+'" data-choice="'+(separate?'separate':'replace')+'">'+(separate?'It was another event':'Use this correction')+'</button></div>');}
    let captureSaving=false;
    async function commitCaptureDurably(){if(!LifeOSRuntime.ready)throw new Error('Open the workspace before committing a capture.');const result=CaptureDemo.commit();await LifeOSRuntime.flush();return result;}
    async function captureAction(a,d){if(captureSaving){toast('Your selected updates are still being saved.');return;}
      if(a==='capture-setup'){closeDialog();navigate(d.route);return;}
      if(a==='capture-tab'){captureView.tab=d.tab;captureRender();return;}
      if(a==='capture-filter'){captureView.filter=d.target;captureRender();return;}
      if(a==='capture-new'){CaptureDemo.dismiss();captureView.tab='capture';captureView.draft='';captureView.fileName='';captureView.source='typed';captureView.filter='all';captureView.error='';captureRender();window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='capture-review'){captureView.draft=$('captureText').value;captureView.date=$('captureDate').value;const r=CaptureDemo.parse(captureView.draft,{date:captureView.date,source:captureView.source});captureView.error=r.ok?'':r.error;if(r.ok)captureView.filter='all';captureRender();if(r.ok)window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='capture-edit'){captureEdit(d.id);return;}
      if(a==='capture-conflict'||a==='capture-separate'){captureDecision(d.id,a==='capture-separate');return;}
      if(a==='capture-resolve'){const r=CaptureDemo.choose(d.id,d.choice);if(!r.ok){toast(r.error);return;}closeDialog();captureRender();return;}
      if(a==='capture-skip'){CaptureDemo.choose(d.id,'skip');captureRender();return;}
      if(a==='capture-retry'){const r=CaptureDemo.edit(d.id,{});if(!r.ok)toast(r.error);captureRender();return;}
      if(a==='capture-commit'){captureSaving=true;try{const r=await commitCaptureDurably();captureRender();const saved=r.results?.filter(x=>x.status==='saved').length??0;toast(saved?saved+' '+(saved===1?'entry saved on this device.':'entries saved on this device.'):'Check the review for anything that still needs attention.');}catch(error){captureRender();toast('The updates remain open, but saving failed. Open workspace settings to retry or export them.');}finally{captureSaving=false;}return;}
      if(a==='capture-destination'){const p=captureFind(d.id);if(p){const e=p.entity;if(p.target==='sleep'){sleepView.selected=e.wakeDate;sleepView.end=e.wakeDate;sleepView.range=7;sleepView.page=0;}if(p.target==='people'){peopleView.tab='person';peopleView.personId=e.personId;}if(p.target==='meal'){foodView.tab='meals';foodView.date=e.date;}if(p.target==='work'){workView.tab='week';workView.day=e.start.slice(0,10);workView.week=WorkDemo.monday(workView.day);}if(p.target==='action'){goalView.id=null;goalView.tab='actions';goalView.actionFilter='all';}if(p.target==='progress'){goalView.id=e.goalId;goalView.tab='map';}if(p.target==='money'){moneyView.tab='record';moneyView.month=e.date.slice(0,7);moneyView.account=e.accountId;}}navigate(d.route);return;}
      if(a==='capture-history-open'){const r=CaptureDemo.open(d.id);if(!r.ok){toast(r.error);return;}captureView.tab='capture';captureView.filter='all';captureRender();window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='capture-privacy'||a==='capture-voice'){capturePrivacy(a==='capture-voice');return;}
      if(a==='capture-import'){$('captureFile').click();return;}
      if(a==='capture-paste'){captureView.source='plaud';captureView.fileName='';captureRender();$('captureText').focus();toast('Paste the transcript into your check-in.');return;}
    }
    document.addEventListener('input',event=>{if(event.target.id==='captureText')captureView.draft=event.target.value;if(event.target.id==='captureDate')captureView.date=event.target.value;});
    document.addEventListener('change',async event=>{if(event.target.id==='captureEditGoal')captureProgressHint();if(event.target.dataset.captureSelect){const r=CaptureDemo.toggle(event.target.dataset.captureSelect,event.target.checked);if(!r.ok)toast(r.error);captureRender();}if(event.target.id==='captureFile'){const file=event.target.files?.[0];if(!file)return;if(!/\.txt$/i.test(file.name)||file.size>100000){captureView.error='Choose a plain .txt transcript under 100 KB.';captureRender();return;}try{const content=(await file.text()).replace(/^\uFEFF/,'');if(content.length>12000)throw Error('Use a transcript of up to 12,000 characters for this app.');if(CaptureDemo.current)throw Error('Start a new check-in before importing another transcript.');captureView.draft=content;captureView.source='transcript';captureView.fileName=file.name;captureView.error='';captureRender();}catch(error){captureView.error=error.message||'The transcript could not be read. Paste the text instead.';captureRender();}}});
    document.addEventListener('submit',event=>{if(event.target.id!=='captureEditForm')return;event.preventDefault();const p=captureFind(event.target.dataset.id);if(!p)return;let patch={};const val=id=>$(id)?.value||'',num=id=>val(id)===''?null:Number(val(id));
      if(p.target==='sleep')patch={wakeDate:val('captureEditDate'),durationMinutes:num('captureEditHours')*60+num('captureEditMinutes'),kind:val('captureEditKind')};
      if(p.target==='money')patch={date:val('captureEditDate'),amount:num('captureEditAmount'),accountId:val('captureEditAccount'),category:val('captureEditCategory')};
      if(p.target==='people')patch={date:val('captureEditDate'),personId:val('captureEditPerson'),type:val('captureEditType'),kind:val('captureEditType')==='contact'?val('captureEditKind'):'',title:val('captureEditTitle'),body:val('captureEditNote')};
      if(p.target==='work')patch={start:val('captureEditStart'),end:val('captureEditEnd'),breakMinutes:num('captureEditBreak')};
      if(p.target==='meal')patch={mealId:val('captureEditMeal'),date:val('captureEditDate'),time:val('captureEditTime'),servings:num('captureEditServings'),useStock:val('captureEditStock')==='yes'?true:val('captureEditStock')==='no'?false:undefined,planId:p.entity.mealId===val('captureEditMeal')&&p.entity.date===val('captureEditDate')?p.entity.planId:undefined};
      if(p.target==='action')patch={title:val('captureEditTitle'),date:val('captureEditDate'),goalId:val('captureEditGoal')||null,minutes:num('captureEditDuration')};
      if(p.target==='progress')patch={goalId:val('captureEditGoal'),date:val('captureEditDate'),value:num('captureEditValue')};
      if(!['people','meal','action'].includes(p.target))patch.note=val('captureEditNote');for(const key of ['note','title','body','goalId','minutes']){if((patch[key]===''||patch[key]===null)&&!Object.prototype.hasOwnProperty.call(p.entity,key))delete patch[key];}const r=CaptureDemo.edit(p.id,patch);if(!r.ok){$('captureEditError').textContent=r.error;return;}closeDialog();captureRender();toast('Proposal updated. Review it before adding.');
    });

    const foodView={tab:'meals',date:TODAY,shopDays:3,filter:'all',query:'',priceFood:'food_rice_white_uncooked',priceRange:0,priceId:null};
    const foodMoney=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n);
    const foodGrams=n=>n>=1000?(n/1000).toLocaleString('en-GB',{maximumFractionDigits:2})+' kg':n.toLocaleString('en-GB',{maximumFractionDigits:1})+' g';
    const foodNum=n=>Number(n).toLocaleString('en-GB',{maximumFractionDigits:1});
    const foodOptions=id=>'<option value="">Choose a food</option>'+FoodDemo.foods.map(f=>'<option value="'+f.id+'" '+(f.id===id?'selected':'')+'>'+esc(f.name)+'</option>').join('');
    const foodShop=()=>FoodDemo.shopping(TODAY,addDays(TODAY,foodView.shopDays-1));
    const foodShort=()=>foodShop().filter(n=>n.shortage>0.01);
    function foodFeedback(result,success){if(!result.ok){toast(result.error||'Please check the details.');return false;}if(success)toast(success);return true;}
    function renderFood(){
      const shortage=foodShort().length;
      return '<div class="page-head food-head"><div><div class="kicker">'+icon('food')+'<span class="eyebrow">Food & the everyday</span></div><h1>Fuel your day.</h1><p>A meal plan you can follow. A kitchen you can keep track of.</p></div><div class="row"><button class="button ghost" data-action="food-receipt">'+icon('receipt')+' Receipt</button><button class="button ghost" data-action="food-add">'+icon('plus')+' Plan a meal</button><button class="button primary" data-action="food-log-direct">'+icon('check')+' Log food</button></div></div><button class="text-button purchase-receipts-link" data-action="purchase-history">Your receipts and saved draft</button><div class="food-nav" aria-label="Food sections">'+[['meals','Meals','food'],['pantry','Pantry','pantry'],['shop','Shopping','shop'],['prices','Prices','progress']].map(([id,label,i])=>'<button data-action="food-tab" data-tab="'+id+'" aria-pressed="'+(foodView.tab===id)+'">'+icon(i)+label+(id==='shop'&&shortage?'<span class="count">'+shortage+'</span>':'')+'</button>').join('')+'</div>'+({meals:renderFoodMeals,pantry:renderFoodPantry,shop:renderFoodShop,prices:renderFoodPrices}[foodView.tab]());
    }
    function renderFoodMacros(day){return '<div class="food-macro-strip">'+[['calories','Energy','kcal'],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Fat','g']].map(([k,label,unit])=>{const eaten=day.eaten[k],remaining=day.target[k]-eaten,pending=Math.max(0,day.planned[k]-eaten);return '<div class="food-macro"><span class="eyebrow">'+label+'</span><span class="food-macro-value-label">Eaten</span><strong>'+Math.round(eaten)+'<span style="font:10px var(--sans);letter-spacing:0;color:var(--muted)"> '+unit+'</span></strong><div class="macro-track"><i class="planned" style="width:'+Math.min(100,day.planned[k]/day.target[k]*100)+'%"></i><i style="width:'+Math.min(100,eaten/day.target[k]*100)+'%"></i></div><small><b>'+(remaining>=0?'Remaining':'Above target')+'</b> '+Math.round(Math.abs(remaining))+' '+unit+'</small><small><b>Planned</b> '+Math.round(pending)+' '+unit+' still to eat</small><small>Target '+day.target[k]+' '+unit+'</small></div>';}).join('')+'</div><p class="food-macro-caption">Remaining is your target minus what you have eaten. Planned means meals still to eat. Solid colour is eaten; the outline includes the full plan.</p>';}
    function renderFoodMeals(){
      const day=FoodDemo.day(foodView.date),short=foodShort(),upcoming=day.plans.filter(p=>!day.logs.some(l=>l.planId===p.id)),gap=Math.round(day.target.calories-day.planned.calories);
      const dates=Array.from({length:7},(_,i)=>addDays(TODAY,i));
      return '<div class="food-layout"><section><div class="food-day-control"><h2>'+dateLabel(foodView.date,{weekday:'long',day:'numeric',month:'short'})+'</h2><label><span class="sr">Meal date</span><input id="foodDate" type="date" value="'+foodView.date+'" required></label></div>'+renderFoodMacros(day)+'<div class="food-flow-head"><h3>Your day, meal by meal</h3><button class="text-button" data-action="food-targets">Daily targets '+icon('edit')+'</button></div>'+renderFoodRiver(day)+'<div class="food-legend"><span><i></i>Eaten</span><span><i class="plan"></i>Planned energy</span></div><p class="food-info-note">The river widens as energy accumulates through your meal sequence. Its outlined banks show the full plan; solid colour shows recorded meals.</p><div class="row wrap"><button class="text-button" data-action="food-log-direct">+ Log food eaten</button><button class="text-button" data-action="food-add">+ Plan another meal</button></div><div class="food-week-mini" aria-label="Meal planning dates">'+dates.map(d=>'<button data-action="food-day" data-date="'+d+'" class="'+(FoodDemo.day(d).plans.length?'has-meals':'')+'" aria-pressed="'+(d===foodView.date)+'" aria-label="Meals for '+dateLabel(d,{weekday:'long',day:'numeric',month:'long'})+'"><span>'+dateLabel(d,{weekday:'short'})+'</span><strong>'+Number(d.slice(-2))+'</strong><i></i></button>').join('')+'</div><div class="row between gap-top"><h2 style="font-size:26px">Your meal library</h2><button class="button ghost small" data-action="food-new-recipe">'+icon('plus')+' New meal</button></div><div class="food-library-list">'+FoodDemo.recipes.map(r=>'<div class="food-library-row"><button class="food-recipe-row" data-action="food-recipe" data-id="'+r.id+'"><span>'+esc(r.name)+'<small>'+Math.round(r.nutrition.calories)+' kcal · '+foodNum(r.nutrition.protein)+' g protein per serving</small></span>'+icon('chevron')+'</button><button class="button ghost small" data-action="food-log-direct" data-id="'+r.id+'" aria-label="Log '+esc(r.name)+' eaten">Log food</button></div>').join('')+'</div></section><aside class="food-aside"><section class="food-chain"><span class="eyebrow">The kitchen connection</span><h2>Plan. Make. Replenish.</h2><div class="chain-track"><button class="chain-node" data-action="food-add" aria-label="Plan a meal from the kitchen connection">'+icon('food')+'</button><i></i><button class="chain-node" data-action="food-tab" data-tab="pantry" aria-label="Explore pantry">'+icon('pantry')+'</button><i></i><button class="chain-node" data-action="food-tab" data-tab="shop" aria-label="Explore shopping needs">'+icon('shop')+'</button></div><p>Planned meals reserve ingredients in your shopping calculation. Logging a meal uses the pantry once. A confirmed receipt puts food back on the shelf.</p><div class="food-stats-line"><div><strong>'+day.logs.length+' / '+day.plans.length+'</strong><small>Meals recorded</small></div><div><strong>'+upcoming.length+'</strong><small>Still planned</small></div></div><div class="food-alert"><strong>'+(short.length?short.length+' '+(short.length===1?'ingredient':'ingredients')+' to replenish':'Your next meals are covered')+'</strong><p>'+(short.length?'The next '+foodView.shopDays+' days of meals need more than you currently have.':'Recorded stock covers the ingredients in the next '+foodView.shopDays+' days of your plan.')+'</p><button class="text-button" data-action="food-tab" data-tab="shop">Explore the shopping list '+icon('arrow')+'</button></div><p class="food-info-note">'+(gap>0?gap+' kcal below':gap<0?Math.abs(gap)+' kcal above':'At')+' this day\'s energy goal in the full plan. '+Math.round(day.planned.protein)+' g protein planned. These are comparisons with your own targets.</p></section><section class="food-chain"><span class="eyebrow">Weights that mean something</span><h2>From raw to ready.</h2><p>Some library meals use cooked weights. Editable starter yields are used to translate them into raw pantry quantities.</p><button class="text-button" data-action="food-yields">Review cooking yields '+icon('arrow')+'</button><p class="food-info-note">Nutrition comes from your food library. Count your pantry, review the starter yields, and set your own targets before relying on shopping quantities.</p></section></aside></div>';
    }
    function renderFoodRiver(day){
      const plans=day.plans.slice().sort((a,b)=>{const al=day.logs.find(l=>l.planId===a.id),bl=day.logs.find(l=>l.planId===b.id);return ((al?al.time:a.time)||'24:00').localeCompare((bl?bl.time:b.time)||'24:00');});
      if(!plans.length)return '<div class="food-empty"><h3>Start with what you ate.</h3><p>Log a meal now, or plan one for later.</p><div class="row wrap gap-top"><button class="button primary" data-action="food-log-direct">Log food</button><button class="button ghost" data-action="food-add">Plan a meal</button></div></div>';
      const rowHeight=132,height=plans.length*rowHeight;let total=0,eaten=0;const planWidths=[],eatenWidths=[];
      plans.forEach(p=>{const log=day.logs.find(l=>l.planId===p.id);total+=(log?log.perServing.calories*log.servings:FoodDemo.recipe(p.mealId).nutrition.calories*p.servings);if(log)eaten+=log.perServing.calories*log.servings;planWidths.push(8+Math.min(1.35,total/day.target.calories)*48);eatenWidths.push(eaten?6+Math.min(1.35,eaten/day.target.calories)*48:0);});
      const shape=widths=>{const left=[],right=[];for(let i=0;i<=plans.length*12;i++){const y=i/(plans.length*12)*height,index=Math.min(plans.length-1,Math.floor(y/rowHeight)),prior=index===0?0:widths[index-1],next=widths[index],t=Math.min(1,(y-index*rowHeight)/100),width=prior+(next-prior)*Math.max(0,t),centre=52+Math.sin(y/height*Math.PI*2)*6;left.push((centre-width/2).toFixed(2)+','+y.toFixed(2));right.push((centre+width/2).toFixed(2)+','+y.toFixed(2));}return 'M'+left.join(' L')+' L'+right.reverse().join(' L')+' Z';};
      return '<div class="food-river food-river-logging" style="min-height:'+height+'px"><svg viewBox="0 0 110 '+height+'" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="foodRiverPaint" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#c0b3ff"/><stop offset="1" stop-color="#85d6ff"/></linearGradient></defs><path d="'+shape(planWidths)+'" fill="#85d6ff10" stroke="#85d6ff77" stroke-width="1" stroke-dasharray="4 5"/><path d="'+shape(eatenWidths)+'" fill="url(#foodRiverPaint)" opacity=".58"/></svg>'+plans.map(p=>{const log=day.logs.find(l=>l.planId===p.id),r=FoodDemo.recipe(p.mealId),nutrition=log?log.perServing:r.nutrition,servings=log?log.servings:p.servings,time=log?log.time:p.time;return '<div class="meal-stop '+(log?'eaten':'')+'"><span class="meal-time">'+esc(time||'No time')+'</span><span class="meal-node" aria-hidden="true"></span><div class="meal-copy"><button class="meal-open" data-action="food-meal" data-id="'+p.id+'" aria-label="Open '+(log?'eaten':'planned')+' '+esc(log?log.name:r.name)+'"><strong>'+esc(log?log.name:r.name)+'</strong><small>'+Math.round(nutrition.calories*servings)+' kcal · '+foodNum(nutrition.protein*servings)+' g protein · '+servings+' '+(servings===1?'serving':'servings')+'</small></button><span class="food-meal-status">'+(log?'Eaten'+(!log.stockUsed?' · pantry unchanged':''):'Planned')+'</span><div class="meal-row-actions">'+(log?'<button class="text-button" data-action="food-meal" data-id="'+p.id+'">Edit amount '+icon('edit')+'</button>':'<button class="button primary small" data-action="food-meal" data-id="'+p.id+'" '+(p.date>TODAY?'disabled aria-label="Log eaten is available on this meal date"':'')+'>Log eaten '+icon('check')+'</button><button class="text-button" data-action="food-edit-plan" data-id="'+p.id+'">Edit plan</button>')+'</div></div></div>';}).join('')+'</div>';
    }
    function foodDirectLogDialog(mealId=null){
      const date=foodView.date>TODAY?TODAY:foodView.date;
      showDialog('Log food','<form id="foodDirectLogForm" data-operation="'+uid('food-direct-request')+'"><p class="dialog-sub">Record what you ate, even when it was not in your plan. Your totals update as soon as you save.</p><label>Meal eaten<select id="foodDirectRecipe" required><option value="">Choose a meal</option>'+FoodDemo.recipes.map(r=>'<option value="'+r.id+'" '+(r.id===mealId?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label><button type="button" class="text-button" data-action="food-new-recipe">Missing from your library? Create a meal</button><div class="food-grid"><label>Date eaten<input id="foodDirectDate" type="date" max="'+TODAY+'" value="'+date+'" required></label><label>Time eaten, optional<input id="foodDirectTime" type="time" value=""></label></div><p class="food-info-note">Leave the time blank when you do not remember it.</p><label>Servings eaten<input id="foodDirectServings" type="number" min="0.01" max="100" step="any" inputmode="decimal" value="1" required></label><div id="foodDirectNutrition" class="food-total-pill" aria-live="polite">Choose a meal to preview your portion.</div><div id="foodDirectExisting"></div><label class="food-check"><input id="foodDirectUseStock" type="checkbox" checked><span>Use ingredients from my pantry<small>Turn off for food eaten elsewhere. The chosen ingredients are deducted once.</small></span></label><div id="foodDirectError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary" id="foodDirectCommit">Log eaten</button></div></form>');
      updateFoodDirectPreview();
    }
    function updateFoodDirectPreview(){
      if(!$('foodDirectLogForm'))return;
      const r=FoodDemo.recipe($('foodDirectRecipe').value),servings=Number($('foodDirectServings').value);
      $('foodDirectNutrition').textContent=r&&Number.isFinite(servings)&&servings>0?Math.round(r.nutrition.calories*servings)+' kcal · '+foodNum(r.nutrition.protein*servings)+' g protein · '+foodNum(r.nutrition.carbs*servings)+' g carbs · '+foodNum(r.nutrition.fat*servings)+' g fat':'Choose a meal and a positive portion to preview it.';
      const date=$('foodDirectDate').value,related=r?FoodDemo.plans.filter(p=>p.date===date&&p.mealId===r.id):[];
      $('foodDirectExisting').innerHTML=related.length?'<div class="food-existing-meal"><strong>This meal is already in this day.</strong><p>Open a planned or eaten portion below. Save here only if this is additional food.</p>'+related.map(p=>{const log=FoodDemo.logs.find(l=>l.planId===p.id);return '<button type="button" class="text-button" data-action="food-meal" data-id="'+p.id+'">'+(log?'Edit eaten amount':'Log planned meal')+' · '+esc((log?log.time:p.time)||'no time')+' · '+(log?log.servings:p.servings)+' servings</button>';}).join('')+'</div>':'';
      $('foodDirectCommit').textContent=related.length?'Log additional food':'Log eaten';
    }
    function foodPlanDialog(id=null,mealId=null){const p=id?FoodDemo.plans.find(p=>p.id===id):null;
      showDialog(p?'Adjust this meal':'Plan a meal','<form id="foodPlanForm" data-id="'+(p?p.id:'')+'"><p class="dialog-sub">Planning adds ingredient demand. Your eaten totals and pantry change when you log the meal.</p><label>Meal<select id="foodPlanRecipe">'+FoodDemo.recipes.map(r=>'<option value="'+r.id+'" '+(r.id===(p?p.mealId:mealId)?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label><div class="food-grid"><label>Date<input id="foodPlanDate" type="date" value="'+(p?p.date:foodView.date)+'" required></label><label>Time<input id="foodPlanTime" type="time" value="'+(p?p.time:'19:00')+'" required></label></div><label>Servings<input id="foodPlanServings" type="number" min="0.25" max="30" step="0.25" inputmode="decimal" value="'+(p?p.servings:1)+'" required></label><div id="foodPlanError" class="error" role="alert"></div>'+(p?'<button type="button" class="text-button" data-action="food-remove-plan" data-id="'+p.id+'">Remove from this day</button>':'')+'<div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save plan</button></div></form>');}
    function foodMealDialog(id){const p=FoodDemo.plans.find(p=>p.id===id);if(!p)return;const log=FoodDemo.logs.find(l=>l.planId===id),r=FoodDemo.recipe(p.mealId),servings=log?log.servings:p.servings;
      showDialog((log?'Eaten: ':'Log eaten: ')+(log?log.name:r.name),'<form id="foodLogForm" data-plan="'+p.id+'" data-log="'+(log?log.id:'')+'"><p class="dialog-sub">'+dateLabel(log?log.date:p.date,{weekday:'long',day:'numeric',month:'long'})+' · '+(log?(log.time||'Time not recorded'):'Planned for '+(p.time||'an unspecified time'))+' · '+(log?'Corrections use the nutrition and ingredients frozen when you ate this meal.':'Confirm your portion and the time you ate it.')+'</p>'+(!log?'<label>Time eaten, optional<input id="foodLogTime" type="time" value="'+esc(p.time||'')+'"></label><p class="food-info-note">This starts with the planned time. Change it to when you ate, or clear it if you do not remember.</p>':'')+'<label>'+(log?'Correct servings eaten':'Servings eaten')+'<input id="foodLogServings" type="number" min="0.01" max="100" step="any" value="'+servings+'" required inputmode="decimal"></label><div id="foodMealNutrition" class="food-total-pill"></div><div id="foodMealIngredients"></div>'+(log?'<p class="food-info-note">'+(log.stockUsed?'Only the difference in stock use is adjusted with this correction.':'This meal was logged without updating pantry stock.')+'</p>':'<label class="food-check"><input id="foodUseStock" type="checkbox" checked><span>Use ingredients from my pantry<small>Turn off if this was food eaten elsewhere.</small></span></label>')+'<div id="foodLogError" class="error" role="alert"></div>'+(!log?'<div class="food-inline-actions"><button type="button" class="text-button" data-action="food-edit-plan" data-id="'+p.id+'">Change the plan</button></div>':'')+(!log&&p.date>TODAY?'<p class="food-info-note">This is a future plan. Log it on the date you eat it.</p>':'')+'<div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Close</button><button type="submit" class="button primary" '+(!log&&p.date>TODAY?'disabled':'')+'>'+(log?'Save correction':'Log eaten')+'</button></div></form>');updateFoodMealPreview();}
    function updateFoodMealPreview(){const form=$('foodLogForm');if(!form)return;const p=FoodDemo.plans.find(p=>p.id===form.dataset.plan),log=FoodDemo.logs.find(l=>l.id===form.dataset.log),r=FoodDemo.recipe(p.mealId),servings=Number($('foodLogServings').value)||0,n=log?log.perServing:r.nutrition;
      $('foodMealNutrition').textContent=Math.round(n.calories*servings)+' kcal · '+foodNum(n.protein*servings)+' g protein · '+foodNum(n.carbs*servings)+' g carbs · '+foodNum(n.fat*servings)+' g fat';
      const req=log?(log.stockRequirements||[]).map(x=>({...x,grams:x.grams*servings/log.servings})):FoodDemo.requirements(r,servings);
      $('foodMealIngredients').innerHTML='<h3 class="gap-top">'+(log?'Recorded pantry quantities':'Pantry quantities')+'</h3>'+req.map(x=>{const f=FoodDemo.food(x.foodId);return '<div class="food-ingredient"><span>'+esc(f.name)+'<small>'+(log?'Frozen with this meal':foodGrams(FoodDemo.stock(f.id))+' available now')+'</small></span><strong>'+foodGrams(x.grams)+'</strong></div>';}).join('')+(!log?'<p class="food-info-note">Raw quantities use the saved cooking yields. Liquid ingredients use weighed grams here.</p>':'');}
    function renderFoodPantry(){const demands=foodShop(),foods=FoodDemo.foods.filter(f=>!foodView.query||f.name.toLowerCase().includes(foodView.query.toLowerCase())).filter(f=>foodView.filter!=='needed'||demands.some(n=>n.foodId===f.id&&n.shortage>0.01));const count=FoodDemo.foods.filter(f=>FoodDemo.stock(f.id)>0).length;
      return '<div class="food-layout"><section><div class="food-inventory-intro"><div><span class="eyebrow">Know what you have</span><h2>Your kitchen, in view.</h2><p>Tap an ingredient to count what is left.</p></div><div><div class="food-count">'+count+'</div><small class="muted">foods in stock</small></div></div><div class="food-filter"><label class="sr" for="foodPantrySearch">Find an ingredient</label><input id="foodPantrySearch" value="'+esc(foodView.query)+'" placeholder="Find an ingredient" type="search"><div class="tabset"><button data-action="food-filter" data-filter="all" aria-pressed="'+(foodView.filter==='all')+'">All foods</button><button data-action="food-filter" data-filter="needed" aria-pressed="'+(foodView.filter==='needed')+'">Running short</button></div></div><div id="foodPantryRows">'+foods.map(f=>{const n=demands.find(n=>n.foodId===f.id),stock=FoodDemo.stock(f.id),required=n?n.required:0;return '<button class="pantry-row '+(n&&n.shortage>0.01?'short':'')+'" data-action="food-stock" data-id="'+f.id+'"><span><strong>'+esc(f.name)+'</strong><small>'+(required?foodGrams(required)+' needed in the next '+foodView.shopDays+' days':'No demand in the current shopping window')+'</small></span><span class="pantry-amount">'+foodGrams(stock)+'<span class="stock-track"><i style="width:'+(required?Math.min(100,stock/required*100):stock?100:0)+'%"></i></span></span>'+icon('chevron')+'</button>';}).join('')+(foods.length?'':'<p class="empty">No ingredients match this view.</p>')+'</div></section><aside class="food-aside"><section class="food-chain"><span class="eyebrow">Start with a stocktake</span><h2>One clear starting point.</h2><p>Import quantities from a CSV, or update ingredients individually. A stocktake records the amount present, rather than adding it again.</p><button class="button primary full gap-top" data-action="food-import">'+icon('upload')+' Import pantry quantities</button><p class="food-info-note">Grams and kilograms are supported. Use edible or drained weights where the food label specifies them. No automatic volume conversion is applied.</p><button class="text-button" data-action="food-yields">Review raw and cooked mappings '+icon('arrow')+'</button></section><section class="food-chain"><span class="eyebrow">After a food shop</span><h2>Keep the record moving.</h2><p>A purchase adds quantities and stores its price. Logging a meal subtracts its ingredients once.</p><button class="button ghost full gap-top" data-action="food-receipt">'+icon('receipt')+' Review a receipt</button><div class="food-notification">'+icon('clock')+'<span>The shopping indicator updates inside this app. Background phone reminders come with the later app integration.</span></div></section></aside></div>';
    }
    document.addEventListener('change',event=>{if(event.target.id==='foodStockDate'&&$('foodStockForm'))$('foodStockGrams').value='';});
    function foodStockDialog(id){const f=FoodDemo.food(id);showDialog('Count '+f.name,'<form id="foodStockForm" data-id="'+id+'"><p class="dialog-sub">Enter the amount physically present on the count date. This saves an absolute observation, not a purchase. Earlier purchases remain in history without adding stock already counted.</p><label>Count date<input id="foodStockDate" type="date" max="'+TODAY+'" value="'+TODAY+'" required></label><p class="food-info-note">Entries on the same date use their recording order.</p><label>Quantity you have, in grams<input id="foodStockGrams" type="number" min="0" max="1000000" step="any" inputmode="decimal" value="'+foodNum(FoodDemo.stock(id)).replace(/,/g,'')+'" required></label><label class="gap-sm">Note, optional<input id="foodStockNote" maxlength="200" placeholder="Stocktake, used elsewhere, or discarded"></label><div id="foodStockError" class="error" role="alert"></div><p class="food-info-note">'+esc(f.name)+': '+f.kcal+' kcal and '+f.protein+' g protein per 100 g.</p><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save count</button></div></form>');}
    function renderFoodShop(){const rows=foodShort(),all=foodShop(),priced=rows.filter(r=>r.estimatedCost!==null),estimate=priced.reduce((n,r)=>n+r.estimatedCost,0),first=rows.map(r=>r.neededBy).filter(Boolean).sort()[0];
      return '<div class="food-layout"><section><div class="food-shopping-hero"><span class="eyebrow">From the meal plan</span><h2>'+(rows.length?'A shop that has a purpose.':'The kitchen has you covered.')+'</h2><p>'+(rows.length?rows.length+' '+(rows.length===1?'ingredient is':'ingredients are')+' short for meals through '+dateLabel(addDays(TODAY,foodView.shopDays-1))+'.'+(first?' First needed '+dateLabel(first)+'.':''):'Recorded stock covers your planned ingredients through '+dateLabel(addDays(TODAY,foodView.shopDays-1))+'.')+'</p><div class="row between"><div class="period-switch" aria-label="Shopping planning window">'+[3,7].map(n=>'<button data-action="food-shop-days" data-days="'+n+'" aria-pressed="'+(foodView.shopDays===n)+'">'+n+' days</button>').join('')+'</div><span class="pill">'+dateLabel(TODAY,{day:'numeric',month:'short'})+' onward</span></div></div><div class="food-shopping-table">'+rows.map(r=>'<div class="food-shop-row"><div><strong>'+esc(FoodDemo.food(r.foodId).name)+'</strong><small>Need '+foodGrams(r.required)+' · have '+foodGrams(r.available)+'<br>First shortage '+dateLabel(r.neededBy)+'</small><div class="food-plan-balance"><span class="have" style="width:'+Math.min(100,r.available/r.required*100)+'%"></span><span class="need" style="flex:1"></span></div></div><div class="buy-amount">'+foodGrams(r.shortage)+'<small>'+(r.estimatedCost===null?'Price unknown':foodMoney(r.estimatedCost)+' estimate')+'</small></div></div>').join('')+(rows.length?'':'<div class="food-empty"><h3>Nothing missing from this plan.</h3><p>New meals or a changed stock count will update the list.</p></div>')+'</div><p class="food-info-note">Quantities are minimum ingredient shortages, before rounding to pack sizes. '+all.length+' distinct ingredients checked. Unlogged past meals are excluded from this shopping window.</p></section><aside class="food-aside"><section class="food-chain"><span class="eyebrow">A realistic estimate</span><h2>'+foodMoney(estimate)+'</h2><p>Based on the most recent price recorded for '+priced.length+' of '+rows.length+' missing ingredients.</p><div class="food-alert"><strong>'+(rows.length-priced.length)+' prices still unknown</strong><p>Unknown prices are excluded from the estimate. This is a partial estimate, not a checkout total.</p></div><button class="button primary full" data-action="food-receipt">'+icon('receipt')+' Record your purchase</button><button class="text-button" data-action="food-tab" data-tab="prices">Explore price history '+icon('arrow')+'</button></section><section class="food-chain"><span class="eyebrow">A list that follows your plans</span><h2>Always connected.</h2><p>Changing a meal, logging what you ate, counting stock or confirming a receipt recalculates this list.</p><div class="food-notification">'+icon('clock')+'<span>Shopping prompts are shown in the app. Background phone notifications are not connected.</span></div></section></aside></div>';
    }
    function openFoodReceipt(){PurchaseUI.open();}
    function renderFoodPrices(){return PurchaseUI.renderPrices()+'<details class="purchase-legacy-prices"><summary>Ingredient history across products, including older receipts</summary><p class="purchase-help">These observations are grouped by pantry ingredient. Brands and packages may differ; they are not a single-product price index.</p>'+renderFoodIngredientPrices()+'</details>';}
    function renderFoodIngredientPrices(){const f=FoodDemo.food(foodView.priceFood)||FoodDemo.foods[0];if(!f)return '<div class="food-empty"><h3>No foods in your library.</h3><p>Add your food library before recording purchases or comparing prices.</p></div>';foodView.priceFood=f.id;const all=FoodDemo.prices(f.id).slice().sort((a,b)=>a.date.localeCompare(b.date)),rows=all.filter(p=>p.date<=TODAY&&(!foodView.priceRange||p.date>=addDays(TODAY,-foodView.priceRange+1))),latest=rows[rows.length-1],first=rows[0];const selected=rows.find(r=>r.id===foodView.priceId)||latest;
      return '<div class="food-layout"><section><div class="progress-controls"><label>Track a food<select id="foodPriceFood">'+foodOptions(foodView.priceFood)+'</select></label><div class="period-switch" aria-label="Price history range">'+[[90,'3 months'],[365,'Year'],[0,'All']].map(([n,label])=>'<button data-action="food-price-range" data-range="'+n+'" aria-pressed="'+(foodView.priceRange===n)+'">'+label+'</button>').join('')+'</div></div><span class="eyebrow">Latest recorded unit price in this range</span><div class="food-price-big">'+(latest?foodMoney(latest.perKg):'No prices')+'<small>'+(latest?' / kg':'')+'</small></div><p class="food-info-note">'+esc(f.name)+' · '+rows.length+' price observations. Each observation comes from a recorded purchase.</p>'+renderFoodPriceChart(rows)+(selected?'<div class="food-price-detail" aria-live="polite"><div><strong>'+dateLabel(selected.date,{day:'numeric',month:'long',year:'numeric'})+' · '+esc(selected.store)+'</strong><p>'+foodGrams(selected.grams)+' bought for '+foodMoney(selected.totalPrice)+'<br>'+foodMoney(selected.perKg)+' per kilogram</p></div>'+icon('receipt')+'</div>':'')+'<div class="row between gap-top"><h2 style="font-size:26px">The purchases behind it</h2></div>'+rows.slice().reverse().map(p=>'<button class="food-price-observation" data-action="food-price-point" data-id="'+p.id+'"><span>'+dateLabel(p.date,{day:'numeric',month:'short',year:'numeric'})+' · '+esc(p.store)+'<small>'+foodGrams(p.grams)+' · '+foodMoney(p.totalPrice)+' paid</small></span><strong>'+foodMoney(p.perKg)+' / kg</strong></button>').join('')+'</section><aside class="food-aside"><section class="food-chain"><span class="eyebrow">See the change</span><h2>'+(first&&latest&&first.perKg>0?(latest.perKg-first.perKg>=0?'+':'')+((latest.perKg/first.perKg-1)*100).toFixed(1)+'%':'A history starts with a purchase.')+'</h2><p>'+(first&&latest?'Change from the first to the latest observation in this date range. These are past prices, not live offers.':'Record a food purchase to start tracking its price.')+'</p><div class="food-stats-line"><div><strong>'+(rows.length?foodMoney(Math.min(...rows.map(r=>r.perKg))):'Unknown')+'</strong><small>Lowest recorded / kg</small></div></div><button class="button ghost full gap-top" data-action="food-receipt">'+icon('receipt')+' Add a purchase</button></section><section class="food-chain"><span class="eyebrow">Compare like with like</span><h2>Pack sizes can change.</h2><p>Prices are normalised by weight. A smaller pack can have a lower sticker price and still cost more per kilogram.</p><p class="food-info-note">Match the same food and preparation state when reviewing a receipt. Every purchase keeps its original quantity, paid amount, shop and date.</p></section></aside></div>';
    }
    function renderFoodPriceChart(rows){if(!rows.length)return '<div class="food-empty"><h3>No prices in this range.</h3><p>Try All, another food, or add a purchase.</p></div>';const W=540,H=210,L=54,R=20,T=22,B=35,minDate=dateObj(rows[0].date).getTime(),maxDate=dateObj(rows[rows.length-1].date).getTime(),maxPrice=Math.max(1,...rows.map(r=>r.perKg))*1.18;const x=r=>L+(maxDate===minDate ? 0.5 :(dateObj(r.date).getTime()-minDate)/(maxDate-minDate))*(W-L-R),y=r=>H-B-r.perKg/maxPrice*(H-T-B);const points=rows.map(r=>x(r).toFixed(2)+','+y(r).toFixed(2));
      return '<div class="food-price-chart"><svg viewBox="0 0 '+W+' '+H+'" aria-label="Recorded price per kilogram over calendar time"><defs><linearGradient id="foodPriceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0b3ff" stop-opacity=".27"/><stop offset="1" stop-color="#c0b3ff" stop-opacity="0"/></linearGradient></defs>'+[0,.5,1].map(n=>{const yy=H-B-n*(H-T-B);return '<path d="M'+L+' '+yy+'H'+(W-R)+'" stroke="#303d58"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+foodMoney(maxPrice*n)+'</text>';}).join('')+'<path d="M'+L+' '+(H-B)+' L'+points.join(' L')+' L'+x(rows[rows.length-1])+' '+(H-B)+'Z" fill="url(#foodPriceFill)"/><path d="M'+points.join(' L')+'" fill="none" stroke="#c0b3ff" stroke-width="2.5"/>'+rows.map(r=>'<g class="food-price-point" role="button" tabindex="0" data-action="food-price-point" data-id="'+r.id+'" aria-label="Price on '+dateLabel(r.date,{day:'numeric',month:'long',year:'numeric'})+': '+foodMoney(r.perKg)+' per kilogram"><circle cx="'+x(r)+'" cy="'+y(r)+'" r="16" fill="transparent"/><circle cx="'+x(r)+'" cy="'+y(r)+'" r="'+(r.id===foodView.priceId?6:4)+'" fill="'+(r.id===foodView.priceId?'#f1bc7b':'#85d6ff')+'" stroke="#10192b" stroke-width="2"/></g>').join('')+'<text x="'+L+'" y="'+(H-8)+'">'+dateLabel(rows[0].date,{month:'short',year:'numeric'})+'</text><text x="'+(W-R)+'" y="'+(H-8)+'" text-anchor="end">'+dateLabel(rows[rows.length-1].date,{month:'short',year:'numeric'})+'</text></svg></div>';
    }
    function foodTargetsDialog(){const t=FoodDemo.targets;showDialog('Set your daily food targets','<form id="foodTargetsForm"><p class="dialog-sub">These editable starter targets are planning defaults. Adjust them to your own goals. A day with logged meals retains its saved target.</p><div class="food-grid">'+[['calories','Energy, kcal'],['protein','Protein, g'],['carbs','Carbs, g'],['fat','Fat, g']].map(([k,label])=>'<label>'+label+'<input data-target="'+k+'" type="number" min="1" max="'+(k==='calories'?15000:2000)+'" step="1" value="'+t[k]+'" required></label>').join('')+'</div><div id="foodTargetError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save targets</button></div></form>');}
    const foodRawPairs={food_rice_white_cooked:'food_rice_white_uncooked',food_chicken_breast_cooked:'food_chicken_breast_uncooked',food_pasta_fusilli_cooked:'food_pasta_fusilli_uncooked'};
    function foodYieldsDialog(){showDialog('Raw to cooked, explicitly','<form id="foodYieldsForm"><p class="dialog-sub">These are example yields for the prototype. Replace them with your own measured preparation yields, or choose prepared stock.</p>'+Object.keys(foodRawPairs).map(id=>{const rule=FoodDemo.yields[id];return '<section class="food-yield-row" data-yield="'+id+'"><h3>'+esc(FoodDemo.food(id).name)+'</h3><div class="food-grid"><label>Take from pantry<select data-yield-source>'+[foodRawPairs[id],id].map(x=>'<option value="'+x+'" '+(x===rule.sourceId?'selected':'')+'>'+esc(FoodDemo.food(x).name)+'</option>').join('')+'</select></label><label>Yield ratio<input data-yield-ratio type="number" min="0.05" max="10" step="0.001" value="'+rule.ratio+'" required></label></div><p>Grams prepared per 1 g from the pantry. Use 1 for prepared stock.</p></section>';}).join('')+'<div id="foodYieldError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">Save mappings</button></div></form>');}
    let foodRecipeDraft=null;
    function foodRecipeDialog(id=null){if(!FoodDemo.foods.length){toast('Add your food library before creating a recipe.');return;}const r=id?FoodDemo.recipe(id):null;foodRecipeDraft=r?clone(r):{name:'',components:[{foodId:FoodDemo.foods[0].id,grams:100}]};renderFoodRecipeDialog();}
    function syncFoodRecipe(){if(!$('foodRecipeForm'))return;foodRecipeDraft.name=$('foodRecipeName').value;foodRecipeDraft.components=Array.from(document.querySelectorAll('.food-recipe-builder')).map(row=>({foodId:row.querySelector('select').value,grams:Number(row.querySelector('input').value)}));}
    function renderFoodRecipeDialog(){const r=foodRecipeDraft;showDialog(r.id?'Edit meal recipe':'Create a meal','<form id="foodRecipeForm"><p class="dialog-sub">Ingredients below are per single serving. Editing this recipe changes future plans; meals already logged keep their recorded nutrition.</p><label>Meal name<input id="foodRecipeName" maxlength="100" value="'+esc(r.name)+'" required></label><div class="gap-top">'+r.components.map((c,i)=>'<div class="food-recipe-builder"><label><span class="sr">Ingredient '+(i+1)+'</span><select required>'+foodOptions(c.foodId)+'</select></label><label>Grams<input type="number" min="0.1" max="10000" step="any" value="'+c.grams+'" required inputmode="decimal"></label><button type="button" class="icon-button" data-action="food-recipe-remove" data-index="'+i+'" aria-label="Remove ingredient '+(i+1)+'" '+(r.components.length===1?'disabled':'')+'>'+icon('trash')+'</button></div>').join('')+'</div><button type="button" class="text-button" data-action="food-recipe-add">+ Add ingredient</button><div id="foodRecipeError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save meal</button></div></form>');}
    function foodRecipeInfo(id){const r=FoodDemo.recipe(id);showDialog(r.name,'<p class="dialog-sub">Per single serving · '+Math.round(r.nutrition.calories)+' kcal · '+foodNum(r.nutrition.protein)+' g protein</p>'+r.components.map(c=>'<div class="food-ingredient"><span>'+esc(FoodDemo.food(c.foodId).name)+'</span><strong>'+foodGrams(c.grams)+'</strong></div>').join('')+'<p class="food-info-note">Ingredient states matter: cooked weights are not raw weights. Pantry demand uses your preparation mappings.</p><button class="text-button" data-action="food-edit-recipe" data-id="'+r.id+'">Edit this recipe '+icon('edit')+'</button><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button><button class="button ghost" data-action="food-plan-recipe" data-id="'+r.id+'">Plan this meal</button><button class="button primary" data-action="food-log-direct" data-id="'+r.id+'">Log food</button></div>');}
    // CSV parsing is independent of FileReader and the dialog renderer.
    function foodParseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=ch;}if(quoted)return {error:'A quoted CSV value is not closed.'};row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2)return {error:'Add a header and at least one ingredient.'};if(rows.length>201)return {error:'Import up to 200 food rows at a time.'};const headers=rows.shift().map(h=>h.trim().replace(/^\uFEFF/,'').toLowerCase()),foodIndex=headers.indexOf('food'),quantityIndex=headers.indexOf('quantity'),unitIndex=headers.indexOf('unit');if([foodIndex,quantityIndex,unitIndex].some(i=>i<0))return {error:'Use the columns food, quantity, unit. Food can be its exact name or library ID.'};return {rows:rows.map(r=>{const name=(r[foodIndex]||'').trim(),f=FoodDemo.foods.find(f=>f.id.toLowerCase()===name.toLowerCase()||f.name.toLowerCase()===name.toLowerCase()),q=(r[quantityIndex]||'').trim(),unit=(r[unitIndex]||'').trim().toLowerCase(),valid=q!==''&&Number.isFinite(Number(q))&&Number(q)>=0&&['g','kg'].includes(unit);return {foodId:f?f.id:'',original:name,grams:valid?Number(q)*(unit==='kg'?1000:1):'',needsReview:!f||!valid};})};}
    let foodImportRows=[];
    function foodImportDialog(){foodImportRows=[];showDialog('Start with your pantry','<form id="foodImportForm"><p class="dialog-sub">Import current quantities, then review them. These counts replace the quantity of each listed food; other foods stay as they are.</p><div class="food-import-box"><label>Choose a CSV file<input id="foodImportFile" type="file" accept=".csv,text/csv,text/plain"></label><label class="gap-sm">Or paste CSV<textarea id="foodImportText" placeholder="food,quantity,unit&#10;food_rice_white_uncooked,1,kg&#10;food_yoghurt_natural,500,g"></textarea></label><div class="row wrap"><button type="button" class="button ghost small" data-action="food-parse-import">Review quantities</button></div></div><div id="foodImportError" class="error" role="alert"></div><div id="foodImportRows"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary" id="foodImportCommit" disabled>Confirm stocktake</button></div></form>');}
    function reviewFoodImport(){const result=foodParseCsv($('foodImportText').value);$('foodImportError').textContent=result.error||'';foodImportRows=result.rows||[];$('foodImportRows').innerHTML=foodImportRows.map((r,i)=>'<div class="food-import-row"><p class="food-shorthand">Row '+(i+1)+': '+esc(r.original)+(r.needsReview?' · check food and quantity':'')+'</p><div class="food-grid"><label>Food<select data-import-food required>'+foodOptions(r.foodId)+'</select></label><label>Grams<input data-import-grams type="number" min="0" max="1000000" step="any" inputmode="decimal" value="'+esc(r.grams)+'" required></label></div></div>').join('');$('foodImportCommit').disabled=!foodImportRows.length;}
    function handleFoodAction(a,d){
      if(a==='food-tab'){foodView.tab=d.tab;render();window.scrollTo({top:0,behavior:'instant'});return;}
      if(a==='food-day'){foodView.date=d.date;render();return;}
      if(a==='food-add'){foodPlanDialog();return;}
      if(a==='food-log-direct'){foodDirectLogDialog(d.id||null);return;}
      if(a==='food-edit-plan'){foodPlanDialog(d.id);return;}
      if(a==='food-remove-plan'){if(foodFeedback(FoodDemo.removePlan(d.id),'Meal removed from the plan.')){closeDialog();render();}return;}
      if(a==='food-meal'){foodMealDialog(d.id);return;}
      if(a==='food-filter'){foodView.filter=d.filter;render();return;}
      if(a==='food-stock'){foodStockDialog(d.id);return;}
      if(a==='food-shop-days'){foodView.shopDays=Number(d.days);render();return;}
      if(a==='food-receipt'){openFoodReceipt();return;}
      if(a==='food-price-range'){foodView.priceRange=Number(d.range);foodView.priceId=null;render();return;}
      if(a==='food-price-point'){foodView.priceId=d.id;const y=window.scrollY;render();window.scrollTo({top:y,behavior:'instant'});return;}
      if(a==='food-targets'){foodTargetsDialog();return;}
      if(a==='food-yields'){foodYieldsDialog();return;}
      if(a==='food-new-recipe'){foodRecipeDialog();return;}
      if(a==='food-edit-recipe'){foodRecipeDialog(d.id);return;}
      if(a==='food-recipe'){foodRecipeInfo(d.id);return;}
      if(a==='food-plan-recipe'){foodPlanDialog(null,d.id);return;}
      if(a==='food-recipe-add'){syncFoodRecipe();foodRecipeDraft.components.push({foodId:FoodDemo.foods[0].id,grams:100});renderFoodRecipeDialog();return;}
      if(a==='food-recipe-remove'){syncFoodRecipe();foodRecipeDraft.components.splice(Number(d.index),1);renderFoodRecipeDialog();return;}
      if(a==='food-import'){foodImportDialog();return;}
      if(a==='food-parse-import'){reviewFoodImport();return;}
    }
    document.addEventListener('keydown',event=>{const p=event.target.closest('.food-price-point');if(p&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleFoodAction('food-price-point',p.dataset);}});
    document.addEventListener('input',event=>{
      if(event.target.id==='foodLogServings')updateFoodMealPreview();
      if(['foodDirectRecipe','foodDirectServings','foodDirectDate'].includes(event.target.id))updateFoodDirectPreview();
      if(event.target.id==='foodPantrySearch'){foodView.query=event.target.value;const position=event.target.selectionStart;render();$('foodPantrySearch').focus();$('foodPantrySearch').setSelectionRange(position,position);}
    });
    document.addEventListener('change',event=>{
      if(event.target.id==='foodDate'&&sleepDateValid(event.target.value)){foodView.date=event.target.value;render();}
      if(event.target.id==='foodPriceFood'&&FoodDemo.food(event.target.value)){foodView.priceFood=event.target.value;foodView.priceId=null;render();}
      if(event.target.id==='foodImportFile'){const file=event.target.files[0];if(!file)return;if(file.size>1024*1024){$('foodImportError').textContent='Choose a CSV under 1 MB.';return;}const reader=new FileReader();reader.onload=()=>{if(!$('foodImportText'))return;$('foodImportText').value=reader.result;reviewFoodImport();};reader.onerror=()=>{if($('foodImportError'))$('foodImportError').textContent='The file could not be read. Paste CSV text instead.';};reader.readAsText(file);}
    });
    document.addEventListener('submit',event=>{
      const id=event.target.id;if(!id.startsWith('food'))return;event.preventDefault();let result;
      if(id==='foodPlanForm'){const value={date:$('foodPlanDate').value,time:$('foodPlanTime').value,mealId:$('foodPlanRecipe').value,servings:Number($('foodPlanServings').value)};result=event.target.dataset.id?FoodDemo.updatePlan(event.target.dataset.id,value):FoodDemo.addPlan(value);if(!result.ok){$('foodPlanError').textContent=result.error;return;}foodView.date=value.date;foodView.tab='meals';}
      else if(id==='foodDirectLogForm'){result=FoodDemo.logFood({date:$('foodDirectDate').value,time:$('foodDirectTime').value,mealId:$('foodDirectRecipe').value,servings:Number($('foodDirectServings').value),useStock:$('foodDirectUseStock').checked,operationId:event.target.dataset.operation});if(!result.ok){$('foodDirectError').textContent=result.error;return;}foodView.date=result.log.date;foodView.tab='meals';}
      else if(id==='foodLogForm'){result=event.target.dataset.log?FoodDemo.correctLog(event.target.dataset.log,Number($('foodLogServings').value)):FoodDemo.logMeal(event.target.dataset.plan,{servings:Number($('foodLogServings').value),useStock:$('foodUseStock').checked,time:$('foodLogTime').value});if(!result.ok){$('foodLogError').textContent=result.error;return;}}
      else if(id==='foodStockForm'){result=FoodDemo.setStock(event.target.dataset.id,Number($('foodStockGrams').value),$('foodStockNote').value,$('foodStockDate').value);if(!result.ok){$('foodStockError').textContent=result.error;return;}}
      else if(id==='foodTargetsForm'){const t={};document.querySelectorAll('[data-target]').forEach(el=>t[el.dataset.target]=Number(el.value));result=FoodDemo.setTargets(t);if(!result.ok){$('foodTargetError').textContent=result.error;return;}}
      else if(id==='foodYieldsForm'){const rows=Array.from(document.querySelectorAll('[data-yield]')).map(row=>({id:row.dataset.yield,source:row.querySelector('[data-yield-source]').value,ratio:Number(row.querySelector('[data-yield-ratio]').value)}));if(rows.some(r=>!Number.isFinite(r.ratio)||r.ratio<.05||r.ratio>10||(r.id===r.source&&r.ratio!==1))){$('foodYieldError').textContent='Use a ratio from 0.05 to 10, or exactly 1 for prepared stock.';return;}rows.forEach(r=>FoodDemo.setYield(r.id,r.source,r.ratio));result={ok:true};}
      else if(id==='foodRecipeForm'){syncFoodRecipe();result=FoodDemo.saveRecipe(foodRecipeDraft);if(!result.ok){$('foodRecipeError').textContent=result.error;return;}}
      else if(id==='foodImportForm'){const rows=Array.from(document.querySelectorAll('.food-import-row')).map(row=>({foodId:row.querySelector('[data-import-food]').value,grams:Number(row.querySelector('[data-import-grams]').value)}));result=FoodDemo.importStock(rows);if(!result.ok){$('foodImportError').textContent=result.error;return;}foodView.tab='pantry';foodView.query='';foodView.filter='all';}
      else return;
      closeDialog();navigate('food');toast(id==='foodReceiptForm'?'Purchase confirmed. Stock and price history updated.':id==='foodImportForm'?'Stocktake saved. Shopping quantities recalculated.':['foodLogForm','foodDirectLogForm'].includes(id)?'Meal record saved. Totals and shopping needs recalculated.':'Saved in this app.');
    });

    document.addEventListener('click',event=>{
      const plannerButton=event.target.closest('[data-planner-action]');if(plannerButton){if(!plannerButton.disabled)PlannerUI.handleClick(plannerButton);return;}
      const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action;const d=button.dataset;
      if(a==='navigate'){navigate(d.route);return;}
      if(a==='planner-open'){PlannerUI.openDate(d.date);navigate('planner');return;}
      if(a.startsWith('sleep-')){handleSleepAction(a,d);return;}
      if(a.startsWith('workspace-')){workspaceAction(a,d).catch(error=>showToast(error.message));return;}
      if(a.startsWith('life-')){handleLifeAction(a,d);return;}
      if(a.startsWith('today-')){handleTodayAction(a,d);return;}
      if(a.startsWith('food-')){handleFoodAction(a,d);return;}
      if(a.startsWith('work-')){handleWorkAction(a,d);return;}
      if(a.startsWith('capture-')){captureAction(a,d).catch(error=>showToast(error.message));return;}
      if(a.startsWith('people-')){handlePeopleAction(a,d);return;}
      if(a.startsWith('money-')){handleMoneyAction(a,d);return;}
      if(a.startsWith('goal-')){handleGoalAction(a,d);return;}
      if(a==='open-sections'){workSections();return;}
      if(a==='section-jump'){closeDialog();navigate(d.route);return;}
      if(a==='start'){if(!d.routine&&!state.active){navigate('train');return;}startWorkout(d.routine);return;}
      if(a==='resume'){navigate('train');return;}
      if(a==='routine'){state.routineId=d.id;state.showFinished=false;render();return;}
      if(a==='select-exercise'){state.currentExercise=Number(d.index);state.editSetId=null;render();return;}
      if(a==='edit-set'){state.editSetId=d.id;render();$('setWeight').focus();return;}
      if(a==='cancel-set-edit'){state.editSetId=null;render();return;}
      if(a==='remove-set'){const p=state.active.exercises[state.currentExercise];p.sets=p.sets.filter(s=>s.id!==d.id);state.editSetId=null;render();toast('Set removed from this app session.');return;}
      if(a==='next-exercise'){if(state.currentExercise<state.active.exercises.length-1){state.currentExercise++;state.editSetId=null;render();window.scrollTo({top:0,behavior:'instant'});}else finishPrompt();return;}
      if(a==='finish'){finishPrompt();return;}
      if(a==='confirm-finish'){completeSession();return;}
      if(a==='discard-session'){state.active=null;state.timer=null;state.showFinished=false;closeDialog();render();return;}
      if(a==='last-summary'){state.showFinished=true;navigate('train');return;}
      if(a==='new-session'){state.showFinished=false;render();return;}
      if(a==='timer-toggle'){
        const remaining=timerRemaining();if(state.timer&&!state.timer.paused&&remaining>0){state.timer.remaining=remaining;state.timer.paused=true;}
        else if(state.timer&&state.timer.paused&&remaining>0){state.timer.endAt=Date.now()+remaining*1000;state.timer.paused=false;}
        else{const seconds=state.active.exercises[state.currentExercise].restSeconds;state.timer={total:seconds,endAt:Date.now()+seconds*1000,remaining:seconds,paused:false};}updateTimer();return;
      }
      if(a==='timer-add'){if(!state.timer){const seconds=state.active.exercises[state.currentExercise].restSeconds+30;state.timer={total:seconds,endAt:Date.now()+seconds*1000,remaining:seconds,paused:false};}else{const remaining=timerRemaining()+30;state.timer.total=Math.max(state.timer.total,remaining);state.timer.remaining=remaining;state.timer.endAt=Date.now()+remaining*1000;}updateTimer();return;}
      if(a==='timer-skip'){state.timer={total:1,endAt:Date.now(),remaining:0,paused:false};updateTimer();return;}
      if(a==='edit-routine'){editRoutine(d.id);return;}
      if(a==='new-routine'){editRoutine(null);return;}
      if(a.startsWith('builder-')){
        syncBuilder();const i=Number(d.index);
        if(a==='builder-add'){const p=item(EXERCISES[0].id,3,8,12,90);p.slotId=uid('slot');draft.items.push(p);}
        if(a==='builder-remove')draft.items.splice(i,1);
        if(a==='builder-up'&&i>0)[draft.items[i-1],draft.items[i]]=[draft.items[i],draft.items[i-1]];
        if(a==='builder-down'&&i<draft.items.length-1)[draft.items[i+1],draft.items[i]]=[draft.items[i],draft.items[i+1]];
        renderBuilderRows();return;
      }
      if(a==='save-routine'){saveRoutine();return;}
      if(a==='duplicate-routine'){saveRoutine(true);return;}
      if(a==='schedule'){scheduleDialog(d.date);return;}
      if(a==='save-schedule'){const value=$('scheduleRoutine').value;if(value)schedule[d.date]=value;else delete schedule[d.date];closeDialog();render();toast('Your weekly plan has updated.');return;}
      if(a==='chart-range'){state.chartRange=Number(d.range);render();return;}
      if(a==='chart-metric'){state.chartMetric=d.metric;render();return;}
      if(a==='chart-point'){state.chartSessionId=d.id;renderChart();return;}
      if(a==='history'){historyDialog(d.id);return;}
      if(a==='exercise-progress'){state.chartExercise=d.id;state.chartRange=84;closeDialog();navigate('progress');return;}
      if(a==='exercise-info'){exerciseInfo(d.id);return;}
      if(a==='calendar-day'){const s=history.find(s=>s.date===d.date);if(s)historyDialog(s.id);else showDialog(dateLabel(d.date,{weekday:'long',day:'numeric',month:'long'}),'<p class="dialog-sub">No workout is recorded on this date in your history. An empty day does not imply a missed workout.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');return;}
      if(a==='add-event'){todayAddDialog();return;}
      if(a==='close-dialog'){closeDialog();return;}
    });
    document.addEventListener('submit',event=>{if(event.target.id==='setForm')submitSet(event);});
    document.addEventListener('change',event=>{
      if(event.target.id==='todayDatePicker'){if(event.target.validity.valid&&todayAdapterDate(event.target.value)){state.date=event.target.value;render();}return;}
      if(event.target.id==='chartExercise'){state.chartExercise=event.target.value;render();}
      if(event.target.matches('[data-field="exerciseId"]')){syncBuilder();renderBuilderRows();}
    });
    $('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});

    // Life Planner: plain in-memory data, visual exploration, and reviewed links to goals.
// Live ambitions with append-only snapshots.
const LifePlannerDemo = (() => {
  const rows=[], revisions=[], noteRows=[], linkRows=[], linkRevisions=[], goalLinkRows=[], actionLinkRows=[];
  const copy=value=>JSON.parse(JSON.stringify(value));
  const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const fail=(error,extra={})=>({ok:false,error,...copy(extra)});
  const good=fields=>({ok:true,...copy(fields||{})});
  const areas={experience:'Experiences',venture:'Ventures',place:'Places',lifestyle:'Everyday life',other:'Other possibilities'};
  const horizons={soon:'Soon',next:'Next chapter',someday:'Someday'};
  const statuses={dream:'A dream',exploring:'Exploring',planning:'Making a plan',active:'Living the plan',lived:'Lived',parked:'Parked for now'};
  const relations={supports:'Supports',depends:'Depends on',related:'Related to'};
  const workshopFields=['why','vision','questions','researchNotes','options','constraints','firstExperiment'];
  const positions=[{x:.21,y:.24},{x:.77,y:.25},{x:.75,y:.76},{x:.24,y:.75},{x:.5,y:.12},{x:.89,y:.5},{x:.5,y:.87},{x:.11,y:.5}];
  const text=(value,max,required=false)=>{if(value!==null&&value!==undefined&&typeof value!=='string')return null;const result=String(value??'').trim();return (required&&!result)||result.length>max?null:result;};
  const dateOK=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='1970-01-01'&&value<='2199-12-31'&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const positionOK=value=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.x==='number'&&Number.isFinite(value.x)&&value.x>=0&&value.x<=1&&typeof value.y==='number'&&Number.isFinite(value.y)&&value.y>=0&&value.y<=1;
  const ambitionRow=id=>rows.find(row=>row.id===id);
  const goals=()=>typeof GoalsDemo!=='undefined'?GoalsDemo.goals:[];
  const actions=()=>typeof GoalsDemo!=='undefined'?GoalsDemo.actions:[];
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function commit(row,change){
    const existing=ambitionRow(row.id);
    const candidate={...row,version:existing?existing.version+1:1,createdOn:existing?existing.createdOn:TODAY,updatedOn:TODAY};
    if(existing)rows[rows.indexOf(existing)]=candidate;else rows.push(candidate);
    revisions.push({id:uid('planner-revision'),ambitionId:candidate.id,version:candidate.version,recordedOn:TODAY,change,snapshot:copy(candidate)});
    return good({id:candidate.id,ambition:candidate});
  }
  function checked(input,existing,seedId){
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('Enter the ambition details.');
    const value=key=>has(input,key)?input[key]:existing?existing[key]:undefined;
    const title=text(value('title'),120,true),area=has(input,'area')?input.area:existing?existing.area:'other',horizon=value('horizon')===''||value('horizon')==null?null:value('horizon'),status=has(input,'status')?input.status:existing?existing.status:'dream';
    if(title===null)return fail('Give this possibility a title of up to 120 characters.');
    if(!has(areas,area))return fail('Choose experiences, ventures, places, everyday life or other possibilities.');
    if(horizon!==null&&!has(horizons,horizon))return fail('Choose soon, next chapter or someday, or leave the horizon open.');
    if(!has(statuses,status))return fail('Choose one of the ambition stages.');
    let targetYear=value('targetYear');
    if(targetYear===''||targetYear===null||targetYear===undefined)targetYear=null;
    else if(typeof targetYear==='string'&&/^\d{4}$/.test(targetYear.trim()))targetYear=Number(targetYear.trim());
    if(targetYear!==null&&(!Number.isInteger(targetYear)||targetYear<1970||targetYear>2199))return fail('Use a year from 1970 to 2199, or leave the year open.');
    const fields={};
    for(const key of workshopFields){const content=text(value(key),key==='firstExperiment'?2000:8000);if(content===null)return fail('Keep each workshop response within '+(key==='firstExperiment'?'2,000':'8,000')+' characters.');fields[key]=content;}
    const position=has(input,'position')?input.position:existing?existing.position:positions[rows.length%positions.length];
    if(!positionOK(position))return fail('Map positions must be finite numbers between 0 and 1.');
    const isExample=has(input,'isExample')?input.isExample:existing?existing.isExample:false;
    if(typeof isExample!=='boolean')return fail('The example marker must be true or false.');
    return good({ambition:{id:existing?existing.id:seedId||uid('ambition'),title,area,horizon,targetYear,status,...fields,position:{x:position.x,y:position.y},goalIds:existing?copy(existing.goalIds):[],actionIds:existing?copy(existing.actionIds||[]):[],isExample,version:existing?existing.version:0,createdOn:existing?existing.createdOn:TODAY,updatedOn:existing?existing.updatedOn:TODAY}});
  }
  function upsert(input){
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('Enter the ambition details.');
    const existing=input.id?ambitionRow(input.id):null;
    if(input.id&&!existing)return fail('That ambition could not be found.');
    const result=checked(input,existing);
    if(!result.ok)return result;
    if(existing&&same(existing,result.ambition))return good({id:existing.id,ambition:existing,unchanged:true});
    return commit(result.ambition,existing?'edited':'created');
  }
  function setStatus(id,status){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    if(!has(statuses,status))return fail('Choose one of the ambition stages.');
    if(row.status===status)return good({id,ambition:row,unchanged:true});
    return commit({...copy(row),status},'status');
  }
  function move(id,position){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    if(!positionOK(position))return fail('Map positions must be finite numbers between 0 and 1.');
    if(row.position.x===position.x&&row.position.y===position.y)return good({id,ambition:row,unchanged:true});
    return commit({...copy(row),position:{x:position.x,y:position.y}},'moved');
  }
  function addNote(id,input){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('Write a reflection, research note or decision.');
    const kind=input.kind??'reflection',content=text(input.text,12000,true),date=input.date??TODAY;
    if(!['reflection','research','decision'].includes(kind))return fail('Choose a reflection, research note or decision.');
    if(content===null)return fail('Write a note of up to 12,000 characters.');
    if(!dateOK(date)||date>TODAY)return fail('Use a real note date on or before today.');
    const note={id:uid('planner-note'),ambitionId:id,kind,text:content,date,recordedOn:TODAY,ambitionSnapshot:copy(row)};
    noteRows.push(note);return good({id:note.id,note});
  }
  function addConnection(input){
    if(!input||typeof input!=='object'||Array.isArray(input))return fail('Choose the two ambitions and their relationship.');
    let {fromId,toId}=input;const type=input.type??'related',note=text(input.note,2000);
    if(!ambitionRow(fromId)||!ambitionRow(toId))return fail('Both connected ambitions must exist.');
    if(fromId===toId)return fail('Connect two different ambitions.');
    if(!has(relations,type))return fail('Choose supports, depends on or related to.');
    if(note===null)return fail('Keep the connection note within 2,000 characters.');
    if(type==='related'&&fromId>toId)[fromId,toId]=[toId,fromId];
    const duplicate=linkRows.find(row=>!row.archived&&row.type===type&&row.fromId===fromId&&row.toId===toId);
    if(duplicate)return fail('These ambitions already have that connection.',{duplicate:true,connection:duplicate});
    const connection={id:uid('planner-connection'),fromId,toId,type,note,archived:false,createdOn:TODAY,archivedOn:null,fromSnapshot:copy(ambitionRow(fromId)),toSnapshot:copy(ambitionRow(toId))};
    linkRows.push(connection);linkRevisions.push({id:uid('planner-link-revision'),connectionId:connection.id,change:'created',recordedOn:TODAY,snapshot:copy(connection)});
    return good({id:connection.id,connection});
  }
  function removeConnection(id){
    const old=linkRows.find(row=>row.id===id);if(!old)return fail('That connection could not be found.');
    if(old.archived)return good({id,connection:old,unchanged:true});
    const row={...copy(old),archived:true,archivedOn:TODAY};linkRows[linkRows.indexOf(old)]=row;
    linkRevisions.push({id:uid('planner-link-revision'),connectionId:id,change:'archived',recordedOn:TODAY,snapshot:copy(row)});
    return good({id,connection:row});
  }
  function prompts(id){
    const row=ambitionRow(id);if(!row)return [];
    const hints={
      experience:['What would make the experience meaningful?','Picture an ordinary moment inside the experience.','Think about timing, access, skills or who might join you.','Keep useful discoveries and the source you found them in.','Compare a small version, a longer version, or different ways to try it.','Consider time, cost, energy and the commitments you want to protect.','Choose a small taste of the experience that can teach you something.'],
      venture:['Which problem or kind of work draws you in?','Describe the customers, work and daily life you would want.','What needs finding out before committing more time or money?','Keep observations from conversations, research or small tests.','Compare different customers, offers or ways of delivering value.','Name limits on time, money and other responsibilities.','Choose a low-cost way to learn whether the idea is useful.'],
      place:['What draws you towards this kind of place?','Picture a normal day there, beyond a holiday or first impression.','Think about access, community, living costs and practical requirements.','Keep things you learn from visits and reliable local sources.','Compare possible places or ways to spend time there.','Name the relationships, costs or responsibilities that matter.','Try a visit, a conversation or a short stay with one question to explore.'],
      lifestyle:['What would you like more room for?','Describe how an ordinary week would feel and work.','What do you need to understand about your current routines?','Keep observations from your own days and small experiments.','Compare different rhythms or practical changes.','Name what you want to protect as well as what you want to change.','Try one small change and decide what you want to notice.'],
      other:['What makes this possibility matter to you?','Picture what bringing it into your life would look like.','List the things you still want to understand.','Keep observations, sources and useful discoveries.','Sketch different paths, including a smaller version.','Name the limits and commitments that matter.','Choose one small way to learn more without committing to the whole idea.']
    }[row.area];
    const labels=['What draws you to this?','What would it look and feel like?','What do you still want to find out?','What have you learned so far?','Which paths could you explore?','What needs protecting or working around?','What could you try first?'];
    return workshopFields.map((field,i)=>({field,label:labels[i],hint:hints[i],value:row[field]}));
  }
  function goalDraft(id){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    const colours={experience:'#85d6ff',venture:'#c0b3ff',place:'#a4ccf3',lifestyle:'#efaeca',other:'#afbbea'};
    return good({ambitionId:id,sourceId:'life-planner:'+id,sourceVersion:row.version,linkedGoalIds:row.goalIds,goal:{title:(row.firstExperiment||row.title).slice(0,120),why:row.why.slice(0,500),category:areas[row.area],mode:null,unit:'',target:null,weeklySessions:null,startDate:TODAY,deadline:'',status:'active',color:colours[row.area],milestones:[]},needsInput:['mode','unit','target','weeklySessions','deadline']});
  }
  function linkGoal(id,goalId){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    const goal=goals().find(goal=>goal.id===goalId);if(!goal)return fail('Create or choose an existing goal before linking it.');
    if(row.goalIds.includes(goalId))return good({id,ambition:row,goalId,duplicate:true});
    const result=commit({...copy(row),goalIds:[...row.goalIds,goalId]},'goal-linked');
    goalLinkRows.push({id:uid('planner-goal-link'),ambitionId:id,goalId,linkedOn:TODAY,sourceId:'life-planner:'+id,goalSnapshot:copy(goal),ambitionSnapshot:copy(result.ambition)});
    return good({id,ambition:result.ambition,goalId});
  }
  function linkAction(id,actionId){
    const row=ambitionRow(id);if(!row)return fail('That ambition could not be found.');
    const action=actions().find(action=>action.id===actionId);if(!action)return fail('Create or choose an existing action before linking it.');
    if(row.actionIds.includes(actionId))return good({id,ambition:row,actionId,duplicate:true});
    const result=commit({...copy(row),actionIds:[...row.actionIds,actionId]},'action-linked');
    actionLinkRows.push({id:uid('planner-action-link'),ambitionId:id,actionId,linkedOn:TODAY,sourceId:'life-planner:'+id,actionSnapshot:copy(action),ambitionSnapshot:copy(result.ambition)});
    return good({id,ambition:result.ambition,actionId});
  }
  function details(id){
    const row=ambitionRow(id);if(!row)return null;
    const guide=prompts(id),links=goalLinkRows.filter(link=>link.ambitionId===id),currentGoals=goals(),actionLinks=actionLinkRows.filter(link=>link.ambitionId===id),currentActions=actions();
    return copy({ambition:row,versions:revisions.filter(revision=>revision.ambitionId===id),notes:noteRows.filter(note=>note.ambitionId===id),connections:linkRows.filter(link=>!link.archived&&(link.fromId===id||link.toId===id)),goalLinks:links,actionLinks,linkedActions:row.actionIds.map(actionId=>currentActions.find(action=>action.id===actionId)||{...actionLinks.find(link=>link.actionId===actionId).actionSnapshot,missing:true}),linkedGoals:row.goalIds.map(goalId=>currentGoals.find(goal=>goal.id===goalId)||{...links.find(link=>link.goalId===goalId).goalSnapshot,missing:true}),prompts:guide,answeredPrompts:guide.filter(prompt=>prompt.value.trim()).length,promptCount:guide.length});
  }

  function snapshot(){return copy({schema:'lifeos.life-planner.v1',ambitions:rows,versions:revisions,notes:noteRows,connections:linkRows,connectionVersions:linkRevisions,goalLinks:goalLinkRows,actionLinks:actionLinkRows});}
  function restore(data,options={}){return LifeSnapshotCheck.protect(()=>{
    const C=LifeSnapshotCheck,s=C.payload(data,'lifeos.life-planner.v1'),a=C.indexed(s.ambitions,'ambitions'),v=C.indexed(s.versions,'ambition versions'),n=C.indexed(s.notes,'ambition notes'),links=C.indexed(s.connections,'ambition connections'),lv=C.indexed(s.connectionVersions,'connection versions'),gl=C.indexed(s.goalLinks,'goal links'),al=C.indexed(s.actionLinks,'action links');
    const ambition=row=>{C.object(row);C.id(row.id);C.text(row.title,120,true);C.one(row.area,Object.keys(areas));C.one(row.status,Object.keys(statuses));C.optional(row.horizon,x=>C.one(x,Object.keys(horizons)));C.optional(row.targetYear,x=>C.integer(x,1970,2199));for(const key of workshopFields)C.text(row[key],key==='firstExperiment'?2000:8000);C.position(row.position);C.bool(row.isExample);C.integer(row.version,1);C.date(row.createdOn,true);C.date(row.updatedOn,true);for(const key of ['goalIds','actionIds']){C.list(row[key],key);row[key].forEach(C.id);C.check(new Set(row[key]).size===row[key].length,'Repeated ambition link.');}};
    a.forEach(ambition);const latestRevision=new Map();for(const row of v.values()){C.check(a.has(row.ambitionId),'Revision references a missing ambition.');C.integer(row.version,1);C.date(row.recordedOn,true);C.one(row.change,['created','edited','status','moved','goal-linked','action-linked']);ambition(row.snapshot);const prior=latestRevision.get(row.ambitionId);C.check(row.snapshot.id===row.ambitionId&&row.snapshot.version===row.version&&row.version===(prior?prior.version+1:1),'Broken ambition revision chain.');latestRevision.set(row.ambitionId,row);}
    for(const row of a.values())C.check(JSON.stringify(latestRevision.get(row.id)?.snapshot)===JSON.stringify(row),'Ambition differs from its last saved revision.');
    for(const row of n.values()){C.check(a.has(row.ambitionId),'Note references a missing ambition.');C.one(row.kind,['reflection','research','decision']);C.text(row.text,12000,true);C.date(row.date,true);C.date(row.recordedOn,true);ambition(row.ambitionSnapshot);C.check(row.ambitionSnapshot.id===row.ambitionId,'Note snapshot belongs to another ambition.');}
    const relation=row=>{C.check(a.has(row.fromId)&&a.has(row.toId)&&row.fromId!==row.toId,'Connection needs two existing ambitions.');C.one(row.type,Object.keys(relations));C.text(row.note,2000);C.bool(row.archived);C.date(row.createdOn,true);C.optional(row.archivedOn,x=>C.date(x,true));C.check(row.archived===!!row.archivedOn,'Connection archive date disagrees.');ambition(row.fromSnapshot);ambition(row.toSnapshot);C.check(row.fromSnapshot.id===row.fromId&&row.toSnapshot.id===row.toId,'Connection snapshots disagree.');};links.forEach(relation);
    const lastLink=new Map();for(const row of lv.values()){C.check(links.has(row.connectionId),'Connection revision has no connection.');C.date(row.recordedOn,true);C.one(row.change,['created','archived']);relation(row.snapshot);C.check(row.snapshot.id===row.connectionId,'Connection revision snapshot disagrees.');const prior=lastLink.get(row.connectionId);C.check(prior?row.change==='archived'&&!prior.snapshot.archived&&row.snapshot.archived:row.change==='created'&&!row.snapshot.archived,'Broken connection history.');lastLink.set(row.connectionId,row);}for(const row of links.values())C.check(JSON.stringify(lastLink.get(row.id)?.snapshot)===JSON.stringify(row),'Connection differs from its last revision.');
    for(const [collection,key,snapshotKey] of [[gl,'goalId','goalSnapshot'],[al,'actionId','actionSnapshot']]){const seen=new Set();for(const row of collection.values()){C.check(a.has(row.ambitionId),'Linked item has no ambition.');C.id(row[key]);C.date(row.linkedOn,true);C.text(row.sourceId,220,true);C.check(row.sourceId==='life-planner:'+row.ambitionId,'Invalid linked source.');ambition(row.ambitionSnapshot);C.check(row.ambitionSnapshot.id===row.ambitionId,'Linked snapshot belongs to another ambition.');C.object(row[snapshotKey]);C.check(row[snapshotKey].id===row[key],'Linked item snapshot disagrees.');C.text(row[snapshotKey].title,160,true);if(key==='goalId'){C.number(row.goalSnapshot.target,0);C.text(row.goalSnapshot.unit,120);C.text(row.goalSnapshot.status,40);}else{C.bool(row.actionSnapshot.done);C.date(row.actionSnapshot.date);}const pair=row.ambitionId+':'+row[key];C.check(!seen.has(pair),'Duplicate linked item.');seen.add(pair);}for(const row of a.values()){const ids=row[key==='goalId'?'goalIds':'actionIds'];C.check(ids.every(id=>[...collection.values()].some(link=>link.ambitionId===row.id&&link[key]===id)),'Ambition link has no snapshot.');C.check([...collection.values()].filter(link=>link.ambitionId===row.id).every(link=>ids.includes(link[key])),'Linked snapshot is not on its ambition.');}}
    if(options.validateOnly)return {ok:true};
    for(const [target,source] of [[rows,s.ambitions],[revisions,s.versions],[noteRows,s.notes],[linkRows,s.connections],[linkRevisions,s.connectionVersions],[goalLinkRows,s.goalLinks],[actionLinkRows,s.actionLinks]])C.replace(target,source);return {ok:true};
  });}

  return {snapshot,restore,get ambitions(){return copy(rows);},get versions(){return copy(revisions);},get notes(){return copy(noteRows);},get connections(){return copy(linkRows.filter(link=>!link.archived));},get connectionHistory(){return copy(linkRevisions);},get goalLinks(){return copy(goalLinkRows);},get actionLinks(){return copy(actionLinkRows);},get areas(){return copy(areas);},get horizons(){return copy(horizons);},get statuses(){return copy(statuses);},get relations(){return copy(relations);},ambition:id=>{const row=ambitionRow(id);return row?copy(row):null;},details,upsert,setStatus,updateStatus:setStatus,move,addNote,addReflection:(id,input)=>addNote(id,{...input,kind:'reflection'}),addConnection,removeConnection,prompts,goalDraft,linkGoal,linkAction};
})();

    const lifeView={tab:'map',id:null,area:'all',status:'open',query:'',step:'vision',drafts:{}};
    const lifeAreas={experience:{label:'Experiences',icon:'journey',color:'#94c9ed'},venture:{label:'Ventures',icon:'venture',color:'#e2bd8f'},place:{label:'Places',icon:'place',color:'#a5d1c8'},lifestyle:{label:'Everyday life',icon:'home',color:'#c0b3ff'},other:{label:'Other possibilities',icon:'spark',color:'#ddaacb'}};
    const lifeStepLabels={why:'Meaning',vision:'The picture',questions:'Questions',researchNotes:'Discoveries',options:'Possible paths',constraints:'Real life',firstExperiment:'A small start'};
    const lifeStatusLabel=status=>LifePlannerDemo.statuses[status]||status;
    const lifeHorizonLabel=value=>LifePlannerDemo.horizons[value]||'No horizon yet';
    function lifeFiltered(){const query=lifeView.query.toLowerCase().trim();return LifePlannerDemo.ambitions.filter(a=>{const areaMatches=lifeView.area==='all'||a.area===lifeView.area;const statusMatches=lifeView.status==='all'||(lifeView.status==='open'?!['parked','lived'].includes(a.status):a.status===lifeView.status);return areaMatches&&statusMatches&&(!query||[a.title,a.why,a.vision].some(v=>v.toLowerCase().includes(query)));});}
    function lifeMapLayout(ambitions,compact){const count=ambitions.length;if(count<=4){let points=ambitions.map(a=>({id:a.id,x:compact?Math.max(.24,Math.min(.76,a.position.x)):Math.max(.15,Math.min(.85,a.position.x)),y:Math.max(.2,Math.min(.8,a.position.y))}));const central=points.some(p=>Math.abs(p.x-.5)<.2&&Math.abs(p.y-.5)<.25),crowded=points.some((p,i)=>points.slice(i+1).some(q=>Math.abs(p.x-q.x)<(compact?.48:.33)&&Math.abs(p.y-q.y)<.4));if(central||crowded){const corners=[{x:.24,y:.24},{x:.76,y:.24},{x:.24,y:.76},{x:.76,y:.76}];points=ambitions.map((a,i)=>({id:a.id,...corners[i]}));}return {height:compact?540:470,points};}const columns=compact?2:3,rows=Math.ceil(count/columns),height=rows*(compact?205:195)+45;return {height,points:ambitions.map((a,i)=>({id:a.id,x:((i%columns)+.5)/columns,y:(Math.floor(i/columns)+.5)/rows}))};}
    function lifeMapPath(from,to){const x1=from.x*1000,y1=from.y*600,x2=to.x*1000,y2=to.y*600,m=(x1+x2)/2;return 'M'+x1+' '+y1+'C'+m+' '+y1+' '+m+' '+y2+' '+x2+' '+y2;}
    function renderLifeMap(ambitions){if(!ambitions.length)return renderLifeEmpty();const layout=lifeMapLayout(ambitions,window.innerWidth<=600),points=new Map(layout.points.map(p=>[p.id,p])),links=LifePlannerDemo.connections.filter(c=>points.has(c.fromId)&&points.has(c.toId));return '<div class="life-map-heading"><h2>A map of possibilities</h2><span>'+ambitions.length+' '+(ambitions.length===1?'ambition':'ambitions')+' in view</span></div><div class="life-map" style="height:'+layout.height+'px" aria-label="Ambitions map"><div class="life-map-grid" aria-hidden="true"></div><svg class="life-terrain" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path d="M-70 30C200 170 240-10 500 120S790 350 1070 210M-70 65C200 205 240 25 500 155S790 385 1070 245M-70 100C200 240 240 60 500 190S790 420 1070 280M-70 480C210 300 230 620 515 440S790 210 1070 450M-70 515C210 335 230 655 515 475S790 245 1070 485M-70 550C210 370 230 690 515 510S790 280 1070 520"/><ellipse cx="510" cy="294" rx="136" ry="124" stroke-dasharray="2 9"/><ellipse cx="510" cy="294" rx="175" ry="162" stroke-dasharray="1 14"/></svg><svg class="life-map-lines" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">'+links.map(c=>'<path class="'+c.type+'" d="'+lifeMapPath(points.get(c.fromId),points.get(c.toId))+'"/>').join('')+'</svg>'+(ambitions.length<=4?'<div class="life-map-core" aria-hidden="true">'+icon('life')+'<span>Your possibilities</span><small>Room to explore</small></div>':'')+ambitions.map(a=>{const p=points.get(a.id),area=lifeAreas[a.area];return '<button class="life-map-node" style="--dream:'+area.color+';left:'+(p.x*100)+'%;top:'+(p.y*100)+'%" data-action="life-open" data-id="'+esc(a.id)+'" aria-label="Explore '+esc(a.title)+', '+esc(lifeStatusLabel(a.status))+', '+esc(lifeHorizonLabel(a.horizon))+'"><span class="life-orb">'+icon(a.status==='lived'?'check':area.icon)+'</span><span class="life-node-area">'+area.label+'</span><strong>'+esc(a.title)+'</strong><span class="life-node-meta">'+esc(lifeStatusLabel(a.status))+' · '+esc(lifeHorizonLabel(a.horizon))+'</span></button>';}).join('')+'</div><div class="life-map-caption"><span>Open any ambition to explore it. Lines show connections you have saved between ideas.</span><span>'+links.length+' '+(links.length===1?'connection':'connections')+' in view</span></div><div class="life-note-banner">'+icon('spark')+'<div><h3>Possibility first. A plan when you are ready.</h3><p>Give an idea some room. Describe the life behind it, follow your questions, and try a small version. You choose when it becomes a goal or an action.</p></div></div>';}
    function renderLifeEmpty(){return '<div class="life-empty"><h2>Leave a little space for a bigger idea.</h2><p>'+(LifePlannerDemo.ambitions.length?'No ambitions match this view. Change the filters, or add another possibility.':'A trip, a business, a place to live, or a different shape to your everyday life. Start with one thought. The detail can come later.')+'</p><button class="button primary" data-action="life-add">'+icon('plus')+' Add an ambition</button></div>';}
    function lifeNoteMarkup(note,showAmbition=false){const ambition=LifePlannerDemo.ambition(note.ambitionId);return '<article class="life-journal-entry"><div class="life-journal-date">'+dateLabel(note.date,{day:'numeric',month:'short'})+'<br>'+note.date.slice(0,4)+'</div><div class="life-journal-copy"><span>'+esc(note.kind)+'</span>'+(showAmbition&&ambition?'<h3>'+esc(ambition.title)+'</h3>':'')+'<p>'+esc(note.text)+'</p>'+(showAmbition&&ambition?'<button class="text-button" data-action="life-open" data-id="'+esc(ambition.id)+'">Return to this ambition '+icon('arrow')+'</button>':'')+'</div></article>';}
    function renderLifeNotebook(ambitions){const ids=new Set(ambitions.map(a=>a.id)),notes=LifePlannerDemo.notes.filter(n=>ids.has(n.ambitionId)).reverse().sort((a,b)=>b.date.localeCompare(a.date));return '<section><div class="life-section-head"><h2>Things you are learning</h2><button class="text-button" data-action="life-note">'+icon('plus')+' Add a note</button></div><p class="life-workshop-intro">Keep the conversations, discoveries and changes of mind that give an idea its shape. Each note stays part of the story.</p>'+(notes.length?notes.map(n=>lifeNoteMarkup(n,true)).join(''):'<div class="life-empty"><h2>A place for the thinking.</h2><p>No notes in this view yet. Save a question, something you learned, or a decision you want to remember.</p><button class="button ghost" data-action="life-note">Add a note</button></div>')+'</section>';}
    function renderLifePlanner(){if(lifeView.id&&LifePlannerDemo.ambition(lifeView.id))return renderLifeDetail(lifeView.id);lifeView.id=null;const ambitions=lifeFiltered();return '<div class="life-page"><header class="life-head"><div><div class="kicker"><span class="dot"></span><span class="eyebrow">Life Planner</span></div><h1>A life worth<br>imagining.</h1><p>The things you want to experience, create, and make room for. They can start as a daydream.</p></div><button class="button primary" data-action="life-add">'+icon('plus')+' Add an ambition</button></header><div class="life-view-tabs" aria-label="Life Planner views">'+[['map','life','Possibilities'],['horizons','journey','Horizons'],['notebook','book','Notebook']].map(([key,symbol,label])=>'<button data-action="life-tab" data-tab="'+key+'" aria-pressed="'+(lifeView.tab===key)+'">'+icon(symbol)+label+'</button>').join('')+'</div><div class="life-toolbar"><label class="sr" for="lifeSearch">Find an ambition</label><input id="lifeSearch" type="search" placeholder="Find an ambition..." value="'+esc(lifeView.query)+'"><label class="sr" for="lifeStatusFilter">Which ambitions to show</label><select id="lifeStatusFilter">'+[['open','Open possibilities'],['all','Every ambition'],['lived','Things I have lived'],['parked','Parked for now']].map(([key,label])=>'<option value="'+key+'" '+(lifeView.status===key?'selected':'')+'>'+label+'</option>').join('')+'</select></div><div class="life-area-filter" aria-label="Filter ambitions by life area"><button data-action="life-area" data-area="all" aria-pressed="'+(lifeView.area==='all')+'">All areas</button>'+Object.entries(lifeAreas).map(([key,area])=>'<button data-action="life-area" data-area="'+key+'" aria-pressed="'+(lifeView.area===key)+'">'+icon(area.icon)+area.label+'</button>').join('')+'</div>'+(lifeView.tab==='horizons'?renderLifeHorizons(ambitions):lifeView.tab==='notebook'?renderLifeNotebook(ambitions):renderLifeMap(ambitions))+(ambitions.some(a=>a.isExample)?'<p class="life-examples-note">These ambitions are marked as examples. Edit an example to make it your own.</p>':'')+'</div>';}
    function renderLifeWorkshop(details){const ambition=details.ambition,prompt=details.prompts.find(p=>p.field===lifeView.step)||details.prompts[0],key=ambition.id+':'+prompt.field,value=Object.prototype.hasOwnProperty.call(lifeView.drafts,key)?lifeView.drafts[key]:prompt.value;return '<div class="life-section-head"><h2>Give the idea some shape</h2></div><p class="life-workshop-intro">Follow whichever question is useful. You can leave the rest open and return as the idea develops.</p><div class="life-workshop-steps" aria-label="Explore this ambition">'+details.prompts.map((p,i)=>'<button data-action="life-step" data-key="'+p.field+'" class="'+(p.value?'has-answer':'')+'" aria-pressed="'+(p.field===prompt.field)+'"><i>'+(p.value?'✓':i+1)+'</i>'+lifeStepLabels[p.field]+'</button>').join('')+'</div><form class="life-workshop" id="lifeWorkshopForm" data-id="'+esc(ambition.id)+'" data-field="'+prompt.field+'"><span class="eyebrow">'+lifeStepLabels[prompt.field]+'</span><h3>'+esc(prompt.label)+'</h3><p>'+esc(prompt.hint)+'</p><label class="sr" for="lifeWorkshopText">Your thoughts on '+esc(lifeStepLabels[prompt.field].toLowerCase())+'</label><textarea id="lifeWorkshopText" rows="6" maxlength="'+(prompt.field==='firstExperiment'?2000:8000)+'" placeholder="A few thoughts are enough to start...">'+esc(value)+'</textarea><div class="life-workshop-footer"><small id="lifeDraftStatus" role="status">'+(value!==prompt.value?'Unsaved thoughts':prompt.value?'Your saved thoughts':'Open question')+'</small><button class="button primary" type="submit">Save these thoughts '+icon('check')+'</button></div><div id="lifeWorkshopError" class="error" role="alert"></div></form><p class="life-workshop-answer">'+details.answeredPrompts+' of '+details.promptCount+' prompts explored. This describes your notes, not how close you are to living the ambition.</p>';}
    function lifeRelationText(connection,id){const outgoing=connection.fromId===id,other=LifePlannerDemo.ambition(outgoing?connection.toId:connection.fromId);return {other,label:connection.type==='related'?'Related to':connection.type==='supports'?outgoing?'Supports':'Supported by':outgoing?'Depends on':'Helps make possible'};}
    function renderLifeDetail(id){const d=LifePlannerDemo.details(id),a=d.ambition,area=lifeAreas[a.area],notes=d.notes.slice().reverse().sort((x,y)=>y.date.localeCompare(x.date));return '<div class="life-page" style="--dream:'+area.color+'"><button class="life-detail-back" data-action="life-home">'+icon('back')+' Back to your possibilities</button><header class="life-detail-hero">'+icon(area.icon,'life-hero-icon')+'<span class="eyebrow">'+area.label+(a.isExample?' · Example ambition':'')+'</span><h1>'+esc(a.title)+'</h1><p>'+esc(a.why||'There is room to find out why this matters and what it could become.')+'</p><div class="life-detail-meta"><button data-action="life-status" data-id="'+esc(id)+'">'+esc(lifeStatusLabel(a.status))+'</button><button data-action="life-place" data-id="'+esc(id)+'">'+esc(lifeHorizonLabel(a.horizon))+(a.targetYear?' · '+a.targetYear:'')+'</button><button class="text-button" data-action="life-edit" data-id="'+esc(id)+'">Edit ambition '+icon('edit')+'</button></div></header><div class="life-detail-layout"><section>'+renderLifeWorkshop(d)+'<section class="life-journal"><div class="life-section-head"><h2>As the idea develops</h2><button class="text-button" data-action="life-note" data-id="'+esc(id)+'">'+icon('plus')+' Add a note</button></div>'+(notes.length?notes.map(n=>lifeNoteMarkup(n)).join(''):'<p class="life-workshop-intro">Save something you discover, a conversation worth remembering, or a decision about the direction you want to take.</p>')+'<button class="text-button" data-action="life-history" data-id="'+esc(id)+'">See how the ambition has changed '+icon('arrow')+'</button></section></section><aside><section class="life-bridge"><span class="eyebrow">From possible to practical</span><h2>A small way to begin.</h2><p>'+esc(a.firstExperiment||'Think of a small way to learn more. A conversation, a short visit, a first sketch, or a week of trying a different routine.')+'</p><button class="button primary" data-action="life-action-create" data-id="'+esc(id)+'">Plan a first-step action '+icon('arrow')+'</button><button class="button ghost" data-action="life-goal-create" data-id="'+esc(id)+'">Create a connected goal</button><p class="life-form-help">An action is something to do. A goal has an outcome you can track. This ambition can keep growing around both.</p><button class="text-button" data-action="life-goal-link" data-id="'+esc(id)+'">'+icon('plus')+' Connect an existing goal</button>'+d.linkedGoals.map(g=>'<button class="life-linked" data-action="life-goal-open" data-id="'+esc(g.id)+'" '+(g.missing?'disabled':'')+'><strong>'+esc(g.title)+'</strong><small>'+ (g.missing?'Original linked goal, no longer available':esc(g.target+' '+g.unit)+' · '+esc(g.status==='paused'?'Paused goal':'Connected goal'))+'</small></button>').join('')+(d.linkedActions?d.linkedActions.map(action=>'<button class="life-linked" data-action="life-action-open" data-id="'+esc(action.id)+'" '+(action.missing?'disabled':'')+'><strong>'+esc(action.title)+'</strong><small>'+esc(action.done?'Action completed':'Action planned')+(action.date?' · '+dateLabel(action.date):'')+'</small></button>').join(''):'')+'</section><section class="life-bridge"><span class="eyebrow">How ideas fit together</span><h2>Make the connections.</h2><p>One ambition might support another, depend on it, or share the same reason for being.</p>'+d.connections.map(c=>{const r=lifeRelationText(c,id);return r.other?'<div class="life-relation-row"><button class="life-linked" data-action="life-open" data-id="'+esc(r.other.id)+'"><small>'+esc(r.label)+'</small><strong>'+esc(r.other.title)+'</strong>'+(c.note?'<small>'+esc(c.note)+'</small>':'')+'</button><button class="icon-button" data-action="life-unlink" data-id="'+esc(c.id)+'" aria-label="Remove connection to '+esc(r.other.title)+'">'+icon('close')+'</button></div>':'';}).join('')+'<button class="text-button" data-action="life-connect" data-id="'+esc(id)+'">'+icon('plus')+' Connect another ambition</button></section><section class="life-bridge"><span class="eyebrow">On your terms</span><h2>No clock on a dream.</h2><p>Leave it open, put it on a horizon, or park it for a while. Its notes stay with you. Nothing is overdue just because it is still an idea.</p><button class="text-button" data-action="life-status" data-id="'+esc(id)+'">Change where this stands '+icon('arrow')+'</button></section></aside></div></div>';}

    function renderLifeHorizons(ambitions) {
      const rows = Array.isArray(ambitions) ? ambitions.filter(a => a && a.id && a.title) : [];
      const areas = { experience: ['An experience', '#85d6ff'], venture: ['A venture', '#c0b3ff'], place: ['A place', '#99decc'], lifestyle: ['A way of living', '#efaeca'], other: ['A possibility', '#cfcaed'] };
      const statuses = { dream: 'Dreaming', exploring: 'Exploring', planning: 'Taking shape', active: 'In motion', lived: 'Lived', parked: 'On pause' };
      const horizons = [
        { id: 'soon', name: 'Soon', caption: 'Close enough to begin.', number: '01' },
        { id: 'next', name: 'Next chapter', caption: 'Give it room to take shape.', number: '02' },
        { id: 'someday', name: 'Someday', caption: 'Keep the possibility open.', number: '03' }
      ];
      const group = a => ['soon', 'next', 'someday'].includes(a.horizon) ? a.horizon : 'unplaced';
      const entry = a => {
        const area = areas[a.area] || areas.other, status = Object.hasOwn(statuses, a.status) ? a.status : 'dream';
        return '<div class="life-horizon-entry '+(status === 'parked' ? 'life-horizon-entry-paused' : '')+'" style="--life-horizon-tone:'+area[1]+'"><button type="button" class="life-horizon-open" data-action="life-open" data-id="'+esc(a.id)+'"><span class="life-horizon-star" aria-hidden="true">'+(status === 'lived' ? icon('check') : '')+'</span><span class="life-horizon-entry-copy"><span class="life-horizon-entry-area">'+area[0]+(a.isExample?' <span class="life-horizon-example">Example</span>':'')+'</span><strong>'+esc(a.title)+'</strong><span class="life-horizon-entry-meta"><span class="life-horizon-status">'+statuses[status]+'</span>'+(Number.isInteger(a.targetYear)?'<span>Year in mind: '+esc(a.targetYear)+'</span>':'')+'</span></span></button><button type="button" class="life-horizon-move" data-action="life-place" data-id="'+esc(a.id)+'" aria-label="Choose a horizon for '+esc(a.title)+'" title="Choose a horizon">'+icon('arrow')+'<span>Place</span></button></div>';
      };
      if (!rows.length) return '<section class="life-horizon-empty"><div class="life-horizon-empty-orbit" aria-hidden="true"><i></i><i></i><span>'+icon('spark')+'</span></div><span class="life-horizon-eyebrow">A little room for possibility</span><h2>What would you love<br>to have in your life?</h2><p>A place to go. Something to build. A different way to spend your days. Start with one possibility, and give it a horizon whenever you are ready.</p><button type="button" class="life-horizon-add" data-action="life-add">'+icon('plus')+' Add a possibility</button></section>';
      const unplaced = rows.filter(a => group(a) === 'unplaced');
      return '<section class="life-horizon-world" aria-label="Your life horizons"><div class="life-horizon-landscape" aria-hidden="true"><svg viewBox="0 0 1000 920" preserveAspectRatio="none"><defs><linearGradient id="lifeHorizonGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#85d6ff" stop-opacity=".22"/><stop offset=".48" stop-color="#c0b3ff" stop-opacity=".16"/><stop offset="1" stop-color="#85d6ff" stop-opacity=".02"/></linearGradient></defs><path fill="url(#lifeHorizonGlow)" d="M0 260C240 120 400 390 650 230S900 140 1000 110V920H0Z"/><g fill="none" stroke="#c0b3ff"><path d="M-80 235C210 80 430 425 740 210S1040 200 1120 100"/><path d="M-80 270C210 115 430 460 740 245S1040 235 1120 135"/><path d="M-80 530C220 360 420 685 760 470S1020 475 1120 370"/><path d="M-80 565C220 395 420 720 760 505S1020 510 1120 405"/><path d="M-80 825C240 650 420 980 770 755S1010 760 1120 650"/><path d="M-80 860C240 685 420 1015 770 790S1010 795 1120 685"/></g></svg></div><div class="life-horizon-intro"><span class="life-horizon-eyebrow">The long view</span><p>Horizons can move as your life changes. Each possibility has its own pace.</p></div>'+horizons.map(h => {
        const items = rows.filter(a => group(a) === h.id);
        return '<section class="life-horizon-lane life-horizon-lane-'+h.id+'" aria-label="'+h.name+'"><header class="life-horizon-heading"><span class="life-horizon-number" aria-hidden="true">'+h.number+'</span><div><h3>'+h.name+'</h3><p>'+h.caption+'</p><span class="life-horizon-count">'+items.length+' '+(items.length === 1 ? 'possibility' : 'possibilities')+'</span></div></header><div class="life-horizon-entries">'+(items.length ? items.map(entry).join('') : '<p class="life-horizon-open-space">Open space. Move an ambition here when it feels right.</p>')+'</div></section>';
      }).join('')+'</section>'+(unplaced.length?'<section class="life-horizon-unplaced"><div class="life-horizon-unplaced-heading"><span class="life-horizon-unplaced-symbol" aria-hidden="true">'+icon('spark')+'</span><div><h3>Still finding their horizon.</h3><p>'+unplaced.length+' '+(unplaced.length === 1 ? 'possibility' : 'possibilities')+' with room to wander.</p></div></div><div class="life-horizon-entries">'+unplaced.map(entry).join('')+'</div></section>':'');
    }

const lifeWorkshopFields=['why','vision','questions','researchNotes','options','constraints','firstExperiment'];
function lifeResult(result,errorId,success){if(!result.ok){if(errorId&&$(errorId))$(errorId).textContent=result.error;else toast(result.error);return false;}if(success)toast(success);return true;}
function lifeSelectOptions(labels,value,empty){return (empty!==undefined?'<option value="">'+esc(empty)+'</option>':'')+Object.entries(labels).map(([key,label])=>'<option value="'+esc(key)+'" '+(key===value?'selected':'')+'>'+esc(typeof label==='object'?label.label:label)+'</option>').join('');}
function lifeYearField(value,id='lifeTargetYear'){return '<label>Year, optional<input id="'+id+'" type="number" min="1970" max="2199" step="1" inputmode="numeric" value="'+esc(value??'')+'" placeholder="Leave open"></label>';}
function lifeAmbitionEditor(id=null){const a=id?LifePlannerDemo.ambition(id):null;if(id&&!a){toast('That ambition could not be found.');return;}const why=a?(lifeView.drafts[id+':why']??a.why):'';showDialog(a?'Shape this ambition':'Give a possibility a place','<form id="lifeAmbitionForm" data-id="'+esc(id||'')+'"><p class="dialog-sub">An experience, a place, an idea, or a way of living. You can work out the details as it grows.</p><label>What would you like to bring into your life?<input id="lifeTitle" maxlength="120" required value="'+esc(a?.title||'')+'" placeholder="A possibility worth exploring"></label><label class="gap-top">Life area<select id="lifeArea">'+lifeSelectOptions(LifePlannerDemo.areas,a?.area||'other')+'</select></label><div class="goal-form-grid"><label>A loose horizon<select id="lifeHorizon">'+lifeSelectOptions(LifePlannerDemo.horizons,a?.horizon,'Leave open')+'</select></label>'+lifeYearField(a?.targetYear)+'</div><p class="goal-inline-help">The horizon is a way to organise your ideas. A year is optional.</p><label class="gap-top">What draws you to this?<textarea id="lifeWhy" rows="3" maxlength="8000">'+esc(why)+'</textarea></label>'+(a?.isExample?'<label class="life-dialog-checkbox"><input id="lifeAdoptExample" type="checkbox"><span>Make this example one of my own ambitions</span></label>':'')+'<div id="lifeAmbitionError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">'+(a?'Save changes':'Add ambition')+'</button></div></form>');}
function lifePlaceDialog(id){const a=LifePlannerDemo.ambition(id);if(!a)return;showDialog('Give it a horizon','<form id="lifePlaceForm" data-id="'+esc(id)+'"><p class="dialog-sub">'+esc(a.title)+'</p><label>When would you like to make room for it?<select id="lifePlaceHorizon">'+lifeSelectOptions(LifePlannerDemo.horizons,a.horizon,'Leave open')+'</select></label><div class="gap-top">'+lifeYearField(a.targetYear,'lifePlaceYear')+'</div><p class="goal-inline-help">Choose a broad chapter, a year, or leave both open.</p><div id="lifePlaceError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save horizon</button></div></form>');}
function lifeStatusDialog(id){const a=LifePlannerDemo.ambition(id);if(!a)return;const descriptions={dream:'Something you would love to bring into your life.',exploring:'Learning what it might involve and whether it fits.',planning:'Choosing an approach and the steps to try.',active:'Making it part of your life now.',lived:'An experience or chapter you have lived.',parked:'Keeping the possibility while giving it space.'};showDialog('Where does it stand?','<p class="dialog-sub">'+esc(a.title)+'. Choose the stage that feels true now.</p><div class="life-status-options">'+Object.entries(LifePlannerDemo.statuses).map(([key,label])=>'<button class="life-status-option" data-action="life-set-status" data-id="'+esc(id)+'" data-status="'+key+'" aria-pressed="'+(a.status===key)+'"><span><strong>'+esc(label)+'</strong><small>'+esc(descriptions[key])+'</small></span>'+icon(a.status===key?'check':'chevron')+'</button>').join('')+'</div><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button></div>');}
function lifeNoteDialog(id=null){if(!LifePlannerDemo.ambitions.length){lifeAmbitionEditor();return;}const a=id?LifePlannerDemo.ambition(id):null;if(id&&!a)return;showDialog('Keep a thought','<form id="lifeNoteForm" data-id="'+esc(id||'')+'">'+(a?'<p class="dialog-sub">'+esc(a.title)+'</p>':'<label>Which ambition?<select id="lifeNoteAmbition" required><option value="">Choose an ambition</option>'+LifePlannerDemo.ambitions.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.title)+'</option>').join('')+'</select></label>')+'<div class="goal-form-grid"><label>Kind of note<select id="lifeNoteKind"><option value="reflection">Reflection</option><option value="research">Research</option><option value="decision">Decision</option></select></label><label>Date<input id="lifeNoteDate" type="date" min="1970-01-01" max="'+TODAY+'" value="'+TODAY+'" required></label></div><label>What would you like to remember?<textarea id="lifeNoteText" rows="5" maxlength="12000" required placeholder="A discovery, a question, or a change in how you see this..."></textarea></label><p class="goal-inline-help">This note keeps the ambition as it stood when you added it.</p><div id="lifeNoteError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Keep this note</button></div></form>');}
function lifeConnectionDialog(id){const a=LifePlannerDemo.ambition(id);if(!a)return;const others=LifePlannerDemo.ambitions.filter(row=>row.id!==id);showDialog('Connect two possibilities',others.length?'<form id="lifeConnectionForm" data-id="'+esc(id)+'"><p class="dialog-sub">'+esc(a.title)+'</p><label>This ambition...<select id="lifeConnectionType">'+lifeSelectOptions(LifePlannerDemo.relations,'related')+'</select></label><label class="gap-top">...this possibility<select id="lifeConnectionOther" required><option value="">Choose another ambition</option>'+others.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.title)+'</option>').join('')+'</select></label><label class="gap-top">What connects them, optional<textarea id="lifeConnectionNote" maxlength="2000" rows="3"></textarea></label><div id="lifeConnectionError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Add connection</button></div></form>':'<p class="dialog-sub">Add another ambition to make a connection.</p><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
function lifeLinkGoalDialog(id){const a=LifePlannerDemo.ambition(id);if(!a)return;const goals=GoalsDemo.goals.filter(goal=>!a.goalIds.includes(goal.id));showDialog('Connect an existing goal',goals.length?'<form id="lifeLinkGoalForm" data-id="'+esc(id)+'"><p class="dialog-sub">Choose a goal that helps you explore or live '+esc(a.title)+'.</p><label>Goal<select id="lifeExistingGoal" required><option value="">Choose a goal</option>'+goals.map(goal=>'<option value="'+esc(goal.id)+'">'+esc(goal.title)+(goal.status==='paused'?' (paused)':'')+'</option>').join('')+'</select></label><div id="lifeLinkGoalError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Connect goal</button></div></form>':'<p class="dialog-sub">Every existing goal is already connected here. You can create another goal when you have an outcome you want to measure.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Close</button><button class="button primary" data-action="life-goal-create" data-id="'+esc(id)+'">Create a goal</button></div>');}
function lifeHistoryDialog(id){const d=LifePlannerDemo.details(id);if(!d)return;const changes={created:'First captured',edited:'Refined',status:'Stage changed',moved:'Map position changed','goal-linked':'Goal connected','action-linked':'Action connected'};showDialog('The story of this ambition','<p class="dialog-sub">'+esc(d.ambition.title)+'</p><h3>How the idea has changed</h3><div class="life-history-list">'+d.versions.slice().reverse().map(v=>'<details class="life-history-item"><summary><strong>'+esc(changes[v.change]||'Updated')+' · version '+v.version+'</strong><small>'+dateLabel(v.recordedOn,{day:'numeric',month:'long',year:'numeric'})+'</small></summary><h4>'+esc(v.snapshot.title)+'</h4><p>'+esc(LifePlannerDemo.statuses[v.snapshot.status])+' · '+esc(LifePlannerDemo.horizons[v.snapshot.horizon]||'Horizon open')+(v.snapshot.targetYear?' · '+v.snapshot.targetYear:'')+'</p>'+LifePlannerDemo.prompts(id).filter(p=>v.snapshot[p.field]).map(p=>'<p><strong>'+esc(p.label)+'</strong><span class="life-note-body">'+esc(v.snapshot[p.field])+'</span></p>').join('')+'</details>').join('')+'</div>'+(d.notes.length?'<h3 class="gap-top">Reflections and research</h3>'+d.notes.slice().reverse().map(n=>'<div class="life-history-note"><span class="eyebrow">'+esc(n.kind)+' · '+dateLabel(n.date,{day:'numeric',month:'short',year:'numeric'})+'</span><p class="life-note-body">'+esc(n.text)+'</p></div>').join(''):'')+'<div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');}
function lifeBlankChoice(select,label){const choice=document.createElement('option');choice.value='';choice.textContent=label;choice.disabled=true;choice.selected=true;select.prepend(choice);select.value='';select.required=true;}
function lifeCreateGoal(id){const draft=LifePlannerDemo.goalDraft(id);if(!lifeResult(draft))return;const a=LifePlannerDemo.ambition(id);closeDialog();goalEditor();const form=$('goalEditorForm');form.dataset.lifeAmbition=id;form.dataset.lifeSource=draft.sourceId;$('goalTitle').value=draft.goal.title;$('goalTitle').placeholder='A concrete outcome you can measure';$('goalWhy').value=draft.goal.why;$('goalTarget').value='';$('goalUnit').value='';$('goalDeadline').value='';lifeBlankChoice($('goalMode'),'Choose how progress counts');lifeBlankChoice($('goalWeekly'),'Choose a practice rhythm');const category=$('goalCategory');if(!Array.from(category.options).some(option=>option.value===draft.goal.category)){const option=document.createElement('option');option.value=draft.goal.category;option.textContent=draft.goal.category;category.append(option);}category.value=draft.goal.category;const practice=$('goalWeekly').closest('details');if(practice)practice.open=true;goalEditorState.auto=true;goalEditorState.milestones=[];renderGoalEditorPreview(true);$('goalMeasureHelp').textContent='Choose whether entries add towards a total or whether your best result counts.';$('goalPracticeSummary').textContent='Choose a practice rhythm to help you make room for this goal.';const intro=form.querySelector('.dialog-sub');if(intro)intro.textContent='Choose a measurable next step for '+a.title+'. Review the outcome, measurement and date before saving.';$('goalTitle').focus();}
function lifeLinkedGoalSaved(ambitionId,goal){const result=LifePlannerDemo.linkGoal(ambitionId,goal?.id);if(result.ok)lifeView.id=ambitionId;return result;}
function lifeCreateAction(id){const a=LifePlannerDemo.ambition(id);if(!a)return;const idea=lifeView.drafts[id+':firstExperiment']??a.firstExperiment;closeDialog();goalActionDialog();const form=$('goalActionForm');form.dataset.lifeAmbition=id;$('goalActionTitle').value=String(idea||'').slice(0,120);$('goalActionTitle').placeholder='A small experiment you can actually try';$('goalActionDate').value=TODAY;$('goalActionMinutes').value='';const intro=document.createElement('p');intro.className='dialog-sub';intro.textContent='A first step for '+a.title+'. Review the wording and choose a date.';form.prepend(intro);$('goalActionTitle').focus();}
function lifeLinkedActionSaved(ambitionId,action){const result=LifePlannerDemo.linkAction(ambitionId,action?.id);if(result.ok)lifeView.id=ambitionId;return result;}
function handleLifeAction(a,d){
  if(a==='life-tab'){if(!['map','horizons','notebook'].includes(d.tab))return;lifeView.tab=d.tab;lifeView.id=null;render();return;}
  if(a==='life-open'){if(!LifePlannerDemo.ambition(d.id))return;lifeView.id=d.id;render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(a==='life-home'){lifeView.id=null;render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(a==='life-area'){if(d.area!=='all'&&!Object.prototype.hasOwnProperty.call(LifePlannerDemo.areas,d.area))return;lifeView.area=d.area;render();return;}
  if(a==='life-add'){lifeAmbitionEditor();return;}
  if(a==='life-edit'){lifeAmbitionEditor(d.id||lifeView.id);return;}
  if(a==='life-place'){lifePlaceDialog(d.id||lifeView.id);return;}
  if(a==='life-status'){lifeStatusDialog(d.id||lifeView.id);return;}
  if(a==='life-set-status'){const result=LifePlannerDemo.setStatus(d.id,d.status);if(!lifeResult(result))return;closeDialog();render();toast('Stage updated.');return;}
  if(a==='life-note'){lifeNoteDialog(d.id||lifeView.id||null);return;}
  if(a==='life-connect'){lifeConnectionDialog(d.id||lifeView.id);return;}
  if(a==='life-unlink'){const result=LifePlannerDemo.removeConnection(d.id);if(!lifeResult(result))return;closeDialog();render();toast('Connection removed.');return;}
  if(a==='life-goal-link'){lifeLinkGoalDialog(d.id||lifeView.id);return;}
  if(a==='life-goal-create'){lifeCreateGoal(d.id||lifeView.id);return;}
  if(a==='life-goal-open'){if(!GoalsDemo.goals.some(goal=>goal.id===d.id)){toast('That goal is no longer available.');return;}goalView.id=d.id;goalView.tab='map';navigate('goals');return;}
  if(a==='life-action-create'){lifeCreateAction(d.id||lifeView.id);return;}
  if(a==='life-action-open'){if(!GoalsDemo.actions.some(action=>action.id===d.id)){toast('That action is no longer available.');return;}goalView.id=null;goalView.tab='actions';goalView.actionFilter=GoalsDemo.actions.find(action=>action.id===d.id).done?'done':'open';navigate('goals');goalActionDialog(d.id);return;}
  if(a==='life-history'){lifeHistoryDialog(d.id||lifeView.id);return;}
  if(a==='life-step'){if(!lifeWorkshopFields.includes(d.key))return;lifeView.step=d.key;render();return;}
}
document.addEventListener('input',event=>{if(event.target.id==='lifeSearch'){const start=event.target.selectionStart,end=event.target.selectionEnd,direction=event.target.selectionDirection;lifeView.query=event.target.value;render();const search=$('lifeSearch');if(search){search.focus({preventScroll:true});if(start!==null&&end!==null)search.setSelectionRange(start,end,direction||'none');}return;}if(event.target.id!=='lifeWorkshopText')return;const form=$('lifeWorkshopForm');if(!form||!lifeWorkshopFields.includes(form.dataset.field))return;lifeView.drafts[form.dataset.id+':'+form.dataset.field]=event.target.value;if($('lifeDraftStatus'))$('lifeDraftStatus').textContent='Unsaved changes';if($('lifeWorkshopError'))$('lifeWorkshopError').textContent='';});
document.addEventListener('change',event=>{if(event.target.id!=='lifeStatusFilter'||!['open','all','lived','parked'].includes(event.target.value))return;lifeView.status=event.target.value;render();});
document.addEventListener('submit',event=>{
  const form=event.target;if(!['lifeAmbitionForm','lifePlaceForm','lifeNoteForm','lifeConnectionForm','lifeLinkGoalForm','lifeWorkshopForm'].includes(form.id))return;event.preventDefault();const value=id=>$(id)?.value||'',number=id=>value(id)===''?null:Number(value(id));let result,errorId,message;
  if(form.id==='lifeAmbitionForm'){const id=form.dataset.id,old=id?LifePlannerDemo.ambition(id):null;result=LifePlannerDemo.upsert({...(id?{id}:{}),title:value('lifeTitle'),area:value('lifeArea'),horizon:value('lifeHorizon')||null,targetYear:number('lifeTargetYear'),why:value('lifeWhy'),isExample:old?.isExample&&!$('lifeAdoptExample')?.checked?true:false});errorId='lifeAmbitionError';message=id?'Ambition updated.':'A new possibility has a place.';if(result.ok){lifeView.id=result.id;delete lifeView.drafts[result.id+':why'];}}
  if(form.id==='lifePlaceForm'){result=LifePlannerDemo.upsert({id:form.dataset.id,horizon:value('lifePlaceHorizon')||null,targetYear:number('lifePlaceYear')});errorId='lifePlaceError';message='Horizon updated.';}
  if(form.id==='lifeNoteForm'){result=LifePlannerDemo.addNote(form.dataset.id||value('lifeNoteAmbition'),{kind:value('lifeNoteKind'),date:value('lifeNoteDate'),text:value('lifeNoteText')});errorId='lifeNoteError';message='Your note is kept with this ambition.';}
  if(form.id==='lifeConnectionForm'){result=LifePlannerDemo.addConnection({fromId:form.dataset.id,toId:value('lifeConnectionOther'),type:value('lifeConnectionType'),note:value('lifeConnectionNote')});errorId='lifeConnectionError';message='Connection added.';}
  if(form.id==='lifeLinkGoalForm'){result=LifePlannerDemo.linkGoal(form.dataset.id,value('lifeExistingGoal'));errorId='lifeLinkGoalError';message='Goal connected.';}
  if(form.id==='lifeWorkshopForm'){const field=form.dataset.field;if(!lifeWorkshopFields.includes(field)){toast('Choose a workshop prompt.');return;}result=LifePlannerDemo.upsert({id:form.dataset.id,[field]:value('lifeWorkshopText')});if(!result.ok){if($('lifeWorkshopError'))$('lifeWorkshopError').textContent=result.error;else toast(result.error);if($('lifeDraftStatus'))$('lifeDraftStatus').textContent='Not saved';return;}delete lifeView.drafts[form.dataset.id+':'+field];render();if($('lifeDraftStatus'))$('lifeDraftStatus').textContent=result.unchanged?'Already saved':'Saved';if($('lifeWorkshopError'))$('lifeWorkshopError').textContent='';toast('Thought saved.');return;}
  if(!lifeResult(result,errorId))return;closeDialog();render();toast(message);
});

    // UI adapters over the versioned workspace. No domain stores DOM nodes.
    let restoringWorkspace=false, backupBusy=false, pendingBackup=null;
    let purchaseRecords=PurchaseOperations.empty();
    const PurchasesDemo={snapshot:()=>clone(purchaseRecords),restore:(data,options={})=>{const checked=PurchaseOperations.validateDomain(data);if(!checked.ok)return checked;if(!options.validateOnly)purchaseRecords=clone(data);return {ok:true};}};
    let plannerRecords=PlannerOperations.empty();
    const PlannerDemo={snapshot:()=>clone(plannerRecords),restore:(data,options={})=>{const checked=PlannerOperations.validateDomain(data);if(!checked.ok)return checked;if(!options.validateOnly)plannerRecords=clone(data);return {ok:true};}};
    function workspaceParts(){return {
      training:{snapshot:snapshotTraining,restore:restoreTraining},sleep:{snapshot:snapshotSleep,restore:restoreSleep},
      food:FoodDemo,work:WorkDemo,goals:GoalsDemo,money:MoneyDemo,recurring:RecurringMoneyDemo,reference:MoneyReferenceDemo,
      moneySetup:{snapshot:snapshotMoneySetup,restore:restoreMoneySetup},people:PeopleDemo,life:LifePlannerDemo,capture:CaptureDemo,
      captureReceipts:{snapshot:()=>CaptureTargetsDemo.persistenceSnapshot(),restore:(data,options)=>CaptureTargetsDemo.restore(data,options)},purchases:PurchasesDemo,planner:PlannerDemo
    };}
    function captureWorkspace(){const domains={};for(const[name,part]of Object.entries(workspaceParts()))domains[name]=part.snapshot();return {format:'lifeos-state/1',minimumReaderVersion:69,domains,drafts:{capture:{draft:captureView.draft,date:captureView.date,source:captureView.source,fileName:captureView.fileName},ambitions:clone(lifeView.drafts),receipt:PurchaseUI.snapshotDraft()}};}
function validateWorkspaceLinks(payload){return LifeOSWorkspace.validateLinks(payload);}

    function restoreWorkspace(payload){
      if(!payload||payload.format!=='lifeos-state/1'||!payload.domains||typeof payload.domains!=='object')throw new Error('This workspace format is not supported.');
      payload=LifeOSWorkspace.normalize(payload);
      LifeOSWorkspace.validate(payload);
      const parts=workspaceParts(),before={};for(const[name,part]of Object.entries(parts)){before[name]=part.snapshot();if(!payload.domains[name])throw new Error('The backup is missing '+name+'.');}
      restoringWorkspace=true;
      try{for(const[name,part]of Object.entries(parts)){const result=part.restore(payload.domains[name]);if(!result||!result.ok)throw new Error('Could not restore '+name+': '+(result?.error||'invalid records'));}
        const drafts=payload.drafts||{},capture=drafts.capture||{};
        if(capture.draft!==undefined&&(typeof capture.draft!=='string'||capture.draft.length>12000))throw new Error('The saved capture draft is invalid.');
        const ambitionDrafts=drafts.ambitions||{};if(!ambitionDrafts||Array.isArray(ambitionDrafts)||typeof ambitionDrafts!=='object'||Object.entries(ambitionDrafts).some(([k,v])=>k.length>250||typeof v!=='string'||v.length>8000))throw new Error('The saved ambition notes are invalid.');
        captureView.draft=capture.draft||'';captureView.date=todayAdapterDate(capture.date)||TODAY;captureView.source=['typed','file','transcript','plaud','paste','manual'].includes(capture.source)?capture.source:'typed';captureView.fileName=typeof capture.fileName==='string'?capture.fileName.slice(0,250):'';
        lifeView.drafts=clone(ambitionDrafts);lifeView.id=null;goalView.id=null;PurchaseUI.restoreDraft(drafts.receipt??null);
      }catch(error){for(const[name,part]of Object.entries(parts))part.restore(before[name]);throw error;}finally{restoringWorkspace=false;}
    }
    LifeOSWorkspace.registerValidators(Object.fromEntries(Object.entries(workspaceParts()).map(([name,part])=>[name,data=>part.restore(data,{validateOnly:true})])));
    function purchaseContext(){return {workspace:captureWorkspace(),revision:LifeOSRuntime.revision,today:TODAY};}
    function preparePurchase(command){return PurchaseOperations.prepare(command,purchaseContext());}
    async function commitPurchase(command,reviewDigest){
      const input=clone(command);
      return LifeOSRuntime.transact({expectedRevision:input.expected.workspaceRevision,prepare:(workspace,{revision})=>{
        const context={workspace,revision,today:TODAY},checked=PurchaseOperations.prepare(input,context);
        if(checked.status!=='ready')throw new Error(checked.problems?.map(p=>p.reason||p.message).join(' ')||'Review the receipt details again.');
        if(!checked.alreadyCommitted&&checked.reviewDigest!==reviewDigest)throw new Error('The receipt or its linked records changed. Review the changes again.');
        const built=PurchaseOperations.buildCandidate(input,context);if(built.error)throw new Error(built.error);
        if(built.workspace)built.workspace.drafts.receipt=null;
        return built;
      }});
    }
    PurchaseUI.configure({context:purchaseContext,today:()=>TODAY,foodOptions,dialog:showDialog,changed:queueWorkspaceSave,flush:()=>LifeOSRuntime.flush(),commit:commitPurchase,render,toast,addAccount:()=>moneyNewAccount(),openMoney:moneyTransactionDetail});
    function plannerContext(){return {workspace:captureWorkspace(),revision:LifeOSRuntime.revision,today:TODAY};}
    function preparePlanner(command){return PlannerOperations.prepare(command,plannerContext());}
    async function commitPlanner(command,reviewDigest){
      const input=clone(command);
      const result=await LifeOSRuntime.transact({expectedRevision:input.expected.workspaceRevision,prepare:(workspace,{revision})=>{
        const checked=PlannerOperations.prepare(input,{workspace,revision});
        if(!checked.ok)throw new Error(checked.error||'Review the planner details again.');
        if(checked.status!=='already-committed'&&checked.reviewDigest!==reviewDigest)throw new Error('This plan changed after review. Review it again before saving.');
        const built=PlannerOperations.buildCandidate(checked,workspace);
        if(!built.ok)throw new Error(built.error||'The planner change could not be prepared.');
        return built.unchanged?{unchanged:true,result:built.receipt}:{workspace:built.workspace,result:built.receipt};
      }});
      return {ok:true,...result};
    }
    // Exact evidence references for the planner: kind, stable root, exact version and the record's own date. Read-only.
    function plannerEvidenceRef(ref){
      if(!ref||typeof ref!=='object')return null;
      let row;
      if(ref.kind==='training-session'){row=history.find(s=>s.id===ref.id);return row?{kind:'training-session',rootId:row.id,versionId:row.id,date:row.date}:null;}
      if(ref.kind==='sleep-record'){row=activeSleepRecords().find(r=>r.id===ref.id);return row?{kind:'sleep-record',rootId:row.sessionId,versionId:row.id,date:row.wakeDate}:null;}
      if(ref.kind==='meal-log'){row=FoodDemo.logs.find(l=>l.id===ref.id);return row?{kind:'meal-log',rootId:row.planId,versionId:row.id,date:row.date}:null;}
      if(ref.kind==='work-entry'){row=WorkDemo.entries.find(e=>e.id===ref.id);return row?{kind:'work-entry',rootId:row.id,versionId:row.revisionId,date:row.date}:null;}
      if(ref.kind==='goal-progress'){row=GoalsDemo.logs.find(l=>l.id===ref.id);return row?{kind:'goal-progress',rootId:row.recordId,versionId:row.id,date:row.date}:null;}
      if(ref.kind==='goal-action-event'){row=GoalsDemo.actionEvents.find(e=>e.id===ref.id);return row?{kind:'goal-action-event',rootId:row.id,versionId:row.id,date:row.date}:null;}
      if(ref.kind==='people-event'){row=PeopleDemo.events.find(e=>e.id===ref.id);return row?{kind:'people-event',rootId:row.rootId||row.id,versionId:row.id,date:row.date}:null;}
      if(ref.kind==='money-transaction'){row=MoneyDemo.transactions.find(t=>t.id===ref.id);return row?{kind:'money-transaction',rootId:row.rootId||row.id,versionId:row.id,date:row.date}:null;}
      return null;
    }
    function plannerActuals(date){
      return TodayDemo.snapshot(date).entries.filter(row=>row.status==='recorded'||row.status==='active'||row.ref.kind==='work-absence').map(row=>({id:row.id,title:row.title,detail:row.detail,route:row.route,time:row.time||null,kind:row.ref.kind==='work-absence'?'evidence':row.status==='active'?'active':'record',evidence:row.status==='recorded'?plannerEvidenceRef(row.ref):null}));
    }
    const plannerEvidenceRoutes={'training-session':'progress','sleep-record':'sleep','meal-log':'food','work-entry':'work','goal-progress':'goals','goal-action-event':'goals','people-event':'people','money-transaction':'money'};
    // Open the exact linked record, preferring its current version so a corrected entry still opens.
    function plannerOpenEvidence(reference){
      if(!reference||!plannerEvidenceRoutes[reference.kind])return todayAdapterMissing('This linked record kind cannot be opened.');
      const resolved=PlannerOperations.resolveEvidence(reference,captureWorkspace());
      if(!resolved.ok)return todayAdapterMissing('This linked record is no longer readable: '+resolved.error);
      const id=reference.kind==='work-entry'?reference.rootId:resolved.current.versionId;
      return todayOpenRef({kind:reference.kind,id,date:resolved.current.date},plannerEvidenceRoutes[reference.kind],resolved.current.date);
    }
    // Start opens the real flow for a planned activity. It never records completion.
    function plannerStart(slot,date){
      if(!slot||!todayAdapterDate(date))return todayAdapterMissing('Choose a valid day before starting an activity.');
      const category=slot.category,route=slot.link?.route||null;
      if(category==='training'){
        if(state.active){navigate('train');toast('A workout is already in progress. Continue or finish it here.');return true;}
        // Planner slots do not yet bind an exact workout version. A sport or shorter
        // activity must not silently start whichever gym routine shares its date.
        if(!todayAdapterDomain('train',date))return false;
        toast(date===TODAY?'Review or choose the workout here before starting. This planner activity has not started a session.':'Review the routine here. Workouts are recorded on the day you actually perform them.');return true;
      }
      if(category==='meal'){if(!todayAdapterDomain('food',date))return false;if(date>TODAY){toast('Log food on or after the day it is eaten.');return true;}foodDirectLogDialog();return true;}
      if(category==='sleep'){const wake=slot.end?.date||date;if(wake>TODAY){toast('Sleep is recorded after you wake up.');return true;}if(!todayAdapterDomain('sleep',wake))return false;sleepLog(wake);return true;}
      if(category==='work')return todayAdapterDomain('work',date);
      if(category==='goal')return todayAdapterDomain('goals',date);
      if(route==='life'||route==='plan'){closeDialog();navigate(route);return true;}
      if(route)return todayAdapterDomain(route,date);
      return false;
    }
    PlannerUI.configure({context:plannerContext,commit:commitPlanner,flush:()=>LifeOSRuntime.flush(),dialog:showDialog,closeDialog,render,toast,navigate,actuals:plannerActuals,start:plannerStart,openEvidence:plannerOpenEvidence});
    function workspaceStatus(kind,message){const button=$('workspaceStatus');if(!button)return;button.dataset.state=kind;button.textContent=message;button.title=message;if(kind==='error')button.setAttribute('aria-label','Save failed. '+message+' Open storage and backup options.');else button.removeAttribute('aria-label');}
    function queueWorkspaceSave(){if(!restoringWorkspace&&LifeOSRuntime.ready)LifeOSRuntime.queue();}
    function workspaceDialog(title,html){showDialog(title,html);$('dialog').dataset.workspaceUi='true';}
    function backupSummary(payload){
      const d=payload.domains;
      const rows=[['Training sessions',d.training.sessions?.length||d.training.history?.length||0],['Sleep versions',d.sleep.revisions.length],['Meal log versions',d.food.revisions.length],['Work versions',d.work.versions.length],['Goals',d.goals.goals.length],['Actions',d.goals.actions.length],['Money entries and corrections',d.money.versions.length],['People',d.people.people.length],['Ambitions',d.life.ambitions.length],['Capture check-ins',d.capture.batches.length],['Connected purchases',d.purchases?.versions.length||0],['Saved day plan versions',d.planner?.days.length||0],['Planning profile versions',d.planner?.profiles.length||0]];
      return '<dl class="backup-summary">'+rows.map(([label,n])=>'<div><dt>'+esc(label)+'</dt><dd>'+n+'</dd></div>').join('')+'</dl>';
    }
    function renderWorkspaceRecovery(error){
      $('main').innerHTML='<section class="workspace-open-error" data-workspace-ui="true"><span class="eyebrow">Your recovery space</span><h1>Your record stays yours.</h1><p>'+esc(error?.message||'The workspace needs a recovery check.')+'</p><p>The stored records remain in place. You can check a backup, restore a previous checkpoint, or save an encrypted rescue copy before proceeding.</p><div class="workspace-backup-actions"><button class="button primary" data-action="workspace-import">Restore a backup</button>'+(LifeOSRuntime.hasRecoveryDraft?'<button class="button ghost" data-action="workspace-export">Export unsaved changes</button>':'')+'<button class="button ghost" data-action="workspace-checkpoints">View recovery copies</button><button class="button ghost" data-action="workspace-rescue">Export stored rescue copy</button><button class="button ghost" id="retryOpenWorkspace">Try opening again</button></div><p class="workspace-form-help">Do not clear site storage or uninstall to fix this. Recovery preserves the replaced workspace locally.</p></section>';
      $('retryOpenWorkspace').onclick=()=>location.reload();
    }
    function workspaceSettings(){
      if(!LifeOSRuntime.ready){workspaceDialog('Recovery and device transfer','<p class="dialog-sub">Your normal workspace could not open. These tools work independently.</p><div class="workspace-backup-actions"><button class="button primary" data-action="workspace-import">Restore a backup</button><button class="button ghost" data-action="workspace-verify">Check a backup file</button><button class="button ghost" data-action="workspace-checkpoints">Recovery copies</button><button class="button ghost" data-action="workspace-rescue">Export stored rescue copy</button>'+(LifeOSRuntime.hasRecoveryDraft?'<button class="button ghost" data-action="workspace-export">Export unsaved changes</button>':'')+'</div>');return;}
      workspaceDialog('Your private workspace','<div class="workspace-settings"><span class="eyebrow">Life OS '+esc(window.LifeOSApp.version)+'</span><p class="dialog-sub">Your records stay in this browser on this device. Your future home server is optional; no connection is enabled.</p><div class="workspace-save-info"><strong>'+esc(LifeOSRuntime.error?'A save needs attention':LifeOSRuntime.saving?'Saving your changes':'Saved on this device')+'</strong><p>'+esc(LifeOSRuntime.error?.message||'Keep an encrypted copy outside this device, and check that you can open it.')+'</p>'+(LifeOSRuntime.error?'<button class="button primary" data-action="workspace-retry">Try saving again</button>':'')+'</div><div class="workspace-backup-actions"><button class="button primary" data-action="workspace-export">'+icon('shield')+' Create encrypted backup</button><button class="button ghost" data-action="workspace-verify">Check a backup file</button><button class="button ghost" data-action="workspace-import">'+icon('upload')+' Restore a backup</button><button class="button ghost" data-action="workspace-transfer">Move to a new phone</button><button class="button ghost" data-action="workspace-checkpoints">Recovery copies</button></div><h3>Under your control</h3><p>Your phone lock and device encryption protect local storage. The browser database has no separate app password. Backup files are encrypted before download. Keep the password safe: Life OS cannot reset it.</p><p>Recovery copies on this device help with a mistaken restore. They do not protect against a lost phone or cleared browser storage.</p><div id="workspaceCapacity" class="workspace-capacity">Checking local storage...</div><button class="text-button" data-action="workspace-persist">Request persistent device storage</button><details><summary>Services and previous records</summary><p>Local text capture and manual entry work offline. Garmin, receipt recognition, private voice processing and background reminders are not connected yet.</p><p>Previous-app records remain untouched and are included as an archive in encrypted backups. They have not been silently converted.</p></details><div class="dialog-footer"><button class="button ghost" data-action="workspace-update">Check for app updates</button><button class="button primary" data-action="close-dialog">Done</button></div></div>');
      if(navigator.storage?.estimate)navigator.storage.estimate().then(async info=>{const label=$('workspaceCapacity');if(!label)return;const persistent=navigator.storage.persisted?await navigator.storage.persisted():false;label.textContent=((info.usage||0)/1048576).toFixed(1)+' MB used'+(info.quota?' of about '+Math.round(info.quota/1048576)+' MB available':'')+'. '+(persistent?'Persistent storage granted.':'Persistent storage is not yet granted.');}).catch(()=>{if($('workspaceCapacity'))$('workspaceCapacity').textContent='Storage estimate unavailable.';});
    }
    function workspaceTransferDialog(){workspaceDialog('Take your record with you','<p class="dialog-sub">A complete transfer uses an encrypted file. No account or home server is required.</p><ol class="transfer-steps"><li><strong>On this phone</strong><p>Create an encrypted backup, then use Check a backup file to reopen the actual downloaded file with your password.</p></li><li><strong>On your new phone</strong><p>Open Life OS, choose Restore a backup in workspace settings, and select the encrypted file. Check its date and section counts before restoring.</p></li><li><strong>Check before retiring this phone</strong><p>Inspect recent workouts, meals, finances and ambitions on the new phone. Close and reopen the app to check persistence. Keep the old phone and your backup until you are satisfied.</p></li></ol><p class="workspace-form-help">A transfer replaces the destination workspace; it does not merge two independently edited phones. Stop recording on the old phone once you switch. Keep the backup password separately from the file.</p><div class="workspace-backup-actions"><button class="button primary" data-action="workspace-export">Create the backup</button><button class="button ghost" data-action="workspace-verify">Check downloaded file</button></div>');}
    function workspaceBackupDialog(rescue=false,checkpointId=''){workspaceDialog(rescue?'Save an encrypted rescue copy':'Create an encrypted backup','<form id="workspaceBackupForm" data-rescue="'+rescue+'" data-checkpoint="'+esc(checkpointId)+'"><p class="dialog-sub">'+(rescue?'This preserves the stored workspace exactly, even when it cannot be opened. A rescue file may require a compatible app or repair before restoration.':'All sections, historical revisions, drafts and the previous-app archive are included. The file is encrypted on this device.')+'</p><label>Backup password<input id="backupPassword" type="password" minlength="12" maxlength="1000" autocomplete="new-password" required></label><label class="gap-top">Repeat password<input id="backupPasswordAgain" type="password" minlength="12" maxlength="1000" autocomplete="new-password" required></label><p class="workspace-form-help">Use at least 12 characters. There is no password reset for this file.</p><div id="backupError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">Encrypt and download</button></div></form>');}
    function workspaceImportDialog(verifyOnly=false){pendingBackup=null;workspaceDialog(verifyOnly?'Check your backup file':'Restore an encrypted backup','<form id="workspaceImportForm" data-verify-only="'+verifyOnly+'"><p class="dialog-sub">'+(verifyOnly?'Reopen a downloaded file to check the password, integrity and all section records. This check does not replace your current workspace.':'First decrypt and validate the file. Your records stay in place until you review and confirm the restore.')+'</p><label>Life OS backup<input id="backupFile" type="file" accept=".lifeos,.json,application/json" required></label><label class="gap-top">Backup password<input id="restorePassword" type="password" maxlength="1000" autocomplete="off" required></label><div id="restoreError" class="error" role="alert"></div><div class="dialog-footer"><button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">Decrypt and check</button></div></form>');}
    async function workspaceReviewBackup(decoded,label,verifyOnly=false,encryptedFile=true){
      const checked=await LifeOSRuntime.verifyBackup(decoded);
      const inspection=verifyOnly||LifeOSRuntime.ready?null:await LifeOSRuntime.inspectRecovery();
      pendingBackup=verifyOnly?null:{backup:decoded,token:inspection?.token||null};
      workspaceDialog(verifyOnly?'Your backup passed its checks':'Review your restore','<p class="dialog-sub">'+esc(label)+'<br>Created '+esc(checked.exportedAt||'on an unknown date')+'.</p><div class="backup-check-pass">'+icon('shield')+' '+(encryptedFile?'Password, file integrity and all ':'All ')+checked.domainCount+' sections checked'+(encryptedFile?'.':'. This is a local checkpoint, not an encrypted backup file.')+'</div>'+backupSummary(decoded.workspace)+(decoded.workspace?.domains&&!Object.hasOwn(decoded.workspace.domains,'purchases')?'<p class="workspace-form-help">This older workspace predates connected purchases. Opening it adds an empty purchase section; its existing records are retained.</p>':'')+'<p class="workspace-form-help">Counts include retained corrections where labelled as versions. The file also retains libraries, plans, targets, links, drafts and any previous-app archive.</p>'+(verifyOnly?'<p class="gap-top">Your current records have not been replaced. Keep this file outside the phone and remember its password. You can use it to transfer to a compatible Life OS installation.</p>':'<p class="gap-top">This replaces the current workspace, including running clocks, with the backup. The existing stored workspace will be preserved as a local recovery copy first. This is a replacement, not a merge.</p>')+'<div id="restoreCommitError" class="error" role="alert"></div><div class="dialog-footer"><button class="button ghost" data-action="'+(verifyOnly?'workspace-transfer':'close-dialog')+'">'+(verifyOnly?'Device-transfer steps':'Keep current records')+'</button>'+(verifyOnly?'<button class="button primary" data-action="close-dialog">Done</button>':'<button class="button primary" data-action="workspace-restore-confirm">Restore these records</button>')+'</div>');
    }
    async function workspaceCheckpoints(){
      const entries=await LifeOSRuntime.listRecovery();
      workspaceDialog('Recovery copies on this device','<p class="dialog-sub">Recent saves keep rotating checkpoints. Replaced workspaces are kept as rescue copies. Each is checked before you can restore it.</p><p class="workspace-form-help">These copies share this device with your main record. Keep separate encrypted backups for loss or device transfer.</p><div class="checkpoint-list">'+entries.map(entry=>'<article><div><strong>'+esc(entry.kind==='rescue'?'Preserved before replacement':'Recent checkpoint')+'</strong><p>'+esc(entry.savedAt||entry.preservedAt||'Date unavailable')+(entry.revision?' · revision '+esc(entry.revision):'')+'</p></div><button class="button ghost" data-action="workspace-checkpoint" data-id="'+esc(entry.id)+'">Check and review</button></article>').join('')+(entries.length?'':'<p>No earlier stored workspace is available yet. A checkpoint is kept when saved records change.</p>')+'</div><div class="dialog-footer"><button class="button primary" data-action="close-dialog">Done</button></div>');
    }
    async function workspaceSubmit(event){
      const form=event.target;if(!['workspaceBackupForm','workspaceImportForm'].includes(form.id))return;event.preventDefault();if(backupBusy)return;backupBusy=true;
      const button=form.querySelector('button[type="submit"]'),error=$(form.id==='workspaceBackupForm'?'backupError':'restoreError');if(button)button.disabled=true;error.textContent='';
      try{
        if(form.id==='workspaceBackupForm'){
          const password=$('backupPassword').value;if(password!==$('backupPasswordAgain').value)throw new Error('The two passwords do not match.');
          const rescue=form.dataset.rescue==='true';
          const payload=rescue?await LifeOSRuntime.rescuePayload(form.dataset.checkpoint||undefined):LifeOSRuntime.backupPayload();
          if(!rescue)await LifeOSRuntime.verifyBackup(payload);
          const encrypted=await LifeOSVault.encrypt(payload,password),roundtrip=await LifeOSVault.decrypt(encrypted,password);
          if(JSON.stringify(roundtrip)!==JSON.stringify(payload))throw new Error('The encrypted backup could not be verified. No file was downloaded.');
          const blob=new Blob([JSON.stringify(encrypted)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.dataset.workspaceDownload='true';link.href=url;link.download='lifeos-'+(rescue?'rescue-':'')+lifeLocalDate()+'.lifeos';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
          workspaceDialog('Your encrypted file is ready','<p class="dialog-sub">The encrypted contents passed a round-trip check before download. Check your browser downloads to confirm that the file was saved.</p><p>'+(rescue?'This rescue copy preserves the stored record without changing it. Keep it and its password available while recovering the app.':'For a device transfer, now choose the actual downloaded file and check it with your password.')+'</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Done</button>'+(!rescue?'<button class="button primary" data-action="workspace-verify">Check downloaded file</button>':'')+'</div>');
        }else{
          const file=$('backupFile').files[0];if(!file)throw new Error('Choose a backup file.');if(file.size>LifeOSVault.LIMIT*1.4)throw new Error('This backup exceeds the supported file size.');
          const envelope=JSON.parse(await file.text()),raw=await LifeOSVault.decrypt(envelope,$('restorePassword').value);
          const decoded=raw.format==='lifeos-rescue/1'?LifeOSRuntime.backupFromRescue(raw):raw;
          await workspaceReviewBackup(decoded,file.name,form.dataset.verifyOnly==='true');
        }
      }catch(err){error.textContent=err.message||'The backup could not be processed.';}finally{backupBusy=false;if(button)button.disabled=false;}
    }
    async function workspaceAction(action,data={}){
      if(action==='workspace-settings'){workspaceSettings();return;}
      if(action==='workspace-transfer'){workspaceTransferDialog();return;}
      if(action==='workspace-export'){workspaceBackupDialog();return;}
      if(action==='workspace-rescue'){workspaceBackupDialog(true,data.id||'');return;}
      if(action==='workspace-import'){workspaceImportDialog();return;}
      if(action==='workspace-verify'){workspaceImportDialog(true);return;}
      if(action==='workspace-checkpoints'){await workspaceCheckpoints();return;}
      if(action==='workspace-checkpoint'){
        const entry=await LifeOSRuntime.readRecovery(data.id);if(!entry?.record)throw new Error('That recovery copy is unavailable.');
        try{await workspaceReviewBackup(LifeOSRuntime.backupFromRecord(entry.record,entry.record.savedAt),'Local recovery copy',false,false);}catch(error){workspaceDialog('This copy needs a compatible reader','<p class="dialog-sub">'+esc(error.message)+'</p><p>This copy is preserved. Export it encrypted to keep it available for recovery or a future compatible version.</p><div class="dialog-footer"><button class="button ghost" data-action="close-dialog">Keep it here</button><button class="button primary" data-action="workspace-rescue" data-id="'+esc(data.id)+'">Export encrypted copy</button></div>');}return;
      }
      if(action==='workspace-retry'){try{await LifeOSRuntime.retry();}finally{workspaceSettings();}return;}
      if(action==='workspace-persist'){const granted=navigator.storage?.persist?await navigator.storage.persist():false;showToast(granted?'Persistent device storage granted.':'The browser has not granted persistent storage. Keep regular backups.');workspaceSettings();return;}
      if(action==='workspace-update'){const registration=await navigator.serviceWorker?.getRegistration();if(registration){await registration.update();showToast(registration.waiting?'An update is ready. Use the Update ready button.':'Update check completed. New releases appear at the top when ready.');}else showToast('The offline worker is not registered yet. Reopen the app while online.');return;}
      if(action==='workspace-restore-confirm'&&pendingBackup&&!backupBusy){backupBusy=true;try{
        if(LifeOSRuntime.ready)await LifeOSRuntime.restoreBackup(pendingBackup.backup);else await LifeOSRuntime.recoverBackup(pendingBackup.backup,pendingBackup.token);
        pendingBackup=null;closeDialog();render();startWorkspaceClocks();showToast('Your record is restored. The previous workspace is kept in recovery copies.');
      }catch(error){if(!LifeOSRuntime.ready&&LifeOSRuntime.hasRecoveryDraft)renderWorkspaceRecovery(error);if($('restoreCommitError'))$('restoreCommitError').textContent=error.message;}finally{backupBusy=false;}}
    }

    function refreshWorkspaceDay(){const next=lifeLocalDate();if(next===TODAY)return;const previous=TODAY;TODAY=next;const monday=dateObj(next);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));WEEK=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});if(state.date===previous)state.date=TODAY;if(sleepView.end===previous)sleepView.end=TODAY;if(sleepView.selected===previous)sleepView.selected=TODAY;if(foodView.date===previous)foodView.date=TODAY;if(captureView.date===previous&&!captureView.draft)captureView.date=TODAY;if(!$('dialog').open)render();}
    async function registerOffline(){if(!('serviceWorker'in navigator))return;try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});let acceptedHere=false,needsReload=false;const reloadWhenSafe=async()=>{if(LifeOSRuntime.restoring||backupBusy){showToast('Finish the backup operation before opening the update.');return;}try{await LifeOSRuntime.flush();window.location.reload();}catch(error){workspaceStatus('error',error.message);}};const showUpdate=()=>{if(needsReload)return;if(registration.waiting){$('updateButton').hidden=false;$('updateButton').textContent='Update ready';$('updateButton').onclick=async()=>{try{if(LifeOSRuntime.restoring||backupBusy){showToast('Finish the backup operation before updating.');return;}await LifeOSRuntime.flush();acceptedHere=true;registration.waiting?.postMessage({type:'SKIP_WAITING'});}catch(error){workspaceStatus('error',error.message);}};}else{$('updateButton').hidden=true;$('updateButton').onclick=null;}};showUpdate();registration.addEventListener('updatefound',()=>{registration.installing?.addEventListener('statechange',showUpdate);});let hadController=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController){needsReload=true;$('updateButton').hidden=false;$('updateButton').textContent='Open new version';$('updateButton').onclick=reloadWhenSafe;if(acceptedHere)reloadWhenSafe();}else{$('updateButton').hidden=true;$('updateButton').onclick=null;}hadController=true;});await registration.update();}catch(error){if(LifeOSRuntime.ready&&!LifeOSRuntime.error)workspaceStatus('offline-warning',navigator.serviceWorker.controller?'Saved locally. Update check unavailable while offline.':'Saved locally. Offline installation needs an online retry.');}}
    let workspaceClocksStarted=false;
    function startWorkspaceClocks(){if(workspaceClocksStarted)return;workspaceClocksStarted=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWorkspaceDay();});setInterval(refreshWorkspaceDay,30000);setInterval(updateTimer,250);setInterval(()=>{updateWorkLive();updateTodayLive();},1000);}
    async function bootWorkspace(){registerOffline();const callbacks={snapshot:captureWorkspace,restore:restoreWorkspace,validate:payload=>LifeOSWorkspace.validate(payload),render,status:workspaceStatus};try{LifeOSRuntime.configureRecovery?.(callbacks);await LifeOSRuntime.start(callbacks);render();startWorkspaceClocks();}catch(error){workspaceStatus('error',error.message);renderWorkspaceRecovery(error);}}
    for(const type of ['click','input','change','submit','keydown'])document.addEventListener(type,event=>{const recoveryUI=event.target?.closest?.('[data-workspace-ui="true"]'),download=event.target?.dataset?.workspaceDownload==='true';if(!download&&(LifeOSRuntime.restoring||(backupBusy&&['click','submit'].includes(type))||(!LifeOSRuntime.ready&&!recoveryUI&&!['retryOpenWorkspace','updateButton','workspaceStatus'].includes(event.target?.id)))){event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('submit',workspaceSubmit);
    for(const type of ['click','input','change','submit'])document.addEventListener(type,()=>queueMicrotask(queueWorkspaceSave));
    window.addEventListener('beforeunload',event=>{if(LifeOSRuntime.ready&&LifeOSRuntime.saving){event.preventDefault();event.returnValue='';}});
    window.addEventListener('error',()=>{if(LifeOSRuntime.ready)workspaceStatus('error','Something went wrong. Open backups before reloading.');});
    window.LifeOSApp=Object.freeze({get version(){return 'v69';},snapshot:captureWorkspace,restore:async data=>LifeOSRuntime.restoreBackup({format:'lifeos-backup/2',workspace:data}),domains:()=>workspaceParts(),capture:CaptureDemo,captureTargets:CaptureTargetsDemo,commitCapture:commitCaptureDurably,preparePurchase,commitPurchase,preparePlanner,commitPlanner,save:()=>LifeOSRuntime.flush()});

    $('addEventButton').innerHTML=icon('plus');$('privacyNote').innerHTML=icon('shield')+'<p>A little more intention.<br>A record that stays yours.</p>';
    const initialRoute=window.location.hash.slice(1);if(nav.some(n=>n.id===initialRoute))state.route=initialRoute;
    window.addEventListener('hashchange',()=>{if(!LifeOSRuntime.ready||LifeOSRuntime.restoring||backupBusy)return;const route=window.location.hash.slice(1);if(nav.some(n=>n.id===route)&&route!==state.route){state.route=route;render();window.scrollTo({top:0,behavior:'instant'});}});
    bootWorkspace();
  })();
  
