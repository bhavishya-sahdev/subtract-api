import { Hono } from "hono"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

const app = new Hono()

app.get("/", (c) => {
    console.log(process.env.DRIZZLE_DATABASE_URL!)
    const sql = neon(process.env.DRIZZLE_DATABASE_URL!)
    const db = drizzle(sql)

    return c.text("Hello Hono!")
})

export default app
