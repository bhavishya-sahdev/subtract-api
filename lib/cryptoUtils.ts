import { randomBytes, pbkdf2, timingSafeEqual } from "crypto"
import { promisify } from "util"

// Promisify the crypto functions
const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

// Configuration
const SALT_LENGTH = 16
const HASH_LENGTH = 32
const DIGEST = "sha256"

export async function hash(
    password: string,
    iterations: number = 100000
): Promise<string> {
    try {
        // Generate a random salt
        const salt = await randomBytesAsync(SALT_LENGTH)

        // Hash the password
        const hash = await pbkdf2Async(
            password,
            salt,
            iterations,
            HASH_LENGTH,
            DIGEST
        )

        // Combine salt, hash, and iterations, then convert to base64 for storage
        const combined = Buffer.concat([
            Buffer.from(iterations.toString()),
            Buffer.from(":"),
            salt,
            hash,
        ])

        return combined.toString("base64")
    } catch (error) {
        console.error("Error in hashPassword:", error)
        throw error
    }
}

export async function compare(
    providedPassword: string,
    storedHash: string
): Promise<boolean> {
    try {
        // Decode the stored hash from base64
        const combined = Buffer.from(storedHash, "base64")

        // Extract iterations, salt, and hash
        const colonIndex = combined.indexOf(":")
        const iterations = parseInt(combined.slice(0, colonIndex).toString())
        const salt = combined.slice(
            colonIndex + 1,
            colonIndex + 1 + SALT_LENGTH
        )
        const hash = combined.slice(colonIndex + 1 + SALT_LENGTH)

        // Hash the provided password with the same salt and iterations
        const providedHash = await pbkdf2Async(
            providedPassword,
            salt,
            iterations,
            HASH_LENGTH,
            DIGEST
        )

        // Compare the hashes using a constant-time comparison function
        return timingSafeEqual(hash, providedHash)
    } catch (error) {
        console.error("Error in verifyPassword:", error)
        throw error
    }
}
