-- Registration rejection + application timeline tracking

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rejected_by_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_rejected_by_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_rejected_by_id_fkey"
      FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_rejected_by_id_idx" ON "users"("rejected_by_id");

CREATE TABLE IF NOT EXISTS "registration_rejection_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "previous_reason" TEXT,
  "new_reason" TEXT NOT NULL,
  "changed_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "registration_rejection_history_user_id_idx"
  ON "registration_rejection_history"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registration_rejection_history_user_id_fkey'
  ) THEN
    ALTER TABLE "registration_rejection_history"
      ADD CONSTRAINT "registration_rejection_history_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registration_rejection_history_changed_by_id_fkey'
  ) THEN
    ALTER TABLE "registration_rejection_history"
      ADD CONSTRAINT "registration_rejection_history_changed_by_id_fkey"
      FOREIGN KEY ("changed_by_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "registration_timeline_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT,
  "status_label" TEXT,
  "actor_id" INTEGER,
  "actor_label" TEXT,
  "visible_to_applicant" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "registration_timeline_events_user_id_created_at_idx"
  ON "registration_timeline_events"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registration_timeline_events_user_id_fkey'
  ) THEN
    ALTER TABLE "registration_timeline_events"
      ADD CONSTRAINT "registration_timeline_events_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
