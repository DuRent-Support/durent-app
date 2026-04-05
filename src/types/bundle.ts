export type BundleRelation = {
  id: number;
  name: string;
  short_code?: string;
};

export type BundleImage = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

export type BundleLineItem = {
  quantity: number;
  notes: string;
  name: string;
  unit_price: number;
  subtotal: number;
  crew_id?: number;
  rental_id?: number;
  food_and_beverage_id?: number;
  expendable_id?: number;
};

export interface Bundle {
  id: number;
  uuid: string;
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
  bundle_types: BundleRelation[];
  bundle_categories: BundleRelation[];
  crews: BundleLineItem[];
  rentals: BundleLineItem[];
  food_and_beverages: BundleLineItem[];
  expendables: BundleLineItem[];
  images: BundleImage[];
}
