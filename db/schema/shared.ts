import { serial, uuid, timestamp } from "drizzle-orm/pg-core"

export const sharedColumns = {
    id: serial("id"),
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", {
        mode: "date",
        withTimezone: true,
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
        mode: "date",
        withTimezone: true,
    })
        .defaultNow()
        .$onUpdate(() => new Date()),
}
