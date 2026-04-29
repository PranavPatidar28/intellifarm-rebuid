import { useEffect, useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Camera,
  Plus,
  Sparkles,
  Sprout,
} from 'lucide-react-native';

import { Button } from '@/components/button';
import { FarmerAvatar } from '@/components/farmer-avatar';
import { HomeNewsCard } from '@/components/home-news-card';
import { HomePrimaryToolCard } from '@/components/home-primary-tool-card';
import { HomeSchemeCard } from '@/components/home-scheme-card';
import { HomeSeasonContextRow } from '@/components/home-season-context-row';
import { LoadingScreen } from '@/components/loading-screen';
import { MetricBadge } from '@/components/metric-badge';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SectionTitle } from '@/components/section-title';
import { TaskCard } from '@/components/task-card';
import { WeatherHeroCard } from '@/components/weather-hero-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet } from '@/lib/api';
import type {
  AlertsResponse,
  DashboardWeeklyResponse,
  SchemesResponse,
} from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { getFirstName } from '@/lib/format';
import { getOrderedHomeTasks, readHomeTasks, toggleHomeTask } from '@/lib/home-tasks';
import { getHomeNewsItems, getHomeSchemeHighlight } from '@/lib/home-news';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export default function HomeDashboardRoute() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const network = useNetworkStatus();
  const { authUser, token } = useSession();
  const [selectedSeasonId, setSelectedSeasonId] = useStoredValue(
    storageKeys.selectedSeasonId,
    '',
  );
  const [pendingUploads] = useStoredValue(storageKeys.pendingDiseaseReports, []);
  const [homeTasks] = useStoredValue(storageKeys.homeTasks, readHomeTasks());

  const queryString = selectedSeasonId ? `?cropSeasonId=${selectedSeasonId}` : '';
  const dashboardQuery = useCachedQuery({
    cacheKey: `dashboard-weekly:${selectedSeasonId || 'default'}`,
    queryKey: ['dashboard-weekly', token, selectedSeasonId],
    enabled: Boolean(token),
    queryFn: () => apiGet<DashboardWeeklyResponse>(`/dashboard/weekly${queryString}`, token),
    placeholderData: (previous) => previous,
  });
  const alertsQuery = useCachedQuery({
    cacheKey: 'alerts',
    queryKey: ['alerts', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<AlertsResponse>('/alerts', token),
  });

  const dashboard = dashboardQuery.data;
  const featuredSeason = dashboard?.featuredSeason ?? null;
  const homeSchemeQueryString = useMemo(() => {
    const scopedCropName = featuredSeason?.cropName?.trim();
    const scopedState = authUser?.state?.trim() || featuredSeason?.state?.trim();
    const params: string[] = [];

    if (scopedCropName) {
      params.push(`cropName=${encodeURIComponent(scopedCropName)}`);
    }

    if (scopedState) {
      params.push(`state=${encodeURIComponent(scopedState)}`);
    }

    return params.join('&');
  }, [authUser?.state, featuredSeason?.cropName, featuredSeason?.state]);
  const schemesQuery = useCachedQuery({
    cacheKey: `schemes:${homeSchemeQueryString || 'default'}`,
    queryKey: ['schemes', token, homeSchemeQueryString],
    enabled: Boolean(token && featuredSeason && !dashboard?.schemeSpotlight),
    queryFn: () =>
      apiGet<SchemesResponse>(
        `/schemes${homeSchemeQueryString ? `?${homeSchemeQueryString}` : ''}`,
        token,
      ),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!selectedSeasonId && dashboard?.featuredSeason?.cropSeasonId) {
      setSelectedSeasonId(dashboard.featuredSeason.cropSeasonId);
    }
  }, [dashboard?.featuredSeason?.cropSeasonId, selectedSeasonId, setSelectedSeasonId]);

  const visibleHomeTasks = useMemo(
    () => getOrderedHomeTasks(homeTasks).slice(0, 3),
    [homeTasks],
  );
  const openTaskCount = useMemo(
    () => homeTasks.filter((task) => !task.completed).length,
    [homeTasks],
  );
  const fallbackScheme = useMemo(() => {
    const schemes = schemesQuery.data?.schemes ?? [];
    const recommendedSchemeId = schemesQuery.data?.recommendedSchemeId;

    if (!schemes.length) {
      return null;
    }

    return schemes.find((scheme) => scheme.id === recommendedSchemeId) ?? schemes[0];
  }, [schemesQuery.data?.recommendedSchemeId, schemesQuery.data?.schemes]);
  const homeNewsItems = useMemo(
    () =>
      getHomeNewsItems({
        alerts: alertsQuery.data?.alerts ?? [],
        marketPulse: dashboard?.marketPulse ?? null,
        weatherHero: dashboard?.weatherHero ?? null,
        farmPlotId: featuredSeason?.farmPlotId,
      }),
    [alertsQuery.data?.alerts, dashboard?.marketPulse, dashboard?.weatherHero, featuredSeason?.farmPlotId],
  );
  const homeSchemeHighlight = useMemo(
    () =>
      getHomeSchemeHighlight({
        schemeSpotlight: dashboard?.schemeSpotlight ?? null,
        fallbackScheme,
      }),
    [dashboard?.schemeSpotlight, fallbackScheme],
  );
  const farmerFirstName = getFirstName(authUser?.name) ?? 'farmer';
  const homeHeaderAction = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        onPress={() => router.push('/alerts')}
        style={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.outline,
        }}
      >
        <Bell color={palette.leafDark} size={20} />
      </Pressable>
      <Pressable onPress={() => router.push('/profile-settings')}>
        <FarmerAvatar
          name={authUser?.name}
          profilePhotoUrl={authUser?.profilePhotoUrl}
          size={40}
        />
      </Pressable>
    </View>
  );

  if (dashboardQuery.isLoading && !dashboard) {
    return <LoadingScreen label="Loading your farm dashboard" />;
  }

  if (!featuredSeason) {
    return (
      <PageShell
        eyebrow="My farm"
        title={`Namaste, ${farmerFirstName}`}
        subtitle="Set up a crop season to unlock weekly farm actions."
        action={homeHeaderAction}
      >
        <RichEmptyState
          title="No active crop yet"
          description="Finish the crop setup to unlock weather guidance, mandi signals, expense tracking, and scheme suggestions."
          icon={<Sparkles color={palette.leafDark} size={20} />}
        />
        <Button label="Set up my current crop" onPress={() => router.push('/season')} />
      </PageShell>
    );
  }

  const activeSeasonId = selectedSeasonId || featuredSeason.cropSeasonId;
  const cacheBannerNeeded =
    network.isOffline || Boolean(dashboardQuery.error && dashboardQuery.hasCachedData);
  const featureToolsStacked = width < 386;
  const newsAndSchemesStacked = width < 410;

  return (
    <PageShell
      eyebrow="My farm"
      title={`Namaste, ${farmerFirstName}`}
      subtitle="Weekly farm actions"
      action={homeHeaderAction}
      heroTone="sunrise"
      hero={
        <HomeSeasonContextRow
          cropName={featuredSeason.cropName}
          currentStage={featuredSeason.currentStage}
          farmPlotName={featuredSeason.farmPlotName}
          stageProgressPercent={featuredSeason.stageProgressPercent}
          selectedSeasonId={activeSeasonId}
          seasonOptions={dashboard?.seasonSwitcher ?? []}
          onSeasonChange={(value) => setSelectedSeasonId(value)}
        />
      }
    >
      {cacheBannerNeeded ? (
        <OfflineBanner
          cachedAt={dashboardQuery.cachedAt}
          pendingLabel={
            pendingUploads.length
              ? `${pendingUploads.length} diagnosis upload(s) are waiting to sync.`
              : undefined
          }
        />
      ) : null}

      <WeatherHeroCard
        weather={dashboard?.weatherHero ?? null}
        loading={dashboardQuery.isLoading && !dashboard?.weatherHero}
        refreshing={dashboardQuery.isFetching}
        errorMessage={
          dashboardQuery.error ? 'Unable to refresh weather data right now.' : null
        }
        onRefresh={() => {
          void dashboardQuery.refetch();
        }}
        onForecast={() =>
          router.push({
            pathname: '/weather/[farmPlotId]',
            params: { farmPlotId: featuredSeason.farmPlotId },
          })
        }
        onAdvisory={() => router.push('/crop-plan')}
      />

      <View style={{ gap: spacing.sm }}>
        <SectionTitle title="Quick tools" />
        <View
          style={{
            flexDirection: featureToolsStacked ? 'column' : 'row',
            gap: spacing.sm,
          }}
        >
          <HomePrimaryToolCard
            title="Crop Prediction"
            icon={<Sprout color={palette.leafDark} size={20} />}
            tone="prediction"
            onPress={() => router.push('/crop-prediction')}
          />
          <HomePrimaryToolCard
            title="Disease Detection"
            icon={<Camera color={palette.sky} size={20} />}
            tone="diagnosis"
            onPress={() => router.push('/diagnose')}
          />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle
          title="Your tasks"
          action={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Pressable
                onPress={() => router.push('/personal-tasks' as never)}
                style={{
                  minHeight: 34,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: palette.outlineStrong,
                  backgroundColor: palette.white,
                }}
              >
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                  }}
                >
                  View all
                </Text>
                <ArrowRight color={palette.inkSoft} size={14} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/personal-task/[id]',
                    params: { id: 'new' },
                  } as never)
                }
                style={{
                  minHeight: 34,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: palette.leaf,
                  backgroundColor: palette.leafMist,
                }}
              >
                <Plus color={palette.leafDark} size={15} />
                <Text
                  style={{
                    color: palette.leafDark,
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                  }}
                >
                  Add
                </Text>
              </Pressable>
            </View>
          }
        />
        {visibleHomeTasks.length ? (
          <View style={{ gap: spacing.xs }}>
            {visibleHomeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() =>
                  router.push(
                    {
                      pathname: '/personal-task/[id]',
                      params: { id: task.id },
                    } as never,
                  )
                }
                onToggleComplete={() => {
                  toggleHomeTask(task.id);
                }}
              />
            ))}
          </View>
        ) : (
          <View
            style={{
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: palette.outline,
              backgroundColor: palette.white,
            }}
          >
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 14,
              }}
            >
              No tasks yet
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Add a few farm reminders and the latest three will stay here.
            </Text>
          </View>
        )}
        {visibleHomeTasks.length ? (
          <View style={{ flexDirection: 'row' }}>
            <MetricBadge
              label={openTaskCount ? `${openTaskCount} open` : 'All done'}
              tone={openTaskCount ? 'warning' : 'success'}
            />
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle title="News & Schemes" />
        <View
          style={{
            flexDirection: newsAndSchemesStacked ? 'column' : 'row',
            gap: spacing.sm,
          }}
        >
          <View style={newsAndSchemesStacked ? undefined : { flex: 1 }}>
            <HomeNewsCard
              items={homeNewsItems}
              onOpenItem={(item) => router.push(item.route as never)}
              onViewAllAlerts={() => router.push('/alerts')}
            />
          </View>
          <View style={newsAndSchemesStacked ? undefined : { flex: 1 }}>
            <HomeSchemeCard
              scheme={homeSchemeHighlight}
              loading={schemesQuery.isFetching && !homeSchemeHighlight}
              onOpenScheme={() => {
                if (!homeSchemeHighlight) {
                  router.push('/schemes');
                  return;
                }

                router.push(homeSchemeHighlight.route as never);
              }}
              onViewAllSchemes={() => router.push('/schemes')}
            />
          </View>
        </View>
      </View>
    </PageShell>
  );
}
