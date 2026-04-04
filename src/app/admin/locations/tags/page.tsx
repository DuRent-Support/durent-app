"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LocationTagItem = {
  id: string;
  name: string;
  locations: number;
};

const ENDPOINT = "/api/admin/locations/tags";

export default function AdminLocationsTagsPage() {
  const [records, setRecords] = useState<LocationTagItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LocationTagItem | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<LocationTagItem | null>(
    null,
  );
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINT, {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        items?: LocationTagItem[];
        message?: string;
      };

      if (!response.ok) {
        toast.error(result.message || "Gagal mengambil data.");
        setRecords([]);
        return;
      }

      setRecords(
        (result.items ?? []).map((item) => ({
          ...item,
          locations: Number(item.locations ?? 0),
        })),
      );
    } catch (error) {
      console.error("Fetch location tags error:", error);
      toast.error("Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const openAddDialog = () => {
    setEditingRecord(null);
    setName("");
    setDialogOpen(true);
  };

  const openEditDialog = (item: LocationTagItem) => {
    setEditingRecord(item);
    setName(item.name);
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast.error("Name wajib diisi.");
      return false;
    }

    return true;
  };

  const requestSave = () => {
    if (!validateForm()) {
      return;
    }

    if (editingRecord) {
      setSaveConfirmOpen(true);
      return;
    }

    void saveRecord();
  };

  const saveRecord = async () => {
    try {
      setSaving(true);

      const response = await fetch(
        editingRecord ? `${ENDPOINT}/${editingRecord.id}` : ENDPOINT,
        {
          method: editingRecord ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        },
      );

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(
          result.message ||
            (editingRecord
              ? "Gagal mengupdate location tag."
              : "Gagal menambahkan location tag."),
        );
        return;
      }

      toast.success(
        editingRecord
          ? "Location tag berhasil diupdate."
          : "Location tag berhasil ditambahkan.",
      );

      setSaveConfirmOpen(false);
      setDialogOpen(false);
      await fetchRecords();
    } catch (error) {
      console.error("Save location tag error:", error);
      toast.error("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (item: LocationTagItem) => {
    try {
      const response = await fetch(`${ENDPOINT}/${item.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(result.message || "Gagal menghapus location tag.");
        return;
      }

      toast.success("Location tag berhasil dihapus.");
      setDeleteConfirm(null);
      await fetchRecords();
    } catch (error) {
      console.error("Delete location tag error:", error);
      toast.error("Terjadi kesalahan saat menghapus data.");
    }
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Location Tags
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus tag lokasi untuk mempermudah pengelompokan
            lokasi.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {records.length} data
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Tag
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada data. Klik &quot;Tambah Tag&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.locations}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSaveConfirmOpen(false);
          }
        }}
      >
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRecord ? "Edit Tag" : "Tambah Tag"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masukkan nama tag"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={requestSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRecord ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent className="border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              Simpan Perubahan?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to save your changes?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={saveRecord} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Ya, Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Hapus Data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Data ini akan dihapus permanen. Perubahan ini tidak dapat
            dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && void deleteRecord(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
