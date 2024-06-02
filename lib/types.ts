import { validPaymentStatusValues } from "db/schema/payment"
import { validRenewalPeriodValues } from "db/schema/subscription"
import { z } from "zod"

export const newSubscriptionSchema = z.object({
    name: z.string(),
    creationDate: z.coerce.date(),
    renewalPeriodEnum: z.enum(validRenewalPeriodValues),
    renewalPeriodDays: z.number(),
    upcomingPaymentDate: z.coerce.date().min(new Date()),
    currencyId: z.string(),
    renewalAmount: z.coerce.string(),
    totalCost: z.coerce.string(),
})

export const newPaymentSchema = z.object({
    date: z.coerce.date(),
    currencyId: z.string(),
    amount: z.coerce.string(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(validPaymentStatusValues).optional(),
})

export type TNewSubscription = z.infer<typeof newSubscriptionSchema>
export type TNewPayment = z.infer<typeof newPaymentSchema>
