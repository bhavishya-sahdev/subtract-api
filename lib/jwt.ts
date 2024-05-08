import * as jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!
type AuthJWTPayload = { userId: string }

export const generateToken = (payload: AuthJWTPayload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" })
}

export const verifyToken = (token: string) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        return decoded as AuthJWTPayload
    } catch (err) {
        return null
    }
}
