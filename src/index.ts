import { Hono } from "hono"
import { auth } from "./routes/auth"
import { data } from "./routes/data"

const app = new Hono()

app.get("/helloworld", (c) => {
    return c.json({ data: "res" })
})
app.route("/", auth)
app.route("/", data)
export default app
