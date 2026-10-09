-- ASD Industry v0.7: ISOLATED adult-test staff review database.
-- Never use ASD Pay's database. No under-18 real accounts or reviews are supported.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_staff_accounts (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  role varchar(18) NOT NULL CHECK(role IN ('founder','reviewer','safety')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS industry_staff_email_ci ON industry_staff_accounts(lower(email));
CREATE TABLE IF NOT EXISTS industry_staff_sessions (
  id uuid PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_staff_sessions_expiry ON industry_staff_sessions(expires_at);
CREATE TABLE IF NOT EXISTS industry_review_requests (
  id uuid PRIMARY KEY,
  creator_label varchar(24) NOT NULL,
  title varchar(70) NOT NULL,
  description varchar(900) NOT NULL,
  category varchar(24) NOT NULL,
  requested_seats smallint NOT NULL CHECK(requested_seats BETWEEN 1 AND 12),
  requested_roles text[] NOT NULL DEFAULT '{}',
  status varchar(18) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','changes_requested','declined')),
  version integer NOT NULL DEFAULT 1 CHECK(version>=1),
  created_by uuid REFERENCES industry_staff_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_review_requests_status ON industry_review_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS industry_staff_reports (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES industry_review_requests(id) ON DELETE CASCADE,
  request_version integer NOT NULL,
  engine varchar(24) NOT NULL CHECK(engine IN ('deterministic-demo','approved-model')),
  packet jsonb NOT NULL,
  prepared_by uuid REFERENCES industry_staff_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_staff_reports_request ON industry_staff_reports(request_id,created_at DESC);
CREATE TABLE IF NOT EXISTS industry_human_decisions (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE REFERENCES industry_review_requests(id),
  report_id uuid NOT NULL REFERENCES industry_staff_reports(id),
  reviewer_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
  decision varchar(18) NOT NULL CHECK(decision IN ('approved','changes_requested','declined')),
  rationale varchar(500) NOT NULL CHECK(length(trim(rationale))>=12),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS industry_staff_audit (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES industry_staff_accounts(id),
  action varchar(50) NOT NULL,
  request_id uuid REFERENCES industry_review_requests(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_staff_audit_created ON industry_staff_audit(created_at DESC);
COMMIT;
