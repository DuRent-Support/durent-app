"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, TicketPercent, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import formatPrice from "@/lib/formatPrice";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  buildWhatsappLink,
  buildWhatsappMessage,
} from "@/lib/whatsappMessageHelper";

type GroupedItems = {
  locations: CheckoutItem[];
  crews: CheckoutItem[];
  foodAndBeverage: CheckoutItem[];
  rentals: CheckoutItem[];
  expendables: CheckoutItem[];
  bundles: CheckoutItem[];
};

type SnapResult = {
  order_id?: string;
  transaction_status?: string;
  payment_type?: string;
};

type Snap = {
  pay: (
    token: string,
    options?: {
      onSuccess?: (result: SnapResult) => void;
      onPending?: (result: SnapResult) => void;
      onError?: (result: SnapResult) => void;
      onClose?: () => void;
    },
  ) => void;
};

type MidtransTokenizerResponse = {
  token?: string;
  message?: string;
};

type PromoCodeData = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type CheckoutItem = {
  id: string;
  sourceId: string;
  imageUrl: string;
  name: string;
  subtitle: string;
  itemType: string;
  isLocation: boolean;
  isExpendable: boolean;
  tags: string[];
  dateRange: { from: Date; to: Date } | null;
  requiresDateRange: boolean;
  multiplier: number;
  quantity: number;
  effectiveUnits: number;
  unitPrice: number;
  lineTotal: number;
};

type BundlePriceSnapshot = {
  basePrice: number;
  finalPrice: number;
};

type BookedRangeRow = {
  item_id?: string | number | null;
  booking_start?: string | null;
  booking_end?: string | null;
};

type BookedRange = {
  from: Date;
  to: Date;
};

function toNumberPrice(raw: string) {
  const normalized = String(raw)
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateLabel(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function rangesOverlap(
  firstFrom: Date,
  firstTo: Date,
  secondFrom: Date,
  secondTo: Date,
) {
  return firstFrom <= secondTo && secondFrom <= firstTo;
}

function hasBookedOverlap(from: Date, to: Date, ranges: BookedRange[]) {
  const normalizedFrom = startOfDay(from);
  const normalizedTo = startOfDay(to);

  return ranges.some((range) =>
    rangesOverlap(normalizedFrom, normalizedTo, range.from, range.to),
  );
}

async function ensureSnapLoaded(snapUrl: string, clientKey: string) {
  const win = window as Window & { snap?: Snap };

  if (win.snap) {
    return win.snap;
  }

  return new Promise<Snap>((resolve, reject) => {
    const existingScript = document.getElementById(
      "midtrans-snap",
    ) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    if (!existingScript) {
      script.id = "midtrans-snap";
      script.src = snapUrl;
      script.async = true;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }

    const checkSnap = () => {
      if (win.snap) {
        resolve(win.snap);
        return;
      }

      window.setTimeout(checkSnap, 100);
    };

    script.addEventListener("load", checkSnap, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Gagal memuat Snap.js dari Midtrans.")),
      { once: true },
    );

    window.setTimeout(() => {
      if (win.snap) {
        resolve(win.snap);
      }
    }, 0);
  });
}

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totalItems,
    clearCart,
    removeItem,
    getDays,
    updateDateRange,
    updateDateRangeBulk,
  } = useCart();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
    {},
  );
  const [rentPurpose, setRentPurpose] = useState("");
  const [shootingAddress, setShootingAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneSameAsProfile, setIsPhoneSameAsProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const [referralError, setReferralError] = useState("");
  const [promoCode, setPromoCode] = useState<PromoCodeData | null>(null);
  const [bundlePriceMap, setBundlePriceMap] = useState<
    Record<number, BundlePriceSnapshot>
  >({});
  const [checkoutError, setCheckoutError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [showMissingDateFrame, setShowMissingDateFrame] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<
    Record<string, boolean>
  >({});
  const [globalDateRange, setGlobalDateRange] = useState<BookedRange | null>(
    null,
  );
  const [bulkDateRange, setBulkDateRange] = useState<BookedRange | null>(null);
  const [isConfirmGlobalDialogOpen, setIsConfirmGlobalDialogOpen] =
    useState(false);
  const [isConfirmBulkDialogOpen, setIsConfirmBulkDialogOpen] = useState(false);
  const [manualConflictItemIds, setManualConflictItemIds] = useState<string[]>(
    [],
  );
  const [bookedRangesByLocation, setBookedRangesByLocation] = useState<
    Record<string, BookedRange[]>
  >({});
  const minBookingDate = useMemo(() => startOfDay(new Date()), []);
  const todayRange = useMemo<BookedRange>(() => {
    const today = startOfDay(new Date());
    return {
      from: today,
      to: today,
    };
  }, []);

  const buildBookingIdentityKey = (
    item: Pick<CheckoutItem, "itemType" | "sourceId">,
  ) => {
    return `${String(item.itemType).toLowerCase()}:${String(item.sourceId).trim()}`;
  };

  const checkoutItems = useMemo<CheckoutItem[]>(() => {
    return items.map((item) => {
      const itemType = String(item.itemType).toLowerCase();
      const isLocation = itemType === "location";
      const isExpendable = itemType === "expendable";
      const multiplier = isExpendable
        ? 1
        : Math.max(1, Number(getDays(item) || 1));
      const unitPrice = toNumberPrice(item.price);
      const quantity = isLocation
        ? 1
        : Math.max(1, Number(itemQuantities[item.id] ?? 1));
      const effectiveUnits = isLocation ? multiplier : quantity * multiplier;

      return {
        id: item.id,
        sourceId: item.sourceId,
        imageUrl: item.imageUrl,
        name: item.name,
        subtitle: item.subtitle,
        itemType: String(item.itemType),
        isLocation,
        isExpendable,
        tags: item.tags,
        dateRange: isExpendable
          ? (item.dateRange ?? todayRange)
          : item.dateRange,
        requiresDateRange: isExpendable ? false : item.requiresDateRange,
        multiplier,
        quantity,
        effectiveUnits,
        unitPrice,
        lineTotal: unitPrice * effectiveUnits,
      };
    });
  }, [items, getDays, itemQuantities, todayRange]);

  const grouped = useMemo<GroupedItems>(() => {
    const locations: CheckoutItem[] = [];
    const crews: CheckoutItem[] = [];
    const foodAndBeverage: CheckoutItem[] = [];
    const rentals: CheckoutItem[] = [];
    const expendables: CheckoutItem[] = [];
    const bundles: CheckoutItem[] = [];

    checkoutItems.forEach((item) => {
      const itemType = item.itemType.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();

      if (itemType === "location") {
        locations.push(item);
        return;
      }

      if (itemType === "crew" || subtitle.includes("crew")) {
        crews.push(item);
        return;
      }

      if (
        itemType === "food-and-beverage" ||
        itemType === "food_and_beverage" ||
        itemType === "food beverage" ||
        subtitle.includes("food") ||
        subtitle.includes("beverage")
      ) {
        foodAndBeverage.push(item);
        return;
      }

      if (itemType === "rental" || subtitle.includes("rental")) {
        rentals.push(item);
        return;
      }

      if (itemType === "expendable" || subtitle.includes("expendable")) {
        expendables.push(item);
        return;
      }

      if (itemType === "bundle" || subtitle.includes("bundle")) {
        bundles.push(item);
        return;
      }

      rentals.push(item);
    });

    return {
      locations,
      crews,
      foodAndBeverage,
      rentals,
      expendables,
      bundles,
    };
  }, [checkoutItems]);

  const dateMutableItems = useMemo(
    () => checkoutItems.filter((item) => item.requiresDateRange),
    [checkoutItems],
  );

  const selectedDateMutableItems = useMemo(
    () => dateMutableItems.filter((item) => selectedItemIds[item.id]),
    [dateMutableItems, selectedItemIds],
  );

  const areAllDateMutableItemsSelected =
    dateMutableItems.length > 0 &&
    selectedDateMutableItems.length === dateMutableItems.length;

  const sameItemConflictItemIds = useMemo(() => {
    const ids = new Set<string>();
    const itemsWithDate = checkoutItems.filter(
      (item) => item.requiresDateRange && item.dateRange,
    );

    for (let i = 0; i < itemsWithDate.length; i += 1) {
      for (let j = i + 1; j < itemsWithDate.length; j += 1) {
        const first = itemsWithDate[i];
        const second = itemsWithDate[j];

        if (
          buildBookingIdentityKey(first) !== buildBookingIdentityKey(second)
        ) {
          continue;
        }

        if (
          rangesOverlap(
            first.dateRange!.from,
            first.dateRange!.to,
            second.dateRange!.from,
            second.dateRange!.to,
          )
        ) {
          ids.add(first.id);
          ids.add(second.id);
        }
      }
    }

    return Array.from(ids);
  }, [checkoutItems]);

  const invalidBookingItemIdSet = useMemo(() => {
    return new Set([...sameItemConflictItemIds, ...manualConflictItemIds]);
  }, [manualConflictItemIds, sameItemConflictItemIds]);

  const collectSameItemConflictIdsForUpdates = (
    updatesById: Record<string, BookedRange>,
  ) => {
    const ids = new Set<string>();
    const updatedIdSet = new Set(Object.keys(updatesById));
    const itemsWithDate = checkoutItems.filter(
      (item) => item.requiresDateRange,
    );

    for (let i = 0; i < itemsWithDate.length; i += 1) {
      for (let j = i + 1; j < itemsWithDate.length; j += 1) {
        const first = itemsWithDate[i];
        const second = itemsWithDate[j];

        if (
          buildBookingIdentityKey(first) !== buildBookingIdentityKey(second)
        ) {
          continue;
        }

        const firstRange = updatesById[first.id] ?? first.dateRange;
        const secondRange = updatesById[second.id] ?? second.dateRange;

        if (!firstRange || !secondRange) {
          continue;
        }

        if (
          rangesOverlap(
            firstRange.from,
            firstRange.to,
            secondRange.from,
            secondRange.to,
          )
        ) {
          if (!updatedIdSet.has(first.id) && !updatedIdSet.has(second.id)) {
            continue;
          }

          ids.add(first.id);
          ids.add(second.id);
        }
      }
    }

    return Array.from(ids);
  };

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [checkoutItems],
  );

  const bundleDiscounts = useMemo(() => {
    const discounts: Record<string, number> = {};

    checkoutItems.forEach((item) => {
      if (item.itemType.toLowerCase() !== "bundle") {
        return;
      }

      const bundleId = Number.parseInt(String(item.sourceId), 10);
      const snapshot = bundlePriceMap[bundleId];

      if (!snapshot) {
        return;
      }

      const discountPerUnit = Math.max(
        0,
        Number(snapshot.basePrice) - Number(snapshot.finalPrice),
      );

      if (discountPerUnit <= 0) {
        return;
      }

      discounts[item.id] = discountPerUnit * item.effectiveUnits;
    });

    return discounts;
  }, [bundlePriceMap, checkoutItems]);

  const bundleDiscountTotal = useMemo(
    () => Object.values(bundleDiscounts).reduce((sum, value) => sum + value, 0),
    [bundleDiscounts],
  );

  const displayedSubtotal = subtotal + bundleDiscountTotal;

  const promoDiscount = useMemo(() => {
    if (!promoCode) return 0;

    if (promoCode.discount_type === "percent") {
      return Math.floor((subtotal * promoCode.discount_value) / 100);
    }

    return Math.min(subtotal, promoCode.discount_value);
  }, [promoCode, subtotal]);

  const totalDiscount = bundleDiscountTotal + promoDiscount;
  const totalPrice = Math.max(0, subtotal - promoDiscount);
  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  const whatsappLink = useMemo(() => {
    const message = buildWhatsappMessage(items);
    return buildWhatsappLink("628111029064", message);
  }, [items]);

  const applyReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setAppliedReferral("");
      setReferralError("");
      setPromoCode(null);
      return;
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .select(
        "id, code, discount_type, discount_value, min_order_amount, starts_at, expires_at, is_active",
      )
      .eq("code", code)
      .maybeSingle<PromoCodeData>();

    if (error || !data) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Kode promo tidak valid.");
      return;
    }

    if (!data.is_active) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Kode promo sedang tidak aktif.");
      return;
    }

    const now = new Date();
    if (data.starts_at && now < new Date(data.starts_at)) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Kode promo belum berlaku.");
      return;
    }

    if (data.expires_at && now > new Date(data.expires_at)) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Kode promo sudah kedaluwarsa.");
      return;
    }

    if (subtotal < Number(data.min_order_amount || 0)) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Minimum subtotal belum memenuhi syarat promo.");
      return;
    }

    setAppliedReferral(data.code);
    setPromoCode(data);
    setReferralError("");
  };

  useEffect(() => {
    const bundleIds = Array.from(
      new Set(
        checkoutItems
          .filter((item) => item.itemType.toLowerCase() === "bundle")
          .map((item) => Number.parseInt(String(item.sourceId), 10))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );

    if (bundleIds.length === 0) {
      setBundlePriceMap({});
      return;
    }

    let isActive = true;

    const loadBundlePrices = async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("id, base_price, final_price")
        .in("id", bundleIds);

      if (error || !data || !isActive) {
        if (error) {
          console.error("Bundle fetch error:", error.message);
        }
        return;
      }

      const nextMap: Record<number, BundlePriceSnapshot> = {};

      data.forEach((row) => {
        const bundleId = Number(row.id);
        if (!Number.isFinite(bundleId)) {
          return;
        }
        nextMap[bundleId] = {
          basePrice: Number(row.base_price || 0),
          finalPrice: Number(row.final_price || 0),
        };
      });

      setBundlePriceMap(nextMap);
    };

    void loadBundlePrices();

    return () => {
      isActive = false;
    };
  }, [checkoutItems, supabase]);

  useEffect(() => {
    if (!promoCode) {
      return;
    }

    if (subtotal < Number(promoCode.min_order_amount || 0)) {
      setAppliedReferral("");
      setPromoCode(null);
      setReferralError("Minimum subtotal belum memenuhi syarat promo.");
    }
  }, [promoCode, subtotal]);

  useEffect(() => {
    const locationIds = Array.from(
      new Set(
        checkoutItems
          .filter((item) => item.isLocation)
          .map((item) => String(item.sourceId || "").trim())
          .filter((value) => value.length > 0),
      ),
    );

    if (locationIds.length === 0) {
      setBookedRangesByLocation({});
      return;
    }

    let isActive = true;

    const loadBookedRanges = async () => {
      try {
        const response = await fetch("/api/cart/booked-ranges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locationIds }),
        });

        const result = (await response.json()) as {
          rows?: BookedRangeRow[];
        };

        if (!response.ok || !isActive) {
          return;
        }

        const nextMap: Record<string, BookedRange[]> = {};

        (result.rows ?? []).forEach((row) => {
          const locationId = String(row.item_id || "").trim();
          const bookingStart = row.booking_start
            ? startOfDay(new Date(row.booking_start))
            : null;
          const bookingEnd = row.booking_end
            ? startOfDay(new Date(row.booking_end))
            : null;

          if (
            locationId.length === 0 ||
            !bookingStart ||
            !bookingEnd ||
            Number.isNaN(bookingStart.getTime()) ||
            Number.isNaN(bookingEnd.getTime())
          ) {
            return;
          }

          const rangeStart =
            bookingStart <= bookingEnd ? bookingStart : bookingEnd;
          const rangeEnd =
            bookingEnd >= bookingStart ? bookingEnd : bookingStart;

          if (!nextMap[locationId]) {
            nextMap[locationId] = [];
          }

          nextMap[locationId].push({
            from: rangeStart,
            to: rangeEnd,
          });
        });

        setBookedRangesByLocation(nextMap);
      } catch (error) {
        console.error("Booked ranges fetch error:", error);
      }
    };

    void loadBookedRanges();

    return () => {
      isActive = false;
    };
  }, [checkoutItems]);

  useEffect(() => {
    if (!user) {
      setProfilePhone("");
      if (isPhoneSameAsProfile) {
        setPhoneNumber("");
      }
      return;
    }

    let isActive = true;

    const loadProfilePhone = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_uuid", user.id)
        .maybeSingle<{ phone: string | null }>();

      if (!isActive) {
        return;
      }

      if (error) {
        console.error("Profile phone fetch error:", error.message);
        setProfilePhone("");
        if (isPhoneSameAsProfile) {
          setPhoneNumber("");
        }
        return;
      }

      const normalizedPhone = String(data?.phone ?? "").trim();
      setProfilePhone(normalizedPhone);

      if (isPhoneSameAsProfile) {
        setPhoneNumber(normalizedPhone);
      }
    };

    void loadProfilePhone();

    return () => {
      isActive = false;
    };
  }, [isPhoneSameAsProfile, supabase, user]);

  useEffect(() => {
    const availableIds = new Set(dateMutableItems.map((item) => item.id));

    setSelectedItemIds((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      Object.entries(prev).forEach(([id, selected]) => {
        if (selected && availableIds.has(id)) {
          next[id] = true;
        } else if (selected) {
          changed = true;
        }
      });

      if (!changed && Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }

      return next;
    });
  }, [dateMutableItems]);

  const normalizeSelectedRange = (range?: { from?: Date; to?: Date }) => {
    if (!range?.from) {
      return null;
    }

    const normalizedFrom = startOfDay(range.from);
    const normalizedTo = startOfDay(range.to ?? range.from);

    if (normalizedFrom < minBookingDate || normalizedTo < minBookingDate) {
      setCheckoutError("Tanggal booking yang sudah lewat tidak bisa dipilih.");
      return null;
    }

    return {
      from: normalizedFrom <= normalizedTo ? normalizedFrom : normalizedTo,
      to: normalizedTo >= normalizedFrom ? normalizedTo : normalizedFrom,
    };
  };

  const applyDateRangeToItems = (
    targetItems: CheckoutItem[],
    nextRange: { from: Date; to: Date },
  ) => {
    if (targetItems.length === 0) {
      return;
    }

    const overlappingLocationNames = targetItems
      .filter((item) => item.isLocation)
      .filter((item) =>
        hasLocationRangeOverlap(item, nextRange.from, nextRange.to),
      )
      .map((item) => item.name);

    if (overlappingLocationNames.length > 0) {
      setManualConflictItemIds(targetItems.map((item) => item.id));
      setCheckoutError(
        `Beberapa lokasi bentrok dengan booking lain (${overlappingLocationNames.slice(0, 2).join(", ")}${overlappingLocationNames.length > 2 ? ", ..." : ""}).`,
      );
      return;
    }

    const updatesById = targetItems.reduce<Record<string, BookedRange>>(
      (acc, item) => {
        acc[item.id] = {
          from: nextRange.from,
          to: nextRange.to,
        };
        return acc;
      },
      {},
    );

    const sameItemConflictIds =
      collectSameItemConflictIdsForUpdates(updatesById);
    if (sameItemConflictIds.length > 0) {
      setManualConflictItemIds(sameItemConflictIds);
      setCheckoutError(
        "Item yang sama tidak boleh memiliki tanggal booking yang overlap. Ubah ke tanggal berbeda.",
      );
      return;
    }

    updateDateRangeBulk(
      targetItems.map((item) => item.id),
      {
        from: nextRange.from,
        to: nextRange.to,
      },
    );

    setManualConflictItemIds([]);
    setShowMissingDateFrame(false);
    setCheckoutError("");
  };

  const toggleSelectDateMutableItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      if (!checked) {
        if (!prev[itemId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[itemId];
        return next;
      }

      return {
        ...prev,
        [itemId]: true,
      };
    });
  };

  const toggleSelectAllDateMutableItems = (checked: boolean) => {
    if (!checked) {
      setSelectedItemIds({});
      return;
    }

    const next: Record<string, boolean> = {};
    dateMutableItems.forEach((item) => {
      next[item.id] = true;
    });
    setSelectedItemIds(next);
  };

  const handleGlobalDateApply = () => {
    if (!globalDateRange) {
      setCheckoutError("Pilih range global terlebih dahulu.");
      return;
    }

    applyDateRangeToItems(dateMutableItems, globalDateRange);
  };

  const handleBulkSelectedApply = () => {
    if (!bulkDateRange) {
      setCheckoutError("Pilih range untuk item terpilih terlebih dahulu.");
      return;
    }

    applyDateRangeToItems(selectedDateMutableItems, bulkDateRange);
  };

  const handleConfirmGlobalDateApply = () => {
    setIsConfirmGlobalDialogOpen(false);
    handleGlobalDateApply();
  };

  const handleConfirmBulkDateApply = () => {
    setIsConfirmBulkDialogOpen(false);
    handleBulkSelectedApply();
  };

  const getLocationBookedRanges = (item: CheckoutItem) => {
    if (!item.isLocation) {
      return [];
    }

    return bookedRangesByLocation[String(item.sourceId || "").trim()] ?? [];
  };

  const isLocationDateBooked = (item: CheckoutItem, date: Date) => {
    if (!item.isLocation) {
      return false;
    }

    const normalizedDate = startOfDay(date);
    const bookedRanges = getLocationBookedRanges(item);

    return bookedRanges.some(
      (range) => normalizedDate >= range.from && normalizedDate <= range.to,
    );
  };

  const hasLocationRangeOverlap = (
    item: CheckoutItem,
    from: Date,
    to: Date,
  ) => {
    if (!item.isLocation) {
      return false;
    }

    return hasBookedOverlap(from, to, getLocationBookedRanges(item));
  };

  const handleMidtransCheckout = async () => {
    if (checkoutItems.length === 0 || isPaying) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (!midtransClientKey) {
      setCheckoutError("Midtrans client key belum dikonfigurasi.");
      return;
    }

    const hasMissingDates = checkoutItems.some(
      (item) =>
        item.requiresDateRange &&
        (!item.dateRange?.from || !item.dateRange?.to),
    );

    const hasPastBookingDate = checkoutItems.some((item) => {
      if (!item.dateRange?.from || !item.dateRange?.to) {
        return false;
      }

      return (
        startOfDay(item.dateRange.from) < minBookingDate ||
        startOfDay(item.dateRange.to) < minBookingDate
      );
    });

    const hasLocationBookingOverlap = checkoutItems.some((item) => {
      if (!item.isLocation || !item.dateRange?.from || !item.dateRange?.to) {
        return false;
      }

      return hasLocationRangeOverlap(
        item,
        item.dateRange.from,
        item.dateRange.to,
      );
    });

    const hasSameItemOverlap = sameItemConflictItemIds.length > 0;

    if (hasMissingDates) {
      setShowMissingDateFrame(true);
      setCheckoutError("Masih ada item tanpa tanggal booking.");
      return;
    }

    if (hasPastBookingDate) {
      setCheckoutError("Tanggal booking yang sudah lewat tidak bisa dipilih.");
      return;
    }

    if (hasLocationBookingOverlap) {
      setCheckoutError(
        "Range tanggal lokasi bentrok dengan booking lain. Pilih range yang benar-benar kosong.",
      );
      return;
    }

    if (hasSameItemOverlap) {
      setManualConflictItemIds(sameItemConflictItemIds);
      setCheckoutError(
        "Ada item yang sama dengan range tanggal overlap. Item dengan ID sama harus pakai tanggal berbeda.",
      );
      return;
    }

    const normalizedPurpose = rentPurpose.trim();
    const normalizedShootingAddress = shootingAddress.trim();
    const normalizedPhone = (
      isPhoneSameAsProfile ? profilePhone : phoneNumber
    ).trim();

    if (!normalizedPurpose) {
      setCheckoutError("Rent purpose wajib diisi.");
      return;
    }

    if (!normalizedShootingAddress) {
      setCheckoutError("Shooting address wajib diisi.");
      return;
    }

    if (!normalizedPhone) {
      setCheckoutError(
        isPhoneSameAsProfile
          ? "Nomor telepon pada profile belum tersedia. Lengkapi dulu profile Anda atau matikan opsi nomor sama dengan profile."
          : "Nomor telepon wajib diisi.",
      );
      return;
    }

    setShowMissingDateFrame(false);
    setCheckoutError("");
    setIsPaying(true);
    clearCart();

    try {
      const checkoutPayloadItems = checkoutItems.map((item) => ({
        id: item.sourceId,
        itemType: item.itemType,
        name: item.name,
        subtotal: item.lineTotal,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        days: item.multiplier,
        dateRange: item.dateRange
          ? {
              from: item.dateRange.from.toISOString(),
              to: item.dateRange.to.toISOString(),
            }
          : undefined,
      }));

      const checkoutUser = {
        id: user.id ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        full_name: user.user_metadata?.full_name ?? null,
        name: user.user_metadata?.name ?? null,
      };


      const response = await fetch("/api/midtrans/tokenizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: checkoutPayloadItems,
          checkoutUser,
          purpose: normalizedPurpose,
          shootingAddress: normalizedShootingAddress,
          phone: normalizedPhone,
          useProfilePhone: isPhoneSameAsProfile,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as MidtransTokenizerResponse;

      if (!response.ok || !result.token) {
        setCheckoutError(result.message || "Gagal membuat token Midtrans.");
        return;
      }

      const snap = await ensureSnapLoaded(snapUrl, midtransClientKey);

      snap.pay(result.token, {
        onSuccess: () => {
          clearCart();
          router.push("/payments");
          router.refresh();
        },
        onPending: () => {
          clearCart();
          router.push("/payments");
          router.refresh();
        },
        onError: () => {
          setCheckoutError("Pembayaran gagal diproses oleh Midtrans.");
        },
        onClose: () => {
          setIsPaying(false);
        },
      });
    } catch (error) {
      console.error("Checkout Midtrans error:", error);
      setCheckoutError("Terjadi kesalahan saat memproses checkout Midtrans.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSelectDateRange = (
    item: CheckoutItem,
    range?: { from?: Date; to?: Date },
  ) => {
    const normalizedRange = normalizeSelectedRange(range);

    if (!normalizedRange) {
      return;
    }

    if (
      hasLocationRangeOverlap(item, normalizedRange.from, normalizedRange.to)
    ) {
      setManualConflictItemIds([item.id]);
      setCheckoutError(
        "Range tanggal lokasi bentrok dengan booking lain. Pilih range tanpa tanggal merah.",
      );
      return;
    }

    const sameItemConflictIds = collectSameItemConflictIdsForUpdates({
      [item.id]: {
        from: normalizedRange.from,
        to: normalizedRange.to,
      },
    });

    if (sameItemConflictIds.length > 0) {
      setManualConflictItemIds(sameItemConflictIds);
      setCheckoutError(
        "Item yang sama tidak boleh memiliki tanggal booking yang overlap.",
      );
      return;
    }

    updateDateRange(item.id, {
      from: normalizedRange.from,
      to: normalizedRange.to,
    });

    setManualConflictItemIds([]);
    setShowMissingDateFrame(false);
    setCheckoutError("");
  };

  const handleChangeQuantity = (itemId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const nextQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: nextQuantity,
    }));
  };

  const handleRemoveSingleItem = (itemId: string) => {
    removeItem(itemId);

    setManualConflictItemIds((prev) => prev.filter((id) => id !== itemId));

    setSelectedItemIds((prev) => {
      if (!prev[itemId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    setItemQuantities((prev) => {
      if (!(itemId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    setCheckoutError("");
  };

  const normalizedPurpose = rentPurpose.trim();
  const normalizedShootingAddress = shootingAddress.trim();
  const normalizedPhone = (
    isPhoneSameAsProfile ? profilePhone : phoneNumber
  ).trim();
  const hasLiveLocationOverlap = checkoutItems.some((item) => {
    if (!item.isLocation || !item.dateRange?.from || !item.dateRange?.to) {
      return false;
    }

    return hasLocationRangeOverlap(
      item,
      item.dateRange.from,
      item.dateRange.to,
    );
  });
  const hasBookingConflicts =
    sameItemConflictItemIds.length > 0 || hasLiveLocationOverlap;
  const isRequiredCheckoutFieldsMissing =
    !normalizedPurpose || !normalizedShootingAddress || !normalizedPhone;

  const renderGroup = (title: string, sectionItems: CheckoutItem[]) => (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="secondary">{sectionItems.length} item</Badge>
      </div>

      <div className="space-y-3">
        {sectionItems.map((item) => {
          const isMissingDateRange =
            item.requiresDateRange &&
            (!item.dateRange?.from || !item.dateRange?.to);
          const hasInvalidBooking = invalidBookingItemIdSet.has(item.id);
          const canBulkChangeDate = item.requiresDateRange;
          const isSelected = Boolean(selectedItemIds[item.id]);

          return (
            <div
              key={item.id}
              className={`rounded-lg border bg-background p-3 ${
                isMissingDateRange || hasInvalidBooking
                  ? "border-red-500"
                  : "border-border/60"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border border-border/60">
                  <Image
                    src={item.imageUrl || "/hero.webp"}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 40vw, 160px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {canBulkChangeDate ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              toggleSelectDateMutableItem(
                                item.id,
                                event.target.checked,
                              )
                            }
                            aria-label={`Pilih ${item.name} untuk ubah tanggal bulk`}
                          />
                        ) : null}
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label="Hapus item"
                      className="h-8 w-8 shrink-0 bg-red-600 text-white hover:bg-red-700"
                      onClick={() => handleRemoveSingleItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                    {!item.isLocation ? (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`quantity-${item.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Quantity
                        </label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min={1}
                          inputMode="numeric"
                          className="h-7 w-20 text-xs"
                          value={item.quantity}
                          onChange={(event) =>
                            handleChangeQuantity(item.id, event.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <div />
                    )}

                    {item.requiresDateRange ? (
                      <div className="text-xs text-muted-foreground">
                        <p>Start: {formatDateLabel(item.dateRange?.from)}</p>
                        <p>End: {formatDateLabel(item.dateRange?.to)}</p>
                      </div>
                    ) : (
                      <div />
                    )}

                    <div className="shrink-0 rounded-md border border-border/60 bg-muted px-3 py-1.5 text-sm font-semibold text-primary">
                      {formatPrice(item.lineTotal)}
                    </div>
                  </div>

                  {item.requiresDateRange ? (
                    <div className="flex flex-wrap gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 px-2 text-xs"
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            Pilih Range Tanggal
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            selected={
                              item.dateRange?.from
                                ? {
                                    from: item.dateRange.from,
                                    to: item.dateRange.to,
                                  }
                                : undefined
                            }
                            onSelect={(range) =>
                              handleSelectDateRange(item, range)
                            }
                            disabled={(date) =>
                              startOfDay(date) < minBookingDate ||
                              (item.isLocation &&
                                isLocationDateBooked(item, date))
                            }
                            modifiers={{
                              booked: (date) =>
                                item.isLocation
                                  ? isLocationDateBooked(item, date)
                                  : false,
                            }}
                            modifiersClassNames={{
                              booked:
                                "!bg-red-200 !text-red-700 !opacity-100 line-through aria-disabled:!bg-red-200 aria-disabled:!text-red-700 aria-disabled:!opacity-100",
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : null}

                  {hasInvalidBooking ? (
                    <p className="text-xs text-destructive">
                      Item yang sama tidak boleh memiliki tanggal booking yang
                      overlap.
                    </p>
                  ) : null}

                  {isMissingDateRange ? (
                    <p className="text-xs text-destructive">
                      Tanggal booking belum diatur. Silakan pilih range tanggal.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <main className="px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Checkout
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Periksa kembali semua item sebelum melanjutkan ke pembayaran.
            </p>
            <Badge variant="outline">Total item checkout: {totalItems}</Badge>
          </div>

          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={clearCart}
            disabled={totalItems === 0}
          >
            <Trash2 className="h-4 w-4" />
            Hapus Semua
          </Button>
        </div>

        {checkoutItems.length > 0 ? (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Global Date Range</h3>
                  <p className="text-xs text-muted-foreground">
                    Pilih sekali, lalu terapkan ke semua item bertanggal.
                  </p>
                </div>
                <Badge variant="secondary">
                  {dateMutableItems.length} item
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Pilih Range Global
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        globalDateRange
                          ? {
                              from: globalDateRange.from,
                              to: globalDateRange.to,
                            }
                          : undefined
                      }
                      onSelect={(range) => {
                        const normalizedRange = normalizeSelectedRange(range);
                        if (!normalizedRange) {
                          return;
                        }

                        setGlobalDateRange(normalizedRange);
                        setCheckoutError("");
                      }}
                      disabled={(date) => startOfDay(date) < minBookingDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsConfirmGlobalDialogOpen(true)}
                  disabled={dateMutableItems.length === 0 || !globalDateRange}
                >
                  Terapkan ke semua item
                </Button>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Global: {formatDateLabel(globalDateRange?.from)} -{" "}
                {formatDateLabel(globalDateRange?.to)}
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">
                    Bulk Select & Apply
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pilih checkbox item, lalu ubah tanggal sekaligus.
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedDateMutableItems.length} terpilih
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={areAllDateMutableItemsSelected}
                    onChange={(event) =>
                      toggleSelectAllDateMutableItems(event.target.checked)
                    }
                  />
                  Pilih semua item yang bisa diubah tanggalnya
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Pilih Range Bulk
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        bulkDateRange
                          ? {
                              from: bulkDateRange.from,
                              to: bulkDateRange.to,
                            }
                          : undefined
                      }
                      onSelect={(range) => {
                        const normalizedRange = normalizeSelectedRange(range);
                        if (!normalizedRange) {
                          return;
                        }

                        setBulkDateRange(normalizedRange);
                        setCheckoutError("");
                      }}
                      disabled={(date) => startOfDay(date) < minBookingDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsConfirmBulkDialogOpen(true)}
                  disabled={
                    selectedDateMutableItems.length === 0 || !bulkDateRange
                  }
                >
                  Ubah tanggal untuk item terpilih
                </Button>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Bulk: {formatDateLabel(bulkDateRange?.from)} -{" "}
                {formatDateLabel(bulkDateRange?.to)}
              </p>
            </section>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.75fr_1fr]">
          <div className="space-y-4">
            {checkoutItems.length === 0 ? (
              <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Belom ada item di keranjang.
              </section>
            ) : (
              <>
                {grouped.locations.length > 0
                  ? renderGroup("Locations", grouped.locations)
                  : null}
                {grouped.crews.length > 0
                  ? renderGroup("Crews", grouped.crews)
                  : null}
                {grouped.foodAndBeverage.length > 0
                  ? renderGroup("Food & Beverage", grouped.foodAndBeverage)
                  : null}
                {grouped.rentals.length > 0
                  ? renderGroup("Rentals", grouped.rentals)
                  : null}
                {grouped.expendables.length > 0
                  ? renderGroup("Expendables", grouped.expendables)
                  : null}
                {grouped.bundles.length > 0
                  ? renderGroup("Bundles", grouped.bundles)
                  : null}
              </>
            )}
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Ringkasan Pesanan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ringkasan item checkout Anda.
            </p>

            <div className="mt-4 space-y-2">
              {checkoutItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada item di checkout.
                </p>
              ) : (
                checkoutItems.map((item) => {
                  const isMissingDateRange =
                    item.requiresDateRange &&
                    (!item.dateRange?.from || !item.dateRange?.to);
                  const hasInvalidBooking = invalidBookingItemIdSet.has(
                    item.id,
                  );

                  return (
                    <div
                      key={`summary-${item.id}`}
                      className={`flex items-start justify-between gap-3 rounded-md border p-2 text-sm ${
                        isMissingDateRange || hasInvalidBooking
                          ? "border-red-500"
                          : "border-transparent"
                      }`}
                    >
                      <span className="line-clamp-2">
                        {item.name}
                        <span className="text-zinc-400">
                          {item.isLocation
                            ? ` x ${item.multiplier} hari`
                            : item.isExpendable
                              ? ` x ${item.quantity} qty`
                              : ` x ${item.quantity} qty x ${item.multiplier} hari`}
                        </span>
                      </span>
                      <div className="flex flex-col items-end">
                        {bundleDiscounts[item.id] ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(
                              item.lineTotal + bundleDiscounts[item.id],
                            )}
                          </span>
                        ) : null}
                        <span className="whitespace-nowrap font-semibold">
                          {formatPrice(item.lineTotal)}
                        </span>
                        {bundleDiscounts[item.id] ? (
                          <span className="text-xs text-green-600">
                            -{formatPrice(bundleDiscounts[item.id])}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Total Item</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">
                  {formatPrice(displayedSubtotal)}
                </span>
              </div>
              {bundleDiscountTotal > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Diskon Bundle</span>
                  <span className="font-semibold text-green-600">
                    -{formatPrice(bundleDiscountTotal)}
                  </span>
                </div>
              ) : null}
              {promoDiscount > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Diskon Promo</span>
                  <span className="font-semibold text-green-600">
                    -{formatPrice(promoDiscount)}
                  </span>
                </div>
              ) : null}
              {totalDiscount > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Total Diskon</span>
                  <span className="font-semibold text-green-600">
                    -{formatPrice(totalDiscount)}
                  </span>
                </div>
              ) : null}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-base font-bold">
              <span>Total Harga</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor="rent-purpose" className="text-sm font-medium">
                Rent Purpose <span className="text-red-500">*</span>
              </label>
              <Input
                id="rent-purpose"
                value={rentPurpose}
                onChange={(event) => setRentPurpose(event.target.value)}
                placeholder="Contoh: dokumentasi produk"
              />
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor="shooting-address" className="text-sm font-medium">
                Shooting Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="shooting-address"
                value={shootingAddress}
                onChange={(event) => setShootingAddress(event.target.value)}
                placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="phone-number" className="text-sm font-medium">
                  Nomor Telepon <span className="text-red-500">*</span>
                </label>
                <label
                  htmlFor="same-as-profile"
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <input
                    id="same-as-profile"
                    type="checkbox"
                    checked={isPhoneSameAsProfile}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIsPhoneSameAsProfile(checked);
                      if (!checked) {
                        setPhoneNumber("");
                      }
                    }}
                  />
                  Nomor sama dengan profile
                </label>
              </div>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Contoh: 081234567890"
                disabled={isPhoneSameAsProfile}
              />
              {isPhoneSameAsProfile && !profilePhone ? (
                <p className="text-xs text-destructive">
                  Nomor telepon pada profile belum tersedia.
                </p>
              ) : null}
            </div>

            <div className="mt-5 rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <TicketPercent className="h-4 w-4" />
                Referral Code
              </div>
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={(event) => setReferralInput(event.target.value)}
                  placeholder="Masukkan kode referral"
                />
                <Button type="button" onClick={applyReferral}>
                  Terapkan
                </Button>
              </div>
              {appliedReferral ? (
                <p className="mt-2 text-xs text-green-600">
                  Kode referral {appliedReferral} berhasil diterapkan.
                </p>
              ) : null}
              {referralError ? (
                <p className="mt-2 text-xs text-destructive">{referralError}</p>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <Button
                type="button"
                className="w-full bg-green-500 text-white hover:bg-green-600"
                onClick={() => void handleMidtransCheckout()}
                disabled={
                  checkoutItems.length === 0 ||
                  isPaying ||
                  isRequiredCheckoutFieldsMissing ||
                  hasBookingConflicts
                }
              >
                {isPaying ? "Memproses pembayaran..." : "Pembayaran"}
              </Button>

              {hasBookingConflicts ? (
                <p className="text-xs text-destructive">
                  Pembayaran dinonaktifkan karena masih ada konflik tanggal.
                  Ubah tanggal pada item yang ditandai merah.
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full bg-neutral-700 text-white hover:bg-neutral-800"
                onClick={() => {
                  window.open(whatsappLink, "_blank", "noopener,noreferrer");
                }}
                disabled={checkoutItems.length === 0}
              >
                Order by Whatsapp
              </Button>

              {checkoutError ? (
                <p className="text-xs text-destructive">{checkoutError}</p>
              ) : null}
            </div>
          </aside>
        </div>

        <Dialog
          open={isConfirmGlobalDialogOpen}
          onOpenChange={setIsConfirmGlobalDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Terapkan ke semua item?</DialogTitle>
              <DialogDescription>
                Semua item bertanggal ({dateMutableItems.length} item) akan
                diganti ke range {formatDateLabel(globalDateRange?.from)} -{" "}
                {formatDateLabel(globalDateRange?.to)}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmGlobalDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="button" onClick={handleConfirmGlobalDateApply}>
                Ya, terapkan semua
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isConfirmBulkDialogOpen}
          onOpenChange={setIsConfirmBulkDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah tanggal item terpilih?</DialogTitle>
              <DialogDescription>
                {selectedDateMutableItems.length} item terpilih akan diubah ke
                range {formatDateLabel(bulkDateRange?.from)} -{" "}
                {formatDateLabel(bulkDateRange?.to)}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmBulkDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="button" onClick={handleConfirmBulkDateApply}>
                Ya, ubah yang dipilih
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
