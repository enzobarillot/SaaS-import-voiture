(() => {
  const root = (globalThis.ImportScoreExtension ??= {});
  root.extractAutoscout24 = () =>
    root.common.extractGeneric({
      source: "autoscout24",
      countryOfOrigin: "OTHER_EU",
      priceSelectors: ['[data-testid*="price"]', '[class*="Price"]', '[class*="price"]'],
      mileageSelectors: ['[data-testid*="mileage"]', '[class*="mileage"]', '[class*="VehicleDetails"]'],
      factSelectors: ['[data-testid*="VehicleDetails"] li', '[class*="VehicleDetails"] li', '[class*="Details"] li']
    });
})();
