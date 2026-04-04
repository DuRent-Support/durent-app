"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

type RelationItem = {
  id: number;
  name: string;
  short_code?: string;
};

type FoodAndBeverageImageItem = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type FoodAndBeverageItem = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  tags: RelationItem[];
  item_categories: RelationItem[];
  item_sub_categories: RelationItem[];
  images: FoodAndBeverageImageItem[];
};

type FoodAndBeverageFormData = {
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: FoodAndBeverageImageItem[];
};

const emptyFoodAndBeverage: FoodAndBeverageFormData = {
  name: "",
  description: "",
  price: 0,
  is_available: true,
  tag_ids: [],
  item_category_ids: [],
  item_sub_category_ids: [],
  images: [],
};

const normalizeImages = (images?: FoodAndBeverageImageItem[]) =>
  (Array.isArray(images) ? images : [])
    .filter((image) => String(image.url ?? "").trim().length > 0)
    .map((image) => ({
      ...image,
      url: String(image.url ?? "").trim(),
      position: Math.max(1, Math.trunc(Number(image.position) || 1)),
    }))
    .sort((a, b) => a.position - b.position)
    .map((image, index) => ({
      ...image,
      position: index + 1,
    }));

export default function AdminFoodAndBeveragePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(
    null,
  );
  const [records, setRecords] = useState<FoodAndBeverageItem[]>([]);
  const [availableTags, setAvailableTags] = useState<RelationItem[]>([]);
  const [availableItemCategories, setAvailableItemCategories] = useState<
    RelationItem[]
  >([]);
  const [availableItemSubCategories, setAvailableItemSubCategories] = useState<
    RelationItem[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<FoodAndBeverageItem | null>(null);
  const [formData, setFormData] =
    useState<FoodAndBeverageFormData>(emptyFoodAndBeverage);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formImages = Array.isArray(formData.images) ? formData.images : [];

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/food-and-beverage", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setRecords((data.items || []) as FoodAndBeverageItem[]);
      } else {
        toast.error(data.message || "Gagal mengambil data food & beverage");
      }
    } catch (error) {
      console.error("Fetch food & beverage error:", error);
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [tagResponse, categoryResponse, subCategoryResponse] =
        await Promise.all([
          fetch("/api/admin/food-and-beverage/tags", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/admin/categories", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/admin/sub-categories", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      const [tagData, categoryData, subCategoryData] = await Promise.all([
        tagResponse.json(),
        categoryResponse.json(),
        subCategoryResponse.json(),
      ]);

      if (tagResponse.ok) {
        setAvailableTags(
          (
            (tagData.items ?? []) as Array<{
              id: string;
              name: string;
            }>
          ).map((item) => ({ id: Number(item.id), name: item.name })),
        );
      }

      if (categoryResponse.ok) {
        setAvailableItemCategories(
          (
            (categoryData.items ?? []) as Array<{
              id: string;
              name: string;
              short_code: string;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            short_code: item.short_code,
          })),
        );
      }

      if (subCategoryResponse.ok) {
        setAvailableItemSubCategories(
          (
            (subCategoryData.items ?? []) as Array<{
              id: string;
              name: string;
              short_code: string;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            short_code: item.short_code,
          })),
        );
      }
    } catch (error) {
      console.error("Fetch food & beverage options error:", error);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
    void fetchOptions();
  }, [fetchRecords, fetchOptions]);

  const openAddDialog = () => {
    setEditingRecord(null);
    setFormData({ ...emptyFoodAndBeverage, images: [] });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (item: FoodAndBeverageItem) => {
    setEditingRecord(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      is_available: item.is_available,
      tag_ids: item.tag_ids,
      item_category_ids: item.item_category_ids,
      item_sub_category_ids: item.item_sub_category_ids,
      images: normalizeImages(item.images ?? []),
    });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!String(formData.name ?? "").trim()) errors.name = "Wajib diisi";
    if (!String(formData.description ?? "").trim())
      errors.description = "Wajib diisi";
    if (Number(formData.price) < 0) errors.price = "Wajib diisi";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveRecord = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price) || 0,
        is_available: formData.is_available,
        tag_ids: formData.tag_ids,
        item_category_ids: formData.item_category_ids,
        item_sub_category_ids: formData.item_sub_category_ids,
        images: normalizeImages(formData.images ?? []).map((image) => ({
          url: image.url,
          position: image.position,
        })),
      };

      if (editingRecord) {
        const response = await fetch(
          `/api/admin/food-and-beverage/${editingRecord.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();

        if (response.ok) {
          toast.success("Food & beverage berhasil diupdate");
          await fetchRecords();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal mengupdate food & beverage");
        }
      } else {
        const response = await fetch("/api/admin/food-and-beverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Food & beverage berhasil ditambahkan");
          await fetchRecords();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal menambahkan food & beverage");
        }
      }
    } catch (error) {
      console.error("Save food & beverage error:", error);
      toast.error("Terjadi kesalahan saat menyimpan food & beverage");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/food-and-beverage/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Food & beverage berhasil dihapus");
        await fetchRecords();
        setDeleteConfirm(null);
      } else {
        toast.error(data.message || "Gagal menghapus food & beverage");
      }
    } catch (error) {
      console.error("Delete food & beverage error:", error);
      toast.error("Terjadi kesalahan saat menghapus food & beverage");
    }
  };

  const toggleMultiSelect = (key: "tag_ids", value: number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const selectSingleRelation = (
    key: "item_category_ids" | "item_sub_category_ids",
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: [value],
    }));
  };

  const openImagePicker = (index: number | null) => {
    setPendingImageIndex(index);
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setUploadingImage(true);
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const response = await fetch(
        "/api/admin/food-and-beverage/images/upload",
        {
          method: "POST",
          body: uploadForm,
        },
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Gagal upload gambar");
        return;
      }

      const imagePath = String(data.path ?? "");
      const signedUrl = String(data.signed_url ?? "");
      if (!imagePath) {
        toast.error("Path gambar tidak valid");
        return;
      }

      setFormData((prev) => {
        const currentImages = Array.isArray(prev.images)
          ? [...prev.images]
          : [];

        if (pendingImageIndex === null) {
          currentImages.push({
            url: imagePath,
            preview_url: signedUrl || null,
            position: currentImages.length + 1,
          });
        } else {
          const safeIndex = Math.max(
            0,
            Math.min(pendingImageIndex, Math.max(currentImages.length - 1, 0)),
          );

          if (currentImages.length === 0) {
            currentImages.push({
              url: imagePath,
              preview_url: signedUrl || null,
              position: 1,
            });
          } else {
            currentImages[safeIndex] = {
              ...currentImages[safeIndex],
              url: imagePath,
              preview_url: signedUrl || null,
            };
          }
        }

        return {
          ...prev,
          images: currentImages.map((image, index) => ({
            ...image,
            position: index + 1,
          })),
        };
      });

      toast.success("Gambar berhasil diupload");
    } catch (error) {
      console.error("Upload image error:", error);
      toast.error("Terjadi kesalahan saat upload gambar");
    } finally {
      setUploadingImage(false);
      setPendingImageIndex(null);
    }
  };

  const removeImageCard = (index: number) => {
    setFormData((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      const nextImages = currentImages.filter(
        (_, current) => current !== index,
      );
      return {
        ...prev,
        images: nextImages.map((image, imageIndex) => ({
          ...image,
          position: imageIndex + 1,
        })),
      };
    });
  };

  const updateImageOrder = (index: number, nextPosition: number) => {
    setFormData((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      if (currentImages.length <= 1) return { ...prev, images: currentImages };

      const boundedPosition = Math.min(
        Math.max(1, Math.trunc(nextPosition || 1)),
        currentImages.length,
      );
      const targetIndex = boundedPosition - 1;
      if (targetIndex === index) {
        return {
          ...prev,
          images: currentImages.map((image, imageIndex) => ({
            ...image,
            position: imageIndex + 1,
          })),
        };
      }

      const nextImages = [...currentImages];
      const [moved] = nextImages.splice(index, 1);
      nextImages.splice(targetIndex, 0, moved);

      return {
        ...prev,
        images: nextImages.map((image, imageIndex) => ({
          ...image,
          position: imageIndex + 1,
        })),
      };
    });
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Food & Beverage
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus item beserta relasi tag, kategori, sub
            kategori, dan gambar.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {records.length} item
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Item
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">Tag</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada item. Klik &quot;Tambah Item&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatPrice(item.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge
                            key={`${item.id}-${tag.id}`}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {item.is_available ? "Available" : "Unavailable"}
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
                          onClick={() => setDeleteConfirm(item.id)}
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
              {editingRecord
                ? "Edit Food & Beverage"
                : "Tambah Food & Beverage"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nama Item <span className="text-destructive">*</span>
              </Label>
              {formErrors.name && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.name}
                </p>
              )}
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData((p) => ({
                    ...p,
                    name: e.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Contoh: Catering Premium"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              {formErrors.description && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.description}
                </p>
              )}
              <Textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setFormData((p) => ({
                    ...p,
                    description: e.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Deskripsi item food & beverage..."
                rows={3}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>
                Harga <span className="text-destructive">*</span>
              </Label>
              {formErrors.price && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.price}
                </p>
              )}
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData((p) => ({
                    ...p,
                    price: Number(e.target.value) || 0,
                  }));
                  setFormErrors((prev) => ({ ...prev, price: "" }));
                }}
                placeholder="250000"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Status Ketersediaan</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.is_available ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, is_available: true }))
                  }
                >
                  Available
                </Button>
                <Button
                  type="button"
                  variant={!formData.is_available ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, is_available: false }))
                  }
                >
                  Unavailable
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleMultiSelect("tag_ids", Number(tag.id))}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      formData.tag_ids.includes(Number(tag.id))
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Item Categories</Label>
              <div className="flex flex-wrap gap-2">
                {availableItemCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      selectSingleRelation("item_category_ids", Number(item.id))
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      formData.item_category_ids.includes(Number(item.id))
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Item Sub Categories</Label>
              <div className="flex flex-wrap gap-2">
                {availableItemSubCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      selectSingleRelation(
                        "item_sub_category_ids",
                        Number(item.id),
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      formData.item_sub_category_ids.includes(Number(item.id))
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Gambar Food & Beverage</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {formImages.map((image, index) => (
                  <div
                    key={`${image.id ?? "new"}-${index}`}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openImagePicker(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openImagePicker(index);
                        }
                      }}
                      className="relative h-28 w-full rounded-md border border-border bg-muted cursor-pointer"
                      style={
                        image.preview_url || image.url
                          ? {
                              backgroundImage: `url(${image.preview_url || image.url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {!image.url && (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          Belum ada gambar
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImageCard(index)}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus gambar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {image.url || "Belum ada path gambar"}
                      </p>
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Order
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={Math.max(formImages.length, 1)}
                          value={image.position}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateImageOrder(index, Number(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => openImagePicker(null)}
                  disabled={uploadingImage}
                  className="rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors p-3 disabled:opacity-60"
                >
                  <div className="h-full min-h-[180px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Plus className="h-6 w-6" />
                      )}
                      <span className="text-xs font-medium">
                        {uploadingImage ? "Uploading..." : "Tambah gambar"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
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
                  Processing...
                </>
              ) : editingRecord ? (
                "Simpan"
              ) : (
                "Tambah"
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
            <DialogTitle className="font-display">
              Hapus Food & Beverage?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Item ini akan dihapus dari katalog. Perubahan ini tidak dapat
            dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteRecord(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
