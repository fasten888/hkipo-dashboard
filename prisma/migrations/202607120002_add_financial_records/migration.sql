CREATE TABLE IF NOT EXISTS "sell_record" (
  "id" TEXT NOT NULL,
  "account_ipo_id" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "date" TIMESTAMP(3),
  "shares" INTEGER NOT NULL DEFAULT 0,
  "method" TEXT,
  "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sell_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sell_record_account_ipo_id_fkey" FOREIGN KEY ("account_ipo_id") REFERENCES "account_ipo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sell_record_account_ipo_id_idx" ON "sell_record"("account_ipo_id");
CREATE INDEX IF NOT EXISTS "sell_record_date_idx" ON "sell_record"("date");

CREATE TABLE IF NOT EXISTS "exchange_record" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "date" TIMESTAMP(3),
  "source_currency" TEXT NOT NULL DEFAULT 'CNY',
  "source_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "source_amount_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "target_currency" TEXT NOT NULL DEFAULT 'HKD',
  "target_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "manual_rate" DOUBLE PRECISION,
  "original_cost_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fee_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "channel" TEXT,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "exchange_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exchange_record_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "exchange_record_account_id_idx" ON "exchange_record"("account_id");
CREATE INDEX IF NOT EXISTS "exchange_record_date_idx" ON "exchange_record"("date");

CREATE TABLE IF NOT EXISTS "withdrawal" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "date" TIMESTAMP(3),
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "withdrawal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "withdrawal_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "withdrawal_account_id_idx" ON "withdrawal"("account_id");
CREATE INDEX IF NOT EXISTS "withdrawal_date_idx" ON "withdrawal"("date");
