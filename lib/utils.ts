import { Context } from "hono"
import { AuthJWTPayload, verifyToken } from "./jwt"
import { StatusCode } from "hono/utils/http-status"

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
