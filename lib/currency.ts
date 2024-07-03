import axios from "axios"

// Frankfurter API base URL
const API_URL = "https://api.frankfurter.app/latest?base=USD"

type TRates = {
    date: string
    rates: Record<string, number>
    convert: (amount: number, from: string, to: string) => number
}

let rates: TRates = {
    date: "",
    rates: {},
    convert: (amount: number, from: string, to: string) => {
        const fromRate = rates.rates[from]
        const toRate = rates.rates[to]

        if (!fromRate || !toRate) {
            throw new Error("Invalid currency code")
        }

        return (amount / fromRate) * toRate
    },
}

export async function fetchAndStoreRates() {
    try {
        // Fetch the latest rates from Frankfurter API
        const response = await axios.get(API_URL)
        const { rates: r, date } = response.data

        // Prepare data to store
        rates.date = date
        rates.rates = r
        rates.rates["USD"] = 1

        // Write data to JSON file
    } catch (error) {
        console.error("Error fetching or storing rates:", error)
    }
}

export { rates }
