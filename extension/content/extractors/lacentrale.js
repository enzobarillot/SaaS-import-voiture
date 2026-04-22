(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  root.extractLacentrale = () =>
    root.common.extractGeneric({
      source: "lacentrale",
      countryOfOrigin: "FR",
      priceSelectors: ['[class*="price"]', '[data-testid*="price"]'],
      mileageSelectors: ['[class*="mileage"]', '[data-testid*="mileage"]'],
      factSelectors: ['[class*="criteria"] li', '[class*="characteristic"] li', '[class*="spec"] li']
    });
})();
