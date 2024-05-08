import * as jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!

export const generateToken = (payload: Record<string, string>) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" })
}

export const verifyToken = (token: string) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        return decoded
    } catch (err) {
        return null
    }
}
