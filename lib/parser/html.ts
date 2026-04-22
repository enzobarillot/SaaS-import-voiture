export interface HtmlFact {
  label: string;
  value: string;
  source: "definition_list" | "table" | "microdata";
}

export interface HtmlInsights {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaTags: Record<string, string>;
  headings: string[];
  facts: HtmlFact[];
  bodyText: string;
  jsonLdRecords: Array<Record<string, unknown>>;
  embeddedJsonRecords: Array<Record<string, unknown>>;
  extractionLog: string[];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeWhitespace(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractVisibleBodyHtml(html: string): string {
  return html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html.replace(/<head[\s\S]*?<\/head>/i, " ");
}

function textFromHtmlFragment(fragment: string): string {
  return stripHtml(fragment);
}

function extractTagContent(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  const value = match?.[1] ? textFromHtmlFragment(match[1]) : undefined;
  return value || undefined;
}

function extractTagContents(html: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const values: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const value = textFromHtmlFragment(match[1] ?? "");
    if (value) {
      values.push(value);
    }
  }
  return values;
}

function parseAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of rawAttributes.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (key) {
      attributes[key] = normalizeWhitespace(value);
    }
  }
  return attributes;
}

function extractMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1] ?? "");
    const key = attributes.property ?? attributes.name ?? attributes.itemprop ?? attributes["http-equiv"];
    const content = attributes.content;
    if (key && content) {
      tags[key.toLowerCase()] = content;
    }
  }
  return tags;
}

function normalizeJsonLdRecord(value: unknown): Array<Record<string, unknown>> {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeJsonLdRecord(entry));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record["@graph"])) {
    return [record, ...normalizeJsonLdRecord(record["@graph"])];
  }

  return [record];
}

function cleanupJsonText(rawValue: string): string {
  return decodeHtmlEntities(rawValue)
    .replace(/^\s*<!--/, "")
    .replace(/-->\s*$/, "")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .trim()
    .replace(/;\s*$/, "");
}

function extractBalancedJson(value: string): string | undefined {
  const start = value.search(/[\[{]/);
  if (start < 0) {
    return undefined;
  }

  const stack: string[] = [];
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if (char === "}" || char === "]") {
      if (stack.pop() !== char) {
        return undefined;
      }
      if (stack.length === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function safeParseJson(rawValue: string): unknown | undefined {
  const cleaned = cleanupJsonText(rawValue);
  if (!cleaned) {
    return undefined;
  }

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const balanced = extractBalancedJson(cleaned);
    if (!balanced) {
      return undefined;
    }
    try {
      return JSON.parse(balanced) as unknown;
    } catch {
      return undefined;
    }
  }
}

interface ScriptBlock {
  attributes: Record<string, string>;
  content: string;
}

function extractScriptBlocks(html: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    blocks.push({
      attributes: parseAttributes(match[1] ?? ""),
      content: match[2] ?? ""
    });
  }
  return blocks;
}

function extractJsonLdRecords(scripts: ScriptBlock[]): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];

  for (const script of scripts) {
    if (script.attributes.type?.toLowerCase() !== "application/ld+json") {
      continue;
    }

    const parsed = safeParseJson(script.content);
    records.push(...normalizeJsonLdRecord(parsed));
  }

  return records;
}

function extractEmbeddedJsonRecords(scripts: ScriptBlock[]): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  const assignmentPattern =
    /(?:window\.)?(?:__NEXT_DATA__|__INITIAL_STATE__|__APOLLO_STATE__|__PRELOADED_STATE__|initialState|utag_data)\s*=\s*([\s\S]*?)(?:;\s*$|<\/script>|$)/i;

  for (const script of scripts) {
    const type = script.attributes.type?.toLowerCase() ?? "";
    const id = script.attributes.id?.toLowerCase() ?? "";
    const shouldParseWholeScript =
      (type.includes("json") && type !== "application/ld+json") ||
      id === "__next_data__" ||
      id.includes("initial") ||
      id.includes("state") ||
      script.content.trim().startsWith("{") ||
      script.content.trim().startsWith("[");

    if (shouldParseWholeScript) {
      const parsed = safeParseJson(script.content);
      records.push(...normalizeJsonLdRecord(parsed));
    }

    const assignmentMatch = script.content.match(assignmentPattern);
    if (assignmentMatch?.[1]) {
      const parsed = safeParseJson(assignmentMatch[1]);
      records.push(...normalizeJsonLdRecord(parsed));
    }
  }

  return records;
}

function extractDefinitionListFacts(html: string): HtmlFact[] {
  const facts: HtmlFact[] = [];
  const pattern = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = textFromHtmlFragment(match[1] ?? "");
    const value = textFromHtmlFragment(match[2] ?? "");
    if (label && value) {
      facts.push({ label, value, source: "definition_list" });
    }
  }
  return facts;
}

function extractTableFacts(html: string): HtmlFact[] {
  const facts: HtmlFact[] = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from((rowMatch[1] ?? "").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((cellMatch) => textFromHtmlFragment(cellMatch[1] ?? ""))
      .filter(Boolean);

    if (cells.length >= 2) {
      facts.push({ label: cells[0], value: cells[1], source: "table" });
    }
  }
  return facts;
}

function extractMicrodataFacts(html: string): HtmlFact[] {
  const facts: HtmlFact[] = [];
  const pattern = /<([a-z0-9]+)\b([^>]*\sitemprop\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const attributes = parseAttributes(match[2] ?? "");
    const label = attributes.itemprop;
    const value = attributes.content ?? textFromHtmlFragment(match[3] ?? "");
    if (label && value) {
      facts.push({ label, value, source: "microdata" });
    }
  }
  return facts;
}

function uniqueFacts(facts: HtmlFact[]): HtmlFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.label.toLowerCase()}::${fact.value.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildExtractionLog(insights: Omit<HtmlInsights, "extractionLog">): string[] {
  const foundMeta = Object.keys(insights.metaTags).filter((key) =>
    ["og:title", "twitter:title", "description", "og:description", "product:price:amount", "price"].includes(key)
  );

  return [
    `json_ld_records=${insights.jsonLdRecords.length}`,
    `embedded_json_records=${insights.embeddedJsonRecords.length}`,
    `meta_tags=${Object.keys(insights.metaTags).length}`,
    `useful_meta=${foundMeta.length ? foundMeta.join(",") : "none"}`,
    `html_facts=${insights.facts.length}`,
    `headings=${insights.headings.length}`,
    `body_text_chars=${insights.bodyText.length}`
  ];
}

export function extractHtmlInsights(html: string): HtmlInsights {
  const scripts = extractScriptBlocks(html);
  const metaTags = extractMetaTags(html);
  const facts = uniqueFacts([...extractDefinitionListFacts(html), ...extractTableFacts(html), ...extractMicrodataFacts(html)]);
  const insights = {
    title: extractTagContent(html, "title"),
    metaTitle: metaTags["og:title"] ?? metaTags["twitter:title"] ?? metaTags.title,
    metaDescription: metaTags.description ?? metaTags["og:description"] ?? metaTags["twitter:description"],
    metaTags,
    headings: [...extractTagContents(html, "h1"), ...extractTagContents(html, "h2")].slice(0, 12),
    facts,
    bodyText: stripHtml(extractVisibleBodyHtml(html)).slice(0, 20000),
    jsonLdRecords: extractJsonLdRecords(scripts),
    embeddedJsonRecords: extractEmbeddedJsonRecords(scripts)
  };

  return {
    ...insights,
    extractionLog: buildExtractionLog(insights)
  };
}
