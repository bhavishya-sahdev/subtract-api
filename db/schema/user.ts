import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "lib/utils"
import { sharedColumns } from "./shared"
import { eq, relations } from "drizzle-orm"
import { subscription } from "./subscription"
import { db } from "db/connect"
import { payment } from "./payment"

export const user = pgTable("user", {
    ...sharedColumns,

    name: varchar("name").notNull(),
    email: varchar("email").notNull().unique(),
    hashedPassword: varchar("hashed_password").notNull(),
    subscriptionCount: integer("subscription_count"),
    paymentCount: integer("payment_count"),
    isOnboardingComplete: boolean("is_onboarding_complete").default(false),
})

export const userRelations = relations(user, ({ many }) => ({
    subscriptions: many(subscription),
    payments: many(payment),
}))

export type User = OmitDefaultsFromType<typeof user.$inferSelect>
export type NewUser = OmitDefaultsFromType<typeof user.$inferInsert, "uuid">
export type UpdateUser = Partial<
    OmitDefaultsFromType<typeof user.$inferInsert, "uuid">
>

export const insertUser = async (newUser: NewUser) => {
    return db
        .insert(user)
        .values(newUser)
        .returning({ insertedUserId: user.uuid })
}

export const updateUser = async (uuid: string, updatedColumns: UpdateUser) => {
    return db
        .update(user)
        .set(updatedColumns)
        .where(eq(user.uuid, uuid))
        .returning({ insertedUserId: user.uuid })
}

export const findUserByEmail = async (email: string) => {
    return db
        .select({ hashedPassword: user.hashedPassword, uuid: user.uuid })
        .from(user)
        .where(eq(user.email, email))
}

export const findUserByUuid = async (uuid: string) => {
    return db
        .select({
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            updatedAt: user.updatedAt,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.uuid, uuid))
}
