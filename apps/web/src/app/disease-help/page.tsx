"use client";

import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { DiseaseUploadPanel } from "@/components/disease-upload-panel";
import { EmptyState } from "@/components/empty-state";
import { MetricTile } from "@/components/metric-tile";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { RiskCallout } from "@/components/ui/risk-callout";
import { SourceBadge } from "@/components/ui/source-badge";
import { formatDate } from "@/lib/format";
import { apiGet } from "@/lib/api";

type MeResponse = {
  farms: Array<{
    name: string;
    cropSeasons: Array<{
      id: string;
      cropName: string;
    }>;
  }>;
};

type ReportsResponse = {
  reports: Array<{
    id: string;
    predictedIssue: string | null;
    confidenceScore: number;
    recommendation: string;
    escalationRequired: boolean;
    status: string;
    provider: string;
    captureMode: "STANDARD" | "CAMERA_DUAL_ANGLE";
    analysisSource: "MOCK_PROVIDER" | "LIVE_PROVIDER";
    createdAt: string;
  }>;
};

export default function DiseaseHelpPage() {
  return (
    <AuthGate>
      <DiseaseHelpContent />
    </AuthGate>
  );
}

function DiseaseHelpContent() {
  const { data: meData } = useSWR("/me", () => apiGet<MeResponse>("/me"));
  const { data: reportsData } = useSWR("/disease-reports", () =>
    apiGet<ReportsResponse>("/disease-reports"),
  );

  const seasons =
    meData?.farms.flatMap((farm) =>
      farm.cropSeasons.map((season) => ({
        ...season,
        farmPlot: {
          name: farm.name,
        },
      })),
    ) ?? [];
  const reports = reportsData?.reports ?? [];

  return (
    <AppShell
      title="Disease help"
      description="Use guided dual-angle capture when possible: one close symptom photo and one wider plant view. Results stay confidence-aware and escalation-first."
      eyebrow="Support"
    >
      <SectionCard title="Triage workspace" eyebrow="Capture and submit">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <DiseaseUploadPanel seasons={seasons} />
          </div>
          <div className="space-y-4">
            <MetricTile
              label="Saved seasons"
              value={seasons.length}
              hint="Available for report submission."
              tone="brand"
            />
            <MetricTile
              label="Reports submitted"
              value={reports.length}
              hint="Recent disease and pest reports."
              tone="danger"
            />
            <RiskCallout title="Escalation-first design" tone="warning">
              This flow is intentionally cautious. Low-confidence results and
              unclear issues should be escalated before treatment decisions.
            </RiskCallout>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent reports" eyebrow="History and outcomes">
        {reports.length ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <article
                key={report.id}
                className="surface-card-strong rounded-[var(--radius-panel)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={report.escalationRequired ? "danger" : "success"}>
                        {report.status}
                      </Badge>
                      <ConfidenceBadge value={confidenceValue(report.confidenceScore)} />
                      <Badge tone="brand">
                        {report.captureMode.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[var(--foreground)]">
                        {report.predictedIssue ?? "Unclear issue"}
                      </p>
                      <p className="mt-2 text-sm muted">
                        Submitted on {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="surface-card-muted rounded-[var(--radius-card)] p-4 text-right">
                    <p className="eyebrow">Model score</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)] number-data">
                      {(report.confidenceScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 muted">
                  {report.recommendation}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SourceBadge label={report.provider} />
                  <Badge tone="info">{report.analysisSource.replace(/_/g, " ")}</Badge>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No disease reports yet"
            description="Submit a crop issue report to start building report history and confidence-aware triage outcomes."
          />
        )}
      </SectionCard>
    </AppShell>
  );
}

function confidenceValue(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 0.8) return "HIGH";
  if (score >= 0.55) return "MEDIUM";
  return "LOW";
}
