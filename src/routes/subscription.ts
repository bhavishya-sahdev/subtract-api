import { validPaymentStatusValues } from "db/schema/payment"
import {
    deleteSubscriptionByUuid,
    findSubscriptionByUuid,
    getSubscriptionStatsByTimeFrame,
    insertSubscription,
    insertSubscriptionWithPayments,
    updateSubscriptionByUuid,
    validRenewalPeriodValues,
} from "db/schema/subscription"
import { Hono } from "hono"
import { newPaymentSchema, newSubscriptionSchema } from "lib/types"
import { verifyAndDecodeTokenFromCookie } from "lib/utils"
import { z } from "zod"

export const subscription = new Hono()

// const newSubscriptionSchema = z.object({
//     name: z.string(),
//     creationDate: z.coerce.date(),
//     renewalPeriodEnum: z.enum(validRenewalPeriodValues),
//     renewalPeriodDays: z.number(),
//     // upcomingPaymentDate: z.date(),
//     currencyId: z.string(),
//     renewalAmount: z.coerce.string(),
//     // paymentCount: z.number(),
//     // totalCost: z.coerce.string(),
// })

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
    subscription: z.object({
        name: z.string(),
        creationDate: z.coerce.date(),
        renewalPeriodEnum: z.enum(validRenewalPeriodValues),
        renewalPeriodDays: z.number(),
        currencyId: z.string(),
        renewalAmount: z.coerce.string(),
    }),
    payments: z.array(
        z.object({
            date: z.coerce.date(),
            amount: z.coerce.string(),
            currencyId: z.string(),
            paymentStatusEnum: z.enum(validPaymentStatusValues),
        })
    ),
})
/**
 * Update subscription
 */
subscription.post("/:uuid/update", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
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
            validatedInput.data.subscription,
            validatedInput.data.payments,
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
    const payload = verifyAndDecodeTokenFromCookie(c)
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
        return c.json({ error: validatedInput.error.errors, data: null }, 400)
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

subscription.get("/by-timeframe", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    const { period } = c.req.query()
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        const subscriptions = await getSubscriptionStatsByTimeFrame(
            payload.data.userId,
            period === "year" ? "year" : "month"
        )
        return c.json({ data: subscriptions, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

/**
 * Get subscription by uuid
 * this uses a route parameter to get the payment by uuid
 * so registering it after the other routes
 *
 */
subscription.get("/:uuid", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
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
