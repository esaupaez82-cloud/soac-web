import {session} from '../lib/m02-providers.js';
import {handleJson, failure} from '../lib/m02-session.js';

export default function auth(req, res) {
  return handleJson(res, async () => {
    session.requireSetup();
    const action = new URL(req.url, 'http://localhost').searchParams.get('action');
    if (req.method === 'GET' && action === 'client-config') {
      const config = JSON.parse(process.env.SOAC_FIREBASE_WEB_CONFIG_JSON);
      const keys = ['apiKey','authDomain','projectId','appId','messagingSenderId','storageBucket','measurementId'];
      const firebase = Object.fromEntries(keys.filter(key => typeof config[key] === 'string').map(key => [key,config[key]]));
      if (!firebase.apiKey || !firebase.authDomain || !firebase.projectId) throw failure(503, 'Configuración inválida.');
      return {ok:true, firebase};
    }
    if (req.method === 'GET' && action === 'session') return {ok:true, ...(await session.get(req))};
    if (req.method === 'POST') {
      session.requireOrigin(req);
      if (action === 'logout') {
        res.setHeader('Set-Cookie', session.clearCookie());
        return {ok:true};
      }
      if (action === 'firebase') {
        if (!req.is('application/json')) throw failure(415, 'Formato inválido.');
        res.setHeader('Set-Cookie', await session.login(req.body?.idToken));
        return {ok:true, redirect:'/modulo-02.html'};
      }
    }
    throw failure(405, 'Método no permitido.');
  });
}
