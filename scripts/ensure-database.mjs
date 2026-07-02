import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const schemaPath = join(root, 'prisma', 'schema.prisma')
const databasePath = join(root, 'prisma', 'dev.db')
const prismaBin = process.platform === 'win32'
  ? join(root, 'node_modules', '.bin', 'prisma.cmd')
  : join(root, 'node_modules', '.bin', 'prisma')

if (existsSync(databasePath)) {
  initializeWithSqlite(databasePath)
  process.exit(0)
}

console.log('✓ First run detected')
console.log('Creating database...')
console.log('Creating tables...')

mkdirSync(dirname(databasePath), { recursive: true })

const result = spawnSync(
  prismaBin,
  ['db', 'push', '--schema', schemaPath, '--skip-generate'],
  {
    stdio: 'pipe',
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    },
  },
)

if (result.status !== 0) {
  const fallback = initializeWithSqlite(databasePath)
  if (!fallback) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    console.error('Database initialization failed.')
    process.exit(result.status ?? 1)
  }
}

console.log('Database initialized.')

function initializeWithSqlite(path) {
  const sql = `
CREATE TABLE IF NOT EXISTS "user_data" (
  "user_id" TEXT NOT NULL PRIMARY KEY,
  "data" TEXT NOT NULL DEFAULT '{}',
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sync_log" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "start_time" DATETIME NOT NULL,
  "end_time" DATETIME,
  "added" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "message" TEXT
);

CREATE TABLE IF NOT EXISTS "ipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "board" TEXT,
  "industry" TEXT,
  "offer_price_min" REAL,
  "offer_price_max" REAL,
  "lot_size" INTEGER,
  "lot_amount" REAL,
  "margin_multiple" REAL,
  "subscribe_start" DATETIME,
  "subscribe_end" DATETIME,
  "listing_date" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ipo_event" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ipo_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "event_date" DATETIME NOT NULL,
  "pdf_url" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ipo_event_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "ipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "broker" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'HKD',
  "cash" REAL NOT NULL DEFAULT 0,
  "frozen" REAL NOT NULL DEFAULT 0,
  "margin_limit" REAL NOT NULL DEFAULT 0,
  "available_margin" REAL NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "account_ipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "account_id" TEXT NOT NULL,
  "ipo_id" TEXT NOT NULL,
  "apply_lots" INTEGER NOT NULL DEFAULT 0,
  "apply_amount" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'watching',
  "commission" REAL NOT NULL DEFAULT 0,
  "financing_fee" REAL NOT NULL DEFAULT 0,
  "profit" REAL NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_ipo_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "account_ipo_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "ipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ipo_analysis" (
  "ipo_id" TEXT NOT NULL PRIMARY KEY,
  "rating" TEXT,
  "recommendation" TEXT,
  "risk" TEXT,
  "expected_dark" REAL,
  "note" TEXT,
  CONSTRAINT "ipo_analysis_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "ipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ipo_event_ipo_id_idx" ON "ipo_event"("ipo_id");
CREATE INDEX IF NOT EXISTS "ipo_event_event_date_idx" ON "ipo_event"("event_date");
CREATE INDEX IF NOT EXISTS "account_ipo_account_id_idx" ON "account_ipo"("account_id");
CREATE INDEX IF NOT EXISTS "account_ipo_ipo_id_idx" ON "account_ipo"("ipo_id");
CREATE INDEX IF NOT EXISTS "account_ipo_status_idx" ON "account_ipo"("status");
CREATE INDEX IF NOT EXISTS "sync_log_provider_idx" ON "sync_log"("provider");
CREATE INDEX IF NOT EXISTS "sync_log_status_idx" ON "sync_log"("status");
CREATE INDEX IF NOT EXISTS "sync_log_start_time_idx" ON "sync_log"("start_time");
`

  const sqlitePath = process.platform === 'win32' ? 'sqlite3.exe' : '/usr/bin/sqlite3'
  const result = spawnSync(sqlitePath, [path, sql], { stdio: 'inherit' })
  return result.status === 0 && existsSync(path)
}
