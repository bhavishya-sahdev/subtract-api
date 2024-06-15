import { Hono } from "hono"
import { getEmailData } from "lib/groq"

export const ai = new Hono()

ai.get("/", async (c) => {
    const email = await c.req.json()
    const res = await getEmailData(email)
    return c.json({ data: res.choices[0].message.content })
})
