export interface CartDateRange {
  from: Date;
  to: Date;
}

export type CartItemType =
  | "location"
  | "crew"
  | "equipment"
  | "rental"
  | "food_and_beverage"
  | "expendable"
  | "bundle";

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
  dateRange?: Partial<CartDateRange> | null;
}

export interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateDateRange: (id: string, dateRange: CartDateRange) => void;
  updateDateRangeBulk: (ids: string[], dateRange: CartDateRange) => void;
  updateDateRangeForLocations: (dateRange: CartDateRange) => void;
  defaultDateRange: CartDateRange | null;
  setDefaultDateRange: (dateRange: Partial<CartDateRange> | null) => void;
  clearCart: () => void;
  clearAllDateRanges: () => void;
  isInCart: (id: string, itemType?: CartItemType) => boolean;
  getDays: (item: CartItem) => number;
}
