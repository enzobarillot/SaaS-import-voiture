import { buildFailedResult, buildUnsupportedResult, PARSER_ADAPTERS } from "@/lib/parser/adapters";
import { extractHtmlInsights } from "@/lib/parser/html";
import { ListingPlatform, UrlParseResult } from "@/types";

export interface ParserService {
  detectPlatform: (rawUrl: string) => ListingPlatform;
  parseListingUrl: (rawUrl: string) => UrlParseResult;
  parseListingHtml: (rawUrl: string, html: string) => UrlParseResult;
  ingestListingUrl: (rawUrl: string) => Promise<UrlParseResult>;
}

function normalizeListingUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function getAdapter(rawUrl: string) {
  const url = normalizeListingUrl(rawUrl);
  return {
    url,
    adapter: url ? PARSER_ADAPTERS.find((candidate) => candidate.matches(url)) : undefined
  };
}

function withDiagnostics(result: UrlParseResult, diagnostics: string[]): UrlParseResult {
  return {
    ...result,
    diagnostics: [...(result.diagnostics ?? []), ...diagnostics]
  };
}

function logParserResult(stage: string, result: UrlParseResult): void {
  const payload = {
    stage,
    platform: result.platform,
    status: result.status,
    source: result.source,
    normalizedUrl: result.normalizedUrl,
    extractedFields: result.extractedFields,
    missingFields: result.missingFields,
    diagnostics: result.diagnostics ?? []
  };

  if (result.status === "success" || result.status === "partial") {
    console.info("[parser] listing extraction", payload);
    return;
  }

  console.warn("[parser] listing extraction", payload);
}

export function detectPlatform(rawUrl: string): ListingPlatform {
  const { adapter } = getAdapter(rawUrl);
  return adapter?.platform ?? "unknown";
}

export function parseListingUrl(rawUrl: string): UrlParseResult {
  const { url, adapter } = getAdapter(rawUrl);

  if (!url) {
    return buildFailedResult(rawUrl, "Invalid URL. Paste a full listing URL to activate the parser.", [], "unknown", ["url:invalid"]);
  }

  if (!adapter) {
    return buildUnsupportedResult(url.toString());
  }

  return adapter.parse(url);
}

export function parseListingHtml(rawUrl: string, html: string): UrlParseResult {
  const { url, adapter } = getAdapter(rawUrl);

  if (!url) {
    return buildFailedResult(rawUrl, "Invalid URL. Paste a full listing URL to activate the parser.", [], "unknown", ["url:invalid"]);
  }

  if (!adapter) {
    return buildUnsupportedResult(url.toString());
  }

  const insights = extractHtmlInsights(html);
  return adapter.parse(url, insights);
}

export async function ingestListingUrl(rawUrl: string): Promise<UrlParseResult> {
  const preflight = parseListingUrl(rawUrl);
  if (preflight.status === "unsupported" || preflight.status === "failed") {
    logParserResult("preflight", preflight);
    return preflight;
  }

  const fetchUrl = preflight.normalizedUrl ?? rawUrl.trim();

  try {
    const response = await fetch(fetchUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8,de;q=0.7",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      const failed = buildFailedResult(
        fetchUrl,
        `Live fetch returned HTTP ${response.status}. Use the manual form to finish the decision.`,
        [`Live fetch returned HTTP ${response.status}; no page data was extracted.`],
        preflight.platform,
        [`fetch:http_status:${response.status}`]
      );
      logParserResult("fetch_failed", failed);
      return failed;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/(text\/html|application\/xhtml\+xml|application\/json|text\/plain)/i.test(contentType)) {
      const failed = buildFailedResult(
        fetchUrl,
        "The listing response was not an HTML page. Use the manual form to finish the decision.",
        [`Live fetch returned content-type ${contentType}; no HTML parser was run.`],
        preflight.platform,
        [`fetch:content_type:${contentType}`]
      );
      logParserResult("fetch_failed", failed);
      return failed;
    }

    const html = await response.text();
    if (!html.trim()) {
      const failed = buildFailedResult(
        fetchUrl,
        "The fetched listing page was empty. Use the manual form to finish the decision.",
        ["Live fetch returned an empty response body."],
        preflight.platform,
        ["fetch:empty_body"]
      );
      logParserResult("fetch_failed", failed);
      return failed;
    }

    const finalUrl = response.url && detectPlatform(response.url) !== "unknown" ? response.url : fetchUrl;
    const parsed = withDiagnostics(parseListingHtml(finalUrl, html), [
      `fetch:ok:${response.status}`,
      `fetch:content_type:${contentType || "unknown"}`,
      `fetch:html_chars:${html.length}`
    ]);

    logParserResult("fetched", parsed);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const failed = buildFailedResult(
      fetchUrl,
      "Live parsing failed. Use the manual form to finish the decision.",
      [`Live parsing failed before page data could be extracted: ${message}`],
      preflight.platform,
      [`fetch:error:${message}`]
    );
    logParserResult("fetch_failed", failed);
    return failed;
  }
}

export const parserService: ParserService = {
  detectPlatform,
  parseListingUrl,
  parseListingHtml,
  ingestListingUrl
};
