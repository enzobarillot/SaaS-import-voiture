export const SITE_NAME = "ImportScore";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://importscore.app";
export const DEFAULT_META_DESCRIPTION =
  "ImportScore helps French buyers and import professionals check landed cost, market gap, risk, and report-ready decisions before buying a foreign car.";

export function getSiteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}