import type { AnimalType, ElectricityType, WaterType } from "@prisma/client";

export interface WaterPriceRecord {
  id: number;
  providerName: string;
  waterType: WaterType;
  location: string;
  pricePerUnit: number;
  dateRecorded: Date;
}

export interface ElectricityPriceRecord {
  id: number;
  providerName: string;
  serviceType: ElectricityType;
  location: string;
  pricePerKwh: number;
  dateRecorded: Date;
}

export interface LivestockPriceRecord {
  id: number;
  animalType: AnimalType;
  price: number;
  dateRecorded: Date;
}
