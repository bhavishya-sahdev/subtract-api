import { Hono } from "hono"
import { hash, compare } from "bcrypt"
import { generateToken } from "lib/jwt"
import { findUserByEmail, insertUser } from "db/schema/user"
import { z } from "zod"
import { setCookie } from "hono/cookie"
import { addHours } from "date-fns"

export const auth = new Hono()

export const newUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(
            /[!@#$%^&*(),.?":{}|<>]/,
            "Password must contain at least one special character"
        ),
})

auth.post("/signup", async (c) => {
    const { name, email, password } = await c.req.json()
    const validatedInput = newUserSchema.safeParse({ name, email, password })
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

    const hashedPassword = await hash(password, 10)

    try {
        const existingUser = await findUserByEmail(email)
        if (existingUser.length > 0)
            return c.json(
                { error: { email: ["Email already in use"] }, data: null },
                400
            )
        const newUser = await insertUser({ name, email, hashedPassword })
        const token = generateToken({ userId: newUser[0].insertedUserId })
        setCookie(c, "token", token, {
            secure: process.env.NODE_ENV === "development" ? false : true,
            httpOnly: true,
            domain: "localhost",
            sameSite: "Lax",
            expires: addHours(new Date(), 1),
        })
        return c.json({ data: { token }, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 400)
    }
})

export const loginUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string(),
})

auth.post("/signin", async (c) => {
    const { email, password } = await c.req.json()
    const validatedInput = loginUserSchema.safeParse({ email, password })
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

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
        setCookie(c, "token", token, {
            secure: process.env.NODE_ENV === "development" ? false : true,
            httpOnly: true,
            domain: "localhost",
            sameSite: "Lax",
            expires: addHours(new Date(), 1),
        })
        return c.json({ data: { token }, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 400)
    }
})
