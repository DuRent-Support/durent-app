"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { LocationWithTags } from "@/types/location";

const emptyLocation: Omit<LocationWithTags, "shooting_location_id"> = {
  shooting_location_name: "",
  shooting_location_city: "",
  shooting_location_price: "",
  shooting_location_description: "",
  shooting_location_area: 0,
  shooting_location_pax: 0,
  shooting_location_rate: 0,
  shooting_location_image_url: [],
  tags: [],
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationWithTags[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<LocationWithTags | null>(null);
  const [formData, setFormData] =
    useState<Omit<LocationWithTags, "shooting_location_id">>(emptyLocation);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch locations from API
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations");
      const data = await response.json();

      if (response.ok) {
        setLocations(data.locations || []);
      } else {
        toast.error(data.error || "Gagal mengambil data lokasi");
      }
    } catch (error) {
      console.error("Fetch locations error:", error);
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();

      if (response.ok) {
        setAvailableTags(
          data.tags?.map((t: { tag_id: string; tag: string }) => t.tag) || [],
        );
      }
    } catch (error) {
      console.error("Fetch tags error:", error);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchTags();
  }, [fetchLocations, fetchTags]);

  // Handle multiple image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageFiles((prev) => [...prev, ...files]);

    // Create previews for new files
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image from list
  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      // Remove from existing URLs
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new uploads
      const newFileIndex = index - existingImageUrls.length;
      setImageFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
      setImagePreviews((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
  };

  // Open dialog for adding new location
  const openAddDialog = () => {
    setEditingLocation(null);
    setFormData(emptyLocation);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Open dialog for editing location
  const openEditDialog = (location: LocationWithTags) => {
    setEditingLocation(location);
    setFormData({
      shooting_location_name: location.shooting_location_name,
      shooting_location_city: location.shooting_location_city,
      shooting_location_price: location.shooting_location_price,
      shooting_location_description: location.shooting_location_description,
      shooting_location_area: location.shooting_location_area,
      shooting_location_pax: location.shooting_location_pax,
      shooting_location_rate: location.shooting_location_rate,
      shooting_location_image_url: location.shooting_location_image_url,
      tags: location.tags,
    });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls(location.shooting_location_image_url || []);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!String(formData.shooting_location_name ?? "").trim())
      errors.name = "Wajib diisi";
    if (!String(formData.shooting_location_description ?? "").trim())
      errors.description = "Wajib diisi";
    if (!String(formData.shooting_location_city ?? "").trim())
      errors.city = "Wajib diisi";
    if (!String(formData.shooting_location_price ?? "").trim())
      errors.price = "Wajib diisi";
    if (
      !formData.shooting_location_area ||
      formData.shooting_location_area <= 0
    )
      errors.area = "Wajib diisi";
    if (!formData.shooting_location_pax || formData.shooting_location_pax <= 0)
      errors.pax = "Wajib diisi";
    if (
      !formData.shooting_location_rate ||
      formData.shooting_location_rate <= 0
    )
      errors.rate = "Wajib diisi";
    else if (formData.shooting_location_rate > 5)
      errors.rate = "Rating maksimal 5";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const fieldOrder = [
        "name",
        "description",
        "city",
        "price",
        "area",
        "pax",
        "rate",
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
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.shooting_location_name);
      formDataToSend.append("city", formData.shooting_location_city);
      formDataToSend.append("price", formData.shooting_location_price);
      formDataToSend.append(
        "description",
        formData.shooting_location_description,
      );
      formDataToSend.append("area", formData.shooting_location_area.toString());
      formDataToSend.append("pax", formData.shooting_location_pax.toString());
      formDataToSend.append("rate", formData.shooting_location_rate.toString());
      formDataToSend.append("tags", JSON.stringify(formData.tags));

      // Add existing image URLs (for edit mode)
      if (editingLocation) {
        formDataToSend.append(
          "existingImageUrls",
          JSON.stringify(existingImageUrls),
        );
      }

      // Add new image files
      imageFiles.forEach((file, index) => {
        formDataToSend.append(`image_${index}`, file);
      });

      if (editingLocation) {
        // Update existing location
        const response = await fetch(
          `/api/locations/${editingLocation.shooting_location_id}`,
          {
            method: "PUT",
            body: formDataToSend,
          },
        );

        const data = await response.json();

        if (response.ok) {
          toast.success("Lokasi berhasil diupdate");
          await fetchLocations();
          setDialogOpen(false);
        } else {
          toast.error(data.error || "Gagal mengupdate lokasi");
        }
      } else {
        // Add new location
        const response = await fetch("/api/locations", {
          method: "POST",
          body: formDataToSend,
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Lokasi berhasil ditambahkan");
          await fetchLocations();
          setDialogOpen(false);
        } else {
          toast.error(data.error || "Gagal menambahkan lokasi");
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
  const deleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Lokasi berhasil dihapus");
        await fetchLocations();
        setDeleteConfirm(null);
      } else {
        toast.error(data.error || "Gagal menghapus lokasi");
      }
    } catch (error) {
      console.error("Delete location error:", error);
      toast.error("Terjadi kesalahan saat menghapus lokasi");
    }
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Lokasi
          </h1>
          <p className="text-muted-foreground text-sm">
            Tambah, edit, atau hapus lokasi untuk katalog.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {locations.length} lokasi
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Lokasi
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Lokasi</TableHead>
                <TableHead className="hidden sm:table-cell">Harga</TableHead>
                <TableHead className="hidden lg:table-cell">Tag</TableHead>
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
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Belum ada lokasi. Klik &quot;Tambah Lokasi&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((loc) => (
                  <TableRow
                    key={loc.shooting_location_id}
                    className="border-border/50"
                  >
                    <TableCell>
                      {loc.shooting_location_image_url &&
                      loc.shooting_location_image_url.length > 0 ? (
                        <Image
                          src={loc.shooting_location_image_url[0]}
                          alt={loc.shooting_location_name}
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
                      {loc.shooting_location_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {loc.shooting_location_city}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {loc.shooting_location_price}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {loc.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                          onClick={() =>
                            setDeleteConfirm(loc.shooting_location_id)
                          }
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
                value={formData.shooting_location_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData((p) => ({
                    ...p,
                    shooting_location_name: e.target.value,
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
                value={formData.shooting_location_description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setFormData((p) => ({
                    ...p,
                    shooting_location_description: e.target.value,
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
                  value={formData.shooting_location_city}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      shooting_location_city: e.target.value,
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
                  value={formData.shooting_location_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      shooting_location_price: e.target.value,
                    }));
                    setFormErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  placeholder="Rp 5.000.000/hari"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                  value={formData.shooting_location_area || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      shooting_location_area: parseFloat(e.target.value) || 0,
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
                  value={formData.shooting_location_pax || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData((p) => ({
                      ...p,
                      shooting_location_pax: parseInt(e.target.value) || 0,
                    }));
                    setFormErrors((prev) => ({ ...prev, pax: "" }));
                  }}
                  placeholder="50"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Rating (0-5) <span className="text-destructive">*</span>
                </Label>
                {formErrors.rate && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.rate}
                  </p>
                )}
                <Input
                  id="field-rate"
                  value={formData.shooting_location_rate || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData((p) => ({
                      ...p,
                      shooting_location_rate: val,
                    }));
                    if (val > 5) {
                      setFormErrors((prev) => ({
                        ...prev,
                        rate: "Rating maksimal 5",
                      }));
                    } else {
                      setFormErrors((prev) => ({ ...prev, rate: "" }));
                    }
                  }}
                  placeholder="4.5"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Upload Gambar (Multiple)</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* Display existing images */}
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

                {/* Display new image previews */}
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

                {/* Upload button placeholder */}
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

            <div className="grid gap-1.5">
              <Label>Tag</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      formData.tags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
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
