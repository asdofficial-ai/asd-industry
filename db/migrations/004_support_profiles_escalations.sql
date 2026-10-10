-- v0.9 human support hardening. No privileged identity/badge changes or real customer data.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_agent_profiles (
 staff_id uuid PRIMARY KEY REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
 display_name varchar(60) NOT NULL,
 department varchar(28) NOT NULL DEFAULT 'general' CHECK(department IN ('general','technical','projects','trust_safety')),
 avatar_preset varchar(16) NOT NULL DEFAULT 'orbit' CHECK(avatar_preset IN ('orbit','shield','spark','compass')),
 availability varchar(12) NOT NULL DEFAULT 'offline' CHECK(availability IN ('available','busy','away','offline')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (length(trim(display_name)) BETWEEN 2 AND 60)
);
CREATE INDEX IF NOT EXISTS industry_support_profiles_department_idx
 ON industry_support_agent_profiles(department,availability);
-- Do not modify existing verified public employee badges or publication consent.
-- Escalations are separate, one active item per case.
CREATE TABLE IF NOT EXISTS industry_support_escalations (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 raised_by uuid NOT NULL REFERENCES industry_staff_accounts(id),
 category varchar(24) NOT NULL CHECK(category IN ('technical','policy','safety','account_access','other')),
 reason varchar(500) NOT NULL CHECK(length(trim(reason)) >= 12),
 state varchar(14) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','reviewed')),
 reviewed_by uuid REFERENCES industry_staff_accounts(id),
 reviewed_at timestamptz,
 review_note varchar(500),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state='reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_note IS NOT NULL)
    OR (state='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS industry_support_one_pending_escalation_idx
 ON industry_support_escalations(case_id) WHERE state='pending';
CREATE INDEX IF NOT EXISTS industry_support_escalations_state_idx ON industry_support_escalations(state,created_at DESC);
ALTER TABLE industry_support_case_events DROP CONSTRAINT IF EXISTS industry_support_case_events_event_type_check;
ALTER TABLE industry_support_case_events ADD CONSTRAINT industry_support_case_events_event_type_check
 CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed','escalated','escalation_reviewed','profile_changed','department_changed'));
CREATE TABLE IF NOT EXISTS industry_support_team_audit (
 id uuid PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
 target_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
 action varchar(28) NOT NULL CHECK(action IN ('profile_updated','department_assigned')),
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $support004$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON industry_support_agent_profiles TO asd_industry_staff_runtime;
  GRANT SELECT,INSERT,UPDATE ON industry_support_escalations TO asd_industry_staff_runtime;
  GRANT SELECT,INSERT ON industry_support_team_audit TO asd_industry_staff_runtime;
 END IF;
END $support004$;
COMMIT;
