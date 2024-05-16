import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./routes/auth"
import { payment } from "./routes/payment"
import { user } from "./routes/user"
import { subscription } from "./routes/subscription"

const app = new Hono()
app.use(cors({ origin: "*" }))

app.get("/helloworld", (c) => {
    return c.json({ data: "res" })
})
app.route("/auth", auth)
app.route("/user", user)
app.route("/subscription", subscription)
app.route("/payment", payment)

export default app
