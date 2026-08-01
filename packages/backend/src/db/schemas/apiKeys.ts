/* Third-party modules */
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/* Custom modules */
import { UserTable } from './user';

export const ApiKeyTable = pgTable('api_keys', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => UserTable.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  apiKeyHash: text().notNull(),
  apiKeyPrefix: varchar({ length: 8 }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
