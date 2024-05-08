import { serial, uuid, date } from "drizzle-orm/pg-core"

export const sharedColumns = {
    id: serial("id").unique(),
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    createdAt: date("created_at", { mode: "date" }),
    updatedAt: date("updated_at", { mode: "date" }),
}
