import type { Metadata } from "next";
import { ReportDocumentView } from "@/components/report-document";
import { getSharedReport } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

type SharedReportPageProps = { params: Promise<{ shareId: string }> };

export async function generateMetadata({ params }: SharedReportPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const document = await getSharedReport(shareId);

  if (!document) {
    return {
      title: "Shared report unavailable",
      description: "This ImportScore shared report link is missing or no longer available.",
      robots: { index: false, follow: false }
    };
  }

  const description = `${document.vehicleLabel}: ${document.summary.verdict}, ${document.summary.riskLevel} risk, with transparent cost and market assumptions.`;

  return {
    title: `${document.title} | Shared report`,
    description,
    openGraph: {
      title: `${document.title} | ImportScore shared report`,
      description,
      type: "article"
    },
    robots: { index: false, follow: false }
  };
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const { shareId } = await params;
  const document = await getSharedReport(shareId);

  if (!document) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Shared report unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">This share link is missing or no longer available.</p>
        </div>
      </main>
    );
  }

  return <ReportDocumentView report={document} shared />;
}