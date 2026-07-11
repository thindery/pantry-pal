/** PostgreSQL SSL — disabled for internal Docker host `pantry-pal-db`. */
export function getPgSsl(): false | { rejectUnauthorized: boolean } {
  const url = process.env.DATABASE_URL ?? "";
  if (
    url.includes("@pantry-pal-db") ||
    url.includes("@db:") ||
    url.includes("@localhost") ||
    url.includes("@127.0.0.1") ||
    process.env.DATABASE_SSL === "0"
  ) {
    return false;
  }
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }
  return false;
}