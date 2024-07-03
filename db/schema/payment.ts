import {
    numeric,
    pgEnum,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { sharedColumns } from "./shared"
import { subscription } from "./subscription"
import { OmitDefaultsFromType } from "lib/utils"
import { and, eq, relations, sql } from "drizzle-orm"
import { db } from "db/connect"
import { user } from "./user"
import { currency } from "./currency"
import { rates } from "lib/currency"

export const validPaymentStatusValues = ["paid", "upcoming", "pending"] as const
export const paymentStatusEnum = pgEnum(
    "payment_status_enum",
    validPaymentStatusValues
)

export const payment = pgTable("payment", {
    ...sharedColumns,
    subscriptionId: uuid("subscription_id")
        .references(() => subscription.uuid, { onDelete: "cascade" })
        .notNull(),
    date: timestamp("date", {
        mode: "date",
        withTimezone: true,
    }).notNull(),
    ownerId: uuid("owner_id")
        .references(() => user.uuid, { onDelete: "cascade" })
        .notNull(),
    currencyId: uuid("currency_id")
        .references(() => currency.uuid)
        .notNull(),
    amount: numeric("amount").notNull(),
    paymentMethod: varchar("payment_method"),
    paymentStatusEnum: paymentStatusEnum("payment_status_enum").default("paid"),
})

export const paymentRelations = relations(payment, ({ one }) => ({
    subscription: one(subscription, {
        fields: [payment.subscriptionId],
        references: [subscription.uuid],
    }),
    user: one(user, {
        fields: [payment.ownerId],
        references: [user.uuid],
    }),
    currency: one(currency, {
        fields: [payment.currencyId],
        references: [currency.uuid],
    }),
}))

export type Payment = OmitDefaultsFromType<typeof payment.$inferSelect>
export type NewPayment = OmitDefaultsFromType<
    typeof payment.$inferInsert,
    "uuid" | "subscriptionId" | "ownerId"
>

export const insertPayment = async (
    newPayment: NewPayment & { subscriptionId: string },
    ownerId: string
) => {
    return db
        .insert(payment)
        .values({ ownerId, ...newPayment })
        .returning({ insertedPaymentId: payment.uuid })
}

export const findPaymentBySubscriptionId = async (subId: string) => {
    return await db
        .select()
        .from(subscription)
        .where(eq(payment.subscriptionId, subId))
}

export const findPaymentByUuid = async (uuid: string, ownerId: string) => {
    return await db
        .select()
        .from(payment)
        .where(and(eq(payment.uuid, uuid), eq(payment.ownerId, ownerId)))
}

export const findPaymentsByOwnerId = async (ownerId: string) => {
    return await db.select().from(payment).where(eq(payment.ownerId, ownerId))
}

export const updatePaymentByUuid = async (
    uuid: string,
    updatedColumns: NewPayment,
    ownerId: string
) => {
    return await db
        .update(payment)
        .set(updatedColumns)
        .where(and(eq(payment.uuid, uuid), eq(payment.ownerId, ownerId)))
        .returning({ updatedPaymentId: payment.uuid })
}

export const deletePaymentByUuid = async (uuid: string, ownerId: string) => {
    return await db
        .delete(payment)
        .where(and(eq(payment.uuid, uuid), eq(payment.ownerId, ownerId)))
        .returning({ deletePaymentId: payment.uuid })
}

export const getPaymentStatsByTimeFrame = async (
    ownerId: string,
    period: "month" | "year" = "month"
) => {
    const currencies = await db.select().from(currency)

    // First, get the user's preferred currency
    const { preferredCurrencyId } = (
        await db
            .select({ preferredCurrencyId: user.preferredCurrencyId })
            .from(user)
            .where(eq(user.uuid, ownerId))
    )[0]

    if (!preferredCurrencyId) {
        throw new Error("User's preferred currency not found")
    }

    const payments = await db
        .select({
            uuid: payment.uuid,
            date: payment.date,
            amount: payment.amount,
            currencyId: payment.currencyId,
        })
        .from(payment)
        .where(eq(payment.ownerId, ownerId))

    const convertedPayments = payments
        .map((p) => {
            const paymentCurrencyCode =
                currencies.find((c) => c.uuid === p.currencyId)?.code || "USD"
            const preferredCurrencyCode =
                currencies.find((c) => c.uuid === preferredCurrencyId)?.code ||
                "USD"
            const convertedAmount = rates.convert(
                parseFloat(p.amount),
                paymentCurrencyCode,
                preferredCurrencyCode
            )

            return {
                ...p,
                convertedAmount,
                preferredCurrencyCode,
            }
        })
        .map((p) => {
            // group by month or year
            const date = new Date(p.date)
            let key = ""
            if (period === "month") {
                key = `${date.getFullYear()}-${date.getMonth() + 1}`
            } else {
                key = `${date.getFullYear()}`
            }
            return {
                ...p,
                key,
            }
        })

    const groupedPayments = convertedPayments.reduce((acc, p) => {
        if (!acc[p.key]) {
            acc[p.key] = {
                payments: [],
                total: 0,
                preferredCurrencyCode: "",
            }
        }
        acc[p.key]["total"] += p.convertedAmount
        acc[p.key]["payments"].push(p)
        acc[p.key]["preferredCurrencyCode"] = p.preferredCurrencyCode
        return acc
    }, {} as Record<string, { payments: Pick<Payment, "amount" | "date" | "uuid" | "currencyId">[]; total: number; preferredCurrencyCode: string }>)

    return groupedPayments
}

export const getUpcomingPayments = async (ownerId: string) => {
    const res = await db.execute(sql`
        SELECT *
        FROM payment
        WHERE owner_id = ${ownerId} AND date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '2 weeks' AND payment_status_enum != 'paid'
        ORDER BY date;
    `)

    return res.rows
}
