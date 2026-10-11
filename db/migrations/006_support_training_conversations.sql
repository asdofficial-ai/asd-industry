-- ASD Industry synthetic Human Support conversation — not real customer messaging.
-- Append-only training messages, no external user addresses or live message delivery.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_support_training_messages (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES industry_support_cases(id) ON DELETE CASCADE,
 sender_kind varchar(22) NOT NULL CHECK(sender_kind IN ('customer_simulator','human_agent')),
 actor_staff_id uuid REFERENCES industry_staff_accounts(id),
 body varchar(900) NOT NULL CHECK(length(trim(body)) BETWEEN 12 AND 900),
 simulation_only boolean NOT NULL DEFAULT true CHECK(simulation_only=true),
 external_delivery boolean NOT NULL DEFAULT false CHECK(external_delivery=false),
 idempotency_key uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((sender_kind='human_agent' AND actor_staff_id IS NOT NULL)
    OR (sender_kind='customer_simulator')),
 CHECK(idempotency_key IS NOT NULL OR sender_kind='customer_simulator')
);
CREATE UNIQUE INDEX IF NOT EXISTS industry_support_training_dedupe
 ON industry_support_training_messages(case_id,actor_staff_id,idempotency_key)
 WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS industry_support_training_history
 ON industry_support_training_messages(case_id,created_at,id);
ALTER TABLE industry_support_case_events DROP CONSTRAINT IF EXISTS industry_support_case_events_event_type_check;
ALTER TABLE industry_support_case_events ADD CONSTRAINT industry_support_case_events_event_type_check
 CHECK(event_type IN ('created','claimed','assigned','internal_note','status_changed',
   'escalated','escalation_reviewed','profile_changed','department_changed',
   'reply_drafted','training_message_added'));
DO $support006$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='asd_industry_staff_runtime') THEN
  GRANT SELECT,INSERT ON industry_support_training_messages TO asd_industry_staff_runtime;
 END IF;
END $support006$;
COMMIT;
