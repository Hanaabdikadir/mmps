import { NextResponse } from "next/server";

/** Public email lookup removed — applicants must sign in to view progress. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Public status check was removed. Sign in with your registration email to view progress.",
      redirect: "/login",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Public status check was removed. Sign in with your registration email to view progress.",
      redirect: "/login",
    },
    { status: 410 }
  );
}
