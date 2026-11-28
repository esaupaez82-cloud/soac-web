import express from 'express';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import auth from '../api/auth.js';
import m02 from '../api/m02.js';
import financingQuotes, {probeQuoteStorage} from '../api/financing-quotes.js';
import catalogInventory from '../api/catalog-inventory.js';
import inventoryAdmin from '../api/inventory-admin.js';
import {generateDraft} from '../lib/m02-drafts.js';
import {database} from '../lib/m02-providers.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
app.get('/api/catalogo', catalogInventory);
app.all('/api/inventario', inventoryAdmin);
app.get('/modulo-03.html', (_req, res) => res.set('Cache-Control', 'no-store').sendFile(fileURLToPath(new URL('../public/inventario-soac.html', import.meta.url))));
app.get('/modulo-05.html', (_req, res) => res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer').sendFile(fileURLToPath(new URL('../public/financiamiento-soac.html', import.meta.url))));
app.get('/financiamiento-calculo.mjs', (_req, res) => res.type('text/javascript').sendFile(fileURLToPath(new URL('../public/financiamiento-calculo.mjs', import.meta.url))));
app.all('/api/cotizaciones', financingQuotes);
app.get('/health', (_req, res) => res.status(204).end());
app.get(['/', '/firebase-login.html'], (_req, res) => res.set('Cache-Control', 'no-store').set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups').type('html').send("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Centro Digital SOAC</title><style>body{font:1rem system-ui;background:#f4f4f5;color:#151515;margin:0;padding:2rem}main{max-width:32rem;margin:12vh auto;padding:2rem;background:#fff;border-radius:1rem}button{background:#a30019;color:white;border:0;border-radius:.5rem;padding:.8rem 1rem;font:inherit}button:disabled{opacity:.55}#status{min-height:1.5rem}</style><main><h1>Centro Digital SOAC</h1><button id=\"login\" disabled>Entrar con Google</button><button id=\"same-tab\" disabled>Entrar en esta pestaña</button><p role=\"status\" id=\"status\">Cargando acceso…</p></main><script type=\"module\">\nimport {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';\nimport {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';\nconst button=document.getElementById('login');\nconst status=document.getElementById('status');\nasync function finish(user) {\n      const result=await fetch('/api/auth?action=firebase',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:await user.getIdToken()})});\n      if(result.ok){location.replace('/modulo-02.html');return;}\n      const payload=await result.json().catch(()=>({}));\n      status.textContent=result.status===403?'Cuenta pendiente de autorización.':(payload.error||'No se pudo iniciar sesión.');\n}\nasync function start() {\n  const current=await fetch('/api/auth?action=session',{cache:'no-store'}).catch(()=>null);\n  if(current?.ok){\n    location.replace('/modulo-02.html');\n    return;\n  }\ntry {\n  const response=await fetch('/api/auth?action=client-config');\n  if(!response.ok) throw Error();\n  const {firebase}=await response.json();\n  const auth=getAuth(initializeApp(firebase));\n  status.textContent='';\n  const sameTab=document.getElementById('same-tab');\n  sameTab.disabled=false;\n  sameTab.onclick=async()=>{\n    sameTab.disabled=true;\n    try {\n      sessionStorage.setItem('soac-redirect','1');\n      await signInWithRedirect(auth,new GoogleAuthProvider());\n    } catch(error) {\n      sessionStorage.removeItem('soac-redirect');\n      status.textContent='Google no pudo abrirse en esta pestaña ('+(error.code||'error')+').';\n      sameTab.disabled=false;\n    }\n  };\n  button.disabled=false;\n  getRedirectResult(auth).then(async outcome=>{\n    if(outcome?.user) await finish(outcome.user);\n    else if(sessionStorage.getItem('soac-redirect')) status.textContent='Google regresó sin confirmar tu sesión.';\n  }).catch(error=>{\n    status.textContent='Google no confirmó el regreso ('+(error.code||'error')+').';\n  }).finally(()=>sessionStorage.removeItem('soac-redirect'));\n  button.addEventListener('click',async()=>{\n    button.disabled=true;\n    status.textContent='Verificando sesión…';\n    try {\n      const {user}=await signInWithPopup(auth,new GoogleAuthProvider());\n      await finish(user);\n    } catch(error) {\n      status.textContent=error.code==='auth/unauthorized-domain'?'Este dominio aún debe autorizarse en Firebase.':['auth/popup-blocked','auth/popup-closed-by-user'].includes(error.code)?'La ventana de Google se cerró. Prueba Entrar en esta pestaña.':('No se pudo iniciar sesión con Google'+(error.code?.startsWith('auth/')?' ('+error.code+')':'')+'.');\n    } finally {button.disabled=false;}\n  });\n} catch { status.textContent='El acceso aún no está configurado.'; }\n}\nvoid start();\n</script></html>"));
app.get('/modulo-02.html', (_req, res) => res.set('Cache-Control', 'no-store').type('html').send("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Centro Digital SOAC</title><style>:root{color-scheme:light;--red:#b40920;--ink:#19191c;--muted:#555961;--line:#e7e7ea}*{box-sizing:border-box}body{margin:0;background:#f3f3f2;color:var(--ink);font:1rem system-ui,sans-serif}main{max-width:76rem;margin:auto;padding:clamp(.75rem,3vw,2rem)}header,.tools{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;justify-content:space-between}header{padding:1.3rem clamp(1rem,3vw,2rem);margin-bottom:1rem;background:#fff;border:1px solid var(--line);border-top:4px solid var(--red);border-radius:1rem}header h1{margin:.25rem 0;font-size:clamp(1.55rem,5vw,2.4rem);letter-spacing:-.04em}header .brand{margin:0;color:var(--red);font-size:.75rem;font-weight:750;letter-spacing:.07em}header .description{margin:.4rem 0 0;color:var(--muted)}section,dialog{background:#fff;border:1px solid var(--line);border-radius:1rem;padding:clamp(.8rem,2vw,1.4rem)}button,input,textarea{font:inherit;min-height:2.6rem;padding:.55rem .75rem;border:1px solid #c9c9ce;border-radius:.55rem;color:inherit}button{cursor:pointer;background:#fff;font-weight:650}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--red);outline-offset:2px}.primary{background:var(--red);color:#fff;border-color:var(--red)}.tools input{flex:1 1 16rem;min-width:0}.tools button{flex:0 0 auto}#status{color:var(--muted);font-size:.9rem}#list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,23rem),1fr));gap:.75rem}article{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:1rem;border:1px solid var(--line);border-radius:.8rem;overflow-wrap:anywhere}article p{margin:.35rem 0;color:var(--muted);font-size:.9rem}article h2{margin:0 0 .5rem;font-size:1.1rem}dialog{width:min(90vw,32rem);color:var(--ink)}dialog::backdrop{background:#19191c80}label{display:grid;gap:.25rem;margin:.8rem 0}textarea{min-height:5rem}[hidden]{display:none!important}#save-result{background:#e9f8ed;color:#16572b;padding:.7rem;border-radius:.4rem}#error{color:#9a1025}@media(max-width:480px){.tools input{flex-basis:100%}header{gap:1rem}}nav{margin-bottom:1rem}nav [aria-pressed=true]{border-color:var(--red);color:var(--red)}fieldset{margin:.8rem 0;border:1px solid var(--line);border-radius:.55rem}#appointments-list{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.65rem;border-bottom:1px solid var(--line)}</style><main><header><div><p class=\"brand\">AUTOMOTRIZ CLASA® · SOAC® V4 MAESTRO PREMIUM</p><h1>Centro Digital</h1><p class=\"description\">Ficha única, seguimiento y agenda</p></div><div><a href=\"/modulo-03.html\">Inventario</a> <button id=\"logout\">Cerrar sesión</button></div></header><section><nav class=\"tools\" aria-label=\"Vistas de Centro Digital\"><button id=\"main-view\" aria-pressed=\"true\">Fichas</button><button id=\"appointments-view\" aria-pressed=\"false\">Citas registradas</button></nav><div id=\"fichas\"><div class=\"tools\"><input id=\"search\" placeholder=\"Nombre, teléfono o folio\" aria-label=\"Buscar ficha\"><button id=\"queue\" hidden>Trabajar siguiente ficha</button><button id=\"refresh\">Actualizar</button><button id=\"new\" class=\"primary\" hidden>Nueva ficha</button></div><p id=\"save-result\" role=\"status\" hidden></p><p id=\"status\" role=\"status\">Cargando fichas…</p><div id=\"list\"></div></div><div id=\"appointments\" hidden><p id=\"appointments-status\" role=\"status\"></p><div id=\"appointments-list\"></div></div></section></main><dialog id=\"dialog\"><form id=\"record\"><h2 id=\"title\"></h2><div id=\"fields\"></div><fieldset id=\"whatsapp\" hidden><legend>WhatsApp</legend><button type=\"button\" id=\"prepare\">Preparar borrador con IA</button><p id=\"draft-status\" role=\"status\"></p><label>Borrador editable<textarea id=\"whatsapp-message\" maxlength=\"1500\"></textarea></label><a id=\"whatsapp-link\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir WhatsApp</a><p id=\"whatsapp-help\">Revisa el mensaje y envíalo desde WhatsApp.</p></fieldset><p id=\"error\" role=\"alert\"></p><p><a id=\"financing-quote\" hidden>Cotizar financiamiento</a></p><button class=\"primary\" id=\"save\" type=\"submit\">Guardar</button> <button id=\"close\" type=\"button\">Cerrar</button></form></dialog><script type=\"module\">\nconst el=id=>document.getElementById(id);\nconst status=el('status');\nlet rows=[], canWrite=false, selected, queueMode=false, draftVersion=0, saving=false;\nconst reviewed=new Set();\nconst stages=['Cita','Financiamiento','Documentos pendientes'];\nconst blocked=row=>row.some(value=>/\\bno\\s+contactar\\b/i.test(String(value??'')));\nconst nextRecord=()=>rows.find(row=>row[10]&&!blocked(row)&&!reviewed.has(row[10]));\n\nfunction whatsappNumber(value){\n const digits=String(value??'').trim().replace(/[\\s()+.-]/g,'');\n if(/^\\d{10}$/.test(digits))return '52'+digits;\n if(/^521\\d{10}$/.test(digits))return '52'+digits.slice(3);\n return /^52\\d{10}$/.test(digits)?digits:null;\n}\nconst columns=[0,1,4,5,6,10];\nconst labels=['Nombre','Teléfono','Etapa','Siguiente acción','Responsable','Folio'];\nasync function request(path,body){\n const response=await fetch(path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});\n const data=await response.json();\n if(response.status===401){location.replace('/firebase-login.html');throw Error('Inicia sesión.');}\n if(!response.ok)throw Error(data.error||'No se pudo completar la operación.');\n return data;\n}\nfunction render(){\n const term=el('search').value.trim().toLowerCase();\n const matches=rows.filter(row=>[0,1,10].some(i=>String(row[i]||'').toLowerCase().includes(term)));\n el('queue').hidden=!canWrite;\n el('queue').disabled=!nextRecord();\n status.textContent=matches.length+' de '+rows.length+' fichas';\n el('list').replaceChildren(...matches.map(row=>{\n  const item=document.createElement('article');\n  const details=document.createElement('div');\n  for(const [index,col] of columns.entries()){\n   const line=document.createElement(index===0?'h2':'p');\n   line.textContent=index===0?(row[col]||'Ficha sin nombre'):labels[index]+': '+(row[col]||'—');\n   details.append(line);\n  }\n  const button=document.createElement('button');\n  button.textContent='Ver ficha';\n  button.onclick=()=>open(row);\n  item.append(details,button);\n  return item;\n }));\n}\nasync function load(){\n try{\n  const result=await request('/api/m02?source=main');\n  rows=result.values.slice(1);\n  canWrite=result.write===true;\n  el('new').hidden=!canWrite;\n  render();\n }catch(error){status.textContent=error.message;}\n}\nfunction field(label,key,value,readOnly=false){\n const wrapper=document.createElement('label');\n wrapper.textContent=label;\n const input=document.createElement(key==='nextAction'?'textarea':'input');\n input.name=key;\n input.value=value||'';\n input.readOnly=readOnly;\n if(!readOnly)input.required=true;\n if(key==='phone')input.inputMode='tel';\n wrapper.append(input);\n return wrapper;\n}\nfunction open(row,queue=false){\n selected=row;\n const quoteLink=el('financing-quote');\n quoteLink.hidden=!row?.[10];\n if(row?.[10])quoteLink.href='/modulo-05.html?folio='+encodeURIComponent(row[10]);\n queueMode=queue;\n draftVersion++;\n el('draft-status').textContent='';\n el('save').textContent=queue?'Guardar y siguiente':'Guardar';\n\n el('title').textContent=row?'Ficha '+row[10]:'Nueva ficha';\n el('error').textContent='';\n el('save').hidden=!canWrite;\n const fields=el('fields');\n fields.replaceChildren(field('Nombre','name',row?.[0],!!row),field('Teléfono','phone',row?.[1],!!row),\n  field('Responsable','owner',row?.[6],!canWrite),field('Siguiente acción','nextAction',row?.[5],!canWrite));\n if(row){\n  const picker=document.createElement('select');\n  picker.name='stage';\n  picker.disabled=!canWrite;\n  for(const stage of new Set([String(row[4]??''),...stages])){\n   const option=document.createElement('option');\n   option.value=stage;\n   option.textContent=stage||'Sin etapa';\n   picker.append(option);\n  }\n  const label=document.createElement('label');\n  label.textContent='Etapa';\n  label.append(picker);\n  fields.prepend(label);\n  picker.onchange=()=>{el('whatsapp-message').value='';el('whatsapp-message').oninput?.();void prepare();};\n }\n const contactBlocked=row&&blocked(row);\n const number=contactBlocked?null:whatsappNumber(row?.[1]);\n el('whatsapp').hidden=!number;\n if(number){\n  const draft=el('whatsapp-message');\n  const link=el('whatsapp-link');\n  draft.value='Hola, '+(row[0]||'')+'. Te saludo de Automotriz CLASA. ¿Podemos dar seguimiento a tu consulta?';\n  const updateLink=()=>{\n   if(draft.value.trim())link.href='https://wa.me/'+number+'?text='+encodeURIComponent(draft.value);\n   else link.removeAttribute('href');\n  };\n  draft.oninput=updateLink;\n  updateLink();\n }\n el('prepare').hidden=!canWrite;\n el('dialog').showModal();\n if(number&&canWrite)void prepare();\n}\nasync function prepare(){\n const version=++draftVersion;\n const stage=el('record').elements.stage?.value;\n const feedback=el('draft-status');\n if(!canWrite||!selected||el('whatsapp').hidden||!stages.includes(stage)){\n  feedback.textContent='';\n  return;\n }\n const message=el('whatsapp-message');\n const initial=message.value;\n feedback.textContent='Preparando borrador…';\n if(!initial)el('whatsapp-link').removeAttribute('href');\n try{\n  const {draft}=await request('/api/m02?action=draft',{folio:selected[10],stage});\n  if(version!==draftVersion||!el('dialog').open)return;\n  if(message.value===initial){message.value=draft;message.oninput();}\n  feedback.textContent='Revisa el texto antes de enviarlo.';\n }catch(error){\n  if(version===draftVersion&&el('dialog').open)feedback.textContent=error.message;\n }\n}\nel('prepare').onclick=prepare;\nel('queue').onclick=()=>{const next=nextRecord();if(next)open(next,true);};\n\nel('record').onsubmit=async event=>{\n event.preventDefault();\n if(!canWrite||saving)return;\n saving=true;\n const button=el('save');\n const notice=el('save-result');\n notice.hidden=true;\n button.disabled=true;\n el('close').disabled=true;\n button.textContent='Guardando…';\n el('error').textContent='';\n try{\n  const data=Object.fromEntries(new FormData(event.currentTarget));\n  let saved;\n  if(selected){\n   const changes=[[4,data.stage],[5,data.nextAction],[6,data.owner]]\n    .filter(([column,value])=>value!==String(selected[column]??''))\n    .map(([column,value])=>({column,previous:String(selected[column]??''),value}));\n   if(!changes.length){el('error').textContent='No hay cambios para guardar.';return;}\n   saved=await request('/api/m02?action=edit',{folio:selected[10],changes});\n  }else saved=await request('/api/m02?action=create',data);\n  if(!saved?.ok||!saved.folio)throw Error('No se pudo confirmar el guardado. Verifica la ficha antes de reintentar.');\n  el('dialog').close();\n  el('record').reset();\n  notice.textContent='✓ Ficha guardada · Folio '+saved.folio;\n  notice.hidden=false;\n  if(queueMode)reviewed.add(saved.folio);\n  await load();\n  const next=queueMode?nextRecord():null;\n  if(next)open(next,true);\n  else if(queueMode)notice.textContent+=' · Cola completada';\n }catch(error){el('error').textContent=error.message;}\n finally{saving=false;el('close').disabled=false;button.disabled=false;button.textContent=queueMode?'Guardar y siguiente':'Guardar';}\n};\nasync function showAppointments(){\n el('main-view').setAttribute('aria-pressed','false');\n el('appointments-view').setAttribute('aria-pressed','true');\n el('fichas').hidden=true;\n el('appointments').hidden=false;\n const feedback=el('appointments-status');\n const list=el('appointments-list');\n feedback.textContent='Cargando citas registradas…';\n list.replaceChildren();\n try{\n  const {values}=await request('/api/m02?source=a0');\n  const [headers=[],...entries]=values;\n  const cols=headers.flatMap((label,index)=>/nombre|cliente|fecha|hora|estatus|estado|folio|motivo/i.test(String(label))?[index]:[]);\n  const records=cols.length?entries.filter(row=>cols.some(index=>String(row[index]??'').trim())):[];\n  feedback.textContent=cols.length\n   ?records.length+' filas con datos en el registro importado. Consulta histórica.'\n   :'El registro importado todavía no tiene encabezados reconocidos.';\n  const table=document.createElement('table');\n  const heading=table.createTHead().insertRow();\n  for(const i of cols){\n   const cell=document.createElement('th');\n   cell.scope='col';\n   cell.textContent=headers[i];\n   heading.append(cell);\n  }\n  const body=table.createTBody();\n  for(const row of records) {\n   const line=body.insertRow();\n   for(const i of cols)line.insertCell().textContent=row[i]??'';\n  }\n  if(records.length)list.append(table);\n }catch(error){feedback.textContent=error.message;}\n}\nel('main-view').onclick=()=>{\n el('main-view').setAttribute('aria-pressed','true');\n el('appointments-view').setAttribute('aria-pressed','false');\n el('appointments').hidden=true;\n el('fichas').hidden=false;\n};\nel('appointments-view').onclick=showAppointments;\nel('dialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();});\nel('close').onclick=()=>{if(!saving)el('dialog').close();};\nel('new').onclick=()=>open(null);\nel('search').oninput=render;\nel('refresh').onclick=load;\nel('logout').onclick=async()=>{try{await request('/api/auth?action=logout',{});location.replace('/firebase-login.html');}catch(error){status.textContent=error.message;}};\nvoid load();\n</script></html>"));
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
    const audit = await database.query(
      "SELECT count(*)::int AS creates, count(DISTINCT ficha_id)::int AS distinct_records FROM soac_m02.audit_events WHERE action = 'create'"
    );
    console.log('M02 create audit: saves=' + audit.rows[0].creates + ' distinct=' + audit.rows[0].distinct_records);
  } catch {
    console.log('M02 test ficha: verification unavailable');
  }
}
if (process.env.RENDER === 'true') void checkTestFicha();

async function checkDraftReadiness() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('M02 draft readiness: key missing');
    return;
  }
  try {
    await generateDraft('Cita');
    console.log('M02 draft readiness: generation verified');
  } catch {
    console.log('M02 draft readiness: generation unavailable');
  }
}
if (process.env.RENDER === 'true') void checkDraftReadiness();

if (process.env.RENDER === 'true') {
  void probeQuoteStorage().then(result=>console.log('M05 storage: '+result))
    .catch(()=>console.log('M05 storage: verification failed'));
}
