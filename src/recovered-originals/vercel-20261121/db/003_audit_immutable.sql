-- Additive audit protection. The managed runtime may inherit pg_write_all_data;
-- inherited DML must never allow rewriting or removing the audit history.
BEGIN;
CREATE OR REPLACE FUNCTION soac_v4.audit_immutable_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'SOAC_AUDIT_IMMUTABLE' USING ERRCODE='42501';
END;
$$;
CREATE OR REPLACE TRIGGER soac_audit_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON soac_v4.audit
FOR EACH STATEMENT EXECUTE FUNCTION soac_v4.audit_immutable_guard();
ALTER TABLE soac_v4.audit ENABLE ALWAYS TRIGGER soac_audit_immutable;
ALTER TABLE soac_v4.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE soac_v4.audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS soac_audit_read ON soac_v4.audit;
CREATE POLICY soac_audit_read ON soac_v4.audit FOR SELECT USING (true);
DROP POLICY IF EXISTS soac_audit_append ON soac_v4.audit;
CREATE POLICY soac_audit_append ON soac_v4.audit FOR INSERT WITH CHECK (true);
INSERT INTO soac_v4.schema_versions(version) VALUES('003_audit_immutable') ON CONFLICT DO NOTHING;
COMMIT;
