UPDATE "subscription_plans"
SET "active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE UPPER("account_type") = 'ELECTRICITY'
  AND "duration_days" <> 365
  AND "active" = true;
