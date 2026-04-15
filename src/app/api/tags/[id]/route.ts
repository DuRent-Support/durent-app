import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PUT update tag by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tag } = await request.json();
    const { id } = await params;

    // Validation
    if (!tag || !tag.trim()) {
      return NextResponse.json(
        { error: "Tag tidak boleh kosong" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check if tag with same name already exists (excluding current one)
    const { data: existingTag } = await supabase
      .from("tags")
      .select("*")
      .eq("tag", tag.trim())
      .neq("id", id)
      .single();

    if (existingTag) {
      return NextResponse.json({ error: "Tag sudah ada" }, { status: 400 });
    }

    // Update tag
    const { data, error } = await supabase
      .from("tags")
      .update({ tag: tag.trim() })
      .eq("tag_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Tag berhasil diupdate", tag: data },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update tag error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupdate tag" },
      { status: 500 },
    );
  }
}

// DELETE tag by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase.from("tags").delete().eq("tag_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Tag berhasil dihapus" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus tag" },
      { status: 500 },
    );
  }
}
