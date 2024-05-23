import { db } from "db/connect"
import { sharedColumns } from "db/schema/shared"
import { eq } from "drizzle-orm"
import { pgTable, varchar } from "drizzle-orm/pg-core"
import { OmitDefaultsFromType } from "lib/utils"

export const prefab = pgTable("prefab", {
    ...sharedColumns,
    name: varchar("name"),
    image: varchar("image"),
})

export type Prefab = OmitDefaultsFromType<typeof prefab.$inferSelect>
export type NewPrefab = OmitDefaultsFromType<typeof prefab.$inferInsert, "uuid">

export const insertPrefabs = async (prefabs: NewPrefab[]) => {
    return await db
        .insert(prefab)
        .values(prefabs)
        .returning({ insertedPrefabId: prefab.uuid })
}

export const getPrefabs = async () => {
    return await db
        .select({ id: prefab.uuid, name: prefab.name, image: prefab.image })
        .from(prefab)
}

export const updatePrefab = async (id: string, values: Partial<NewPrefab>) => {
    return await db
        .update(prefab)
        .set(values)
        .where(eq(prefab.uuid, id))
        .returning({ updatedPrefabId: prefab.uuid })
}

export const deletePrefab = async (id: string) => {
    return await db
        .delete(prefab)
        .where(eq(prefab.uuid, id))
        .returning({ deletedPrefabId: prefab.uuid })
}
