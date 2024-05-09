import { numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { sharedColumns } from "./shared"
import { subscription } from "./subscription"
import { OmitDefaultsFromType } from "lib/utils"
import { relations } from "drizzle-orm"

export const payment = pgTable("payment", {
    ...sharedColumns,
    subscriptionId: uuid("subscription_id")
        .references(() => subscription.uuid, { onDelete: "cascade" })
        .notNull(),
    date: timestamp("date", {
        mode: "date",
        withTimezone: true,
    }).notNull(),
    currency: varchar("currency").notNull(),
    price: numeric("price").notNull(),
})

export const paymentRelations = relations(payment, ({ one }) => ({
    subscription: one(subscription, {
        fields: [payment.subscriptionId],
        references: [subscription.id],
    }),
}))

export type Payment = OmitDefaultsFromType<typeof payment.$inferSelect>
export type NewPayment = OmitDefaultsFromType<
    typeof payment.$inferInsert,
    "uuid" | "subscriptionId"
>
