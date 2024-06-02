import {
    deletePaymentByUuid,
    findPaymentByUuid,
    insertPayment,
    updatePaymentByUuid,
    validPaymentStatusValues,
} from "db/schema/payment"

import { Hono } from "hono"
import { newPaymentSchema } from "lib/types"
import { verifyAndDecodeTokenFromHeader } from "lib/utils"
import { z } from "zod"

export const payment = new Hono()

/**
 * Get payment by uuid
 */
payment.get("/:uuid", async (c) => {
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

/**
 * Create payment
 */
payment.post("/", async (c) => {
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
        const insertedPayment = await insertPayment(
            {
                ...data,
            },
            payload.data.userId
        )
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
payment.post("/:uuid/update", async (c) => {
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
payment.post("/:uuid/delete", async (c) => {
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
