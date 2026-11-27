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
app.get(['/', '/firebase-login.html'], (_req, res) => res.set('Cache-Control', 'no-store').type('html').send("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Centro Digital SOAC</title><style>body{font:1rem system-ui;background:#f4f4f5;color:#151515;margin:0;padding:2rem}main{max-width:32rem;margin:12vh auto;padding:2rem;background:#fff;border-radius:1rem}button{background:#a30019;color:white;border:0;border-radius:.5rem;padding:.8rem 1rem;font:inherit}button:disabled{opacity:.55}#status{min-height:1.5rem}</style><main><h1>Centro Digital SOAC</h1><button id=\"login\" disabled>Entrar con Google</button><p role=\"status\" id=\"status\">Cargando acceso…</p></main><script type=\"module\">\nimport {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';\nimport {getAuth,GoogleAuthProvider,signInWithPopup} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';\nconst button=document.getElementById('login');\nconst status=document.getElementById('status');\ntry {\n  const response=await fetch('/api/auth?action=client-config');\n  if(!response.ok) throw Error();\n  const {firebase}=await response.json();\n  const auth=getAuth(initializeApp(firebase));\n  status.textContent='';\n  button.disabled=false;\n  button.addEventListener('click',async()=>{\n    button.disabled=true;\n    status.textContent='Verificando sesión…';\n    try {\n      const {user}=await signInWithPopup(auth,new GoogleAuthProvider());\n      const result=await fetch('/api/auth?action=firebase',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:await user.getIdToken()})});\n      status.textContent=result.ok?'Sesión verificada.':result.status===403?'Cuenta pendiente de autorización.':'No se pudo iniciar sesión.';\n    } catch(error) {\n      status.textContent=error.code==='auth/unauthorized-domain'?'Este dominio aún debe autorizarse en Firebase.':'No se pudo iniciar sesión con Google.';\n    } finally {button.disabled=false;}\n  });\n} catch { status.textContent='El acceso aún no está configurado.'; }\n</script></html>"));
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
