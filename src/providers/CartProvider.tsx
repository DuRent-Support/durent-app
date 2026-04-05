"use client";

import {
  createContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  type CartContextValue,
  type CartDateRange,
  type CartItem,
  type CartItemInput,
  type CartItemType,
} from "@/types/cart";

const CART_STORAGE_KEY = "durent-cart";
const cartListeners = new Set<() => void>();
const EMPTY_CART: CartItem[] = [];

let cachedRawSnapshot: string | null = null;
let cachedCartSnapshot: CartItem[] = EMPTY_CART;

export const CartContext = createContext<CartContextValue | null>(null);

function normalizeDateRange(
  dateRange?: Partial<CartDateRange> | null,
): CartDateRange | null {
  if (!dateRange?.from) {
    return null;
  }

  const from = startOfDay(new Date(dateRange.from));
  const to = dateRange?.to ? startOfDay(new Date(dateRange.to)) : from;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  if (to < from) {
    return {
      from,
      to: from,
    };
  }

  return {
    from,
    to,
  };
}

function normalizeItemType(value: unknown): CartItemType {
  if (
    value === "crew" ||
    value === "equipment" ||
    value === "location" ||
    value === "rental" ||
    value === "food_and_beverage" ||
    value === "expendable" ||
    value === "bundle"
  ) {
    return value;
  }

  return "location";
}

function buildCartId(itemType: CartItemType, sourceId: string) {
  return `${itemType}:${sourceId}`;
}

function getDefaultSubtitle(itemType: CartItemType) {
  if (itemType === "crew") return "Crew";
  if (itemType === "equipment") return "Equipment";
  if (itemType === "rental") return "Rental";
  if (itemType === "food_and_beverage") return "Food & Beverage";
  if (itemType === "expendable") return "Expendable";
  if (itemType === "bundle") return "Bundle";
  return "Location";
}

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): CartItem | null => {
        if (
          typeof item?.id !== "string" ||
          typeof item?.name !== "string" ||
          (typeof item?.price !== "string" && typeof item?.price !== "number")
        ) {
          return null;
        }

        const itemType = normalizeItemType(item.itemType);
        const sourceId =
          typeof item.sourceId === "string" && item.sourceId.length > 0
            ? item.sourceId
            : item.id.includes(":")
              ? item.id.split(":").slice(1).join(":")
              : item.id;

        if (!sourceId) {
          return null;
        }

        const requiresDateRange = true;

        const subtitleCandidate =
          typeof item.subtitle === "string"
            ? item.subtitle
            : typeof item.city === "string"
              ? item.city
              : getDefaultSubtitle(itemType);

        return {
          id: buildCartId(itemType, sourceId),
          sourceId,
          itemType,
          subtitle: subtitleCandidate,
          requiresDateRange,
          name: item.name,
          price: String(item.price),
          imageUrl:
            typeof item.imageUrl === "string" && item.imageUrl.length > 0
              ? item.imageUrl
              : "/hero.webp",
          tags: Array.isArray(item.tags)
            ? item.tags.filter(
                (tag: unknown): tag is string => typeof tag === "string",
              )
            : [],
          dateRange: requiresDateRange
            ? normalizeDateRange(item.dateRange ?? null)
            : null,
        };
      })
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

function readCartSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  const rawSnapshot = window.localStorage.getItem(CART_STORAGE_KEY);

  if (rawSnapshot === cachedRawSnapshot) {
    return cachedCartSnapshot;
  }

  cachedRawSnapshot = rawSnapshot;
  cachedCartSnapshot = parseStoredCart(rawSnapshot);

  return cachedCartSnapshot;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function subscribeCart(listener: () => void) {
  cartListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      cartListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function persistCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const rawSnapshot = JSON.stringify(items);
  cachedRawSnapshot = rawSnapshot;
  cachedCartSnapshot = items;
  window.localStorage.setItem(CART_STORAGE_KEY, rawSnapshot);

  for (const listener of cartListeners) {
    listener();
  }
}

export function getCartItemDays(
  item: Pick<CartItem, "dateRange" | "requiresDateRange">,
) {
  if (!item.requiresDateRange) {
    return 1;
  }

  if (!item.dateRange?.from || !item.dateRange?.to) {
    return 0;
  }

  return Math.max(
    1,
    differenceInCalendarDays(item.dateRange.to, item.dateRange.from) + 1,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    subscribeCart,
    readCartSnapshot,
    getServerCartSnapshot,
  );

  const value = useMemo<CartContextValue>(() => {
    const addItem = (item: CartItemInput) => {
      const currentItems = readCartSnapshot();
      const itemType = item.itemType ?? "location";
      const sourceId = item.id;
      const cartId = buildCartId(itemType, sourceId);

      if (currentItems.some((currentItem) => currentItem.id === cartId)) {
        return;
      }

      const requiresDateRange = true;

      const subtitle =
        item.subtitle && item.subtitle.trim().length > 0
          ? item.subtitle.trim()
          : getDefaultSubtitle(itemType);

      persistCart([
        ...currentItems,
        {
          id: cartId,
          sourceId,
          itemType,
          subtitle,
          requiresDateRange,
          name: item.name,
          price: String(item.price),
          imageUrl:
            item.imageUrl && item.imageUrl.length > 0
              ? item.imageUrl
              : "/hero.webp",
          tags: item.tags ?? [],
          dateRange: null,
        },
      ]);
    };

    const removeItem = (id: string) => {
      persistCart(
        readCartSnapshot().filter((currentItem) => currentItem.id !== id),
      );
    };

    const updateDateRange = (id: string, dateRange: CartDateRange) => {
      persistCart(
        readCartSnapshot().map((currentItem) => {
          if (currentItem.id !== id || !currentItem.requiresDateRange) {
            return currentItem;
          }

          return {
            ...currentItem,
            dateRange: normalizeDateRange(dateRange),
          };
        }),
      );
    };

    const clearCart = () => {
      persistCart([]);
    };

    const isInCart = (id: string, itemType: CartItemType = "location") => {
      const cartId = buildCartId(itemType, id);
      return items.some((item) => item.id === cartId);
    };

    const getDays = (item: CartItem) => {
      return getCartItemDays(item);
    };

    return {
      items,
      totalItems: items.length,
      addItem,
      removeItem,
      updateDateRange,
      clearCart,
      isInCart,
      getDays,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
