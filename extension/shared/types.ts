export {};

declare global {
  namespace ImportScoreExtension {
    type ExtractionStatus = "success" | "partial" | "failed" | "unsupported_source";
    type FuelType = "petrol" | "diesel" | "hybrid" | "plug_in_hybrid" | "electric" | "flex_fuel" | "other";
    type Transmission = "manual" | "automatic";
    type SellerType = "private" | "dealer";
    type VatStatus = "included" | "excluded" | "recoverable";
    type OriginCountry = "DE" | "BE" | "NL" | "ES" | "IT" | "FR" | "OTHER_EU";

    interface VehicleFields {
      brand?: string;
      model?: string;
      trim?: string;
      purchasePrice?: number;
      year?: number;
      firstRegistrationDate?: string;
      mileage?: number;
      fuelType?: FuelType;
      transmission?: Transmission;
      horsepower?: number;
      fiscalPower?: number;
      co2Emissions?: number;
      sellerType?: SellerType;
      vatStatus?: VatStatus;
      countryOfOrigin?: OriginCountry;
      listingUrl?: string;
    }

    interface ExtractionDiagnostics {
      domain: string;
      title: string;
      extractedFieldCount: number;
      messages?: string[];
    }

    interface ExtractionPayload {
      source: string;
      status: ExtractionStatus;
      confirmedFields: VehicleFields;
      inferredFields: VehicleFields;
      missingCriticalFields: string[];
      diagnostics: ExtractionDiagnostics;
    }

    interface ExtractorConfig {
      source: string;
      countryOfOrigin: OriginCountry;
      priceSelectors?: string[];
      mileageSelectors?: string[];
      factSelectors?: string[];
    }
  }
}
