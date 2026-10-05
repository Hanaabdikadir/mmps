-- Track when Super Admin reviews registration documents (application step 03).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "documents_reviewed_at" TIMESTAMP(3);
