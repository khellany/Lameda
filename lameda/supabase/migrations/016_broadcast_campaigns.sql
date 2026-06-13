-- Migration 016 — STORY-030: Broadcast campaign manager
--
-- Safe to re-run: ENUMs use exception handlers, tables/indexes use IF NOT EXISTS.

DO $$
BEGIN
  CREATE TYPE broadcast_status AS ENUM ('draft', 'sending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE broadcast_segment AS ENUM ('all_opted_in', 'past_buyers', 'abandoned_cart');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  segment         broadcast_segment NOT NULL,
  message         TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status          broadcast_status NOT NULL DEFAULT 'draft',

  sent_count      INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'broadcast_campaigns_updated_at'
      AND tgrelid = 'broadcast_campaigns'::regclass
  ) THEN
    CREATE TRIGGER broadcast_campaigns_updated_at
      BEFORE UPDATE ON broadcast_campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_merchant
  ON broadcast_campaigns(merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  campaign_id     UUID NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message   TEXT,

  UNIQUE (campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign
  ON broadcast_recipients(campaign_id);
