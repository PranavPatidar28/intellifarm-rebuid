import Link from "next/link";

import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { LocationUpdater } from "@/components/location-updater";
import { DashboardPageTemplate } from "@/components/templates/dashboard-page-template";
import { buttonStyles } from "@/components/ui/button";
import { serverApiGet, serverApiPost } from "@/lib/api.server";

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  taskType: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "OVERDUE";
};

export type DashboardAlert = {
  id: string;
  title: string;
  message: string;
  alertType?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isRead?: boolean;
};

export type DashboardWeather = {
  currentTemperatureC: number;
  forecastSummary: string;
  rainfallExpectedMm: number;
  advisories: string[];
  forecastDays: Array<{
    date: string;
    maxTemperatureC: number;
    minTemperatureC: number;
    rainfallMm: number;
  }>;
  source: string;
  locationSource:
    | "DEVICE_GPS"
    | "FARM_PLOT"
    | "STATE_FALLBACK"
    | "COUNTRY_FALLBACK"
    | "SNAPSHOT_FALLBACK"
    | "SAFE_FALLBACK";
  locationLabel: string;
};

export type DashboardSeason = {
  cropSeasonId: string;
  cropName: string;
  sowingDate: string;
  currentStage: string;
  farmPlotName: string;
  tasks: DashboardTask[];
  alerts: DashboardAlert[];
  weather: DashboardWeather | null;
};

export type DashboardResponse = {
  user: {
    id: string;
    name: string;
    phone: string;
    preferredLanguage: "en" | "hi";
    state: string;
    district: string;
    village: string;
    profilePhotoUrl: string | null;
    role: "FARMER" | "ADMIN";
  };
  generatedAt?: string;
  seasons: DashboardSeason[];
};

export type MarketRecord = {
  id: string;
  mandiName: string;
  district: string;
  state: string;
  cropName: string;
  priceModal: number;
  priceMin: number;
  priceMax: number;
  recordDate: string;
  source: string;
  distanceKm?: number | null;
};

export type MarketResponse = {
  records: MarketRecord[];
  bestRecord: MarketRecord | null;
};

export type SchemeSummary = {
  id: string;
  title: string;
  titleHi?: string | null;
  description: string;
  descriptionHi?: string | null;
  category: string;
  applicableState: string;
  officialLink: string;
};

export type SchemesResponse = {
  schemes: SchemeSummary[];
};

export type TimelineResponse = {
  cropSeason: {
    cropName: string;
    currentStage: string;
    tasks: DashboardTask[];
  };
  stages: Array<{
    id: string;
    labelEn: string;
    startDay: number;
    endDay: number;
    sortOrder: number;
  }>;
};

export type ResourcePredictionResponse = {
  resourcePrediction: {
    cropName: string;
    currentStage: string;
    weeklyWaterMm: number;
    fertilizerNeed: string;
    pesticideNeedLevel: "LOW" | "WATCH" | "HIGH";
    recommendations: string[];
    safetyNote: string;
  };
};

export default async function DashboardPage(props: {
  searchParams: Promise<{ latitude?: string; longitude?: string }>;
}) {
  const searchParams = await props.searchParams;
  const lat = searchParams?.latitude;
  const lng = searchParams?.longitude;
  const hasLocation = Boolean(lat && lng);

  const dashboardPath = hasLocation
    ? `/dashboard/weekly?latitude=${lat}&longitude=${lng}`
    : "/dashboard/weekly";

  const dashboard = await serverApiGet<DashboardResponse>(dashboardPath);
  const dashboardForClient = dashboard
    ? {
        ...dashboard,
        generatedAt: dashboard.generatedAt ?? new Date().toISOString(),
        seasons: rankDashboardSeasons(dashboard.seasons),
      }
    : null;
  const featuredSeason = dashboardForClient?.seasons?.[0] ?? null;

  const marketPath = featuredSeason
    ? `/markets?cropName=${encodeURIComponent(featuredSeason.cropName)}${
        hasLocation
          ? `&latitude=${lat}&longitude=${lng}&includeDistance=true`
          : ""
      }`
    : null;

  const [market, schemes, timeline, resourcePrediction] = featuredSeason
    ? await Promise.all([
        marketPath
          ? serverApiGet<MarketResponse>(marketPath)
          : Promise.resolve(null),
        serverApiGet<SchemesResponse>(
          `/schemes?cropName=${encodeURIComponent(featuredSeason.cropName)}`,
        ),
        serverApiGet<TimelineResponse>(
          `/crop-seasons/${featuredSeason.cropSeasonId}/timeline`,
        ),
        serverApiPost<ResourcePredictionResponse>("/predictions/resources", {
          cropSeasonId: featuredSeason.cropSeasonId,
          ...(hasLocation
            ? { latitude: Number(lat), longitude: Number(lng) }
            : {}),
        }),
      ])
    : [null, null, null, null];

  return (
    <>
      <LocationUpdater />
      <DashboardPageTemplate
        title="Today on your farm"
        description="A focused briefing for weather, crop work, market movement, and farmer support."
        actions={
          <Link
            href="/onboarding/farm"
            className={buttonStyles({ variant: "primary" })}
          >
            Add plot
          </Link>
        }
      >
        <DashboardClient
          dashboard={dashboardForClient}
          market={market}
          schemes={schemes}
          timeline={timeline}
          resourcePrediction={resourcePrediction}
        />
      </DashboardPageTemplate>
    </>
  );
}

function rankDashboardSeasons(seasons: DashboardSeason[]) {
  return [...seasons].sort((left, right) => {
    const scoreDelta = getSeasonPriorityScore(right) - getSeasonPriorityScore(left);
    if (scoreDelta !== 0) return scoreDelta;

    const leftDue = getEarliestDueTime(left.tasks);
    const rightDue = getEarliestDueTime(right.tasks);
    if (leftDue !== rightDue) return leftDue - rightDue;

    return left.farmPlotName.localeCompare(right.farmPlotName);
  });
}

function getSeasonPriorityScore(season: DashboardSeason) {
  const alertScore = season.alerts.reduce((score, alert) => {
    if (alert.severity === "CRITICAL") return score + 80;
    if (alert.severity === "HIGH") return score + 50;
    if (alert.severity === "MEDIUM") return score + 20;
    return score + 8;
  }, 0);

  const taskScore = season.tasks.reduce((score, task) => {
    if (task.status === "COMPLETED" || task.status === "SKIPPED") {
      return score;
    }

    if (task.status === "OVERDUE") {
      return score + (task.priority === "HIGH" ? 40 : 28);
    }

    if (task.priority === "HIGH") return score + 24;
    if (task.priority === "MEDIUM") return score + 12;
    return score + 5;
  }, 0);

  return alertScore + taskScore;
}

function getEarliestDueTime(tasks: DashboardTask[]) {
  const dueTimes = tasks
    .filter((task) => task.status === "PENDING" || task.status === "OVERDUE")
    .map((task) => new Date(task.dueDate).getTime())
    .filter((time) => Number.isFinite(time));

  return dueTimes.length ? Math.min(...dueTimes) : Number.MAX_SAFE_INTEGER;
}
