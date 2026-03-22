import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Login dengan email/password sudah dinonaktifkan. Gunakan login Google OAuth.",
    },
    { status: 410 },
  );
}
