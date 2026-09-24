import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * GET /api/keys
 * Fetches the user's public key and encrypted private key backup (if present).
 * Plaintext private keys are NEVER stored on or returned by the server.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, public_key, encrypted_private_key, kdf_salt, kdf_iterations, iv, key_algorithm, created_at
       FROM user_keys
       WHERE user_id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        hasKey: false,
        key: null,
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      hasKey: true,
      id: row.id,
      keyId: row.id,
      key: {
        id: row.id,
        publicKey: row.public_key,
      },
      publicKey: row.public_key,
      encryptedPrivateKey: row.encrypted_private_key,
      kdfSalt: row.kdf_salt,
      kdfIterations: row.kdf_iterations,
      iv: row.iv,
      keyAlgorithm: row.key_algorithm,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error("Error retrieving user keys:", error);
    return NextResponse.json(
      { error: "Failed to retrieve user key data" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/keys
 * Stores the user's initial ECDSA P-256 public key and client-encrypted private key backup.
 * Enforces one key pair per user.
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      publicKey,
      encryptedPrivateKey,
      kdfSalt,
      kdfIterations,
      iv,
      keyAlgorithm = "ECDSA-P256",
    } = body;

    // Validate required fields
    if (!publicKey || !encryptedPrivateKey || !kdfSalt || !iv) {
      return NextResponse.json(
        {
          error:
            "Missing required cryptographic fields (publicKey, encryptedPrivateKey, kdfSalt, iv)",
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if user already has an established key pair
      const existing = await client.query(
        "SELECT id, public_key, created_at FROM user_keys WHERE user_id = $1",
        [user.userId]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          {
            error: "User already has an existing key pair. Re-generation is not permitted.",
            hasKey: true,
            publicKey: existing.rows[0].public_key,
          },
          { status: 409 }
        );
      }

      // Insert the new key pair backup
      const insertResult = await client.query(
        `INSERT INTO user_keys (user_id, public_key, encrypted_private_key, kdf_salt, kdf_iterations, iv, key_algorithm)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, public_key, created_at`,
        [
          user.userId,
          publicKey,
          encryptedPrivateKey,
          kdfSalt,
          kdfIterations || 100000,
          iv,
          keyAlgorithm,
        ]
      );

      const row = insertResult.rows[0];
      return NextResponse.json({
        success: true,
        message: "ECDSA key pair backup stored successfully",
        keyId: row.id,
        key: {
          id: row.id,
          publicKey: row.public_key,
        },
        publicKey: row.public_key,
        createdAt: row.created_at,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error setting up user key pair:", error);
    return NextResponse.json(
      { error: "Internal Server Error during key registration" },
      { status: 500 }
    );
  }
}
