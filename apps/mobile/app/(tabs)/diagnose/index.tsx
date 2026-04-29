import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus, Sparkles, TriangleAlert } from 'lucide-react-native';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { EmptyState } from '@/components/empty-state';
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
import { getAllSeasons } from '@/lib/domain';
import { submitDiseaseReport } from '@/lib/disease-upload';
import { formatLongDate } from '@/lib/format';
import { queueDiseaseUpload } from '@/lib/pending-disease-uploads';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export default function DiagnoseRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { profile, token } = useSession();
  const [storedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [pendingUploads] = useStoredValue(storageKeys.pendingDiseaseReports, []);
  const [cropSeasonId, setCropSeasonId] = useState(storedSeasonId);
  const [placeLabel, setPlaceLabel] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [daysVisible, setDaysVisible] = useState('');
  const [spreadStatus, setSpreadStatus] = useState<'YES' | 'NO' | 'NOT_SURE'>('NOT_SURE');
  const [diseasedImageUri, setDiseasedImageUri] = useState('');
  const [cropImageUri, setCropImageUri] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const seasons = useMemo(() => getAllSeasons(profile), [profile]);

  const reportsQuery = useCachedQuery({
    cacheKey: 'disease-reports',
    queryKey: ['disease-reports', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<DiseaseReportsResponse>('/disease-reports', token),
  });

  const latestReports = reportsQuery.data?.reports.slice(0, 3) ?? [];

  const composedNote = useMemo(() => {
    const segments = [
      symptoms.trim(),
      daysVisible.trim() ? `Visible for ${daysVisible.trim()} day(s).` : '',
      spreadStatus === 'YES'
        ? 'Farmer says the issue is spreading.'
        : spreadStatus === 'NO'
          ? 'Farmer says the issue is not spreading.'
          : 'Spread is not yet confirmed.',
    ].filter(Boolean);

    return segments.join(' ');
  }, [daysVisible, spreadStatus, symptoms]);

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

    if (!cropSeasonId && !placeLabel.trim()) {
      setMessage('Choose a saved crop season or enter a place label.');
      return;
    }

    const userNote = composedNote || undefined;

    if (!token || network.isOffline) {
      await queueDiseaseUpload({
        cropSeasonId: cropSeasonId || undefined,
        placeLabel: cropSeasonId ? undefined : placeLabel.trim(),
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
        cropSeasonId: cropSeasonId || undefined,
        placeLabel: cropSeasonId ? undefined : placeLabel.trim(),
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
      title="Dual-photo crop check"
      subtitle="Use one close-up photo and one full crop photo for a safer AI triage."
      heroTone="assistant"
      hero={
        <SunriseCard accent="soft" title="Safer diagnosis">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            IntelliFarm keeps confidence visible and does not treat one blurry image as final proof.
          </Text>
        </SunriseCard>
      }
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

      <SectionTitle eyebrow="Step 1" title="Attach two photos" />
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

      <SectionTitle eyebrow="Step 2" title="Add field context" />
      {seasons.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {seasons.map((season) => (
            <Button
              key={season.id}
              label={`${season.cropName} - ${season.farmPlot.name}`}
              fullWidth={false}
              variant={cropSeasonId === season.id ? 'primary' : 'soft'}
              onPress={() => {
                setCropSeasonId(cropSeasonId === season.id ? '' : season.id);
              }}
            />
          ))}
        </View>
      ) : null}

      {!cropSeasonId ? (
        <TextField
          label="Place label"
          value={placeLabel}
          onChangeText={setPlaceLabel}
          placeholder="Village or field nickname"
          helper="Only needed if the issue is not tied to one saved crop season."
        />
      ) : null}

      <TextField
        label="What do you notice?"
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="Brown spots, yellow edges, wilting..."
        multiline
      />
      <TextField
        label="How many days has it been visible?"
        value={daysVisible}
        onChangeText={setDaysVisible}
        keyboardType="numeric"
      />

      <SunriseCard accent="soft" title="Is it spreading?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[
            { value: 'YES', label: 'Yes' },
            { value: 'NO', label: 'No' },
            { value: 'NOT_SURE', label: 'Not sure' },
          ].map((option) => (
            <Button
              key={option.value}
              label={option.label}
              fullWidth={false}
              variant={spreadStatus === option.value ? 'primary' : 'soft'}
              onPress={() => setSpreadStatus(option.value as typeof spreadStatus)}
            />
          ))}
        </View>
      </SunriseCard>

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

      <SectionTitle eyebrow="Recent checks" title="Crop health history" />
      <View style={{ gap: spacing.sm }}>
        {latestReports.length ? (
          latestReports.map((report) => (
            <CompactListCard
              key={report.id}
              title={report.predictedIssue ?? 'Unclear issue'}
              subtitle={report.recommendation}
              meta={formatLongDate(report.createdAt)}
              trailing={<ConfidenceBadge score={report.confidenceScore} />}
              onPress={() =>
                router.push({
                  pathname: '/disease-report/[id]',
                  params: { id: report.id },
                })
              }
            >
              {report.escalationRequired ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <TriangleAlert color={semanticColors.danger} size={16} />
                  <Text
                    style={{
                      color: semanticColors.danger,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    Expert review recommended
                  </Text>
                </View>
              ) : null}
            </CompactListCard>
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
