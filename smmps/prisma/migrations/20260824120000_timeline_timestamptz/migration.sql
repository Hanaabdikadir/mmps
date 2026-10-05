-- Timeline stamps were TIMESTAMP without time zone, so "Submitted" showed
-- three hours ahead of the real application time (Africa/Mogadishu, UTC+3).
ALTER TABLE "registration_timeline_events"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
  USING ("created_at" AT TIME ZONE 'Africa/Mogadishu');
