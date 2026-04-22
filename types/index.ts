export type InputMode = "manual" | "url";
export type OriginCountry = "DE" | "BE" | "NL" | "ES" | "IT" | "FR" | "OTHER_EU";
export type FuelType =
  | "petrol"
  | "diesel"
  | "hybrid"
  | "plug_in_hybrid"
  | "electric"
  | "flex_fuel"
  | "other";
export type Transmission = "manual" | "automatic";
export type SellerType = "private" | "dealer";
export type VatStatus = "included" | "excluded" | "recoverable";
export type ListingPlatform = "mobile.de" | "autoscout24" | "leboncoin" | "lacentrale" | "unknown";
export type DealVerdict = "GOOD DEAL" | "FAIR DEAL" | "BAD DEAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ParserStatus = "success" | "partial" | "insufficient" | "unsupported" | "failed";
export type ParserSource = "url_tokens" | "html_metadata" | "json_ld" | "mixed" | "none";
export type MarketSource = "manual" | "seeded" | "provider" | "heuristic";
export type MarketProviderId = "manual" | "mock_live_feed" | "seeded_reference" | "heuristic" | "future_api";
export type MarketProviderKind = "manual" | "mock_live" | "seeded" | "heuristic" | "future_api";
export type MarketConfidence = "high" | "medium" | "low";
export type EstimateConfidence = "high" | "medium" | "low" | "incomplete";
export type EstimateValueStatus = "confirmed" | "user_entered" | "estimated" | "missing";
export type ComparisonDirection = "saving" | "overpay" | "break_even";
export type PlanTier = "free" | "premium";
export type ProductAccessLevel = "anonymous" | "signed_in_free" | "premium_placeholder";

export interface VehicleInput {
  purchasePrice: number;
  countryOfOrigin: OriginCountry;
  brand: string;
  model: string;
  trim: string;
  year: number;
  firstRegistrationDate: string;
  mileage: number;
  fuelType: FuelType;
  transmission: Transmission;
  horsepower: number;
  fiscalPower?: number;
  co2Emissions?: number;
  curbWeightKg?: number;
  sellerType: SellerType;
  vatStatus: VatStatus;
  transportCost?: number;
  exportPlatesCost?: number;
  cocCost?: number;
  inspectionCost?: number;
  brokerFees?: number;
  frenchMarketEstimate?: number;
  listingUrl?: string;
}

export type VehicleFieldKey = keyof VehicleInput;

export interface CostLine {
  key: string;
  label: string;
  amount: number;
  note?: string;
  assumed?: boolean;
}

export interface VatComputation {
  amount: number;
  recoverableAmount: number;
  reason: string;
  assumption?: string;
}

export interface RegistrationComputation {
  amount: number;
  regionalTax: number;
  fiscalPowerUsed: number;
  fiscalRateUsed: number;
  fixedFees: number;
  assumptions: string[];
}

export interface MalusComputation {
  co2Malus: number;
  massMalus: number;
  total: number;
  referenceLabel: string;
  notes: string[];
}

export interface CostBreakdown {
  lines: CostLine[];
  importSubtotal: number;
  vat: VatComputation;
  registration: RegistrationComputation;
  malus: MalusComputation;
  total: number;
  assumptions: string[];
}

export interface MarketComparable {
  id: string;
  title: string;
  price: number;
  mileage: number;
  year: number;
  sourceLabel: string;
  observedAt?: string;
  url?: string;
}

export interface MarketProvenance {
  kind: MarketProviderKind;
  sourceLabel: string;
  connectorLabel: string;
  freshness: "manual" | "recent_snapshot" | "seeded_reference" | "modeled";
  observedAt?: string;
  listingCount?: number;
  isMock?: boolean;
  note?: string;
}

export interface MarketEstimate {
  estimatedPrice: number;
  source: MarketSource;
  providerId: MarketProviderId;
  providerLabel: string;
  confidence: MarketConfidence;
  explanation: string;
  comparableLabel?: string;
  provenance: MarketProvenance;
  comparableListings?: MarketComparable[];
}

export interface ComparisonInsight {
  estimatedSpread: number;
  marginPercent: number;
  direction: ComparisonDirection;
  spreadLabel: string;
  confidenceLabel: string;
  sourceLabel: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
}
export interface InputEvidence {
  userSuppliedFields?: VehicleFieldKey[];
  extractedFields?: VehicleFieldKey[];
  inferredFields?: VehicleFieldKey[];
}

export interface EstimateAssumption {
  field: VehicleFieldKey;
  label: string;
  status: EstimateValueStatus;
  critical: boolean;
  note: string;
}

export interface EstimateQuality {
  confidence: EstimateConfidence;
  label: string;
  isComplete: boolean;
  canShowStrongVerdict: boolean;
  criticalMissingFields: VehicleFieldKey[];
  missingFields: VehicleFieldKey[];
  confirmedFields: VehicleFieldKey[];
  userEnteredFields: VehicleFieldKey[];
  estimatedFields: VehicleFieldKey[];
  assumptions: EstimateAssumption[];
  summary: string;
  nextAction: string;
}


export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  urgency: "required" | "recommended";
}

export interface UrlParseResult {
  status: ParserStatus;
  platform: ListingPlatform;
  partialInput: Partial<VehicleInput>;
  assumptions: string[];
  summary: string;
  extractedFields: VehicleFieldKey[];
  inferredFields?: VehicleFieldKey[];
  missingFields: VehicleFieldKey[];
  recommendedFields: VehicleFieldKey[];
  source: ParserSource;
  normalizedUrl?: string;
  diagnostics?: string[];
}

export interface DealSummary {
  headline: string;
  explanation: string;
  verdictReason: string;
  whyVerdict: string[];
}

export interface UsageState {
  plan: PlanTier;
  used: number;
  remaining: number;
  limit: number;
  locked: boolean;
  periodLabel: string;
  upgradeMessage: string;
}

export interface SimulationContext {
  evaluationDate?: string | Date;
  inputEvidence?: InputEvidence;
}

export interface SimulationResult {
  id: string;
  title: string;
  input: VehicleInput;
  platform: ListingPlatform;
  parsedListingSummary?: string;
  parserStatus?: ParserStatus;
  breakdown: CostBreakdown;
  market: MarketEstimate;
  comparison: ComparisonInsight;
  risk: RiskAssessment;
  checklist: ChecklistItem[];
  verdict: DealVerdict;
  narrative: DealSummary;
  profitOrLoss: number;
  marginPercent: number;
  warnings: string[];
  estimateQuality?: EstimateQuality;
  generatedAt: string;
}

export interface MarketSeedRecord {
  id: string;
  brand: string;
  model: string;
  fuelType?: FuelType;
  targetYear: number;
  targetMileage: number;
  basePrice: number;
  trimKeywords?: string[];
  note: string;
}

export interface MarketListingRecord {
  id: string;
  sourceLabel: string;
  observedAt: string;
  brand: string;
  model: string;
  trim: string;
  fuelType: FuelType;
  year: number;
  mileage: number;
  price: number;
  url?: string;
}

export interface AccountUser {
  id: string;
  email: string;
  planTier: PlanTier;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  user: AccountUser;
  expiresAt: string;
}

export interface ProductAccess {
  level: ProductAccessLevel;
  label: string;
  canSaveCloud: boolean;
  canShareReport: boolean;
  canExportReport: boolean;
  canUseEnhancedComparison: boolean;
  simulationLimit: number | null;
  historyLabel: string;
  upsellMessage: string;
}

export interface SavedReportSummary {
  id: string;
  shareId?: string;
  title: string;
  verdict: DealVerdict;
  riskLevel: RiskLevel;
  totalCost: number;
  marketPrice: number;
  estimatedSpread: number;
  providerLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDocument {
  id: string;
  ownerUserId: string;
  shareId?: string;
  title: string;
  vehicleLabel: string;
  createdAt: string;
  updatedAt: string;
  summary: SavedReportSummary;
  simulation: SimulationResult;
  printablePath: string;
  exportPath: string;
  sharePath?: string;
}

export interface SessionEnvelope {
  session: AuthSession | null;
  access: ProductAccess;
  reportCount: number;
}

export interface SaveReportRequest {
  input: VehicleInput;
  platform?: ListingPlatform;
  parseResult?: UrlParseResult;
}
export type LeadIntent = "early_access" | "premium_interest" | "dealer_pro" | "partnership" | "import_service";

export interface LeadCaptureRequest {
  email: string;
  role?: string;
  message?: string;
  source: string;
  intent?: LeadIntent;
  pagePath?: string;
}

export interface LeadRecord extends LeadCaptureRequest {
  id: string;
  email: string;
  status: "new" | "reviewed";
  userId?: string;
  createdAt: string;
}

export type FeedbackSentiment = "positive" | "neutral" | "negative";

export interface FeedbackContext {
  screen: string;
  resultId?: string;
  reportId?: string;
  pagePath?: string;
}

export interface FeedbackRequest {
  sentiment: FeedbackSentiment;
  rating?: number;
  message: string;
  context: FeedbackContext;
  wouldPay?: boolean;
}

export interface FeedbackRecord extends FeedbackRequest {
  id: string;
  userId?: string;
  createdAt: string;
}
