import assert from "node:assert/strict";
import test from "node:test";
import { detectPlatform, parseListingHtml, parseListingUrl } from "@/lib/parser";

test("supported domains are detected from listing URLs", () => {
  assert.equal(detectPlatform("https://www.mobile.de/vehicle/123"), "mobile.de");
  assert.equal(detectPlatform("https://www.autoscout24.com/offers/test"), "autoscout24");
});

test("unknown platforms return unsupported parser results", () => {
  const parsed = parseListingUrl("https://example.com/car/123");

  assert.equal(parsed.status, "unsupported");
  assert.equal(parsed.platform, "unknown");
});

test("URL token parsing extracts usable data without inventing the rest", () => {
  const parsed = parseListingUrl("https://www.mobile.de/fahrzeuge/details.html/bmw-320d-m-sport-2021");

  assert.equal(parsed.status, "success");
  assert.equal(parsed.partialInput.brand, "Bmw");
  assert.ok(parsed.missingFields.length > 0);
});

test("public HTML and JSON-LD metadata are used when available", () => {
  const html = `
    <html>
      <head>
        <title>BMW 320d M Sport</title>
        <meta name="description" content="BMW 320d M Sport 2021 64000 km diesel 190 hp automatic CO2 128 price 25900 EUR" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Car",
            "name": "BMW 320d M Sport",
            "offers": { "price": "25900" },
            "vehicleModelDate": "2021",
            "mileageFromOdometer": { "value": 64000 },
            "fuelType": "diesel",
            "vehicleTransmission": "automatic",
            "vehicleEnginePower": { "value": 190 },
            "emissionsCO2": { "value": 128 },
            "dateVehicleFirstRegistered": "2021-06-14"
          }
        </script>
      </head>
      <body>BMW 320d M Sport</body>
    </html>
  `;

  const parsed = parseListingHtml("https://www.mobile.de/fahrzeuge/details.html?id=bmw-320d", html);

  assert.equal(parsed.status, "success");
  assert.equal(parsed.source, "json_ld");
  assert.equal(parsed.partialInput.purchasePrice, 25900);
  assert.equal(parsed.partialInput.co2Emissions, 128);
});

