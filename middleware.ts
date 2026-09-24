import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_secret_key_for_development_only_12345"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only protect the root route ("/")
  if (pathname === "/") {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      // Redirect to login if no token is found
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      // Verify the JWT token
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      // If token is invalid or expired, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - login (login page)
     * - signup (signup page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|signup).*)',
  ],
}
