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
`

  const sqlitePath = process.platform === 'win32' ? 'sqlite3.exe' : '/usr/bin/sqlite3'
  const result = spawnSync(sqlitePath, [path, sql], { stdio: 'inherit' })
  return result.status === 0 && existsSync(path)
}
