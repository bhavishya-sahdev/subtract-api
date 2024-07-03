import { db } from "db/connect"
import { payment } from "db/schema/payment"
import { subscription } from "db/schema/subscription"
import { and, eq, lte } from "drizzle-orm"
import { fetchAndStoreRates } from "lib/currency"
import cron from "node-cron"

export const updateTransactionsRenewal = cron.schedule(
    "0 0 * * *",
    async () => {
        console.log("Running scheduled job: updateTransactionsRenewal")

        // find all transactions that are due today, update the status to due and create a new transaction for the next due date
        const res = await db
            .update(payment)
            .set({
                paymentStatusEnum: "pending",
            })
            .where(
                and(
                    lte(payment.date, new Date()),
                    eq(payment.paymentStatusEnum, "upcoming")
                )
            )
            .returning({
                subscriptionId: payment.subscriptionId,
                ownerId: payment.ownerId,
                currencyId: payment.currencyId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
            })

        res.map(async (transaction) => {
            //  get subscription details for the transaction
            const subRes = (
                await db
                    .select()
                    .from(subscription)
                    .where(eq(subscription.uuid, transaction.subscriptionId))
            )[0]
            let nextDueDate = new Date()
            // calculate the next due date
            if (subRes.renewalPeriodEnum === "monthly") {
                nextDueDate.setMonth(nextDueDate.getMonth() + 1)
            } else if (subRes.renewalPeriodEnum === "annually") {
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
            } else if (subRes.renewalPeriodEnum === "weekly") {
                nextDueDate.setDate(nextDueDate.getDate() + 7)
            } else {
                nextDueDate.setDate(
                    nextDueDate.getDate() + (subRes.renewalPeriodDays || 0)
                )
            }

            // update subscription next renewal date
            await db
                .update(subscription)
                .set({
                    upcomingPaymentDate: nextDueDate,
                })
                .where(eq(subscription.uuid, transaction.subscriptionId))

            // create a new transaction for the next due date
            await db.insert(payment).values({
                subscriptionId: transaction.subscriptionId,
                ownerId: transaction.ownerId,
                currencyId: transaction.currencyId,
                amount: transaction.amount,
                paymentMethod: transaction.paymentMethod,
                date: nextDueDate,
                paymentStatusEnum: "upcoming",
            })
        })
    }
)

export const updateExchangeRates = cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled job: updateExchangeRates")
    await fetchAndStoreRates()
})
