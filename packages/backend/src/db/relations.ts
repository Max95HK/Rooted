/* Third-party modules */
import { defineRelations } from 'drizzle-orm';

/* Custom modules */
import * as schemas from './schemas';

export const relations = defineRelations(schemas, (relation) => ({
  RefreshTokenTable: {
    userId: relation.one.UserTable({
      from: relation.RefreshTokenTable.userId,
      to: relation.UserTable.id,
    }),
  },
  UserTable: {
    refreshToken: relation.many.RefreshTokenTable(),
  },
}));
