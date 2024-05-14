import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./routes/auth"
import { data } from "./routes/data"

const app = new Hono()
app.use(cors({ origin: "*" }))

app.get("/helloworld", (c) => {
    return c.json({ data: "res" })
})
app.route("/", auth)
app.route("/", data)
export default app
