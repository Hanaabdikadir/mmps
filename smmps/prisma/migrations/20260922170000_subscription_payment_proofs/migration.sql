CREATE TABLE IF NOT EXISTS "subscription_payment_proofs" (
  "id" SERIAL PRIMARY KEY,
  "subscription_id" INTEGER NOT NULL,
  "receipt_file" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submitted_by" INTEGER,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_payment_proofs_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "subscription_payment_proofs_subscription_id_status_idx"
  ON "subscription_payment_proofs"("subscription_id", "status");
