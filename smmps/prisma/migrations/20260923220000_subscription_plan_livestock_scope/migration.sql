-- Livestock subscription scope: how many markets / livestock types a plan allows.
-- NULL means unlimited (all markets / all livestock types).
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_markets" INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_livestock_types" INTEGER;
