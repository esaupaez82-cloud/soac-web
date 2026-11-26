import {createHash} from 'node:crypto';

const tables = [
  {source:'main', table:'fichas', min:27, max:27},
  {source:'a0', table:'citas', min:4, max:53}
];

function normalize(rows, min, max) {
  if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row) ||
      row.length > max || row.some(cell => typeof cell !== 'string'))) {
    throw new Error('Rango de origen inválido.');
  }
  return rows.filter(row => row.some(cell => cell.trim())).map(row =>
    Array.from({length:Math.max(row.length, min)}, (_, index) => row[index] ?? ''));
}

export async function importSnapshot(db, snapshot) {
  let clearedInvalidPhones = 0;
  const prepared = tables.map(({source, table, min, max}) => {
    const [header, ...rows] = normalize(snapshot[source], min, max);
    if (!header || !header[0] || (source === 'main' && (!header[1] || !header[10] || !rows.length))) {
      throw new Error('Faltan los encabezados o las fichas del origen.');
    }
    if (source === 'main') {
      for (const row of rows) {
        const phone = row[1].trim();
        if (row[1] && (!/^\+?[0-9 ()-]{10,32}$/.test(phone) ||
            !/^(521?)?[0-9]{10}$/.test(phone.replace(/[^0-9]/g, '')))) {
          row[1] = '';
          clearedInvalidPhones++;
        }
      }
    }
    return {source, table, header, rows};
  });
  const fingerprint = createHash('sha256').update(JSON.stringify(prepared)).digest('hex');
  const counts = Object.fromEntries(prepared.map(({source, rows}) => [source, rows.length]));

  await db.query('BEGIN');
  try {
    await db.query('LOCK TABLE soac_m02.initial_import, soac_m02.source_headers, soac_m02.fichas, soac_m02.citas IN EXCLUSIVE MODE');
    const marker = await db.query('SELECT fingerprint FROM soac_m02.initial_import');
    if (marker.rows.length && marker.rows[0].fingerprint !== fingerprint) {
      throw new Error('El destino ya tiene una importación diferente.');
    }
    for (const {source, table, header, rows} of prepared) {
      const existing = await db.query('SELECT values_json FROM soac_m02.' + table + ' ORDER BY id');
      const labels = await db.query('SELECT labels FROM soac_m02.source_headers WHERE source = $1', [source]);
      if (!marker.rows.length) {
        if (existing.rows.length || labels.rows.length) throw new Error('El destino no está vacío.');
        await db.query('INSERT INTO soac_m02.source_headers (source, labels) VALUES ($1, $2::jsonb)',
          [source, JSON.stringify(header)]);
        for (const row of rows) {
          await db.query('INSERT INTO soac_m02.' + table + ' (values_json) VALUES ($1::jsonb)', [JSON.stringify(row)]);
        }
      }
      const stored = await db.query('SELECT values_json FROM soac_m02.' + table + ' ORDER BY id');
      const storedHeader = await db.query('SELECT labels FROM soac_m02.source_headers WHERE source = $1', [source]);
      if (JSON.stringify(stored.rows.map(row => row.values_json)) !== JSON.stringify(rows) ||
          JSON.stringify(storedHeader.rows[0]?.labels) !== JSON.stringify(header)) {
        throw new Error('El cotejo de la importación falló.');
      }
    }
    if (!marker.rows.length) {
      await db.query('INSERT INTO soac_m02.initial_import (fingerprint) VALUES ($1)', [fingerprint]);
    }
    await db.query('COMMIT');
    return {counts, clearedInvalidPhones, alreadyImported:Boolean(marker.rows.length)};
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
