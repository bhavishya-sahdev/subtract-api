import { Context } from "hono"
import { AuthJWTPayload, verifyToken } from "./jwt"
import { StatusCode } from "hono/utils/http-status"
import { getCookie } from "hono/cookie"
import { gmail_v1 } from "googleapis"
import { GaxiosResponse } from "gaxios"

export type OmitDefaultsFromType<T, K extends string = ""> = Omit<
    T,
    "createdAt" | "updatedAt" | "id" | K
>

export const verifyAndDecodeTokenFromHeader = <T extends Context>(
    c: T
):
    | { data: AuthJWTPayload; error: null }
    | { data: null; error: { message: string; status: StatusCode } } => {
    const token = c.req.header("Authorization")?.split("Bearer ")[1]
    if (!token)
        return {
            error: { message: "Unauthorized access", status: 401 },
            data: null,
        }

    const payload = verifyToken(token)
    if (!payload)
        return {
            error: { message: "Unauthorized access", status: 403 },
            data: null,
        }

    return { data: payload, error: null }
}

export const verifyAndDecodeTokenFromCookie = <T extends Context>(
    c: T
):
    | { data: AuthJWTPayload; error: null }
    | { data: null; error: { message: string; status: StatusCode } } => {
    const token = getCookie(c, "token")
    if (!token)
        return {
            error: { message: "Unauthorized access", status: 401 },
            data: null,
        }

    const payload = verifyToken(token)
    if (!payload)
        return {
            error: { message: "Unauthorized access", status: 403 },
            data: null,
        }

    return { data: payload, error: null }
}

export const returnJsonData = <T extends unknown>(data: T) => {
    return { data, error: null }
}
export const returnJsonError = <T extends unknown>(error: T) => {
    return { data: null, error }
}

export const cleanEmails = (
    messages: GaxiosResponse<gmail_v1.Schema$Message>[]
) => {
    // clean up the emails
    return messages
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
                message.data.payload.mimeType?.startsWith("multipart") &&
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
            } else if (message.data.payload.mimeType?.startsWith("text/")) {
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
            body = body.replace(/http(s)?:\/\/\S+/g, "")

            return {
                body,
                subject: email.subject,
                labels: email.labels,
            }
        })
}
