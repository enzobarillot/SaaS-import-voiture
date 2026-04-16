import { CLOUD_HISTORY_LIMIT, FREE_SIMULATION_LIMIT, SIGNED_IN_SIMULATION_LIMIT } from "@/lib/reference-data";
import { AuthSession, ProductAccess } from "@/types";

export function getProductAccess(session: AuthSession | null): ProductAccess {
  if (!session) {
    return {
      level: "anonymous",
      label: "Anonymous",
      canSaveCloud: false,
      canShareReport: false,
      canExportReport: false,
      canUseEnhancedComparison: false,
      simulationLimit: FREE_SIMULATION_LIMIT,
      historyLabel: "Local browser history only",
      upsellMessage: "Create a free account to save reports in the cloud, reopen them anywhere, and share printable links."
    };
  }

  if (session.user.planTier === "premium") {
    return {
      level: "premium_placeholder",
      label: "Premium placeholder",
      canSaveCloud: true,
      canShareReport: true,
      canExportReport: true,
      canUseEnhancedComparison: true,
      simulationLimit: null,
      historyLabel: "Unlimited cloud history",
      upsellMessage: "Premium is reserved for richer provider coverage, unlimited usage, and deeper portfolio workflows."
    };
  }

  return {
    level: "signed_in_free",
    label: "Signed-in free",
    canSaveCloud: true,
    canShareReport: true,
    canExportReport: true,
    canUseEnhancedComparison: true,
    simulationLimit: SIGNED_IN_SIMULATION_LIMIT,
    historyLabel: `Cloud history enabled, up to ${CLOUD_HISTORY_LIMIT} saved reports`,
    upsellMessage: "Premium can later unlock unlimited history, richer provider connectors, and portfolio-level tooling."
  };
}