-- FUTURE authenticated AI-to-human handoff grants.
-- No public issuance or redemption endpoint is enabled.
-- Customer identity must come from a verified server session, never browser input.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_handoff_grants (
 id uuid PRIMARY KEY,
 customer_subject_hash varchar(64) NOT NULL CHECK(customer_subject_hash ~ '^[a-f0-9]{64}$'),
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 ai_assessment_id uuid NOT NULL UNIQUE,
 reason varchar(30) NOT NULL CHECK(reason IN
  ('cannot_answer','insufficient_confidence','permission_denied','action_unsupported','human_requested')),
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 revoked_at timestamptz,
 CHECK(expires_at > issued_at),
 CHECK(expires_at <= issued_at + interval '15 minutes'),
 CHECK(consumed_at IS NULL OR revoked_at IS NULL)
);
CREATE INDEX IF NOT EXISTS industry_support_handoff_expiry_idx
 ON industry_support_handoff_grants(expires_at) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS industry_support_handoff_events (
 id uuid PRIMARY KEY,
 grant_id uuid NOT NULL REFERENCES industry_support_handoff_grants(id),
 event_type varchar(16) NOT NULL CHECK(event_type IN ('issued','redeemed','revoked','expired')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_support_handoff_event_grant_idx
 ON industry_support_handoff_events(grant_id,created_at);
-- Intentionally NO runtime grants: not even staff or AI demo services can issue
-- real customer grants until a dedicated customer-authenticated API exists.
COMMIT;
