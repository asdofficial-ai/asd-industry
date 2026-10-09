-- ASD Industry Founder Account v0.9 — restricted human-controlled operations.
-- Apply to the dedicated ASD Industry database only. Does not authorize live youth accounts.
BEGIN;
CREATE TABLE IF NOT EXISTS industry_founder_preferences (
 staff_id uuid PRIMARY KEY REFERENCES industry_staff_accounts(id) ON DELETE CASCADE,
 theme varchar(30) NOT NULL DEFAULT 'global-blue'
 CHECK(theme IN ('command-red','luxury-gold','global-blue','visionary-green',
 'command-purple','industrial-orange','executive-white')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS industry_ai_agent_controls (
 agent_id varchar(30) PRIMARY KEY
 CHECK(agent_id IN ('intake','safety','feasibility','matching','operations')),
 review_enabled boolean NOT NULL DEFAULT true,
 updated_by uuid REFERENCES industry_staff_accounts(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO industry_ai_agent_controls(agent_id) VALUES
 ('intake'),('safety'),('feasibility'),('matching'),('operations')
 ON CONFLICT (agent_id) DO NOTHING;
COMMIT;