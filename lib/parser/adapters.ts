import {
  FIELD_LABELS,
  KNOWN_BRANDS,
  PARSER_RECOMMENDED_FIELDS,
  PARSER_REQUIRED_FIELDS
} from "@/lib/reference-data";
import { HtmlInsights } from "@/lib/parser/html";
import { ListingPlatform, ParserSource, UrlParseResult, VehicleFieldKey, VehicleInput } from "@/types";

export interface ParserAdapter {
  platform: ListingPlatform;
  countryOfOrigin: VehicleInput["countryOfOrigin"];
  matches: (url: URL) => boolean;
  parse: (url: URL, insights?: HtmlInsights) => UrlParseResult;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  return true;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function normalizeTokens(text: string): string[] {
  return decodeURIComponent(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1);
}

function parseLocaleNumber(rawValue: string): number | undefined {
  const normalized = rawValue.replace(/[^0-9,.-]/g, "").replace(/\.(?=.*\.)/g, "").replace(/,/g, ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

function findNestedValue(source: unknown, path: string[]): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function findFirstString(records: Array<Record<string, unknown>>, paths: string[][]): string | undefined {
  for (const record of records) {
    for (const path of paths) {
      const value = findNestedValue(record, path);
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return undefined;
}

function findFirstNumber(records: Array<Record<string, unknown>>, paths: string[][]): number | undefined {
  for (const record of records) {
    for (const path of paths) {
      const value = findNestedValue(record, path);
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value);
      }
      if (typeof value === "string") {
        const parsed = parseLocaleNumber(value);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

function inferBrandModelFromText(text: string): Pick<VehicleInput, "brand" | "model"> {
  const tokens = normalizeTokens(text);
  const brandIndex = tokens.findIndex((token) => KNOWN_BRANDS.includes(token));

  if (brandIndex < 0) {
    return {
      brand: "",
      model: ""
    };
  }

  return {
    brand: toTitleCase(tokens[brandIndex]),
    model: toTitleCase(tokens.slice(brandIndex + 1, brandIndex + 4).join(" "))
  };
}

function extractFuelType(text: string): VehicleInput["fuelType"] | undefined {
  const normalized = text.toLowerCase();
  if (/(plug[ -]?in|phev)/.test(normalized)) return "plug_in_hybrid";
  if (/(hybrid|hybride)/.test(normalized)) return "hybrid";
  if (/(electric|electrique|elektro)/.test(normalized)) return "electric";
  if (/(diesel)/.test(normalized)) return "diesel";
  if (/(essence|petrol|benzin|gasoline)/.test(normalized)) return "petrol";
  if (/(e85|ethanol|flex)/.test(normalized)) return "flex_fuel";
  return undefined;
}

function extractTransmission(text: string): VehicleInput["transmission"] | undefined {
  const normalized = text.toLowerCase();
  if (/(automatic|automatique|automatik|dsg)/.test(normalized)) return "automatic";
  if (/(manual|manuelle|schalt|getriebe)/.test(normalized)) return "manual";
  return undefined;
}

function normalizeFirstRegistration(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (/^20\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const monthYearMatch = trimmed.match(/(0?[1-9]|1[0-2])[./-](20\d{2})/);
  if (monthYearMatch) {
    return `${monthYearMatch[2]}-${monthYearMatch[1].padStart(2, "0")}-01`;
  }

  const yearMatch = trimmed.match(/20\d{2}/);
  if (yearMatch) {
    return `${yearMatch[0]}-01-01`;
  }

  return undefined;
}

function extractDateFromText(text: string): string | undefined {
  const directDate = text.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
  return normalizeFirstRegistration(directDate ?? text.match(/(0?[1-9]|1[0-2])[./-](20\d{2})/)?.[0]);
}

function inferPartialInput(
  url: URL,
  insights: HtmlInsights | undefined,
  countryOfOrigin: VehicleInput["countryOfOrigin"]
): { partialInput: Partial<VehicleInput>; source: ParserSource } {
  const records = insights?.jsonLdRecords ?? [];
  const joinedText = [
    insights?.metaTitle,
    insights?.title,
    insights?.metaDescription,
    insights?.bodyText,
    url.pathname
  ]
    .filter(Boolean)
    .join(" ");

  const jsonLdName = findFirstString(records, [["name"], ["brand", "name"], ["model"]]);
  const titleDerived = inferBrandModelFromText([jsonLdName, joinedText].filter(Boolean).join(" "));
  const tokenDerived = inferBrandModelFromText(`${url.hostname} ${url.pathname}`);

  const partialInput: Partial<VehicleInput> = {
    countryOfOrigin,
    brand: titleDerived.brand || tokenDerived.brand,
    model: titleDerived.model || tokenDerived.model,
    purchasePrice:
      findFirstNumber(records, [["offers", "price"], ["price"], ["offers", "lowPrice"]]) ??
      parseLocaleNumber(joinedText.match(/([0-9][0-9 .,'-]{3,})\s?(?:EUR)?/i)?.[1] ?? ""),
    year:
      findFirstNumber(records, [["vehicleModelDate"], ["modelDate"], ["releaseDate"]]) ??
      (Number(joinedText.match(/\b(20\d{2})\b/)?.[1] ?? 0) || undefined),
    firstRegistrationDate:
      normalizeFirstRegistration(findFirstString(records, [["dateVehicleFirstRegistered"], ["dateCreated"]])) ??
      extractDateFromText(joinedText),
    mileage:
      findFirstNumber(records, [["mileageFromOdometer", "value"], ["mileageFromOdometer"]]) ??
      parseLocaleNumber(joinedText.match(/([0-9][0-9 .,'-]{2,})\s?km/i)?.[1] ?? ""),
    fuelType:
      (findFirstString(records, [["fuelType"]]) as VehicleInput["fuelType"] | undefined) ?? extractFuelType(joinedText),
    transmission:
      (findFirstString(records, [["vehicleTransmission"]]) as VehicleInput["transmission"] | undefined) ?? extractTransmission(joinedText),
    horsepower:
      findFirstNumber(records, [["vehicleEnginePower", "value"], ["vehicleEnginePower"], ["power", "value"]]) ??
      parseLocaleNumber(joinedText.match(/([0-9]{2,4})\s?(?:hp|ch|ps)\b/i)?.[1] ?? ""),
    co2Emissions:
      findFirstNumber(records, [["emissionsCO2", "value"], ["emissionsCO2"]]) ??
      parseLocaleNumber(joinedText.match(/co.?2[^0-9]{0,10}([0-9]{2,3})/i)?.[1] ?? "")
  };

  const source: ParserSource = records.length > 0 && insights?.metaTitle ? "mixed" : records.length > 0 ? "json_ld" : insights ? "html_metadata" : "url_tokens";
  return { partialInput, source };
}

function buildParserResult(
  platform: ListingPlatform,
  partialInput: Partial<VehicleInput>,
  source: ParserSource,
  normalizedUrl: string,
  assumptions: string[]
): UrlParseResult {
  const extractedFields: Array<Exclude<VehicleFieldKey, "countryOfOrigin">> = Object.entries(partialInput)
    .filter(([, value]) => hasValue(value))
    .map(([field]) => field as VehicleFieldKey)
    .filter((field): field is Exclude<VehicleFieldKey, "countryOfOrigin"> => field !== "countryOfOrigin");

  const missingFields = PARSER_REQUIRED_FIELDS.filter((field) => !hasValue(partialInput[field]));
  const recommendedFields = PARSER_RECOMMENDED_FIELDS.filter((field) => !hasValue(partialInput[field]));
  const coreFields: Array<Exclude<VehicleFieldKey, "countryOfOrigin">> = ["purchasePrice", "brand", "model", "year", "mileage"];
  const coreFieldCount = coreFields.filter((field) => extractedFields.includes(field)).length;
  const status =
    extractedFields.length === 0
      ? "failed"
      : coreFieldCount >= 4 && extractedFields.includes("purchasePrice") && extractedFields.includes("brand") && extractedFields.includes("model")
        ? "success"
        : "partial";

  const summary =
    status === "success"
      ? `Parsed a usable ${platform} listing. Only complete the highlighted gaps before simulating.`
      : status === "partial"
        ? `Parsed part of the ${platform} listing. Complete the missing fields to finish the decision.`
        : `Could not reliably extract data from ${platform}. Use the manual form to continue.`;

  return {
    status,
    platform,
    partialInput,
    assumptions,
    summary,
    extractedFields,
    missingFields,
    recommendedFields,
    source,
    normalizedUrl
  };
}

function buildAdapter(platform: ListingPlatform, hostNeedle: string, countryOfOrigin: VehicleInput["countryOfOrigin"]): ParserAdapter {
  return {
    platform,
    countryOfOrigin,
    matches: (url) => url.hostname.includes(hostNeedle),
    parse: (url, insights) => {
      const { partialInput, source } = inferPartialInput(url, insights, countryOfOrigin);
      return buildParserResult(
        platform,
        partialInput,
        source,
        url.toString(),
        [
          "Only public page metadata and JSON-LD were used when available.",
          "Missing fields were left blank on purpose so the app never invents listing data."
        ]
      );
    }
  };
}

export const PARSER_ADAPTERS: ParserAdapter[] = [
  buildAdapter("mobile.de", "mobile.de", "DE"),
  buildAdapter("autoscout24", "autoscout24", "OTHER_EU"),
  buildAdapter("leboncoin", "leboncoin", "FR"),
  buildAdapter("lacentrale", "lacentrale", "FR")
];

export function buildUnsupportedResult(rawUrl: string): UrlParseResult {
  return {
    status: "unsupported",
    platform: "unknown",
    partialInput: {},
    assumptions: ["Supported platforms in this MVP: mobile.de, AutoScout24, Leboncoin, and La Centrale."],
    summary: "Unsupported listing source. Use one of the supported platforms or switch to manual mode.",
    extractedFields: [],
    missingFields: [...PARSER_REQUIRED_FIELDS],
    recommendedFields: [...PARSER_RECOMMENDED_FIELDS],
    source: "none",
    normalizedUrl: rawUrl
  };
}

export function buildFailedResult(rawUrl: string, summary: string, assumptions: string[] = []): UrlParseResult {
  return {
    status: "failed",
    platform: "unknown",
    partialInput: {},
    assumptions,
    summary,
    extractedFields: [],
    missingFields: [...PARSER_REQUIRED_FIELDS],
    recommendedFields: [...PARSER_RECOMMENDED_FIELDS],
    source: "none",
    normalizedUrl: rawUrl
  };
}

export function getParserStatusMessage(result: UrlParseResult): string {
  if (result.status === "success") {
    return `${result.platform} parsed. Review the extracted fields, then run the decision.`;
  }

  if (result.status === "partial") {
    const missingLabel = result.missingFields.slice(0, 3).map((field) => FIELD_LABELS[field]).join(", ");
    return `${result.platform} partially parsed. Complete ${missingLabel || "the missing fields"}.`;
  }

  if (result.status === "unsupported") {
    return "That source is not supported yet. Use a supported URL or the manual form.";
  }

  return "The listing could not be parsed reliably. Use the manual form to finish the decision.";
}






