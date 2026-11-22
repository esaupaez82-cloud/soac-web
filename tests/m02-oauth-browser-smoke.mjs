import { chromium } from 'playwright';
const sites=['https://soac-web-clasa-demo.vercel.app/modulo-02.html','https://soac-web-clasa-demo-esaupaez82-3688.vercel.app/modulo-02.html'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const site of sites){
  const context=await browser.newContext({locale:'es-MX'});
  const page=await context.newPage();
  const evidence={origin:new URL(site).origin,opened:false,loginButton:false,popup:false,originMismatch:false,googlePage:false,hasGoogleScript:false};
  try {
   await page.goto(site,{waitUntil:'domcontentloaded',timeout:25000});
   evidence.opened=true;
   await page.locator('#login').waitFor({timeout:12000});
   evidence.loginButton=true;
   evidence.hasGoogleScript=await page.evaluate(()=>!!window.google?.accounts?.oauth2);
   let popup;
   try{const pending=context.waitForEvent('page',{timeout:13000});await page.locator('#login').click();popup=await pending;}catch{};
   if(popup){evidence.popup=true;try{await popup.waitForLoadState('domcontentloaded',{timeout:16000})}catch{};
     await popup.waitForTimeout(2700);
     const s=await popup.locator('body').innerText({timeout:9000}).catch(()=> '');
     evidence.originMismatch=/origin_mismatch|origen no coincid|error de autorizaci[oó]n|access blocked.*authorization error/i.test(s);
     evidence.googlePage=popup.url().includes('accounts.google.com');
     evidence.loginScreen=/(sign in|elige una cuenta|choose an account|iniciar sesi[oó]n)/i.test(s);
     evidence.urlHost=(()=>{try{return new URL(popup.url()).hostname}catch{return 'invalid'}})();
   } else evidence.pageFeedback=(await page.locator('#live').innerText().catch(()=> '')).slice(0,150);
  }catch(e){evidence.error=String(e.message).slice(0,180)};
  console.log(JSON.stringify(evidence));
  await context.close();
 }
}finally{await browser.close()}
