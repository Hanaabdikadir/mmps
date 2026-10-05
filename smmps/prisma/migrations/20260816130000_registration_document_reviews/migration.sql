-- Per-document review status for the 3 registration uploads
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_document_reviews" TEXT;
