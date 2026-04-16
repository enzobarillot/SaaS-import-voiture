import { FuelType, OriginCountry, SellerType, Transmission, VatStatus, VehicleFieldKey, VehicleInput } from "@/types";

export const COUNTRY_OPTIONS: Array<{ value: OriginCountry; label: string }> = [
  { value: "DE", label: "Germany" },
  { value: "BE", label: "Belgium" },
  { value: "NL", label: "Netherlands" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "FR", label: "France" },
  { value: "OTHER_EU", label: "Other EU" }
];

export const FUEL_OPTIONS: Array<{ value: FuelType; label: string }> = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "plug_in_hybrid", label: "Plug-in hybrid" },
  { value: "electric", label: "Electric" },
  { value: "flex_fuel", label: "E85 / flex-fuel" },
  { value: "other", label: "Other" }
];

export const TRANSMISSION_OPTIONS: Array<{ value: Transmission; label: string }> = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" }
];

export const SELLER_TYPE_OPTIONS: Array<{ value: SellerType; label: string }> = [
  { value: "dealer", label: "Dealer" },
  { value: "private", label: "Private" }
];

export const VAT_STATUS_OPTIONS: Array<{ value: VatStatus; label: string }> = [
  { value: "included", label: "VAT included" },
  { value: "excluded", label: "VAT excluded" },
  { value: "recoverable", label: "Recoverable VAT" }
];

export const KNOWN_BRANDS = [
  "audi",
  "bmw",
  "citroen",
  "cupra",
  "dacia",
  "fiat",
  "ford",
  "hyundai",
  "jaguar",
  "jeep",
  "kia",
  "land",
  "lexus",
  "mazda",
  "mercedes",
  "mini",
  "nissan",
  "opel",
  "peugeot",
  "porsche",
  "renault",
  "saab",
  "seat",
  "skoda",
  "tesla",
  "toyota",
  "volkswagen",
  "volvo"
];

export const BRAND_MARKET_MULTIPLIERS: Record<string, number> = {
  audi: 1.13,
  bmw: 1.15,
  citroen: 1.01,
  cupra: 1.09,
  dacia: 0.98,
  fiat: 0.99,
  ford: 1.02,
  hyundai: 1.04,
  jaguar: 1.09,
  jeep: 1.05,
  kia: 1.03,
  land: 1.11,
  lexus: 1.08,
  mazda: 1.04,
  mercedes: 1.15,
  mini: 1.07,
  nissan: 1.01,
  opel: 0.99,
  peugeot: 1.01,
  porsche: 1.18,
  renault: 1,
  saab: 0.96,
  seat: 1.01,
  skoda: 1.02,
  tesla: 1.05,
  toyota: 1.06,
  volkswagen: 1.04,
  volvo: 1.08
};

export const FUEL_MARKET_ADJUSTMENTS: Record<FuelType, number> = {
  petrol: 0.03,
  diesel: -0.03,
  hybrid: 0.04,
  plug_in_hybrid: 0.06,
  electric: 0.03,
  flex_fuel: -0.01,
  other: 0
};

export const COUNTRY_MARKET_ADJUSTMENTS: Record<OriginCountry, number> = {
  DE: 0.06,
  BE: 0.03,
  NL: 0.03,
  ES: 0.02,
  IT: 0.02,
  FR: 0,
  OTHER_EU: 0.03
};

export const DEFAULT_FISCAL_RATE = 55;
export const FIXED_REGISTRATION_FEE = 13.76;
export const HISTORY_STORAGE_KEY = "france-import-history";
export const USAGE_STORAGE_KEY = "france-import-usage";
export const FREE_SIMULATION_LIMIT = 5;
export const SIGNED_IN_SIMULATION_LIMIT = 25;
export const CLOUD_HISTORY_LIMIT = 50;
export const LEGAL_REFERENCE_LABEL = "French tax tables reference: Service-Public verified 1 March 2025";
export const SESSION_COOKIE_NAME = "importscore_session";
export const SESSION_DURATION_DAYS = 30;

export const FIELD_LABELS: Record<VehicleFieldKey, string> = {
  purchasePrice: "Purchase price",
  countryOfOrigin: "Country of origin",
  brand: "Brand",
  model: "Model",
  trim: "Trim",
  year: "Year",
  firstRegistrationDate: "First registration date",
  mileage: "Mileage",
  fuelType: "Fuel type",
  transmission: "Transmission",
  horsepower: "Horsepower",
  fiscalPower: "Fiscal power",
  co2Emissions: "CO2 emissions",
  curbWeightKg: "Curb weight",
  sellerType: "Seller type",
  vatStatus: "VAT status",
  transportCost: "Transport cost",
  exportPlatesCost: "Export plates cost",
  cocCost: "COC cost",
  inspectionCost: "Inspection cost",
  brokerFees: "Broker fees",
  frenchMarketEstimate: "French market estimate",
  listingUrl: "Listing URL"
};

export const REQUIRED_INPUT_FIELDS: VehicleFieldKey[] = [
  "purchasePrice",
  "brand",
  "model",
  "year",
  "firstRegistrationDate",
  "mileage",
  "horsepower"
];

export const PARSER_REQUIRED_FIELDS: VehicleFieldKey[] = [
  "purchasePrice",
  "brand",
  "model",
  "year",
  "firstRegistrationDate",
  "mileage",
  "fuelType",
  "transmission",
  "horsepower"
];

export const PARSER_RECOMMENDED_FIELDS: VehicleFieldKey[] = [
  "co2Emissions",
  "transportCost",
  "cocCost",
  "inspectionCost",
  "sellerType",
  "vatStatus"
];

export const PREMIUM_FEATURES = [
  "Unlimited import decisions",
  "Live France comparison providers",
  "Shareable and export-ready report workflows",
  "Richer saved history and operator-grade sourcing"
];

export const ACCOUNT_BENEFITS = [
  "Cloud-saved reports and history",
  "Shareable printable report links",
  "Stronger product access than anonymous mode"
];

export const EMPTY_VEHICLE_INPUT: VehicleInput = {
  purchasePrice: 0,
  countryOfOrigin: "DE",
  brand: "",
  model: "",
  trim: "",
  year: new Date().getFullYear(),
  firstRegistrationDate: "",
  mileage: 0,
  fuelType: "diesel",
  transmission: "automatic",
  horsepower: 0,
  sellerType: "dealer",
  vatStatus: "included",
  transportCost: 0,
  exportPlatesCost: 0,
  cocCost: 0,
  inspectionCost: 0,
  brokerFees: 0,
  frenchMarketEstimate: 0,
  listingUrl: ""
};

export const DEMO_VEHICLE_INPUT: VehicleInput = {
  purchasePrice: 25900,
  countryOfOrigin: "DE",
  brand: "BMW",
  model: "320d",
  trim: "M Sport",
  year: 2021,
  firstRegistrationDate: "2021-06-14",
  mileage: 64000,
  fuelType: "diesel",
  transmission: "automatic",
  horsepower: 190,
  fiscalPower: 10,
  co2Emissions: 128,
  curbWeightKg: 1665,
  sellerType: "dealer",
  vatStatus: "included",
  transportCost: 900,
  exportPlatesCost: 220,
  cocCost: 180,
  inspectionCost: 95,
  brokerFees: 450,
  frenchMarketEstimate: 33200,
  listingUrl: "https://suchen.mobile.de/fahrzeuge/details.html?id=demo-bmw-320d-m-sport-2021"
};
export interface SampleScenario {
  id: string;
  label: string;
  badge: string;
  description: string;
  input: VehicleInput;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: "germany-golf-gtd",
    label: "German Golf GTD",
    badge: "Fast diesel check",
    description: "A familiar Germany-to-France case with CO2, transport, and market assumptions filled.",
    input: {
      purchasePrice: 22400,
      countryOfOrigin: "DE",
      brand: "Volkswagen",
      model: "Golf",
      trim: "GTD",
      year: 2020,
      firstRegistrationDate: "2020-09-18",
      mileage: 72000,
      fuelType: "diesel",
      transmission: "automatic",
      horsepower: 200,
      fiscalPower: 10,
      co2Emissions: 137,
      curbWeightKg: 1515,
      sellerType: "dealer",
      vatStatus: "included",
      transportCost: 850,
      exportPlatesCost: 210,
      cocCost: 160,
      inspectionCost: 95,
      brokerFees: 350,
      frenchMarketEstimate: 28700,
      listingUrl: "https://suchen.mobile.de/fahrzeuge/details.html?id=demo-golf-gtd-2020"
    }
  },
  {
    id: "belgium-tesla-model-3",
    label: "Belgian Model 3",
    badge: "EV import check",
    description: "Shows how low malus and provider confidence affect an electric import decision.",
    input: {
      purchasePrice: 28900,
      countryOfOrigin: "BE",
      brand: "Tesla",
      model: "Model 3",
      trim: "Long Range",
      year: 2021,
      firstRegistrationDate: "2021-11-02",
      mileage: 54000,
      fuelType: "electric",
      transmission: "automatic",
      horsepower: 441,
      fiscalPower: 9,
      co2Emissions: 0,
      curbWeightKg: 1844,
      sellerType: "dealer",
      vatStatus: "included",
      transportCost: 650,
      exportPlatesCost: 180,
      cocCost: 120,
      inspectionCost: 95,
      brokerFees: 450,
      frenchMarketEstimate: 33800,
      listingUrl: "https://www.autoscout24.be/offres/demo-tesla-model-3-long-range"
    }
  },
  {
    id: "italy-mazda-mx5",
    label: "Italian MX-5",
    badge: "Risk visibility",
    description: "A petrol enthusiast case where market confidence and registration details matter.",
    input: {
      purchasePrice: 23800,
      countryOfOrigin: "IT",
      brand: "Mazda",
      model: "MX-5",
      trim: "2.0 Skyactiv-G",
      year: 2019,
      firstRegistrationDate: "2019-05-20",
      mileage: 48000,
      fuelType: "petrol",
      transmission: "manual",
      horsepower: 184,
      fiscalPower: 10,
      co2Emissions: 156,
      curbWeightKg: 1100,
      sellerType: "private",
      vatStatus: "included",
      transportCost: 1100,
      exportPlatesCost: 240,
      cocCost: 190,
      inspectionCost: 120,
      brokerFees: 500,
      frenchMarketEstimate: 31500,
      listingUrl: "https://www.autoscout24.it/annunci/demo-mazda-mx5-2019"
    }
  }
];