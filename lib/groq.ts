import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `
You classify emails and extract required information in JSON. If the email is related to a subscription service payment or notification then the schema should look like: 
{isSubscription: true, 
data: {
renewal_amount: number,
renewal_amount_currency_code: string,
renewal_period_enum: one of "monthly" | "annually" | "weekly" | "custom",
renewal_period_days: 1 if renewal_period_enum is not custom else should be a time period in ISO date format,
service_name: string,
next_renewal_date: date string,
current_payment_date: date string of when this payment took place
}}
and if it's not a subscription then just return {isSubscription: false}
`

export const getEmailData = async (email: string) => {
    let cleanedEmail = email.replace(/<style([\s\S]*?)<\/style>/gi, "")
    cleanedEmail = cleanedEmail.replace(/<script([\s\S]*?)<\/script>/gi, "")
    cleanedEmail = email.replace(/<[^>]*>/g, "").replace(/\n/g, "")
    cleanedEmail = cleanedEmail.replace(/\s+/g, " ").trim()

    const chat_completion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: email,
            },
        ],
        model: "llama3-8b-8192",
        temperature: 0,
        stream: false,
        response_format: { type: "json_object" },
    })

    return chat_completion
}
