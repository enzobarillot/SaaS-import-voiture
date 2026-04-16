import { MarketSeedRecord } from "@/types";

export const MARKET_REFERENCE_SEEDS: MarketSeedRecord[] = [
  {
    id: "bmw-320d-2021",
    brand: "BMW",
    model: "320d",
    fuelType: "diesel",
    targetYear: 2021,
    targetMileage: 65000,
    basePrice: 33400,
    note: "Seeded French retail reference for a clean BMW 320d M Sport style profile."
  },
  {
    id: "vw-golf-tdi-2020",
    brand: "Volkswagen",
    model: "Golf",
    fuelType: "diesel",
    targetYear: 2020,
    targetMileage: 70000,
    basePrice: 24700,
    note: "Seeded benchmark for a mid-spec imported Golf diesel."
  },
  {
    id: "audi-a3-tfsi-2021",
    brand: "Audi",
    model: "A3",
    fuelType: "petrol",
    targetYear: 2021,
    targetMileage: 52000,
    basePrice: 30900,
    note: "Seeded benchmark for A3 petrol demand in France."
  },
  {
    id: "tesla-model-3-2022",
    brand: "Tesla",
    model: "Model 3",
    fuelType: "electric",
    targetYear: 2022,
    targetMileage: 45000,
    basePrice: 34600,
    note: "Seeded EV benchmark based on stable French retail positioning."
  },
  {
    id: "peugeot-3008-hybrid-2021",
    brand: "Peugeot",
    model: "3008",
    fuelType: "hybrid",
    targetYear: 2021,
    targetMileage: 60000,
    basePrice: 30100,
    note: "Seeded benchmark for a well-specced French-family SUV hybrid."
  },
  {
    id: "mercedes-c220d-2020",
    brand: "Mercedes",
    model: "C 220",
    fuelType: "diesel",
    targetYear: 2020,
    targetMileage: 80000,
    basePrice: 32500,
    note: "Seeded benchmark for business-sedan diesel demand."
  },
  {
    id: "renault-clio-2021",
    brand: "Renault",
    model: "Clio",
    fuelType: "petrol",
    targetYear: 2021,
    targetMileage: 50000,
    basePrice: 16900,
    note: "Seeded compact hatchback benchmark."
  },
  {
    id: "toyota-yaris-hybrid-2022",
    brand: "Toyota",
    model: "Yaris",
    fuelType: "hybrid",
    targetYear: 2022,
    targetMileage: 40000,
    basePrice: 21400,
    note: "Seeded benchmark for high-demand city hybrid demand in France."
  }
];

