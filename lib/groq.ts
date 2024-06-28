import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `
You will receive one or more emails separated by "---". Analyze each email and extract the required information, then group related subscriptions together in JSON format.

For each unique subscription service:

1. If the emails are related to a subscription service:
   {
    isSubscription: true,
    service_name: string,
    next_renewal_date: "DD/MM/YYYY" // should be in the future depending on the last transaction date and renewal period,
    renewal_amount_currency_code: string,
    renewal_period_enum: "monthly" | "annually" | "weekly" | "custom",
    renewal_period_days: number, // 1 if renewal_period_enum is not custom, else the period in days
    total_renewal_amount: number // including all taxes and fees,
    transactions: [
    {
        total_paid_amount: number,
        renewal_amount_currency_code: string,
        payment_date: "DD/MM/YYYY" // Date when the individual transaction was made,
    },
    // Additional transactions for the same service
    ]
   }

2. If an email is not related to a subscription:
   {
     isSubscription: false
   }

Combine the results into a single array, grouping related subscriptions:
{
  subscriptions: [
    // Results for each unique subscription service or non-subscription email
  ]
}

Analyze all provided emails and extract the relevant information according to these guidelines. Group transactions for the same service together under a single entry in the subscriptions array.
`

export const extractEmailData = async (
    emails: {
        body: string
        subject: string
        labels: string[]
        sender: string
        date: string
    }[]
) => {
    // Combine all emails into a single string
    const combinedEmails = emails
        .map(
            (email, index) =>
                `Email ${index + 1}:\nDate: ${email.date}\nSubject: ${
                    email.subject
                }\nLabels: ${email.labels.join(", ")}\nBody: ${email.body}\n\n`
        )
        .join("---\n")

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: combinedEmails,
            },
        ],
        model: "llama3-70b-8192",
        temperature: 0,
        stream: false,
        response_format: { type: "json_object" },
    })

    return JSON.parse(chatCompletion.choices[0].message.content || "{}")
}
