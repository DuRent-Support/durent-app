export type EquipmentSpecs = Record<string, unknown> | unknown[];

export interface Equipment {
  equipment_id: string;
  name: string;
  description: string;
  price: number;
  specs: EquipmentSpecs;
  images: string[];
  created_at?: string;
}
