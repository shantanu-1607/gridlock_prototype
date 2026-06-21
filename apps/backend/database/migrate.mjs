// Minimal migration runner. Applies a single migration file (or the latest by name)
// against DATABASE_URL. Migrations use `IF NOT EXISTS`, so re-running is safe.
//   node database/migrate.mjs [migrations/005_prediction_details.sql]
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
const here = dirname(fileURLToPath(import.meta.url))

const arg = process.argv[2]
let file
if (arg) {
  file = join(here, arg.replace(/^database\//, ''))
} else {
  const migrations = readdirSync(join(here, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  file = join(here, 'migrations', migrations[migrations.length - 1])
}

const sql = readFileSync(file, 'utf8')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  console.log(`[migrate] applying ${file}`)
  await pool.query(sql)
  console.log('[migrate] done')
} catch (err) {
  console.error('[migrate] FAILED:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
