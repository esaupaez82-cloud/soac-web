CREATE TABLE IF NOT EXISTS soac_m02.financing_quotes (
    id uuid PRIMARY KEY,
    ficha_folio text NOT NULL REFERENCES soac_m02.fichas(folio),
    actor_uid text NOT NULL,
    fingerprint text NOT NULL,
    terms jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ficha_folio, actor_uid, fingerprint)
);
