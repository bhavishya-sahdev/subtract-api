import { findPaymentsByOwnerId } from "db/schema/payment"
import {
    findUserByUuid,
    findUserByUuidWithSubscriptions,
    updateUser,
} from "db/schema/user"
import { google } from "googleapis"
import { Hono } from "hono"
import { authClient } from "lib/google"
import { extractEmailData } from "lib/groq"
import { cleanEmails, verifyAndDecodeTokenFromCookie } from "lib/utils"
export const user = new Hono()

/**
 * Get user details
 */
user.get("/", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    const user = await findUserByUuid(payload.data.userId)
    return c.json({ data: user[0], error: null })
})

/**
 * Get all subscriptions by user
 */
user.get("/subscriptions", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        const userWithSubscriptions = await findUserByUuidWithSubscriptions(
            payload.data.userId
        )
        return c.json({ data: userWithSubscriptions, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

/**
 * Get all payments by user
 */
user.get("/payments", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        const payments = await findPaymentsByOwnerId(payload.data.userId)
        return c.json({ data: payments, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.post("/update-onboarding-status", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }
    try {
        const user = await updateUser(payload.data.userId, {
            isOnboardingComplete: true,
        })
        return c.json({ data: user, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.get("/google/access", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    try {
        // check if user exists
        const [user] = await findUserByUuid(payload.data.userId, true)
        if (!user) {
            return c.json({ error: "User not found", data: null }, 404)
        }

        if (user.isGoogleUser) {
            if (
                !user.googleAccessToken ||
                !user.googleRefreshToken ||
                !user.googleTokenExpiresAt
            )
                return c.json(
                    { error: "Invalid Google response", data: null },
                    500
                )

            authClient.setCredentials({
                access_token: user.googleAccessToken,
                refresh_token: user.googleRefreshToken,
                expiry_date: parseInt(user.googleTokenExpiresAt),
            })

            if (new Date() > new Date(parseInt(user.googleTokenExpiresAt))) {
                try {
                    const { credentials } =
                        await authClient.refreshAccessToken()
                    if (
                        !credentials.expiry_date ||
                        !credentials.access_token ||
                        !credentials.refresh_token
                    )
                        return c.json(
                            {
                                error: "Failed to refresh access token",
                                data: null,
                            },
                            500
                        )
                    // Save the new tokens in the database
                    await updateUser(user.uuid, {
                        googleAccessToken: credentials.access_token,
                        googleRefreshToken: credentials.refresh_token,
                        googleTokenExpiresAt:
                            credentials.expiry_date.toString(),
                    })

                    // Update authClient with new access token
                    authClient.setCredentials({
                        access_token: credentials.access_token,
                        refresh_token: credentials.refresh_token,
                        expiry_date: credentials.expiry_date,
                    })
                } catch (err) {
                    return c.json(
                        { error: "Failed to refresh access token", data: null },
                        500
                    )
                }
            }

            // get token info to check scopes granted
            const tokenInfo = await authClient.getTokenInfo(
                user.googleAccessToken
            )
            const requiredScope =
                "https://www.googleapis.com/auth/gmail.readonly"

            // if required scope is not granted, return error
            if (!tokenInfo.scopes.includes(requiredScope)) {
                return c.json(
                    {
                        error: {
                            code: "G-403",
                            message: "Required scope not granted",
                        },
                        data: null,
                    },
                    200
                )
            }

            return c.json({ data: { status: "ok" }, error: null })
        }
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.get("/google/mails", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    const { pageToken } = c.req.query()

    try {
        const [user] = await findUserByUuid(payload.data.userId, true)
        if (!user) {
            return c.json({ error: "User not found", data: null }, 404)
        }

        // if user has a google account linked:
        if (user.isGoogleUser) {
            if (
                !user.googleAccessToken ||
                !user.googleRefreshToken ||
                !user.googleTokenExpiresAt
            )
                return c.json(
                    { error: "Invalid Google response", data: null },
                    500
                )

            // set the credentials for the auth client
            authClient.setCredentials({
                access_token: user.googleAccessToken,
                refresh_token: user.googleRefreshToken,
                expiry_date: parseInt(user.googleTokenExpiresAt),
            })

            const gmail = google.gmail({ version: "v1", auth: authClient })
            const mails = await gmail.users.messages.list({
                userId: "me",
                pageToken: pageToken,
            })

            const messagePromises = mails.data.messages?.map((message) =>
                gmail.users.messages.get({
                    userId: "me",
                    id: message.id!,
                })
            )
            // resolve all the promises and get the messages
            const cleanedEmails = cleanEmails(
                await Promise.all(messagePromises || [])
            )

            return c.json({
                data: {
                    messages: cleanedEmails,
                    nextPageToken: mails.data.nextPageToken,
                },
                error: null,
            })
        } else {
            return c.json(
                {
                    error: "User does not have a Google account linked",
                    data: null,
                },
                400
            )
        }
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})

user.post("/google/mails/extract", async (c) => {
    const payload = verifyAndDecodeTokenFromCookie(c)
    if (payload.error) {
        return c.json(
            { data: null, error: payload.error.message },
            payload.error.status
        )
    }

    const { messages } = await c.req.json()

    try {
        const res = await extractEmailData(messages)
        return c.json({ data: res, error: null })
    } catch (err: any) {
        return c.json({ error: err.message, data: null }, 500)
    }
})
