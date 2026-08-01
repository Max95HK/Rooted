/* Third-party modules */
import { drizzle } from "drizzle-orm/node-postgres";

/* Custom modules */
import { env } from "@/env";

import { relations } from "./relations";

export const db = drizzle({
  relations,
  connection: {
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    user: env.DB_USER,
    host: env.DB_HOST,
    port: env.DB_PORT,
  },
});
