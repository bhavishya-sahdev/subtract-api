import {
    deletePaymentByUuid,
    findPaymentByUuid,
    findPaymentsByOwnerId,
    insertPayment,
    updatePaymentByUuid,
    validPaymentStatusValues,
} from "db/schema/payment"
import {
    deleteSubscriptionByUuid,
    findSubscriptionByUuid,
    findSubscriptionsByOwnerId,
    insertSubscription,
    updateSubscriptionByUuid,
    validRenewalPeriodValues,
} from "db/schema/subscription"
import { findUserByUuid } from "db/schema/user"
import { Hono } from "hono"
import { verifyAndDecodeTokenFromHeader } from "lib/utils"
import { z } from "zod"

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
 * Get subscription by uuid
 */
data.get("/subscription/:uuid", async (c) => {
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
data.post("/subscription", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data = await c.req.json()
    const validatedInput = newSubscriptionSchema.safeParse(data)
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

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
data.post("/subscription/:uuid/update", async (c) => {
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
data.post("/subscription/:uuid/delete", async (c) => {
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

/**
 * Get all payments by user
 */
data.get("/user/payments", async (c) => {
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

/**
 * Get payment by uuid
 */
data.get("/payment/:uuid", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    const { uuid: paymentId } = c.req.param()
    try {
        const payment = await findPaymentByUuid(paymentId, payload.data.userId)
        return c.json({ data: payment, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

const newPaymentSchema = z.object({
    subscriptionId: z.string(),
    date: z.date(),
    currency: z.string(),
    amount: z.number(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(validPaymentStatusValues).optional(),
})

/**
 * Create payment
 */
data.post("/payment", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data = await c.req.json()
    const validatedInput = newPaymentSchema.safeParse(data)
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }

    try {
        const insertedPayment = await insertPayment({
            ...data,
            ownerId: payload.data.userId,
        })
        return c.json({ data: insertedPayment[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

const updatePaymentSchema = z.object({
    subscriptionId: z.string().optional(),
    date: z.date().optional(),
    currency: z.string().optional(),
    amount: z.number().optional(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(validPaymentStatusValues).optional(),
})

/**
 * Update payment
 */
data.post("/payment/:uuid/update", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const data = await c.req.json()
    const validatedInput = updatePaymentSchema.safeParse(data)
    if (!validatedInput.success) {
        return c.json(
            { error: validatedInput.error.flatten().fieldErrors, data: null },
            400
        )
    }
    const { uuid: paymentId } = c.req.param()
    try {
        const updatedPayment = await updatePaymentByUuid(
            paymentId,
            data,
            payload.data.userId
        )
        return c.json({ data: updatedPayment[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

/**
 * Delete payment
 */
data.post("/payment/:uuid/delete", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const { uuid: paymentId } = c.req.param()
    try {
        const deletedPayment = await deletePaymentByUuid(
            paymentId,
            payload.data.userId
        )
        return c.json({ data: deletedPayment[0], error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})
