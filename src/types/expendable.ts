export type ExpendableRelation = {
  id: number;
  name: string;
  short_code?: string;
};

export type ExpendableImage = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

export interface Expendable {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  item_category_ids: number[];
  item_sub_category_ids: number[];
  item_categories: ExpendableRelation[];
  item_sub_categories: ExpendableRelation[];
  images: ExpendableImage[];
  created_at?: string | null;
  updated_at?: string | null;
}
