import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err)
})

export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  return res
}

export default pool
