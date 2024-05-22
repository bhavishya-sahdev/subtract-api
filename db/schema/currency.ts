import { integer, numeric, pgTable, varchar } from "drizzle-orm/pg-core"
import { sharedColumns } from "./shared"
import { OmitDefaultsFromType } from "lib/utils"
import { and, eq, relations } from "drizzle-orm"
import { db } from "db/connect"
import { subscription } from "./subscription"
import { payment } from "./payment"

export const currency = pgTable("currency", {
    ...sharedColumns,
    symbol: varchar("symbol").notNull(),
    name: varchar("name").notNull().unique(),
    symbolNative: varchar("symbol_native").notNull(),
    decimalDigits: integer("decimalDigits").notNull(),
    rounding: numeric("rounding").notNull(),
    code: varchar("code", { length: 3 }).notNull().unique(),
    namePlural: varchar("name_plural").notNull(),
})

export const userRelations = relations(currency, ({ many }) => ({
    subscriptions: many(subscription),
    payments: many(payment),
}))

export type Currency = OmitDefaultsFromType<typeof currency.$inferSelect>
export type NewCurrency = OmitDefaultsFromType<
    typeof currency.$inferInsert,
    "uuid"
>

export const insertCurrency = async (newCurrencies: NewCurrency[]) => {
    return db.insert(currency).values(newCurrencies)
}

export const getAllCurrencies = async () => {
    return db
        .select({
            uuid: currency.uuid,
            symbol: currency.symbol,
            name: currency.name,
            symbolNative: currency.symbolNative,
            decimalDigits: currency.decimalDigits,
            rounding: currency.rounding,
            code: currency.code,
            namePlural: currency.namePlural,
        })
        .from(currency)
        .orderBy(currency.name)
}

export const findCurrencyByUuid = async (uuid: string) => {
    return await db
        .select()
        .from(currency)
        .where(and(eq(currency.uuid, uuid)))
}

export const updateCurrencyByUuid = async (
    uuid: string,
    updatedColumns: NewCurrency
) => {
    return await db
        .update(currency)
        .set(updatedColumns)
        .where(and(eq(currency.uuid, uuid)))
        .returning({ updatedCurrencyId: currency.uuid })
}

export const deleteCurrencyByUuid = async (uuid: string) => {
    return await db
        .delete(currency)
        .where(and(eq(currency.uuid, uuid)))
        .returning({ deletecurrencyId: currency.uuid })
}
