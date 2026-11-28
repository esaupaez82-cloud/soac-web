import express from 'express';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import auth from '../api/auth.js';
import m02 from '../api/m02.js';
import {database} from '../lib/m02-providers.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
app.get('/health', (_req, res) => res.status(204).end());
app.get(['/', '/firebase-login.html'], (_req, res) => res.set('Cache-Control', 'no-store').set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups').type('html').send("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Centro Digital SOAC</title><style>body{font:1rem system-ui;background:#f4f4f5;color:#151515;margin:0;padding:2rem}main{max-width:32rem;margin:12vh auto;padding:2rem;background:#fff;border-radius:1rem}button{background:#a30019;color:white;border:0;border-radius:.5rem;padding:.8rem 1rem;font:inherit}button:disabled{opacity:.55}#status{min-height:1.5rem}</style><main><h1>Centro Digital SOAC</h1><button id=\"login\" disabled>Entrar con Google</button><button id=\"same-tab\" disabled>Entrar en esta pestaña</button><p role=\"status\" id=\"status\">Cargando acceso…</p></main><script type=\"module\">\nimport {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';\nimport {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';\nconst button=document.getElementById('login');\nconst status=document.getElementById('status');\nasync function finish(user) {\n      const result=await fetch('/api/auth?action=firebase',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:await user.getIdToken()})});\n      if(result.ok){location.replace('/modulo-02.html');return;}\n      const payload=await result.json().catch(()=>({}));\n      status.textContent=result.status===403?'Cuenta pendiente de autorización.':(payload.error||'No se pudo iniciar sesión.');\n}\ntry {\n  const response=await fetch('/api/auth?action=client-config');\n  if(!response.ok) throw Error();\n  const {firebase}=await response.json();\n  const auth=getAuth(initializeApp(firebase));\n  status.textContent='';\n  const sameTab=document.getElementById('same-tab');\n  sameTab.disabled=false;\n  sameTab.onclick=async()=>{\n    sameTab.disabled=true;\n    try {\n      sessionStorage.setItem('soac-redirect','1');\n      await signInWithRedirect(auth,new GoogleAuthProvider());\n    } catch(error) {\n      sessionStorage.removeItem('soac-redirect');\n      status.textContent='Google no pudo abrirse en esta pestaña ('+(error.code||'error')+').';\n      sameTab.disabled=false;\n    }\n  };\n  button.disabled=false;\n  getRedirectResult(auth).then(async outcome=>{\n    if(outcome?.user) await finish(outcome.user);\n    else if(sessionStorage.getItem('soac-redirect')) status.textContent='Google regresó sin confirmar tu sesión.';\n  }).catch(error=>{\n    status.textContent='Google no confirmó el regreso ('+(error.code||'error')+').';\n  }).finally(()=>sessionStorage.removeItem('soac-redirect'));\n  button.addEventListener('click',async()=>{\n    button.disabled=true;\n    status.textContent='Verificando sesión…';\n    try {\n      const {user}=await signInWithPopup(auth,new GoogleAuthProvider());\n      await finish(user);\n    } catch(error) {\n      status.textContent=error.code==='auth/unauthorized-domain'?'Este dominio aún debe autorizarse en Firebase.':['auth/popup-blocked','auth/popup-closed-by-user'].includes(error.code)?'La ventana de Google se cerró. Prueba Entrar en esta pestaña.':('No se pudo iniciar sesión con Google'+(error.code?.startsWith('auth/')?' ('+error.code+')':'')+'.');\n    } finally {button.disabled=false;}\n  });\n} catch { status.textContent='El acceso aún no está configurado.'; }\n</script></html>"));
app.get('/modulo-02.html', (_req, res) => res.set('Cache-Control', 'no-store').type('html').send("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Centro Digital SOAC</title><style>\nbody{margin:0;background:#f4f4f5;color:#18181b;font:1rem system-ui}main{max-width:70rem;margin:auto;padding:1.5rem}header,.tools,article{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;justify-content:space-between}section,dialog{background:#fff;border:1px solid #ddd;border-radius:.8rem;padding:1rem}button,input,textarea{font:inherit;padding:.55rem;border:1px solid #aaa;border-radius:.4rem}button{cursor:pointer;background:#fff}.primary{background:#a30019;color:white;border-color:#a30019}article{padding:1rem 0;border-bottom:1px solid #ddd}article p{margin:.25rem 0}dialog{width:min(90vw,32rem);box-sizing:border-box}label{display:grid;gap:.25rem;margin:.8rem 0}[hidden]{display:none!important}#save-result{background:#e9f8ed;color:#16572b;padding:.7rem;border-radius:.4rem}\n</style><main><header><h1>Centro Digital SOAC</h1><button id=\"logout\">Cerrar sesión</button></header><section><div class=\"tools\"><input id=\"search\" placeholder=\"Nombre, teléfono o folio\" aria-label=\"Buscar ficha\"><button id=\"refresh\">Actualizar</button><button id=\"new\" class=\"primary\" hidden>Nueva ficha</button></div><p id=\"save-result\" role=\"status\" hidden></p><p id=\"status\" role=\"status\">Cargando fichas…</p><div id=\"list\"></div></section></main><dialog id=\"dialog\"><form id=\"record\"><h2 id=\"title\"></h2><div id=\"fields\"></div><p id=\"error\" role=\"alert\"></p><button class=\"primary\" id=\"save\" type=\"submit\">Guardar</button> <button id=\"close\" type=\"button\">Cerrar</button></form></dialog><script type=\"module\">\nconst el=id=>document.getElementById(id);\nconst status=el('status');\nlet rows=[], canWrite=false, selected;\nconst columns=[0,1,4,5,6,10];\nconst labels=['Nombre','Teléfono','Etapa','Siguiente acción','Responsable','Folio'];\nasync function request(path,body){\n const response=await fetch(path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});\n const data=await response.json();\n if(response.status===401){location.replace('/firebase-login.html');throw Error('Inicia sesión.');}\n if(!response.ok)throw Error(data.error||'No se pudo completar la operación.');\n return data;\n}\nfunction render(){\n const term=el('search').value.trim().toLowerCase();\n const matches=rows.filter(row=>[0,1,10].some(i=>String(row[i]||'').toLowerCase().includes(term)));\n status.textContent=matches.length+' de '+rows.length+' fichas';\n el('list').replaceChildren(...matches.map(row=>{\n  const item=document.createElement('article');\n  const details=document.createElement('div');\n  for(const [index,col] of columns.entries()){\n   const line=document.createElement('p');\n   line.textContent=labels[index]+': '+(row[col]||'—');\n   details.append(line);\n  }\n  const button=document.createElement('button');\n  button.textContent='Ver ficha';\n  button.onclick=()=>open(row);\n  item.append(details,button);\n  return item;\n }));\n}\nasync function load(){\n try{\n  const result=await request('/api/m02?source=main');\n  rows=result.values.slice(1);\n  canWrite=result.write===true;\n  el('new').hidden=!canWrite;\n  render();\n }catch(error){status.textContent=error.message;}\n}\nfunction field(label,key,value,readOnly=false){\n const wrapper=document.createElement('label');\n wrapper.textContent=label;\n const input=document.createElement(key==='nextAction'?'textarea':'input');\n input.name=key;\n input.value=value||'';\n input.readOnly=readOnly;\n if(!readOnly)input.required=true;\n if(key==='phone')input.inputMode='tel';\n wrapper.append(input);\n return wrapper;\n}\nfunction open(row){\n selected=row;\n el('title').textContent=row?'Ficha '+row[10]:'Nueva ficha';\n el('error').textContent='';\n el('save').hidden=!canWrite;\n const fields=el('fields');\n fields.replaceChildren(field('Nombre','name',row?.[0],!!row),field('Teléfono','phone',row?.[1],!!row),\n  field('Responsable','owner',row?.[6],!canWrite),field('Siguiente acción','nextAction',row?.[5],!canWrite));\n el('dialog').showModal();\n}\nel('record').onsubmit=async event=>{\n event.preventDefault();\n if(!canWrite)return;\n const button=el('save');\n const notice=el('save-result');\n notice.hidden=true;\n button.disabled=true;\n button.textContent='Guardando…';\n el('error').textContent='';\n try{\n  const data=Object.fromEntries(new FormData(event.currentTarget));\n  let saved;\n  if(selected){\n   const changes=[[5,data.nextAction],[6,data.owner]]\n    .filter(([column,value])=>value!==String(selected[column]??''))\n    .map(([column,value])=>({column,previous:String(selected[column]??''),value}));\n   if(!changes.length){el('error').textContent='No hay cambios para guardar.';return;}\n   saved=await request('/api/m02?action=edit',{folio:selected[10],changes});\n  }else saved=await request('/api/m02?action=create',data);\n  if(!saved?.ok||!saved.folio)throw Error('No se pudo confirmar el guardado. Verifica la ficha antes de reintentar.');\n  el('dialog').close();\n  el('record').reset();\n  notice.textContent='✓ Ficha guardada · Folio '+saved.folio;\n  notice.hidden=false;\n  await load();\n }catch(error){el('error').textContent=error.message;}\n finally{button.disabled=false;button.textContent='Guardar';}\n};\nel('close').onclick=()=>el('dialog').close();\nel('new').onclick=()=>open(null);\nel('search').oninput=render;\nel('refresh').onclick=load;\nel('logout').onclick=async()=>{try{await request('/api/auth?action=logout',{});location.replace('/firebase-login.html');}catch(error){status.textContent=error.message;}};\nvoid load();\n</script></html>"));
app.all('/api/auth', auth);
app.all('/api/m02', m02);
const port = Number(process.env.PORT || 10000);
app.listen(port, '0.0.0.0', async () => {
  if (process.env.RENDER !== 'true') return;
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/health', {
      redirect:'manual', signal:AbortSignal.timeout(5000)
    });
    console.log('M02 route: internal health ' + response.status);
  } catch {
    console.log('M02 route: internal health unavailable');
  }
});

async function checkPrivateDatabase() {
  if (!process.env.SOAC_M02_DATABASE_URL) {
    console.log('M02 readiness: database configuration missing');
    return;
  }
  try {
    const {rows} = await database.query("SELECT to_regclass('soac_m02.fichas') IS NOT NULL AS schema_ready");
    console.log('M02 readiness: database connected; schema ' + (rows[0].schema_ready ? 'ready' : 'missing'));
  } catch {
    console.log('M02 readiness: database connection failed');
  }
  for (const key of ['SOAC_M02_IMPORT_GOOGLE_JSON', 'SOAC_M02_IMPORT_WORKBOOK_ID', 'SOAC_FIREBASE_ADMIN_JSON']) {
    console.log('M02 readiness: ' + key + (process.env[key] ? ' configured' : ' missing'));
  }
}
if (process.env.RENDER === 'true') void checkPrivateDatabase();

if (process.env.RENDER === 'true' && process.env.SOAC_M02_RUN_IMPORT === 'true') {
  const script = fileURLToPath(new URL('./import-m02-official.mjs', import.meta.url));
  execFile(process.execPath, [script], {timeout:180000}, (error, stdout, stderr) => {
    if (error) {
      const code = /Código: ([A-Za-z0-9_]+)/.exec(stderr)?.[1] || 'unknown';
      console.log('M02 import stopped: ' + code);
      return;
    }
    try {
      const {counts, clearedInvalidPhones, alreadyImported} = JSON.parse(stdout);
      console.log('M02 import verified: ' + JSON.stringify({counts, clearedInvalidPhones, alreadyImported}));
    } catch {
      console.log('M02 import result could not be verified');
    }
  });
}

async function checkFirebaseAdmin() {
  const credentialJson = process.env.SOAC_FIREBASE_ADMIN_JSON;
  if (!credentialJson) return;
  let credential;
  let web;
  try {
    credential = JSON.parse(credentialJson.trim());
    web = JSON.parse(process.env.SOAC_FIREBASE_WEB_CONFIG_JSON);
  } catch {
    console.log('M02 Firebase: invalid JSON');
    return;
  }
  if (credential.project_id !== 'soac-centro-digital-acceso' || web.projectId !== credential.project_id) {
    console.log('M02 Firebase: project mismatch');
    return;
  }
  try {
    const {cert, initializeApp, deleteApp} = await import('firebase-admin/app');
    const {getAuth} = await import('firebase-admin/auth');
    const app = initializeApp({credential:cert(credential)}, 'soac-m02-readiness');
    try {
      await getAuth(app).listUsers(1);
      console.log('M02 Firebase: admin connection verified');
    } finally {
      await deleteApp(app);
    }
  } catch {
    console.log('M02 Firebase: admin connection rejected');
  }
}
if (process.env.RENDER === 'true') void checkFirebaseAdmin();

async function checkTestFicha() {
  try {
    const {rows} = await database.query(
      "SELECT count(*)::int AS total, count(*) FILTER (WHERE phone = $1 AND lower(values_json ->> 0) LIKE 'prueba soac%')::int AS matched FROM soac_m02.fichas",
      ['5500000099']
    );
    console.log('M02 test ficha: matches=' + rows[0].matched + ' total=' + rows[0].total);
  } catch {
    console.log('M02 test ficha: verification unavailable');
  }
}
if (process.env.RENDER === 'true') void checkTestFicha();
