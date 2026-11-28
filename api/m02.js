import {database, session} from '../lib/m02-providers.js';
import {handleJson, failure} from '../lib/m02-session.js';

import {prepareDraft} from '../lib/m02-drafts.js';
import {writeFicha} from '../lib/m02-writes.js';

export default function m02(req, res) {
  return handleJson(res, async () => {
    const params = new URL(req.url, 'http://localhost').searchParams;
    if (req.method === 'GET' && params.get('action') === 'mode') return {enabled:session.enabled};
    session.requireSetup();
    const user = await session.get(req);
    if (req.method === 'POST') {
      session.requireOrigin(req);
      if (!user.write) throw failure(403, 'La cuenta tiene acceso de consulta.');
      if (!req.is('application/json')) throw failure(415, 'Formato inválido.');
      const action = params.get('action') || 'edit';
      if (action === 'draft') return prepareDraft(database, req.body);
      return writeFicha(database, user.uid, action, req.body);
    }
    if (req.method !== 'GET') throw failure(405, 'Método no permitido.');
    const source = params.get('source') || 'main';
    const queries = {
      main:'SELECT values_json, id AS position FROM soac_m02.fichas',
      a0:'SELECT values_json, id AS position FROM soac_m02.citas'
    };
    if (!Object.hasOwn(queries, source)) throw failure(400, 'Origen inválido.');
    const result = await database.query(
      'SELECT labels AS values_json, 0 AS position FROM soac_m02.source_headers WHERE source = $1 ' +
      'UNION ALL ' + queries[source] + ' ORDER BY position',
      [source]
    );
    return {values:result.rows.map(row => row.values_json), write:user.write, expiresAt:user.expiresAt};
  });
}
