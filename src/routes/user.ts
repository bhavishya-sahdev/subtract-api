import axios from "axios"
import { findPaymentsByOwnerId } from "db/schema/payment"
import {
    findUserByUuid,
    findUserByUuidWithSubscriptions,
    updateUser,
} from "db/schema/user"
import { google } from "googleapis"
import { Hono } from "hono"
import { authClient } from "lib/google"
import { extractEmailData } from "lib/groq"
import {
    verifyAndDecodeTokenFromCookie,
    verifyAndDecodeTokenFromHeader,
} from "lib/utils"
export const user = new Hono()

/**
 * Get user details
 */
user.get("/", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const user = await findUserByUuid(payload.data.userId)
    return c.json({ data: user[0], error: null })
})

/**
 * Get all subscriptions by user
 */
user.get("/subscriptions", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        const userWithSubscriptions = await findUserByUuidWithSubscriptions(
            payload.data.userId
        )
        return c.json({ data: userWithSubscriptions, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

/**
 * Get all payments by user
 */
user.get("/payments", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        const payments = await findPaymentsByOwnerId(payload.data.userId)
        return c.json({ data: payments, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.post("/update-onboarding-status", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    try {
        const user = await updateUser(payload.data.userId, {
            isOnboardingComplete: true,
        })
        return c.json({ data: user, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.get("/google/access", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        // check if user exists
        const [user] = await findUserByUuid(payload.data.userId, true)
        if (!user) {
            return c.json({ error: "User not found", data: null }, 404)
        }

        if (user.isGoogleUser) {
            if (
                !user.googleAccessToken ||
                !user.googleRefreshToken ||
                !user.googleTokenExpiresAt
            )
                return c.json(
                    { error: "Invalid Google response", data: null },
                    500
                )

            // check if scope gmail read is present
            // if not present, return error
            authClient.setCredentials({
                access_token: user.googleAccessToken,
                refresh_token: user.googleRefreshToken,
                expiry_date: parseInt(user.googleTokenExpiresAt),
            })

            // get token info to check scopes granted
            const tokenInfo = await authClient.getTokenInfo(
                user.googleAccessToken
            )
            const requiredScope =
                "https://www.googleapis.com/auth/gmail.readonly"

            // if required scope is not granted, return error
            if (!tokenInfo.scopes.includes(requiredScope)) {
                return c.json(
                    {
                        error: {
                            code: "G-403",
                            message: "Required scope not granted",
                        },
                        data: null,
                    },
                    200
                )
            }

            return c.json({ data: { status: "ok" }, error: null })
        }
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

