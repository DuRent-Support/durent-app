import { format } from "date-fns";
import { id } from "date-fns/locale";

import { type CartDateRange, type CartItem } from "@/types/cart";

type WhatsappItem = Pick<
  CartItem,
  "name" | "dateRange" | "itemType" | "subtitle" | "price" | "requiresDateRange"
>;

function formatWaDateRange(range: CartDateRange | null) {
  if (!range?.from || !range?.to) {
    return "belum dipilih";
  }

  const from = format(range.from, "d MMM yyyy", { locale: id });
  const to = format(range.to, "d MMM yyyy", { locale: id });

  return `${from} - ${to}`;
}

export function buildWhatsappMessage(items: WhatsappItem[]) {
  const intro = "Halo, saya tertarik untuk book";

  if (items.length === 0) {
    return intro;
  }

  const lines = items.map((item) => {
    const itemKind =
      item.itemType === "location"
        ? "Lokasi"
        : item.itemType === "crew"
          ? "Crew"
          : item.itemType === "equipment"
            ? "Equipment"
            : item.itemType === "rental"
              ? "Rental"
              : item.itemType === "food_and_beverage"
                ? "Food & Beverage"
                : item.itemType === "expendable"
                  ? "Expendable"
                  : item.itemType === "bundle"
                    ? "Bundle"
                    : "Item";

    if (!item.requiresDateRange) {
      return `${itemKind}: ${item.name}\n${item.subtitle}\nHarga: ${item.price}`;
    }

    return `${itemKind}: ${item.name}\n${item.subtitle}\nTanggal: ${formatWaDateRange(item.dateRange)}\nHarga: ${item.price}`;
  });

  return `${intro}\n${lines.join("\n\n")}\n`;
}

export function buildWhatsappLink(phoneNumber: string, message: string) {
  const normalizedNumber = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
