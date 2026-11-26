const COOKIE = '__Host-soac_session';
const SESSION_MS = 60 * 60 * 1000;

export function failure(status, message) {
  return Object.assign(new Error(message), {status});
}

export function createSession({env, firebase}) {
  const enabled = env.SOAC_M02_RENDER_PRODUCTION === 'true' &&
    env.SOAC_M02_PRODUCTION_ENABLED === 'true';
  const uids = value => new Set((value || '').split(',').map(uid => uid.trim()).filter(Boolean));
  const readers = uids(env.SOAC_M02_READER_UIDS);
  const editors = uids(env.SOAC_M02_EDITOR_UIDS);

  function requireSetup() {
    let origin;
    try { origin = new URL(env.SOAC_M02_ORIGIN); } catch {}
    if (!enabled || !env.SOAC_M02_DATABASE_URL || !env.SOAC_FIREBASE_ADMIN_JSON ||
        origin?.protocol !== 'https:' || origin.origin !== env.SOAC_M02_ORIGIN) {
      throw failure(503, 'Centro Digital aún no está configurado.');
    }
  }

  function authorize(claims) {
    const uid = claims.uid || claims.sub;
    if ((!readers.has(uid) && !editors.has(uid)) || claims.email_verified !== true ||
        claims.firebase?.sign_in_provider !== 'google.com') {
      throw failure(403, 'Cuenta sin autorización para Centro Digital.');
    }
    return {uid, write:editors.has(uid) && env.SOAC_M02_PRODUCTION_WRITES_ENABLED === 'true',
      expiresAt:claims.exp * 1000};
  }

  function cookie(value, seconds) {
    return COOKIE + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + seconds;
  }

  return {
    enabled, requireSetup,
    requireOrigin(req) {
      if (req.headers.origin !== env.SOAC_M02_ORIGIN) throw failure(403, 'Origen no autorizado.');
    },
    async get(req) {
      const value = req.headers.cookie?.split(';').map(part => part.trim())
        .find(part => part.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
      if (!value || value.length > 10000) throw failure(401, 'Inicia sesión en SOAC.');
      const auth = await firebase();
      let claims;
      try { claims = await auth.verifySessionCookie(value, true); }
      catch (error) {
        if (['auth/argument-error','auth/invalid-session-cookie','auth/session-cookie-expired',
          'auth/session-cookie-revoked','auth/user-disabled','auth/user-not-found'].includes(error.code)) {
          throw failure(401, 'Inicia sesión en SOAC.');
        }
        throw error;
      }
      return authorize(claims);
    },
    async login(token) {
      if (typeof token !== 'string' || token.length > 10000) throw failure(400, 'Inicio de sesión inválido.');
      const auth = await firebase();
      let claims;
      try { claims = await auth.verifyIdToken(token, true); }
      catch { throw failure(401, 'No se pudo validar la cuenta.'); }
      authorize(claims);
      const age = Date.now() / 1000 - claims.auth_time;
      if (!Number.isFinite(age) || age < -30 || age > 300) throw failure(401, 'Vuelve a iniciar sesión.');
      return cookie(await auth.createSessionCookie(token, {expiresIn:SESSION_MS}), SESSION_MS / 1000);
    },
    clearCookie: () => cookie('', 0)
  };
}

export async function handleJson(res, action) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try { res.end(JSON.stringify(await action())); }
  catch (error) {
    res.statusCode = error.status >= 400 && error.status < 500 ? error.status : 503;
    res.end(JSON.stringify({ok:false, error:res.statusCode < 500
      ? error.message : 'Servicio de Centro Digital no disponible.'}));
  }
}
