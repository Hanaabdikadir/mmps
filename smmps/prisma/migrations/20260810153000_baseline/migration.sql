-- PostgreSQL schema baseline
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PUBLIC', 'REGISTERED', 'ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'LIVESTOCK_BROKER_ADMIN', 'LIVESTOCK_BROKER_USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PriceStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('HAL', 'AWAR', 'QURBAC', 'CAMEL', 'CATTLE', 'GOAT', 'SHEEP', 'POULTRY');

-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('TANKER', 'HOUSEHOLD', 'COMMERCIAL', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "ElectricityType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'UNIT_KWH', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('WATER', 'ELECTRICITY', 'LIVESTOCK', 'GENERAL');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('WATER_SUPPLY', 'ELECTRICITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRICE_SUBMITTED', 'PRICE_APPROVED', 'PRICE_REJECTED', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED', 'USER_CREATED', 'SYSTEM_ANNOUNCEMENT', 'GENERAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "profile_picture" TEXT,
    "company_name" TEXT,
    "company_sector" TEXT,
    "company_location" TEXT,
    "company_type" TEXT,
    "company_established_date" TEXT,
    "company_country" TEXT,
    "company_district" TEXT,
    "company_address" TEXT,
    "company_logo_file_name" TEXT,
    "company_registration_number" TEXT,
    "company_email" TEXT,
    "company_slug" TEXT,
    "contact_role" TEXT,
    "document_file_name" TEXT,
    "registration_documents" TEXT,
    "role" "Role" NOT NULL DEFAULT 'REGISTERED',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "company_id" INTEGER,
    "broker_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'OTHER',
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "district" TEXT,
    "address" TEXT,
    "registration_number" TEXT,
    "logo_file_name" TEXT,
    "description" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "market_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_documents" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livestock_brokers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "profile_picture" TEXT,
    "description" TEXT,
    "livestock_focus" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "market_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livestock_brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "market_type" "MarketType" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_sections" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_prices" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "market_id" INTEGER,
    "section_id" INTEGER,
    "product_service" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit" TEXT,
    "kilowatt" DECIMAL(12,4),
    "meter_cubic" DECIMAL(12,4),
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" "PriceStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "updated_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livestock_prices" (
    "id" SERIAL NOT NULL,
    "animal_type" "AnimalType" NOT NULL,
    "category" TEXT,
    "market_location" TEXT NOT NULL,
    "market_id" INTEGER,
    "broker_id" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "date_recorded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "status" "PriceStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livestock_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_approvals" (
    "id" SERIAL NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "comment" TEXT,
    "reviewed_by" INTEGER NOT NULL,
    "market_price_id" INTEGER,
    "livestock_price_id" INTEGER,
    "water_price_id" INTEGER,
    "electricity_price_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_prices" (
    "id" SERIAL NOT NULL,
    "provider_name" TEXT NOT NULL,
    "water_type" "WaterType" NOT NULL,
    "location" TEXT NOT NULL,
    "price_per_unit" DECIMAL(12,2) NOT NULL,
    "date_recorded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "status" "PriceStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "water_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electricity_prices" (
    "id" SERIAL NOT NULL,
    "provider_name" TEXT NOT NULL,
    "service_type" "ElectricityType" NOT NULL,
    "location" TEXT NOT NULL,
    "price_per_kwh" DECIMAL(12,2) NOT NULL,
    "date_recorded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER NOT NULL,
    "status" "PriceStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "electricity_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "account_type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "broker_id" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "sector" TEXT NOT NULL DEFAULT 'system',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sender_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "module" TEXT,
    "entity_id" TEXT,
    "description" TEXT,
    "previous_data" TEXT,
    "new_data" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompanySections" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_slug_key" ON "users"("company_slug");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_broker_id_idx" ON "users"("broker_id");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "verification_codes_user_id_key" ON "verification_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_codes_code_key" ON "verification_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "companies_type_idx" ON "companies"("type");

-- CreateIndex
CREATE INDEX "company_documents_company_id_idx" ON "company_documents"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "livestock_brokers_email_key" ON "livestock_brokers"("email");

-- CreateIndex
CREATE INDEX "livestock_brokers_status_idx" ON "livestock_brokers"("status");

-- CreateIndex
CREATE INDEX "markets_market_type_status_idx" ON "markets"("market_type", "status");

-- CreateIndex
CREATE INDEX "market_sections_market_id_idx" ON "market_sections"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_sections_market_id_name_key" ON "market_sections"("market_id", "name");

-- CreateIndex
CREATE INDEX "market_prices_status_effective_date_idx" ON "market_prices"("status", "effective_date");

-- CreateIndex
CREATE INDEX "market_prices_company_id_idx" ON "market_prices"("company_id");

-- CreateIndex
CREATE INDEX "livestock_prices_animal_type_market_location_idx" ON "livestock_prices"("animal_type", "market_location");

-- CreateIndex
CREATE INDEX "livestock_prices_date_recorded_idx" ON "livestock_prices"("date_recorded");

-- CreateIndex
CREATE INDEX "livestock_prices_broker_id_idx" ON "livestock_prices"("broker_id");

-- CreateIndex
CREATE INDEX "livestock_prices_status_idx" ON "livestock_prices"("status");

-- CreateIndex
CREATE INDEX "price_approvals_created_at_idx" ON "price_approvals"("created_at");

-- CreateIndex
CREATE INDEX "water_prices_location_idx" ON "water_prices"("location");

-- CreateIndex
CREATE INDEX "water_prices_date_recorded_idx" ON "water_prices"("date_recorded");

-- CreateIndex
CREATE INDEX "electricity_prices_location_idx" ON "electricity_prices"("location");

-- CreateIndex
CREATE INDEX "electricity_prices_date_recorded_idx" ON "electricity_prices"("date_recorded");

-- CreateIndex
CREATE INDEX "subscriptions_status_expiry_date_idx" ON "subscriptions"("status", "expiry_date");

-- CreateIndex
CREATE INDEX "subscriptions_company_id_idx" ON "subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "subscriptions_broker_id_idx" ON "subscriptions"("broker_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_sector_category_key" ON "favorites"("user_id", "sector", "category");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_CompanySections_AB_unique" ON "_CompanySections"("A", "B");

-- CreateIndex
CREATE INDEX "_CompanySections_B_index" ON "_CompanySections"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_brokers" ADD CONSTRAINT "livestock_brokers_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_sections" ADD CONSTRAINT "market_sections_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "market_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_prices" ADD CONSTRAINT "livestock_prices_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_prices" ADD CONSTRAINT "livestock_prices_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_prices" ADD CONSTRAINT "livestock_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_prices" ADD CONSTRAINT "livestock_prices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_prices" ADD CONSTRAINT "livestock_prices_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_market_price_id_fkey" FOREIGN KEY ("market_price_id") REFERENCES "market_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_livestock_price_id_fkey" FOREIGN KEY ("livestock_price_id") REFERENCES "livestock_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_water_price_id_fkey" FOREIGN KEY ("water_price_id") REFERENCES "water_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_electricity_price_id_fkey" FOREIGN KEY ("electricity_price_id") REFERENCES "electricity_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_prices" ADD CONSTRAINT "water_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_prices" ADD CONSTRAINT "water_prices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_prices" ADD CONSTRAINT "water_prices_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electricity_prices" ADD CONSTRAINT "electricity_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electricity_prices" ADD CONSTRAINT "electricity_prices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electricity_prices" ADD CONSTRAINT "electricity_prices_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "livestock_brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanySections" ADD CONSTRAINT "_CompanySections_A_fkey" FOREIGN KEY ("A") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanySections" ADD CONSTRAINT "_CompanySections_B_fkey" FOREIGN KEY ("B") REFERENCES "market_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

