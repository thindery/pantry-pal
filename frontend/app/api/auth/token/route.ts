import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createBearerToken,
  createBearerTokenFromSession,
} from "@/lib/auth-token";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let token = await createBearerToken(req);
  if (!token) {
    const user = session.user as { id?: string; email?: string | null };
    const userId = user.id;
    if (userId) {
      token = await createBearerTokenFromSession(userId, user.email);
    }
  }
  if (!token) {
    return NextResponse.json({ error: "Token unavailable" }, { status: 500 });
  }

  return NextResponse.json({ token });
}