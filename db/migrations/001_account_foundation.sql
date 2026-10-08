-- ASD Industry v0.4, PRIVATE adult-invite beta only.
-- DO NOT OPEN TO MINORS UNTIL CHILD-SAFETY, VERIFIED CONSENT AND MODERATION ARE IMPLEMENTED.
-- Run with: npm run db:migrate. No direct browser access to these tables.
BEGIN;
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  handle varchar(24) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  age_group varchar(12) NOT NULL DEFAULT '18+' CHECK(age_group = '18+'),
  status varchar(20) NOT NULL DEFAULT 'tester' CHECK(status IN ('tester','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_handle_unique_ci ON accounts (lower(handle));
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique_ci ON accounts (lower(email));

CREATE TABLE IF NOT EXISTS account_profiles (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  role varchar(40) NOT NULL,
  availability varchar(16) NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS beta_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_sessions_account_id_idx ON beta_sessions(account_id);
CREATE INDEX IF NOT EXISTS beta_sessions_expires_at_idx ON beta_sessions(expires_at);
COMMIT;
