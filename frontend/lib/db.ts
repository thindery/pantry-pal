import "server-only";

import { Pool } from "pg";
import { getPgSsl } from "@/lib/pg-ssl";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getPgSsl(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err);
});

export default pool;