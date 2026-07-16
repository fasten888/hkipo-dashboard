ALTER TABLE "ipo"
  ADD COLUMN IF NOT EXISTS "display_name_cn" TEXT,
  ADD COLUMN IF NOT EXISTS "display_name_en" TEXT;
