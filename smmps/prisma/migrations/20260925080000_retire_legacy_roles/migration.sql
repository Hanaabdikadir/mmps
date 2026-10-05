-- Retire legacy roles: ADMIN, COMPANY_USER, LIVESTOCK_BROKER_ADMIN
-- Keep: PUBLIC, REGISTERED, SUPER_ADMIN, COMPANY_ADMIN, LIVESTOCK_BROKER_USER

-- 1) Remap users / sessions (safe to re-run)
UPDATE "users"
SET role = 'COMPANY_ADMIN'
WHERE role::text IN ('ADMIN', 'COMPANY_USER');

UPDATE "users"
SET role = 'LIVESTOCK_BROKER_USER'
WHERE role::text = 'LIVESTOCK_BROKER_ADMIN';

UPDATE "admin_sessions"
SET role = 'COMPANY_ADMIN'
WHERE role::text IN ('ADMIN', 'COMPANY_USER');

UPDATE "admin_sessions"
SET role = 'LIVESTOCK_BROKER_USER'
WHERE role::text = 'LIVESTOCK_BROKER_ADMIN';

-- 2) Drop legacy role_permissions that would collide after remap
DELETE FROM "role_permissions" rp
WHERE rp.role::text IN ('ADMIN', 'COMPANY_USER')
  AND EXISTS (
    SELECT 1 FROM "role_permissions" x
    WHERE x.role::text = 'COMPANY_ADMIN'
      AND x.permission_id = rp.permission_id
  );

DELETE FROM "role_permissions" rp
WHERE rp.role::text = 'LIVESTOCK_BROKER_ADMIN'
  AND EXISTS (
    SELECT 1 FROM "role_permissions" x
    WHERE x.role::text = 'LIVESTOCK_BROKER_USER'
      AND x.permission_id = rp.permission_id
  );

-- Remap remaining legacy permission rows
UPDATE "role_permissions"
SET role = 'COMPANY_ADMIN'
WHERE role::text IN ('ADMIN', 'COMPANY_USER');

UPDATE "role_permissions"
SET role = 'LIVESTOCK_BROKER_USER'
WHERE role::text = 'LIVESTOCK_BROKER_ADMIN';

-- Deduplicate any leftover pairs
DELETE FROM "role_permissions" a
USING "role_permissions" b
WHERE a.id > b.id
  AND a.role = b.role
  AND a.permission_id = b.permission_id;

-- 3) Rebuild Role enum only if legacy values still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role'
      AND e.enumlabel IN ('ADMIN', 'COMPANY_USER', 'LIVESTOCK_BROKER_ADMIN')
  ) THEN
    ALTER TYPE "Role" RENAME TO "Role_legacy";

    CREATE TYPE "Role" AS ENUM (
      'PUBLIC',
      'REGISTERED',
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'LIVESTOCK_BROKER_USER'
    );

    ALTER TABLE "users"
      ALTER COLUMN role DROP DEFAULT,
      ALTER COLUMN role TYPE "Role" USING role::text::"Role",
      ALTER COLUMN role SET DEFAULT 'REGISTERED'::"Role";

    ALTER TABLE "admin_sessions"
      ALTER COLUMN role TYPE "Role" USING role::text::"Role";

    ALTER TABLE "role_permissions"
      ALTER COLUMN role TYPE "Role" USING role::text::"Role";

    DROP TYPE "Role_legacy";
  END IF;
END $$;
