"use client";

import { Bot, Bug, ScrollText } from "lucide-react";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { MetricTile } from "@/components/metric-tile";
import { SectionCard } from "@/components/section-card";
import { SupportCard } from "@/components/support-card";
import { Badge } from "@/components/ui/badge";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiGet } from "@/lib/api";

type ReportsResponse = {
  reports: Array<{
    id: string;
  }>;
};

type SchemesResponse = {
  schemes: Array<{
    id: string;
  }>;
};

type ThreadsResponse = {
  threads: Array<{
    id: string;
  }>;
};

export default function SupportPage() {
  return (
    <AuthGate>
      <SupportContent />
    </AuthGate>
  );
}

function SupportContent() {
  const { data: reportsData } = useSWR("/disease-reports", () =>
    apiGet<ReportsResponse>("/disease-reports"),
  );
  const { data: schemesData } = useSWR("/schemes", () =>
    apiGet<SchemesResponse>("/schemes"),
  );
  const { data: threadsData } = useSWR("/assistant/threads", () =>
    apiGet<ThreadsResponse>("/assistant/threads"),
  );

  return (
    <AppShell
      title="Support"
      description="Move between grounded questions, disease triage, and official scheme discovery without hunting through separate tools."
      eyebrow="Advisory workspace"
    >
      <SectionCard title="Support command center" eyebrow="What is ready">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile
              label="Assistant threads"
              value={threadsData?.threads.length ?? 0}
              hint="Continue grounded conversations."
              tone="brand"
            />
            <MetricTile
              label="Disease reports"
              value={reportsData?.reports.length ?? 0}
              hint="Recent crop issue submissions."
              tone="danger"
            />
            <MetricTile
              label="Scheme records"
              value={schemesData?.schemes.length ?? 0}
              hint="Official programs currently indexed."
              tone="accent"
            />
          </div>
          <div className="space-y-4">
            <RiskCallout title="Support flows should reduce uncertainty" tone="info">
              Assistant answers, disease triage, and scheme browsing now sit under
              one support workspace so farmers can move from question to action
              with less context switching.
            </RiskCallout>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">Grounded assistant</Badge>
              <Badge tone="warning">Escalation-first diagnosis</Badge>
              <Badge tone="info">Official links only</Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SupportCard
          href="/assistant"
          icon={Bot}
          title="Grounded assistant"
          description="Ask about current weather, crop tasks, markets, and schemes using saved farm context."
          detail="Open assistant"
        />
        <SupportCard
          href="/disease-help"
          icon={Bug}
          title="Disease and pest support"
          description="Capture symptoms from two angles and review safe, escalation-first triage outcomes."
          detail="Open disease help"
        />
        <SupportCard
          href="/schemes"
          icon={ScrollText}
          title="Government schemes"
          description="Browse official schemes with state and crop filters to find relevant farmer support faster."
          detail="Open schemes"
        />
      </div>
    </AppShell>
  );
}
