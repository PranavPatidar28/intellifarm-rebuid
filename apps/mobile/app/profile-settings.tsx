import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Languages,
  LifeBuoy,
  MapPinned,
  SquarePen,
  Sprout,
} from 'lucide-react-native';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { InsetCard } from '@/components/inset-card';
import { PageShell } from '@/components/page-shell';
import { ProfileHeroCard } from '@/components/profile-hero-card';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { apiPost, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-types';
import { languages, storageKeys } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { storage, useStoredValue } from '@/lib/storage';
import { gradients, palette, radii, spacing, typography } from '@/theme/tokens';

function buildImagePart(uri: string) {
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  return {
    uri,
    name: `profile-photo.${extension}`,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob;
}

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

type OperationalStatus = 'ACTIVE' | 'PLANNED';

type FarmSnapshot = {
  id: string;
  name: string;
  areaLabel: string;
  locationLabel: string;
  irrigationLabel: string;
  seasons: Array<{
    id: string;
    cropName: string;
    currentStage: string;
    status: 'ACTIVE' | 'PLANNED';
  }>;
  primarySeason:
    | {
        id: string;
        cropName: string;
        currentStage: string;
        status: 'ACTIVE' | 'PLANNED';
      }
    | null;
};

export default function ProfileSettingsRoute() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { authUser, profile, token, signOut, refreshSession } = useSession();
  const [profileNotice] = useStoredValue<string | null>(
    storageKeys.profileSettingsNotice,
    null,
  );
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!profileNotice) {
      return;
    }

    setStatusMessage({ tone: 'success', text: profileNotice });
    storage.remove(storageKeys.profileSettingsNotice);
  }, [profileNotice]);

  const operationalSeasons = useMemo(
    () =>
      profile?.farms.flatMap((farm) =>
        farm.cropSeasons
          .filter((season) => isOperationalStatus(season.status))
          .map((season) => ({
            id: season.id,
            cropName: season.cropName,
            currentStage: season.currentStage,
            status: season.status as OperationalStatus,
            farmPlotName: farm.name,
          })),
      ) ?? [],
    [profile],
  );
  const farmSnapshots = useMemo<FarmSnapshot[]>(
    () =>
      profile?.farms.map((farm) => {
        const seasons = farm.cropSeasons
          .filter((season) => isOperationalStatus(season.status))
          .map((season) => ({
            id: season.id,
            cropName: season.cropName,
            currentStage: season.currentStage,
            status: season.status as OperationalStatus,
          }));

        return {
          id: farm.id,
          name: farm.name,
          areaLabel: `${formatPlotArea(farm.area)} acre plot`,
          locationLabel: [farm.village, farm.district, farm.state].filter(Boolean).join(', '),
          irrigationLabel: titleCase(farm.irrigationType),
          seasons,
          primarySeason: seasons.find((season) => season.status === 'ACTIVE') ?? seasons[0] ?? null,
        };
      }) ?? [],
    [profile],
  );
  const activeCropCount = useMemo(
    () => operationalSeasons.filter((season) => season.status === 'ACTIVE').length,
    [operationalSeasons],
  );
  const plannedCropCount = useMemo(
    () => operationalSeasons.filter((season) => season.status === 'PLANNED').length,
    [operationalSeasons],
  );
  const locationSummary = useMemo(() => {
    const parts = [authUser?.village, authUser?.district, authUser?.state].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Location details still missing';
  }, [authUser?.district, authUser?.state, authUser?.village]);
  const languageLabel =
    languages.find((item) => item.code === authUser?.preferredLanguage)?.label ?? 'English';
  const stackedPlotDetails = width < 380;
  const planTargetRoute =
    activeCropCount || plannedCropCount ? ('/crop-plan' as const) : ('/season' as const);

  const uploadPhoto = async () => {
    if (!token) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatusMessage({
        tone: 'warning',
        text: 'Photo access is needed to update the profile image.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setPhotoBusy(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', buildImagePart(result.assets[0].uri));
      await apiPost<{ user: AuthUser }>('/me/photo', formData, token);
      await refreshSession();
      setStatusMessage({ tone: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError
            ? error.message
            : 'Could not upload the profile photo.',
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile & settings' }} />
      <PageShell
        eyebrow="Farmer profile"
        title="Profile & settings"
        subtitle="Keep your farm identity, local context, and everyday tools easy to reach."
        heroTone="assistant"
        hero={
          <ProfileHeroCard
            user={authUser}
            farmCount={profile?.farmCount ?? 0}
            cropCount={activeCropCount}
          />
        }
      >
        {statusMessage ? (
          <ProfileStatusCard
            message={statusMessage.text}
            tone={statusMessage.tone}
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle title="Farmer tools" />
          <Pressable onPress={() => router.push(planTargetRoute)}>
            <GradientFeatureCard colors={gradients.assistantGlow} padding={14}>
              <View style={{ gap: spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      Featured
                    </Text>
                    <Text
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 17,
                        lineHeight: 22,
                      }}
                    >
                      Crop plan
                    </Text>
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {activeCropCount || plannedCropCount
                        ? 'Open the stage-wise plan to review next actions, crop progress, and weekly advisories.'
                        : 'Start a crop season to unlock stage-wise planning and field action guidance.'}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radii.md,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: palette.white,
                      borderWidth: 1,
                      borderColor: 'rgba(30, 42, 34, 0.08)',
                    }}
                  >
                    <CalendarDays color={palette.leafDark} size={18} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  <ToolStatPill
                    label="Active"
                    value={String(activeCropCount)}
                    tone="leaf"
                  />
                  <ToolStatPill
                    label="Planned"
                    value={String(plannedCropCount)}
                    tone="sky"
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={{
                      color: palette.leafDark,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                    }}
                  >
                    {activeCropCount || plannedCropCount
                      ? 'Open crop plan'
                      : 'Set up crop season'}
                  </Text>
                  <ArrowRight color={palette.leafDark} size={16} />
                </View>
              </View>
            </GradientFeatureCard>
          </Pressable>

          <CompactListCard
            title="Alerts & reminders"
            subtitle="Open weather, crop-health, and market reminders in one place."
            prefix={<Bell color={palette.mustard} size={18} />}
            onPress={() => router.push('/alerts')}
          />
          <CompactListCard
            title="Expert help"
            subtitle="Reach the guided support flow when the crop issue needs more help."
            prefix={<LifeBuoy color={palette.terracotta} size={18} />}
            onPress={() => router.push('/expert-help')}
          />
        </View>

        <SunriseCard accent="brand" title="Preferences & account">
          <View style={{ gap: spacing.md }}>
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 18,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.outline,
                backgroundColor: palette.white,
                gap: spacing.xs,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Languages color={palette.leafDark} size={18} />
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 14,
                  }}
                >
                  Current language
                </Text>
              </View>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {languageLabel}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 18,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.outline,
                backgroundColor: palette.white,
                gap: spacing.xs,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Sprout color={palette.leafDark} size={18} />
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 14,
                  }}
                >
                  Farmer details
                </Text>
              </View>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {authUser?.name?.trim() || 'Farmer name missing'}
              </Text>
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyRegular,
                  fontSize: 11,
                }}
              >
                {locationSummary}
              </Text>
            </View>
          </View>
        </SunriseCard>

        <View style={{ gap: spacing.sm }}>
          <Button
            label="Edit details"
            icon={<SquarePen color={palette.white} size={16} />}
            onPress={() => router.push('/profile-settings-edit')}
          />
          <Button
            label={photoBusy ? 'Uploading photo...' : 'Change photo'}
            variant="soft"
            loading={photoBusy}
            onPress={() => {
              void uploadPhoto();
            }}
          />
          <Button
            label="Log out"
            variant="ghost"
            onPress={() => {
              void signOut().then(() => router.replace('/login'));
            }}
          />
        </View>
      </PageShell>
    </>
  );
}

function formatPlotArea(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isOperationalStatus(status: string): status is OperationalStatus {
  return status === 'ACTIVE' || status === 'PLANNED';
}

function ToolStatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'leaf' | 'sky';
}) {
  const colors =
    tone === 'leaf'
      ? { backgroundColor: palette.leafMist, textColor: palette.leafDark }
      : { backgroundColor: palette.skySoft, textColor: palette.sky };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.backgroundColor,
      }}
    >
      <Text
        style={{
          color: colors.textColor,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.textColor,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ContextMetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'leaf' | 'sky' | 'sunrise';
}) {
  const colors =
    tone === 'leaf'
      ? { backgroundColor: palette.leafMist, textColor: palette.leafDark }
      : tone === 'sky'
        ? { backgroundColor: palette.skySoft, textColor: palette.sky }
        : { backgroundColor: palette.mustardSoft, textColor: palette.mustard };

  return (
    <View
      style={{
        minWidth: 94,
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
      }}
    >
      <Text
        style={{
          color: palette.inkMuted,
          fontFamily: typography.bodyStrong,
          fontSize: 10,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: colors.backgroundColor,
        }}
      >
        <Text
          style={{
            color: colors.textColor,
            fontFamily: typography.bodyStrong,
            fontSize: 12,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function FarmDetailTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.parchmentSoft,
      }}
    >
      <Text
        style={{
          color: palette.inkMuted,
          fontFamily: typography.bodyStrong,
          fontSize: 10,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 15,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 11,
          lineHeight: 17,
        }}
      >
        {helper}
      </Text>
    </View>
  );
}

function SeasonStatusPill({
  status,
}: {
  status: 'ACTIVE' | 'PLANNED' | 'EMPTY';
}) {
  const colors =
    status === 'ACTIVE'
      ? { backgroundColor: palette.leafMist, textColor: palette.leafDark, label: 'Active' }
      : status === 'PLANNED'
        ? { backgroundColor: palette.skySoft, textColor: palette.sky, label: 'Planned' }
        : {
            backgroundColor: palette.mustardSoft,
            textColor: palette.mustard,
            label: 'No season',
          };

  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.backgroundColor,
      }}
    >
      <Text
        style={{
          color: colors.textColor,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {colors.label}
      </Text>
    </View>
  );
}
