-- ASD Industry private Human Support simulated thread messages (NO external delivery).
-- No customer identity/session, customer inbox, real email or real-time API.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_training_messages (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 actor_staff_id uuid NOT NULL REFERENCES industry_staff_accounts(id),
 request_id uuid NOT NULL,
 speaker varchar(20) NOT NULL CHECK(speaker IN ('customer_simulated','agent_simulated')),
 body varchar(900) NOT NULL CHECK(length(trim(body)) BETWEEN 12 AND 900),
 external_delivery boolean NOT NULL DEFAULT false CHECK(external_delivery=false),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (case_id,actor_staff_id,request_id)
);
CREATE INDEX IF NOT EXISTS industry_support_training_messages_thread_idx
 ON industry_support_training_messages(case_id,created_at ASC,id ASC);
ALTER TABLE industry_support_case_events DROP CONSTRAINT IF EXISTS industry_support_case_events_event_type_check;
ALTER TABLE industry_support_case_events ADD CONSTRAINT industry_support_case_events_event_type_check
 CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed','escalated',
 'escalation_reviewed','profile_changed','department_changed','reply_drafted','training_message_posted'));
DO $support_threads$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT ON industry_support_training_messages TO asd_industry_staff_runtime;
 END IF;
END $support_threads$;
COMMIT;