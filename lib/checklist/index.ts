import { ChecklistItem, SimulationContext, VehicleInput } from "@/types";

function resolveEvaluationDate(context?: SimulationContext): Date {
  if (!context?.evaluationDate) {
    return new Date();
  }

  return context.evaluationDate instanceof Date ? context.evaluationDate : new Date(context.evaluationDate);
}

export function generateChecklist(input: VehicleInput, context?: SimulationContext): ChecklistItem[] {
  const now = resolveEvaluationDate(context);
  const checklist: ChecklistItem[] = [
    {
      id: "foreign-registration",
      label: "Foreign registration document",
      description: "Keep the original foreign registration certificate and both parts if applicable.",
      urgency: "required"
    },
    {
      id: "bill-of-sale",
      label: input.sellerType === "dealer" ? "Dealer invoice" : "Bill of sale",
      description:
        input.sellerType === "dealer"
          ? "Invoice should clearly show seller details, VAT treatment, VIN, and purchase price."
          : "Signed sale agreement with VIN, date, seller identity, and purchase price.",
      urgency: "required"
    },
    {
      id: "insurance",
      label: "Insurance before road use",
      description: "Arrange insurance as soon as the vehicle arrives in France.",
      urgency: "required"
    },
    {
      id: "ants",
      label: "French registration on ANTS",
      description: "Submit the registration file within 1 month after the purchase/import.",
      urgency: "required"
    }
  ];

  if (input.countryOfOrigin !== "FR") {
    checklist.push(
      {
        id: "quitus",
        label: "Quitus fiscal",
        description: "Required for vehicles bought in another EU country before French registration.",
        urgency: "required"
      },
      {
        id: "coc",
        label: "COC or conformity attestation",
        description: "Needed to prove EU type approval when ANTS asks for it.",
        urgency: "required"
      },
      {
        id: "plates",
        label: "Export / temporary plates",
        description: "Check if temporary transit plates are needed for the trip to France.",
        urgency: "recommended"
      }
    );
  }

  if (now.getFullYear() - input.year >= 4) {
    checklist.push({
      id: "inspection",
      label: "Technical inspection under 6 months",
      description: "For older vehicles, make sure the technical control is recognized and recent enough.",
      urgency: "required"
    });
  }

  if (input.countryOfOrigin !== "FR" && input.sellerType === "private") {
    checklist.push({
      id: "payment-proof",
      label: "Proof of payment",
      description: "Keep a traceable payment record for a private cross-border purchase.",
      urgency: "recommended"
    });
  }

  return checklist;
}

