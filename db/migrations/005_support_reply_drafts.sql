-- Human Support private reply drafts: never outbound, never customer visible.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_reply_drafts (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
 body varchar(900) NOT NULL CHECK(length(trim(body)) BETWEEN 12 AND 900),
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,author_id)
);
CREATE INDEX IF NOT EXISTS industry_support_reply_drafts_case_idx ON industry_support_reply_drafts(case_id,updated_at DESC);
ALTER TABLE industry_support_case_events DROP CONSTRAINT IF EXISTS industry_support_case_events_event_type_check;
ALTER TABLE industry_support_case_events ADD CONSTRAINT industry_support_case_events_event_type_check
 CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed','escalated','escalation_reviewed','profile_changed','department_changed','reply_drafted'));
DO $draftrole$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON industry_support_reply_drafts TO asd_industry_staff_runtime;
 END IF;
END $draftrole$;
COMMIT;