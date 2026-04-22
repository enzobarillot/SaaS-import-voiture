import {
  FIELD_LABELS,
  KNOWN_BRANDS,
  PARSER_RECOMMENDED_FIELDS,
  PARSER_REQUIRED_FIELDS
} from "@/lib/reference-data";
import { HtmlFact, HtmlInsights } from "@/lib/parser/html";
import { ListingPlatform, ParserSource, UrlParseResult, VehicleFieldKey, VehicleInput } from "@/types";

export interface ParserAdapter {
  platform: ListingPlatform;
  countryOfOrigin: VehicleInput["countryOfOrigin"];
  matches: (url: URL) => boolean;
  parse: (url: URL, insights?: HtmlInsights) => UrlParseResult;
}

type FieldSource =
  | "json_ld"
  | "meta_tags"
  | "html_selectors"
  | "embedded_json"
  | "title_keywords"
  | "url_keywords"
  | "inferred";
type FieldSources = Partial<Record<VehicleFieldKey, FieldSource>>;

interface InferredInput {
  partialInput: Partial<VehicleInput>;
  fieldSources: FieldSources;
  source: ParserSource;
  diagnostics: string[];
}

interface JsonFact {
  label: string;
  value: string;
}

const BRAND_DISPLAY_NAMES: Record<string, string> = {
  bmw: "BMW",
  citroen: "Citroen",
  land: "Land Rover",
  mercedes: "Mercedes-Benz",
  mini: "MINI",
  volkswagen: "Volkswagen"
};

const BRAND_ALIASES = [
  { tokens: ["mercedes", "benz"], brand: "Mercedes-Benz" },
  { tokens: ["land", "rover"], brand: "Land Rover" },
  { tokens: ["vw"], brand: "Volkswagen" },
  ...KNOWN_BRANDS.map((brand) => ({
    tokens: [brand],
    brand: BRAND_DISPLAY_NAMES[brand] ?? toTitleCase(brand)
  }))
].sort((left, right) => right.tokens.length - left.tokens.length);

const MODEL_STOP_WORDS = new Set([
  "ad",
  "annonce",
  "auto",
  "automatique",
  "automatic",
  "automatik",
  "car",
  "cars",
  "diesel",
  "electrique",
  "elektro",
  "essence",
  "eur",
  "euro",
  "hybrid",
  "hybride",
  "km",
  "manual",
  "manuelle",
  "occasion",
  "petrol",
  "preis",
  "price",
  "prix",
  "used",
  "vehicle",
  "vehicule",
  "voiture"
]);

const KEYWORD_NOISE_WORDS = new Set([
  ...MODEL_STOP_WORDS,
  "angebote",
  "annonces",
  "autos",
  "details",
  "fahrzeug",
  "fahrzeuge",
  "france",
  "gebrauchtwagen",
  "html",
  "occasion",
  "offenbach",
  "offers",
  "sale",
  "suchen",
  "vendre",
  "vente"
]);

const TRIM_KEYWORDS = [
  ["amg", "line"],
  ["business", "line"],
  ["edition", "one"],
  ["gt", "line"],
  ["highline"],
  ["initiale", "paris"],
  ["intens"],
  ["life"],
  ["m", "sport"],
  ["r", "line"],
  ["s", "line"],
  ["shine"],
  ["style"],
  ["tekna"],
  ["titanium"],
  ["xcellence"],
  ["allure"],
  ["ambition"],
  ["avantgarde"],
  ["business"],
  ["comfortline"],
  ["exclusive"],
  ["gt"],
  ["iconic"],
  ["premium"],
  ["rs"],
  ["sport"],
  ["techno"],
  ["vignale"]
];

const JSON_TEXT_KEYS = ["name", "label", "displayName", "formattedValue", "displayValue", "value", "text", "title"];
const JSON_NUMBER_KEYS = ["value", "amount", "price", "rawValue", "number", "minValue"];
const SIGNIFICANT_SINGLE_LETTER_TOKENS = new Set(["a", "c", "e", "m", "r", "s"]);

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

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeKey(value: string): string {
  return normalizeForSearch(value).replace(/[^a-z0-9]/g, "");
}

function normalizeTokens(text: string): string[] {
  return normalizeForSearch(decodeURIComponent(text))
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1);
}

function formatModelValue(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => (/^[a-z]+$/i.test(token) ? token.charAt(0).toUpperCase() + token.slice(1) : token))
    .join(" ");
}

function formatTrimValue(tokens: string[]): string | undefined {
  if (tokens.length === 0) {
    return undefined;
  }

  return tokens
    .map((token) => {
      const upper = token.toUpperCase();
      return ["amg", "gt", "m", "r", "rs", "s"].includes(token) ? upper : token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

function findTokenSequence(tokens: string[], sequence: string[], startAt = 0): number {
  for (let index = startAt; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return index;
    }
  }
  return -1;
}

function extractTrimFromTokens(tokens: string[], startAt = 0): { trim?: string; index: number; length: number } {
  for (const sequence of TRIM_KEYWORDS) {
    const index = findTokenSequence(tokens, sequence, startAt);
    if (index >= 0) {
      return {
        trim: formatTrimValue(sequence),
        index,
        length: sequence.length
      };
    }
  }

  return {
    index: -1,
    length: 0
  };
}

function parseLocaleNumber(rawValue: string | number | undefined): number | undefined {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? Math.round(rawValue) : undefined;
  }

  if (!rawValue) {
    return undefined;
  }

  const match = rawValue.replace(/\u00a0/g, " ").match(/\d[\d\s.,']*/);
  if (!match) {
    return undefined;
  }

  let candidate = match[0].replace(/[\s']/g, "");
  const lastComma = candidate.lastIndexOf(",");
  const lastDot = candidate.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    candidate = candidate.replace(new RegExp(`\\${thousandsSeparator}`, "g"), "").replace(decimalSeparator, ".");
  } else {
    const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : undefined;
    if (separator) {
      const parts = candidate.split(separator);
      const lastPart = parts[parts.length - 1] ?? "";
      const looksLikeThousands = lastPart.length === 3 && parts.slice(0, -1).every((part) => part.length > 0 && part.length <= 3);
      candidate = looksLikeThousands ? parts.join("") : candidate.replace(separator, ".");
    }
  }

  const value = Number(candidate);
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

function objectValue(source: Record<string, unknown>, key: string): unknown {
  if (key in source) {
    return source[key];
  }

  const normalizedKey = key.toLowerCase();
  const matchingKey = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalizedKey);
  return matchingKey ? source[matchingKey] : undefined;
}

function collectNestedValues(source: unknown, path: string[]): unknown[] {
  if (!source) {
    return [];
  }

  if (path.length === 0) {
    return [source];
  }

  if (Array.isArray(source)) {
    return source.flatMap((entry) => collectNestedValues(entry, path));
  }

  if (typeof source !== "object") {
    return [];
  }

  const [head, ...tail] = path;
  return collectNestedValues(objectValue(source as Record<string, unknown>, head), tail);
}

function stringFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = stringFromUnknown(entry);
      if (parsed) {
        return parsed;
      }
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of JSON_TEXT_KEYS) {
      const parsed = stringFromUnknown(objectValue(record, key));
      if (parsed) {
        return parsed;
      }
    }
  }

  return undefined;
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    return parseLocaleNumber(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = numberFromUnknown(entry);
      if (parsed) {
        return parsed;
      }
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of JSON_NUMBER_KEYS) {
      const parsed = numberFromUnknown(objectValue(record, key));
      if (parsed) {
        return parsed;
      }
    }
  }

  return undefined;
}

function findFirstString(records: Array<Record<string, unknown>>, paths: string[][]): string | undefined {
  for (const record of records) {
    for (const path of paths) {
      for (const value of collectNestedValues(record, path)) {
        const parsed = stringFromUnknown(value);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

function findFirstNumber(records: Array<Record<string, unknown>>, paths: string[][]): number | undefined {
  for (const record of records) {
    for (const path of paths) {
      for (const value of collectNestedValues(record, path)) {
        const parsed = numberFromUnknown(value);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

function collectDeepValues(source: unknown, keys: Set<string>, values: unknown[], depth = 0): void {
  if (!source || depth > 14 || values.length > 80) {
    return;
  }

  if (Array.isArray(source)) {
    for (const entry of source.slice(0, 300)) {
      collectDeepValues(entry, keys, values, depth + 1);
    }
    return;
  }

  if (typeof source !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (keys.has(normalizeKey(key))) {
      values.push(value);
    }
    collectDeepValues(value, keys, values, depth + 1);
  }
}

function findFirstDeepString(records: Array<Record<string, unknown>>, keys: string[]): string | undefined {
  const values: unknown[] = [];
  const normalizedKeys = new Set(keys.map(normalizeKey));
  records.forEach((record) => collectDeepValues(record, normalizedKeys, values));
  for (const value of values) {
    const parsed = stringFromUnknown(value);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function findFirstDeepNumber(records: Array<Record<string, unknown>>, keys: string[]): number | undefined {
  const values: unknown[] = [];
  const normalizedKeys = new Set(keys.map(normalizeKey));
  records.forEach((record) => collectDeepValues(record, normalizedKeys, values));
  for (const value of values) {
    const parsed = numberFromUnknown(value);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function readDirectString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const parsed = stringFromUnknown(objectValue(record, key));
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function collectJsonFacts(records: Array<Record<string, unknown>>, facts: JsonFact[] = [], depth = 0): JsonFact[] {
  if (depth > 12 || facts.length > 120) {
    return facts;
  }

  for (const record of records) {
    const label = readDirectString(record, ["label", "name", "key", "code", "slug", "attribute", "property"]);
    const value = readDirectString(record, ["value", "displayValue", "formattedValue", "rawValue", "text", "amount"]);
    if (label && value && label !== value && label.length <= 90 && value.length <= 180) {
      facts.push({ label, value });
    }

    for (const entry of Object.values(record)) {
      if (Array.isArray(entry)) {
        collectJsonFacts(entry.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"), facts, depth + 1);
      } else if (entry && typeof entry === "object") {
        collectJsonFacts([entry as Record<string, unknown>], facts, depth + 1);
      }
    }
  }

  return facts;
}

function normalizeBrand(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const inferred = inferBrandModelFromText(value);
  if (inferred.brand) {
    return inferred.brand;
  }

  return toTitleCase(normalizeForSearch(value).replace(/[^a-z0-9]+/g, " ")).trim() || undefined;
}

function cleanModelValue(model: string | undefined, brand: string | undefined): string | undefined {
  if (!model) {
    return undefined;
  }

  let cleaned = normalizeForSearch(model)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(?:19[8-9]\d|20[0-3]\d)\b/g, " ")
    .replace(/\b\d{2,3}(?:\.\d)?\s?(?:kw|hp|ch|ps)\b/g, " ")
    .replace(/\b\d[\d .,'\u00a0]*\s?(?:eur|€|km)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (brand) {
    for (const token of normalizeTokens(brand)) {
      cleaned = cleaned.replace(new RegExp(`^${token}\\b\\s*`), "").trim();
    }
  }

  const tokens = cleaned
    .split(" ")
    .filter((token) => token.length > 0 && !MODEL_STOP_WORDS.has(token))
    .slice(0, 5);

  return tokens.length > 0 ? formatModelValue(tokens.join(" ")) : undefined;
}

function inferBrandModelFromText(text: string): Pick<VehicleInput, "brand" | "model"> {
  const tokens = normalizeTokens(text);

  for (const alias of BRAND_ALIASES) {
    const index = tokens.findIndex((token, tokenIndex) =>
      alias.tokens.every((aliasToken, aliasIndex) => tokens[tokenIndex + aliasIndex] === aliasToken)
    );

    if (index < 0) {
      continue;
    }

    const modelTokens: string[] = [];
    for (const token of tokens.slice(index + alias.tokens.length)) {
      if (/^(?:19[8-9]\d|20[0-3]\d)$/.test(token) || MODEL_STOP_WORDS.has(token)) {
        break;
      }
      if (/^\d{5,}$/.test(token)) {
        break;
      }
      modelTokens.push(token);
      if (modelTokens.length >= 5) {
        break;
      }
    }

    return {
      brand: alias.brand,
      model: formatModelValue(modelTokens.join(" "))
    };
  }

  return {
    brand: "",
    model: ""
  };
}

function normalizeFuelType(text: string | undefined): VehicleInput["fuelType"] | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeForSearch(text);
  if (/(plug[ -]?in|phev|rechargeable|e-hybrid)/.test(normalized)) return "plug_in_hybrid";
  if (/(hybrid|hybride|mhev)/.test(normalized)) return "hybrid";
  if (/(electric|electrique|elektro|ev\b|bev\b)/.test(normalized)) return "electric";
  if (/diesel/.test(normalized)) return "diesel";
  if (/(essence|petrol|benzin|gasoline|super\b|sp95|sp98)/.test(normalized)) return "petrol";
  if (/(e85|ethanol|flex)/.test(normalized)) return "flex_fuel";
  return undefined;
}

function normalizeTransmission(text: string | undefined): VehicleInput["transmission"] | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeForSearch(text);
  if (/(automatic|automatique|automatik|automaat|dsg|s tronic|steptronic|tiptronic|cvt|edc|bva)/.test(normalized)) {
    return "automatic";
  }
  if (/(manual|manuelle|schalt|getriebe|handgeschakeld|bvm)/.test(normalized)) {
    return "manual";
  }
  return undefined;
}

function normalizeSellerType(text: string | undefined): VehicleInput["sellerType"] | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeForSearch(text);
  if (/(private|particulier|privat)/.test(normalized)) return "private";
  if (/(dealer|professional|professionnel|pro\b|handler|haendler|autohaus|garage)/.test(normalized)) return "dealer";
  return undefined;
}

function normalizeVatStatus(text: string | undefined): VehicleInput["vatStatus"] | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeForSearch(text);
  if (/(recoverable|deductible|recuperable|mwst ausweisbar|tva recuperable)/.test(normalized)) return "recoverable";
  if (/(excluded|hors taxe|ht\b|netto|plus vat|plus tva)/.test(normalized)) return "excluded";
  if (/(included|ttc|incl|inkl|vat included|tva incluse)/.test(normalized)) return "included";
  return undefined;
}

function normalizeFirstRegistration(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const trimmed = rawValue.trim();
  const isoDate = trimmed.match(/\b((?:19|20)\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;
  }

  const dayMonthYear = trimmed.match(/\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-]((?:19|20)\d{2})\b/);
  if (dayMonthYear) {
    return `${dayMonthYear[3]}-${dayMonthYear[2].padStart(2, "0")}-${dayMonthYear[1].padStart(2, "0")}`;
  }

  const monthYearMatch = trimmed.match(/\b(0?[1-9]|1[0-2])[./-]((?:19|20)\d{2})\b/);
  if (monthYearMatch) {
    return `${monthYearMatch[2]}-${monthYearMatch[1].padStart(2, "0")}-01`;
  }

  const yearMatch = trimmed.match(/\b(?:19|20)\d{2}\b/);
  if (yearMatch) {
    return `${yearMatch[0]}-01-01`;
  }

  return undefined;
}

function extractDateFromText(text: string): string | undefined {
  const labeledDate = text.match(
    /(?:first registration|registration date|datevehiclefirstregistered|mise en circulation|immatriculation|erstzulassung|\bez\b)[^0-9]{0,40}((?:[0-3]?\d[./-])?(?:0?[1-9]|1[0-2])[./-](?:19|20)\d{2}|(?:19|20)\d{2}-[01]?\d-[0-3]?\d)/i
  )?.[1];
  return normalizeFirstRegistration(labeledDate);
}

function extractYearFromText(text: string): number | undefined {
  const year = Number(text.match(/\b(19[8-9]\d|20[0-3]\d)\b/)?.[1] ?? 0);
  return year > 0 ? year : undefined;
}

function extractPriceFromText(text: string): number | undefined {
  const patterns = [
    /(?:price|prix|preis|kaufpreis|vehicle price)[^0-9]{0,40}([0-9][0-9 .,'\u00a0]{2,})/i,
    /(?:€|eur)\s*([0-9][0-9 .,'\u00a0]{2,})/i,
    /([0-9][0-9 .,'\u00a0]{2,})\s*(?:€|eur)\b/i
  ];

  for (const pattern of patterns) {
    const value = parseLocaleNumber(text.match(pattern)?.[1]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractMileageFromText(text: string): number | undefined {
  const patterns = [
    /([0-9][0-9 .,'\u00a0]{1,})\s*[-_]\s*(?:km|kms)\b/i,
    /(?:mileage|kilometrage|kilométrage|kilometerstand|km stand)[^0-9]{0,40}([0-9][0-9 .,'\u00a0]{1,})/i,
    /([0-9][0-9 .,'\u00a0]{1,})\s*(?:km|kilometers|kilometres|kilomètres)\b/i
  ];

  for (const pattern of patterns) {
    const value = parseLocaleNumber(text.match(pattern)?.[1]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractHorsepowerFromText(text: string | undefined): number | undefined {
  if (!text) {
    return undefined;
  }

  const hpValue = parseLocaleNumber(text.match(/([0-9]{2,4})\s*(?:hp|ch|ps)\b/i)?.[1]);
  if (hpValue) {
    return hpValue;
  }

  const kwValue = parseLocaleNumber(text.match(/([0-9]{2,3})\s*kw\b/i)?.[1]);
  return kwValue ? Math.round(kwValue * 1.35962) : undefined;
}

function extractCo2FromText(text: string): number | undefined {
  return parseLocaleNumber(text.match(/(?:co(?:2|\u2082)|emissions?)[^0-9]{0,30}([0-9]{2,3})/i)?.[1]);
}

function extractWeightFromText(text: string): number | undefined {
  return parseLocaleNumber(text.match(/(?:weight|poids|masse|leergewicht)[^0-9]{0,30}([0-9][0-9 .,'\u00a0]{2,})\s*(?:kg)?/i)?.[1]);
}

function applyField(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  field: VehicleFieldKey,
  value: unknown,
  source: FieldSource
): void {
  if (!hasValue(value) || hasValue(partialInput[field])) {
    return;
  }

  (partialInput as Record<VehicleFieldKey, unknown>)[field] = value;
  fieldSources[field] = source;
}

function applyIdentity(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  brand: string | undefined,
  model: string | undefined,
  source: FieldSource
): void {
  const normalizedBrand = normalizeBrand(brand);
  applyField(partialInput, fieldSources, "brand", normalizedBrand, source);
  applyField(partialInput, fieldSources, "model", cleanModelValue(model, normalizedBrand ?? partialInput.brand), source);
}

function applyIdentityFromText(partialInput: Partial<VehicleInput>, fieldSources: FieldSources, text: string, source: FieldSource): void {
  const inferred = inferBrandModelFromText(text);
  applyIdentity(partialInput, fieldSources, inferred.brand, inferred.model, source);
}

function safeDecodeUrlPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isTechnicalNumericSegment(segment: string): boolean {
  const normalized = safeDecodeUrlPart(segment).trim();
  return /^\d{5,}$/.test(normalized);
}

function isContextualQueryKey(key: string): boolean {
  return /brand|make|model|trim|version|year|fuel|energie|energy|transmission|gearbox|boite|mileage|kilometrage|km|power|puissance|hp|ch|ps|kw/i.test(key);
}

function isTechnicalQueryKey(key: string): boolean {
  return /^(?:ad|adid|annonce|classified|id|listing|listingid|offer|offerid|page|ref|search|sort|utm_.+)$/i.test(key);
}

function getUsefulUrlText(url: URL): string {
  const pathSegments = url.pathname
    .split("/")
    .map((segment) => safeDecodeUrlPart(segment).trim())
    .filter((segment) => segment.length > 0 && !isTechnicalNumericSegment(segment));
  const searchValues = Array.from(url.searchParams.entries())
    .filter(([key, value]) => value.length <= 120 && !isTechnicalQueryKey(key))
    .filter(([key, value]) => isContextualQueryKey(key) || /[a-z]/i.test(value))
    .map(([key, value]) => `${key} ${value}`);

  return [...pathSegments, ...searchValues]
    .join(" ")
    .replace(/\.[a-z0-9]{2,5}\b/gi, " ")
    .replace(/[_+/=]/g, " ");
}

function isYearToken(token: string): boolean {
  return /^(?:19[8-9]\d|20[0-3]\d)$/.test(token);
}

function isMileageOrPowerToken(token: string): boolean {
  return /^\d{2,6}(?:km|kms|ch|hp|ps|kw)$/.test(token) || /^(?:km|kms|ch|hp|ps|kw)$/.test(token);
}

function shouldStopModelKeyword(token: string): boolean {
  return (
    isYearToken(token) ||
    isMileageOrPowerToken(token) ||
    KEYWORD_NOISE_WORDS.has(token) ||
    Boolean(normalizeFuelType(token)) ||
    Boolean(normalizeTransmission(token))
  );
}

function cleanKeywordTokens(rawText: string): string[] {
  return normalizeForSearch(decodeURIComponent(rawText))
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.replace(/^0+(?=\d)/, ""))
    .filter((token) => (token.length > 1 || SIGNIFICANT_SINGLE_LETTER_TOKENS.has(token)) && !/^\d{5,}$/.test(token) && !KEYWORD_NOISE_WORDS.has(token));
}

function inferKeywordInputFromText(rawText: string): Partial<VehicleInput> {
  const tokens = cleanKeywordTokens(rawText);
  const normalizedText = normalizeForSearch(decodeURIComponent(rawText)).replace(/[^a-z0-9]+/g, " ");
  const partialInput: Partial<VehicleInput> = {};

  for (const alias of BRAND_ALIASES) {
    const brandIndex = findTokenSequence(tokens, alias.tokens);
    if (brandIndex < 0) {
      continue;
    }

    const afterBrandIndex = brandIndex + alias.tokens.length;
    const trimMatch = extractTrimFromTokens(tokens, afterBrandIndex);
    const modelTokens: string[] = [];

    for (let index = afterBrandIndex; index < tokens.length; index += 1) {
      if (trimMatch.index === index) {
        break;
      }

      const token = tokens[index];
      if (!token || shouldStopModelKeyword(token)) {
        break;
      }

      modelTokens.push(token);
      if (modelTokens.length >= 5) {
        break;
      }
    }

    partialInput.brand = alias.brand;
    if (modelTokens.length > 0) {
      partialInput.model = formatModelValue(modelTokens.join(" "));
    }
    if (trimMatch.trim) {
      partialInput.trim = trimMatch.trim;
    }
    break;
  }

  partialInput.fuelType = normalizeFuelType(normalizedText);
  partialInput.transmission = normalizeTransmission(normalizedText);
  partialInput.year = extractYearFromText(normalizedText);
  partialInput.horsepower = extractHorsepowerFromText(rawText);
  partialInput.mileage = extractMileageFromText(rawText);

  if (!partialInput.trim) {
    const trimMatch = extractTrimFromTokens(tokens);
    partialInput.trim = trimMatch.trim;
  }

  return partialInput;
}

function applyKeywordFallback(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  rawText: string | undefined,
  source: "title_keywords" | "url_keywords"
): void {
  if (!rawText?.trim()) {
    return;
  }

  const inferred = inferKeywordInputFromText(rawText);
  for (const [field, value] of Object.entries(inferred) as Array<[VehicleFieldKey, VehicleInput[VehicleFieldKey]]>) {
    applyField(partialInput, fieldSources, field, value, source);
  }
}

function findFactValue(facts: Array<HtmlFact | JsonFact>, include: RegExp[], exclude: RegExp[] = []): string | undefined {
  for (const fact of facts) {
    const label = normalizeForSearch(fact.label);
    if (include.some((pattern) => pattern.test(label)) && !exclude.some((pattern) => pattern.test(label))) {
      return fact.value;
    }
  }
  return undefined;
}

function applyTextExtraction(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  text: string,
  source: FieldSource,
  includeIdentity = true,
  allowLooseYear = true
): void {
  if (!text.trim()) {
    return;
  }

  if (includeIdentity) {
    applyIdentityFromText(partialInput, fieldSources, text, source);
  }

  applyField(partialInput, fieldSources, "purchasePrice", extractPriceFromText(text), source);
  applyField(partialInput, fieldSources, "firstRegistrationDate", extractDateFromText(text), source);
  applyField(partialInput, fieldSources, "mileage", extractMileageFromText(text), source);
  applyField(partialInput, fieldSources, "fuelType", normalizeFuelType(text), source);
  applyField(partialInput, fieldSources, "transmission", normalizeTransmission(text), source);
  applyField(partialInput, fieldSources, "horsepower", extractHorsepowerFromText(text), source);
  applyField(partialInput, fieldSources, "co2Emissions", extractCo2FromText(text), source);
  applyField(partialInput, fieldSources, "curbWeightKg", extractWeightFromText(text), source);

  const firstRegistrationYear = partialInput.firstRegistrationDate ? extractYearFromText(partialInput.firstRegistrationDate) : undefined;
  applyField(partialInput, fieldSources, "year", firstRegistrationYear ?? (allowLooseYear ? extractYearFromText(text) : undefined), source);
}

function applyFactsExtraction(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  facts: Array<HtmlFact | JsonFact>,
  source: FieldSource
): void {
  if (facts.length === 0) {
    return;
  }

  applyIdentity(
    partialInput,
    fieldSources,
    findFactValue(facts, [/^brand$|^make$|marque|marke|constructeur/]),
    findFactValue(facts, [/^model$|modele|modell/]),
    source
  );

  applyField(partialInput, fieldSources, "trim", findFactValue(facts, [/trim|version|finition|variant|configuration/]), source);
  applyField(partialInput, fieldSources, "purchasePrice", parseLocaleNumber(findFactValue(facts, [/price|prix|preis|kaufpreis/])), source);
  applyField(partialInput, fieldSources, "year", parseLocaleNumber(findFactValue(facts, [/^year$|annee|jahr|model year|millésime|millesime/])), source);
  applyField(partialInput, fieldSources, "mileage", parseLocaleNumber(findFactValue(facts, [/mileage|kilometrage|kilometerstand|odometer/])), source);
  applyField(partialInput, fieldSources, "firstRegistrationDate", normalizeFirstRegistration(findFactValue(facts, [/first registration|registration date|mise en circulation|immatriculation|erstzulassung|\bez\b/])), source);
  applyField(partialInput, fieldSources, "fuelType", normalizeFuelType(findFactValue(facts, [/fuel|carburant|energie|kraftstoff/])), source);
  applyField(partialInput, fieldSources, "transmission", normalizeTransmission(findFactValue(facts, [/transmission|gearbox|boite|boîte|getriebe/])), source);
  applyField(partialInput, fieldSources, "horsepower", extractHorsepowerFromText(findFactValue(facts, [/power|puissance|leistung/], [/fiscal|fiscale/])), source);
  applyField(partialInput, fieldSources, "fiscalPower", parseLocaleNumber(findFactValue(facts, [/puissance fiscale|fiscal power|cv fiscaux/])), source);
  applyField(partialInput, fieldSources, "co2Emissions", parseLocaleNumber(findFactValue(facts, [/co2|co₂|emission/])), source);
  applyField(partialInput, fieldSources, "curbWeightKg", parseLocaleNumber(findFactValue(facts, [/weight|poids|masse|leergewicht/])), source);
  applyField(partialInput, fieldSources, "sellerType", normalizeSellerType(findFactValue(facts, [/seller|vendeur|anbieter/])), source);
  applyField(partialInput, fieldSources, "vatStatus", normalizeVatStatus(findFactValue(facts, [/vat|tva|mwst/])), source);

  if (!partialInput.year && partialInput.firstRegistrationDate) {
    applyField(partialInput, fieldSources, "year", extractYearFromText(partialInput.firstRegistrationDate), source);
  }

  const factText = facts.map((fact) => `${fact.label}: ${fact.value}`).join(" ");
  applyTextExtraction(partialInput, fieldSources, factText, source, false, false);
}

function applyStructuredRecords(
  partialInput: Partial<VehicleInput>,
  fieldSources: FieldSources,
  records: Array<Record<string, unknown>>,
  source: FieldSource,
  deep = false
): void {
  if (records.length === 0) {
    return;
  }

  const stringValue = (paths: string[][], deepKeys: string[] = []) =>
    findFirstString(records, paths) ?? (deep ? findFirstDeepString(records, deepKeys) : undefined);
  const numberValue = (paths: string[][], deepKeys: string[] = []) =>
    findFirstNumber(records, paths) ?? (deep ? findFirstDeepNumber(records, deepKeys) : undefined);

  const brand = stringValue(
    [["brand", "name"], ["manufacturer", "name"], ["vehicleMake", "name"], ["brand"], ["make"]],
    ["brand", "make", "manufacturer", "vehicleMake"]
  );
  const model = stringValue([["model", "name"], ["vehicleModel", "name"], ["model"], ["vehicleModel"]], ["model", "modelName", "vehicleModel"]);
  const listingName = stringValue([["name"], ["headline"], ["title"]], ["headline", "title", "name"]);
  applyIdentity(partialInput, fieldSources, brand, model, source);
  if (listingName) {
    applyIdentityFromText(partialInput, fieldSources, listingName, source);
  }

  applyField(
    partialInput,
    fieldSources,
    "purchasePrice",
    numberValue(
      [["offers", "price"], ["offers", "priceSpecification", "price"], ["offers", "priceSpecification", "value"], ["priceSpecification", "price"], ["price"]],
      ["price", "priceAmount", "grossPrice", "consumerPrice", "sellingPrice", "vehiclePrice"]
    ),
    source
  );

  const firstRegistration = stringValue(
    [["dateVehicleFirstRegistered"], ["firstRegistrationDate"], ["vehicleFirstRegistrationDate"], ["firstRegistration"], ["registrationDate"]],
    ["dateVehicleFirstRegistered", "firstRegistrationDate", "vehicleFirstRegistrationDate", "firstRegistration", "registrationDate", "regDate"]
  );
  applyField(partialInput, fieldSources, "firstRegistrationDate", normalizeFirstRegistration(firstRegistration), source);

  applyField(
    partialInput,
    fieldSources,
    "year",
    numberValue([["vehicleModelDate"], ["modelDate"], ["productionDate"], ["modelYear"], ["year"]], ["vehicleModelDate", "modelDate", "modelYear", "year"]) ??
      (partialInput.firstRegistrationDate ? extractYearFromText(partialInput.firstRegistrationDate) : undefined),
    source
  );

  applyField(
    partialInput,
    fieldSources,
    "mileage",
    numberValue([["mileageFromOdometer", "value"], ["mileageFromOdometer"], ["mileage", "value"], ["mileage"]], ["mileageFromOdometer", "mileage", "kilometers", "kilometres", "km"]),
    source
  );

  applyField(partialInput, fieldSources, "fuelType", normalizeFuelType(stringValue([["fuelType"], ["fuel"]], ["fuelType", "fuel", "energy", "energie"])), source);
  applyField(
    partialInput,
    fieldSources,
    "transmission",
    normalizeTransmission(stringValue([["vehicleTransmission"], ["transmission"], ["transmissionType"]], ["vehicleTransmission", "transmission", "gearbox"])),
    source
  );

  const powerText = stringValue(
    [["vehicleEngine", "enginePower"], ["vehicleEnginePower"], ["enginePower"], ["power"]],
    ["vehicleEnginePower", "enginePower", "horsepower", "power"]
  );
  applyField(
    partialInput,
    fieldSources,
    "horsepower",
    extractHorsepowerFromText(powerText) ??
      numberValue([["vehicleEngine", "enginePower", "value"], ["vehicleEnginePower", "value"], ["enginePower", "value"], ["horsepower"]], ["horsepower", "powerHp", "ps", "ch"]),
    source
  );

  applyField(
    partialInput,
    fieldSources,
    "co2Emissions",
    numberValue([["emissionsCO2", "value"], ["emissionsCO2"], ["co2Emissions"], ["co2"]], ["emissionsCO2", "co2Emissions", "co2"]),
    source
  );

  applyField(partialInput, fieldSources, "sellerType", normalizeSellerType(stringValue([["seller", "type"], ["sellerType"]], ["sellerType", "seller"])), source);
  applyField(partialInput, fieldSources, "vatStatus", normalizeVatStatus(stringValue([["vatStatus"], ["taxDeductible"], ["vat"]], ["vatStatus", "taxDeductible", "vat", "mwst", "tva"])), source);
  applyField(partialInput, fieldSources, "trim", stringValue([["vehicleConfiguration"], ["trim"], ["version"]], ["vehicleConfiguration", "trim", "version", "finition"]), source);
  applyField(partialInput, fieldSources, "curbWeightKg", numberValue([["weight", "value"], ["weight"], ["curbWeight"]], ["curbWeight", "weightKg", "emptyWeight"]), source);
}

function applyMetaExtraction(partialInput: Partial<VehicleInput>, fieldSources: FieldSources, insights: HtmlInsights): void {
  const meta = insights.metaTags;
  const priceMeta =
    meta["product:price:amount"] ??
    meta["og:price:amount"] ??
    meta["twitter:data1"] ??
    meta.price ??
    meta["price:amount"];

  applyField(partialInput, fieldSources, "purchasePrice", parseLocaleNumber(priceMeta), "meta_tags");

  const metaText = [
    insights.metaTitle,
    insights.metaDescription,
    meta["og:description"],
    meta["twitter:description"],
    meta["product:brand"],
    meta["product:condition"],
    priceMeta
  ]
    .filter(Boolean)
    .join(" ");

  applyTextExtraction(partialInput, fieldSources, metaText, "meta_tags");
}

function applyHtmlExtraction(partialInput: Partial<VehicleInput>, fieldSources: FieldSources, insights: HtmlInsights): void {
  applyFactsExtraction(partialInput, fieldSources, insights.facts, "html_selectors");
  applyTextExtraction(partialInput, fieldSources, insights.headings.join(" "), "html_selectors", true, true);
  applyTextExtraction(partialInput, fieldSources, insights.bodyText, "html_selectors", false, false);
}

function isWeakKeywordSource(source: FieldSource | undefined): boolean {
  return source === "title_keywords" || source === "url_keywords" || source === "inferred";
}

function chooseParserSource(fieldSources: FieldSources, insights: HtmlInsights | undefined): ParserSource {
  const sources = new Set(Object.values(fieldSources).filter((source) => !isWeakKeywordSource(source)));
  const hasUrlKeywords = Object.values(fieldSources).includes("url_keywords");
  const hasTitleKeywords = Object.values(fieldSources).includes("title_keywords");
  if (sources.size === 0) {
    return hasUrlKeywords && !hasTitleKeywords ? "url_tokens" : insights ? "html_metadata" : "url_tokens";
  }
  if (sources.size === 1 && sources.has("json_ld")) {
    return "json_ld";
  }
  if (sources.has("json_ld") && sources.size > 1) {
    return "mixed";
  }
  return "html_metadata";
}

function buildDiagnostics(fieldSources: FieldSources, partialInput: Partial<VehicleInput>, insights: HtmlInsights | undefined): string[] {
  const extracted = Object.entries(fieldSources)
    .filter(([field, source]) => !isWeakKeywordSource(source) && hasValue(partialInput[field as VehicleFieldKey]))
    .map(([field, source]) => `found:${field}:${source}`);
  const inferred = Object.entries(fieldSources)
    .filter(([field, source]) => isWeakKeywordSource(source) && field !== "countryOfOrigin" && hasValue(partialInput[field as VehicleFieldKey]))
    .map(([field, source]) => `inferred:${field}:${source}`);
  const missing = PARSER_REQUIRED_FIELDS.filter((field) => !hasValue(partialInput[field])).map((field) => `missing:${field}`);
  return [...(insights?.extractionLog ?? []), ...extracted, ...inferred, ...missing];
}

function inferPartialInput(
  url: URL,
  insights: HtmlInsights | undefined,
  countryOfOrigin: VehicleInput["countryOfOrigin"]
): InferredInput {
  const partialInput: Partial<VehicleInput> = {
    countryOfOrigin
  };
  const fieldSources: FieldSources = {
    countryOfOrigin: "inferred"
  };

  if (insights) {
    applyStructuredRecords(partialInput, fieldSources, insights.jsonLdRecords, "json_ld");
    applyMetaExtraction(partialInput, fieldSources, insights);
    applyStructuredRecords(partialInput, fieldSources, insights.embeddedJsonRecords, "embedded_json", true);
    applyFactsExtraction(partialInput, fieldSources, collectJsonFacts(insights.embeddedJsonRecords), "embedded_json");
    applyHtmlExtraction(partialInput, fieldSources, insights);
    applyKeywordFallback(partialInput, fieldSources, insights.title, "title_keywords");
  }

  applyKeywordFallback(partialInput, fieldSources, getUsefulUrlText(url), "url_keywords");

  const source = chooseParserSource(fieldSources, insights);
  return {
    partialInput,
    fieldSources,
    source,
    diagnostics: buildDiagnostics(fieldSources, partialInput, insights)
  };
}

function buildParserResult(
  platform: ListingPlatform,
  partialInput: Partial<VehicleInput>,
  source: ParserSource,
  normalizedUrl: string,
  assumptions: string[],
  fieldSources: FieldSources,
  diagnostics: string[]
): UrlParseResult {
  const extractedFields: VehicleFieldKey[] = Object.entries(partialInput)
    .filter(([field, value]) => field !== "countryOfOrigin" && !isWeakKeywordSource(fieldSources[field as VehicleFieldKey]) && hasValue(value))
    .map(([field]) => field as VehicleFieldKey);
  const inferredFields: VehicleFieldKey[] = Object.entries(partialInput)
    .filter(([field, value]) => field !== "countryOfOrigin" && isWeakKeywordSource(fieldSources[field as VehicleFieldKey]) && hasValue(value))
    .map(([field]) => field as VehicleFieldKey);

  const missingFields = PARSER_REQUIRED_FIELDS.filter((field) => !hasValue(partialInput[field]));
  const recommendedFields = PARSER_RECOMMENDED_FIELDS.filter((field) => !hasValue(partialInput[field]));
  const reliableCoreFields: VehicleFieldKey[] = ["purchasePrice", "brand", "model", "year", "firstRegistrationDate", "mileage", "horsepower"];
  const hasKeywordFallback = inferredFields.length > 0;
  const requiredInferredFields = PARSER_REQUIRED_FIELDS.filter((field) => inferredFields.includes(field));
  const reliableCoreCount = reliableCoreFields.filter((field) => extractedFields.includes(field)).length;
  const hasIdentity = extractedFields.includes("brand") && extractedFields.includes("model");
  const hasPrice = extractedFields.includes("purchasePrice");
  const status =
    source === "url_tokens"
      ? "insufficient"
      : extractedFields.length === 0
        ? hasKeywordFallback
          ? "insufficient"
          : "failed"
        : missingFields.length === 0 && requiredInferredFields.length === 0
          ? "success"
          : hasIdentity && hasPrice && reliableCoreCount >= 4
            ? "partial"
            : "insufficient";

  const summary =
    status === "success"
      ? `Imported a usable ${platform} listing. Review trust-critical fields before relying on the verdict.`
      : status === "partial"
        ? `Imported reliable values from ${platform}, but highlighted fields still need confirmation.`
        : status === "failed"
          ? `Supported ${platform} URL, but no useful listing data could be extracted from the fetched page.`
          : hasKeywordFallback
            ? `Supported ${platform} URL. Some fields were inferred from the title or URL and must be confirmed.`
            : `Supported ${platform} URL, but not enough reliable data was found. Complete the form manually.`;
  const enrichedAssumptions =
    inferredFields.length > 0
      ? [...assumptions, "Fields inferred from the page title or URL slug are weak signals and should be reviewed."]
      : assumptions;

  return {
    status,
    platform,
    partialInput,
    assumptions: enrichedAssumptions,
    summary,
    extractedFields,
    inferredFields,
    missingFields,
    recommendedFields,
    source,
    normalizedUrl,
    diagnostics
  };
}

function hostMatches(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function buildAdapter(platform: ListingPlatform, domains: string[], countryOfOrigin: VehicleInput["countryOfOrigin"]): ParserAdapter {
  return {
    platform,
    countryOfOrigin,
    matches: (url) => hostMatches(url.hostname, domains),
    parse: (url, insights) => {
      const { partialInput, fieldSources, source, diagnostics } = inferPartialInput(url, insights, countryOfOrigin);
      return buildParserResult(
        platform,
        partialInput,
        source,
        url.toString(),
        [
          "Only public page metadata and JSON-LD were used when available.",
          "Missing fields were left blank on purpose so the app never invents listing data."
        ],
        fieldSources,
        diagnostics
      );
    }
  };
}

export const PARSER_ADAPTERS: ParserAdapter[] = [
  buildAdapter("mobile.de", ["mobile.de"], "DE"),
  buildAdapter(
    "autoscout24",
    ["autoscout24.com", "autoscout24.fr", "autoscout24.de", "autoscout24.be", "autoscout24.nl", "autoscout24.it", "autoscout24.es", "autoscout24.lu"],
    "OTHER_EU"
  ),
  buildAdapter("leboncoin", ["leboncoin.fr"], "FR"),
  buildAdapter("lacentrale", ["lacentrale.fr"], "FR")
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
    normalizedUrl: rawUrl,
    diagnostics: ["domain:unsupported"]
  };
}

export function buildFailedResult(
  rawUrl: string,
  summary: string,
  assumptions: string[] = [],
  platform: ListingPlatform = "unknown",
  diagnostics: string[] = []
): UrlParseResult {
  return {
    status: "failed",
    platform,
    partialInput: {},
    assumptions,
    summary,
    extractedFields: [],
    missingFields: [...PARSER_REQUIRED_FIELDS],
    recommendedFields: [...PARSER_RECOMMENDED_FIELDS],
    source: "none",
    normalizedUrl: rawUrl,
    diagnostics
  };
}

export function getParserStatusMessage(result: UrlParseResult): string {
  if (result.status === "success") {
    return `${result.platform} parsed. Review the trust-critical fields, then run the decision.`;
  }

  if (result.status === "partial") {
    const missingLabel = result.missingFields.slice(0, 3).map((field) => FIELD_LABELS[field]).join(", ");
    return `${result.platform} partially parsed. Complete ${missingLabel || "the missing fields"}.`;
  }

  if (result.status === "insufficient") {
    return "Supported source, but the listing did not expose enough reliable data. Complete the highlighted fields.";
  }

  if (result.status === "unsupported") {
    return "That source is not supported yet. Use a supported URL or the manual form.";
  }

  return "The listing could not be parsed reliably. Use the manual form to finish the decision.";
}
