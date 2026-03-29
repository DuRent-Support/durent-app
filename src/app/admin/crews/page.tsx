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
import type { Crew } from "@/types";

type DynamicField = {
  key: string;
  value: string;
};

type CrewFormState = {
  name: string;
  description: string;
  price: string;
  skills: DynamicField[];
};

type ValidationResult =
  | {
      ok: true;
      payload: {
        name: string;
        description: string;
        price: number;
        skills: Record<string, string>;
      };
    }
  | { ok: false };

const emptyForm: CrewFormState = {
  name: "",
  description: "",
  price: "",
  skills: [{ key: "", value: "" }],
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

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [formData, setFormData] = useState<CrewFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Crew | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const fetchCrews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/crews", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        crews?: Crew[];
        message?: string;
      };

      if (!response.ok) {
        toast.error(result.message || "Gagal mengambil data crews.");
        setCrews([]);
        return;
      }

      setCrews(result.crews ?? []);
    } catch (error) {
      console.error("Fetch crews error:", error);
      toast.error("Terjadi kesalahan saat mengambil data crews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCrews();
  }, [fetchCrews]);

  const openAddDialog = () => {
    setEditingCrew(null);
    setFormData(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (crew: Crew) => {
    setEditingCrew(crew);
    setFormData({
      name: crew.name,
      description: crew.description,
      price: String(crew.price),
      skills: toDynamicFields(crew.skills),
    });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls(crew.images ?? []);
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

  const updateSkillField = (
    index: number,
    property: keyof DynamicField,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.map((field, idx) =>
        idx === index ? { ...field, [property]: value } : field,
      ),
    }));
    setFormErrors((prev) => ({ ...prev, skills: "" }));
  };

  const addSkillField = () => {
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { key: "", value: "" }],
    }));
  };

  const removeSkillField = (index: number) => {
    setFormData((prev) => {
      if (prev.skills.length === 1) {
        return {
          ...prev,
          skills: [{ key: "", value: "" }],
        };
      }

      return {
        ...prev,
        skills: prev.skills.filter((_, idx) => idx !== index),
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

    const filledSkills = formData.skills.filter(
      (field) => field.key.trim() || field.value.trim(),
    );

    if (filledSkills.length === 0) {
      errors.skills = "Minimal isi 1 skill.";
    }

    const hasIncompleteSkill = filledSkills.some(
      (field) => !field.key.trim() || !field.value.trim(),
    );

    if (hasIncompleteSkill) {
      errors.skills = "Setiap skill harus punya nama field dan value.";
    }

    if (existingImageUrls.length + imageFiles.length === 0) {
      errors.images = "Minimal upload 1 gambar.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return { ok: false };
    }

    const skillsObject: Record<string, string> = {};
    filledSkills.forEach((field) => {
      skillsObject[field.key.trim()] = field.value.trim();
    });

    return {
      ok: true,
      payload: {
        name,
        description,
        price,
        skills: skillsObject,
      },
    };
  };

  const saveCrew = async () => {
    const validation = validateForm();
    if (!validation.ok) return;

    try {
      setSaving(true);

      const payload = new FormData();
      payload.append("name", validation.payload.name);
      payload.append("description", validation.payload.description);
      payload.append("price", validation.payload.price.toString());
      payload.append("skills", JSON.stringify(validation.payload.skills));

      if (editingCrew) {
        payload.append("existingImageUrls", JSON.stringify(existingImageUrls));
      }

      imageFiles.forEach((file, index) => {
        payload.append(`image_${index}`, file);
      });

      const response = await fetch(
        editingCrew ? `/api/admin/crews/${editingCrew.crew_id}` : "/api/admin/crews",
        {
          method: editingCrew ? "PUT" : "POST",
          body: payload,
        },
      );

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(
          result.message ||
            (editingCrew
              ? "Gagal mengupdate crew."
              : "Gagal menambahkan crew."),
        );
        return;
      }

      toast.success(
        editingCrew ? "Crew berhasil diupdate." : "Crew berhasil ditambahkan.",
      );

      await fetchCrews();
      setDialogOpen(false);
    } catch (error) {
      console.error("Save crew error:", error);
      toast.error("Terjadi kesalahan saat menyimpan crew.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCrew = async (crew: Crew) => {
    try {
      const response = await fetch(`/api/admin/crews/${crew.crew_id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(result.message || "Gagal menghapus crew.");
        return;
      }

      toast.success("Crew berhasil dihapus.");
      await fetchCrews();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Delete crew error:", error);
      toast.error("Terjadi kesalahan saat menghapus crew.");
    }
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Crews
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus data crew produksi.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{crews.length} crew</span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Crew
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">Skills</TableHead>
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
              ) : crews.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada data crew. Klik &quot;Tambah Crew&quot; untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                crews.map((crew) => (
                  <TableRow key={crew.crew_id} className="border-border/50">
                    <TableCell>
                      {crew.images.length > 0 ? (
                        <Image
                          src={crew.images[0]}
                          alt={crew.name}
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
                    <TableCell className="font-medium text-foreground">{crew.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatPrice(crew.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {summarizeJson(crew.skills)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(crew)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(crew)}
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
              {editingCrew ? "Edit Crew" : "Tambah Crew"}
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
                placeholder="Contoh: Camera Crew A"
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
                placeholder="Deskripsi singkat crew"
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
                placeholder="1500000"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>
                  Skills <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addSkillField}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Field
                </Button>
              </div>

              {formErrors.skills && (
                <p className="text-xs text-destructive">{formErrors.skills}</p>
              )}

              <div className="space-y-2">
                {formData.skills.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      value={field.key}
                      onChange={(event) =>
                        updateSkillField(index, "key", event.target.value)
                      }
                      placeholder="Field (contoh: camera)"
                    />
                    <Input
                      value={field.value}
                      onChange={(event) =>
                        updateSkillField(index, "value", event.target.value)
                      }
                      placeholder="Value (contoh: advanced)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => removeSkillField(index)}
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
            <Button onClick={saveCrew} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : editingCrew ? (
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
            <DialogTitle className="font-display">Hapus Crew?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Data crew akan dihapus permanen. Perubahan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteCrew(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
