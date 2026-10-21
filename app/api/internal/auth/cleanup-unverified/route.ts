import { NextResponse } from "next/server";

// Retired permanently: verification enforcement never deletes accounts.
export async function GET() {
  return NextResponse.json({ error: "This cleanup process is retired." }, { status: 410 });
}
