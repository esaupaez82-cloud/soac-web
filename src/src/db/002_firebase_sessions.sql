BEGIN;
CREATE TABLE IF NOT EXISTS soac_v4.session_google_tokens(
 token_hash text PRIMARY KEY REFERENCES soac_v4.sessions(token_hash) ON DELETE CASCADE,
 encrypted_access_token text NOT NULL,expires_at timestamptz NOT NULL);
INSERT INTO soac_v4.schema_versions(version) VALUES('002_firebase_sessions') ON CONFLICT DO NOTHING;
COMMIT;
