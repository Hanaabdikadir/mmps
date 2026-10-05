-- Persist selected livestock market during broker registration
ALTER TABLE "users" ADD COLUMN "market_id" INTEGER;

CREATE INDEX "users_market_id_idx" ON "users"("market_id");

ALTER TABLE "users" ADD CONSTRAINT "users_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
