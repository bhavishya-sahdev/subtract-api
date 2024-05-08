import { pgTable, varchar } from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "../../lib/utils"
import { sharedColumns } from "./shared"

export const user = pgTable("user", {
    ...sharedColumns,

    name: varchar("name").notNull(),
    email: varchar("email").notNull().unique(),

    // auth related data
})

export type User = OmitDefaultsFromType<typeof user.$inferSelect>
export type NewUser = OmitDefaultsFromType<typeof user.$inferInsert, "uuid">
