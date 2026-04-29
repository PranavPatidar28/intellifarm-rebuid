import type {
  CropTimelineResponse,
  TaskItem,
  TimelineStage,
  WeatherSummary,
} from '@/lib/api-types';
import { gradients } from '@/theme/tokens';

export type StageVisualState = 'completed' | 'current' | 'upcoming';

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeStageValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function resolveCurrentStageIndex(
  stages: TimelineStage[],
  currentStageLabel: string,
) {
  const target = normalizeStageValue(currentStageLabel);
  const match = stages.findIndex((stage) => {
    const candidates = [stage.labelEn, stage.labelHi, stage.stageKey].map(normalizeStageValue);
    return candidates.some((candidate) => candidate.includes(target) || target.includes(candidate));
  });

  return match >= 0 ? match : 0;
}

export function getDaysSinceSowing(sowingDate: string) {
  const timestamp = new Date(sowingDate).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / DAY_MS) + 1);
}

export function getSeasonProgress(
  stages: TimelineStage[],
  currentStageLabel: string,
  sowingDate: string,
) {
  const currentIndex = resolveCurrentStageIndex(stages, currentStageLabel);
  const totalDays = stages.at(-1)?.endDay ?? 0;
  const currentStage = stages[currentIndex] ?? stages[0] ?? null;
  const rawDaysSinceSowing = getDaysSinceSowing(sowingDate);
  const daysSinceSowing = totalDays
    ? Math.min(totalDays, Math.max(rawDaysSinceSowing, 0))
    : rawDaysSinceSowing;

  const stageLength = currentStage
    ? Math.max(1, currentStage.endDay - currentStage.startDay + 1)
    : 1;
  const stageDay = currentStage
    ? Math.min(
        stageLength,
        Math.max(1, daysSinceSowing - currentStage.startDay + 1),
      )
    : 0;
  const progressRatio = totalDays ? Math.min(1, daysSinceSowing / totalDays) : 0;
  const stageProgressRatio = currentStage ? Math.min(1, stageDay / stageLength) : 0;

  return {
    currentIndex,
    totalDays,
    currentStage,
    daysSinceSowing,
    stageDay,
    stageLength,
    progressRatio,
    stageProgressRatio,
  };
}

export function getStageVisualState(index: number, currentIndex: number): StageVisualState {
  if (index < currentIndex) {
    return 'completed';
  }

  if (index === currentIndex) {
    return 'current';
  }

  return 'upcoming';
}

export function getWeatherGradient(weather: WeatherSummary | null | undefined) {
  if (!weather) {
    return gradients.sunriseField;
  }

  switch (weather.current.conditionCode) {
    case 'STORM':
      return gradients.weatherStorm;
    case 'HEAVY_RAIN':
    case 'RAIN':
      return gradients.weatherRain;
    case 'HEAT':
      return gradients.weatherHeat;
    default:
      return gradients.weatherClear;
  }
}

export function getStageFocus(stage: TimelineStage) {
  const key = `${stage.stageKey} ${stage.labelEn}`.toLowerCase();

  if (
    key.includes('nursery') ||
    key.includes('establish') ||
    key.includes('germin')
  ) {
    return {
      headline: 'Protect early establishment',
      cues: [
        'Keep the first irrigation or rainfall response even across the plot.',
        'Check for patchy emergence, weed pressure, or gaps before they spread.',
      ],
      risk: 'Early stress can slow stand uniformity for the rest of the season.',
    };
  }

  if (key.includes('tiller') || key.includes('vegetative') || key.includes('square')) {
    return {
      headline: 'Build strong vegetative growth',
      cues: [
        'Watch moisture and nutrition so the canopy expands without stress.',
        'Scout leaves and stems regularly before pest or disease pressure becomes costly.',
      ],
      risk: 'Fast growth stages can hide early crop-health signals.',
    };
  }

  if (key.includes('flower') || key.includes('panicle')) {
    return {
      headline: 'Avoid stress during flowering',
      cues: [
        'Protect the crop from missed irrigation, harsh spray timing, or sudden heat stress.',
        'Stay alert for sucking pests and disease spread around tender growth.',
      ],
      risk: 'Stress during flowering can quickly affect yield formation.',
    };
  }

  if (key.includes('grain') || key.includes('boll') || key.includes('fruit')) {
    return {
      headline: 'Support filling and quality',
      cues: [
        'Keep moisture balanced so the crop can fill without unnecessary stress.',
        'Continue scouting for disease, lodging, or late nutrient imbalance.',
      ],
      risk: 'Late-stage neglect often shows up as reduced grain, boll, or fruit quality.',
    };
  }

  if (key.includes('harvest') || key.includes('pick')) {
    return {
      headline: 'Prepare the harvest window',
      cues: [
        'Check drying, labour, transport, and mandi plans before harvest pressure builds.',
        'Keep the field clean and avoid actions that could delay harvest quality.',
      ],
      risk: 'Small harvest delays can create storage, market, or quality losses.',
    };
  }

  return {
    headline: 'Stay aligned with this stage',
    cues: [
      'Follow current field observations and keep the next crop action timed to this window.',
      'Review weather and crop-health signals before making major field decisions.',
    ],
    risk: 'Stage-misaligned actions can waste input and time.',
  };
}

export function groupSeasonTasks(tasks: TaskItem[]) {
  const sorted = [...tasks].sort(
    (left, right) =>
      new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
  );

  return {
    pending: sorted.filter((task) => task.status !== 'COMPLETED'),
    completed: sorted.filter((task) => task.status === 'COMPLETED'),
  };
}

export function getTaskTypeHeadline(task: TaskItem) {
  switch (task.taskType) {
    case 'IRRIGATION':
      return 'Water timing matters most right now.';
    case 'FERTILIZER':
      return 'Feed the crop in step with this growth window.';
    case 'SCOUTING':
      return 'Observation now prevents bigger field losses later.';
    case 'HARVEST_PREP':
      return 'Small harvest checks now reduce last-minute pressure.';
    default:
      return 'Keep this task aligned with the crop stage.';
  }
}

export function getTaskWhyItMatters(task: TaskItem) {
  switch (task.taskType) {
    case 'IRRIGATION':
      return 'Correct irrigation timing protects root activity, nutrient movement, and stress recovery in this stage.';
    case 'FERTILIZER':
      return 'Nutrient timing is most effective when the crop can use it immediately instead of losing it to weather or poor timing.';
    case 'SCOUTING':
      return 'Regular scouting catches symptoms before they become widespread, expensive, or harder to explain later.';
    case 'HARVEST_PREP':
      return 'Harvest readiness protects quality, reduces avoidable delays, and improves decision-making around selling or storage.';
    default:
      return 'Stage-aware field actions reduce wasted effort and keep the crop plan moving in the right direction.';
  }
}

export function getTaskBestTime(task: TaskItem, weather?: WeatherSummary | null) {
  const dueLabel = `Due by ${new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(task.dueDate))}.`;

  if (!weather) {
    return `${dueLabel} Use the coolest, calmest field window you can get and avoid rushing the work late in the day.`;
  }

  const windowSummary =
    task.taskType === 'IRRIGATION'
      ? weather.fieldWindows.irrigationWindow.summary
      : task.taskType === 'HARVEST_PREP'
        ? weather.fieldWindows.harvestWindow.summary
        : weather.fieldWindows.sprayWindow.summary;

  return `${dueLabel} ${windowSummary}`;
}

export function getTaskAvoidList(task: TaskItem, weather?: WeatherSummary | null) {
  const common = [
    'Do not repeat last week’s action without checking the current crop stage first.',
    'Do not ignore visible field changes just because the task looks routine.',
  ];

  const taskSpecific =
    task.taskType === 'IRRIGATION'
      ? [
          'Avoid overwatering if the soil is already holding moisture.',
          'Do not irrigate heavily right before forecast rain if it can be postponed safely.',
        ]
      : task.taskType === 'FERTILIZER'
        ? [
            'Avoid broadcasting inputs in uncertain rain or wind if timing can be improved.',
            'Do not treat this task as one-size-fits-all across every plot.',
          ]
        : task.taskType === 'SCOUTING'
          ? [
              'Avoid checking only the easy-to-see edges of the field.',
              'Do not jump straight to pesticide decisions without clearer symptoms.',
            ]
          : task.taskType === 'HARVEST_PREP'
            ? [
                'Avoid waiting until the last day to plan transport, storage, or labour.',
                'Do not assume the nearest mandi is automatically the best option.',
              ]
            : ['Avoid delaying the task until the end of the stage window if action is already due.'];

  if (weather?.freshness.stale || weather?.freshness.isCached) {
    taskSpecific.push('Refresh the weather view before acting if conditions may have changed.');
  }

  return [...taskSpecific, ...common];
}

export function getTimelineSummary(
  timeline: CropTimelineResponse,
  progress: ReturnType<typeof getSeasonProgress>,
) {
  const pending = timeline.tasks.filter((task) => task.status !== 'COMPLETED').length;

  if (!progress.currentStage) {
    return 'Follow the saved crop journey and update the field after each key action.';
  }

  return `${progress.currentStage.labelEn} is active now with ${pending} live task${pending === 1 ? '' : 's'} in the current field window.`;
}
