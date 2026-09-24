import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_secret_key_for_development_only_12345"
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if user exists
      const checkResult = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (checkResult.rows.length > 0) {
        return NextResponse.json(
          { error: "User already exists with this email" },
          { status: 409 }
        );
      }

      // Hash password and insert
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await client.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
        [name, email, hashedPassword]
      );
      
      const userId = result.rows[0].id;
      
      // Create JWT token
      const token = await new SignJWT({ userId, email, name, role: "user" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET);

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.json({ success: true, message: "Account created successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
