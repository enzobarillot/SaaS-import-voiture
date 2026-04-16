import {
  DEFAULT_FISCAL_RATE,
  FIXED_REGISTRATION_FEE,
  LEGAL_REFERENCE_LABEL
} from "@/lib/reference-data";
import {
  CostBreakdown,
  CostLine,
  MalusComputation,
  RegistrationComputation,
  SimulationContext,
  VatComputation,
  VehicleInput
} from "@/types";

const CO2_MALUS_2024: Record<number, number> = {
  118: 50,
  119: 75,
  120: 100,
  121: 125,
  122: 150,
  123: 170,
  124: 190,
  125: 210,
  126: 230,
  127: 240,
  128: 260,
  129: 280,
  130: 310,
  131: 330,
  132: 360,
  133: 400,
  134: 450,
  135: 540,
  136: 650,
  137: 740,
  138: 818,
  139: 898,
  140: 983,
  141: 1074,
  142: 1172,
  143: 1276,
  144: 1386,
  145: 1504,
  146: 1629,
  147: 1761,
  148: 1901,
  149: 2049,
  150: 2205,
  151: 2370,
  152: 2544,
  153: 2726,
  154: 2918,
  155: 3119,
  156: 3331,
  157: 3552,
  158: 3784,
  159: 4026,
  160: 4279,
  161: 4543,
  162: 4818,
  163: 5105,
  164: 5404,
  165: 5715,
  166: 6126,
  167: 6537,
  168: 7248,
  169: 7959,
  170: 8770,
  171: 9681,
  172: 10692,
  173: 11803,
  174: 13014,
  175: 14325,
  176: 15736,
  177: 17247,
  178: 18858,
  179: 20569,
  180: 22380,
  181: 24291,
  182: 26302,
  183: 28413,
  184: 30624,
  185: 32935,
  186: 35346,
  187: 37857,
  188: 40468,
  189: 43179,
  190: 45990,
  191: 48901,
  192: 51912,
  193: 55023
};

const CO2_MALUS_2025: Record<number, number> = {
  113: 50,
  114: 75,
  115: 100,
  116: 125,
  117: 150,
  118: 170,
  119: 190,
  120: 210,
  121: 230,
  122: 240,
  123: 260,
  124: 280,
  125: 310,
  126: 330,
  127: 360,
  128: 400,
  129: 450,
  130: 540,
  131: 650,
  132: 740,
  133: 818,
  134: 898,
  135: 983,
  136: 1074,
  137: 1172,
  138: 1276,
  139: 1386,
  140: 1504,
  141: 1629,
  142: 1761,
  143: 1901,
  144: 2049,
  145: 2205,
  146: 2370,
  147: 2544,
  148: 2726,
  149: 2918,
  150: 3119,
  151: 3331,
  152: 3552,
  153: 3784,
  154: 4026,
  155: 4279,
  156: 4543,
  157: 4818,
  158: 5105,
  159: 5404,
  160: 5715,
  161: 6126,
  162: 6537,
  163: 7248,
  164: 7959,
  165: 8770,
  166: 9681,
  167: 10692,
  168: 11803,
  169: 13014,
  170: 14325,
  171: 15736,
  172: 17247,
  173: 18858,
  174: 20569,
  175: 22380,
  176: 24291,
  177: 26302,
  178: 28413,
  179: 30624,
  180: 32935,
  181: 35346,
  182: 37857,
  183: 40468,
  184: 43179,
  185: 45990,
  186: 48901,
  187: 51912,
  188: 55023,
  189: 58134,
  190: 61245,
  191: 64356,
  192: 67467
};

const POWER_MALUS_2025: Record<number, number> = {
  3: 250,
  4: 1500,
  5: 4000,
  6: 6250,
  7: 8500,
  8: 13000,
  9: 18500,
  10: 25750,
  11: 32250,
  12: 39750,
  13: 48000,
  14: 57250
};

const MASS_BANDS_2024_2025 = [
  { from: 1600, to: 1799, rate: 10 },
  { from: 1800, to: 1899, rate: 15 },
  { from: 1900, to: 1999, rate: 20 },
  { from: 2000, to: 2099, rate: 25 },
  { from: 2100, to: Infinity, rate: 30 }
];

const AGE_DISCOUNT = [
  { maxMonths: 3, percent: 3 },
  { maxMonths: 6, percent: 6 },
  { maxMonths: 9, percent: 9 },
  { maxMonths: 12, percent: 12 },
  { maxMonths: 18, percent: 16 },
  { maxMonths: 24, percent: 20 },
  { maxMonths: 36, percent: 28 },
  { maxMonths: 48, percent: 33 },
  { maxMonths: 60, percent: 38 },
  { maxMonths: 72, percent: 43 },
  { maxMonths: 84, percent: 48 },
  { maxMonths: 96, percent: 53 },
  { maxMonths: 108, percent: 58 },
  { maxMonths: 120, percent: 64 },
  { maxMonths: 132, percent: 70 },
  { maxMonths: 144, percent: 76 },
  { maxMonths: 156, percent: 82 },
  { maxMonths: 168, percent: 88 },
  { maxMonths: 180, percent: 94 },
  { maxMonths: Infinity, percent: 100 }
];

function asNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function clampCurrency(value: number): number {
  return Math.max(0, Math.round(value));
}

function resolveEvaluationDate(context?: SimulationContext): Date {
  if (!context?.evaluationDate) {
    return new Date();
  }

  return context.evaluationDate instanceof Date ? context.evaluationDate : new Date(context.evaluationDate);
}

function monthsSince(dateString: string, context?: SimulationContext): number {
  if (!dateString) {
    return 0;
  }

  const date = new Date(dateString);
  const now = resolveEvaluationDate(context);
  const months = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
  return Math.max(0, months);
}

function getAgeDiscountPercent(firstRegistrationDate: string, context?: SimulationContext): number {
  if (!firstRegistrationDate) {
    return 0;
  }

  const year = new Date(firstRegistrationDate).getFullYear();
  if (year < 2015) {
    return 100;
  }

  const months = monthsSince(firstRegistrationDate, context);
  return AGE_DISCOUNT.find((band) => months <= band.maxMonths)?.percent ?? 0;
}

function estimateFiscalPower(input: VehicleInput): number {
  if (input.fiscalPower && input.fiscalPower > 0) {
    return input.fiscalPower;
  }

  if (!input.horsepower) {
    return 6;
  }

  return Math.max(4, Math.round(input.horsepower / 18));
}

function getCo2Table(firstRegistrationDate: string): { table: Record<number, number>; label: string; threshold: number; cap: number } {
  const firstRegistration = firstRegistrationDate ? new Date(firstRegistrationDate) : null;
  const pivot = new Date("2025-03-01");

  if (firstRegistration && firstRegistration >= pivot) {
    return {
      table: CO2_MALUS_2025,
      label: "WLTP table from 1 March 2025",
      threshold: 113,
      cap: 70000
    };
  }

  return {
    table: CO2_MALUS_2024,
    label: "WLTP table from 1 January 2024 to 28 February 2025",
    threshold: 118,
    cap: 60000
  };
}

function computeCo2RawMalus(input: VehicleInput, notes: string[]): number {
  const { table, threshold, label, cap } = getCo2Table(input.firstRegistrationDate);
  notes.push(`${LEGAL_REFERENCE_LABEL}. ${label} selected from first registration date.`);

  if (input.fuelType === "electric") {
    notes.push("Electric vehicles are treated as exempt from CO2 malus.");
    return 0;
  }

  if (typeof input.co2Emissions === "number" && input.co2Emissions >= 0) {
    const adjustedCo2 =
      input.fuelType === "flex_fuel" && input.co2Emissions <= 250
        ? Math.round(input.co2Emissions * 0.6)
        : input.co2Emissions;

    if (adjustedCo2 < threshold) {
      return 0;
    }

    if (adjustedCo2 > Math.max(...Object.keys(table).map(Number))) {
      return cap;
    }

    return table[adjustedCo2] ?? 0;
  }

  const fiscalPowerUsed = input.fiscalPower ?? estimateFiscalPower(input);
  notes.push("CO2 data missing, so the engine fell back to the fiscal power malus table.");
  return POWER_MALUS_2025[fiscalPowerUsed] ?? (fiscalPowerUsed >= 15 ? 70000 : 0);
}

function computeMassRawMalus(input: VehicleInput, notes: string[]): number {
  const weight = asNumber(input.curbWeightKg);
  if (!weight) {
    notes.push("Vehicle mass missing, so no weight malus was added.");
    return 0;
  }

  if (input.fuelType === "electric") {
    notes.push("Electric vehicles are treated as exempt from weight malus.");
    return 0;
  }

  let total = 0;

  for (const band of MASS_BANDS_2024_2025) {
    if (weight < band.from) {
      continue;
    }

    const upperBound = Math.min(weight, band.to);
    total += (upperBound - band.from + 1) * band.rate;
  }

  notes.push("Weight malus uses the 2024-2025 marginal table from Service-Public.");
  return clampCurrency(total);
}

export function computeImportCost(input: VehicleInput): CostLine[] {
  return [
    { key: "purchase", label: "Purchase price", amount: asNumber(input.purchasePrice) },
    { key: "transport", label: "Transport to France", amount: asNumber(input.transportCost) },
    { key: "export", label: "Export plates", amount: asNumber(input.exportPlatesCost) },
    { key: "coc", label: "COC / conformity file", amount: asNumber(input.cocCost) },
    { key: "inspection", label: "Inspection / technical control", amount: asNumber(input.inspectionCost) },
    { key: "broker", label: "Broker fees", amount: asNumber(input.brokerFees) }
  ];
}

export function computeVAT(input: VehicleInput, context?: SimulationContext): VatComputation {
  const monthsOld = monthsSince(input.firstRegistrationDate, context);
  const isNewVehicleForVat = Boolean(input.firstRegistrationDate) && (monthsOld < 6 || asNumber(input.mileage) < 6000);

  if (isNewVehicleForVat) {
    return {
      amount: clampCurrency(input.purchasePrice * 0.2),
      recoverableAmount: 0,
      reason: "Vehicle qualifies as new in the EU VAT rules: under 6 months old or under 6,000 km."
    };
  }

  if (input.sellerType === "private") {
    return {
      amount: 0,
      recoverableAmount: 0,
      reason: "Used vehicle bought from a private seller: no extra French VAT estimated."
    };
  }

  if (input.vatStatus === "excluded") {
    return {
      amount: clampCurrency(input.purchasePrice * 0.2),
      recoverableAmount: 0,
      reason: "Price entered ex-VAT. The engine adds French VAT at 20%."
    };
  }

  if (input.vatStatus === "recoverable") {
    return {
      amount: 0,
      recoverableAmount: clampCurrency(input.purchasePrice * 0.2),
      reason: "Recoverable VAT case. Exposure is shown separately and excluded from the net landed cost.",
      assumption: "This assumes the buyer can legally recover VAT."
    };
  }

  return {
    amount: 0,
    recoverableAmount: 0,
    reason: "VAT assumed already handled in the listing price."
  };
}

export function computeRegistrationCost(input: VehicleInput): RegistrationComputation {
  const assumptions: string[] = [];
  const fiscalPowerUsed = estimateFiscalPower(input);

  if (!input.fiscalPower) {
    assumptions.push("Fiscal power was estimated from horsepower because it was not provided.");
  }

  assumptions.push("Regional tax is estimated with a national benchmark of 55 EUR per fiscal CV.");

  const regionalTax = clampCurrency(fiscalPowerUsed * DEFAULT_FISCAL_RATE);
  const amount = clampCurrency(regionalTax + FIXED_REGISTRATION_FEE);

  return {
    amount,
    regionalTax,
    fiscalPowerUsed,
    fiscalRateUsed: DEFAULT_FISCAL_RATE,
    fixedFees: FIXED_REGISTRATION_FEE,
    assumptions
  };
}

export function computeMalus(input: VehicleInput, context?: SimulationContext): MalusComputation {
  const notes: string[] = [];
  const discountPercent = getAgeDiscountPercent(input.firstRegistrationDate, context);

  if (discountPercent === 100) {
    notes.push("First registration before 1 January 2015: imported used vehicle treated as fully discounted.");
  }

  const co2RawMalus = computeCo2RawMalus(input, notes);
  const massRawMalus = computeMassRawMalus(input, notes);
  const multiplier = 1 - discountPercent / 100;
  const co2Malus = clampCurrency(co2RawMalus * multiplier);
  const massMalus = clampCurrency(massRawMalus * multiplier);
  const totalCap = input.firstRegistrationDate && new Date(input.firstRegistrationDate) >= new Date("2025-03-01") ? 70000 : 60000;
  const total = Math.min(totalCap, co2Malus + massMalus);

  if (discountPercent > 0 && discountPercent < 100) {
    notes.push(`Imported used vehicle age discount applied: ${discountPercent}% reduction.`);
  }

  return {
    co2Malus,
    massMalus,
    total,
    referenceLabel: LEGAL_REFERENCE_LABEL,
    notes
  };
}

export function computeTotalCost(input: VehicleInput, context?: SimulationContext): CostBreakdown {
  const lines = computeImportCost(input);
  const importSubtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const vat = computeVAT(input, context);
  const registration = computeRegistrationCost(input);
  const malus = computeMalus(input, context);
  const total = clampCurrency(importSubtotal + vat.amount + registration.amount + malus.total);
  const assumptions = [
    ...registration.assumptions,
    ...malus.notes,
    ...(vat.assumption ? [vat.assumption] : [])
  ];

  return {
    lines,
    importSubtotal,
    vat,
    registration,
    malus,
    total,
    assumptions
  };
}

