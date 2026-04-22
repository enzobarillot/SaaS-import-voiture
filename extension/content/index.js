(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  function hostname() {
    return location.hostname.replace(/^www\./, "").toLowerCase();
  }
  root.extractCurrentPage = () => {
    const host = hostname();
    if (host === "mobile.de" || host.endsWith(".mobile.de")) return root.extractMobileDe();
    if (host.includes("autoscout24")) return root.extractAutoscout24();
    if (host === "leboncoin.fr" || host.endsWith(".leboncoin.fr")) return root.extractLeboncoin();
    if (host === "lacentrale.fr" || host.endsWith(".lacentrale.fr")) return root.extractLacentrale();
    return root.common.unsupportedPayload();
  };
})();
