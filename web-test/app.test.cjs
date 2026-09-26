// Real HTTP backend + a DOM implementation. These tests do not replace visual/device testing.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
let server, origin, serverLog='';
const doms=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(condition, message='condition', timeout=15000) {
  const start=Date.now();
  while(Date.now()-start<timeout) { if(await condition())return;await wait(25); }
  throw new Error(`Timed out waiting for ${message}`);
}
before(async()=>{
  server=spawn('java',['-jar','target/forgefit.jar','--server.port=0','--spring.datasource.url=jdbc:h2:mem:forgefit-dom;DB_CLOSE_DELAY=-1'],{stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',chunk=>{serverLog+=chunk;const match=serverLog.match(/Tomcat started on port (\d+)/);if(match)origin=`http://127.0.0.1:${match[1]}`;});
  server.stderr.on('data',chunk=>serverLog+=chunk);
  await until(()=>origin,'Java server startup',30000);
});
after(()=>{doms.forEach(dom=>dom.window.close());if(server)server.kill();});
async function client() {
  let cookie=''; const errors=[];
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const html=readFileSync('src/main/resources/static/index.html','utf8').replace('<script src="/app.js" defer></script>','');
  const dom=new JSDOM(html,{url:origin,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});doms.push(dom);
  const w=dom.window;
  w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=async(path,options={})=>{
    const url=new URL(path,origin);assert.equal(url.origin,origin,'all requests stay same-origin');
    const headers=new Headers(options.headers||{});if(cookie)headers.set('Cookie',cookie);
    const body=options.body instanceof w.URLSearchParams?new URLSearchParams(options.body.toString()):options.body;
    const response=await fetch(url,{...options,body,headers});
    for(const value of response.headers.getSetCookie())if(value.startsWith('JSESSIONID='))cookie=value.split(';')[0];
    return response;
  };
  w.eval(readFileSync('src/main/resources/static/app.js','utf8'));
  const q=selector=>w.document.querySelector(selector);
  const click=selector=>{const el=q(selector);assert.ok(el,`Missing element ${selector}`);el.click();};
  const fill=(selector,value)=>{const el=q(selector);assert.ok(el,`Missing input ${selector}`);el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const submit=type=>{const el=q(`form[data-form="${type}"]`);assert.ok(el,`Missing ${type} form`);el.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
  const text=()=>w.document.body.textContent;
  const signup=async()=>{
    await until(()=>q('[data-action="auth-register"]'),'auth screen');click('[data-action="auth-register"]');
    fill('#displayName','Test Athlete');fill('#email',`test-${crypto.randomUUID()}@example.test`);fill('#password','Only-for-tests-123');submit('auth');
    await until(()=>text().includes('Let’s build momentum, Test.'),'new dashboard');
  };
  return {w,q,click,fill,submit,text,signup,errors};
}

test('registration signs in; protected data is cleared after sign-out',async()=>{
  const c=await client();await c.signup();
  assert.ok(c.text().includes('Your story starts with one session.'));
  c.click('[data-action="logout"]');await until(()=>c.q('form[data-form="auth"]'),'signed out UI');
  assert.equal(c.q('.sidebar'),null);assert.deepEqual(c.errors,[]);
});

test('plan creation, escaped names, workout draft, set logging, and history work together',async()=>{
  const c=await client();await c.signup();c.click('[data-action="new-plan"]');
  c.fill('#plan-name','Strength <img src=x onerror=alert(1)>');c.submit('plan');
  await until(()=>!c.q('#modal').open,'saved plan');
  c.w.location.hash='workouts';await until(()=>c.q('.plan-card'),'plans route');
  assert.equal(c.q('.plan-card h2').textContent,'Strength <img src=x onerror=alert(1)>');assert.equal(c.q('.plan-card h2 img'),null);
  c.click('[data-action="start-plan"]');await until(()=>c.q('form[data-form="workout"]'),'workout logger');
  c.fill('[data-set-field="weightKg"]',60);c.fill('[data-set-field="reps"]',8);
  c.click('[data-set-field="done"]');assert.ok(c.q('.set-row.completed'));assert.ok(c.q('#rest-count').textContent.includes(':'));
  c.fill('#session-duration',42);c.fill('#session-notes','A focused session.');
  c.click('[data-action="close-modal"]');assert.ok(c.q('.active-banner'));c.click('[data-action="resume"]');
  assert.equal(c.q('[data-set-field="weightKg"]').value,'60');
  c.submit('workout');await until(()=>!c.q('#modal').open,'saved session');
  c.w.location.hash='activity';await until(()=>c.q('[data-action="session-detail"]'),'history row');
  assert.ok(c.text().includes('480'));assert.ok(c.text().includes('42 min'));c.click('[data-action="session-detail"]');
  assert.ok(c.text().includes('60 kg × 8 reps'));assert.ok(c.text().includes('A focused session.'));assert.deepEqual(c.errors,[]);
});

test('weight entries update a date and saved profile changes update the interface',async()=>{
  const c=await client();await c.signup();c.click('[data-action="weight"]');c.fill('#weight-kg',76.4);c.submit('weight');
  await until(()=>!c.q('#modal').open,'weight save');c.w.location.hash='progress';await until(()=>c.q('.weight-line'),'progress route');
  assert.equal(c.w.document.querySelectorAll('.weight-line').length,1);
  c.click('[data-action="edit-weight"]');c.fill('#weight-kg',76.1);c.submit('weight');await until(()=>!c.q('#modal').open,'weight update');
  assert.equal(c.w.document.querySelectorAll('.weight-line').length,1);assert.ok(c.text().includes('76.1'));
  c.w.location.hash='settings';await until(()=>c.q('#profile-name'),'settings');c.fill('#profile-name','Updated Athlete');c.fill('#weekly-goal',3);c.fill('#target-weight',73);c.submit('profile');
  await until(()=>c.q('.who strong').textContent==='Updated Athlete','profile update');assert.equal(c.q('#weekly-goal').value,'3');assert.deepEqual(c.errors,[]);
});

test('sample data renders all dashboard routes and exercise filtering',async()=>{
  const c=await client();await c.signup();c.click('[data-action="demo"]');c.click('[data-action="confirm-demo"]');
  await until(()=>!c.q('#modal').open,'sample load');assert.ok(c.text().includes('20 sessions in your journal'));
  for(const name of ['workouts','activity','progress','exercises','settings','overview']){
    c.w.location.hash=name;await until(()=>c.w.document.title===`${{workouts:'My workouts',activity:'Activity',progress:'Progress',exercises:'Exercise library',settings:'Settings',overview:'Overview'}[name]} | ForgeFit`,`${name} route`);
  }
  c.w.location.hash='exercises';await until(()=>c.q('#exercise-search'),'library');c.fill('#exercise-search','bench');
  assert.equal(c.w.document.querySelectorAll('.exercise-card').length,1);
  c.fill('#exercise-search','no-match');assert.ok(c.text().includes('No matching exercises.'));assert.deepEqual(c.errors,[]);
});

test('empty completed-set submissions show an error and keep the draft',async()=>{
  const c=await client();await c.signup();c.click('[data-action="new-plan"]');c.fill('#plan-name','Quick session');c.submit('plan');
  await until(()=>!c.q('#modal').open,'saved plan');c.click('[data-action="start-plan"]');c.submit('workout');
  await until(()=>c.q('.form-error').textContent.includes('Check off at least one'),'empty-set validation');
  assert.ok(c.q('#modal').open);assert.equal(c.q('button[type="submit"]').disabled,false);assert.deepEqual(c.errors,[]);
});
