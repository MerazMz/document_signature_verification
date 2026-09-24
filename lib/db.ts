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

      CREATE TABLE IF NOT EXISTS user_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        kdf_salt TEXT NOT NULL,
        kdf_iterations INTEGER NOT NULL DEFAULT 100000,
        iv TEXT NOT NULL,
        key_algorithm VARCHAR(50) DEFAULT 'ECDSA-P256',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_data TEXT,
        document_hash VARCHAR(64) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_signers (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        signed_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_doc_signer UNIQUE (document_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS signatures (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        signer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_id INTEGER NOT NULL REFERENCES user_keys(id),
        document_hash VARCHAR(64) NOT NULL,
        signature TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'VALID',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_doc_signer_sig UNIQUE (document_id, signer_id)
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        current_hash VARCHAR(64) NOT NULL,
        sequence_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_doc_seq UNIQUE (document_id, sequence_number)
      );
    `);
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    client.release();
  }
}

let initPromise: Promise<void> | null = null;
export function ensureDbInitialized() {
  if (!initPromise && connectionString) {
    initPromise = initDb().catch((err) => {
      console.error("Failed to auto-initialize database:", err);
      initPromise = null;
    });
  }
  return initPromise;
}

// Auto-run on module load if connection string is configured
if (connectionString) {
  ensureDbInitialized();
}
