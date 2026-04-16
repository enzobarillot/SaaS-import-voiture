import { buildFailedResult, buildUnsupportedResult, getParserStatusMessage, PARSER_ADAPTERS } from "@/lib/parser/adapters";
import { extractHtmlInsights } from "@/lib/parser/html";
import { ListingPlatform, UrlParseResult } from "@/types";

export interface ParserService {
  detectPlatform: (rawUrl: string) => ListingPlatform;
  parseListingUrl: (rawUrl: string) => UrlParseResult;
  parseListingHtml: (rawUrl: string, html: string) => UrlParseResult;
  ingestListingUrl: (rawUrl: string) => Promise<UrlParseResult>;
}

function getAdapter(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return {
      url,
      adapter: PARSER_ADAPTERS.find((candidate) => candidate.matches(url))
    };
  } catch {
    return {
      url: null,
      adapter: undefined
    };
  }
}

export function detectPlatform(rawUrl: string): ListingPlatform {
  const { adapter } = getAdapter(rawUrl);
  return adapter?.platform ?? "unknown";
}

export function parseListingUrl(rawUrl: string): UrlParseResult {
  const { url, adapter } = getAdapter(rawUrl);

  if (!url) {
    return buildFailedResult(rawUrl, "Invalid URL. Paste a full listing URL to activate the parser.");
  }

  if (!adapter) {
    return buildUnsupportedResult(rawUrl);
  }

  return adapter.parse(url);
}

export function parseListingHtml(rawUrl: string, html: string): UrlParseResult {
  const { url, adapter } = getAdapter(rawUrl);

  if (!url) {
    return buildFailedResult(rawUrl, "Invalid URL. Paste a full listing URL to activate the parser.");
  }

  if (!adapter) {
    return buildUnsupportedResult(rawUrl);
  }

  const insights = extractHtmlInsights(html);
  return adapter.parse(url, insights);
}

export async function ingestListingUrl(rawUrl: string): Promise<UrlParseResult> {
  const preflight = parseListingUrl(rawUrl);
  if (preflight.status === "unsupported" || preflight.status === "failed") {
    return preflight;
  }

  try {
    const response = await fetch(rawUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ImportScoreBot/1.0; +https://importscore.local)"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return {
        ...preflight,
        assumptions: [...preflight.assumptions, `Live fetch returned HTTP ${response.status}, so only URL-level extraction is available.`],
        summary: getParserStatusMessage(preflight)
      };
    }

    const html = await response.text();
    const parsed = parseListingHtml(rawUrl, html);
    if (parsed.status === "failed") {
      return {
        ...preflight,
        assumptions: [...preflight.assumptions, "Public page metadata was not rich enough, so only URL-level extraction could be used."],
        summary: getParserStatusMessage(preflight)
      };
    }

    return parsed;
  } catch {
    return {
      ...preflight,
      assumptions: [...preflight.assumptions, "Live parsing failed, so the parser fell back to URL-level extraction only."],
      summary: getParserStatusMessage(preflight)
    };
  }
}

export const parserService: ParserService = {
  detectPlatform,
  parseListingUrl,
  parseListingHtml,
  ingestListingUrl
};

