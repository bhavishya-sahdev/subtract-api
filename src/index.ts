import { Hono } from "hono"
import { auth } from "./routes/auth"

const app = new Hono()

app.get("/helloworld", (c) => {
    return c.json({ data: "res" })
})
app.route("/", auth)

export default app
