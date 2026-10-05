-- Livestock sector catalog: categories, animal types, M2M assignments

CREATE TABLE IF NOT EXISTS "livestock_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_somali" TEXT,
    "description" TEXT,
    "species" "AnimalType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "livestock_categories_slug_key" ON "livestock_categories"("slug");
CREATE INDEX IF NOT EXISTS "livestock_categories_status_sort_order_idx" ON "livestock_categories"("status", "sort_order");

CREATE TABLE IF NOT EXISTS "livestock_animal_types" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_somali" TEXT,
    "description" TEXT,
    "unit" TEXT DEFAULT 'head',
    "legacy_animal_type" "AnimalType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_animal_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "livestock_animal_types_category_id_slug_key" ON "livestock_animal_types"("category_id", "slug");
CREATE INDEX IF NOT EXISTS "livestock_animal_types_category_id_status_sort_order_idx" ON "livestock_animal_types"("category_id", "status", "sort_order");

ALTER TABLE "livestock_animal_types"
  ADD CONSTRAINT "livestock_animal_types_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "livestock_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "livestock_broker_markets" (
    "broker_id" INTEGER NOT NULL,
    "market_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_broker_markets_pkey" PRIMARY KEY ("broker_id", "market_id")
);

CREATE INDEX IF NOT EXISTS "livestock_broker_markets_market_id_idx" ON "livestock_broker_markets"("market_id");

ALTER TABLE "livestock_broker_markets"
  ADD CONSTRAINT "livestock_broker_markets_broker_id_fkey"
  FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "livestock_broker_markets"
  ADD CONSTRAINT "livestock_broker_markets_market_id_fkey"
  FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "livestock_broker_categories" (
    "broker_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_broker_categories_pkey" PRIMARY KEY ("broker_id", "category_id")
);

CREATE INDEX IF NOT EXISTS "livestock_broker_categories_category_id_idx" ON "livestock_broker_categories"("category_id");

ALTER TABLE "livestock_broker_categories"
  ADD CONSTRAINT "livestock_broker_categories_broker_id_fkey"
  FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "livestock_broker_categories"
  ADD CONSTRAINT "livestock_broker_categories_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "livestock_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "livestock_broker_animal_types" (
    "broker_id" INTEGER NOT NULL,
    "animal_type_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_broker_animal_types_pkey" PRIMARY KEY ("broker_id", "animal_type_id")
);

CREATE INDEX IF NOT EXISTS "livestock_broker_animal_types_animal_type_id_idx" ON "livestock_broker_animal_types"("animal_type_id");

ALTER TABLE "livestock_broker_animal_types"
  ADD CONSTRAINT "livestock_broker_animal_types_broker_id_fkey"
  FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "livestock_broker_animal_types"
  ADD CONSTRAINT "livestock_broker_animal_types_animal_type_id_fkey"
  FOREIGN KEY ("animal_type_id") REFERENCES "livestock_animal_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "livestock_market_categories" (
    "market_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_market_categories_pkey" PRIMARY KEY ("market_id", "category_id")
);

CREATE INDEX IF NOT EXISTS "livestock_market_categories_category_id_idx" ON "livestock_market_categories"("category_id");

ALTER TABLE "livestock_market_categories"
  ADD CONSTRAINT "livestock_market_categories_market_id_fkey"
  FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "livestock_market_categories"
  ADD CONSTRAINT "livestock_market_categories_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "livestock_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "livestock_brokers" ADD COLUMN IF NOT EXISTS "broker_code" TEXT;
ALTER TABLE "livestock_brokers" ADD COLUMN IF NOT EXISTS "approval_status" "UserStatus" NOT NULL DEFAULT 'APPROVED';

CREATE UNIQUE INDEX IF NOT EXISTS "livestock_brokers_broker_code_key" ON "livestock_brokers"("broker_code");
CREATE INDEX IF NOT EXISTS "livestock_brokers_approval_status_idx" ON "livestock_brokers"("approval_status");

ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "markets_code_key" ON "markets"("code");

ALTER TABLE "livestock_prices" ADD COLUMN IF NOT EXISTS "livestock_category_id" INTEGER;
ALTER TABLE "livestock_prices" ADD COLUMN IF NOT EXISTS "livestock_type_id" INTEGER;
ALTER TABLE "livestock_prices" ADD COLUMN IF NOT EXISTS "unit" TEXT;

CREATE INDEX IF NOT EXISTS "livestock_prices_livestock_category_id_idx" ON "livestock_prices"("livestock_category_id");
CREATE INDEX IF NOT EXISTS "livestock_prices_livestock_type_id_idx" ON "livestock_prices"("livestock_type_id");
CREATE INDEX IF NOT EXISTS "livestock_prices_market_id_idx" ON "livestock_prices"("market_id");

ALTER TABLE "livestock_prices"
  ADD CONSTRAINT "livestock_prices_livestock_category_id_fkey"
  FOREIGN KEY ("livestock_category_id") REFERENCES "livestock_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "livestock_prices"
  ADD CONSTRAINT "livestock_prices_livestock_type_id_fkey"
  FOREIGN KEY ("livestock_type_id") REFERENCES "livestock_animal_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the three livestock categories
INSERT INTO "livestock_categories" ("slug", "name", "name_somali", "description", "species", "status", "sort_order", "updated_at")
VALUES
  ('geel', 'Camels', 'Geel', 'Camel market category (Geelka)', 'CAMEL', 'ACTIVE', 1, CURRENT_TIMESTAMP),
  ('loda', 'Cattle', 'Lo''', 'Cattle market category (Loda)', 'CATTLE', 'ACTIVE', 2, CURRENT_TIMESTAMP),
  ('arri', 'Sheep & Goats', 'Ari', 'Sheep and goat market category (Arriga)', 'GOAT', 'ACTIVE', 3, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Seed animal types
INSERT INTO "livestock_animal_types" ("category_id", "slug", "name", "name_somali", "legacy_animal_type", "unit", "sort_order", "updated_at")
SELECT c.id, v.slug, v.name, v.name_somali, v.legacy::"AnimalType", 'head', v.sort_order, CURRENT_TIMESTAMP
FROM "livestock_categories" c
JOIN (
  VALUES
    ('geel', 'male-camel', 'Male Camel', 'Awr', 'CAMEL', 1),
    ('geel', 'female-camel', 'Female Camel', 'Hal', 'CAMEL', 2),
    ('geel', 'young-camel', 'Young Camel', 'Gurbac', 'CAMEL', 3),
    ('geel', 'young-female-camel', 'Young Female Camel', 'Qalin', 'CAMEL', 4),
    ('geel', 'breeding-male-camel', 'Breeding Male Camel', 'Baarqab', 'CAMEL', 5),
    ('loda', 'cow', 'Cow', 'Sac', 'CATTLE', 1),
    ('loda', 'bull', 'Bull', 'Dibi', 'CATTLE', 2),
    ('loda', 'calf', 'Calf', 'Weyl', 'CATTLE', 3),
    ('loda', 'heifer', 'Heifer', 'Qaalin', 'CATTLE', 4),
    ('arri', 'sheep', 'Sheep', 'Ido', 'SHEEP', 1),
    ('arri', 'goat', 'Goat', 'Ri', 'GOAT', 2),
    ('arri', 'male-goat', 'Male Goat', 'Orgi', 'GOAT', 3),
    ('arri', 'female-goat', 'Female Goat', 'Ri Dhedig', 'GOAT', 4),
    ('arri', 'lamb-kid', 'Lamb/Kid', 'Caysan', 'GOAT', 5)
) AS v(category_slug, slug, name, name_somali, legacy, sort_order)
  ON c.slug = v.category_slug
ON CONFLICT ("category_id", "slug") DO NOTHING;

-- Backfill broker codes
UPDATE "livestock_brokers"
SET "broker_code" = 'LB-' || LPAD(id::text, 5, '0')
WHERE "broker_code" IS NULL;

-- Backfill market codes for livestock markets
UPDATE "markets"
SET "code" = 'MKT-' || LPAD(id::text, 4, '0')
WHERE "code" IS NULL AND "market_type" = 'LIVESTOCK';

-- Copy legacy single market assignment into M2M
INSERT INTO "livestock_broker_markets" ("broker_id", "market_id")
SELECT id, market_id FROM "livestock_brokers"
WHERE market_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Assign existing section brokers to their category + types
INSERT INTO "livestock_broker_categories" ("broker_id", "category_id")
SELECT b.id, c.id
FROM "livestock_brokers" b
JOIN "livestock_categories" c ON (
  (lower(coalesce(b.email, '')) = 'camel@livestock.so' AND c.slug = 'geel')
  OR (lower(coalesce(b.email, '')) = 'cattle@livestock.so' AND c.slug = 'loda')
  OR (lower(coalesce(b.email, '')) = 'goat@livestock.so' AND c.slug = 'arri')
  OR (b.livestock_focus ILIKE '%camel%' AND c.slug = 'geel')
  OR (b.livestock_focus ILIKE '%cattle%' AND c.slug = 'loda')
  OR (b.livestock_focus ILIKE '%goat%' AND c.slug = 'arri')
)
WHERE b.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "livestock_broker_animal_types" ("broker_id", "animal_type_id")
SELECT bc.broker_id, t.id
FROM "livestock_broker_categories" bc
JOIN "livestock_animal_types" t ON t.category_id = bc.category_id AND t.status = 'ACTIVE'
ON CONFLICT DO NOTHING;

-- Livestock markets offer all three categories by default
INSERT INTO "livestock_market_categories" ("market_id", "category_id")
SELECT m.id, c.id
FROM "markets" m
CROSS JOIN "livestock_categories" c
WHERE m.deleted_at IS NULL AND m.market_type = 'LIVESTOCK' AND c.status = 'ACTIVE'
ON CONFLICT DO NOTHING;
