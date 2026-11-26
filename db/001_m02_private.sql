BEGIN;

CREATE SCHEMA soac_m02;
REVOKE ALL ON SCHEMA soac_m02 FROM PUBLIC;

CREATE TABLE soac_m02.fichas (
    id integer GENERATED ALWAYS AS IDENTITY (START WITH 7) PRIMARY KEY,
    values_json jsonb NOT NULL CHECK (jsonb_typeof(values_json) = 'array' AND jsonb_array_length(values_json) = 27),
    phone text GENERATED ALWAYS AS (
        CASE
            WHEN btrim(values_json ->> 1) ~ '^\+?[0-9 ()-]{10,32}$'
                AND regexp_replace(values_json ->> 1, '[^0-9]', '', 'g') ~ '^(521?)?[0-9]{10}$'
            THEN right(regexp_replace(values_json ->> 1, '[^0-9]', '', 'g'), 10)
        END
    ) STORED UNIQUE,
    folio text GENERATED ALWAYS AS (values_json ->> 10) STORED NOT NULL UNIQUE CHECK (length(folio) > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (COALESCE(values_json ->> 1, '') = '' OR phone IS NOT NULL)
);

CREATE TABLE soac_m02.citas (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    values_json jsonb NOT NULL CHECK (jsonb_typeof(values_json) = 'array' AND jsonb_array_length(values_json) BETWEEN 4 AND 53)
);

CREATE TABLE soac_m02.source_headers (
    source text PRIMARY KEY CHECK (source IN ('main', 'a0')),
    labels jsonb NOT NULL CHECK (jsonb_typeof(labels) = 'array')
);

CREATE TABLE soac_m02.initial_import (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    fingerprint text NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE soac_m02.audit_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ficha_id integer NOT NULL REFERENCES soac_m02.fichas(id),
    actor_uid text NOT NULL CHECK (length(actor_uid) > 0),
    action text NOT NULL CHECK (action IN ('create', 'edit')),
    changed_fields integer[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
