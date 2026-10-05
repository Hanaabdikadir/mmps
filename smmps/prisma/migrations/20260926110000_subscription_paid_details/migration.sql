ALTER TABLE "subscriptions"
ADD COLUMN "paid_months" INTEGER,
ADD COLUMN "paid_amount" DECIMAL(12, 2);

UPDATE "subscriptions" AS subscription
SET "paid_amount" = 0
FROM "subscription_plans" AS plan
WHERE plan."id" = subscription."plan_id"
  AND plan."price" = 0;
