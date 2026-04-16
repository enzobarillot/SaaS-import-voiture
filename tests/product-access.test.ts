import assert from "node:assert/strict";
import test from "node:test";
import { FREE_SIMULATION_LIMIT, SIGNED_IN_SIMULATION_LIMIT } from "@/lib/reference-data";
import { getProductAccess } from "@/lib/product/access";
import type { AuthSession } from "@/types";

const freeSession: AuthSession = {
  user: {
    id: "user-free",
    email: "free@example.com",
    planTier: "free",
    createdAt: "2026-04-15T10:00:00.000Z"
  },
  expiresAt: "2026-05-15T10:00:00.000Z"
};

const premiumSession: AuthSession = {
  user: {
    id: "user-premium",
    email: "premium@example.com",
    planTier: "premium",
    createdAt: "2026-04-15T10:00:00.000Z"
  },
  expiresAt: "2026-05-15T10:00:00.000Z"
};

test("anonymous access keeps local-only limits", () => {
  const access = getProductAccess(null);

  assert.equal(access.level, "anonymous");
  assert.equal(access.simulationLimit, FREE_SIMULATION_LIMIT);
  assert.equal(access.canSaveCloud, false);
  assert.equal(access.canShareReport, false);
});

test("signed-in free access enables cloud save with bounded history", () => {
  const access = getProductAccess(freeSession);

  assert.equal(access.level, "signed_in_free");
  assert.equal(access.simulationLimit, SIGNED_IN_SIMULATION_LIMIT);
  assert.equal(access.canSaveCloud, true);
  assert.equal(access.canUseEnhancedComparison, true);
});

test("premium placeholder removes the simulation limit", () => {
  const access = getProductAccess(premiumSession);

  assert.equal(access.level, "premium_placeholder");
  assert.equal(access.simulationLimit, null);
  assert.equal(access.canExportReport, true);
  assert.equal(access.canShareReport, true);
});