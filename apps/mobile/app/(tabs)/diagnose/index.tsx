import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus, Sparkles, TriangleAlert } from 'lucide-react-native';

import { Button } from '@/components/button';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { EmptyState } from '@/components/empty-state';
import { InsetCard } from '@/components/inset-card';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { UploadFrameCard } from '@/components/upload-frame-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet, ApiError } from '@/lib/api';
import type { DiseaseReportsResponse } from '@/lib/api-types';
import { API_BASE_URL } from '@/lib/env';
import { submitDiseaseReport } from '@/lib/disease-upload';
import { formatLongDate } from '@/lib/format';
import { queueDiseaseUpload } from '@/lib/pending-disease-uploads';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, semanticColors, spacing, surfaces, typography } from '@/theme/tokens';

export default function DiagnoseRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { token } = useSession();
  const [pendingUploads] = useStoredValue(storageKeys.pendingDiseaseReports, []);
  const [symptoms, setSymptoms] = useState('');
  const [diseasedImageUri, setDiseasedImageUri] = useState('');
  const [cropImageUri, setCropImageUri] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reportsQuery = useCachedQuery({
    cacheKey: 'disease-reports',
    queryKey: ['disease-reports', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<DiseaseReportsResponse>('/disease-reports', token),
  });

  const resolveImageSource = (uri?: string | null) => {
    if (!uri) return null;
    const normalizedUri = uri.trim();
    if (!normalizedUri) return null;

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
  };

  const latestReports = reportsQuery.data?.reports.slice(0, 3) ?? [];

  const pickImage = async (kind: 'diseased' | 'crop') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Photo library permission is needed to upload crop images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setMessage('Could not read the selected image.');
      return;
    }

    if (kind === 'diseased') {
      setDiseasedImageUri(asset.uri);
    } else {
      setCropImageUri(asset.uri);
    }
  };

  const submit = async () => {
    if (!diseasedImageUri || !cropImageUri) {
      setMessage('Upload both the affected part photo and the full crop photo.');
      return;
    }

    const userNote = symptoms.trim() || undefined;

    if (!token || network.isOffline) {
      await queueDiseaseUpload({
        userNote,
        cropImageUri,
        diseasedImageUri,
      });
      setMessage('Saved offline. IntelliFarm will retry the diagnosis when the internet returns.');
      router.push('/offline');
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await submitDiseaseReport({
        token,
        userNote,
        cropImageUri,
        diseasedImageUri,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['disease-reports', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token] }),
      ]);

      router.push({
        pathname: '/disease-report/[id]',
        params: { id: response.report.id },
      });
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not analyze the crop problem right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      eyebrow="Diagnose crop problem"
      title="Crop Disease Check"
      subtitle="Upload a close-up and a full crop photo for accurate AI triage."
      heroTone="assistant"
    >
      {network.isOffline || pendingUploads.length ? (
        <OfflineBanner
          cachedAt={reportsQuery.cachedAt}
          pendingLabel={
            pendingUploads.length
              ? `${pendingUploads.length} diagnosis upload(s) are queued locally.`
              : 'You are offline. New photo submissions will be queued safely.'
          }
        />
      ) : null}

      <SectionTitle eyebrow="Step 1" title="Photos" />
      <View style={{ gap: spacing.sm }}>
        <PhotoTile
          title="Affected part photo"
          subtitle="Close leaf, stem, fruit, or damaged patch"
          icon={<Camera color={palette.terracotta} size={20} />}
          imageUri={diseasedImageUri}
          onPick={() => {
            void pickImage('diseased');
          }}
        />
        <PhotoTile
          title="Full crop photo"
          subtitle="Whole plant or wider crop view"
          icon={<ImagePlus color={palette.sky} size={20} />}
          imageUri={cropImageUri}
          onPick={() => {
            void pickImage('crop');
          }}
        />
      </View>

      <SectionTitle eyebrow="Step 2" title="Symptoms (Optional)" />
      <TextField
        label="What do you notice?"
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="e.g. Brown spots, yellow edges, wilting..."
        multiline
      />

      {message ? (
        <SunriseCard accent="warning" title="Upload note">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {message}
          </Text>
        </SunriseCard>
      ) : null}

      <Button
        label={busy ? 'Analyzing crop problem...' : 'Analyze crop problem'}
        loading={busy}
        onPress={() => {
          void submit();
        }}
      />
      <Button
        label="Open Assistant"
        variant="soft"
        onPress={() =>
          router.push({
            pathname: '/voice',
            params: {
              prompt:
                symptoms.trim().length > 0
                  ? `Help me think through this crop-health issue before I act: ${symptoms.trim()}`
                  : 'Help me think through a crop-health issue before I act.',
              originRoute: 'diagnose',
            },
          } as never)
        }
      />

      <SectionTitle eyebrow="Recent checks" title="Crop health history" />
      <View style={{ gap: spacing.sm }}>
        {latestReports.length ? (
          latestReports.map((report: any) => (
            <Pressable
              key={report.id}
              onPress={() =>
                router.push({
                  pathname: '/disease-report/[id]',
                  params: { id: report.id },
                })
              }
            >
              <InsetCard padding={12}>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                  {report.image1Url ? (
                    <Image
                      source={resolveImageSource(report.image1Url)}
                      style={{ width: 64, height: 64, borderRadius: radii.md }}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: radii.md, backgroundColor: surfaces.soft.backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
                      <Camera color={palette.inkMuted} size={24} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text
                        style={{
                          color: palette.ink,
                          fontFamily: typography.bodyStrong,
                          fontSize: 15,
                          flex: 1,
                          marginRight: spacing.sm,
                        }}
                        numberOfLines={1}
                      >
                        {report.predictedIssue ?? 'Unclear issue'}
                      </Text>
                      <Text
                        style={{
                          color: palette.inkMuted,
                          fontFamily: typography.bodyRegular,
                          fontSize: 11,
                        }}
                      >
                        {formatLongDate(report.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {report.recommendation}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                      <ConfidenceBadge score={report.confidenceScore} hidePercentage />
                      {report.escalationRequired ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TriangleAlert color={semanticColors.danger} size={14} />
                          <Text
                            style={{
                              color: semanticColors.danger,
                              fontFamily: typography.bodyStrong,
                              fontSize: 11,
                            }}
                          >
                            Expert review
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </InsetCard>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No diagnosis history yet"
            description="Your first crop-health scan will appear here after the upload completes."
          />
        )}
      </View>
    </PageShell>
  );
}

function PhotoTile({
  title,
  subtitle,
  icon,
  imageUri,
  onPick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  imageUri: string;
  onPick: () => void;
}) {
  return (
    <UploadFrameCard
      title={title}
      caption={subtitle}
      onPress={onPick}
      preview={
        imageUri ? (
          <View
            style={{
              overflow: 'hidden',
              borderRadius: radii.lg,
            }}
          >
            <Image
              source={imageUri}
              contentFit="cover"
              style={{ width: '100%', height: 180 }}
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
            {icon}
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              Daylight and sharp focus work best.
            </Text>
          </View>
        )
      }
    />
  );
}
