export interface HtmlInsights {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  bodyText: string;
  jsonLdRecords: Array<Record<string, unknown>>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagContent(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/\s+/g, " ")?.trim();
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html: string, key: string, attribute: "name" | "property"): string | undefined {
  const pattern = new RegExp(`<meta[^>]+${attribute}=["']${escapeForRegex(key)}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(pattern)?.[1]?.trim();
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

function extractJsonLdRecords(html: string): Array<Record<string, unknown>> {
  const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const records: Array<Record<string, unknown>> = [];

  for (const match of matches) {
    const content = match.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(content) as unknown;
      records.push(...normalizeJsonLdRecord(parsed));
    } catch {
      continue;
    }
  }

  return records;
}

export function extractHtmlInsights(html: string): HtmlInsights {
  return {
    title: extractTagContent(html, "title"),
    metaTitle: extractMetaContent(html, "og:title", "property") ?? extractMetaContent(html, "twitter:title", "name"),
    metaDescription: extractMetaContent(html, "description", "name") ?? extractMetaContent(html, "og:description", "property"),
    bodyText: stripHtml(html).slice(0, 12000),
    jsonLdRecords: extractJsonLdRecords(html)
  };
}

