import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const query = supabase
      .from("scout_history")
      .select(
        "id, uuid, user_uuid, input_type, prompt_preview, scene_count, scenes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (user) {
      query.eq("user_uuid", user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ history: data ?? [] });
  } catch (error) {
    console.error("[Scout History] Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
