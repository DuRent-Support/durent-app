export interface CartDateRange {
  from: Date;
  to: Date;
}

export type CartItemType = "location" | "crew" | "equipment";

export interface CartItem {
  id: string;
  sourceId: string;
  itemType: CartItemType;
  subtitle: string;
  requiresDateRange: boolean;
  name: string;
  price: string;
  imageUrl: string;
  tags: string[];
  dateRange: CartDateRange | null;
}

export interface CartItemInput {
  id: string;
  itemType?: CartItemType;
  name: string;
  subtitle?: string;
  price: string | number;
  imageUrl?: string;
  tags?: string[];
  requiresDateRange?: boolean;
}

export interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateDateRange: (id: string, dateRange: CartDateRange) => void;
  clearCart: () => void;
  isInCart: (id: string, itemType?: CartItemType) => boolean;
  getDays: (item: CartItem) => number;
}
