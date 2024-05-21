import {
    integer,
    numeric,
    pgEnum,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { sharedColumns } from "./shared"
import { OmitDefaultsFromType } from "lib/utils"
import { and, eq, relations } from "drizzle-orm"
import { db } from "db/connect"

export const payment = pgTable("payment", {
    ...sharedColumns,
    symbol: varchar("symbol").notNull(),
    name: varchar("name").notNull().unique(),
    symbolNative: varchar("symbol_native").notNull(),
    decimalDigits: integer("decimalDigits").notNull(),
    rounding: integer("rounding").notNull(),
    code: varchar("code", { length: 3 }).notNull().unique(),
    namePlural: varchar("name_plural").notNull(),
})
