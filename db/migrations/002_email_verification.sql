-- v0.4 email verification, separate ASD Industry PostgreSQL DB only.
-- Pending signups have no login access and no session until verification.
BEGIN;
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_status_check CHECK (status IN ('pending_email','tester','disabled'));
CREATE TABLE IF NOT EXISTS email_verifications (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  attempts smallint NOT NULL DEFAULT 0 CHECK(attempts >= 0 AND attempts <= 5)
);
CREATE INDEX IF NOT EXISTS email_verifications_expires_at_idx ON email_verifications(expires_at);
COMMIT;
