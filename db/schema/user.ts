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
    subscriptionCount: integer("subscription_count").default(0),
    paymentCount: integer("payment_count").default(0),
    isOnboardingComplete: boolean("is_onboarding_complete").default(false),

    isGoogleUser: boolean("is_google_user").default(false),
    googleId: varchar("google_id").unique(),
    googleAccessToken: varchar("google_access_token"),
    googleRefreshToken: varchar("google_refresh_token"),
    googleTokenExpiresAt: varchar("google_token_expires_at"),
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
        .returning({ updatedUserId: user.uuid })
}

export const findUserByEmail = async (email: string) => {
    return db
        .select({
            hashedPassword: user.hashedPassword,
            uuid: user.uuid,
            isGoogleUser: user.isGoogleUser,
        })
        .from(user)
        .where(eq(user.email, email))
}

export const findUserByUuid = async (
    uuid: string,
    returnGoogleTokens: boolean = false
) => {
    return db
        .select({
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            updatedAt: user.updatedAt,
            createdAt: user.createdAt,
            isOnboardingComplete: user.isOnboardingComplete,
            subscriptionCount: user.subscriptionCount,
            isGoogleUser: user.isGoogleUser,
            googleId: user.googleId,
            ...(returnGoogleTokens && {
                googleAccessToken: user.googleAccessToken,
                googleRefreshToken: user.googleRefreshToken,
                googleTokenExpiresAt: user.googleTokenExpiresAt,
            }),
        })
        .from(user)
        .where(eq(user.uuid, uuid))
}

export const findUserByUuidWithSubscriptions = async (uuid: string) => {
    const selectedUser = await db
        .select({
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            updatedAt: user.updatedAt,
            createdAt: user.createdAt,
            isOnboardingComplete: user.isOnboardingComplete,
            subscriptionCount: user.subscriptionCount,
            paymentCount: user.paymentCount,
        })
        .from(user)
        .where(eq(user.uuid, uuid))

    const selectedSubs = await db
        .select()
        .from(subscription)
        .where(eq(subscription.ownerId, uuid))

    return { ...selectedUser[0], subscriptions: selectedSubs }
}

// return members with no subscriptions

export const findMembersWithNoSubscriptions = async () => {
    return db.select().from(user).where(eq(user.subscriptionCount, 0))
}
