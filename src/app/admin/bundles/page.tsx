"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
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

type ItemOption = {
  id: number;
  name: string;
  price: number;
};

type BundleImage = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type BundleItemForm = {
  id: number;
  quantity: number;
  notes: string;
};

type BundleItemKey = "crews" | "rentals" | "food_and_beverages" | "expendables";

type BundleItem = {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  base_price: number;
  discount_type: string;
  discount_value: number;
  final_price: number;
  bundle_type_ids: number[];
  bundle_category_ids: number[];
  crews: Array<{ crew_id: number; quantity: number; notes: string }>;
  rentals: Array<{ rental_id: number; quantity: number; notes: string }>;
  food_and_beverages: Array<{
    food_and_beverage_id: number;
    quantity: number;
    notes: string;
  }>;
  expendables: Array<{
    expendable_id: number;
    quantity: number;
    notes: string;
  }>;
  images: BundleImage[];
};

type BundleFormData = {
  name: string;
  description: string;
  is_active: boolean;
  discount_type: "" | "percent" | "fixed";
  discount_value: number;
  bundle_type_ids: number[];
  bundle_category_ids: number[];
  crews: BundleItemForm[];
  rentals: BundleItemForm[];
  food_and_beverages: BundleItemForm[];
  expendables: BundleItemForm[];
  images: BundleImage[];
};

const emptyForm: BundleFormData = {
  name: "",
  description: "",
  is_active: true,
  discount_type: "",
  discount_value: 0,
  bundle_type_ids: [],
  bundle_category_ids: [],
  crews: [],
  rentals: [],
  food_and_beverages: [],
  expendables: [],
  images: [],
};

const normalizeImages = (images?: BundleImage[]) =>
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

export default function AdminBundlesPage() {
  const searchParams = useSearchParams();
  const crewComboboxAnchor = useComboboxAnchor();
  const rentalComboboxAnchor = useComboboxAnchor();
  const foodComboboxAnchor = useComboboxAnchor();
  const expendableComboboxAnchor = useComboboxAnchor();
  const bundleDialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(
    null,
  );
  const [records, setRecords] = useState<BundleItem[]>([]);
  const [bundleTypes, setBundleTypes] = useState<RelationItem[]>([]);
  const [bundleCategories, setBundleCategories] = useState<RelationItem[]>([]);
  const [crewOptions, setCrewOptions] = useState<ItemOption[]>([]);
  const [rentalOptions, setRentalOptions] = useState<ItemOption[]>([]);
  const [foodOptions, setFoodOptions] = useState<ItemOption[]>([]);
  const [expendableOptions, setExpendableOptions] = useState<ItemOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BundleItem | null>(null);
  const [formData, setFormData] = useState<BundleFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const formImages = Array.isArray(formData.images) ? formData.images : [];

  const visibleRecords = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return records;
    }

    return records.filter((item) => {
      const code = String(item.code ?? "").toLowerCase();
      const name = String(item.name ?? "").toLowerCase();
      return code.includes(keyword) || name.includes(keyword);
    });
  }, [records, searchQuery]);

  const optionPriceMaps = useMemo(
    () => ({
      crews: new Map(crewOptions.map((item) => [item.id, item.price])),
      rentals: new Map(rentalOptions.map((item) => [item.id, item.price])),
      food: new Map(foodOptions.map((item) => [item.id, item.price])),
      expendables: new Map(
        expendableOptions.map((item) => [item.id, item.price]),
      ),
    }),
    [crewOptions, rentalOptions, foodOptions, expendableOptions],
  );

  const computedBasePrice = useMemo(() => {
    const sum = (rows: BundleItemForm[], map: Map<number, number>) =>
      rows.reduce(
        (acc, item) =>
          acc + (map.get(item.id) ?? 0) * Math.max(1, item.quantity),
        0,
      );
    return (
      sum(formData.crews, optionPriceMaps.crews) +
      sum(formData.rentals, optionPriceMaps.rentals) +
      sum(formData.food_and_beverages, optionPriceMaps.food) +
      sum(formData.expendables, optionPriceMaps.expendables)
    );
  }, [formData, optionPriceMaps]);

  const computedFinalPrice = useMemo(() => {
    const discount = Math.max(0, Number(formData.discount_value || 0));
    if (formData.discount_type === "percent") {
      return Math.max(
        0,
        computedBasePrice -
          Math.floor((computedBasePrice * Math.min(100, discount)) / 100),
      );
    }
    if (formData.discount_type === "fixed") {
      return Math.max(0, computedBasePrice - discount);
    }
    return computedBasePrice;
  }, [computedBasePrice, formData.discount_type, formData.discount_value]);

  const codePreview = useMemo(() => {
    const typeCode =
      bundleTypes.find((item) => item.id === formData.bundle_type_ids[0])
        ?.short_code || "NA";
    const categoryCode =
      bundleCategories.find(
        (item) => item.id === formData.bundle_category_ids[0],
      )?.short_code || "NA";
    return `DS-${String(typeCode).toUpperCase()}-${String(categoryCode).toUpperCase()}-XXXX`;
  }, [
    bundleTypes,
    bundleCategories,
    formData.bundle_type_ids,
    formData.bundle_category_ids,
  ]);

  useEffect(() => {
    const fromCode = searchParams.get("code")?.trim() ?? "";
    const fromSearch = searchParams.get("search")?.trim() ?? "";
    const initialKeyword = fromCode || fromSearch;
    if (initialKeyword) {
      setSearchQuery(initialKeyword);
    }
  }, [searchParams]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/bundles", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setRecords((data.items || []) as BundleItem[]);
      } else {
        toast.error(data.message || "Gagal mengambil data bundle");
      }
    } catch (error) {
      console.error("Fetch bundles error:", error);
      toast.error("Terjadi kesalahan saat mengambil data bundle");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [
        typeResponse,
        categoryResponse,
        crewResponse,
        rentalResponse,
        foodResponse,
        expendableResponse,
      ] = await Promise.all([
        fetch("/api/admin/bundle-types", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/bundle-categories", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/admin/crews", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/rentals", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/food-and-beverage", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/admin/expendables", { method: "GET", cache: "no-store" }),
      ]);

      const [
        typeData,
        categoryData,
        crewData,
        rentalData,
        foodData,
        expendableData,
      ] = await Promise.all([
        typeResponse.json(),
        categoryResponse.json(),
        crewResponse.json(),
        rentalResponse.json(),
        foodResponse.json(),
        expendableResponse.json(),
      ]);

      if (typeResponse.ok) {
        setBundleTypes(
          (
            (typeData.items ?? []) as Array<{
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

      if (categoryResponse.ok) {
        setBundleCategories(
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

      if (crewResponse.ok) {
        setCrewOptions(
          (
            (crewData.crews ?? []) as Array<{
              id: number;
              name: string;
              price: number;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            price: Number(item.price ?? 0),
          })),
        );
      }

      if (rentalResponse.ok) {
        setRentalOptions(
          (
            (rentalData.rentals ?? []) as Array<{
              id: number;
              name: string;
              price: number;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            price: Number(item.price ?? 0),
          })),
        );
      }

      if (foodResponse.ok) {
        setFoodOptions(
          (
            (foodData.items ?? []) as Array<{
              id: number;
              name: string;
              price: number;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            price: Number(item.price ?? 0),
          })),
        );
      }

      if (expendableResponse.ok) {
        setExpendableOptions(
          (
            (expendableData.expendables ?? []) as Array<{
              id: number;
              name: string;
              price: number;
            }>
          ).map((item) => ({
            id: Number(item.id),
            name: item.name,
            price: Number(item.price ?? 0),
          })),
        );
      }
    } catch (error) {
      console.error("Fetch bundle options error:", error);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
    void fetchOptions();
  }, [fetchRecords, fetchOptions]);

  const openAddDialog = () => {
    setEditingRecord(null);
    setFormData({ ...emptyForm, images: [] });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (record: BundleItem) => {
    setEditingRecord(record);
    setFormData({
      name: record.name,
      description: record.description,
      is_active: record.is_active,
      discount_type:
        record.discount_type === "percent" || record.discount_type === "fixed"
          ? record.discount_type
          : "",
      discount_value: Number(record.discount_value ?? 0),
      bundle_type_ids: record.bundle_type_ids,
      bundle_category_ids: record.bundle_category_ids,
      crews: (record.crews ?? []).map((item) => ({
        id: Number(item.crew_id),
        quantity: Number(item.quantity ?? 1),
        notes: String(item.notes ?? ""),
      })),
      rentals: (record.rentals ?? []).map((item) => ({
        id: Number(item.rental_id),
        quantity: Number(item.quantity ?? 1),
        notes: String(item.notes ?? ""),
      })),
      food_and_beverages: (record.food_and_beverages ?? []).map((item) => ({
        id: Number(item.food_and_beverage_id),
        quantity: Number(item.quantity ?? 1),
        notes: String(item.notes ?? ""),
      })),
      expendables: (record.expendables ?? []).map((item) => ({
        id: Number(item.expendable_id),
        quantity: Number(item.quantity ?? 1),
        notes: String(item.notes ?? ""),
      })),
      images: normalizeImages(record.images ?? []),
    });
    setPendingImageIndex(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!String(formData.name ?? "").trim()) errors.name = "Wajib diisi";
    if (formData.bundle_type_ids.length === 0)
      errors.bundle_type_ids = "Pilih 1 bundle type";
    if (formData.bundle_category_ids.length === 0)
      errors.bundle_category_ids = "Pilih 1 bundle category";
    if (Number(formData.discount_value) < 0)
      errors.discount_value = "Tidak boleh negatif";
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
        is_active: formData.is_active,
        discount_type: formData.discount_type || null,
        discount_value: Number(formData.discount_value) || 0,
        bundle_type_ids: formData.bundle_type_ids,
        bundle_category_ids: formData.bundle_category_ids,
        crews: formData.crews.map((item) => ({
          crew_id: item.id,
          quantity: Math.max(1, Number(item.quantity || 1)),
          notes: item.notes,
        })),
        rentals: formData.rentals.map((item) => ({
          rental_id: item.id,
          quantity: Math.max(1, Number(item.quantity || 1)),
          notes: item.notes,
        })),
        food_and_beverages: formData.food_and_beverages.map((item) => ({
          food_and_beverage_id: item.id,
          quantity: Math.max(1, Number(item.quantity || 1)),
          notes: item.notes,
        })),
        expendables: formData.expendables.map((item) => ({
          expendable_id: item.id,
          quantity: Math.max(1, Number(item.quantity || 1)),
          notes: item.notes,
        })),
        images: normalizeImages(formData.images ?? []).map((image) => ({
          url: image.url,
          position: image.position,
        })),
      };

      const response = await fetch(
        editingRecord
          ? `/api/admin/bundles/${editingRecord.id}`
          : "/api/admin/bundles",
        {
          method: editingRecord ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          editingRecord
            ? "Bundle berhasil diupdate"
            : "Bundle berhasil ditambahkan",
        );
        await fetchRecords();
        setDialogOpen(false);
      } else {
        toast.error(
          data.message ||
            (editingRecord
              ? "Gagal mengupdate bundle"
              : "Gagal menambahkan bundle"),
        );
      }
    } catch (error) {
      console.error("Save bundle error:", error);
      toast.error("Terjadi kesalahan saat menyimpan bundle");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/bundles/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Bundle berhasil dihapus");
        await fetchRecords();
        setDeleteConfirm(null);
      } else {
        toast.error(data.message || "Gagal menghapus bundle");
      }
    } catch (error) {
      console.error("Delete bundle error:", error);
      toast.error("Terjadi kesalahan saat menghapus bundle");
    }
  };

  const selectSingleRelation = (
    key: "bundle_type_ids" | "bundle_category_ids",
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: [value],
    }));
  };

  const removeBundleItem = (key: BundleItemKey, itemId: number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => Number(item.id) !== Number(itemId)),
    }));
  };

  const syncBundleItemsFromSelection = (
    key: BundleItemKey,
    selectedValues: string[],
  ) => {
    setFormData((prev) => {
      const normalizedIds = Array.from(
        new Set(
          selectedValues
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value)),
        ),
      );

      const currentMap = new Map(
        prev[key].map((item) => [Number(item.id), item]),
      );

      const nextItems = normalizedIds.map((id) => {
        const existing = currentMap.get(id);
        if (existing) {
          return existing;
        }

        return {
          id,
          quantity: 1,
          notes: "",
        };
      });

      return {
        ...prev,
        [key]: nextItems,
      };
    });
  };

  const updateBundleItem = (
    key: BundleItemKey,
    itemId: number,
    changes: Partial<BundleItemForm>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].map((item) =>
        item.id === itemId ? { ...item, ...changes } : item,
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

      const response = await fetch("/api/admin/bundles/images/upload", {
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
      console.error("Upload bundle image error:", error);
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

  const renderItemSelector = (
    title: string,
    key: BundleItemKey,
    options: ItemOption[],
    anchor: ReturnType<typeof useComboboxAnchor>,
  ) => {
    const selectedIds = formData[key].map((item) => String(item.id));
    const optionMap = new Map(options.map((item) => [String(item.id), item]));
    const comboboxItems = options.map((item) => String(item.id));

    return (
      <div className="grid gap-2">
        <Label>{title}</Label>
        <Combobox
          multiple
          autoHighlight
          items={comboboxItems}
          itemToStringValue={(id) => optionMap.get(String(id))?.name ?? ""}
          value={selectedIds}
          onValueChange={(values) => {
            const nextValues = Array.isArray(values)
              ? values.map((value) => String(value))
              : [];
            syncBundleItemsFromSelection(key, nextValues);
          }}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {(values) => (
                <>
                  {(Array.isArray(values) ? values : []).map((value) => {
                    const option = optionMap.get(String(value));
                    if (!option) return null;

                    return (
                      <ComboboxChip key={String(value)}>
                        {option.name}
                      </ComboboxChip>
                    );
                  })}
                  <ComboboxChipsInput
                    placeholder={`Pilih ${title.toLowerCase()}`}
                    aria-label={title}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor} container={bundleDialogRef}>
            <ComboboxEmpty>Tidak ada item tersedia.</ComboboxEmpty>
            <ComboboxList>
              {(id) => {
                const option = optionMap.get(String(id));
                if (!option) return null;

                return (
                  <ComboboxItem key={option.id} value={String(option.id)}>
                    {option.name} ({formatPrice(option.price)})
                  </ComboboxItem>
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {formData[key].length > 0 && (
          <div className="grid gap-2 rounded-md border border-border p-3">
            {formData[key].map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_1fr_auto]"
              >
                <Input
                  value={
                    options.find((option) => option.id === item.id)?.name ||
                    `Item #${item.id}`
                  }
                  disabled
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateBundleItem(key, item.id, {
                      quantity: Math.max(1, Number(e.target.value || 1)),
                    })
                  }
                />
                <Input
                  value={item.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateBundleItem(key, item.id, { notes: e.target.value })
                  }
                  placeholder="Catatan"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive hover:text-destructive"
                  onClick={() => removeBundleItem(key, item.id)}
                  aria-label="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Kelola Bundles
          </h1>
          <p className="text-muted-foreground text-sm">
            Lihat, tambah, edit, atau hapus bundle beserta isi item, foto,
            bundle type, dan bundle category.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {visibleRecords.length} dari {records.length} bundle
          </span>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Bundle
          </Button>
        </div>

        <div className="mb-4">
          <Input
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Cari berdasarkan code atau nama bundle"
            className="sm:max-w-sm"
          />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">
                  Base Price
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Final Price
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
              ) : visibleRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    {searchQuery.trim()
                      ? "Tidak ada data bundle yang cocok dengan pencarian."
                      : 'Belum ada bundle. Klik "Tambah Bundle" untuk menambahkan.'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRecords.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatPrice(Number(item.base_price ?? 0))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatPrice(Number(item.final_price ?? 0))}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {item.is_active ? "Active" : "Inactive"}
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
        <DialogContent
          ref={bundleDialogRef}
          className="border-border sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRecord ? "Edit Bundle" : "Tambah Bundle"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nama Bundle <span className="text-destructive">*</span>
              </Label>
              {formErrors.name && (
                <p className="text-xs text-destructive -mb-1">
                  {formErrors.name}
                </p>
              )}
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Contoh: Paket Wedding Documentary"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Deskripsi bundle..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Bundle Type</Label>
                {formErrors.bundle_type_ids && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.bundle_type_ids}
                  </p>
                )}
                <Combobox
                  autoHighlight
                  items={bundleTypes.map((item) => String(item.id))}
                  itemToStringValue={(id) =>
                    bundleTypes.find((item) => String(item.id) === id)?.name ??
                    ""
                  }
                  value={
                    formData.bundle_type_ids[0]
                      ? String(formData.bundle_type_ids[0])
                      : null
                  }
                  onValueChange={(value) => {
                    if (!value) return;
                    selectSingleRelation("bundle_type_ids", Number(value));
                  }}
                >
                  <ComboboxInput
                    className="w-full"
                    placeholder="Pilih bundle type"
                    aria-label="Bundle Type"
                    showClear
                  />
                  <ComboboxContent container={bundleDialogRef}>
                    <ComboboxEmpty>Data tidak ditemukan.</ComboboxEmpty>
                    <ComboboxList>
                      {(id) => {
                        const option = bundleTypes.find(
                          (item) => String(item.id) === id,
                        );
                        if (!option) return null;

                        return (
                          <ComboboxItem
                            key={option.id}
                            value={String(option.id)}
                          >
                            {option.name}
                          </ComboboxItem>
                        );
                      }}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <div className="grid gap-1.5">
                <Label>Bundle Category</Label>
                {formErrors.bundle_category_ids && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.bundle_category_ids}
                  </p>
                )}
                <Combobox
                  autoHighlight
                  items={bundleCategories.map((item) => String(item.id))}
                  itemToStringValue={(id) =>
                    bundleCategories.find((item) => String(item.id) === id)
                      ?.name ?? ""
                  }
                  value={
                    formData.bundle_category_ids[0]
                      ? String(formData.bundle_category_ids[0])
                      : null
                  }
                  onValueChange={(value) => {
                    if (!value) return;
                    selectSingleRelation("bundle_category_ids", Number(value));
                  }}
                >
                  <ComboboxInput
                    className="w-full"
                    placeholder="Pilih bundle category"
                    aria-label="Bundle Category"
                    showClear
                  />
                  <ComboboxContent container={bundleDialogRef}>
                    <ComboboxEmpty>Data tidak ditemukan.</ComboboxEmpty>
                    <ComboboxList>
                      {(id) => {
                        const option = bundleCategories.find(
                          (item) => String(item.id) === id,
                        );
                        if (!option) return null;

                        return (
                          <ComboboxItem
                            key={option.id}
                            value={String(option.id)}
                          >
                            {option.name}
                          </ComboboxItem>
                        );
                      }}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label>Kode Bundle (otomatis)</Label>
                <Input value={codePreview} disabled />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.is_active ? "default" : "outline"}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_active: true }))
                    }
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.is_active ? "default" : "outline"}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_active: false }))
                    }
                  >
                    Inactive
                  </Button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Discount Type</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_type: e.target
                        .value as BundleFormData["discount_type"],
                    }))
                  }
                >
                  <option value="">Tanpa diskon</option>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (Rp)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label>Discount Value</Label>
                {formErrors.discount_value && (
                  <p className="text-xs text-destructive -mb-1">
                    {formErrors.discount_value}
                  </p>
                )}
                <Input
                  type="number"
                  min={0}
                  value={formData.discount_value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_value: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Base Price (read only)</Label>
                <Input value={formatPrice(computedBasePrice)} disabled />
              </div>
              <div className="grid gap-1.5">
                <Label>Final Price (read only)</Label>
                <Input value={formatPrice(computedFinalPrice)} disabled />
              </div>
            </div>

            {renderItemSelector(
              "Crew Items",
              "crews",
              crewOptions,
              crewComboboxAnchor,
            )}
            {renderItemSelector(
              "Rental Items",
              "rentals",
              rentalOptions,
              rentalComboboxAnchor,
            )}
            {renderItemSelector(
              "Food & Beverage Items",
              "food_and_beverages",
              foodOptions,
              foodComboboxAnchor,
            )}
            {renderItemSelector(
              "Expendable Items",
              "expendables",
              expendableOptions,
              expendableComboboxAnchor,
            )}

            <div className="grid gap-2">
              <Label>Foto Bundle</Label>
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
            <DialogTitle className="font-display">Hapus Bundle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bundle ini akan dihapus permanen. Perubahan ini tidak dapat
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
