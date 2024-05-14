import {
    pgEnum,
    pgTable,
    uuid,
    varchar,
    date,
    numeric,
} from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "lib/utils"
import { user } from "./user"
import { sharedColumns } from "./shared"
import { and, eq, relations } from "drizzle-orm"
import { db } from "db/connect"
import { payment } from "./payment"

export const validRenewalPeriodValues = [
    "monthly",
    "weekly",
    "annually",
    "other",
] as const
export const renewalPeriodEnum = pgEnum("renewal_period_enum", [
    "monthly",
    "weekly",
    "annually",
    "other",
])

export const subscription = pgTable("subscription", {
    ...sharedColumns,

    name: varchar("service_name").notNull(),
    creationDate: date("created_date", { mode: "date" }),
    renewalPeriod: renewalPeriodEnum("renewal_period").default("other"),
    upcomingPaymentDate: date("upcoming_payment_date", { mode: "date" }),
    currency: varchar("currency").notNull(),
    renewalAmount: numeric("renewal_amount").notNull(),
    totalCost: numeric("total_cost"),
    ownerId: uuid("owner_id")
        .references(() => user.uuid, { onDelete: "cascade" })
        .notNull(),
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
}))

export const insertSubscription = async (
    newSub: NewSubscription & { ownerId: string }
) => {
    return await db
        .insert(subscription)
        .values(newSub)
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
