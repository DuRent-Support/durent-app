import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type RequestBody = {
  userIds?: string[];
};

type ProfileImageRow = {
  user_uuid: string;
  avatar_url: string | null;
};

export async function POST(request: Request) {
  try {
    const { userIds } = (await request.json()) as RequestBody;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const sanitizedUserIds = [
      ...new Set(
        userIds
          .map((id) => String(id || "").trim())
          .filter((id) => id.length > 0),
      ),
    ];

    if (sanitizedUserIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // Authorize only logged-in admin before accessing auth admin APIs
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_uuid", user.id)
      .single<Pick<Profile, "role">>();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data: profileImagesData, error: profileImagesError } =
      await serviceRoleClient
        .from("profiles")
        .select("user_uuid, avatar_url")
        .in("user_uuid", sanitizedUserIds);

    if (profileImagesError) {
      console.error("Profile images lookup error:", profileImagesError);
    }

    const profileImageMap = new Map(
      ((profileImagesData ?? []) as ProfileImageRow[]).map((profile) => [
        profile.user_uuid,
        profile.avatar_url,
      ]),
    );

    const users = await Promise.all(
      sanitizedUserIds.map(async (userId) => {
        const { data, error } =
          await serviceRoleClient.auth.admin.getUserById(userId);

        if (error || !data?.user) {
          return {
            user_id: userId,
            full_name: null,
            email: null,
            profile_image_url: profileImageMap.get(userId) ?? null,
          };
        }

        const metadata = (data.user.user_metadata ?? {}) as Record<
          string,
          unknown
        >;

        const fullNameCandidate =
          metadata.full_name ?? metadata.name ?? metadata.display_name;

        return {
          user_id: userId,
          full_name:
            typeof fullNameCandidate === "string"
              ? fullNameCandidate.trim() || null
              : null,
          email: data.user.email ?? null,
          profile_image_url: profileImageMap.get(userId) ?? null,
        };
      }),
    );

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Auth users lookup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data user auth" },
      { status: 500 },
    );
  }
}
