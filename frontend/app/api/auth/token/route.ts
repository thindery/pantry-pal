import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBearerToken } from "@/lib/auth-token";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await createBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Token unavailable" }, { status: 500 });
  }

  return NextResponse.json({ token });
}