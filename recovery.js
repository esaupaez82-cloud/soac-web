import { timingSafeEqual } from 'node:crypto';

export function installRecovery(app, pool) {
  app.get('/internal/backup', async (req, res) => {
    const expected = process.env.SOAC_OPS_TOKEN || '';
    const supplied = String(req.headers['x-soac-token'] || '');
    if (!expected || expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return res.status(401).json({error:'Acceso restringido'});
    if (!pool) return res.status(503).json({error:'Base no configurada'});
    const cx = await pool.connect();
    const quote = value => '"' + value.replaceAll('"', '""') + '"';
    try {
      await cx.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const tables = await cx.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
      const data = {};
      for (const {tablename} of tables.rows) {
        const rows = await cx.query('SELECT * FROM public.' + quote(tablename));
        const columns = await cx.query("SELECT a.attname AS name, pg_catalog.format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null, pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum", [tablename]);
        const constraints = await cx.query("SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=to_regclass($1)", ['public.'+quote(tablename)]);
        const indexes = await cx.query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1",[tablename]);
        data[tablename] = {columns:columns.rows,constraints:constraints.rows,indexes:indexes.rows,rows:rows.rows};
      }
      const sequences = await cx.query("SELECT sequencename,start_value,min_value,max_value,increment_by,cycle,last_value FROM pg_sequences WHERE schemaname='public'");
      await cx.query('COMMIT');
      res.set('Cache-Control','no-store').json({format:'soac-logical-backup-v1',createdAt:new Date().toISOString(),tables:data,sequences:sequences.rows});
    } catch (_) {
      await cx.query('ROLLBACK').catch(()=>{});
      res.status(500).json({error:'No se completó el respaldo'});
    } finally { cx.release(); }
  });
}
