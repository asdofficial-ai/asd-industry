-- Google verified owner-email identity proof only; no Founder privileges or staff records.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_founder_google_claims (
 email varchar(254) PRIMARY KEY,
 google_subject varchar(128) UNIQUE NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;