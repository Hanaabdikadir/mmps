-- Remaining TIMESTAMP-without-TZ columns were read as UTC and shown
-- three hours ahead of Africa/Mogadishu (UTC+3).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'documents_reviewed_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "users"
      ALTER COLUMN "documents_reviewed_at" TYPE TIMESTAMPTZ(3)
      USING (
        CASE
          WHEN "documents_reviewed_at" IS NULL THEN NULL
          ELSE "documents_reviewed_at" AT TIME ZONE 'Africa/Mogadishu'
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'rejected_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "users"
      ALTER COLUMN "rejected_at" TYPE TIMESTAMPTZ(3)
      USING (
        CASE
          WHEN "rejected_at" IS NULL THEN NULL
          ELSE "rejected_at" AT TIME ZONE 'Africa/Mogadishu'
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registration_messages'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "registration_messages"
      ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
      USING ("created_at" AT TIME ZONE 'Africa/Mogadishu');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registration_messages'
      AND column_name = 'read_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "registration_messages"
      ALTER COLUMN "read_at" TYPE TIMESTAMPTZ(3)
      USING (
        CASE
          WHEN "read_at" IS NULL THEN NULL
          ELSE "read_at" AT TIME ZONE 'Africa/Mogadishu'
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "notifications"
      ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
      USING ("created_at" AT TIME ZONE 'Africa/Mogadishu');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registration_rejection_history'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "registration_rejection_history"
      ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
      USING ("created_at" AT TIME ZONE 'Africa/Mogadishu');
  END IF;
END $$;
