/* Third-party modules */
import { defineRelations } from "drizzle-orm";

/* Custom modules */
import * as schemas from "./schemas";

export const relations = defineRelations(schemas)