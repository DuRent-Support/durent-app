import { format } from "date-fns";
import { id } from "date-fns/locale";

import { type CartDateRange, type CartItem } from "@/types/cart";

type WhatsappItem = Pick<CartItem, "name" | "dateRange">;

function formatWaDateRange(range: CartDateRange | null) {
  if (!range?.from || !range?.to) {
    return "<start> - <end>";
  }

  console.log("Formatting date range:", range);
  const from = format(range.from, "d MMM yyyy", { locale: id });
  const to = format(range.to, "d MMM yyyy", { locale: id });

  return `${from} - ${to}`;
}

export function buildWhatsappMessage(items: WhatsappItem[]) {
  const intro = "Halo, saya tertarik untuk book";

  if (items.length === 0) {
    return intro;
  }

  console.log(items);
  const lines = items.map(
    (item) => `${item.name}\npada tanggal ${formatWaDateRange(item.dateRange)}`,
  );

  return `${intro}\n${lines.join("\n\n")}\n`;
}

export function buildWhatsappLink(phoneNumber: string, message: string) {
  const normalizedNumber = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
