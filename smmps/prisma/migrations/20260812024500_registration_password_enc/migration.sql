-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_password_enc" TEXT;
