import type { Metadata } from "next";
import { ReportDocumentView } from "@/components/report-document";
import { getRequestSession } from "@/lib/server/auth";
import { getReportForUser } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

type ReportPageProps = { params: Promise<{ reportId: string }> };

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { reportId } = await params;
  const session = await getRequestSession();
  const document = session ? await getReportForUser(session.user.id, reportId) : null;

  if (!document) {
    return {
      title: "Private import report",
      description: "Sign in to view this ImportScore saved report.",
      robots: { index: false, follow: false }
    };
  }

  const description = `${document.vehicleLabel}: ${document.summary.verdict}, ${document.summary.riskLevel} risk, with landed cost and France market comparison.`;

  return {
    title: document.title,
    description,
    openGraph: {
      title: `${document.title} | ImportScore report`,
      description,
      type: "article"
    },
    robots: { index: false, follow: false }
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const session = await getRequestSession();
  const { reportId } = await params;

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Sign in required</h1>
          <p className="mt-3 text-sm text-slate-600">This report belongs to an account. Sign in from the main app to reopen it.</p>
        </div>
      </main>
    );
  }

  const document = await getReportForUser(session.user.id, reportId);
  if (!document) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Report not found</h1>
          <p className="mt-3 text-sm text-slate-600">This saved report could not be loaded for the current account.</p>
        </div>
      </main>
    );
  }

  return <ReportDocumentView report={document} />;
}