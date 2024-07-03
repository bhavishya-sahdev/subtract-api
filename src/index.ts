import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./routes/auth"
import { payment } from "./routes/payment"
import { user } from "./routes/user"
import { subscription } from "./routes/subscription"
import { currency } from "./routes/currency"
import { prefab } from "./routes/prefab"
import { updateExchangeRates, updateTransactionsRenewal } from "./scheduledJobs"
import { fetchAndStoreRates } from "lib/currency"

const app = new Hono()

fetchAndStoreRates()

updateTransactionsRenewal.start()
updateExchangeRates.start()

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://getsubtract.xyz",
            "https://www.getsubtract.xyz",
            "https://*.vercel.app",
            "http://*.vercel.app",
        ],
        credentials: true,
    })
)

// app.use(logger())
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

export default {
    fetch: app.fetch,
    port: 3000,
}
