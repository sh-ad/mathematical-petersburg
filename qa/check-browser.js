/* Browser smoke-check without npm dependencies; uses a separate Chrome profile. */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'petersburg-qa-'));
const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,child,id=0;
const pending=new Map(),errors=[];
const checks=[];
function check(name,value){checks.push({name,pass:Boolean(value)});assert.ok(value,name);}
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;}
async function load(relative){await call('Page.navigate',{url:pathToFileURL(path.join(root,'docs',relative)).href});for(let i=0;i<100;i++){if(await evaluate('document.readyState')==='complete')return;await delay(50);}throw Error('Page did not finish loading');}
async function jump(index){await evaluate(`document.querySelector('[data-jump="${index}"]').click()`);}
async function screenshot(name){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(__dirname,name+'.png'),Buffer.from(r.data,'base64'));}

(async()=>{
 try{
  child=spawn(chrome,['--headless','--disable-gpu','--disable-background-networking','--disable-component-update','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  const active=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<200&&!fs.existsSync(active);i++)await delay(50);
  if(!fs.existsSync(active))throw Error('Chrome debugging port unavailable');
  const port=fs.readFileSync(active,'utf8').split('\n')[0];
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  await call('Page.enable');await call('Runtime.enable');
  for(const width of [1280,390]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});
   await load('participants/index.html');
   check(`Initial screen ${width}`,await evaluate(`document.querySelectorAll('[data-screen]:not([hidden])').length===1`));
   check(`Correct CSS viewport ${width}`,await evaluate('innerWidth')===width);
   for(let index=0;index<16;index++){
    await jump(index);
    check(`No overflow ${width}/${index+1}`,await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    if([0,5,9,12].includes(index))await screenshot(`participants-${width}-${index+1}`);
   }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await load('participants/index.html');
  await jump(5);
  check('Direct navigation changes hash',await evaluate('location.hash')==='#bridges');
  await evaluate(`document.querySelector('#walk-start').value='П';document.querySelector('#walk-start').dispatchEvent(new Event('change'));for(const id of ['birzhevoy','palace','blagoveshchensky','tuchkov','troitsky'])document.querySelector('[data-cross="'+id+'"]').click();`);
  check('All bridges used',await evaluate(`document.querySelector('#walk-status').textContent.includes('5 из 5')`));
  await evaluate(`document.querySelector('#walk-undo').click()`);
  check('Undo bridge',await evaluate(`document.querySelector('#walk-status').textContent.includes('4 из 5')`));
  await evaluate(`document.querySelector('[data-reveal="answer-parity"]').click()`);
  check('Reveal answer',await evaluate(`!document.querySelector('#answer-parity').hidden`));
  await jump(9);
  check('Initial forecast',await evaluate(`document.querySelector('#free-result').textContent==='70%'`));
  await evaluate(`document.querySelector('#p').value=100;document.querySelector('#p').dispatchEvent(new Event('input'));`);
  check('Forecast updates',await evaluate(`document.querySelector('#free-result').textContent==='100%'&&document.querySelector('#late-a').textContent==='0%'`));
  await evaluate(`document.querySelector('#forecast-reset').click()`);
  check('Forecast resets',await evaluate(`document.querySelector('#mean-a').textContent==='9,5 мин'`));
  await jump(10);await evaluate(`document.querySelector('#text-toggle').click()`);
  check('Text analysis visible',await evaluate(`!document.querySelector('#text-results').hidden&&document.querySelector('#text-count').textContent.includes('переходов')`));
  await jump(6);await evaluate(`document.querySelector('#mechanism-toggle').click()`);
  check('Animation starts',await evaluate(`document.querySelector('#mechanism-image').src.endsWith('.gif')`));
  await jump(7);
  check('Animation pauses when leaving',await evaluate(`document.querySelector('#mechanism-image').src.endsWith('.png')`));
  await jump(11);await evaluate(`document.querySelector('#stability-toggle').click()`);
  check('Displacement diagram',await evaluate(`document.querySelector('#ball-stable').getAttribute('cx')==='156'`));
  await jump(12);await evaluate(`document.querySelector('#time').value=3;document.querySelector('#time').dispatchEvent(new Event('input'));`);
  check('Derivative updates',await evaluate(`document.querySelector('#speed-value').textContent==='6'`));
  check('Separate participant interface',await evaluate(`[...document.querySelectorAll('a')].every(a=>!a.href.includes('/presenter/'))`));
  await load('presenter/index.html');
  check('6 address cards',await evaluate(`document.querySelectorAll('.route-card').length===6`));
  check('Links to participant screens',await evaluate(`document.querySelectorAll('.show-link').length>=6`));
  check('Address and dates on every card',await evaluate(`[...document.querySelectorAll('.route-card')].every(c=>c.querySelector('.address')&&c.querySelectorAll('.dates dt').length===3)`));
  check('Printable PDF linked',await evaluate(`!!document.querySelector('a[href="../downloads/presenter-cards.pdf"]')`));
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const cardLayout=await evaluate(`[...document.querySelectorAll('.route-card')].map(c=>({id:c.id,overflow:c.scrollHeight-c.clientHeight,clearance:c.querySelector('.card-ending').getBoundingClientRect().top-c.querySelector('.card-copy').getBoundingClientRect().bottom}))`);
  check('Print content fits all six cards',cardLayout.every(c=>c.overflow<=1&&c.clearance>=0));
  await call('Emulation.setEmulatedMedia',{media:''});
  await screenshot('presenter-1280');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  check('Presenter narrow screen',await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  await screenshot('presenter-390');
  check('No JavaScript errors',errors.length===0);
  const report={checks,errors};fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(report,null,2));
  console.log(`${checks.length}/${checks.length} browser checks passed; 1280px and 390px; no JS errors`);
 }finally{
  ws?.close();child?.kill('SIGTERM');await delay(200);fs.rmSync(profile,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
