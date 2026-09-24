import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_secret_key_for_development_only_12345"
);

export interface AuthUser {
  userId: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Server-side helper to authenticate and extract user payload from JWT cookie
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: Number(payload.userId),
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}
