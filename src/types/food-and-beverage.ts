export type FoodAndBeverageRelation = {
  id: number;
  name: string;
  short_code?: string;
};

export type FoodAndBeverageImage = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

export interface FoodAndBeverage {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  tags: FoodAndBeverageRelation[];
  item_categories: FoodAndBeverageRelation[];
  item_sub_categories: FoodAndBeverageRelation[];
  images: FoodAndBeverageImage[];
  created_at?: string | null;
  updated_at?: string | null;
}
