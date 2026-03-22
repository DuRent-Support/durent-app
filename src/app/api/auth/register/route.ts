import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Registrasi email/password sudah dinonaktifkan. Gunakan Google OAuth.",
    },
    { status: 410 },
  );
}
