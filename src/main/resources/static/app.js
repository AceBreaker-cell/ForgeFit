'use strict';

// One same-origin app: no tokens in localStorage, no external scripts, no frontend build step.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, data: null, csrf: null, authMode: 'login', chart: 'sessions', search: '', muscle: 'All', historySearch: '', historyRange: 'all', draft: null, restUntil: 0 };
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  dumbbell: '<path d="M4 8v8M7 5v14M17 5v14M20 8v8M7 12h10"/>',
  chart: '<path d="M4 4v16h16M8 15l4-5 4 2 5-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M12 6v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
  settings: '<path d="M12 8v.01"/><circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-3Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  flame: '<path d="M12 3c1 5 7 6 7 12a7 7 0 0 1-14 0c0-3 1-5 3-7 0 4 2 5 3 3 1-2 1-5 1-8Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  weight: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8a6 6 0 0 1 8 0l-4 4-4-4Z"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v6m-4 2h8"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m14 5 5 5M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  logout: '<path d="M9 3H4v18h5M9 12h12m-4-4 4 4-4 4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  shield: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.dumbbell}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value, decimals=0) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: decimals });
const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dateObj = date => new Date(`${date}T12:00:00`);
const dateLabel = date => dateObj(date).toLocaleDateString('en-US', { month:'short', day:'numeric', year: 'numeric' });
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate()+days); return d; };
const monday = (date=new Date()) => { const d=dateObj(localDay(date)); d.setDate(d.getDate() - (d.getDay()+6)%7); return d; };
const initials = name => name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
const route = () => ['overview','workouts','activity','progress','exercises','settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
const routeNames = { overview:'Overview', workouts:'My workouts', activity:'Activity', progress:'Progress', exercises:'Exercise library', settings:'Settings' };
const brand = () => '<a class="brand" href="#overview" aria-label="ForgeFit home"><img src="/assets/icon.svg" alt=""><span>forge<span>fit</span></span></a>';
const button = (label, action, symbol='plus', classes='', attrs='') => `<button type="button" class="button ${classes}" data-action="${action}" ${attrs}>${icon(symbol)}${label}</button>`;
const empty = (title, text, action='new-plan', label='Create a workout', symbol='dumbbell') => `<div class="empty">${icon(symbol)}<h3>${title}</h3><p>${text}</p>${action ? button(label,action,'plus','primary small') : ''}</div>`;
const help = text => `<span class="form-help">${text}</span>`;

async function csrf() { const response=await fetch('/api/auth/csrf',{cache:'no-store'}); if(!response.ok) throw new Error('Cannot connect to ForgeFit. Check that the Java server is running.'); state.csrf=await response.json(); }
async function api(path, options={}) {
  const method=options.method || 'GET'; const headers={...(options.headers || {})};
  if(method !== 'GET') { if(!state.csrf) await csrf(); headers[state.csrf.headerName]=state.csrf.token; }
  let body=options.body;
  if(body && !(body instanceof URLSearchParams)) { headers['Content-Type']='application/json'; body=JSON.stringify(body); }
  let response;
  try { response=await fetch('/api'+path,{...options,method,body,headers,cache:'no-store'}); }
  catch { throw new Error('Cannot reach ForgeFit. Check your connection and that the Java server is running.'); }
  if(!response.ok) {
    const error=await response.json().catch(()=>({message:'The request failed. Please try again.'}));
    if(response.status===401 && !path.startsWith('/auth/')) { state.user=null; state.data=null; $('#modal').close(); renderAuth(); }
    const ex=new Error(error.errors ? error.message+'\n'+error.errors.join('\n') : error.message); ex.status=response.status; throw ex;
  }
  return response.status===204 ? null : response.json();
}
async function refresh() { state.data=await api('/data'); state.user=state.data.user; render(); }
let toastTimer;
function toast(message, error=false) { const el=$('#toast'); clearTimeout(toastTimer); el.textContent=message; el.className=`show${error?' error':''}`; toastTimer=setTimeout(()=>el.className='',5000); }
function renderAuth() {
  const signup=state.authMode==='register'; document.title='ForgeFit · Your training, in focus';
  $('#app').innerHTML=`<div class="auth"><section class="auth-story">${brand()}<div class="auth-orbit"></div><div class="auth-pitch"><div class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>Built by you.<br><em>One rep at<br>a time.</em></h1><p>A little structure. A lot of progress. Your personal space to plan, train, and see how far you’ve come.</p><div class="auth-features"><span>${icon('check')}Intentional workouts</span><span>${icon('check')}Every set counts</span><span>${icon('check')}Progress you can see</span></div></div><div class="auth-footer"><span>THE WORK IS YOURS. OWN IT.</span><span>© Albatany 2026.</span></div></section><main id="content" class="auth-main"><div class="auth-box"><div class="eyebrow">YOUR TRAINING, IN FOCUS</div><h2>${signup?'Make room for progress.':'Good to have you back.'}</h2><p>${signup?'Create your account. Build your first workout.':'Your next great session starts here.'}</p><div class="auth-tabs" role="group" aria-label="Account access"><button type="button" data-action="auth-login" class="${!signup?'active':''}">Sign in</button><button type="button" data-action="auth-register" class="${signup?'active':''}">Create account</button></div><form data-form="auth">${signup?'<div class="form-group"><label for="displayName">Your name</label><input id="displayName" name="displayName" autocomplete="name" placeholder="How should we call you?" maxlength="60" required></div>':''}<div class="form-group"><label for="email">Email address</label><input type="email" id="email" name="email" autocomplete="username" placeholder="you@example.com" maxlength="254" required></div><div class="form-group"><label for="password">Password</label><div class="password-wrap"><input type="password" id="password" name="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?'At least 10 characters':'Enter your password'}" ${signup?'minlength="10" maxlength="72"':''} required><button type="button" class="icon-button" data-action="toggle-password" aria-label="Show password">${icon('eye')}</button></div>${signup?help('10–72 characters. Use a unique password.'):''}</div><div class="form-error" role="alert"></div><button class="button primary full" type="submit">${signup?'Create my account':'Let’s get to work'}${icon('arrow')}</button></form><p class="auth-note">${icon('shield').replace('class="icon"','class="icon auth-shield"')}Your training data stays with your account.<br>No ads. No subscriptions. Just your progress.</p></div></main></div>`;
}
function stat(label, value, unit, note, symbol) { return `<div class="panel stat"><div class="stat-top">${label}${icon(symbol)}</div><div class="stat-value">${value}${unit?`<em>${unit}</em>`:''}</div><div class="stat-foot">${note}</div></div>`; }
function head(title, description, actions='') { return `<header class="page-head"><div><div class="eyebrow">${route()==='overview'?'MAKE EVERY REP MATTER':'YOUR TRAINING SPACE'}</div><h1>${title}</h1><p>${description}</p></div>${actions?`<div class="head-actions">${actions}</div>`:''}</header>`; }
function render() {
  if(!state.user || !state.data) return;
  const current=route(); document.title=`${routeNames[current]} | ForgeFit`;
  const nav=[['overview','grid'],['workouts','dumbbell'],['activity','clock'],['progress','chart'],['exercises','book']];
  $('#app').innerHTML=`<aside class="sidebar">${brand()}<div class="nav-label">WORKSPACE</div><nav class="nav" aria-label="Main navigation">${nav.map(([r,i])=>`<a href="#${r}" ${r===current?'aria-current="page"':''} class="${r===current?'active':''}">${icon(i)}${routeNames[r]}${r===current?'<span class="nav-dot"></span>':''}</a>`).join('')}</nav><div class="nav-label">PREFERENCES</div><nav class="nav" aria-label="Preferences"><a href="#settings" class="${current==='settings'?'active':''}" ${current==='settings'?'aria-current="page"':''}>${icon('settings')}Settings</a></nav><div class="sidebar-bottom"><div class="sidebar-quote">${icon('bolt')}<p>Consistency is<br>your superpower.</p><small>Keep showing up for yourself.</small></div><div class="profile-mini"><div class="avatar">${esc(initials(state.user.displayName))}</div><div class="who"><strong>${esc(state.user.displayName)}</strong><small>Your personal training space</small></div><button class="icon-button" data-action="logout" aria-label="Sign out">${icon('logout')}</button></div></div></aside><button class="menu-scrim" data-action="close-menu" aria-label="Close menu"></button><div class="main"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open menu">${icon('menu')}</button><span>My workspace</span><span>/</span><strong>${routeNames[current]}</strong></div><div class="top-actions"><span class="today">${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>${button('Log weight','weight','plus','ghost small')}<div class="avatar" aria-hidden="true">${esc(initials(state.user.displayName))}</div></div></header><main id="content" class="content">${state.draft?`<div class="active-banner"><div><p>Workout in progress · ${esc(state.draft.name)}</p><small>Unsaved draft on this browser tab</small></div>${button('Resume','resume','arrow','primary small')}</div>`:''}${({overview:overview,workouts:workouts,activity:activity,progress:progress,exercises:exerciseLibrary,settings:settings}[current])()}<footer class="footnote"><span>${icon('dumbbell')}FORGEFIT · BUILT FOR THE LONG RUN</span><span>Progress over perfection.</span></footer></main></div>`;
}
function weekly() {
  const first=addDays(monday(),-49);
  return Array.from({length:8},(_,i)=>{const start=addDays(first,i*7), end=addDays(start,7); const sessions=state.data.sessions.filter(s=>s.completedOn>=localDay(start)&&s.completedOn<localDay(end));return {label:start.toLocaleDateString('en-US',{month:'short',day:'numeric'}),sessions:sessions.length,volume:sessions.reduce((sum,s)=>sum+Number(s.volume),0)};});
}
function streak() {
  const weeks=new Set(state.data.sessions.map(s=>localDay(monday(dateObj(s.completedOn)))));
  let cursor=monday(), count=0; if(!weeks.has(localDay(cursor))) cursor=addDays(cursor,-7);
  while(weeks.has(localDay(cursor))) { count++; cursor=addDays(cursor,-7); } return count;
}
function bars(metric=state.chart) {
  const data=weekly(), max=Math.max(1,...data.map(d=>d[metric])), height=137, width=520;
  return `<svg class="chart" viewBox="0 0 ${width} 194" role="img" aria-label="${metric==='sessions'?'Workout count':'Lifted volume in kilograms'} for eight weeks: ${data.map(d=>`${d.label}: ${number(d[metric])}`).join('; ')}">${[0,.5,1].map(frac=>`<line class="gridline" x1="36" x2="518" y1="${12+height*(1-frac)}" y2="${12+height*(1-frac)}"/><text x="0" y="${16+height*(1-frac)}">${metric==='volume'?number(max*frac/1000,1)+'k':number(max*frac,1)}</text>`).join('')}${data.map((d,i)=>{const h=d[metric]/max*height;return `<rect class="bar ${i===7?'latest':''}" x="${47+i*59}" y="${12+height-h}" width="32" height="${h}" rx="5"><title>${d.label}: ${number(d[metric])} ${metric==='volume'?'kg':'sessions'}</title></rect><text text-anchor="middle" x="${63+i*59}" y="175">${d.label}</text>`;}).join('')}</svg>`;
}
function sessionTable(sessions) {
  if(!sessions.length) return empty('Your story starts with one session.','Build a workout, complete your sets, and save it here.');
  return `<div class="table-wrap"><table><thead><tr><th>WORKOUT</th><th>DATE</th><th>DURATION</th><th>VOLUME</th><th><span class="sr-only">Details</span></th></tr></thead><tbody>${sessions.map(s=>`<tr><td><div class="session-name"><div class="session-mark">${icon('dumbbell')}</div><div><strong>${esc(s.name)}</strong><small>${s.sets.length} sets · ${new Set(s.sets.map(t=>t.exerciseId)).size} exercises</small></div></div></td><td class="muted">${dateLabel(s.completedOn)}</td><td>${s.durationMinutes} min</td><td>${number(s.volume)} <small>kg</small></td><td><button type="button" class="icon-button" data-action="session-detail" data-id="${s.id}" aria-label="View ${esc(s.name)} on ${dateLabel(s.completedOn)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function overview() {
  const {sessions,plans,weights}=state.data, firstName=esc(state.user.displayName.split(' ')[0]);
  const weekStart=localDay(monday()), count=sessions.filter(s=>s.completedOn>=weekStart).length;
  const thisMonth=localDay().slice(0,7), month=sessions.filter(s=>s.completedOn.startsWith(thisMonth));
  const volume=month.reduce((sum,s)=>sum+Number(s.volume),0), minutes=month.reduce((sum,s)=>sum+s.durationMinutes,0);
  const currentWeight=weights.at(-1), s=streak();
  const next=plans.length ? plans[(sessions.length)%plans.length] : null;
  return `${head(`Let’s build momentum, ${firstName}.`,'A little stronger. A little further. Every single session.',button('New workout','new-plan','plus','primary'))}${!sessions.length&&!state.user.demoLoaded?`<div class="callout demo-callout"><p><strong>Make yourself at home.</strong><br>Start fresh or explore ForgeFit with clearly labeled sample workouts.</p>${button('Add sample data','demo','bolt','small')}</div>`:''}<div class="hero-grid"><section class="hero"><div class="eyebrow">THIS IS YOUR TIME</div><h2>Show up.<br>Get stronger.</h2><p>You bring the effort. We’ll help you keep track of every step forward.</p>${button(plans.length?'Start a workout':'Build your first workout',plans.length?'choose-workout':'new-plan','arrow')}<svg class="hero-art" viewBox="0 0 260 260" aria-hidden="true"><circle cx="154" cy="130" r="105" fill="none" stroke="#afcd62"/><circle cx="154" cy="130" r="84" fill="none" stroke="#afcd62"/><path d="M58 132h140" stroke="#4c642c" stroke-width="18"/><rect x="54" y="99" width="20" height="68" rx="7" fill="#73933e"/><rect x="72" y="76" width="30" height="113" rx="8" fill="#314b21"/><path d="M93 79v106" stroke="#526d30" stroke-width="7"/><rect x="169" y="76" width="30" height="113" rx="8" fill="#314b21"/><path d="M191 81v103" stroke="#526d30" stroke-width="6"/><rect x="198" y="99" width="20" height="68" rx="7" fill="#73933e"/><path d="m214 51 6-12m-5 15 12-2" stroke="#58792b" stroke-width="3" stroke-linecap="round"/></svg></section><section class="panel goal-panel"><div class="panel-head"><h2>Your weekly goal</h2><a href="#settings" class="link-button">Edit ${icon('arrow')}</a></div><div class="goal-main"><div class="ring-wrap"><svg class="goal-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="50"/><circle class="value" cx="60" cy="60" r="50" stroke-dasharray="${Math.min(1,count/state.user.weeklyGoal)*314.16} 314.16"/></svg><div class="goal-number">${count}<small>of ${state.user.weeklyGoal} workouts</small></div></div><div class="goal-copy"><h3>${count>=state.user.weeklyGoal?'Goal, meet effort.':'Keep the rhythm.'}</h3><p>${count>=state.user.weeklyGoal?'You reached this week’s goal.':`${state.user.weeklyGoal-count} more session${state.user.weeklyGoal-count===1?'':'s'} to your goal.`}<br>You’re building something good.</p></div></div><div class="day-strip">${Array.from({length:7},(_,i)=>{const d=localDay(addDays(monday(),i)),done=sessions.some(s=>s.completedOn===d);return `<div class="day ${done?'done':''} ${d===localDay()?'now':''}" title="${d}: ${done?'Workout logged':'No workout'}">${['M','T','W','T','F','S','S'][i]}<span>${done?icon('check'):dateObj(d).getDate()}</span></div>`;}).join('')}</div></section></div><div class="stats">${stat('Workouts this month',month.length,'',`${sessions.length} sessions in your journal`,'dumbbell')}${stat('Volume this month',number(volume/1000,1),'k kg','Sum of weight × completed reps','chart')}${stat('Training time',number(minutes/60,1),'hrs','Time logged this month','clock')}${stat('Active week streak',s,'weeks',s?'<strong>Keep showing up.</strong> You’ve got this.':'Your first week starts with a session.','flame')}</div><div class="dashboard-middle"><section class="panel"><div class="panel-head"><div><h2>The work adds up</h2><p>Your last 8 weeks, one session at a time</p></div><div class="segmented" role="group" aria-label="Chart metric"><button data-action="chart-sessions" class="${state.chart==='sessions'?'active':''}">Sessions</button><button data-action="chart-volume" class="${state.chart==='volume'?'active':''}">Volume</button></div></div><div class="chart-summary"><strong>${number(weekly().reduce((sum,d)=>sum+d[state.chart],0))}</strong><span>${state.chart==='sessions'?'workouts completed':'kg of logged volume'}</span></div>${bars()}</section><section class="panel"><div class="panel-head"><h2>Ready when you are</h2><span class="badge neutral">YOUR PLANS</span></div>${next?`<div class="plan-pick"><span class="badge">${esc(next.focus)} DAY</span><h3>${esc(next.name)}</h3><p>A plan you saved. Pick your pace.</p><div class="plan-meta"><span>${icon('dumbbell')}${next.exercises.length} exercises</span><span>${icon('target')}${next.exercises.reduce((sum,e)=>sum+e.sets,0)} sets</span></div><div class="pick-bottom"><div class="mini-exercises">${[0,1,2].map(()=>`<span class="mini-disc">${icon('dumbbell')}</span>`).join('')}Your next session</div>${button('','start-plan','arrow','primary',`data-id="${next.id}" aria-label="Start ${esc(next.name)}"`)}</div></div>`:empty('Build your starting point.','Choose exercises and make a plan that’s yours.')}</section></div><section class="panel"><div class="panel-head"><div><h2>Recent activity</h2><p>Small efforts. A stronger story.</p></div><a href="#activity" class="link-button">View all ${icon('arrow')}</a></div>${sessionTable(sessions.slice(0,4))}</section>`;
}
function workouts() {
  return `${head('Your plan. Your pace.','Build a routine you’ll want to come back to.',button('New workout','new-plan','plus','primary'))}<div class="plans-grid">${state.data.plans.map(p=>`<article class="panel plan-card"><div class="inline-label"><span class="badge">${esc(p.focus)}</span><div class="actions"><button class="icon-button" data-action="edit-plan" data-id="${p.id}" aria-label="Edit ${esc(p.name)}">${icon('edit')}</button><button class="icon-button" data-action="copy-plan" data-id="${p.id}" aria-label="Duplicate ${esc(p.name)}">${icon('copy')}</button></div></div><div class="card-symbol">${icon(p.focus==='Legs'?'bolt':'dumbbell')}</div><h2>${esc(p.name)}</h2><div class="plan-meta"><span>${p.exercises.length} exercises</span><span>${p.exercises.reduce((n,e)=>n+e.sets,0)} sets</span></div>${p.notes?`<p>${esc(p.notes)}</p>`:''}<ul class="plan-list">${p.exercises.map(e=>`<li>${esc(e.name)}<span>${e.sets} × ${e.reps}</span></li>`).join('')}</ul><div class="actions">${button('Start workout','start-plan','arrow','primary',`data-id="${p.id}"`)}<button class="icon-button" data-action="delete-plan" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">${icon('trash')}</button></div></article>`).join('')}<button class="panel new-card" data-action="new-plan"><span>${icon('plus')}<strong>Make it your own</strong><small>Create a new workout</small></span></button></div>`;
}
function filteredSessions() {
  const cutoff=state.historyRange==='all'?'0000-00-00':localDay(addDays(new Date(),1-Number(state.historyRange)));
  return state.data.sessions.filter(s=>s.completedOn>=cutoff && s.name.toLowerCase().includes(state.historySearch.toLowerCase()));
}
function activity() {
  return `${head('The sessions that made you.','A record of showing up. Every set, every rep.',button('Start workout','choose-workout','plus','primary'))}<div class="toolbar"><div class="search">${icon('search')}<input id="history-search" aria-label="Search workout history" placeholder="Find a workout…" value="${esc(state.historySearch)}"></div><select id="history-range" class="range-select" aria-label="Activity date range">${[['all','All time'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days']].map(([v,t])=>`<option value="${v}" ${state.historyRange===v?'selected':''}>${t}</option>`).join('')}</select></div><section class="panel" id="history-results">${historyResults()}</section>`;
}
function historyResults() { const sessions=filteredSessions(); return `<div class="panel-head"><h2>Workout journal</h2><span class="badge neutral">${sessions.length} SESSION${sessions.length===1?'':'S'}</span></div>${sessions.length?sessionTable(sessions):empty('No sessions here yet.','Try a different filter, or start your next workout.','choose-workout','Start a workout','clock')}`; }
function weightChart() {
  const weights=state.data.weights;
  if(!weights.length) return empty('Your progress, beyond the gym.','Add a weigh-in to start your trend.','weight','Log your first weight','weight');
  const min=Math.min(...weights.map(w=>Number(w.weightKg)))-.8, max=Math.max(...weights.map(w=>Number(w.weightKg)))+.8;
  const first=dateObj(weights[0].measuredOn).getTime(), span=Math.max(86400000,dateObj(weights.at(-1).measuredOn).getTime()-first);
  const points=weights.map(w=>({x:48+(dateObj(w.measuredOn).getTime()-first)/span*460,y:151-(Number(w.weightKg)-min)/(max-min)*130,w}));
  const line=points.map(p=>`${p.x},${p.y}`).join(' '), area=`48,151 ${line} ${points.at(-1).x},151`;
  return `<svg class="chart" viewBox="0 0 530 190" role="img" aria-label="Weight in kilograms: ${weights.map(w=>`${w.measuredOn}: ${number(w.weightKg,2)}`).join('; ')}"><defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d6fb79" stop-opacity=".20"/><stop offset="100%" stop-color="#d6fb79" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(f=>`<line class="gridline" x1="45" x2="515" y1="${21+f*130}" y2="${21+f*130}"/><text x="0" y="${25+f*130}">${number(max-f*(max-min),1)}</text>`).join('')}<polygon points="${area}" fill="url(#weight-fill)"/><polyline points="${line}" fill="none" stroke="#d6fb79" stroke-width="2.5" stroke-linejoin="round"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#d6fb79" stroke="#191f1b" stroke-width="2"><title>${dateLabel(p.w.measuredOn)}: ${number(p.w.weightKg,2)} kg</title></circle>`).join('')}<text x="45" y="177">${dateLabel(weights[0].measuredOn)}</text>${weights.length>1?`<text x="515" y="177" text-anchor="end">${dateLabel(weights.at(-1).measuredOn)}</text>`:''}</svg>`;
}
function records() {
  const map=new Map();
  [...state.data.sessions].reverse().forEach(s=>s.sets.forEach(set=>{const old=map.get(set.exerciseId); if(!old||Number(set.weightKg)>Number(old.weightKg)||(Number(set.weightKg)===Number(old.weightKg)&&set.reps>old.reps)) map.set(set.exerciseId,{...set,date:s.completedOn});}));
  return [...map.values()].sort((a,b)=>Number(b.weightKg)-Number(a.weightKg));
}
function progress() {
  const weights=state.data.weights, first=weights[0], last=weights.at(-1), change=last&&first?Number(last.weightKg)-Number(first.weightKg):0;
  const prs=records();
  return `${head('Proof of your progress.','Look back. See the work. Keep going.',button('Log weight','weight','plus','primary'))}<div class="stats">${stat('Latest weight',last?number(last.weightKg,2):'—','kg',last?dateLabel(last.measuredOn):'Add your first weigh-in','weight')}${stat('Weight change',weights.length>1?(change>0?'+':'')+number(change,2):'—','kg','Latest minus your first weigh-in','chart')}${stat('Your target',state.user.targetWeight?number(state.user.targetWeight,2):'—','kg','Set a personal target in Settings','target')}${stat('Total sessions',state.data.sessions.length,'',`${number(state.data.sessions.reduce((n,s)=>n+s.sets.length,0))} completed sets`,'trophy')}</div><div class="two-col"><div class="stack"><section class="panel"><div class="panel-head"><div><h2>Your weight over time</h2><p>One data point doesn’t tell the whole story.</p></div><span class="badge neutral">KG</span></div>${weightChart()}</section><section class="panel"><div class="panel-head"><h2>Weigh-in history</h2><span class="badge neutral">${weights.length} ENTRIES</span></div><div class="data-list">${weights.length?[...weights].reverse().map(w=>`<div class="weight-line"><div>${dateLabel(w.measuredOn)}<small>Body weight</small></div><span>${number(w.weightKg,2)} kg</span><button class="icon-button" data-action="edit-weight" data-id="${w.id}" aria-label="Edit weight on ${dateLabel(w.measuredOn)}">${icon('edit')}</button><button class="icon-button" data-action="delete-weight" data-id="${w.id}" aria-label="Delete weight on ${dateLabel(w.measuredOn)}">${icon('trash')}</button></div>`).join(''):'<p class="note">No weigh-ins yet. Your first entry starts the trend.</p>'}</div></section></div><section class="panel"><div class="panel-head"><div><h2>Personal records</h2><p>Your heaviest logged set for each exercise</p></div>${icon('trophy')}</div><div class="pr-list">${prs.length?prs.map(p=>`<div class="pr-row"><div class="session-mark">${icon('dumbbell')}</div><div><strong>${esc(p.name)}</strong><small>${p.reps} reps · ${dateLabel(p.date)}</small></div><div class="pr-weight">${number(p.weightKg,2)}<small>kg</small></div></div>`).join(''):'<p class="note">Your first completed workout will add your starting records here.</p>'}</div><p class="note record-note">Records use external load, with reps as the tie-breaker. Bodyweight and assisted exercises aren’t directly comparable to weighted lifts.</p></section></div>`;
}
function exerciseResults() {
  const list=state.data.exercises.filter(e=>(state.muscle==='All'||e.muscle===state.muscle)&&`${e.name} ${e.equipment}`.toLowerCase().includes(state.search.toLowerCase()));
  return list.length?`<div class="exercise-grid">${list.map(e=>`<article class="panel exercise-card"><div class="exercise-top">${icon('dumbbell')}<span class="badge neutral">${esc(e.equipment)}</span></div><h3>${esc(e.name)}</h3><span class="badge">${esc(e.muscle)}</span><p>${esc(e.description)}</p></article>`).join('')}</div>`:empty('No matching exercises.','Try a different name, equipment, or muscle group.',null,'','search');
}
function exerciseLibrary() {
  return `${head('Know your next move.','24 exercises. Find your favorites and add them to your plans.')}<div class="toolbar"><div class="search">${icon('search')}<input id="exercise-search" aria-label="Search exercises" placeholder="Search exercises or equipment…" value="${esc(state.search)}"></div></div><div class="chips muscle-chips" role="group" aria-label="Filter by muscle">${['All','Chest','Back','Legs','Shoulders','Arms','Core','Full body'].map(m=>`<button class="chip ${state.muscle===m?'active':''}" data-action="muscle" data-muscle="${m}">${m}</button>`).join('')}</div><div id="exercise-results">${exerciseResults()}</div>`;
}
function settings() {
  return `${head('Make this space yours.','Your profile, your goals, your data.')}<section class="panel settings-panel"><div class="panel-head"><div><h2>Profile & goals</h2><p>A weekly goal is a direction, not a deadline.</p></div>${icon('settings')}</div><form data-form="profile"><div class="form-grid"><div class="form-group"><label for="profile-name">Your name</label><input id="profile-name" name="displayName" value="${esc(state.user.displayName)}" maxlength="60" required></div><div class="form-group"><label for="profile-email">Email</label><input id="profile-email" value="${esc(state.user.email)}" readonly></div></div><div class="form-grid"><div class="form-group"><label for="weekly-goal">Workouts per week</label><input id="weekly-goal" type="number" name="weeklyGoal" min="1" max="7" value="${state.user.weeklyGoal}" required></div><div class="form-group"><label for="target-weight">Target weight · kg</label><input id="target-weight" type="number" name="targetWeight" min="20" max="500" step="0.01" value="${state.user.targetWeight ?? ''}" placeholder="Optional">${help('An optional goal you choose for yourself.')}</div></div><div class="form-error" role="alert"></div><button class="button primary" type="submit">Save changes ${icon('check')}</button></form></section><section class="panel settings-panel"><h2>Your data, in your hands</h2><p>Download a JSON copy of your profile, plans, sessions, and weigh-ins. Passwords are never included. Export is for backup and analysis; this version does not import JSON.</p>${button('Export my data','export','download','ghost')}</section><section class="panel settings-panel"><h2>A little inspiration</h2><p>Add sample plans, 20 sample sessions, and 8 sample weigh-ins to explore the dashboard. These become part of this account’s records. For a clean personal journal, use a separate demo account.</p>${state.user.demoLoaded?'<span class="badge">Sample data added to this account</span>':button('Add sample data','demo','bolt','ghost')}</section><section class="panel settings-panel"><h2>Take your journal with you</h2><p>ForgeFit works in a mobile browser. When your server uses HTTPS, use your browser’s Install app or Add to Home Screen option. Training data needs a connection to your server; the app does not log workouts offline.</p><p class="note">All weights use kilograms. Training plans are your own records, not personalized coaching.</p></section>`;
}

function openModal(title, subtitle, body) {
  const dialog=$('#modal');
  dialog.innerHTML=`<div class="modal-head"><div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
  if(!dialog.open) dialog.showModal();
}
function planRow(e={exerciseId:1,sets:3,reps:10,restSeconds:90}) {
  return `<div class="builder-row"><select name="exerciseId" aria-label="Exercise">${state.data.exercises.map(x=>`<option value="${x.id}" ${x.id===Number(e.exerciseId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select><input type="number" name="sets" aria-label="Number of sets" value="${e.sets}" min="1" max="10" required><input type="number" name="reps" aria-label="Reps per set" value="${e.reps}" min="1" max="100" required><input type="number" name="restSeconds" aria-label="Rest in seconds" value="${e.restSeconds}" min="0" max="600" required><button type="button" class="icon-button" data-action="remove-exercise" aria-label="Remove exercise">${icon('close')}</button></div>`;
}
function planForm(id=null, copy=false) {
  const original=state.data.plans.find(p=>p.id===id);
  const p=original?{...original,name:copy?`${original.name.slice(0,72)} (copy)`:original.name}:{name:'',focus:'Full body',notes:'',exercises:[{exerciseId:1,sets:3,reps:10,restSeconds:90}]};
  openModal(original&&!copy?'Refine your workout.':'Build your next session.','Choose your movements. Make the plan your own.',`<form data-form="plan" data-id="${original&&!copy?original.id:''}"><div class="form-grid"><div class="form-group"><label for="plan-name">Workout name</label><input id="plan-name" name="name" maxlength="80" required value="${esc(p.name)}" placeholder="e.g. Upper body · strength"></div><div class="form-group"><label for="plan-focus">Training focus</label><select id="plan-focus" name="focus">${['Push','Pull','Legs','Upper','Lower','Full body','Custom'].map(f=>`<option ${f===p.focus?'selected':''}>${f}</option>`).join('')}</select></div></div><div class="label">Your exercises</div><div class="builder-header"><span>MOVEMENT</span><span>SETS</span><span>REPS</span><span>REST (s)</span><span></span></div><div class="builder-rows">${p.exercises.map(planRow).join('')}</div>${button('Add exercise','add-exercise','plus','ghost small')}<div class="form-group plan-notes"><label for="plan-notes">Notes · optional</label><textarea id="plan-notes" name="notes" maxlength="1000" placeholder="Anything you want to remember for this session">${esc(p.notes)}</textarea></div><div class="form-error" role="alert"></div><div class="modal-footer">${button('Cancel','close-modal','close','ghost')}<button class="button primary" type="submit">Save workout ${icon('check')}</button></div></form>`);
}
function chooseWorkout() {
  if(state.draft) return workoutModal();
  if(!state.data.plans.length) return planForm();
  openModal('What are we training?','Pick a workout to start your next session.',`<div class="stack">${state.data.plans.map(p=>`<div class="workout-choice"><div><span class="badge">${esc(p.focus)}</span><h3>${esc(p.name)}</h3><p class="note">${p.exercises.length} exercises · ${p.exercises.reduce((n,e)=>n+e.sets,0)} sets</p></div>${button('Start','start-plan','arrow','primary small',`data-id="${p.id}"`)}</div>`).join('')}</div>`);
}
function draftKey() { return `forgefit-draft-${state.user.id}`; }
function saveDraft() { try { if(state.draft) sessionStorage.setItem(draftKey(),JSON.stringify(state.draft)); else sessionStorage.removeItem(draftKey()); } catch { /* Session storage can be unavailable in privacy modes; in-memory logging still works. */ } }
function loadDraft() { try { const d=JSON.parse(sessionStorage.getItem(draftKey())||'null'); state.draft=d&&d.version===1&&Array.isArray(d.groups)?d:null; } catch { state.draft=null; } }
function startPlan(id) {
  if(state.draft) { toast('Resume or discard your current workout before starting another.'); return workoutModal(); }
  const plan=state.data.plans.find(p=>p.id===id); if(!plan) return;
  const last=state.data.sessions;
  state.draft={version:1,name:plan.name,completedOn:localDay(),notes:'',startedAt:Date.now(),durationMinutes:'',groups:plan.exercises.map(e=>{
    const previous=last.flatMap(s=>s.sets).find(set=>set.exerciseId===e.exerciseId);
    return {exerciseId:e.exerciseId,name:e.name,restSeconds:e.restSeconds,sets:Array.from({length:e.sets},()=>({reps:e.reps,weightKg:previous?Number(previous.weightKg):0,done:false}))};
  })}; state.restUntil=0; saveDraft(); render(); workoutModal();
}
function workoutModal() {
  const d=state.draft; if(!d) return;
  openModal('One set at a time.','Check off the sets you complete. Only checked sets will be saved.',`<form data-form="workout"><div class="workout-info"><div><small>SESSION TIME</small><div class="elapsed" id="elapsed">00:00</div></div><div class="rest-box"><output id="rest-count" aria-label="Rest timer">Ready</output>${button('Rest 90s','rest','clock','ghost small')}</div></div><div class="form-grid"><div class="form-group"><label for="session-name">Session name</label><input id="session-name" name="name" data-draft-field="name" maxlength="80" value="${esc(d.name)}" required></div><div class="form-group"><label for="session-date">Session date</label><input id="session-date" name="completedOn" data-draft-field="completedOn" type="date" max="${localDay()}" value="${d.completedOn}" required></div></div>${d.groups.map((g,gi)=>`<section class="log-exercise"><h3>${esc(g.name)}</h3><small>${g.restSeconds}s rest · log external load in kg</small><div class="set-header"><span>SET</span><span>WEIGHT (kg)</span><span>REPS</span><span>DONE</span></div>${g.sets.map((s,si)=>`<div class="set-row ${s.done?'completed':''}"><span>${si+1}</span><input type="number" min="0" max="1500" step="0.01" value="${s.weightKg}" data-set-field="weightKg" data-group="${gi}" data-set="${si}" aria-label="${esc(g.name)} set ${si+1} weight" required><input type="number" min="1" max="100" step="1" value="${s.reps}" data-set-field="reps" data-group="${gi}" data-set="${si}" aria-label="${esc(g.name)} set ${si+1} reps" required><input type="checkbox" data-set-field="done" data-group="${gi}" data-set="${si}" aria-label="Complete ${esc(g.name)} set ${si+1}" ${s.done?'checked':''}></div>`).join('')}</section>`).join('')}<div class="form-grid"><div class="form-group"><label for="session-duration">Duration · minutes</label><input id="session-duration" name="durationMinutes" data-draft-field="durationMinutes" type="number" min="1" max="600" value="${d.durationMinutes}" placeholder="Auto from session timer">${help('Leave empty to use elapsed time (minimum 1 minute).')}</div><div class="form-group"><label for="session-notes">How did it feel? · optional</label><textarea id="session-notes" name="notes" data-draft-field="notes" maxlength="1000" placeholder="A good day to show up.">${esc(d.notes)}</textarea></div></div><div class="form-error" role="alert"></div><div class="modal-footer">${button('Discard','discard-workout','trash','ghost')}<button class="button primary" type="submit">Finish & save ${icon('check')}</button></div></form>`); tick();
}
function tick() {
  if(!state.draft) return;
  const elapsed=Math.max(0,Math.floor((Date.now()-state.draft.startedAt)/1000));
  const el=$('#elapsed'); if(el) el.textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
  const rest=$('#rest-count');
  if(rest) { const seconds=Math.max(0,Math.ceil((state.restUntil-Date.now())/1000)); rest.textContent=seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Ready'; }
}
function weightForm(id=null) {
  const w=state.data.weights.find(w=>w.id===id);
  openModal(w?'Update your weigh-in.':'A quick check-in.','One entry per day. Saving the same date updates that entry.',`<form data-form="weight"><div class="form-grid"><div class="form-group"><label for="weight-date">Date</label><input id="weight-date" name="measuredOn" type="date" max="${localDay()}" value="${w?.measuredOn||localDay()}" ${w?'readonly':''} required></div><div class="form-group"><label for="weight-kg">Body weight · kg</label><input id="weight-kg" name="weightKg" type="number" min="20" max="500" step="0.01" placeholder="e.g. 75.5" value="${w?.weightKg||''}" required></div></div><div class="form-error" role="alert"></div><div class="modal-footer">${button('Cancel','close-modal','close','ghost')}<button type="submit" class="button primary">Save weigh-in ${icon('check')}</button></div></form>`);
}
function sessionDetail(id) {
  const s=state.data.sessions.find(s=>s.id===id); if(!s) return;
  const groups=new Map(); s.sets.forEach(set=>{if(!groups.has(set.exerciseId))groups.set(set.exerciseId,[]);groups.get(set.exerciseId).push(set);});
  openModal(esc(s.name),`${dateLabel(s.completedOn)} · ${s.durationMinutes} min · ${number(s.volume)} kg volume`,`<span class="badge">${s.sets.length} COMPLETED SETS</span><div class="detail-sets">${[...groups.values()].map(sets=>`<h3>${esc(sets[0].name)}</h3>${sets.map((set,i)=>`<p>Set ${i+1} <span class="detail-set-load">${number(set.weightKg,2)} kg × ${set.reps} reps</span></p>`).join('')}`).join('')}</div>${s.notes?`<p class="modal-description">${esc(s.notes)}</p>`:''}<div class="modal-footer">${button('Delete session','delete-session','trash','danger',`data-id="${s.id}"`)}${button('Done','close-modal','check','primary')}</div>`);
}
function confirmAction(title, description, action, id='', label='Delete', danger=true) {
  openModal(title,'',`<p class="modal-description">${description}</p><div class="form-error" role="alert"></div><div class="modal-footer">${button('Cancel','close-modal','close','ghost')}${button(label,action,danger?'trash':'check',danger?'danger':'primary',`data-id="${id}"`)}</div>`);
}

document.addEventListener('click', async event => {
  const target=event.target.closest('[data-action]'); if(!target || target.disabled) return;
  const action=target.dataset.action, id=Number(target.dataset.id);
  try {
    switch(action) {
      case 'auth-login': state.authMode='login'; renderAuth(); break;
      case 'auth-register': state.authMode='register'; renderAuth(); break;
      case 'toggle-password': {const input=$('#password');input.type=input.type==='password'?'text':'password';target.setAttribute('aria-label',input.type==='password'?'Show password':'Hide password');break;}
      case 'logout':
        if(state.draft) confirmAction('Sign out with a workout open?','Your saved records will stay. The unfinished workout draft in this browser tab will be discarded.','confirm-logout','','Sign out',false);
        else await logout(); break;
      case 'confirm-logout': await logout(); break;
      case 'menu': $('.sidebar').classList.add('open'); break;
      case 'close-menu': $('.sidebar').classList.remove('open'); break;
      case 'new-plan': planForm(); break;
      case 'edit-plan': planForm(id); break;
      case 'copy-plan': planForm(id,true); break;
      case 'add-exercise': {
        const rows=$('.builder-rows'); if(rows.children.length>=20) {toast('A plan can contain up to 20 exercises.');break;}
        rows.insertAdjacentHTML('beforeend',planRow()); $('select',rows.lastElementChild).focus(); break;
      }
      case 'remove-exercise': if($$('.builder-row').length>1)target.closest('.builder-row').remove();else toast('Keep at least one exercise in your workout.');break;
      case 'delete-plan': confirmAction('Delete this workout plan?','Completed sessions will stay in your history. This removes only the plan.','confirm-delete-plan',id);break;
      case 'confirm-delete-plan': target.disabled=true;await api(`/plans/${id}`,{method:'DELETE'});$('#modal').close();await refresh();toast('Workout plan deleted.');break;
      case 'choose-workout': chooseWorkout();break;
      case 'start-plan': startPlan(id);break;
      case 'resume': workoutModal();break;
      case 'rest': state.restUntil=Date.now()+90000;tick();break;
      case 'discard-workout': confirmAction('Discard this workout?','This unfinished session has not been saved. Your previous workouts will stay.','confirm-discard','','Discard workout');break;
      case 'confirm-discard': state.draft=null;state.restUntil=0;saveDraft();$('#modal').close();render();toast('Workout draft discarded.');break;
      case 'close-modal': $('#modal').close();break;
      case 'weight': weightForm();break;
      case 'edit-weight': weightForm(id);break;
      case 'delete-weight': confirmAction('Delete this weigh-in?','This entry will be removed from your progress chart.','confirm-delete-weight',id);break;
      case 'confirm-delete-weight':target.disabled=true;await api(`/weights/${id}`,{method:'DELETE'});$('#modal').close();await refresh();toast('Weigh-in deleted.');break;
      case 'session-detail':sessionDetail(id);break;
      case 'delete-session':confirmAction('Delete this session?','All sets in this session will be removed. Your statistics and personal records will update.','confirm-delete-session',id);break;
      case 'confirm-delete-session':target.disabled=true;await api(`/sessions/${id}`,{method:'DELETE'});$('#modal').close();await refresh();toast('Session deleted.');break;
      case 'chart-sessions': state.chart='sessions';render();break;
      case 'chart-volume': state.chart='volume';render();break;
      case 'muscle': state.muscle=target.dataset.muscle;$$('[data-action="muscle"]').forEach(el=>el.classList.toggle('active',el===target));$('#exercise-results').innerHTML=exerciseResults();break;
      case 'demo': confirmAction('Explore with sample data?','This adds 3 plans, 20 sessions, and 8 weigh-ins to this account. For a separate real training journal, create a second account. Existing records are kept, but a sample weigh-in replaces an entry on the same date.','confirm-demo','','Add sample data',false);break;
      case 'confirm-demo': target.disabled=true;await api('/demo',{method:'POST'});$('#modal').close();await refresh();toast('Your sample training space is ready.');break;
      case 'export': {
        const data=await api('/data'); const blob=new Blob([JSON.stringify({app:'ForgeFit',schemaVersion:1,exportedAt:new Date().toISOString(),...data},null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download=`forgefit-export-${localDay()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your data export is ready.');break;
      }
      case 'retry':await boot();break;
    }
  } catch(error) {
    const field=$('#modal[open] .form-error');if(field)field.textContent=error.message;else toast(error.message,true);
    target.disabled=false;
  }
});

document.addEventListener('submit', async event => {
  const form=event.target.closest('form[data-form]');if(!form)return;
  event.preventDefault(); const submit=$('[type="submit"]',form), error=$('.form-error',form), data=Object.fromEntries(new FormData(form));
  if(submit.disabled)return;submit.disabled=true;error.textContent='';
  try {
    switch(form.dataset.form) {
      case 'auth': {
        const registration=state.authMode==='register';
        if(registration) await api('/auth/register',{method:'POST',body:{displayName:data.displayName.trim(),email:data.email.trim(),password:data.password}});
        await api('/auth/login',{method:'POST',body:new URLSearchParams({email:data.email.trim(),password:data.password})});
        await csrf();state.user=await api('/auth/me');loadDraft();await refresh();toast(registration?'Welcome to your training space.':'Welcome back. Let’s make progress.');break;
      }
      case 'plan': {
        const exercises=$$('.builder-row',form).map(row=>Object.fromEntries(['exerciseId','sets','reps','restSeconds'].map(key=>[key,Number($(`[name="${key}"]`,row).value)])));
        const id=form.dataset.id;
        await api(id?`/plans/${id}`:'/plans',{method:id?'PUT':'POST',body:{name:data.name.trim(),focus:data.focus,notes:data.notes,exercises}});
        $('#modal').close();await refresh();toast('Workout saved. Make it count.');break;
      }
      case 'workout': {
        const sets=state.draft.groups.flatMap(g=>g.sets.filter(s=>s.done).map(s=>({exerciseId:g.exerciseId,reps:Number(s.reps),weightKg:Number(s.weightKg)})));
        if(!sets.length)throw new Error('Check off at least one completed set before saving.');
        const minutes=data.durationMinutes?Number(data.durationMinutes):Math.max(1,Math.ceil((Date.now()-state.draft.startedAt)/60000));
        if(minutes>600)throw new Error('This timer has run for more than 600 minutes. Enter the actual training duration before saving.');
        await api('/sessions',{method:'POST',body:{name:data.name.trim(),completedOn:data.completedOn,durationMinutes:minutes,notes:data.notes,sets}});
        state.draft=null;state.restUntil=0;saveDraft();$('#modal').close();await refresh();toast('Session saved. That’s another step forward.');break;
      }
      case 'weight':await api('/weights',{method:'PUT',body:{measuredOn:data.measuredOn,weightKg:Number(data.weightKg)}});$('#modal').close();await refresh();toast('Weigh-in saved.');break;
      case 'profile':await api('/profile',{method:'PUT',body:{displayName:data.displayName.trim(),weeklyGoal:Number(data.weeklyGoal),targetWeight:data.targetWeight?Number(data.targetWeight):null}});await refresh();toast('Your profile is up to date.');break;
    }
  } catch(ex) { if(form.isConnected)error.textContent=ex.message;else toast(ex.message,true); }
  finally {submit.disabled=false;}
});
function updateDraftInput(target) {
  if(!state.draft)return;
  if(target.dataset.draftField)state.draft[target.dataset.draftField]=target.value;
  if(target.dataset.setField) {
    const {group,set,setField}=target.dataset;const g=state.draft.groups[Number(group)];
    g.sets[Number(set)][setField]=setField==='done'?target.checked:target.value;
    if(setField==='done') {
      target.closest('.set-row').classList.toggle('completed',target.checked);
      if(target.checked){state.restUntil=Date.now()+g.restSeconds*1000;tick();}
    }
  }
  saveDraft();
}
document.addEventListener('input',event=>{
  const target=event.target;
  if(target.id==='exercise-search'){state.search=target.value;$('#exercise-results').innerHTML=exerciseResults();}
  if(target.id==='history-search'){state.historySearch=target.value;$('#history-results').innerHTML=historyResults();}
  if(target.matches('[data-draft-field],[data-set-field]'))updateDraftInput(target);
});
document.addEventListener('change',event=>{
  if(event.target.id==='history-range'){state.historyRange=event.target.value;$('#history-results').innerHTML=historyResults();}
});
window.addEventListener('hashchange',()=>{if(state.user){render();window.scrollTo(0,0);}});
window.addEventListener('offline',()=>toast('Connection lost. Reconnect before saving your changes.',true));
window.addEventListener('beforeunload',event=>{if(state.draft){event.preventDefault();event.returnValue='';}});
async function logout() {
  await api('/auth/logout',{method:'POST'});state.draft=null;saveDraft();state.restUntil=0;state.data=null;state.user=null;state.csrf=null;$('#modal').close();await csrf();renderAuth();toast('You’re signed out. See you next session.');
}
async function boot() {
  try {
    await csrf();
    try {state.user=await api('/auth/me');}catch(error){if(error.status===401){renderAuth();return;}throw error;}
    loadDraft();await refresh();
  }catch(error){$('#app').innerHTML=`<main id="content" class="loading-screen"><img src="/assets/icon.svg" width="60" height="60" alt="ForgeFit"><h1>Let’s reconnect.</h1><p>${esc(error.message)}</p>${button('Try again','retry','arrow','primary')}</main>`;}
}
setInterval(tick,1000);
if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
boot();
