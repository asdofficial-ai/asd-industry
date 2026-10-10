-- v0.9 human customer support — STAFF-ONLY, disposable synthetic adult-test cases.
-- Separate from Founder emergency records, account credentials, AI assistant identities and public accounts.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_cases (
 id uuid PRIMARY KEY,
 subject varchar(120) NOT NULL CHECK(length(trim(subject))>=5),
 requester_alias varchar(40) NOT NULL CHECK(length(trim(requester_alias))>=3),
 description varchar(900) NOT NULL CHECK(length(trim(description))>=15),
 category varchar(25) NOT NULL CHECK(category IN ('general','account_access','technical','project_help','safety_report')),
 priority varchar(10) NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
 status varchar(24) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_on_customer','escalated','resolved','closed')),
 assigned_staff_id uuid REFERENCES industry_staff_accounts(id),
 created_by uuid NOT NULL REFERENCES industry_staff_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS industry_support_cases_queue_idx ON industry_support_cases(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS industry_support_cases_assignee_idx ON industry_support_cases(assigned_staff_id,updated_at DESC);

-- All case events are append-only. No storage of passwords, ID images or recovery proof.
CREATE TABLE IF NOT EXISTS industry_support_case_events (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
 event_type varchar(24) NOT NULL CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed')),
 body varchar(900),
 old_status varchar(24),
 new_status varchar(24),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS industry_support_events_case_idx ON industry_support_case_events(case_id,created_at ASC);

-- Controlled runtime DB permissions; none on founder/recovery databases or account password hashes beyond existing login SELECT.
DO $supportrole$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON industry_support_cases TO asd_industry_staff_runtime;
  GRANT SELECT,INSERT ON industry_support_case_events TO asd_industry_staff_runtime;
 END IF;
END $supportrole$;
COMMIT;
