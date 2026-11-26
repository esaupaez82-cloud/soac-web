import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome','/usr/bin/chromium'].find(existsSync);
if(!executablePath)throw Error('Chrome unavailable');
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({locale:'es-MX'});
 const page=await context.newPage();
 await page.goto('https://soac-web-clasa-demo.vercel.app/modulo-02.html',{waitUntil:'domcontentloaded',timeout:20000});
 const outcome={method:'Firebase GoogleAuthProvider',host:'soac-web-clasa-demo.vercel.app',sdk:false,popup:false,originMismatch:false,accountSelector:false,firebaseError:null};
 try{
  await page.evaluate(async()=>{
   const [{initializeApp}, {getAuth,setPersistence,inMemoryPersistence,GoogleAuthProvider,signInWithPopup}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
   ]);
   const cfg=await (await fetch('/firebase-applet-config.json')).json();
   const auth=getAuth(initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,appId:cfg.appId}));
   await setPersistence(auth,inMemoryPersistence);
   const provider=new GoogleAuthProvider();provider.addScope('https://www.googleapis.com/auth/spreadsheets');
   window.startFirebaseSmoke=async()=>{try{await signInWithPopup(auth,provider)}catch(e){window.firebaseSmokeError=String(e.code||e.message||e).slice(0,130)}};
   const b=document.createElement('button');b.textContent='Iniciar prueba Firebase';b.id='firebase-smoke';b.addEventListener('click',()=>{window.startFirebaseSmoke()});document.body.append(b);
  });
  outcome.sdk=true;
  const pending=context.waitForEvent('page',{timeout:16000}).catch(()=>null);
  await page.locator('#firebase-smoke').click();
  const popup=await pending;
  if(popup){
    outcome.popup=true;
    try{await popup.waitForLoadState('domcontentloaded',{timeout:12000})}catch{}
    await popup.waitForTimeout(3500);
    const body=await popup.locator('body').innerText({timeout:6000}).catch(()=> '');
    outcome.originMismatch=/origin_mismatch|origen no coincid|access blocked.*authorization/i.test(body);
    outcome.accountSelector=/(choose an account|elige una cuenta|sign in with Google|iniciar sesi[oó]n)/i.test(body);
    outcome.googlePage=popup.url().includes('accounts.google.com');
    outcome.popupHost=(()=>{try{return new URL(popup.url()).hostname}catch{return 'unknown'}})();
  }
  outcome.firebaseError=await page.evaluate(()=>window.firebaseSmokeError||null);
 }catch(e){outcome.error=String(e.message).slice(0,170)}
 console.log(JSON.stringify(outcome));
 await context.close();
}finally{await browser.close()}
