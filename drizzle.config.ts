import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./db/schema/*",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DRIZZLE_DATABASE_URL!,
    },
    out: "./db/migrations",
    verbose: true,
    strict: true,
})
