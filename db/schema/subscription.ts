import {
    pgEnum,
    pgTable,
    uuid,
    varchar,
    date,
    numeric,
    integer,
} from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "lib/utils"
import { user } from "./user"
import { sharedColumns } from "./shared"
import { and, eq, relations, sql } from "drizzle-orm"
import { db } from "db/connect"
import { payment } from "./payment"
import { currency } from "./currency"
import { TNewPayment, TNewSubscription } from "lib/types"

export const validRenewalPeriodValues = [
    "monthly",
    "weekly",
    "annually",
    "other",
] as const
export const renewalPeriodEnum = pgEnum(
    "renewal_period_enum",
    validRenewalPeriodValues
)

export const subscription = pgTable("subscription", {
    ...sharedColumns,

    name: varchar("service_name").notNull(),
    creationDate: date("created_date", { mode: "date" }),
    renewalPeriodEnum: renewalPeriodEnum("renewal_period_enum").default(
        "other"
    ),
    renewalPeriodDays: integer("renewal_period_days").default(1),
    upcomingPaymentDate: date("upcoming_payment_date", { mode: "date" }),
    currencyId: uuid("currency_id")
        .references(() => currency.uuid)
        .notNull(),
    renewalAmount: numeric("renewal_amount").notNull(),
    totalCost: numeric("total_cost").default("0"),
    ownerId: uuid("owner_id")
        .references(() => user.uuid, { onDelete: "cascade" })
        .notNull(),
    paymentCount: integer("payment_count").default(0),
})

export type Subscription = OmitDefaultsFromType<
    typeof subscription.$inferSelect
>

export type UpdateSubscription = OmitDefaultsFromType<
    typeof subscription.$inferInsert,
    "uuid" | "ownerId"
>

export const postRelations = relations(subscription, ({ one, many }) => ({
    user: one(user, {
        fields: [subscription.ownerId],
        references: [user.uuid],
    }),
    payment: many(payment),
    currency: one(currency, {
        fields: [subscription.currencyId],
        references: [currency.uuid],
    }),
}))

export const insertSubscription = async (
    newSub: Omit<
        TNewSubscription,
        "paymentCount" | "upcomingPaymentDate" | "totalCost"
    >[],
    userId: string
) => {
    const newList: (TNewSubscription & { ownerId: string })[] = newSub.map(
        (item) => ({
            ...item,
            ownerId: userId,
            upcomingPaymentDate: new Date(),
        })
    )

    return await db
        .insert(subscription)
        .values(newList)
        .returning({ insertedSubscriptionId: subscription.uuid })
}

export const findSubscriptionsByOwnerId = async (ownerId: string) => {
    return await db
        .select()
        .from(subscription)
        .where(eq(subscription.ownerId, ownerId))
}

export const findSubscriptionByUuid = async (uuid: string, ownerId: string) => {
    return await db
        .select()
        .from(subscription)
        .where(
            and(eq(subscription.uuid, uuid), eq(subscription.ownerId, ownerId))
        )
}

export const updateSubscriptionByUuid = async (
    uuid: string,
    updatedColumns: UpdateSubscription,
    payments: TNewPayment[],
    ownerId: string
) => {
    const sub = await db
        .update(subscription)
        .set(updatedColumns)
        .where(
            and(eq(subscription.uuid, uuid), eq(subscription.ownerId, ownerId))
        )
        .returning()

    await db.delete(payment).where(eq(payment.subscriptionId, uuid))

    const paymentPromises = payments.map((p) => {
        return db
            .insert(payment)
            .values({
                ...p,
                ownerId: ownerId,
                subscriptionId: uuid,
            })
            .returning()
    })

    await Promise.all(paymentPromises)

    return sub.map((s) => ({ ...s, payments }))
}

export const deleteSubscriptionByUuid = async (
    uuid: string,
    ownerId: string
) => {
    return await db
        .delete(subscription)
        .where(
            and(eq(subscription.uuid, uuid), eq(subscription.ownerId, ownerId))
        )
        .returning({ deleteSubscriptionId: subscription.uuid })
}

export const insertSubscriptionWithPayments = async (
    newSubs: TNewSubscription[],
    newPayments: TNewPayment[][],
    ownerId: string
) => {
    const res = await db.transaction(async (txn) => {
        const subIds = await txn
            .insert(subscription)
            .values(newSubs.map((n) => ({ ...n, ownerId: ownerId })))
            .returning({
                subscriptionId: subscription.uuid,
                ownerId: subscription.ownerId,
            })

        newPayments.map(
            async (payments, idx) =>
                await txn
                    .insert(payment)
                    .values(
                        payments.map((p) => ({
                            ...p,
                            subscriptionId: subIds[idx].subscriptionId,
                            ownerId: subIds[idx].ownerId,
                        }))
                    )
                    .returning({ paymentId: payment.uuid })
        )
        return { subscriptions: subIds }
    })

    return res
}

export const getSubscriptionStatsByTimeFrame = async (
    ownerId: string,
    period: "month" | "year" = "month"
) => {
    const interval = period === "month" ? "1 month" : "1 year"
    const res = await db.execute(sql`
        WITH periods AS (
            SELECT date_trunc(${period}, generate_series(
                (SELECT date_trunc(${period}, MIN(created_date)) FROM subscription WHERE owner_id = ${ownerId}),
                (SELECT date_trunc(${period}, MAX(created_date)) FROM subscription WHERE owner_id = ${ownerId}),
                ${interval}::interval
            )) AS period
        )
        SELECT
            periods.period,
            COALESCE(subscription.subscription_count, 0) AS subscription_count
        FROM
            periods
        LEFT JOIN (
            SELECT
                DATE_TRUNC(${period}, created_date) AS period,
                COUNT(*) AS subscription_count
                
            FROM
                subscription
            WHERE
                owner_id = ${ownerId}
            GROUP BY
                period
        ) AS subscription ON periods.period = subscription.period
        ORDER BY
            periods.period DESC;
    `)

    return res.rows
}

// return subscriptions with no payments

export const getSubscriptionsWithNoPayments = async (ownerId: string) => {
    return await db.execute(sql`
        SELECT
            subscription.uuid,
            subscription.service_name,
            subscription.created_date,
            subscription.renewal_period_enum,
            subscription.renewal_period_days,
            subscription.upcoming_payment_date,
            subscription.currency_id,
            subscription.renewal_amount,
            subscription.total_cost,
            subscription.owner_id,
            subscription.payment_count
        FROM
            subscription
        LEFT JOIN payment ON subscription.uuid = payment.subscription_id
        WHERE
            subscription.owner_id = ${ownerId}
        GROUP BY
            subscription.uuid
        HAVING
            COUNT(payment.uuid) = 0;
    `)
}
