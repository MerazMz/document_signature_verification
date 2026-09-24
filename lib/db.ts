import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set in the environment variables!");
}

// Use a global to maintain the pool across hot-reloads in development
declare global {
  var pgPool: Pool | undefined;
}

export const pool = global.pgPool || new Pool({
  connectionString,
});

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

// Function to initialize the database
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    client.release();
  }
}
