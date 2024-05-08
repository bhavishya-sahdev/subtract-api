import {
    findSubscriptionsByOwnerId,
    insertSubscription,
    NewSubscription,
} from "db/schema/subscription"
import { findUserByUuid } from "db/schema/user"
import { Hono } from "hono"
import { verifyAndDecodeTokenFromHeader } from "lib/utils"
export const data = new Hono()

/**
 * Get user details
 */
data.get("/user", async (c) => {
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
data.get("/user/subscriptions", async (c) => {
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
 * Create subscription
 */
data.post("/subscription", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data: NewSubscription = await c.req.json()
    try {
        const insertedSubscription = await insertSubscription({
            ...data,
            ownerId: payload.data.userId,
        })
        return c.json({ data: insertedSubscription[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})
