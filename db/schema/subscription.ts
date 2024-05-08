import {
    pgEnum,
    pgTable,
    serial,
    uuid,
    varchar,
    date,
    numeric,
} from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "../../lib/utils"
import { user } from "./user"
import { sharedColumns } from "./shared"

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
    userId: uuid("user_id")
        .references(() => user.uuid, { onDelete: "cascade" })
        .notNull(),
})

export type Subscription = OmitDefaultsFromType<
    typeof subscription.$inferSelect
>
export type NewSubscription = OmitDefaultsFromType<
    typeof subscription.$inferSelect,
    "uuid"
>
