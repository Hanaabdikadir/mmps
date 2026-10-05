-- Link PostgreSQL application users to Supabase Auth ids.
-- Does not move market data. Does not replace PostgreSQL.

ALTER TABLE "users" ADD COLUMN "supabase_user_id" TEXT;

CREATE UNIQUE INDEX "users_supabase_user_id_key" ON "users"("supabase_user_id");
