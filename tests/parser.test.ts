import assert from "node:assert/strict";
import test from "node:test";
import { detectPlatform, ingestListingUrl, parseListingHtml, parseListingUrl } from "@/lib/parser";

test("supported domains are detected from listing URLs", () => {
  assert.equal(detectPlatform("https://www.mobile.de/vehicle/123"), "mobile.de");
  assert.equal(detectPlatform("https://www.autoscout24.com/offers/test"), "autoscout24");
  assert.equal(detectPlatform("www.leboncoin.fr/ad/voitures/123"), "leboncoin");
  assert.equal(detectPlatform("https://mobile.de.example.com/vehicle/123"), "unknown");
});

test("unknown platforms return unsupported parser results", () => {
  const parsed = parseListingUrl("https://example.com/car/123");

  assert.equal(parsed.status, "unsupported");
  assert.equal(parsed.platform, "unknown");
});

test("URL token parsing is marked insufficient when critical listing data is absent", () => {
  const parsed = parseListingUrl("https://www.mobile.de/fahrzeuge/details.html/bmw-320d-m-sport-2021");

  assert.equal(parsed.status, "insufficient");
  assert.equal(parsed.partialInput.brand, "BMW");
  assert.ok(parsed.inferredFields?.includes("brand"));
  assert.ok(parsed.inferredFields?.includes("model"));
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
            "offers": { "price": "25.900" },
            "vehicleModelDate": "2021",
            "mileageFromOdometer": { "value": 64000 },
            "fuelType": "Diesel",
            "vehicleTransmission": "Automatik",
            "vehicleEnginePower": { "value": "140 kW (190 PS)" },
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
  assert.equal(parsed.partialInput.fuelType, "diesel");
  assert.equal(parsed.partialInput.transmission, "automatic");
  assert.equal(parsed.partialInput.horsepower, 190);
  assert.equal(parsed.partialInput.co2Emissions, 128);
});

test("meta tags and HTML label-value selectors are mapped into form fields", () => {
  const html = `
    <html>
      <head>
        <title>Peugeot 3008 GT Hybrid4</title>
        <meta property="og:title" content="Peugeot 3008 GT Hybrid4 2020" />
        <meta name="description" content="Prix 25 900 EUR, 64 000 km, hybride rechargeable, boite automatique" />
      </head>
      <body>
        <h1>Peugeot 3008 GT Hybrid4</h1>
        <dl>
          <dt>Prix</dt><dd>25 900 €</dd>
          <dt>Mise en circulation</dt><dd>06/2020</dd>
          <dt>Kilométrage</dt><dd>64 000 km</dd>
          <dt>Carburant</dt><dd>Hybride rechargeable</dd>
          <dt>Boîte de vitesse</dt><dd>Automatique</dd>
          <dt>Puissance</dt><dd>133 kW (181 ch)</dd>
          <dt>CO2</dt><dd>31 g/km</dd>
        </dl>
      </body>
    </html>
  `;

  const parsed = parseListingHtml("https://www.leboncoin.fr/ad/voitures/123", html);

  assert.equal(parsed.status, "success");
  assert.equal(parsed.platform, "leboncoin");
  assert.equal(parsed.partialInput.countryOfOrigin, "FR");
  assert.equal(parsed.extractedFields.includes("countryOfOrigin"), false);
  assert.equal(parsed.partialInput.brand, "Peugeot");
  assert.equal(parsed.partialInput.purchasePrice, 25900);
  assert.equal(parsed.partialInput.firstRegistrationDate, "2020-06-01");
  assert.equal(parsed.partialInput.fuelType, "plug_in_hybrid");
  assert.equal(parsed.partialInput.transmission, "automatic");
  assert.equal(parsed.partialInput.horsepower, 181);
  assert.equal(parsed.partialInput.co2Emissions, 31);
});

test("embedded listing JSON is used when JSON-LD is absent", () => {
  const html = `
    <html>
      <head>
        <title>Renault Clio Intens</title>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "listing": {
                  "brand": "Renault",
                  "model": "Clio Intens",
                  "price": { "amount": "12 900" },
                  "mileage": { "value": "45 000 km" },
                  "firstRegistrationDate": "03/2019",
                  "fuelType": "Essence",
                  "transmission": "Boite manuelle",
                  "horsepower": "66 kW (90 ch)"
                }
              }
            }
          }
        </script>
      </head>
      <body><h1>Renault Clio Intens</h1></body>
    </html>
  `;

  const parsed = parseListingHtml("https://www.lacentrale.fr/auto-occasion-annonce-123.html", html);

  assert.equal(parsed.status, "success");
  assert.equal(parsed.partialInput.purchasePrice, 12900);
  assert.equal(parsed.partialInput.mileage, 45000);
  assert.equal(parsed.partialInput.firstRegistrationDate, "2019-03-01");
  assert.equal(parsed.partialInput.fuelType, "petrol");
  assert.equal(parsed.partialInput.transmission, "manual");
});

test("page title keywords prefill weak fields without marking them extracted", () => {
  const html = `
    <html>
      <head>
        <title>BMW 320d M Sport 2021 diesel automatic 190 hp 64000 km</title>
      </head>
      <body>Public page shell without structured listing facts.</body>
    </html>
  `;

  const parsed = parseListingHtml("https://www.mobile.de/fahrzeuge/details.html?id=123", html);

  assert.equal(parsed.status, "insufficient");
  assert.equal(parsed.partialInput.brand, "BMW");
  assert.equal(parsed.partialInput.model, "320d");
  assert.equal(parsed.partialInput.trim, "M Sport");
  assert.equal(parsed.partialInput.year, 2021);
  assert.equal(parsed.partialInput.fuelType, "diesel");
  assert.equal(parsed.partialInput.transmission, "automatic");
  assert.equal(parsed.partialInput.horsepower, 190);
  assert.equal(parsed.partialInput.mileage, 64000);
  assert.deepEqual(parsed.extractedFields, []);
  assert.ok(parsed.inferredFields?.includes("brand"));
  assert.ok(parsed.inferredFields?.includes("mileage"));
  assert.ok(parsed.diagnostics?.includes("inferred:brand:title_keywords"));
});

test("URL slug keywords are used after title keywords and stay inferred", () => {
  const parsed = parseListingHtml(
    "https://www.autoscout24.fr/offres/mercedes-benz-classe-a-180-amg-line-2020-diesel-automatic-116hp-72000km",
    "<html><head><title>AutoScout24 listing</title></head><body>No structured fields.</body></html>"
  );

  assert.equal(parsed.status, "insufficient");
  assert.equal(parsed.partialInput.brand, "Mercedes-Benz");
  assert.equal(parsed.partialInput.model, "Classe A 180");
  assert.equal(parsed.partialInput.trim, "AMG Line");
  assert.equal(parsed.partialInput.year, 2020);
  assert.equal(parsed.partialInput.fuelType, "diesel");
  assert.equal(parsed.partialInput.transmission, "automatic");
  assert.equal(parsed.partialInput.horsepower, 116);
  assert.equal(parsed.partialInput.mileage, 72000);
  assert.deepEqual(parsed.extractedFields, []);
  assert.ok(parsed.inferredFields?.includes("trim"));
  assert.ok(parsed.diagnostics?.includes("inferred:brand:url_keywords"));
});

test("Leboncoin numeric listing IDs are ignored by URL keyword fallback", () => {
  const parsed = parseListingHtml(
    "https://www.leboncoin.fr/ad/voitures/3169125137",
    "<html><head><title>Leboncoin listing</title></head><body>No structured fields.</body></html>"
  );

  assert.equal(parsed.status, "failed");
  assert.equal(parsed.partialInput.mileage, undefined);
  assert.equal(parsed.partialInput.year, undefined);
  assert.equal(parsed.partialInput.horsepower, undefined);
  assert.equal(parsed.partialInput.purchasePrice, undefined);
  assert.deepEqual(parsed.extractedFields, []);
  assert.deepEqual(parsed.inferredFields, []);
});

test("URL keyword fallback only uses numbers with explicit vehicle context", () => {
  const parsed = parseListingHtml(
    "https://www.leboncoin.fr/ad/voitures/3169125137/bmw-320d-m-sport-2019-diesel-bva-190ch-120000-km",
    "<html><head><title>Leboncoin listing</title></head><body>No structured fields.</body></html>"
  );

  assert.equal(parsed.status, "insufficient");
  assert.equal(parsed.partialInput.brand, "BMW");
  assert.equal(parsed.partialInput.model, "320d");
  assert.equal(parsed.partialInput.trim, "M Sport");
  assert.equal(parsed.partialInput.year, 2019);
  assert.equal(parsed.partialInput.fuelType, "diesel");
  assert.equal(parsed.partialInput.transmission, "automatic");
  assert.equal(parsed.partialInput.horsepower, 190);
  assert.equal(parsed.partialInput.mileage, 120000);
  assert.ok(parsed.inferredFields?.includes("mileage"));
  assert.ok(parsed.diagnostics?.includes("inferred:mileage:url_keywords"));
});

test("keyword fallback does not replace real HTML or JSON-LD values", () => {
  const html = `
    <html>
      <head>
        <title>BMW 320d M Sport 2021 diesel automatic 190 hp 64000 km</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Car",
            "name": "BMW 330i Luxury",
            "fuelType": "Essence",
            "vehicleTransmission": "Manual",
            "vehicleEnginePower": "180 kW (245 PS)",
            "mileageFromOdometer": { "value": 22000 }
          }
        </script>
      </head>
      <body>No extra facts.</body>
    </html>
  `;

  const parsed = parseListingHtml("https://www.mobile.de/fahrzeuge/details.html?id=123", html);

  assert.equal(parsed.partialInput.model, "330i Luxury");
  assert.equal(parsed.partialInput.fuelType, "petrol");
  assert.equal(parsed.partialInput.transmission, "manual");
  assert.equal(parsed.partialInput.horsepower, 245);
  assert.equal(parsed.partialInput.mileage, 22000);
  assert.equal(parsed.extractedFields.includes("model"), true);
  assert.equal(parsed.inferredFields?.includes("model"), false);
  assert.ok(parsed.inferredFields?.includes("year"));
});

test("supported HTML with no useful listing data is a parser failure", () => {
  const parsed = parseListingHtml("https://www.mobile.de/fahrzeuge/details.html?id=123", "<html><head><title>Empty</title></head><body>No listing data</body></html>");

  assert.equal(parsed.status, "failed");
  assert.deepEqual(parsed.extractedFields, []);
});

test("live fetch failures return failed instead of URL-token fallback data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 403, headers: { "content-type": "text/html" } });

  try {
    const parsed = await ingestListingUrl("https://www.mobile.de/fahrzeuge/details.html/bmw-320d-m-sport-2021");

    assert.equal(parsed.status, "failed");
    assert.equal(parsed.platform, "mobile.de");
    assert.deepEqual(parsed.extractedFields, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

