import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const acceptLanguage = req.headers.get("accept-language") ?? "";
    const lang = acceptLanguage.toLowerCase().includes("ko") ? "ko" : "en";
    return NextResponse.redirect(new URL(`/${lang}`, req.url));
  }
}

export const config = {
  matcher: ["/"],
};
