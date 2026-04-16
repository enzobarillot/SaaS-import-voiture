import type { SimulationContext, VehicleInput } from "@/types";

export const TEST_CONTEXT: SimulationContext = {
  evaluationDate: "2026-04-15"
};

export const germanPetrolCase: VehicleInput = {
  purchasePrice: 21400,
  countryOfOrigin: "DE",
  brand: "Audi",
  model: "A3",
  trim: "Sportback S line",
  year: 2020,
  firstRegistrationDate: "2020-05-11",
  mileage: 78000,
  fuelType: "petrol",
  transmission: "automatic",
  horsepower: 150,
  fiscalPower: 8,
  co2Emissions: 123,
  curbWeightKg: 1380,
  sellerType: "dealer",
  vatStatus: "included",
  transportCost: 850,
  exportPlatesCost: 190,
  cocCost: 180,
  inspectionCost: 95,
  brokerFees: 350,
  frenchMarketEstimate: 27200,
  listingUrl: "https://suchen.mobile.de/fahrzeuge/details.html?id=audi-a3-2020"
};

export const recentDieselCase: VehicleInput = {
  purchasePrice: 28200,
  countryOfOrigin: "DE",
  brand: "Volkswagen",
  model: "Golf",
  trim: "2.0 TDI Style",
  year: 2024,
  firstRegistrationDate: "2025-02-10",
  mileage: 18000,
  fuelType: "diesel",
  transmission: "automatic",
  horsepower: 150,
  fiscalPower: 8,
  co2Emissions: 150,
  curbWeightKg: 1580,
  sellerType: "dealer",
  vatStatus: "excluded",
  transportCost: 900,
  exportPlatesCost: 220,
  cocCost: 180,
  inspectionCost: 95,
  brokerFees: 300,
  frenchMarketEstimate: 33800,
  listingUrl: "https://www.autoscout24.com/offers/volkswagen-golf-2-0-tdi-style"
};

export const evCase: VehicleInput = {
  purchasePrice: 31900,
  countryOfOrigin: "DE",
  brand: "Tesla",
  model: "Model 3",
  trim: "Grande Autonomie",
  year: 2022,
  firstRegistrationDate: "2022-09-01",
  mileage: 45000,
  fuelType: "electric",
  transmission: "automatic",
  horsepower: 283,
  fiscalPower: 11,
  co2Emissions: 0,
  curbWeightKg: 1847,
  sellerType: "dealer",
  vatStatus: "included",
  transportCost: 950,
  exportPlatesCost: 220,
  cocCost: 0,
  inspectionCost: 95,
  brokerFees: 350,
  frenchMarketEstimate: 36200,
  listingUrl: "https://suchen.mobile.de/fahrzeuge/details.html?id=tesla-model-3-2022"
};

export const missingCo2Case: VehicleInput = {
  ...germanPetrolCase,
  co2Emissions: undefined,
  transportCost: undefined,
  curbWeightKg: undefined,
  cocCost: undefined,
  frenchMarketEstimate: 26500
};

export const dealerRecoverableCase: VehicleInput = {
  ...germanPetrolCase,
  brand: "BMW",
  model: "320d",
  trim: "M Sport",
  year: 2021,
  firstRegistrationDate: "2021-06-14",
  mileage: 64000,
  fuelType: "diesel",
  horsepower: 190,
  fiscalPower: 10,
  co2Emissions: 128,
  curbWeightKg: 1665,
  purchasePrice: 25900,
  transportCost: 900,
  exportPlatesCost: 220,
  brokerFees: 450,
  vatStatus: "recoverable",
  frenchMarketEstimate: 33200,
  listingUrl: "https://suchen.mobile.de/fahrzeuge/details.html?id=bmw-320d-m-sport-2021"
};

export const privateSellerCase: VehicleInput = {
  ...germanPetrolCase,
  sellerType: "private",
  vatStatus: "included",
  frenchMarketEstimate: 25500,
  listingUrl: "https://www.leboncoin.fr/ad/voitures/123456"
};

export const strongMarginCase: VehicleInput = {
  ...dealerRecoverableCase,
  vatStatus: "included",
  frenchMarketEstimate: 36000
};

export const badDealCase: VehicleInput = {
  ...dealerRecoverableCase,
  vatStatus: "included",
  frenchMarketEstimate: 28000
};

export const heuristicCase: VehicleInput = {
  ...germanPetrolCase,
  brand: "Saab",
  model: "9-3",
  trim: "Vector",
  purchasePrice: 10900,
  year: 2016,
  firstRegistrationDate: "2016-04-12",
  mileage: 122000,
  horsepower: 140,
  fiscalPower: 7,
  co2Emissions: 134,
  curbWeightKg: 1480,
  frenchMarketEstimate: undefined,
  listingUrl: "https://www.lacentrale.fr/auto-occasion-annonce-69123456789.html"
};

export const providerBackedCase: VehicleInput = {
  purchasePrice: 28700,
  countryOfOrigin: "DE",
  brand: "Cupra",
  model: "Leon",
  trim: "e-Hybrid VZ",
  year: 2023,
  firstRegistrationDate: "2023-06-20",
  mileage: 31000,
  fuelType: "hybrid",
  transmission: "automatic",
  horsepower: 245,
  fiscalPower: 10,
  co2Emissions: 32,
  curbWeightKg: 1660,
  sellerType: "dealer",
  vatStatus: "included",
  transportCost: 880,
  exportPlatesCost: 220,
  cocCost: 180,
  inspectionCost: 95,
  brokerFees: 320,
  frenchMarketEstimate: undefined,
  listingUrl: "https://www.mobile.de/auto-inserat/cupra-leon-ehybrid-vz-2023"
};