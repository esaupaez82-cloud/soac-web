import {randomUUID} from 'node:crypto';
import {failure} from './m02-session.js';

const editable = new Map([[3,400],[4,1000],[5,8000],[6,200],[7,400],[9,4000],[24,8000],[25,400],[26,1000]]);

function required(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw failure(400, 'Completa el nombre, responsable y siguiente acción.');
  }
  return value.trim();
}

async function create(db, uid, body) {
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  if (!/^\+?[0-9 ()-]{10,32}$/.test(phone) || !/^(521?)?\d{10}$/.test(phone.replace(/\D/g,''))) {
    throw failure(400, 'Introduce un teléfono mexicano válido de 10 dígitos.');
  }
  const labels = (await db.query("SELECT labels FROM soac_m02.source_headers WHERE source = 'main'")).rows[0]?.labels;
  const findColumn = label => labels?.findIndex(value => String(value).normalize('NFD')
    .replace(/\p{Diacritic}/gu,'').trim().toLowerCase() === label);
  const owner = findColumn('responsable');
  const nextAction = findColumn('siguiente accion');
  if (!editable.has(owner) || !editable.has(nextAction) || owner === nextAction) {
    throw failure(503, 'Encabezados de fichas sin verificar.');
  }
  const row = Array(27).fill('');
  row[0] = required(body.name, 200);
  row[1] = phone.replace(/\D/g,'').slice(-10);
  row[10] = 'M02-' + randomUUID();
  row[owner] = required(body.owner, 200);
  row[nextAction] = required(body.nextAction, 8000);
  const result = await db.query(`
    WITH inserted AS (
      INSERT INTO soac_m02.fichas (values_json) VALUES ($1::jsonb)
      ON CONFLICT (phone) DO NOTHING RETURNING id, folio, values_json
    ), audited AS (
      INSERT INTO soac_m02.audit_events (ficha_id, actor_uid, action, changed_fields)
      SELECT id, $2, 'create', $3::int[] FROM inserted
    )
    SELECT folio, values_json FROM inserted`,
  [JSON.stringify(row), uid, [0,1,10,owner,nextAction]]);
  if (!result.rows.length) throw failure(409, 'Ya existe una ficha con ese teléfono.');
  return {ok:true, folio:result.rows[0].folio, values:result.rows[0].values_json};
}

async function edit(db, uid, body) {
  const {folio, changes} = body ?? {};
  if (typeof folio !== 'string' || !folio || folio.length > 200 ||
      !Array.isArray(changes) || !changes.length || changes.length > editable.size ||
      new Set(changes.map(change => change?.column)).size !== changes.length ||
      changes.some(change => !editable.has(change?.column) ||
        typeof change.previous !== 'string' || change.previous.length > 8000 ||
        typeof change.value !== 'string' || change.value.length > editable.get(change.column))) {
    throw failure(400, 'Los cambios de la ficha no son válidos.');
  }
  const result = await db.query(`
    WITH target AS MATERIALIZED (
      SELECT id, values_json FROM soac_m02.fichas WHERE folio = $1 FOR UPDATE
    ), edits AS (
      SELECT * FROM jsonb_to_recordset($2::jsonb) AS change("column" int, previous text, value text)
    ), updated AS (
      UPDATE soac_m02.fichas AS ficha
      SET values_json = (SELECT jsonb_agg(COALESCE(to_jsonb(edits.value), item.cell) ORDER BY item.position)
        FROM jsonb_array_elements(target.values_json) WITH ORDINALITY AS item(cell, position)
        LEFT JOIN edits ON edits."column" = item.position - 1), updated_at = now()
      FROM target WHERE ficha.id = target.id AND NOT EXISTS (
        SELECT 1 FROM edits WHERE (target.values_json ->> edits."column") IS DISTINCT FROM edits.previous
      )
      RETURNING ficha.id, ficha.folio, ficha.values_json
    ), audited AS (
      INSERT INTO soac_m02.audit_events (ficha_id, actor_uid, action, changed_fields)
      SELECT id, $3, 'edit', $4::int[] FROM updated
    )
    SELECT folio, values_json FROM updated`,
  [folio, JSON.stringify(changes), uid, changes.map(change => change.column)]);
  if (!result.rows.length) throw failure(409, 'La ficha cambió o ya no está disponible. Actualiza los registros.');
  return {ok:true, folio:result.rows[0].folio, values:result.rows[0].values_json};
}

export function writeFicha(db, uid, action, body) {
  if (action === 'create') return create(db, uid, body);
  if (action === 'edit') return edit(db, uid, body);
  throw failure(400, 'Acción inválida.');
}
