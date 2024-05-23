import {
    deletePrefab,
    getPrefabs,
    insertPrefabs,
    updatePrefab,
} from "db/schema/prefab"
import { Hono } from "hono"
import { returnJsonData, returnJsonError } from "lib/utils"

export const prefab = new Hono()

prefab.get("/", async (c) => {
    try {
        const res = await getPrefabs()
        return c.json(returnJsonData(res))
    } catch (err: any) {
        return c.json(returnJsonError(err.message), 500)
    }
})

prefab.post("/", async (c) => {
    const data = await c.req.json()

    try {
        const res = await insertPrefabs(data)
        return c.json(returnJsonData(res))
    } catch (err: any) {
        return c.json(returnJsonError(err.message), 500)
    }
})

prefab.post("/:id/update", async (c) => {
    const id = c.req.param("id")
    const data = await c.req.json()
    try {
        const res = await updatePrefab(id, data)
        return c.json(returnJsonData(res))
    } catch (err: any) {
        return c.json(returnJsonError(err.message), 500)
    }
})

prefab.post("/:id/delete", async (c) => {
    const id = c.req.param("id")
    try {
        const res = await deletePrefab(id)
        return c.json(returnJsonData(res))
    } catch (err: any) {
        return c.json(returnJsonError(err.message), 500)
    }
})
