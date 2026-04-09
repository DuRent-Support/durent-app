"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import SingleRelationSelector from "@/components/admin/SingleRelationSelector";
import ImageUploadCards from "@/components/admin/ImageUploadCards";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import formatPrice from "@/lib/formatPrice";

type RelationItem = {
  id: number;
  name: string;
  short_code?: string;
};

type LocationImageItem = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type LocationItem = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
  is_available: boolean;
  rating: number;
  updated_at?: string;
  tags: RelationItem[];
  item_categories: RelationItem[];
  item_sub_categories: RelationItem[];
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: LocationImageItem[];
};

type LocationFormData = {
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
  is_available: boolean;
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: LocationImageItem[];
};

const emptyLocation: LocationFormData = {
  name: "",
  description: "",
  city: "",
  price: 0,
  area: 0,
  pax: 0,
  is_available: true,
  tag_ids: [],
  item_category_ids: [],
  item_sub_category_ids: [],
  images: [],
};

const normalizeImages = (images?: LocationImageItem[]) =>
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

export default function AdminLocationsPage() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(
    null,
  );
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [availableTags, setAvailableTags] = useState<RelationItem[]>([]);
  const [availableItemCategories, setAvailableItemCategories] = useState<
    RelationItem[]
  >([]);
  const [availableItemSubCategories, setAvailableItemSubCategories] = useState<
    RelationItem[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(
    null,
  );
  const [formData, setFormData] = useState<LocationFormData>(emptyLocation);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc" | "status-asc" | "status-desc"
  >("default");
  const formImages = Array.isArray(formData.images) ? formData.images : [];

  const visibleLocations = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = keyword
      ? locations.filter((item) => {
          const code = String(item.code ?? "").toLowerCase();
          const name = String(item.name ?? "").toLowerCase();
          return code.includes(keyword) || name.includes(keyword);
        })
      : [...locations];

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "status-asc":
        filtered.sort(
          (a, b) => Number(a.is_available) - Number(b.is_available),
        );
        break;
      case "status-desc":
        filtered.sort(
          (a, b) => Number(b.is_available) - Number(a.is_available),
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [locations, searchQuery, sortBy]);

  // Fetch locations from API
  useEffect(() => {
    const fromCode = searchParams.get("code")?.trim() ?? "";
    const fromSearch = searchParams.get("search")?.trim() ?? "";
    const initialKeyword = fromCode || fromSearch;
    if (initialKeyword) {
      setSearchQuery(initialKeyword);
    }
  }, [searchParams]);
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/locations", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setLocations((data.items || []) as LocationItem[]);
      } else {
        toast.error(data.message || "Gagal mengambil data lokasi");
      }
    } catch (error) {
      console.error("Fetch locations error:", error);
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch relation options from API
  const fetchOptions = useCallback(async () => {
    try {
      const [tagResponse, categoryResponse, subCategoryResponse] =
        await Promise.all([
          fetch("/api/admin/locations/tags", {
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
          ((tagData.items ?? []) as Array<{ id: string; name: string }>).map(
            (item) => ({ id: Number(item.id), name: item.name }),
          ),
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
      console.error("Fetch location options error:", error);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
    void fetchOptions();
  }, [fetchLocations, fetchOptions]);

  // Open dialog for adding new location
  const openAddDialog = () => {
    setEditingLocation(null);
    setFormData({ ...emptyLocation, images: [] });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Open dialog for editing location
  const openEditDialog = (location: LocationItem) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description,
      city: location.city,
      price: location.price,
      area: location.area,
      pax: location.pax,
      is_available: location.is_available,
      tag_ids: location.tag_ids,
      item_category_ids: location.item_category_ids,
      item_sub_category_ids: location.item_sub_category_ids,
      images: normalizeImages(location.images ?? []),
    });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!String(formData.name ?? "").trim()) errors.name = "Wajib diisi";
    if (!String(formData.description ?? "").trim())
      errors.description = "Wajib diisi";
    if (!String(formData.city ?? "").trim()) errors.city = "Wajib diisi";
    if (Number(formData.price) < 0) errors.price = "Wajib diisi";
    if (Number(formData.area) < 0) errors.area = "Wajib diisi";
    if (Number(formData.pax) < 0) errors.pax = "Wajib diisi";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const fieldOrder = [
        "name",
        "description",
        "city",
        "price",
        "area",
        "pax",
      ];
      const firstError = fieldOrder.find((f) => errors[f]);
      if (firstError) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstError}`);
          if (!el) return;
          // Scroll the dialog's internal scrollable container, not the window
          let parent = el.parentElement;
          while (parent) {
            if (parent.scrollHeight > parent.clientHeight + 1) {
              const offset =
                el.getBoundingClientRect().top -
                parent.getBoundingClientRect().top +
                parent.scrollTop -
                80;
              parent.scrollTo({ top: offset, behavior: "smooth" });
              break;
            }
            parent = parent.parentElement;
          }
          el.focus();
        }, 50);
      }
    }
    return Object.keys(errors).length === 0;
  };

  // Save location (add or edit)
  const saveLocation = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        city: formData.city,
        price: Number(formData.price) || 0,
        area: Number(formData.area) || 0,
        pax: Number(formData.pax) || 0,
        is_available: formData.is_available,
        tag_ids: formData.tag_ids,
        item_category_ids: formData.item_category_ids,
        item_sub_category_ids: formData.item_sub_category_ids,
        images: normalizeImages(formData.images ?? []).map((image) => ({
          url: image.url,
          position: image.position,
        })),
      };

      if (editingLocation) {
        const response = await fetch(
          `/api/admin/locations/${editingLocation.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();

        if (response.ok) {
          toast.success("Lokasi berhasil diupdate");
          await fetchLocations();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal mengupdate lokasi");
        }
      } else {
        const response = await fetch("/api/admin/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Lokasi berhasil ditambahkan");
          await fetchLocations();
          setDialogOpen(false);
        } else {
          toast.error(data.message || "Gagal menambahkan lokasi");
        }
      }
    } catch (error) {
      console.error("Save location error:", error);
      toast.error("Terjadi kesalahan saat menyimpan lokasi");
    } finally {
      setSaving(false);
    }
  };

  // Delete location
  const deleteLocation = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/locations/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Lokasi berhasil dihapus");
        await fetchLocations();
        setDeleteConfirm(null);
      } else {
        toast.error(data.message || "Gagal menghapus lokasi");
      }
    } catch (error) {
      console.error("Delete location error:", error);
      toast.error("Terjadi kesalahan saat menghapus lokasi");
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

  const handleImageFileChange = async (file: File) => {
    try {
      setUploadingImage(true);
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const response = await fetch("/api/admin/locations/images/upload", {
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
            Kelola Lokasi
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus lokasi beserta relasi tag, kategori, dan
            sub kategori.
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {visibleLocations.length} dari {locations.length} lokasi
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Lokasi
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            placeholder="Cari berdasarkan nama atau code"
            className="sm:max-w-sm"
          />
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | "default"
                  | "price-asc"
                  | "price-desc"
                  | "status-asc"
                  | "status-desc",
              )
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="default">Urutkan: Default</option>
            <option value="price-asc">Harga: Termurah</option>
            <option value="price-desc">Harga: Termahal</option>
            <option value="status-desc">Status: Available dulu</option>
            <option value="status-asc">Status: Unavailable dulu</option>
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Kota</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">Tag</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : visibleLocations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    {searchQuery.trim()
                      ? "Tidak ada data yang cocok dengan pencarian."
                      : 'Belum ada lokasi. Klik "Tambah Lokasi" untuk menambahkan.'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleLocations.map((loc) => (
                  <TableRow key={loc.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {loc.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {loc.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {loc.city}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatPrice(loc.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {loc.tags.map((tag) => (
                          <Badge
                            key={`${loc.id}-${tag.id}`}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {loc.is_available ? "Available" : "Unavailable"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(loc)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(loc.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingLocation ? "Edit Lokasi" : "Tambah Lokasi"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nama Lokasi <span className="text-destructive">*</span>
              </Label>
              {formErrors.name && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.name}
                </p>
              )}
              <Input
                id="field-name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData((p) => ({
                    ...p,
                    name: e.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Contoh: Skyline Rooftop Terrace"
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
                id="field-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setFormData((p) => ({
                    ...p,
                    description: e.target.value,
                  }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Deskripsi lokasi..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>
                  Kota <span className="text-destructive">*</span>
                </Label>
                {formErrors.city && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.city}
                  </p>
                )}
                <Input
                  id="field-city"
                  value={formData.city}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      city: e.target.value,
                    }));
                    setFormErrors((prev) => ({ ...prev, city: "" }));
                  }}
                  placeholder="Jakarta Selatan"
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
                  id="field-price"
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
                  placeholder="5000000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>
                  Area (m²) <span className="text-destructive">*</span>
                </Label>
                {formErrors.area && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.area}
                  </p>
                )}
                <Input
                  id="field-area"
                  type="number"
                  min={0}
                  value={formData.area || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      area: Number(e.target.value) || 0,
                    }));
                    setFormErrors((prev) => ({ ...prev, area: "" }));
                  }}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Kapasitas (orang) <span className="text-destructive">*</span>
                </Label>
                {formErrors.pax && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.pax}
                  </p>
                )}
                <Input
                  id="field-pax"
                  type="number"
                  min={0}
                  value={formData.pax || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      pax: Number(e.target.value) || 0,
                    }));
                    setFormErrors((prev) => ({ ...prev, pax: "" }));
                  }}
                  placeholder="50"
                />
              </div>
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
              <Label>Tag</Label>
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

            <SingleRelationSelector
              label="Item Categories"
              options={availableItemCategories}
              selectedIds={formData.item_category_ids}
              onSelect={(value) =>
                selectSingleRelation("item_category_ids", value)
              }
            />

            <SingleRelationSelector
              label="Item Sub Categories"
              options={availableItemSubCategories}
              selectedIds={formData.item_sub_category_ids}
              onSelect={(value) =>
                selectSingleRelation("item_sub_category_ids", value)
              }
            />

            <ImageUploadCards
              label="Gambar Lokasi"
              fileInputRef={fileInputRef}
              images={formImages}
              uploading={uploadingImage}
              onFileChangeAction={handleImageFileChange}
              onPickImageAction={openImagePicker}
              onRemoveImageAction={removeImageCard}
              onUpdateOrderAction={updateImageOrder}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={saveLocation} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : editingLocation ? (
                "Simpan"
              ) : (
                "Tambah"
              )}
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
            <DialogTitle className="font-display">Hapus Lokasi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Lokasi ini akan dihapus dari katalog. Perubahan ini tidak dapat
            dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteLocation(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
