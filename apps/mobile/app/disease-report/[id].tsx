import { Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as Speech from 'expo-speech';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ActionCTAGroup } from '@/components/action-cta-group';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { DiseaseReportResponse } from '@/lib/api-types';
import { API_BASE_URL } from '@/lib/env';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

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
          description="The backend response will appear here as soon as the diagnosis is ready."
        />
      </PageShell>
    );
  }

  const recommendation = report.recommendation.trim();

  return (
    <>
      <Stack.Screen options={{ title: 'Crop health result' }} />
      <PageShell
        eyebrow="Crop health result"
        title="Disease detection result"
        subtitle="Review the diagnosis guidance from your latest crop scan."
      >
        {(report.image1Url || report.image2Url) ? (
          <View style={topGalleryStyle}>
            <View style={topGalleryHeaderStyle}>
              <Text style={eyebrowTextStyle}>Diagnosis capture</Text>
              <Text style={topGalleryTitleStyle}>Photos used for this result</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <ResultImageCard
                label="Close-up symptom"
                source={resolveReportImageSource(report.image1Url, token)}
              />
              <ResultImageCard
                label="Wider crop view"
                source={resolveReportImageSource(report.image2Url, token)}
              />
            </View>
          </View>
        ) : null}

        <View style={resultCardStyle}>
          <View style={resultCardHeaderStyle}>
            <Text style={eyebrowTextStyle}>Result</Text>
            <Text style={resultCardTitleStyle}>Diagnosis guidance</Text>
          </View>

          <View style={resultBodyShellStyle}>
            {recommendation ? (
              <MarkdownRecommendation text={recommendation} />
            ) : (
              <Text style={emptyTextStyle}>
                The backend did not return any formatted result for this diagnosis.
              </Text>
            )}
          </View>
        </View>

        <ActionCTAGroup
          actions={[
            {
              label: 'Listen to advice',
              variant: 'soft',
              onPress: () => {
                if (recommendation) {
                  Speech.speak(recommendation);
                }
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

function ResultImageCard({
  label,
  source,
}: {
  label: string;
  source?: string | { uri: string; headers?: Record<string, string> } | null;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={imageLabelStyle}>{label}</Text>
      <View style={imageFrameStyle}>
        {source ? (
          <Image source={source} contentFit="cover" style={resultImageStyle} />
        ) : (
          <View style={imageFallbackStyle}>
            <Text style={imageFallbackTextStyle}>No image</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function resolveReportImageSource(uri?: string | null, token?: string | null) {
  if (!uri) {
    return null;
  }

  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    return null;
  }

  const uploadsMatch = normalizedUri.match(/\/(?:v1\/)?uploads\/([^/]+)\/([^/?#]+)/i);
  if (uploadsMatch) {
    const [, folder, filename] = uploadsMatch;
    const nextUri = `${API_BASE_URL}/v1/uploads/${folder}/${filename}`;

    return token
      ? {
          uri: nextUri,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : nextUri;
  }

  const mediaMatch = normalizedUri.match(/\/(?:v1\/)?media\/([^/]+)\/([^/?#]+)/i);
  if (mediaMatch) {
    const [, folder, filename] = mediaMatch;
    const nextUri = `${API_BASE_URL}/v1/media/${folder}/${filename}`;

    return token
      ? {
          uri: nextUri,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : nextUri;
  }

  return normalizedUri;
}

function MarkdownRecommendation({ text }: { text: string }) {
  const blocks = toMarkdownBlocks(text);

  return (
    <View style={{ gap: spacing.lg }}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text key={`heading-${index}`} style={headingTextStyle}>
              {renderInlineMarkdown(block.text)}
            </Text>
          );
        }

        if (block.type === 'ordered-list') {
          return (
            <View key={`ordered-${index}`} style={{ gap: spacing.sm }}>
              {block.items.map((item, itemIndex) => (
                <View
                  key={`${item}-${itemIndex}`}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
                >
                  <Text style={bulletLabelStyle}>{`${itemIndex + 1}.`}</Text>
                  <Text style={bodyTextStyle}>{renderInlineMarkdown(item)}</Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'unordered-list') {
          return (
            <View key={`unordered-${index}`} style={{ gap: spacing.sm }}>
              {block.items.map((item, itemIndex) => (
                <View
                  key={`${item}-${itemIndex}`}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
                >
                  <Text style={bulletLabelStyle}>{'\u2022'}</Text>
                  <Text style={bodyTextStyle}>{renderInlineMarkdown(item)}</Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type !== 'paragraph') {
          return null;
        }

        return (
          <Text key={`paragraph-${index}`} style={bodyTextStyle}>
            {renderInlineMarkdown(block.text)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${part}-${index}`} style={strongTextStyle}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    return <Text key={`${part}-${index}`}>{part}</Text>;
  });
}

function toMarkdownBlocks(text: string) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: Array<
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'unordered-list' | 'ordered-list'; items: string[] }
  > = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join(' ').trim(),
    });
    paragraphLines = [];
  };

  for (const rawLine of lines.length ? lines : [text]) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', text: heading[1] });
      continue;
    }

    const orderedBullet = line.match(/^\d+\.\s+(.+)$/);
    const unorderedBullet = line.match(/^[-*]\s+(.+)$/);
    const lastBlock = blocks.at(-1);

    if (orderedBullet) {
      flushParagraph();
      if (lastBlock?.type === 'ordered-list') {
        lastBlock.items.push(orderedBullet[1]);
      } else {
        blocks.push({ type: 'ordered-list', items: [orderedBullet[1]] });
      }
      continue;
    }

    if (unorderedBullet) {
      flushParagraph();
      if (lastBlock?.type === 'unordered-list') {
        lastBlock.items.push(unorderedBullet[1]);
      } else {
        blocks.push({ type: 'unordered-list', items: [unorderedBullet[1]] });
      }
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return blocks.length > 0 ? blocks : [{ type: 'paragraph' as const, text }];
}

const headingTextStyle = {
  color: palette.ink,
  fontFamily: typography.bodyStrong,
  fontSize: 19,
  lineHeight: 26,
} as const;

const bodyTextStyle = {
  flex: 1,
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 15,
  lineHeight: 25,
} as const;

const strongTextStyle = {
  color: palette.ink,
  fontFamily: typography.bodyStrong,
} as const;

const bulletLabelStyle = {
  width: 18,
  color: palette.inkSoft,
  fontFamily: typography.bodyStrong,
  fontSize: 15,
  lineHeight: 25,
} as const;

const emptyTextStyle = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 14,
  lineHeight: 22,
} as const;

const topGalleryStyle = {
  gap: spacing.md,
  padding: spacing.md,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: 'rgba(47, 125, 78, 0.12)',
  backgroundColor: palette.white,
  boxShadow: shadow.soft,
} as const;

const topGalleryHeaderStyle = {
  gap: spacing.xs,
} as const;

const resultCardStyle = {
  overflow: 'hidden',
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: 'rgba(47, 125, 78, 0.18)',
  backgroundColor: palette.white,
  boxShadow: shadow.soft,
} as const;

const resultCardHeaderStyle = {
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(47, 125, 78, 0.12)',
  backgroundColor: palette.mint,
} as const;

const resultBodyShellStyle = {
  margin: spacing.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: palette.soil,
  backgroundColor: palette.parchmentSoft,
} as const;

const eyebrowTextStyle = {
  color: '#8A6A2F',
  fontFamily: typography.bodyStrong,
  fontSize: 11,
  textTransform: 'uppercase',
} as const;

const topGalleryTitleStyle = {
  color: palette.ink,
  fontFamily: typography.bodyStrong,
  fontSize: 18,
  lineHeight: 24,
} as const;

const resultCardTitleStyle = {
  color: palette.ink,
  fontFamily: typography.bodyStrong,
  fontSize: 21,
  lineHeight: 27,
} as const;

const imageLabelStyle = {
  color: palette.inkSoft,
  fontFamily: typography.bodyStrong,
  fontSize: 12,
} as const;

const imageFrameStyle = {
  overflow: 'hidden',
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: palette.outline,
  backgroundColor: palette.parchmentSoft,
} as const;

const resultImageStyle = {
  width: '100%',
  height: 168,
} as const;

const imageFallbackStyle = {
  height: 168,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.dune,
} as const;

const imageFallbackTextStyle = {
  color: palette.inkMuted,
  fontFamily: typography.bodyRegular,
  fontSize: 13,
} as const;
