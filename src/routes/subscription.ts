import {
    deleteSubscriptionByUuid,
    findSubscriptionByUuid,
    insertSubscription,
    updateSubscriptionByUuid,
    validRenewalPeriodValues,
} from "db/schema/subscription"
import { Hono } from "hono"
import { verifyAndDecodeTokenFromHeader } from "lib/utils"
import { z } from "zod"

export const subscription = new Hono()

/**
 * Get subscription by uuid
 */
subscription.get("/:uuid", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    const { uuid: subscriptionId } = c.req.param()
    try {
        const subscriptions = await findSubscriptionByUuid(
            subscriptionId,
            payload.data.userId
        )
        return c.json({ data: subscriptions, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

const newSubscriptionSchema = z.object({
    name: z.string(),
    creationDate: z.date().optional(),
    renewalPeriod: z.enum(validRenewalPeriodValues).optional(),
    upcomingPaymentDate: z.date().optional(),
    currency: z.string(),
    renewalPrice: z.number(),
})

/**
 * Create subscription
 */
subscription.post("/", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data = await c.req.json()
    const validatedInput = newSubscriptionSchema.array().safeParse(data)

    if (!validatedInput.success) {
        return c.json({ error: validatedInput.error, data: null }, 400)
    }

    try {
        const insertedSubscription = await insertSubscription(
            validatedInput.data,
            payload.data.userId
        )
        return c.json({ data: insertedSubscription, error: null })
    } catch (err: any) {
        return c.json({ error: err, data: null }, 500)
    }
})

const updateSubscriptionSchema = z.object({
    name: z.string().optional(),
    creationDate: z.date().optional(),
    renewalPeriod: z.enum(validRenewalPeriodValues).optional(),
    upcomingPaymentDate: z.date().optional(),
    currency: z.string().optional(),
    renewalPrice: z.number().optional(),
})
/**
 * Update subscription
 */
subscription.post("/:uuid/update", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data = await c.req.json()
    const validatedInput = updateSubscriptionSchema.safeParse(data)
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }
    const { uuid: subscriptionId } = c.req.param()
    try {
        const updatedSubscription = await updateSubscriptionByUuid(
            subscriptionId,
            data,
            payload.data.userId
        )
        return c.json({ data: updatedSubscription[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

/**
 * Delete subscription
 */
subscription.post("/:uuid/delete", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const { uuid: subscriptionId } = c.req.param()
    try {
        const deletedSubscription = await deleteSubscriptionByUuid(
            subscriptionId,
            payload.data.userId
        )
        return c.json({ data: deletedSubscription[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

subscription.post("/payments", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    const data = await c.req.json()
    const validatedInput = z
        .object({
            subscriptions: newSubscriptionSchema.array(),
            payments: newPaymentSchema.array().array(),
        })
        .safeParse(data)

    if (!validatedInput.success) {
        return c.json({ error: validatedInput.error, data: null }, 400)
    }

    try {
        const insertedSubscription = await insertSubscriptionWithPayments(
            validatedInput.data.subscriptions,
            validatedInput.data.payments,
            payload.data.userId
        )
        return c.json({ data: insertedSubscription, error: null })
    } catch (err: any) {
        return c.json({ error: err, data: null }, 500)
    }
})
