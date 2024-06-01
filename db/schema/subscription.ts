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
import { and, eq, relations } from "drizzle-orm"
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
    totalCost: numeric("total_cost"),
    ownerId: uuid("owner_id")
        .references(() => user.uuid, { onDelete: "cascade" })
        .notNull(),
    paymentCount: integer("payment_count").default(0),
})

export type Subscription = OmitDefaultsFromType<
    typeof subscription.$inferSelect
>
export type NewSubscription = OmitDefaultsFromType<
    typeof subscription.$inferSelect,
    "uuid" | "ownerId"
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
        NewSubscription,
        "paymentCount" | "upcomingPaymentDate" | "totalCost"
    >[],
    userId: string
) => {
    const newList: (NewSubscription & { ownerId: string })[] = newSub.map(
        (item) => ({
            ...item,
            ownerId: userId,
            paymentCount: 0,
            upcomingPaymentDate: new Date(),
            totalCost: "12",
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
    ownerId: string
) => {
    return await db
        .update(subscription)
        .set(updatedColumns)
        .where(
            and(eq(subscription.uuid, uuid), eq(subscription.ownerId, ownerId))
        )
        .returning({ updatedSubscriptionId: subscription.uuid })
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

        const paymentIds = newPayments.map(
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
