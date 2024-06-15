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
    const interval = period === "month" ? "1 month" : "1 year"
    const res = await db.execute(sql`
        WITH periods AS (
            SELECT date_trunc(${period}, generate_series(
                (SELECT date_trunc(${period}, MIN(date)) FROM payment WHERE owner_id = ${ownerId}),
                (SELECT date_trunc(${period}, MAX(date)) FROM payment WHERE owner_id = ${ownerId}),
                ${interval}::interval
            )) AS period
        )
        SELECT
            periods.period,
            COALESCE(payment.payment_count, 0) AS payment_count,
            COALESCE(payment.total_amount, 0) AS total_amount
        FROM
            periods
        LEFT JOIN (
            SELECT
                DATE_TRUNC(${period}, date) AS period,
                COUNT(*) AS payment_count,
                SUM(amount) AS total_amount
            FROM
                payment
            WHERE
                owner_id = ${ownerId}
            GROUP BY
                period
        ) AS payment ON periods.period = payment.period
        ORDER BY
            periods.period DESC;
    `)

    return res.rows
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
