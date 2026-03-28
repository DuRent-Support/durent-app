// Props for LocationCard component
export interface LocationCardProps {
  id: string;
  name: string;
  city: string;
  price: string;
  description?: string;
  area: number;
  imageUrl: string[];
  pax: number;
  rate: number | null;
  tags: string[];
}
