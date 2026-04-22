export {};

(() => {
  const root = ((globalThis as any).ImportScoreExtension ??= {});

  root.extractLacentrale = (): ImportScoreExtension.ExtractionPayload =>
    root.common.extractGeneric({
      source: "lacentrale",
      countryOfOrigin: "FR",
      priceSelectors: ['[class*="price"]', '[data-testid*="price"]'],
      mileageSelectors: ['[class*="mileage"]', '[data-testid*="mileage"]'],
      factSelectors: ['[class*="criteria"] li', '[class*="characteristic"] li', '[class*="spec"] li']
    });
})();
