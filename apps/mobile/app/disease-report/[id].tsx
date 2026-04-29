import { Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as Speech from 'expo-speech';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';

import { ActionCTAGroup } from '@/components/action-cta-group';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { DiseaseReportResponse } from '@/lib/api-types';
import { formatLongDate, titleCase } from '@/lib/format';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export default function DiseaseReportDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useSession();

  const reportQuery = useCachedQuery({
    cacheKey: `disease-report:${params.id}`,
    queryKey: ['disease-report', token, params.id],
    enabled: Boolean(token && params.id),
    queryFn: () => apiGet<DiseaseReportResponse>(`/disease-reports/${params.id}`, token),
  });

  const report = reportQuery.data?.report ?? null;

  if (!report) {
    return (
      <PageShell
        eyebrow="Crop health result"
        title="Loading crop health result"
        subtitle="Restoring the latest disease triage from your account."
      >
        <RichEmptyState
          title="Result is on the way"
          description="Once the report loads, IntelliFarm will show the confidence, safe first action, and when to get human help."
        />
      </PageShell>
    );
  }

  const issueLabel = report.predictedIssue ?? 'Unclear issue';

  return (
    <>
      <Stack.Screen options={{ title: 'Crop health result' }} />
      <PageShell
        eyebrow="Crop health result"
        title={issueLabel}
        subtitle={report.cropSeason?.cropName ?? report.placeLabel ?? 'Manual field note'}
      >
        <SunriseCard accent="danger" title="AI advisory, not final diagnosis">
          <View style={{ gap: spacing.sm }}>
            <ConfidenceBadge score={report.confidenceScore} />
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              For pesticide choice or dosage, use verified local advice. IntelliFarm only gives the safest next step from the current backend response.
            </Text>
          </View>
        </SunriseCard>

        {(report.image1Url || report.image2Url) ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {[report.image1Url, report.image2Url].filter(Boolean).map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  borderRadius: radii.lg,
                  backgroundColor: palette.white,
                }}
              >
                <Image source={uri as string} contentFit="cover" style={{ width: '100%', height: 180 }} />
              </View>
            ))}
          </View>
        ) : null}

        <SunriseCard accent="info" title="Symptoms detected">
          <View style={{ gap: spacing.xs }}>
            {report.symptomsDetected.map((symptom) => (
              <Text
                key={symptom}
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                • {symptom}
              </Text>
            ))}
          </View>
        </SunriseCard>

        <SunriseCard accent="brand" title="Safe first action">
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyRegular,
              fontSize: 15,
              lineHeight: 23,
            }}
          >
            {report.safeFirstAction}
          </Text>
        </SunriseCard>

        <SunriseCard accent="warning" title="Possible cause">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {report.possibleCause}
          </Text>
        </SunriseCard>

        <SunriseCard accent="danger" title="What not to do">
          <View style={{ gap: spacing.xs }}>
            {report.whatNotToDo.map((item) => (
              <Text
                key={item}
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                • {item}
              </Text>
            ))}
          </View>
        </SunriseCard>

        <SunriseCard accent="soft" title="Next steps">
          <View style={{ gap: spacing.xs }}>
            {report.nextActions.map((item) => (
              <Text
                key={item}
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                • {item}
              </Text>
            ))}
          </View>
        </SunriseCard>

        <SunriseCard accent="warning" title="Case summary">
          <View style={{ gap: spacing.sm }}>
            <SummaryRow label="Status" value={titleCase(report.status)} />
            <SummaryRow
              label="Needs expert"
              value={report.escalationRequired ? 'Yes' : 'Not required yet'}
            />
            <SummaryRow label="Confidence band" value={titleCase(report.confidenceBand)} />
            <SummaryRow label="Analysis source" value={titleCase(report.analysisSource)} />
            <SummaryRow label="Captured" value={formatLongDate(report.createdAt)} />
            {report.userNote ? <SummaryRow label="Farmer note" value={report.userNote} /> : null}
          </View>
        </SunriseCard>

        {report.escalationRequired ? (
          <SunriseCard accent="danger" title="When to contact an expert">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TriangleAlert color={semanticColors.danger} size={18} />
              <Text
                style={{
                  flex: 1,
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {report.escalationReason ??
                  'Confidence is limited or the risk looks serious. Move carefully and prepare the case summary for an agronomist or KVK before acting.'}
              </Text>
            </View>
          </SunriseCard>
        ) : null}

        <ActionCTAGroup
          actions={[
            {
              label: 'Listen to advice',
              variant: 'soft',
              onPress: () => {
                Speech.speak(`${issueLabel}. ${report.safeFirstAction}`);
              },
            },
            {
              label: 'Ask expert',
              onPress: () =>
                router.push({
                  pathname: '/expert-help',
                  params: { reportId: report.id },
                }),
            },
            {
              label: 'Retake photos',
              variant: 'ghost',
              onPress: () => router.replace('/diagnose'),
            },
          ]}
        />
      </PageShell>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
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
