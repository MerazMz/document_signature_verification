import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * GET /api/users
 * Returns list of registered users to select as signers.
 */
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT u.id, u.name, u.email, (uk.id IS NOT NULL) as has_key
       FROM users u
       LEFT JOIN user_keys uk ON u.id = uk.user_id
       ORDER BY u.name ASC`
    );

    return NextResponse.json({ users: res.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  } finally {
    client.release();
  }
}
