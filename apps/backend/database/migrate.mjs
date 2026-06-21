// Minimal migration runner. Applies a single migration file against DATABASE_URL.
// Migrations use `IF NOT EXISTS`, so re-running is safe.
//   node database/migrate.mjs migrations/007_prediction_detail.sql
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
const here = dirname(fileURLToPath(import.meta.url))
const arg = process.argv[2]
if (!arg) {
  console.error('usage: node database/migrate.mjs migrations/<file>.sql')
  process.exit(1)
}
const file = join(here, arg.replace(/^database\//, ''))
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
