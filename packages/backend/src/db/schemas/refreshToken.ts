/* Third-party modules */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  AnyPgColumn,
  index,
} from 'drizzle-orm/pg-core';

/* Custom modules */
import { UserTable } from './user';

export const RefreshTokenTable = pgTable(
  'refresh_token',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    refreshTokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    replacedByTokenId: uuid().references((): AnyPgColumn => RefreshTokenTable.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_token_user_id_idx').on(table.userId),
  ],
);
