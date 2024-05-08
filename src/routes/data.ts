import { findUserByUuid } from "db/schema/user"
import { Hono } from "hono"
import { verifyToken } from "lib/jwt"
export const data = new Hono()

data.get("/user", async (c) => {
    const token = c.req.header("Authorization")?.split("Bearer ")[1]
    if (!token) return c.json({ data: null, error: "Unauthorized access" }, 401)

    const payload = verifyToken(token)
    if (!payload)
        return c.json({ data: null, error: "Unauthorized access" }, 403)

    const user = await findUserByUuid(payload.userId)
    return c.json({ data: user[0], error: null })
})
