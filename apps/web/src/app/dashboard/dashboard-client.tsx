"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  CloudRain,
  CloudSun,
  Droplets,
  IndianRupee,
  type LucideIcon,
  LocateFixed,
  MapPin,
  NotebookPen,
  Sprout,
  TestTube2,
  TimerReset,
  Tractor,
  TrendingUp,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { apiPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrentLocation } from "@/lib/use-current-location";

import type {
  DashboardAlert,
  DashboardResponse,
  DashboardSeason,
  DashboardTask,
  DashboardWeather,
  MarketRecord,
  MarketResponse,
  ResourcePredictionResponse,
  SchemesResponse,
  SchemeSummary,
  TimelineResponse,
} from "./page";

type DashboardClientProps = {
  dashboard: DashboardResponse | null;
  market: MarketResponse | null;
  schemes: SchemesResponse | null;
  timeline: TimelineResponse | null;
  resourcePrediction: ResourcePredictionResponse | null;
};

type TaskStatus = DashboardTask["status"];

type BriefingItem = {
  id: string;
  title: string;
  detail: string;
  tone: "brand" | "info" | "accent" | "danger";
  icon: LucideIcon;
};

const severityRank: Record<DashboardAlert["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const priorityRank: Record<DashboardTask["priority"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const taskStatusRank: Record<TaskStatus, number> = {
  OVERDUE: 0,
  PENDING: 1,
  COMPLETED: 2,
  SKIPPED: 3,
};

const weatherSourceLabel: Record<
  NonNullable<DashboardWeather>["locationSource"],
  string
> = {
  DEVICE_GPS: "Live GPS",
  FARM_PLOT: "Saved plot",
  STATE_FALLBACK: "State fallback",
  COUNTRY_FALLBACK: "India fallback",
  SNAPSHOT_FALLBACK: "Saved snapshot",
  SAFE_FALLBACK: "Safe fallback",
};

const priorityTone: Record<
  DashboardTask["priority"],
  "success" | "warning" | "danger"
> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

const statusTone: Record<
  TaskStatus,
  "info" | "success" | "warning" | "danger"
> = {
  PENDING: "info",
  COMPLETED: "success",
  SKIPPED: "warning",
  OVERDUE: "danger",
};

const quickActions = [
  {
    href: "/assistant",
    label: "Ask assistant",
    icon: Bot,
    tone: "brand",
  },
  {
    href: "/disease-help",
    label: "Scan disease",
    icon: Bug,
    tone: "danger",
  },
  {
    href: "/markets",
    label: "Market prices",
    icon: IndianRupee,
    tone: "accent",
  },
  {
    href: "/schemes",
    label: "Schemes",
    icon: NotebookPen,
    tone: "info",
  },
  {
    href: "timeline",
    label: "Crop timeline",
    icon: Sprout,
    tone: "brand",
  },
  {
    href: "/onboarding/farm",
    label: "Add field",
    icon: Tractor,
    tone: "info",
  },
];

export function DashboardClient({
  dashboard,
  market,
  schemes,
  timeline,
  resourcePrediction,
}: DashboardClientProps) {
  const router = useRouter();
  const currentLocation = useCurrentLocation();
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskStatus>>(
    {},
  );
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);

  const season = useMemo(() => {
    const firstSeason = dashboard?.seasons?.[0] ?? null;
    if (!firstSeason) return null;

    return {
      ...firstSeason,
      tasks: firstSeason.tasks.map((task) => ({
        ...task,
        status: taskOverrides[task.id] ?? task.status,
      })),
    };
  }, [dashboard?.seasons, taskOverrides]);

  if (!dashboard) {
    return (
      <EmptyState
        title="Dashboard could not load"
        description="Check that the API is running, then refresh the page to restore the farm briefing."
        action={
          <Link href="/dashboard" className={buttonStyles({ variant: "primary" })}>
            Refresh dashboard
          </Link>
        }
      />
    );
  }

  if (!season) {
    return (
      <NoSeasonState
        farmerName={dashboard.user.name}
        locationLabel={formatFarmerLocation(dashboard.user)}
      />
    );
  }

  const generatedAt = dashboard.generatedAt ?? season.sowingDate;
  const alerts = getSortedAlerts(season.alerts);
  const tasks = getSortedTasks(season.tasks);
  const briefingItems = buildBriefingItems({
    season,
    market,
    resourcePrediction,
    alerts,
    tasks,
  });

  const updateTask = async (taskId: string, status: TaskStatus) => {
    setBusyTaskId(taskId);
    setTaskMessage(null);

    try {
      await apiPatch(`/tasks/${taskId}`, { status });
      setTaskOverrides((current) => ({ ...current, [taskId]: status }));
      router.refresh();
    } catch {
      setTaskMessage("Could not update this task right now.");
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <HeroBriefing
          user={dashboard.user}
          season={season}
          generatedAt={generatedAt}
          activeSeasonCount={dashboard.seasons.length}
          briefingItems={briefingItems}
          locationMessage={currentLocation.message}
          locating={currentLocation.status === "locating"}
          onRefreshLocation={currentLocation.refreshLocation}
        />
        <AlertsPanel alerts={alerts} />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <WeatherPanel weather={season.weather} />
        <TasksPanel
          tasks={tasks}
          busyTaskId={busyTaskId}
          message={taskMessage}
          onUpdateTask={updateTask}
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(310px,0.8fr)_minmax(0,1.25fr)_minmax(290px,0.75fr)]">
        <MarketPanel market={market} cropName={season.cropName} />
        <TimelinePanel
          season={season}
          timeline={timeline}
          generatedAt={generatedAt}
        />
        <div className="grid gap-5">
          <QuickActions season={season} />
          <ResourcePanel prediction={resourcePrediction?.resourcePrediction} />
        </div>
      </div>

      <SchemesAndAdvisories
        schemes={schemes?.schemes ?? []}
        weather={season.weather}
        alerts={alerts}
        market={market}
        cropName={season.cropName}
      />
    </div>
  );
}

function HeroBriefing({
  user,
  season,
  generatedAt,
  activeSeasonCount,
  briefingItems,
  locationMessage,
  locating,
  onRefreshLocation,
}: {
  user: DashboardResponse["user"];
  season: DashboardSeason;
  generatedAt: string;
  activeSeasonCount: number;
  briefingItems: BriefingItem[];
  locationMessage: string | null;
  locating: boolean;
  onRefreshLocation: () => void;
}) {
  const days = getDaysSince(season.sowingDate, generatedAt);
  const locationLabel = formatFarmerLocation(user);

  return (
    <section className="hero-panel overflow-hidden p-5 text-white md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-white/76">
              {formatDashboardDate(generatedAt)}
            </p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
              Namaste, {user.name || "farmer"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
              {season.farmPlotName} is growing {season.cropName} in the{" "}
              <span className="font-semibold text-white">{season.currentStage}</span>{" "}
              stage. Keep the next field decision simple and timely.
            </p>
          </div>

          {briefingItems[0] ? (
            <div className="rounded-[var(--radius-card)] border border-white/14 bg-white/10 p-3 md:hidden">
              <p className="text-xs font-medium text-white/62">Next</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {briefingItems[0].title}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/72">
                {briefingItems[0].detail}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Crop" value={season.cropName} />
            <HeroMetric
              label="Days since sowing"
              value={days >= 0 ? `${days}` : "Planned"}
            />
            <HeroMetric label="Active seasons" value={`${activeSeasonCount}`} />
          </div>
        </div>

        <div className="hidden rounded-[var(--radius-panel)] border border-white/16 bg-white/12 p-4 md:block">
          <p className="text-sm font-semibold text-white">Top briefing</p>
          <div className="mt-4 space-y-3">
            {briefingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-white/16 text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/72">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={locating}
              onClick={onRefreshLocation}
              leadingIcon={<LocateFixed className="h-4 w-4" />}
              className="border-white/20 bg-white/12 text-white hover:bg-white/20 hover:text-white"
            >
              {locating ? "Locating..." : "Refresh GPS"}
            </Button>
            <Link
              href={`/seasons/${season.cropSeasonId}/timeline`}
              className={cn(
                buttonStyles({ variant: "ghost", size: "sm" }),
                "text-white hover:bg-white/14 hover:text-white",
              )}
            >
              Open timeline
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/64">
            {locationMessage ?? locationLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-white/14 bg-white/10 p-3">
      <p className="text-xs font-medium text-white/62">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white number-data">{value}</p>
    </div>
  );
}

function WeatherPanel({ weather }: { weather: DashboardWeather | null }) {
  if (!weather) {
    return (
      <section className="surface-card-strong p-5 md:p-6">
        <PanelHeader
          eyebrow="Weather"
          title="Weather is not ready yet"
          icon={CloudRain}
          tone="info"
        />
        <p className="mt-4 text-sm leading-6 muted">
          Add field coordinates or refresh GPS to improve local forecasts before
          irrigation, spraying, or harvest movement.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-panel)] border border-sky-200 bg-sky-50 p-5 shadow-[var(--shadow-1)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-white text-sky-700 shadow-sm">
              <CloudSun className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow text-sky-800">Weather</p>
              <h2 className="mt-1 text-2xl font-semibold text-sky-950">
                Field weather outlook
              </h2>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <p className="text-6xl font-semibold leading-none text-sky-950 number-data">
              {Math.round(weather.currentTemperatureC)}
              <span className="text-3xl">&deg;C</span>
            </p>
            <div className="pb-1">
              <p className="text-base font-semibold text-sky-900">
                {weather.forecastSummary}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-sky-800">
                <MapPin className="h-4 w-4" />
                {weather.locationLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-w-52 gap-3 sm:grid-cols-2">
          <WeatherStat
            icon={Droplets}
            label="Rain watch"
            value={`${weather.rainfallExpectedMm.toFixed(1)} mm`}
          />
          <WeatherStat
            icon={LocateFixed}
            label="Source"
            value={weatherSourceLabel[weather.locationSource]}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {weather.forecastDays.slice(0, 3).map((day) => (
          <div
            key={day.date}
            className="rounded-[var(--radius-card)] border border-sky-200 bg-white/72 p-4"
          >
            <p className="text-sm font-semibold text-sky-950">
              {formatDayLabel(day.date)}
            </p>
            <p className="mt-2 text-xl font-semibold text-sky-950 number-data">
              {Math.round(day.maxTemperatureC)}
              <span className="text-sm">&deg;C</span> /{" "}
              {Math.round(day.minTemperatureC)}
              <span className="text-sm">&deg;C</span>
            </p>
            <p className="mt-2 text-sm text-sky-800">
              Rain {day.rainfallMm.toFixed(1)} mm
            </p>
          </div>
        ))}
      </div>

      {weather.advisories.length ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-sky-200 bg-white/78 p-4">
          <p className="text-sm font-semibold text-sky-950">
            Crop advisory
          </p>
          <p className="mt-2 text-sm leading-6 text-sky-900">
            {weather.advisories[0]}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function WeatherStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-sky-200 bg-white/74 p-4">
      <Icon className="h-4 w-4 text-sky-700" />
      <p className="mt-3 text-xs font-medium text-sky-800">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-sky-950 number-data">
        {value}
      </p>
    </div>
  );
}

function TasksPanel({
  tasks,
  busyTaskId,
  message,
  onUpdateTask,
}: {
  tasks: DashboardTask[];
  busyTaskId: string | null;
  message: string | null;
  onUpdateTask: (taskId: string, status: TaskStatus) => void;
}) {
  const visibleTasks = tasks.slice(0, 5);

  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Today's work"
        title="Tasks that move the crop forward"
        icon={CircleCheckBig}
        tone="brand"
        action={
          <Link href="/farms" className={buttonStyles({ variant: "tertiary", size: "sm" })}>
            View fields
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {message ? (
        <p className="mt-4 rounded-[var(--radius-card)] bg-[var(--danger-soft)] p-3 text-sm font-medium text-[var(--danger)]">
          {message}
        </p>
      ) : null}

      {visibleTasks.length ? (
        <div className="mt-5 space-y-3">
          {visibleTasks.map((task) => (
            <article
              key={task.id}
              className={cn(
                "rounded-[var(--radius-card)] border p-4",
                task.status === "OVERDUE" || task.priority === "HIGH"
                  ? "border-red-200 bg-[var(--danger-soft)]"
                  : "border-[var(--border)] bg-card",
              )}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  aria-label={`Mark ${task.title} complete`}
                  disabled={busyTaskId === task.id}
                  onClick={() => onUpdateTask(task.id, "COMPLETED")}
                  className={cn(
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border transition",
                    task.status === "COMPLETED"
                      ? "border-transparent bg-[var(--success)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--foreground-soft)] hover:border-[var(--success)] hover:text-[var(--success)]",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--foreground)]">
                        {task.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 muted">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={priorityTone[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge tone={statusTone[task.status]}>
                        {task.status === "OVERDUE" ? "Needs attention" : task.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm muted">
                      <CalendarDays className="h-4 w-4" />
                      Due {formatDate(task.dueDate)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {task.status !== "SKIPPED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyTaskId === task.id}
                          onClick={() => onUpdateTask(task.id, "SKIPPED")}
                        >
                          {busyTaskId === task.id ? "Saving..." : "Skip"}
                        </Button>
                      ) : null}
                      {(task.status === "COMPLETED" ||
                        task.status === "SKIPPED") ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyTaskId === task.id}
                          leadingIcon={<TimerReset className="h-4 w-4" />}
                          onClick={() => onUpdateTask(task.id, "PENDING")}
                        >
                          Pending
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--success-soft)] p-4">
          <p className="text-base font-semibold text-[var(--foreground)]">
            No tasks due this week
          </p>
          <p className="mt-2 text-sm leading-6 muted">
            Keep a regular field walk going and review the weather before major
            input decisions.
          </p>
        </div>
      )}
    </section>
  );
}

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const urgentAlerts = alerts.filter(
    (alert) => alert.severity === "HIGH" || alert.severity === "CRITICAL",
  );
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <section
      className={cn(
        "surface-card-strong p-5 md:p-6",
        urgentAlerts.length && "border-red-200 bg-red-50/80",
      )}
    >
      <PanelHeader
        eyebrow="Urgent alerts"
        title={urgentAlerts.length ? "Needs attention" : "No urgent alerts"}
        icon={AlertTriangle}
        tone={urgentAlerts.length ? "danger" : "success"}
      />

      {visibleAlerts.length ? (
        <div className="mt-5 space-y-3">
          {visibleAlerts.map((alert) => (
            <article
              key={alert.id}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
                    alert.severity === "HIGH" || alert.severity === "CRITICAL"
                      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]",
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {alert.title}
                    </p>
                    <Badge
                      tone={
                        alert.severity === "HIGH" ||
                        alert.severity === "CRITICAL"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 muted">{alert.message}</p>
                </div>
              </div>
            </article>
          ))}
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--danger)]"
          >
            Review support options
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--success-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Clear right now
          </p>
          <p className="mt-2 text-sm leading-6 muted">
            No high-risk alerts are active for this crop season.
          </p>
        </div>
      )}
    </section>
  );
}

function MarketPanel({
  market,
  cropName,
}: {
  market: MarketResponse | null;
  cropName: string;
}) {
  const bestRecord = market?.bestRecord ?? null;
  const records = market?.records ?? [];
  const averagePrice = records.length
    ? records.reduce((sum, record) => sum + record.priceModal, 0) / records.length
    : null;
  const priceLift =
    bestRecord && averagePrice ? bestRecord.priceModal - averagePrice : null;

  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Market snapshot"
        title={cropName}
        icon={IndianRupee}
        tone="accent"
        action={
          <Link href="/markets" className={buttonStyles({ variant: "tertiary", size: "sm" })}>
            All markets
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {bestRecord ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[var(--radius-panel)] border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Best current mandi
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-950 number-data">
              {formatCurrency(bestRecord.priceModal)}
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {bestRecord.mandiName}, {bestRecord.district}
              {bestRecord.distanceKm != null
                ? ` - ${bestRecord.distanceKm.toFixed(1)} km away`
                : ""}
            </p>
            {priceLift != null ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-900">
                <TrendingUp className="h-4 w-4" />
                {priceLift >= 0 ? "+" : ""}
                {formatCurrency(Math.round(priceLift))} vs current result average
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            {records.slice(0, 3).map((record) => (
              <MarketRow key={record.id} record={record} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No mandi record found
          </p>
          <p className="mt-2 text-sm leading-6 muted">
            Try refreshing GPS or opening the market page to search broader
            mandi coverage.
          </p>
        </div>
      )}
    </section>
  );
}

function MarketRow({ record }: { record: MarketRecord }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
          {record.mandiName}
        </p>
        <p className="mt-1 text-xs muted">
          {formatDate(record.recordDate)} | {record.source}
        </p>
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)] number-data">
        {formatCurrency(record.priceModal)}
      </p>
    </div>
  );
}

function TimelinePanel({
  season,
  timeline,
  generatedAt,
}: {
  season: DashboardSeason;
  timeline: TimelineResponse | null;
  generatedAt: string;
}) {
  const stages = timeline?.stages ?? [];
  const activeIndex = stages.findIndex(
    (stage) =>
      stage.labelEn.toLowerCase() === season.currentStage.toLowerCase(),
  );
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const upcomingTasks = getSortedTasks(
    timeline?.cropSeason.tasks?.length ? timeline.cropSeason.tasks : season.tasks,
  )
    .filter((task) => task.status === "PENDING" || task.status === "OVERDUE")
    .slice(0, 3);
  const days = getDaysSince(season.sowingDate, generatedAt);

  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Crop timeline"
        title={`${season.cropName} season`}
        icon={CalendarDays}
        tone="brand"
        action={
          <Link
            href={`/seasons/${season.cropSeasonId}/timeline`}
            className={buttonStyles({ variant: "tertiary", size: "sm" })}
          >
            Full timeline
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="eyebrow">Now</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] number-data">
            Day {Math.max(days, 0)}
          </p>
          <p className="mt-2 text-sm leading-6 muted">
            Current stage: {season.currentStage}
          </p>
        </div>

        {stages.length ? (
          <div className="space-y-3">
            <div className="flex overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)]">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={cn(
                    "min-h-12 flex-1 border-r border-[var(--border)] px-3 py-2 text-center text-xs font-semibold last:border-r-0",
                    index < safeActiveIndex && "bg-[var(--success-soft)] text-[var(--success)]",
                    index === safeActiveIndex && "bg-[var(--brand)] text-white",
                    index > safeActiveIndex && "bg-white text-[var(--foreground-soft)]",
                  )}
                >
                  <span className="line-clamp-2">{stage.labelEn}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {stages.slice(0, 3).map((stage) => (
                <div
                  key={stage.id}
                  className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-3"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {stage.labelEn}
                  </p>
                  <p className="mt-1 text-xs muted">
                    Day {stage.startDay} to {stage.endDay}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Stage rules are not configured yet
            </p>
            <p className="mt-2 text-sm leading-6 muted">
              The current season still tracks tasks and stage status from the
              weekly dashboard.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Upcoming field dates
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {upcomingTasks.length ? (
            upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-3"
              >
                <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                  {task.title}
                </p>
                <p className="mt-2 text-xs muted">{formatDate(task.dueDate)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-3 md:col-span-3">
              <p className="text-sm muted">
                No upcoming timeline tasks are due right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QuickActions({ season }: { season: DashboardSeason }) {
  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Quick actions"
        title="Act from here"
        icon={ChevronRight}
        tone="info"
      />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const href =
            action.href === "timeline"
              ? `/seasons/${season.cropSeasonId}/timeline`
              : action.href;

          return (
            <Link
              key={action.label}
              href={href}
              className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-4 text-center transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-1)]"
            >
              <span
                className={cn(
                  "mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)]",
                  action.tone === "brand" && "bg-[var(--brand-soft)] text-[var(--brand)]",
                  action.tone === "info" && "bg-[var(--info-soft)] text-[var(--info)]",
                  action.tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
                  action.tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-[var(--foreground)]">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ResourcePanel({
  prediction,
}: {
  prediction: ResourcePredictionResponse["resourcePrediction"] | undefined;
}) {
  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Input readiness"
        title="This week's needs"
        icon={TestTube2}
        tone="accent"
      />

      {prediction ? (
        <div className="mt-5 grid gap-3">
          <MiniStat
            label="Water"
            value={`${prediction.weeklyWaterMm} mm`}
            hint="Estimated weekly demand"
            tone="info"
          />
          <MiniStat
            label="Fertilizer"
            value={prediction.fertilizerNeed}
            hint="Review before applying"
            tone="accent"
          />
          <MiniStat
            label="Pesticide watch"
            value={prediction.pesticideNeedLevel}
            hint={prediction.safetyNote}
            tone={prediction.pesticideNeedLevel === "HIGH" ? "danger" : "brand"}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6 muted">
          The resource estimate is unavailable right now. The timeline and task
          list still show what needs attention this week.
        </p>
      )}
    </section>
  );
}

function SchemesAndAdvisories({
  schemes,
  weather,
  alerts,
  market,
  cropName,
}: {
  schemes: SchemeSummary[];
  weather: DashboardWeather | null;
  alerts: DashboardAlert[];
  market: MarketResponse | null;
  cropName: string;
}) {
  const advisoryCards = buildAdvisoryCards({ weather, alerts, market, cropName });

  return (
    <section className="surface-card-strong p-5 md:p-6">
      <PanelHeader
        eyebrow="Schemes & advisories"
        title="Support worth checking"
        icon={NotebookPen}
        tone="brand"
        action={
          <Link href="/schemes" className={buttonStyles({ variant: "tertiary", size: "sm" })}>
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {advisoryCards.map((card) => (
          <article
            key={card.id}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-4"
          >
            <Badge tone={card.tone}>{card.label}</Badge>
            <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
              {card.title}
            </p>
            <p className="mt-2 text-sm leading-6 muted">{card.detail}</p>
          </article>
        ))}

        {schemes.slice(0, 3).map((scheme) => (
          <article
            key={scheme.id}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-4"
          >
            <Badge tone="accent">{scheme.category}</Badge>
            <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
              {scheme.title}
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 muted">
              {scheme.description}
            </p>
            <a
              href={scheme.officialLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
            >
              Open official link
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "brand" | "info" | "accent" | "danger";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-card p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold number-data",
          tone === "brand" && "text-[var(--brand)]",
          tone === "info" && "text-[var(--info)]",
          tone === "accent" && "text-[var(--accent)]",
          tone === "danger" && "text-[var(--danger)]",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 muted">{hint}</p>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  icon: Icon,
  tone,
  action,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  tone: "brand" | "info" | "accent" | "danger" | "success";
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)]",
            tone === "brand" && "bg-[var(--brand-soft)] text-[var(--brand)]",
            tone === "info" && "bg-[var(--info-soft)] text-[var(--info)]",
            tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
            tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
            tone === "success" && "bg-[var(--success-soft)] text-[var(--success)]",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
            {title}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function NoSeasonState({
  farmerName,
  locationLabel,
}: {
  farmerName: string;
  locationLabel: string;
}) {
  return (
    <section className="hero-panel p-6 text-white md:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-white/70">{locationLabel}</p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
          Namaste, {farmerName || "farmer"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/78 md:text-base">
          Add your first plot and crop season to unlock weather briefings,
          weekly tasks, crop timelines, market snapshots, and schemes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/onboarding/farm"
            className={cn(
              buttonStyles({ variant: "secondary" }),
              "border-white/20 bg-white text-[var(--brand)] hover:bg-white/90",
            )}
          >
            Start onboarding
          </Link>
          <Link
            href="/farms"
            className={cn(
              buttonStyles({ variant: "ghost" }),
              "text-white hover:bg-white/14 hover:text-white",
            )}
          >
            View fields
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildBriefingItems({
  season,
  market,
  resourcePrediction,
  alerts,
  tasks,
}: {
  season: DashboardSeason;
  market: MarketResponse | null;
  resourcePrediction: ResourcePredictionResponse | null;
  alerts: DashboardAlert[];
  tasks: DashboardTask[];
}) {
  const items: BriefingItem[] = [];
  const urgentAlert = alerts.find(
    (alert) => alert.severity === "CRITICAL" || alert.severity === "HIGH",
  );
  const nextTask = tasks.find(
    (task) =>
      task.status === "OVERDUE" ||
      (task.status === "PENDING" && task.priority === "HIGH"),
  ) ?? tasks.find((task) => task.status === "PENDING");

  if (urgentAlert) {
    items.push({
      id: `alert-${urgentAlert.id}`,
      title: urgentAlert.title,
      detail: urgentAlert.message,
      tone: "danger",
      icon: AlertTriangle,
    });
  }

  if (nextTask) {
    items.push({
      id: `task-${nextTask.id}`,
      title: nextTask.title,
      detail: `Due ${formatDate(nextTask.dueDate)} on ${season.farmPlotName}`,
      tone: nextTask.priority === "HIGH" ? "danger" : "brand",
      icon: CheckCircle2,
    });
  }

  if (season.weather?.advisories[0]) {
    items.push({
      id: "weather-advisory",
      title: "Weather advisory",
      detail: season.weather.advisories[0],
      tone: "info",
      icon: CloudRain,
    });
  }

  if (market?.bestRecord) {
    items.push({
      id: "market-best",
      title: "Best mandi price",
      detail: `${formatCurrency(market.bestRecord.priceModal)} at ${
        market.bestRecord.mandiName
      }`,
      tone: "accent",
      icon: IndianRupee,
    });
  }

  if (resourcePrediction?.resourcePrediction) {
    items.push({
      id: "resource-water",
      title: "Water estimate",
      detail: `${resourcePrediction.resourcePrediction.weeklyWaterMm} mm suggested this week`,
      tone: "info",
      icon: Droplets,
    });
  }

  if (!items.length) {
    items.push({
      id: "steady",
      title: "Season steady",
      detail: "No urgent action is showing. Keep checking fields regularly.",
      tone: "brand",
      icon: CheckCircle2,
    });
  }

  return items.slice(0, 3);
}

function buildAdvisoryCards({
  weather,
  alerts,
  market,
  cropName,
}: {
  weather: DashboardWeather | null;
  alerts: DashboardAlert[];
  market: MarketResponse | null;
  cropName: string;
}) {
  const cards: Array<{
    id: string;
    label: string;
    title: string;
    detail: string;
    tone: "brand" | "info" | "accent" | "warning" | "danger";
  }> = [];

  if (weather?.advisories[0]) {
    cards.push({
      id: "weather",
      label: "Advisory",
      title: "Weather-linked field note",
      detail: weather.advisories[0],
      tone: "info",
    });
  }

  const urgentAlert = alerts.find(
    (alert) => alert.severity === "CRITICAL" || alert.severity === "HIGH",
  );
  if (urgentAlert) {
    cards.push({
      id: `alert-${urgentAlert.id}`,
      label: "Risk",
      title: urgentAlert.title,
      detail: urgentAlert.message,
      tone: "danger",
    });
  }

  if (market?.bestRecord) {
    cards.push({
      id: "market",
      label: "Market",
      title: `${cropName} selling signal`,
      detail: `${market.bestRecord.mandiName} is showing ${formatCurrency(
        market.bestRecord.priceModal,
      )} modal price in the current results.`,
      tone: "accent",
    });
  }

  if (!cards.length) {
    cards.push({
      id: "steady",
      label: "Advisory",
      title: "No special advisory right now",
      detail: "Keep the regular crop walk and review weather before field operations.",
      tone: "brand",
    });
  }

  return cards.slice(0, 3);
}

function getSortedAlerts(alerts: DashboardAlert[]) {
  return [...alerts].sort((left, right) => {
    const severityDelta = severityRank[left.severity] - severityRank[right.severity];
    if (severityDelta !== 0) return severityDelta;
    return left.title.localeCompare(right.title);
  });
}

function getSortedTasks(tasks: DashboardTask[]) {
  return [...tasks].sort((left, right) => {
    const statusDelta = taskStatusRank[left.status] - taskStatusRank[right.status];
    if (statusDelta !== 0) return statusDelta;
    const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
  });
}

function getDaysSince(sowingDate: string, generatedAt: string) {
  const start = new Date(sowingDate).getTime();
  const end = new Date(generatedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86_400_000);
}

function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatFarmerLocation(user: DashboardResponse["user"]) {
  const parts = [user.village, user.district, user.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "Profile location not set";
}
