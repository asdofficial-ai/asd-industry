-- v1.0 ASD Industry founder MFA. Private staff data only.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_staff_mfa (
 staff_id uuid PRIMARY KEY REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
 secret_ciphertext text NOT NULL,
 last_accepted_counter bigint NOT NULL DEFAULT -1,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;