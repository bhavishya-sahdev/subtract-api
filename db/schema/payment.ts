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
import { and, eq, relations } from "drizzle-orm"
import { db } from "db/connect"
import { user } from "./user"

export const validPaymentStatusValues = [
    "paid",
    "failed",
    "pending",
    "refunded",
] as const
const paymentStatusEnum = pgEnum(
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
    currency: varchar("currency").notNull(),
    amount: numeric("amount").notNull(),
    paymentMethod: varchar("payment_method"),
    paymentStatus: varchar("payment_status").default("pending"),
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
}))

export type Payment = OmitDefaultsFromType<typeof payment.$inferSelect>
export type NewPayment = OmitDefaultsFromType<
    typeof payment.$inferInsert,
    "uuid" | "subscriptionId"
>

export const insertPayment = async (
    newPayment: NewPayment & { subscriptionId: string }
) => {
    return db
        .insert(payment)
        .values(newPayment)
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
