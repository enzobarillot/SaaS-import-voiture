(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  root.extractLeboncoin = () =>
    root.common.extractGeneric({
      source: "leboncoin",
      countryOfOrigin: "FR",
      priceSelectors: ['[data-qa-id*="price"]', '[data-test-id*="price"]', '[class*="price"]'],
      mileageSelectors: ['[data-qa-id*="mileage"]', '[data-test-id*="mileage"]'],
      factSelectors: ['[data-qa-id*="criteria"] li', '[data-test-id*="criteria"] li', 'section li']
    });
})();
