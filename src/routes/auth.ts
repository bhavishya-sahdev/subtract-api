import { Hono } from "hono"
import { generateToken } from "lib/jwt"
import { findUserByEmail, insertUser, updateUser } from "db/schema/user"
import { z } from "zod"
import { setCookie } from "hono/cookie"
import { addHours } from "date-fns"
import { authClient } from "lib/google"
import { google } from "googleapis"
import { compare, hash } from "lib/cryptoUtils"

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
    const { name, email, password } = await c.req.json<{
        name: string
        email: string
        password: string
    }>()
    const validatedInput = newUserSchema.safeParse({
        name: name.toLowerCase(),
        email: email.toLowerCase(),
        password,
    })
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

    const hashedPassword = await hash(validatedInput.data.password, 10)

    try {
        const existingUser = await findUserByEmail(validatedInput.data.email)
        if (existingUser.length > 0)
            return c.json(
                { error: { email: ["Email already in use"] }, data: null },
                400
            )
        const newUser = await insertUser({
            name: validatedInput.data.name,
            email: validatedInput.data.email,
            hashedPassword,
        })
        const token = generateToken({ userId: newUser[0].insertedUserId })
        setCookie(c, "token", token, {
            secure: true,
            httpOnly: true,
            domain: process.env.DOMAIN_NAME || "localhost",
            sameSite: "None",
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
    const { email, password } = await c.req.json<{
        email: string
        password: string
    }>()
    const validatedInput = loginUserSchema.safeParse({
        email: email.toLowerCase(),
        password,
    })
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

    try {
        const foundUser = await findUserByEmail(validatedInput.data.email)

        if (!foundUser) {
            return c.json(
                { error: "Invalid email or password", data: null },
                401
            )
        }

        if (foundUser[0].isGoogleUser && foundUser[0].hashedPassword === "") {
            return c.json(
                { error: "Please sign in using Google", data: null },
                401
            )
        }

        const isValidPassword = await compare(
            validatedInput.data.password,
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
            secure: true,
            httpOnly: true,
            domain: process.env.DOMAIN_NAME || "localhost",
            sameSite: "None",
            expires: addHours(new Date(), 1),
        })
        return c.json({ data: { token }, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 400)
    }
})

/**
 * This route is used to exchange the auth code received from Google OAuth
 * for an access token and refresh token.
 * If a user exists, we update the user's Google tokens.
 * If a user does not exist, we create a new user.
 */
auth.post("/google", async (c) => {
    const { code } = await c.req.json()

    try {
        // exchange auth-code for tokens
        const { tokens } = await authClient.getToken(code)

        if (
            !tokens.access_token ||
            !tokens.refresh_token ||
            !tokens.expiry_date
        )
            return c.json({ error: "Invalid Google response", data: null }, 500)

        authClient.setCredentials(tokens)

        // get user info
        const userInfoResponse = await google
            .oauth2({ version: "v2", auth: authClient })
            .userinfo.get()

        const userInfo = userInfoResponse.data

        if (!userInfo.email || !userInfo.id)
            return c.json({ error: "Invalid Google response", data: null }, 500)

        const foundUser = await findUserByEmail(userInfo.email)

        // if user exists, update google tokens
        if (foundUser.length > 0) {
            if (!foundUser[0].isGoogleUser) {
                updateUser(foundUser[0].uuid, {
                    isGoogleUser: true,
                    googleId: userInfo.id,
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiresAt: tokens.expiry_date.toString(),
                })
            } else {
                updateUser(foundUser[0].uuid, {
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiresAt: tokens.expiry_date.toString(),
                })
            }

            // generate JWT token
            const token = generateToken({ userId: foundUser[0].uuid })
            setCookie(c, "token", token, {
                secure: true,
                httpOnly: true,
                domain: process.env.DOMAIN_NAME || "localhost",
                sameSite: "Lax",
                expires: addHours(new Date(), 1),
            })
            return c.json({ data: { token }, error: null })
        }

        // if user does not exist, create user
        const newUser = await insertUser({
            name: userInfo.given_name || userInfo.email.split("@")[0],
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
            secure: true,
            httpOnly: true,
            domain: "localhost",
            sameSite: "None",
            expires: addHours(new Date(), 1),
        })
        return c.json({ data: { token }, error: null })
    } catch (err: any) {
        return c.json({ error: err, data: null }, 400)
    }
})
