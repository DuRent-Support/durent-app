"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import formatPrice from "@/lib/formatPrice";
import type { Equipment } from "@/types";

type DynamicField = {
  key: string;
  value: string;
};

type EquipmentFormState = {
  name: string;
  description: string;
  price: string;
  specs: DynamicField[];
};

type ValidationResult =
  | {
      ok: true;
      payload: {
        name: string;
        description: string;
        price: number;
        specs: Record<string, string>;
      };
    }
  | { ok: false };

const emptyForm: EquipmentFormState = {
  name: "",
  description: "",
  price: "",
  specs: [{ key: "", value: "" }],
};

function summarizeJson(value: unknown) {
  if (Array.isArray(value)) {
    return `Array (${value.length})`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return "{}";
    return keys.slice(0, 3).join(", ");
  }

  return "-";
}

function toDynamicFields(value: unknown): DynamicField[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [{ key: "", value: "" }];
    }

    return entries.map(([key, fieldValue]) => ({
      key,
      value:
        typeof fieldValue === "string"
          ? fieldValue
          : JSON.stringify(fieldValue ?? ""),
    }));
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.map((fieldValue, index) => ({
      key: `item_${index + 1}`,
      value:
        typeof fieldValue === "string"
          ? fieldValue
          : JSON.stringify(fieldValue ?? ""),
    }));
  }

  return [{ key: "", value: "" }];
}

export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<EquipmentFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const fetchEquipments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/equipments", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        equipments?: Equipment[];
        message?: string;
      };

      if (!response.ok) {
        toast.error(result.message || "Gagal mengambil data equipments.");
        setEquipments([]);
        return;
      }

      setEquipments(result.equipments ?? []);
    } catch (error) {
      console.error("Fetch equipments error:", error);
      toast.error("Terjadi kesalahan saat mengambil data equipments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEquipments();
  }, [fetchEquipments]);

  const openAddDialog = () => {
    setEditingEquipment(null);
    setFormData(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      name: equipment.name,
      description: equipment.description,
      price: String(equipment.price),
      specs: toDynamicFields(equipment.specs),
    });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls(equipment.images ?? []);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setImageFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const newFileIndex = index - existingImageUrls.length;
    setImageFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
    setImagePreviews((prev) => prev.filter((_, i) => i !== newFileIndex));
  };

  const updateSpecField = (
    index: number,
    property: keyof DynamicField,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.map((field, idx) =>
        idx === index ? { ...field, [property]: value } : field,
      ),
    }));
    setFormErrors((prev) => ({ ...prev, specs: "" }));
  };

  const addSpecField = () => {
    setFormData((prev) => ({
      ...prev,
      specs: [...prev.specs, { key: "", value: "" }],
    }));
  };

  const removeSpecField = (index: number) => {
    setFormData((prev) => {
      if (prev.specs.length === 1) {
        return {
          ...prev,
          specs: [{ key: "", value: "" }],
        };
      }

      return {
        ...prev,
        specs: prev.specs.filter((_, idx) => idx !== index),
      };
    });
  };

  const validateForm = (): ValidationResult => {
    const errors: Record<string, string> = {};
    const name = formData.name.trim();
    const description = formData.description.trim();
    const price = Number.parseInt(formData.price, 10);

    if (!name) {
      errors.name = "Nama wajib diisi.";
    }

    if (!description) {
      errors.description = "Deskripsi wajib diisi.";
    }

    if (!Number.isInteger(price) || price < 0) {
      errors.price = "Harga harus bilangan bulat >= 0.";
    }

    const filledSpecs = formData.specs.filter(
      (field) => field.key.trim() || field.value.trim(),
    );

    if (filledSpecs.length === 0) {
      errors.specs = "Minimal isi 1 spec.";
    }

    const hasIncompleteSpec = filledSpecs.some(
      (field) => !field.key.trim() || !field.value.trim(),
    );

    if (hasIncompleteSpec) {
      errors.specs = "Setiap spec harus punya nama field dan value.";
    }

    if (existingImageUrls.length + imageFiles.length === 0) {
      errors.images = "Minimal upload 1 gambar.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return { ok: false };
    }

    const specsObject: Record<string, string> = {};
    filledSpecs.forEach((field) => {
      specsObject[field.key.trim()] = field.value.trim();
    });

    return {
      ok: true,
      payload: {
        name,
        description,
        price,
        specs: specsObject,
      },
    };
  };

  const saveEquipment = async () => {
    const validation = validateForm();
    if (!validation.ok) return;

    try {
      setSaving(true);

      const payload = new FormData();
      payload.append("name", validation.payload.name);
      payload.append("description", validation.payload.description);
      payload.append("price", validation.payload.price.toString());
      payload.append("specs", JSON.stringify(validation.payload.specs));

      if (editingEquipment) {
        payload.append("existingImageUrls", JSON.stringify(existingImageUrls));
      }

      imageFiles.forEach((file, index) => {
        payload.append(`image_${index}`, file);
      });

      const response = await fetch(
        editingEquipment
          ? `/api/admin/equipments/${editingEquipment.equipment_id}`
          : "/api/admin/equipments",
        {
          method: editingEquipment ? "PUT" : "POST",
          body: payload,
        },
      );

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(
          result.message ||
            (editingEquipment
              ? "Gagal mengupdate equipment."
              : "Gagal menambahkan equipment."),
        );
        return;
      }

      toast.success(
        editingEquipment
          ? "Equipment berhasil diupdate."
          : "Equipment berhasil ditambahkan.",
      );

      await fetchEquipments();
      setDialogOpen(false);
    } catch (error) {
      console.error("Save equipment error:", error);
      toast.error("Terjadi kesalahan saat menyimpan equipment.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEquipment = async (equipment: Equipment) => {
    try {
      const response = await fetch(`/api/admin/equipments/${equipment.equipment_id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(result.message || "Gagal menghapus equipment.");
        return;
      }

      toast.success("Equipment berhasil dihapus.");
      await fetchEquipments();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Delete equipment error:", error);
      toast.error("Terjadi kesalahan saat menghapus equipment.");
    }
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Equipments
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus data perlengkapan shooting.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {equipments.length} equipment
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Equipment
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">Specs</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : equipments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada data equipment. Klik &quot;Tambah Equipment&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                equipments.map((equipment) => (
                  <TableRow key={equipment.equipment_id} className="border-border/50">
                    <TableCell>
                      {equipment.images.length > 0 ? (
                        <Image
                          src={equipment.images[0]}
                          alt={equipment.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {equipment.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatPrice(equipment.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {summarizeJson(equipment.specs)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(equipment)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(equipment)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEquipment ? "Edit Equipment" : "Tambah Equipment"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nama <span className="text-destructive">*</span>
              </Label>
              {formErrors.name && (
                <p className="text-xs text-destructive -mb-1">{formErrors.name}</p>
              )}
              <Input
                value={formData.name}
                onChange={(event) => {
                  setFormData((prev) => ({ ...prev, name: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Contoh: Sony FX3"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              {formErrors.description && (
                <p className="text-xs text-destructive -mb-1">{formErrors.description}</p>
              )}
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(event) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Deskripsi singkat equipment"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>
                Harga <span className="text-destructive">*</span>
              </Label>
              {formErrors.price && (
                <p className="text-xs text-destructive -mb-1">{formErrors.price}</p>
              )}
              <Input
                type="number"
                min={0}
                step={1}
                value={formData.price}
                onChange={(event) => {
                  setFormData((prev) => ({ ...prev, price: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, price: "" }));
                }}
                placeholder="750000"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>
                  Specs <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpecField}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Field
                </Button>
              </div>

              {formErrors.specs && (
                <p className="text-xs text-destructive">{formErrors.specs}</p>
              )}

              <div className="space-y-2">
                {formData.specs.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      value={field.key}
                      onChange={(event) => updateSpecField(index, "key", event.target.value)}
                      placeholder="Field (contoh: sensor)"
                    />
                    <Input
                      value={field.value}
                      onChange={(event) =>
                        updateSpecField(index, "value", event.target.value)
                      }
                      placeholder="Value (contoh: full-frame)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => removeSpecField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>
                Upload Gambar (Multiple) <span className="text-destructive">*</span>
              </Label>
              {formErrors.images && (
                <p className="text-xs text-destructive">{formErrors.images}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {existingImageUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative h-24">
                    <Image
                      src={url}
                      alt={`Existing ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 33vw, 180px"
                      className="h-24 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index, true)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {imagePreviews.map((preview, index) => (
                  <div key={`preview-${index}`} className="relative h-24">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 33vw, 180px"
                      unoptimized
                      className="h-24 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() =>
                        removeImage(existingImageUrls.length + index, false)
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <label className="relative flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer group">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                    Tambah
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={saveEquipment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : editingEquipment ? (
                "Simpan"
              ) : (
                "Tambah"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Hapus Equipment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Data equipment akan dihapus permanen. Perubahan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteEquipment(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
