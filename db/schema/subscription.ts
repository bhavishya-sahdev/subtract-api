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
import { eq, relations } from "drizzle-orm"
import { db } from "db/connect"

export const renewalPeriodEnum = pgEnum("renewal_period", [
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
    renewalPrice: numeric("renewal_price").notNull(),
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

export const postsRelations = relations(subscription, ({ one }) => ({
    user: one(user, {
        fields: [subscription.ownerId],
        references: [user.uuid],
    }),
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
