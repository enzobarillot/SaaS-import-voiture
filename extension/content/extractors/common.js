(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  const REQUIRED_FIELDS = ["brand", "model", "purchasePrice", "year", "firstRegistrationDate", "mileage", "fuelType", "transmission", "horsepower"];
  const FIELD_KEYS = new Set(["brand", "model", "trim", "purchasePrice", "year", "firstRegistrationDate", "mileage", "fuelType", "transmission", "horsepower", "fiscalPower", "co2Emissions", "sellerType", "vatStatus", "countryOfOrigin", "listingUrl"]);
  const KNOWN_BRANDS = ["audi", "bmw", "citroen", "cupra", "dacia", "fiat", "ford", "hyundai", "jaguar", "jeep", "kia", "land", "lexus", "mazda", "mercedes", "mini", "nissan", "opel", "peugeot", "porsche", "renault", "saab", "seat", "skoda", "tesla", "toyota", "volkswagen", "volvo"];
  const BRAND_DISPLAY = { bmw: "BMW", citroen: "Citroen", land: "Land Rover", mercedes: "Mercedes-Benz", mini: "MINI", volkswagen: "Volkswagen" };
  const BRAND_ALIASES = [
    { tokens: ["mercedes", "benz"], brand: "Mercedes-Benz" },
    { tokens: ["land", "rover"], brand: "Land Rover" },
    { tokens: ["vw"], brand: "Volkswagen" },
    ...KNOWN_BRANDS.map((brand) => ({ tokens: [brand], brand: BRAND_DISPLAY[brand] ?? toTitleCase(brand) }))
  ].sort((left, right) => right.tokens.length - left.tokens.length);
  const NOISE_WORDS = new Set(["ad", "annonce", "auto", "automatique", "automatic", "automatik", "car", "cars", "details", "diesel", "electrique", "elektro", "essence", "eur", "euro", "fahrzeuge", "html", "hybrid", "hybride", "km", "manual", "manuelle", "occasion", "offres", "petrol", "price", "prix", "voiture", "voitures"]);
  const TRIM_KEYWORDS = [["amg", "line"], ["gt", "line"], ["m", "sport"], ["r", "line"], ["s", "line"], ["initiale", "paris"], ["allure"], ["business"], ["exclusive"], ["gt"], ["intens"], ["life"], ["premium"], ["rs"], ["sport"], ["techno"]];
  const SINGLE_LETTERS = new Set(["a", "c", "e", "m", "r", "s"]);

  function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function compact(value) {
    return value.replace(/\s+/g, " ").trim();
  }
  function toTitleCase(value) {
    return value.split(" ").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }
  function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    if (typeof value !== "string") return undefined;
    const match = value.replace(/\u00a0/g, " ").match(/\d[\d\s.,']*/);
    if (!match) return undefined;
    let candidate = match[0].replace(/[\s']/g, "");
    const comma = candidate.lastIndexOf(",");
    const dot = candidate.lastIndexOf(".");
    if (comma >= 0 && dot >= 0) {
      const decimal = comma > dot ? "," : ".";
      const thousands = decimal === "," ? "." : ",";
      candidate = candidate.replace(new RegExp(`\\${thousands}`, "g"), "").replace(decimal, ".");
    } else {
      const separator = comma >= 0 ? "," : dot >= 0 ? "." : "";
      if (separator) {
        const parts = candidate.split(separator);
        const last = parts[parts.length - 1] ?? "";
        candidate = last.length === 3 ? parts.join("") : candidate.replace(separator, ".");
      }
    }
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }
  function applyField(fields, field, value) {
    if (!FIELD_KEYS.has(field) || fields[field] !== undefined || value === undefined || value === null || value === "") return;
    if (typeof value === "number" && value <= 0) return;
    fields[field] = value;
  }
  function objectValue(source, key) {
    if (key in source) return source[key];
    const lower = key.toLowerCase();
    const actual = Object.keys(source).find((candidate) => candidate.toLowerCase() === lower);
    return actual ? source[actual] : undefined;
  }
  function collectPath(source, path) {
    if (!source) return [];
    if (path.length === 0) return [source];
    if (Array.isArray(source)) return source.flatMap((entry) => collectPath(entry, path));
    if (typeof source !== "object") return [];
    const [head, ...tail] = path;
    return collectPath(objectValue(source, head), tail);
  }
  function stringify(value) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (Array.isArray(value)) return value.map(stringify).find(Boolean);
    if (value && typeof value === "object") {
      for (const key of ["name", "label", "displayName", "value", "text", "title"]) {
        const found = stringify(objectValue(value, key));
        if (found) return found;
      }
    }
    return undefined;
  }
  function firstString(records, paths) {
    for (const record of records) {
      for (const path of paths) {
        for (const value of collectPath(record, path)) {
          const parsed = stringify(value);
          if (parsed) return parsed;
        }
      }
    }
    return undefined;
  }
  function firstNumber(records, paths) {
    for (const record of records) {
      for (const path of paths) {
        for (const value of collectPath(record, path)) {
          const parsed = parseNumber(stringify(value) ?? value);
          if (parsed) return parsed;
        }
      }
    }
    return undefined;
  }
  function normalizeFuel(text) {
    if (!text) return undefined;
    const value = normalize(text);
    if (/(plug[ -]?in|phev|rechargeable|e-hybrid)/.test(value)) return "plug_in_hybrid";
    if (/(hybrid|hybride|mhev)/.test(value)) return "hybrid";
    if (/(electric|electrique|elektro|bev\b|ev\b)/.test(value)) return "electric";
    if (/diesel/.test(value)) return "diesel";
    if (/(essence|petrol|benzin|gasoline|sp95|sp98)/.test(value)) return "petrol";
    if (/(e85|ethanol|flex)/.test(value)) return "flex_fuel";
    return undefined;
  }
  function normalizeTransmission(text) {
    if (!text) return undefined;
    const value = normalize(text);
    if (/(automatic|automatique|automatik|dsg|s tronic|bva|edc|cvt)/.test(value)) return "automatic";
    if (/(manual|manuelle|schalt|getriebe|bvm)/.test(value)) return "manual";
    return undefined;
  }
  function normalizeSeller(text) {
    if (!text) return undefined;
    const value = normalize(text);
    if (/(private|particulier|privat)/.test(value)) return "private";
    if (/(dealer|professional|professionnel|autohaus|garage|handler)/.test(value)) return "dealer";
    return undefined;
  }
  function normalizeVat(text) {
    if (!text) return undefined;
    const value = normalize(text);
    if (/(recoverable|deductible|recuperable|mwst ausweisbar|tva recuperable)/.test(value)) return "recoverable";
    if (/(excluded|hors taxe|ht\b|netto|plus vat|plus tva)/.test(value)) return "excluded";
    if (/(included|ttc|incl|inkl|vat included|tva incluse)/.test(value)) return "included";
    return undefined;
  }
  function normalizeDate(text) {
    if (!text) return undefined;
    const iso = text.match(/\b((?:19|20)\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    const dayMonthYear = text.match(/\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-]((?:19|20)\d{2})\b/);
    if (dayMonthYear) return `${dayMonthYear[3]}-${dayMonthYear[2].padStart(2, "0")}-${dayMonthYear[1].padStart(2, "0")}`;
    const monthYear = text.match(/\b(0?[1-9]|1[0-2])[./-]((?:19|20)\d{2})\b/);
    if (monthYear) return `${monthYear[2]}-${monthYear[1].padStart(2, "0")}-01`;
    const year = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
    return year ? `${year[1]}-01-01` : undefined;
  }
  function yearFromText(text) {
    const year = Number(text?.match(/\b(19[8-9]\d|20[0-3]\d)\b/)?.[1] ?? 0);
    return year > 0 ? year : undefined;
  }
  function priceFromText(text) {
    if (!text) return undefined;
    return parseNumber(text.match(/(?:price|prix|preis|kaufpreis)[^0-9]{0,40}([0-9][0-9 .,'\u00a0]{2,})/i)?.[1]) ??
      parseNumber(text.match(/([0-9][0-9 .,'\u00a0]{2,})\s*(?:eur|€)\b/i)?.[1]);
  }
  function mileageFromText(text) {
    if (!text) return undefined;
    return parseNumber(text.match(/([0-9][0-9 .,'\u00a0]{1,})\s*[-_]?\s*(?:km|kms|kilometers|kilometres)\b/i)?.[1]) ??
      parseNumber(text.match(/(?:mileage|kilometrage|kilometerstand)[^0-9]{0,40}([0-9][0-9 .,'\u00a0]{1,})/i)?.[1]);
  }
  function horsepowerFromText(text) {
    if (!text) return undefined;
    const hp = parseNumber(text.match(/([0-9]{2,4})\s*[-_]?\s*(?:hp|ch|ps)\b/i)?.[1]);
    if (hp) return hp;
    const kw = parseNumber(text.match(/([0-9]{2,3})\s*[-_]?\s*kw\b/i)?.[1]);
    return kw ? Math.round(kw * 1.35962) : undefined;
  }
  function co2FromText(text) {
    return parseNumber(text?.match(/(?:co2|emissions?)[^0-9]{0,30}([0-9]{2,3})/i)?.[1]);
  }
  function formatModel(tokens) {
    return tokens.map((token) => (/^[a-z]+$/i.test(token) ? token.charAt(0).toUpperCase() + token.slice(1) : token)).join(" ");
  }
  function findSequence(tokens, sequence, startAt = 0) {
    for (let index = startAt; index <= tokens.length - sequence.length; index += 1) {
      if (sequence.every((token, offset) => tokens[index + offset] === token)) return index;
    }
    return -1;
  }
  function trimFromTokens(tokens, startAt = 0) {
    for (const sequence of TRIM_KEYWORDS) {
      const index = findSequence(tokens, sequence, startAt);
      if (index >= 0) {
        return {
          trim: sequence.map((token) => (["amg", "gt", "m", "r", "rs", "s"].includes(token) ? token.toUpperCase() : toTitleCase(token))).join(" "),
          index
        };
      }
    }
    return { index: -1 };
  }
  function keywordTokens(text) {
    return normalize(safeDecode(text)).replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean).map((token) => token.replace(/^0+(?=\d)/, "")).filter((token) => (token.length > 1 || SINGLE_LETTERS.has(token)) && !/^\d{5,}$/.test(token) && !NOISE_WORDS.has(token));
  }
  function inferFromKeywords(text) {
    const fields = {};
    const tokens = keywordTokens(text);
    const normalized = normalize(safeDecode(text)).replace(/[^a-z0-9]+/g, " ");
    for (const alias of BRAND_ALIASES) {
      const brandIndex = findSequence(tokens, alias.tokens);
      if (brandIndex < 0) continue;
      const start = brandIndex + alias.tokens.length;
      const trim = trimFromTokens(tokens, start);
      const modelTokens = [];
      for (let index = start; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!token || trim.index === index || yearFromText(token) || NOISE_WORDS.has(token) || normalizeFuel(token) || normalizeTransmission(token)) break;
        modelTokens.push(token);
        if (modelTokens.length >= 5) break;
      }
      fields.brand = alias.brand;
      if (modelTokens.length) fields.model = formatModel(modelTokens);
      if (trim.trim) fields.trim = trim.trim;
      break;
    }
    applyField(fields, "purchasePrice", priceFromText(text));
    applyField(fields, "year", yearFromText(normalized));
    applyField(fields, "mileage", mileageFromText(text));
    applyField(fields, "fuelType", normalizeFuel(normalized));
    applyField(fields, "transmission", normalizeTransmission(normalized));
    applyField(fields, "horsepower", horsepowerFromText(text));
    if (!fields.trim) applyField(fields, "trim", trimFromTokens(tokens).trim);
    return fields;
  }
  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  function usefulUrlText(url) {
    const segments = url.pathname.split("/").map((segment) => safeDecode(segment).trim()).filter((segment) => segment.length > 0 && !/^\d{5,}$/.test(segment));
    const params = Array.from(url.searchParams.entries()).filter(([key, value]) => value.length <= 120 && !/^(?:id|ad|adid|listing|listingid|offer|offerid|ref|utm_.+)$/i.test(key)).filter(([key, value]) => /brand|make|model|trim|year|fuel|transmission|mileage|km|power|hp|ch|ps|kw/i.test(key) || /[a-z]/i.test(value)).map(([key, value]) => `${key} ${value}`);
    return [...segments, ...params].join(" ").replace(/\.[a-z0-9]{2,5}\b/gi, " ").replace(/[_+/=]/g, " ");
  }
  function jsonLdRecords() {
    const records = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const parsed = JSON.parse(script.textContent?.trim() || "null");
        records.push(...normalizeRecords(parsed));
      } catch {}
    });
    return records;
  }
  function normalizeRecords(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(normalizeRecords);
    if (typeof value !== "object") return [];
    return Array.isArray(value["@graph"]) ? [value, ...normalizeRecords(value["@graph"])] : [value];
  }
  function metaTags() {
    const tags = {};
    document.querySelectorAll("meta").forEach((meta) => {
      const key = meta.getAttribute("property") || meta.getAttribute("name") || meta.getAttribute("itemprop");
      const content = meta.getAttribute("content");
      if (key && content) tags[key.toLowerCase()] = compact(content);
    });
    return tags;
  }
  function factsFromDom(config) {
    const facts = [];
    document.querySelectorAll("dt").forEach((dt) => {
      const dd = dt.nextElementSibling;
      if (dd?.tagName.toLowerCase() === "dd") facts.push({ label: compact(dt.textContent || ""), value: compact(dd.textContent || "") });
    });
    document.querySelectorAll("tr").forEach((row) => {
      const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => compact(cell.textContent || "")).filter(Boolean);
      if (cells.length >= 2) facts.push({ label: cells[0], value: cells[1] });
    });
    for (const selector of config.factSelectors ?? []) {
      document.querySelectorAll(selector).forEach((node) => {
        const text = compact(node.textContent || "");
        const parts = text.split(/[:\n]/).map(compact).filter(Boolean);
        if (parts.length >= 2) facts.push({ label: parts[0], value: parts.slice(1).join(" ") });
      });
    }
    return facts.filter((fact) => fact.label && fact.value && fact.label !== fact.value);
  }
  function applyText(fields, text, includeIdentity) {
    if (!text.trim()) return;
    if (includeIdentity) {
      const identity = inferFromKeywords(text);
      applyField(fields, "brand", identity.brand);
      applyField(fields, "model", identity.model);
      applyField(fields, "trim", identity.trim);
    }
    applyField(fields, "purchasePrice", priceFromText(text));
    applyField(fields, "firstRegistrationDate", normalizeDate(text));
    applyField(fields, "year", yearFromText(text));
    applyField(fields, "mileage", mileageFromText(text));
    applyField(fields, "fuelType", normalizeFuel(text));
    applyField(fields, "transmission", normalizeTransmission(text));
    applyField(fields, "horsepower", horsepowerFromText(text));
    applyField(fields, "co2Emissions", co2FromText(text));
  }
  function applyFacts(fields, facts) {
    for (const fact of facts) {
      const label = normalize(fact.label);
      const text = `${fact.label}: ${fact.value}`;
      if (/brand|make|marque|marke/.test(label)) applyField(fields, "brand", toTitleCase(normalize(fact.value).replace(/[^a-z0-9]+/g, " ")));
      if (/model|modele|modell/.test(label)) applyField(fields, "model", toTitleCase(normalize(fact.value).replace(/[^a-z0-9]+/g, " ")));
      if (/trim|version|finition|variant/.test(label)) applyField(fields, "trim", fact.value);
      if (/price|prix|preis|kaufpreis/.test(label)) applyField(fields, "purchasePrice", parseNumber(fact.value));
      if (/year|annee|jahr|millesime/.test(label)) applyField(fields, "year", parseNumber(fact.value));
      if (/mileage|kilometrage|kilometerstand|odometer/.test(label)) applyField(fields, "mileage", parseNumber(fact.value));
      if (/first registration|registration date|mise en circulation|immatriculation|erstzulassung/.test(label)) applyField(fields, "firstRegistrationDate", normalizeDate(fact.value));
      if (/fuel|carburant|energie|kraftstoff/.test(label)) applyField(fields, "fuelType", normalizeFuel(fact.value));
      if (/transmission|gearbox|boite|getriebe/.test(label)) applyField(fields, "transmission", normalizeTransmission(fact.value));
      if (/power|puissance|leistung/.test(label) && !/fiscal/.test(label)) applyField(fields, "horsepower", horsepowerFromText(fact.value));
      if (/fiscal power|puissance fiscale|cv fiscaux/.test(label)) applyField(fields, "fiscalPower", parseNumber(fact.value));
      if (/co2|emission/.test(label)) applyField(fields, "co2Emissions", parseNumber(fact.value));
      if (/seller|vendeur|anbieter/.test(label)) applyField(fields, "sellerType", normalizeSeller(fact.value));
      if (/vat|tva|mwst/.test(label)) applyField(fields, "vatStatus", normalizeVat(fact.value));
      applyText(fields, text, false);
    }
  }
  function extractStructured(fields, records) {
    const name = firstString(records, [["name"], ["headline"], ["title"]]);
    const brand = firstString(records, [["brand", "name"], ["manufacturer", "name"], ["brand"], ["make"]]);
    const model = firstString(records, [["model", "name"], ["model"], ["vehicleModel"]]);
    if (brand) applyField(fields, "brand", inferFromKeywords(brand).brand ?? brand);
    if (model) applyField(fields, "model", model);
    if (name) applyText(fields, name, true);
    applyField(fields, "purchasePrice", firstNumber(records, [["offers", "price"], ["offers", "priceSpecification", "price"], ["price"]]));
    applyField(fields, "year", firstNumber(records, [["vehicleModelDate"], ["modelDate"], ["modelYear"], ["year"]]));
    applyField(fields, "firstRegistrationDate", normalizeDate(firstString(records, [["dateVehicleFirstRegistered"], ["firstRegistrationDate"], ["registrationDate"]])));
    applyField(fields, "mileage", firstNumber(records, [["mileageFromOdometer", "value"], ["mileageFromOdometer"], ["mileage", "value"], ["mileage"]]));
    applyField(fields, "fuelType", normalizeFuel(firstString(records, [["fuelType"], ["fuel"]])));
    applyField(fields, "transmission", normalizeTransmission(firstString(records, [["vehicleTransmission"], ["transmission"], ["transmissionType"]])));
    const powerText = firstString(records, [["vehicleEnginePower"], ["vehicleEnginePower", "value"], ["enginePower"], ["power"]]);
    applyField(fields, "horsepower", horsepowerFromText(powerText) ?? firstNumber(records, [["horsepower"]]));
    applyField(fields, "co2Emissions", firstNumber(records, [["emissionsCO2", "value"], ["emissionsCO2"], ["co2Emissions"], ["co2"]]));
  }
  function selectedText(selectors = []) {
    return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).map((node) => compact(node.textContent || "")).filter(Boolean).join(" ");
  }
  function extractGeneric(config) {
    const confirmed = {};
    const inferred = { countryOfOrigin: config.countryOfOrigin, listingUrl: location.href };
    const messages = [];
    extractStructured(confirmed, jsonLdRecords());
    const meta = metaTags();
    applyField(confirmed, "purchasePrice", parseNumber(meta["product:price:amount"] ?? meta["og:price:amount"] ?? meta.price));
    applyText(confirmed, [meta["og:title"], meta["twitter:title"], meta.description, meta["og:description"]].filter(Boolean).join(" "), true);
    applyFacts(confirmed, factsFromDom(config));
    applyText(confirmed, selectedText([...(config.priceSelectors ?? []), ...(config.mileageSelectors ?? []), "h1"]), true);
    for (const [field, value] of Object.entries(inferFromKeywords(document.title))) {
      if (confirmed[field] === undefined) applyField(inferred, field, value);
    }
    for (const [field, value] of Object.entries(inferFromKeywords(usefulUrlText(new URL(location.href))))) {
      if (confirmed[field] === undefined && inferred[field] === undefined) applyField(inferred, field, value);
    }
    const usableConfirmed = Object.keys(confirmed).filter((field) => field !== "listingUrl" && field !== "countryOfOrigin");
    const usableInferred = Object.keys(inferred).filter((field) => field !== "listingUrl" && field !== "countryOfOrigin");
    const missingCriticalFields = REQUIRED_FIELDS.filter((field) => confirmed[field] === undefined && inferred[field] === undefined);
    const confirmedRequiredMissing = REQUIRED_FIELDS.filter((field) => confirmed[field] === undefined);
    let status = "failed";
    if (confirmedRequiredMissing.length === 0) status = "success";
    else if (usableConfirmed.length > 0 || usableInferred.length >= 2) status = "partial";
    if (status !== "success" && usableConfirmed.length === 0) messages.push("Only weak title or URL fallback data was available.");
    return {
      source: config.source,
      status,
      confirmedFields: confirmed,
      inferredFields: inferred,
      missingCriticalFields,
      diagnostics: {
        domain: location.hostname,
        title: document.title,
        extractedFieldCount: usableConfirmed.length,
        messages
      }
    };
  }
  function unsupportedPayload() {
    return {
      source: "unknown",
      status: "unsupported_source",
      confirmedFields: {},
      inferredFields: { listingUrl: location.href },
      missingCriticalFields: [...REQUIRED_FIELDS],
      diagnostics: {
        domain: location.hostname,
        title: document.title,
        extractedFieldCount: 0,
        messages: ["This domain is not supported by the ImportScore extension."]
      }
    };
  }
  root.common = { extractGeneric, unsupportedPayload };
})();
