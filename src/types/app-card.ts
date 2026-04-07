import type React from "react";

export enum AppCardType {
  Location = "location",
  Rental = "rental",
  Expendable = "expendable",
  Fnb = "fnb",
  Crew = "crew",
  Bundle = "bundle",
}

type AppCardBase = {
  name: string;
  description: string;
  imageUrl?: string | null;
  action?: React.ReactNode;
  onClick?: () => void;
};

type LocationCardData = AppCardBase & {
  type: AppCardType.Location;
  city: string;
  price: string | number;
  area: number;
  pax: number;
  rating: number | null;
  tags: string[];
};

type CrewCardData = AppCardBase & {
  type: AppCardType.Crew;
  price: number;
  skills: string[];
};

type FnbCardData = AppCardBase & {
  type: AppCardType.Fnb;
  price: number;
  fnbTags: string[];
};

type ExpendableCardData = AppCardBase & {
  type: AppCardType.Expendable;
  price: number;
};

type RentalCardData = AppCardBase & {
  type: AppCardType.Rental;
  price: number;
};

type BundleCardData = AppCardBase & {
  type: AppCardType.Bundle;
  basePrice: number;
  finalPrice: number;
};

export type AppCardProps =
  | LocationCardData
  | CrewCardData
  | FnbCardData
  | ExpendableCardData
  | RentalCardData
  | BundleCardData;
