// import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
// import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL! })
export const db = drizzle(pool)
