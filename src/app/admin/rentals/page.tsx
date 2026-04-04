"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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

type RelationItem = {
  id: number;
  name: string;
  short_code?: string;
};

type RentalImageItem = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type SpecificationRow = {
  key: string;
  value: string;
};

type RentalItem = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  price: number;
  specifications: Record<string, string>;
  is_available: boolean;
  item_category_ids: number[];
  item_sub_category_ids: number[];
  item_categories: RelationItem[];
  item_sub_categories: RelationItem[];
  images: RentalImageItem[];
};

type RentalFormData = {
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  specifications: SpecificationRow[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: RentalImageItem[];
};

const emptyRental: RentalFormData = {
  name: "",
  description: "",
  price: 0,
  is_available: true,
  specifications: [{ key: "", value: "" }],
  item_category_ids: [],
  item_sub_category_ids: [],
  images: [],
};

const normalizeImages = (images?: RentalImageItem[]) =>
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

const specificationsObjectToRows = (
  specifications?: Record<string, string>,
) => {
  const rows = Object.entries(specifications ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));

  return rows.length > 0 ? rows : [{ key: "", value: "" }];
};

const specificationsRowsToPayload = (rows: SpecificationRow[]) =>
  rows
    .map((row) => ({
      key: String(row.key ?? "").trim(),
      value: String(row.value ?? "").trim(),
    }))
    .filter((row) => row.key.length > 0);

export default function RentalsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(
    null,
  );
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [availableItemCategories, setAvailableItemCategories] = useState<
    RelationItem[]
  >([]);
  const [availableItemSubCategories, setAvailableItemSubCategories] = useState<
    RelationItem[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalItem | null>(null);
  const [formData, setFormData] = useState<RentalFormData>(emptyRental);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formImages = Array.isArray(formData.images) ? formData.images : [];

  const fetchRentals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/rentals", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setRentals((data.rentals || []) as RentalItem[]);
      } else {
        toast.error(data.message || "Gagal mengambil data rental");
      }
    } catch (error) {
      console.error("Fetch rentals error:", error);
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [categoryResponse, subCategoryResponse] = await Promise.all([
        fetch("/api/admin/categories", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/admin/sub-categories", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const [categoryData, subCategoryData] = await Promise.all([
        categoryResponse.json(),
        subCategoryResponse.json(),
      ]);

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
      console.error("Fetch rental options error:", error);
    }
  }, []);

  useEffect(() => {
    void fetchRentals();
    void fetchOptions();
  }, [fetchRentals, fetchOptions]);

  const openAddDialog = () => {
    setEditingRental(null);
    setFormData({
      ...emptyRental,
      images: [],
      specifications: [{ key: "", value: "" }],
    });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (rental: RentalItem) => {
    setEditingRental(rental);
    setFormData({
      name: rental.name,
      description: rental.description,
      price: rental.price,
      is_available: rental.is_available,
      specifications: specificationsObjectToRows(rental.specifications),
      item_category_ids: rental.item_category_ids,
      item_sub_category_ids: rental.item_sub_category_ids,
      images: normalizeImages(rental.images ?? []),
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
    if (formData.item_category_ids.length === 0)
      errors.item_category_ids = "Pilih 1 category";
    if (formData.item_sub_category_ids.length === 0)
      errors.item_sub_category_ids = "Pilih 1 sub category";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveRental = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price) || 0,
        is_available: formData.is_available,
        specifications: specificationsRowsToPayload(formData.specifications),
        item_category_ids: formData.item_category_ids,
        item_sub_category_ids: formData.item_sub_category_ids,
        images: normalizeImages(formData.images ?? []).map((image) => ({
          url: image.url,
          position: image.position,
        })),
      };

      if (editingRental) {
        const response = await fetch(`/api/admin/rentals/${editingRental.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Rental berhasil diupdate");
          await fetchRentals();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal mengupdate rental");
        }
      } else {
        const response = await fetch("/api/admin/rentals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Rental berhasil ditambahkan");
          await fetchRentals();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal menambahkan rental");
        }
      }
    } catch (error) {
      console.error("Save rental error:", error);
      toast.error("Terjadi kesalahan saat menyimpan rental");
    } finally {
      setSaving(false);
    }
  };

  const deleteRental = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/rentals/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Rental berhasil dihapus");
        await fetchRentals();
        setDeleteConfirm(null);
      } else {
        toast.error(data.message || "Gagal menghapus rental");
      }
    } catch (error) {
      console.error("Delete rental error:", error);
      toast.error("Terjadi kesalahan saat menghapus rental");
    }
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

  const addSpecificationRow = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }));
  };

  const removeSpecificationRow = (index: number) => {
    setFormData((prev) => {
      if (prev.specifications.length <= 1) {
        return {
          ...prev,
          specifications: [{ key: "", value: "" }],
        };
      }

      return {
        ...prev,
        specifications: prev.specifications.filter((_, i) => i !== index),
      };
    });
  };

  const updateSpecificationRow = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
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

      const response = await fetch("/api/admin/rentals/images/upload", {
        method: "POST",
        body: uploadForm,
      });
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
      console.error("Upload rental image error:", error);
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
            Kelola Rentals
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus rental beserta specifications, category,
            dan sub category.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {rentals.length} rental
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Rental
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Specifications
                </TableHead>
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
              ) : rentals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada data rental. Klik &quot;Tambah Rental&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                rentals.map((rental) => (
                  <TableRow key={rental.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rental.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {rental.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatPrice(rental.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {Object.keys(rental.specifications ?? {}).length} field
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {rental.is_available ? "Available" : "Unavailable"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(rental)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(rental.id)}
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
        <DialogContent className="border-border sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRental ? "Edit Rental" : "Tambah Rental"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nama <span className="text-destructive">*</span>
              </Label>
              {formErrors.name && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.name}
                </p>
              )}
              <Input
                value={formData.name}
                onChange={(event) => {
                  setFormData((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Contoh: Camera Package A"
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
                rows={3}
                value={formData.description}
                onChange={(event) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Deskripsi singkat rental"
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
                step={1}
                value={formData.price}
                onChange={(event) => {
                  setFormData((prev) => ({
                    ...prev,
                    price: Number(event.target.value) || 0,
                  }));
                  setFormErrors((prev) => ({ ...prev, price: "" }));
                }}
                placeholder="500000"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
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

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Specifications (Key-Value)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSpecificationRow}
                >
                  <Plus className="h-4 w-4 mr-1" /> Tambah Field
                </Button>
              </div>
              <div className="grid gap-2">
                {formData.specifications.map((spec, index) => (
                  <div
                    key={`spec-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <Input
                      value={spec.key}
                      onChange={(e) =>
                        updateSpecificationRow(index, "key", e.target.value)
                      }
                      placeholder="Key (contoh: focal_length)"
                    />
                    <Input
                      value={spec.value}
                      onChange={(e) =>
                        updateSpecificationRow(index, "value", e.target.value)
                      }
                      placeholder="Value (contoh: 24-70mm)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => removeSpecificationRow(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>
                Item Category <span className="text-destructive">*</span>
              </Label>
              {formErrors.item_category_ids && (
                <p className="text-xs text-destructive">
                  {formErrors.item_category_ids}
                </p>
              )}
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
              <Label>
                Item Sub Category <span className="text-destructive">*</span>
              </Label>
              {formErrors.item_sub_category_ids && (
                <p className="text-xs text-destructive">
                  {formErrors.item_sub_category_ids}
                </p>
              )}
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
              <Label>Gambar Rental</Label>
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
            <Button onClick={saveRental} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : editingRental ? (
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
            <DialogTitle className="font-display">Hapus Rental?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Data rental akan dihapus permanen. Perubahan ini tidak dapat
            dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteRental(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
