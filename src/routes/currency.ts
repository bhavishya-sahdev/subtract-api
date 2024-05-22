import { getAllCurrencies, insertCurrency } from "db/schema/currency"
import { Hono } from "hono"
import { z } from "zod"

export const currency = new Hono()

currency.get("/", async (c) => {
    try {
        const res = await getAllCurrencies()
        return c.json({ data: res, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

// const newCurrencySchema = z
//     .object({
//         symbol: z.string(),
//         name: z.string(),
//         symbolNative: z.string(),
//         decimalDigits: z.number(),
//         rounding: z.string(),
//         code: z.string(),
//         namePlural: z.string(),
//     })
//     .array()

// currency.post("/", async (c) => {
//     const data = await c.req.json()
//     const validatedInput = newCurrencySchema.safeParse(data)
//     if (!validatedInput.data) return c.status(400)
//     try {
//         await insertCurrency(validatedInput.data)
//         return c.json({ data: "success", error: null })
//     } catch (err: any) {
//         return c.json({ error: err.message, data: null }, 500)
//     }
// })
