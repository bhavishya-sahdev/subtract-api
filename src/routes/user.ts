import axios from "axios"
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
import {
    verifyAndDecodeTokenFromCookie,
    verifyAndDecodeTokenFromHeader,
} from "lib/utils"
export const user = new Hono()

/**
 * Get user details
 */
user.get("/", async (c) => {
    const payload = verifyAndDecodeTokenFromHeader(c)
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
    const payload = verifyAndDecodeTokenFromHeader(c)
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
    const payload = verifyAndDecodeTokenFromHeader(c)
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

            // check if scope gmail read is present
            // if not present, return error
            authClient.setCredentials({
                access_token: user.googleAccessToken,
                refresh_token: user.googleRefreshToken,
                expiry_date: parseInt(user.googleTokenExpiresAt),
            })

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
            })

            const messagePromises = mails.data.messages?.map((message) =>
                gmail.users.messages.get({
                    userId: "me",
                    id: message.id!,
                })
            )
            // resolve all the promises and get the messages
            const messages = await Promise.all(messagePromises || [])

            // clean up the emails
            const cleanedEmails = messages
                .filter((message) => message.data.payload !== undefined)
                .map((message) => {
                    // already filtered out undefined payloads
                    if (!message.data.payload)
                        return {
                            body: "<IGNORE>",
                            subject: "<IGNORE>",
                            labels: message.data.labelIds || [],
                        }

                    if (
                        message.data.payload.mimeType?.startsWith(
                            "multipart"
                        ) &&
                        message.data.payload.parts
                    ) {
                        return {
                            body:
                                message.data.payload.parts?.find((part) =>
                                    part.mimeType?.startsWith("text/")
                                )?.body?.data || "<IGNORE>",
                            subject:
                                message.data.payload.headers?.find(
                                    (header) => header.name === "Subject"
                                )?.value || "<IGNORE>",
                            labels: message.data.labelIds || [],
                        }
                    } else if (
                        message.data.payload.mimeType?.startsWith("text/")
                    ) {
                        return {
                            body: message.data.payload.body?.data || "<IGNORE>",
                            subject:
                                message.data.payload.headers?.find(
                                    (header) => header.name === "Subject"
                                )?.value || "<IGNORE>",
                            labels: message.data.labelIds || [],
                        }
                    }
                    return {
                        body: "<IGNORE>",
                        subject:
                            message.data.payload.headers?.find(
                                (header) => header.name === "Subject"
                            )?.value || "<IGNORE>",
                        labels: message.data.labelIds || [],
                    }
                })
                .map((email) => {
                    let body = Buffer.from(email.body, "base64").toString()
                    body = body.replace(/<style([\s\S]*?)<\/style>/gi, "")
                    body = body.replace(/<script([\s\S]*?)<\/script>/gi, "")
                    body = body.replace(/<[^>]*>/g, "").replace(/\n/g, "")
                    body = body.replace(/\s+/g, " ").trim()

                    return {
                        body,
                        subject: email.subject,
                        labels: email.labels,
                    }
                })
            // pass it to the AI model
            // extractEmailData(messages[0].data.payload.body.data)
            const res = await extractEmailData(
                cleanedEmails
                    .filter((e) => e.body !== "<IGNORE>")
                    .filter((_e, idx) => idx < 5)
            )
            return c.json({ data: res, error: null })
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
