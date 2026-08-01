/* Third-party modules */
import { defineRelations } from 'drizzle-orm';

/* Custom modules */
import * as schemas from './schemas';

export const relations = defineRelations(schemas, (relation) => ({
  ApiKeyTable: {
    user: relation.one.UserTable({
      from: relation.ApiKeyTable.userId,
      to: relation.UserTable.id,
    }),
  },
  UserTable: {
    apiKeys: relation.many.ApiKeyTable(),
  },
}));
