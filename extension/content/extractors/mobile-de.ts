export {};

(() => {
  const root = ((globalThis as any).ImportScoreExtension ??= {});

  root.extractMobileDe = (): ImportScoreExtension.ExtractionPayload =>
    root.common.extractGeneric({
      source: "mobile.de",
      countryOfOrigin: "DE",
      priceSelectors: ['[data-testid*="price"]', '[class*="price"]'],
      mileageSelectors: ['[data-testid*="mileage"]', '[data-testid*="odometer"]', '[class*="mileage"]'],
      factSelectors: ['[data-testid*="key-features"] li', '[data-testid*="vehicle"] li', '[class*="VehicleOverview"] li']
    });
})();
