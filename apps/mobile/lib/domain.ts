import type { CropSeasonSummary, ProfileResponse } from '@/lib/api-types';

export function getAllSeasons(profile: ProfileResponse | null) {
  return (
    profile?.farms.flatMap((farm) =>
      farm.cropSeasons.map((season) => ({
        ...season,
        farmPlot: farm,
      })),
    ) ?? []
  );
}

export function findSeasonContext(
  profile: ProfileResponse | null,
  seasonId?: string | null,
) {
  const seasons = getAllSeasons(profile);
  if (!seasons.length) {
    return null;
  }

  return seasons.find((season) => season.id === seasonId) ?? seasons[0];
}

export function getSuggestedSeasonKey(monthIndex: number) {
  if (monthIndex >= 5 && monthIndex <= 9) {
    return 'KHARIF' as const;
  }

  if (monthIndex >= 10 || monthIndex <= 2) {
    return 'RABI' as const;
  }

  return 'ZAID' as const;
}

export function hasAnyActiveSeason(profile: ProfileResponse | null) {
  return getAllSeasons(profile).some((season) => season.status === 'ACTIVE');
}

export function summarizeSeasonLabel(season: CropSeasonSummary) {
  return `${season.cropName} · ${season.currentStage}`;
}
