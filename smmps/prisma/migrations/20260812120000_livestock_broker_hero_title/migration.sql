-- AlterTable
ALTER TABLE "livestock_brokers" ADD COLUMN IF NOT EXISTS "hero_title" TEXT;

-- Backfill Somali page titles from section defaults where missing
UPDATE "livestock_brokers"
SET "hero_title" = CASE
  WHEN email = 'camel@livestock.so' THEN 'Geelka'
  WHEN email = 'cattle@livestock.so' THEN 'Loda'
  WHEN email = 'goat@livestock.so' THEN 'Arriga'
  ELSE "hero_title"
END
WHERE email IN ('camel@livestock.so', 'cattle@livestock.so', 'goat@livestock.so')
  AND ("hero_title" IS NULL OR "hero_title" = '');

UPDATE "livestock_brokers"
SET "location" = 'Mogadishu, Banadir, Somalia'
WHERE email IN ('camel@livestock.so', 'cattle@livestock.so', 'goat@livestock.so')
  AND ("location" IS NULL OR "location" = 'Mogadishu');
