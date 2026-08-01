/* Built-in modules */
import "dotenv/config";

/* Third-party modules */
import { defineConfig } from "drizzle-kit";

/* Custom modules */
import { env } from "@/env";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schemas.ts",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    user: env.DB_USER,
    host: env.DB_HOST,
    port: env.DB_PORT,
    ssl: false,
  },
});
