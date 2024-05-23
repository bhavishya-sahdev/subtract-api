import { Context } from "hono"
import { AuthJWTPayload, verifyToken } from "./jwt"
import { StatusCode } from "hono/utils/http-status"
import { getCookie } from "hono/cookie"

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
