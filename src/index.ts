import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./routes/auth"
import { payment } from "./routes/payment"
import { user } from "./routes/user"
import { subscription } from "./routes/subscription"
import { logger } from "hono/logger"
import { showRoutes } from "hono/dev"
import { currency } from "./routes/currency"
import { prefab } from "./routes/prefab"

const app = new Hono()

const isDevelopment = process.env.NODE_ENV === "development"
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
)

app.use(logger())
app.get("/", (c) => {
    return c.json({ data: "res" })
})

// routes
app.route("/auth", auth)
app.route("/user", user)
app.route("/subscription", subscription)
app.route("/payment", payment)
app.route("/currency", currency)
app.route("/prefab", prefab)

if (isDevelopment) showRoutes(app)

export default app
