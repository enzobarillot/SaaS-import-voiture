const APP_URL = "https://importautofr.vercel.app/";

const CONTENT_FILES = [
  "content/extractors/common.js",
  "content/extractors/mobile-de.js",
  "content/extractors/autoscout24.js",
  "content/extractors/leboncoin.js",
  "content/extractors/lacentrale.js",
  "content/index.js"
];

function encodePayload(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function buildAppUrl(payload) {
  const url = new URL(APP_URL);
  url.hash = `extensionPayload=${encodeURIComponent(encodePayload(payload))}`;
  return url.toString();
}

function badgeForStatus(status) {
  if (status === "success") return { text: "OK", color: "#059669" };
  if (status === "partial") return { text: "PART", color: "#D97706" };
  return { text: "FAIL", color: "#DC2626" };
}

async function extractFromTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_FILES
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => globalThis.ImportScoreExtension.extractCurrentPage()
  });

  return results?.[0]?.result;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  await chrome.action.setBadgeText({ tabId: tab.id, text: "..." });
  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#475569" });

  try {
    const payload = await extractFromTab(tab.id);
    const badge = badgeForStatus(payload.status);
    await chrome.action.setBadgeText({ tabId: tab.id, text: badge.text });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: badge.color });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: `ImportScore: ${payload.status} (${payload.diagnostics.extractedFieldCount} confirmed fields)`
    });
    await chrome.tabs.create({ url: buildAppUrl(payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    await chrome.action.setBadgeText({ tabId: tab.id, text: "FAIL" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#DC2626" });
    await chrome.action.setTitle({ tabId: tab.id, title: `ImportScore: ${message}` });
  }
});
