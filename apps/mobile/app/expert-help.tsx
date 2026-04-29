import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquareWarning, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/button';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { DiseaseReportResponse } from '@/lib/api-types';
import { palette, semanticColors, spacing, typography } from '@/theme/tokens';

export default function ExpertHelpRoute() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const router = useRouter();
  const { token } = useSession();

  const reportQuery = useCachedQuery({
    cacheKey: `disease-report:${params.reportId ?? 'none'}`,
    queryKey: ['disease-report', token, params.reportId],
    enabled: Boolean(token && params.reportId),
    queryFn: () =>
      apiGet<DiseaseReportResponse>(`/disease-reports/${params.reportId ?? ''}`, token),
  });

  const report = reportQuery.data?.report ?? null;

  return (
    <>
      <Stack.Screen options={{ title: 'Expert help' }} />
      <PageShell
        eyebrow="Human support"
        title="Prepare for expert review"
        subtitle="The current backend does not expose a live expert-review endpoint, so this screen helps you gather the case safely."
      >
        <SunriseCard accent="danger" title="What is ready now">
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ShieldCheck color={semanticColors.danger} size={18} />
              <Text
                style={{
                  flex: 1,
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                IntelliFarm has preserved your photos, crop context, and AI advisory so you can explain the issue clearly to a human expert.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MessageSquareWarning color={semanticColors.warning} size={18} />
              <Text
                style={{
                  flex: 1,
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                Submitting directly to an agri expert is still a frontend-safe placeholder because there is no backend review route yet.
              </Text>
            </View>
          </View>
        </SunriseCard>

        <SunriseCard accent="info" title="Case summary">
          <View style={{ gap: spacing.sm }}>
            <SummaryLine label="Crop" value={report?.cropSeason?.cropName ?? 'Use your crop name'} />
            <SummaryLine label="Location" value={report?.placeLabel ?? report?.cropSeason?.cropName ?? 'Use your village and plot name'} />
            <SummaryLine label="AI result" value={report?.predictedIssue ?? 'Explain the main visible issue'} />
            <SummaryLine label="Farmer note" value={report?.userNote ?? 'Describe when it started and whether it is spreading'} />
          </View>
        </SunriseCard>

        <SunriseCard accent="warning" title="Simple next steps">
          <View style={{ gap: spacing.sm }}>
            <Text style={bulletStyle}>1. Show both photos to the expert or local KVK.</Text>
            <Text style={bulletStyle}>2. Mention the crop stage and how many days the issue has been visible.</Text>
            <Text style={bulletStyle}>3. Do not guess a pesticide dosage from low-confidence AI output.</Text>
            <Text style={bulletStyle}>4. Recheck weather before any spray recommendation is followed.</Text>
          </View>
        </SunriseCard>

        <View style={{ gap: spacing.sm }}>
          <Button label="Back to crop result" variant="soft" onPress={() => router.back()} />
          <Button label="Ask IntelliFarm by voice" onPress={() => router.push('/voice')} />
        </View>
      </PageShell>
    </>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyRegular,
          fontSize: 14,
          lineHeight: 21,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const bulletStyle = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 14,
  lineHeight: 21,
};
