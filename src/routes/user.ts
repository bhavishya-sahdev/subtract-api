import { findPaymentsByOwnerId } from "db/schema/payment"
import { findSubscriptionsByOwnerId } from "db/schema/subscription"
import { findUserByUuid, updateUser } from "db/schema/user"
import { Hono } from "hono"
import { verifyAndDecodeTokenFromHeader } from "lib/utils"
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
        const subscriptions = await findSubscriptionsByOwnerId(
            payload.data.userId
        )
        return c.json({ data: subscriptions, error: null })
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
    const payload = verifyAndDecodeTokenFromHeader(c)
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
