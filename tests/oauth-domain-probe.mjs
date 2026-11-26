import { readFileSync } from 'node:fs';
const cfg=JSON.parse(readFileSync(new URL('../public/firebase-applet-config.json',import.meta.url),'utf8'));
const hostnames=['soac-web-clasa-demo.vercel.app','soac-web-clasa-demo-esaupaez82-3688.vercel.app','soac-web-clasa-demo-74ouzo2sr-esaupaez82-3688.vercel.app'];
try{
 const r=await fetch('https://identitytoolkit.googleapis.com/v1/projects?key='+encodeURIComponent(cfg.apiKey),{signal:AbortSignal.timeout(12000)});
 const obj=await r.json().catch(()=>({}));
 const auth=Array.isArray(obj.authorizedDomains)?obj.authorizedDomains:[];
 const allowed=hostnames.map(host=>({host,allowed:auth.includes(host)}));
 console.log(JSON.stringify({httpStatus:r.status,projectId:cfg.projectId,authorizedDomainCount:auth.length,domains:allowed,hasProjectConfig:!!obj.projectId,googleProvider:obj.idpConfig?.find?.(x=>x.providerId==='google.com')?'listed':'not_available'}));
 if(!r.ok)console.log('Public project configuration unavailable: '+String(obj.error?.status||obj.error?.message||'unknown').slice(0,120));
}catch(e){console.log('Public Firebase config probe failed: '+String(e.message).slice(0,150));}
