import { Hono } from "hono"
import { hash, compare } from "bcrypt"
import { generateToken } from "lib/jwt"
import { findUserByEmail, insertUser } from "db/schema/user"

export const auth = new Hono()

auth.post("/signup", async (c) => {
    const { name, email, password } = await c.req.json()
    const hashedPassword = await hash(password, 10)

    try {
        const newUser = await insertUser({ name, email, hashedPassword })
        const token = generateToken({ userId: newUser[0].insertedUserId })
        return c.json({ data: token, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 400)
    }
})

auth.post("/login", async (c) => {
    const { email, password } = await c.req.json()

    try {
        const foundUser = await findUserByEmail(email)

        if (!foundUser) {
            return c.json(
                { error: "Invalid email or password", data: null },
                401
            )
        }

        const isValidPassword = await compare(
            password,
            foundUser[0].hashedPassword
        )

        if (!isValidPassword) {
            return c.json(
                { error: "Invalid email or password", data: null },
                401
            )
        }

        const token = generateToken({ userId: foundUser[0].uuid })
        return c.json({ token })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 400)
    }
})
