UPDATE "subscription_plans"
SET "name" = 'Pearl',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'Diamond'
  AND UPPER("account_type") IN ('LIVESTOCK', 'WATER', 'ELECTRICITY');

UPDATE "subscription_plans"
SET "active" = true,
    "updated_at" = CURRENT_TIMESTAMP
WHERE UPPER("account_type") = 'ELECTRICITY'
  AND "name" IN ('Gold', 'Silver')
  AND "duration_days" IN (90, 180);
