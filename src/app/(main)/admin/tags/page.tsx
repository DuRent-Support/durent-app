"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tag } from "@/types/tag";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tags");
      const data = await response.json();

      if (response.ok) {
        //  / Debug: check tag structure
        setTags(data.tags || []);
      } else {
        toast.error(data.error || "Gagal mengambil data tags");
      }
    } catch (error) {
      console.error("Fetch tags error:", error);
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Open dialog for adding new tag
  const openAddDialog = () => {
    setEditingTag(null);
    setFormData("");
    setDialogOpen(true);
  };

  // Open dialog for editing tag
  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setFormData(tag.tag);
    setDialogOpen(true);
  };

  // Save tag (add or edit)
  const saveTag = async () => {
    const trimmedTag = formData.trim();
    if (!trimmedTag) {
      toast.error("Tag tidak boleh kosong");
      return;
    }

    try {
      setSaving(true);

      if (editingTag) {
        const response = await fetch(`/api/tags/${editingTag.tag_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: trimmedTag }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Tag berhasil diupdate");
          await fetchTags();
          setDialogOpen(false);
        } else {
          toast.error(data.error || "Gagal mengupdate tag");
        }
      } else {
        // Add new tag
        const response = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: trimmedTag }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Tag berhasil ditambahkan");
          await fetchTags();
          setDialogOpen(false);
        } else {
          toast.error(data.error || "Gagal menambahkan tag");
        }
      }
    } catch (error) {
      console.error("Save tag error:", error);
      toast.error("Terjadi kesalahan saat menyimpan tag");
    } finally {
      setSaving(false);
    }
  };

  // Delete tag
  const deleteTag = async (tag: Tag) => {
    try {
      const response = await fetch(`/api/tags/${tag.tag_id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Tag berhasil dihapus");
        await fetchTags();
        setDeleteConfirm(null);
      } else {
        toast.error(data.error || "Gagal menghapus tag");
      }
    } catch (error) {
      console.error("Delete tag error:", error);
      toast.error("Terjadi kesalahan saat menghapus tag");
    }
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Tag
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus tag untuk lokasi.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {tags.length} tag
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Tag
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada tag. Klik &quot;Tambah Tag&quot; untuk membuat tag baru.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.tag_id}
                  className="group flex items-center gap-2 rounded-lg bg-secondary/80 px-4 py-2.5 transition-colors hover:bg-secondary"
                >
                  <span className="text-sm font-medium text-foreground">
                    {tag.tag}
                  </span>
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEditDialog(tag)}
                      className="rounded p-1 hover:bg-accent"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tag)}
                      className="rounded p-1 hover:bg-destructive/20"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTag ? "Edit Tag" : "Tambah Tag"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nama Tag</Label>
              <Input
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                placeholder="Contoh: Vintage"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTag();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={saveTag} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTag ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Hapus Tag?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tag ini akan dihapus. Perubahan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteTag(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
