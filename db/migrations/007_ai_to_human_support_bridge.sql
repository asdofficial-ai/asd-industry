-- ASD Industry v0.9 AI -> Human Support bridge (synthetic adult training only).
-- This migration does NOT activate public messaging, real customer identity, or AI model access.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_ai_handoffs (
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL UNIQUE,
 case_id uuid NOT NULL UNIQUE REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 created_by_manager uuid NOT NULL REFERENCES industry_staff_accounts(id),
 question varchar(500) NOT NULL CHECK(length(trim(question)) BETWEEN 15 AND 500),
 assessment_reason varchar(32) NOT NULL CHECK(assessment_reason IN
   ('cannot_answer','insufficient_confidence','permission_denied','action_unsupported','human_requested')),
 knowledge_version varchar(40) NOT NULL,
 simulated boolean NOT NULL DEFAULT true CHECK(simulated=true),
 real_customer_id uuid,
 external_delivery boolean NOT NULL DEFAULT false CHECK(external_delivery=false),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(real_customer_id IS NULL)
);
CREATE INDEX IF NOT EXISTS industry_support_ai_handoffs_recent
 ON industry_support_ai_handoffs(created_at DESC);

ALTER TABLE industry_support_training_messages DROP CONSTRAINT IF EXISTS industry_support_training_messages_sender_kind_check;
ALTER TABLE industry_support_training_messages ADD CONSTRAINT industry_support_training_messages_sender_kind_check
 CHECK(sender_kind IN ('customer_simulator','human_agent','ai_support'));
ALTER TABLE industry_support_training_messages DROP CONSTRAINT IF EXISTS industry_support_training_messages_check;
-- Explicit separate names avoid accidental removal of other check constraints.
ALTER TABLE industry_support_training_messages
 ADD CONSTRAINT industry_support_training_sender_check CHECK(
  (sender_kind='human_agent' AND actor_staff_id IS NOT NULL)
  OR (sender_kind='customer_simulator' AND actor_staff_id IS NOT NULL)
  OR (sender_kind='ai_support' AND actor_staff_id IS NOT NULL));
-- Training messages must never reach anyone outside the isolated case.
ALTER TABLE industry_support_case_events DROP CONSTRAINT IF EXISTS industry_support_case_events_event_type_check;
ALTER TABLE industry_support_case_events ADD CONSTRAINT industry_support_case_events_event_type_check
 CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed','escalated',
 'escalation_reviewed','profile_changed','department_changed','reply_drafted',
 'training_message_added','ai_handoff_created'));

DO $support007$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT ON industry_support_ai_handoffs TO asd_industry_staff_runtime;
 END IF;
END $support007$;
COMMIT;
