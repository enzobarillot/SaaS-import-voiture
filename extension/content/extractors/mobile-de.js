(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  root.extractMobileDe = () =>
    root.common.extractGeneric({
      source: "mobile.de",
      countryOfOrigin: "DE",
      priceSelectors: ['[data-testid*="price"]', '[class*="price"]'],
      mileageSelectors: ['[data-testid*="mileage"]', '[data-testid*="odometer"]', '[class*="mileage"]'],
      factSelectors: ['[data-testid*="key-features"] li', '[data-testid*="vehicle"] li', '[class*="VehicleOverview"] li']
    });
})();
