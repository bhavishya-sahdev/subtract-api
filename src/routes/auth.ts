import { Hono } from "hono"
import { hash, compare } from "bcrypt"
import { generateToken } from "lib/jwt"
import { findUserByEmail, insertUser, updateUser } from "db/schema/user"
import { z } from "zod"
import { setCookie } from "hono/cookie"
import { addHours } from "date-fns"
import { authClient } from "lib/google"
import axios from "axios"

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

        if (foundUser[0].isGoogleUser) {
            return c.json(
                { error: "Please sign in using Google", data: null },
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

auth.post("/google", async (c) => {
    const { code } = await c.req.json()

    try {
        const { tokens } = await authClient.getToken(code)

        if (
            !tokens.access_token ||
            !tokens.refresh_token ||
            !tokens.expiry_date
        )
            return c.json({ error: "Invalid Google response", data: null }, 500)

        authClient.setCredentials(tokens)

        const userInfoResponse = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        )

        const userInfo = userInfoResponse.data

        const foundUser = await findUserByEmail(userInfo.email)

        if (foundUser.length > 0) {
            if (!foundUser[0].isGoogleUser) {
                updateUser(foundUser[0].uuid, {
                    isGoogleUser: true,
                    googleId: userInfo.id,
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiresAt: tokens.expiry_date.toString(),
                })
            }

            // generate JWT token
            const token = generateToken({ userId: foundUser[0].uuid })
            setCookie(c, "token", token, {
                secure: process.env.NODE_ENV === "development" ? false : true,
                httpOnly: true,
                domain: "localhost",
                sameSite: "Lax",
                expires: addHours(new Date(), 1),
            })
            return c.json({ data: { token }, error: null })
        }

        // insert new user
        const newUser = await insertUser({
            name: userInfo.name,
            email: userInfo.email,
            hashedPassword: "",
            isGoogleUser: true,
            googleId: userInfo.id,
            googleAccessToken: tokens.access_token,
            googleRefreshToken: tokens.refresh_token,
            googleTokenExpiresAt: tokens.expiry_date.toString(),
        })

        // generate JWT token
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
