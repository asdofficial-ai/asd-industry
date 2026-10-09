-- ASD Industry v0.8 private identity-role architecture.
-- Run only in the dedicated ASD Industry staff database with private administrator credentials.
-- Existing staff accounts remain unchanged. No production/staging database writes by this file alone.
BEGIN;
ALTER TABLE industry_staff_accounts DROP CONSTRAINT IF EXISTS industry_staff_accounts_role_check;
ALTER TABLE industry_staff_accounts ADD CONSTRAINT industry_staff_accounts_role_check
 CHECK(role IN ('founder','manager','reviewer','safety','support'));
-- Only one enabled platform Founder. Project creators are separate community identities.
CREATE UNIQUE INDEX IF NOT EXISTS industry_single_enabled_founder_idx
 ON industry_staff_accounts ((role)) WHERE role='founder' AND enabled=true;

-- Private, verified employee profiles: no self-service change to verification badge.
CREATE TABLE IF NOT EXISTS industry_staff_public_profiles (
 staff_id uuid PRIMARY KEY REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
 display_name varchar(80) NOT NULL,
 badge_verified_at timestamptz,
 directory_opt_in boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (length(trim(display_name)) BETWEEN 2 AND 80)
);

-- Only encrypted founder emergency profile payloads can be stored.
-- Never put passwords, raw ID documents, recovery codes, seed phrases or API keys here.
CREATE TABLE IF NOT EXISTS industry_founder_emergency_profiles (
 staff_id uuid PRIMARY KEY REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
 encrypted_payload text NOT NULL,
 encryption_version smallint NOT NULL DEFAULT 1 CHECK(encryption_version=1),
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cases initially accept only non-sensitive metadata; identity proofs are NOT uploaded
-- or retained until a separately reviewed secure evidence process is implemented.
CREATE TABLE IF NOT EXISTS industry_account_recovery_cases (
 id uuid PRIMARY KEY,
 account_email_digest char(64) NOT NULL,
 request_category varchar(30) NOT NULL CHECK (request_category IN ('password_reset','account_access')),
 status varchar(24) NOT NULL DEFAULT 'pending_review'
  CHECK (status IN ('pending_review','needs_verification','escalated','approved_for_reset','denied','closed')),
 opened_by uuid REFERENCES industry_staff_accounts(id),
 reviewed_by uuid REFERENCES industry_staff_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status <> 'approved_for_reset' OR reviewed_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS industry_account_recovery_status_idx
 ON industry_account_recovery_cases(status,created_at DESC);
-- Existing restricted runtime staff identity can read VERIFIED opt-in public badge data only.
-- It receives NO SELECT or UPDATE privilege on founder emergency profiles or recovery cases.
DO $asdroles$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT ON industry_staff_public_profiles TO asd_industry_staff_runtime;
 END IF;
END $asdroles$;
-- The owner must verify employment and opt-in from an isolated privileged admin process.
-- No browser or staff service is granted INSERT/UPDATE/DELETE on badge metadata.

COMMIT;
